// Simulatore di studio: guida i motori PURI dell'app (SRS + budget carte nuove)
// attraverso tempo SIMULATO (nowTs esplicito, nessun mock d'orologio) per stimare
// come evolve lo studio nel tempo — minuti/giorno, giorni per imparare, curva
// ripassi/backlog, svuotamento dei punti deboli. Restando agganciato ai motori
// veri, se cambiano intervalli/regole il modello cambia con loro.
//
// È una STIMA del cuore SRS: ignora giochi/avventure/consolida, giorni saltati,
// festivi. Non una predizione.
import { createInitialSrs, applySrsReview, normalizeMastery } from './srs';
import { canIntroduceNewCard, recordNewCardIntroduced, type NewCardBudget } from './dailyNewCards';
import type { SrsProgress } from '../types/models';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_START = new Date(2026, 0, 1, 0, 0, 0).getTime();

export interface SimCard {
	id: string;
	srs: SrsProgress | null;
	pBase: number; // probabilità base che l'utente la azzecchi
}

export interface DayStat {
	day: number;
	introduced: number;
	reviews: number;
	questions: number; // = reviews (una domanda per ripasso) + introduced (prima vista)
	minutes: number;
	dueBacklogAtDayEnd: number;
	mastered: number; // carte con padronanza >= 60%
	weak: number; // carte "deboli" (criterio reale: pct<60 e ha sbagliato)
}

export interface SimConfig {
	cardCount: number;
	cap: number; // carte nuove al giorno
	pCorrect: number | ((cardIndex: number) => number); // base per carta
	days: number;
	secondsPerQuestion?: number; // default 7
	oncePerDay?: boolean; // policy "una volta al giorno" (default true)
	// modifica l'accuratezza in funzione dello stage (default: usa la base):
	// modello più realistico = si sbaglia di più da nuovi, meglio da consolidati.
	pByStage?: (stage: number, base: number) => number;
	seed?: number;
	start?: number;
}

export interface SimResult {
	cards: SimCard[];
	days: DayStat[];
	maxIntroducedInADay: number;
	totalReviews: number;
	totalMinutes: number;
}

function makeRng(seed: number): () => number {
	let s = seed >>> 0;
	return () => {
		s = (s * 1664525 + 1013904223) >>> 0;
		return s / 0xffffffff;
	};
}

// Padronanza reale (stessa formula del quiz): 70% stage + 30% mastery.
export function masteryPct(srs: SrsProgress): number {
	return normalizeMastery(srs.srs_stage, srs.mastery_points);
}
export function isMastered(srs: SrsProgress): boolean {
	return masteryPct(srs) >= 60;
}
// "Debole" = come loadWeakItems: sotto il 60% E ha dato prova di debolezza.
export function isWeak(srs: SrsProgress): boolean {
	return masteryPct(srs) < 60 && ((srs.lapses ?? 0) > 0 || srs.mastery_points < 0);
}

export function simulate(cfg: SimConfig): SimResult {
	const start = cfg.start ?? DEFAULT_START;
	const secQ = cfg.secondsPerQuestion ?? 7;
	// default false = comportamento storico (learning steps intra-giornata); gli
	// scenari del report passano esplicitamente true/false per confrontarli.
	const once = cfg.oncePerDay ?? false;
	const pByStage = cfg.pByStage ?? ((_stage, base) => base);
	const rng = makeRng(cfg.seed ?? 12345);
	const baseFn = typeof cfg.pCorrect === 'function' ? cfg.pCorrect : () => cfg.pCorrect as number;

	const cards: SimCard[] = Array.from({ length: cfg.cardCount }, (_, i) => ({
		id: `w${i}`,
		srs: null,
		pBase: baseFn(i)
	}));
	const unseen = [...cards];
	let budget: NewCardBudget = {};
	const days: DayStat[] = [];
	let maxIntroducedInADay = 0;
	let totalReviews = 0;
	let totalMinutes = 0;

	let now = start;
	for (let day = 0; day < cfg.days; day += 1) {
		const dayEnd = start + (day + 1) * DAY_MS;
		let reviewsToday = 0;
		let introducedToday = 0;

		// Sessioni intra-giornata: con la policy spenta gli intervalli iniziali
		// (10-60 min) fanno ricomparire le carte più volte nello stesso giorno.
		for (;;) {
			while (canIntroduceNewCard(budget, cfg.cap, now) && unseen.length > 0) {
				const c = unseen.shift()!;
				c.srs = createInitialSrs(c.id, now);
				budget = recordNewCardIntroduced(budget, now);
				introducedToday += 1;
			}
			const due = cards.filter((c) => c.srs && !c.srs.buried && c.srs.next_review_date <= now);
			if (due.length > 0) {
				for (const c of due) {
					const p = Math.max(0, Math.min(1, pByStage(c.srs!.srs_stage, c.pBase)));
					const correct = rng() < p;
					c.srs = applySrsReview(c.srs!, correct, now, once);
					reviewsToday += 1;
					totalReviews += 1;
				}
				continue;
			}
			let nextDue = Infinity;
			for (const c of cards) {
				if (c.srs && !c.srs.buried && c.srs.next_review_date < nextDue) nextDue = c.srs.next_review_date;
			}
			if (nextDue < dayEnd) {
				now = nextDue;
				continue;
			}
			break;
		}

		now = dayEnd;
		const seen = cards.filter((c) => c.srs);
		const questionsToday = reviewsToday + introducedToday;
		const minutesToday = (questionsToday * secQ) / 60;
		totalMinutes += minutesToday;
		days.push({
			day,
			introduced: introducedToday,
			reviews: reviewsToday,
			questions: questionsToday,
			minutes: minutesToday,
			dueBacklogAtDayEnd: cards.filter((c) => c.srs && !c.srs.buried && c.srs.next_review_date <= now).length,
			mastered: seen.filter((c) => isMastered(c.srs!)).length,
			weak: seen.filter((c) => isWeak(c.srs!)).length
		});
		maxIntroducedInADay = Math.max(maxIntroducedInADay, introducedToday);
	}

	return { cards, days, maxIntroducedInADay, totalReviews, totalMinutes };
}

// ── Report ──────────────────────────────────────────────────────────────────

export interface Scenario {
	nome: string;
	cfg: SimConfig;
}

function weekAvgReviews(days: DayStat[], week: number): number {
	const slice = days.slice((week - 1) * 7, week * 7);
	if (slice.length === 0) return 0;
	return Math.round(slice.reduce((s, d) => s + d.reviews, 0) / slice.length);
}
function valueAtWeekEnd(days: DayStat[], week: number, key: 'weak' | 'mastered'): number {
	const idx = Math.min(week * 7 - 1, days.length - 1);
	return days[idx]?.[key] ?? 0;
}
function daysTo(days: DayStat[], cardCount: number, frac: number): string {
	const target = cardCount * frac;
	const hit = days.find((d) => d.mastered >= target);
	return hit ? String(hit.day + 1) : `>${days.length}`;
}

export function runScenarios(scenarios: Scenario[]): SimResult[] {
	return scenarios.map((s) => simulate(s.cfg));
}

export function report(scenarios: Scenario[]): string {
	const lines: string[] = [];
	lines.push('# Simulatore di studio — report', '');
	lines.push('> Generato da `SIM=1 npx vitest run src/lib/core/studySim.report.test.ts`.');
	lines.push('> Modello del cuore SRS (ignora giochi/avventure/consolida, giorni saltati).', '');
	lines.push('Assunzioni: ~7s a domanda; la sessione del giorno smaltisce tutto il dovuto.');
	lines.push('«Padroneggiato» = padronanza ≥ 60% (70% stage + 30% mastery). «Debole» = <60% e già sbagliata.', '');
	lines.push('| Scenario | Catalogo | Nuove/g | Precisione | 1 volta/g | Giorni al 80% | Min/g medi | Min/g picco | Ripassi/g sett.1/4/12 | Backlog max | Deboli sett.1/4/12 |');
	lines.push('|---|--:|--:|--:|:--:|--:|--:|--:|:--:|--:|:--:|');
	for (const s of scenarios) {
		const r = simulate(s.cfg);
		const d = r.days;
		const n = s.cfg.cardCount;
		const avgMin = Math.round(d.reduce((x, y) => x + y.minutes, 0) / d.length);
		const peakMin = Math.round(Math.max(...d.map((x) => x.minutes)));
		const backlogMax = Math.max(...d.map((x) => x.dueBacklogAtDayEnd));
		const acc = typeof s.cfg.pCorrect === 'number' ? `${Math.round(s.cfg.pCorrect * 100)}%` : 'var';
		lines.push(
			`| ${s.nome} | ${n} | ${s.cfg.cap} | ${acc} | ${(s.cfg.oncePerDay ?? true) ? 'sì' : 'no'} | ` +
				`${daysTo(d, n, 0.8)} | ${avgMin} | ${peakMin} | ` +
				`${weekAvgReviews(d, 1)}/${weekAvgReviews(d, 4)}/${weekAvgReviews(d, 12)} | ${backlogMax} | ` +
				`${valueAtWeekEnd(d, 1, 'weak')}/${valueAtWeekEnd(d, 4, 'weak')}/${valueAtWeekEnd(d, 12, 'weak')} |`
		);
	}
	lines.push('');
	return lines.join('\n');
}
