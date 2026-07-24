// Gioco «Prendi appuntamento» (beta): negoziare giorno+ora con un
// interlocutore, cambiando registro (普通体 / 丁寧 / 敬語) a seconda dello
// scenario. Solo dati/logica pura qui — niente stato UI (vive in
// src/routes/appuntamento/+page.svelte).

// ── Giorni della settimana (曜日): nessun helper esiste in counterGen.ts ──
export interface Weekday {
	jp: string;
	read: string;
	it: string;
}

export const WEEKDAYS: Weekday[] = [
	{ jp: '月曜日', read: 'げつようび', it: 'lunedì' },
	{ jp: '火曜日', read: 'かようび', it: 'martedì' },
	{ jp: '水曜日', read: 'すいようび', it: 'mercoledì' },
	{ jp: '木曜日', read: 'もくようび', it: 'giovedì' },
	{ jp: '金曜日', read: 'きんようび', it: 'venerdì' },
	{ jp: '土曜日', read: 'どようび', it: 'sabato' },
	{ jp: '日曜日', read: 'にちようび', it: 'domenica' }
];

// ── Registro ──
export type Register = 'plain' | 'teinei' | 'keigo';

export type ScenarioId = 'nomi' | 'eiga' | 'cafe' | 'shigoto';

export interface Scenario {
	id: ScenarioId;
	icon: string;
	label: string;
	context: string; // descrizione breve del contesto (per la schermata di scelta)
	register: Register;
	npc: string; // chi è l'interlocutore
	npcIcon: string;
	// Frasi curate (phrase-bank della spec): {G}/{G2}/{H}/{LUOGO}/{MOTIVO} sostituiti a runtime.
	proposeTpl: string;
	acceptTpl: string;
	counterTpl: string; // proposta alternativa dell'utente
	npcAcceptTpl: string;
	npcRejectTpl: string; // include {MOTIVO} e {G2}
	confirmTpl: string; // include {LUOGO}
	motivi: string[];
	luoghi: string[];
}

export const SCENARIOS: Scenario[] = [
	{
		id: 'nomi',
		icon: '🍶',
		label: 'Bere con un amico',
		context: 'Amico stretto — registro casual (普通体)',
		register: 'plain',
		npc: 'amico',
		npcIcon: '🧑',
		proposeTpl: '{G}の{H}、飲みに行かない？',
		acceptTpl: 'うん、いいよ。',
		counterTpl: '{G}はちょっと…{G2}はどう？',
		npcAcceptTpl: 'いいね、行こう！',
		npcRejectTpl: 'ごめん、{G}は{MOTIVO}なんだ。{G2}はどう？',
		confirmTpl: 'じゃあ、{G}の{H}に{LUOGO}で。',
		motivi: ['バイト', '用事', '約束', 'ジム'],
		luoghi: ['駅前', '居酒屋の前']
	},
	{
		id: 'eiga',
		icon: '🎬',
		label: 'Andare al cinema',
		context: 'Conoscente — 丁寧 leggero (です・ます)',
		register: 'teinei',
		npc: 'conoscente',
		npcIcon: '🙂',
		proposeTpl: '{G}の{H}、映画に行きませんか？',
		acceptTpl: 'はい、大丈夫です。',
		counterTpl: '{G}はちょっと都合が悪くて…{G2}はどうですか？',
		npcAcceptTpl: 'いいですね、行きましょう。',
		npcRejectTpl: 'すみません、{G}は{MOTIVO}があって…{G2}はどうですか？',
		confirmTpl: 'じゃあ、{G}の{H}に{LUOGO}で会いましょう。',
		motivi: ['用事', '予定', '仕事'],
		luoghi: ['駅の前', 'カフェの前']
	},
	{
		id: 'cafe',
		icon: '☕',
		label: 'Un caffè con un collega',
		context: 'Collega — 丁寧 pieno (です・ます)',
		register: 'teinei',
		npc: 'collega',
		npcIcon: '🧑‍💼',
		proposeTpl: '{G}の{H}、お茶でもしませんか？',
		acceptTpl: 'はい、大丈夫です。',
		counterTpl: '{G}はちょっと都合が悪くて…{G2}はどうですか？',
		npcAcceptTpl: 'いいですね、行きましょう。',
		npcRejectTpl: 'すみません、{G}は{MOTIVO}があって…{G2}はどうですか？',
		confirmTpl: 'じゃあ、{G}の{H}に{LUOGO}で会いましょう。',
		motivi: ['用事', '予定', '仕事'],
		luoghi: ['駅の前', 'カフェの前']
	},
	{
		id: 'shigoto',
		icon: '💼',
		label: 'Riunione di lavoro',
		context: 'Cliente/superiore — 敬語 (sonkeigo/kenjougo)',
		register: 'keigo',
		npc: 'cliente',
		npcIcon: '👔',
		proposeTpl: '{G}の{H}に、お打ち合わせのお時間をいただけますでしょうか。',
		acceptTpl: 'はい、承知いたしました。',
		counterTpl: '申し訳ございません、{G}は都合がつかず…{G2}はいかがでしょうか。',
		npcAcceptTpl: 'かしこまりました。{G}で結構です。',
		npcRejectTpl: '申し訳ございません、{G}は先約がございまして…{G2}はいかがでしょうか。',
		confirmTpl: 'では、{G}の{H}に{LUOGO}に伺います。',
		motivi: ['先約'],
		luoghi: ['御社', 'ロビー']
	}
];

export function findScenario(id: ScenarioId): Scenario {
	const s = SCENARIOS.find((x) => x.id === id);
	if (!s) throw new Error(`Scenario sconosciuto: ${id}`);
	return s;
}

// ── Calendario personale ──
// 7 giorni (lun-dom) x fasce orarie tipiche di negoziazione (sera/pomeriggio).
export const HOURS: number[] = [10, 12, 14, 16, 18, 19, 20];

export interface CalendarSlot {
	weekdayIndex: number; // 0=lun ... 6=dom
	hour: number;
	busy: boolean;
	reason: string | null; // es. 仕事, ジム, 約束 — solo se busy
}

const BUSY_REASONS = ['仕事', 'ジム', '約束', '用事'];

// Genera un calendario random: ogni giorno ha 1-2 slot occupati tra le HOURS,
// il resto libero. Garantisce sempre almeno metà settimana con qualcosa di
// libero (altrimenti la negoziazione non converge mai).
export function generateWeekCalendar(): CalendarSlot[] {
	const slots: CalendarSlot[] = [];
	for (let d = 0; d < 7; d += 1) {
		const busyCount = 1 + Math.floor(Math.random() * 2); // 1-2 occupati
		const busyHours = new Set<number>();
		while (busyHours.size < busyCount) {
			busyHours.add(HOURS[Math.floor(Math.random() * HOURS.length)]!);
		}
		for (const hour of HOURS) {
			const busy = busyHours.has(hour);
			slots.push({
				weekdayIndex: d,
				hour,
				busy,
				reason: busy ? BUSY_REASONS[Math.floor(Math.random() * BUSY_REASONS.length)]! : null
			});
		}
	}
	return slots;
}

export function isFree(calendar: CalendarSlot[], weekdayIndex: number, hour: number): boolean {
	const slot = calendar.find((s) => s.weekdayIndex === weekdayIndex && s.hour === hour);
	return slot ? !slot.busy : true;
}

export function slotAt(calendar: CalendarSlot[], weekdayIndex: number, hour: number): CalendarSlot | undefined {
	return calendar.find((s) => s.weekdayIndex === weekdayIndex && s.hour === hour);
}

// ── Lettura ora (solo in punto: la spec usa slot orari tondi tipo ７時/２時) ──
import { hourReading } from './counterGen';
export function hourLabel(hour: number): string {
	return `${hour}時`;
}
export function hourSpokenReading(hour: number): string {
	// hourReading gestisce 1-12: normalizza le ore pomeridiane (es. 19 → 7).
	const h12 = ((hour - 1) % 12) + 1;
	return hourReading(h12);
}

// ── Costruzione battute (funzioni pure, testate) ──
export interface Proposal {
	weekdayIndex: number;
	hour: number;
}

function fillTemplate(tpl: string, vars: Record<string, string>): string {
	return tpl.replace(/\{(\w+)\}/g, (m, key: string) => vars[key] ?? m);
}

// Utente propone giorno+ora.
export function buildProposeLine(scenario: Scenario, p: Proposal): string {
	const g = WEEKDAYS[p.weekdayIndex]!.jp;
	const h = hourLabel(p.hour);
	return fillTemplate(scenario.proposeTpl, { G: g, H: h });
}

// Utente accetta la controproposta dell'NPC.
export function buildUserAcceptLine(scenario: Scenario): string {
	return scenario.acceptTpl;
}

// Utente rifiuta/contropropone un altro giorno (G = quello rifiutato, G2 = nuova proposta).
export function buildUserCounterLine(scenario: Scenario, rejected: Proposal, next: Proposal): string {
	const g = WEEKDAYS[rejected.weekdayIndex]!.jp;
	const g2 = `${WEEKDAYS[next.weekdayIndex]!.jp}の${hourLabel(next.hour)}`;
	return fillTemplate(scenario.counterTpl, { G: g, G2: g2 });
}

// NPC accetta la proposta dell'utente.
export function buildNpcAcceptLine(scenario: Scenario, p: Proposal): string {
	const g = `${WEEKDAYS[p.weekdayIndex]!.jp}の${hourLabel(p.hour)}`;
	return fillTemplate(scenario.npcAcceptTpl, { G: g });
}

// NPC rifiuta con motivo e contropropone.
export function buildNpcRejectLine(scenario: Scenario, rejected: Proposal, next: Proposal, motivo: string): string {
	const g = WEEKDAYS[rejected.weekdayIndex]!.jp;
	const g2 = `${WEEKDAYS[next.weekdayIndex]!.jp}の${hourLabel(next.hour)}`;
	return fillTemplate(scenario.npcRejectTpl, { G: g, G2: g2, MOTIVO: motivo });
}

// Conferma finale (giorno+ora+luogo concordati).
export function buildConfirmLine(scenario: Scenario, p: Proposal, luogo: string): string {
	const g = WEEKDAYS[p.weekdayIndex]!.jp;
	const h = hourLabel(p.hour);
	return fillTemplate(scenario.confirmTpl, { G: g, H: h, LUOGO: luogo });
}

// Sceglie una contro-proposta NPC: un giorno/ora diverso dal rifiutato,
// preferendo uno slot dove l'utente stesso NON è occupato (altrimenti il
// negoziato non convergerebbe mai in pochi turni) — ma non è garantito,
// l'utente potrà comunque rifiutare a sua volta.
export function pickNpcCounterProposal(
	calendar: CalendarSlot[],
	rejected: Proposal,
	tried: Proposal[]
): Proposal {
	const isTried = (p: Proposal) =>
		tried.some((t) => t.weekdayIndex === p.weekdayIndex && t.hour === p.hour);
	const candidates: Proposal[] = [];
	for (let d = 0; d < 7; d += 1) {
		for (const hour of HOURS) {
			const p = { weekdayIndex: d, hour };
			if (p.weekdayIndex === rejected.weekdayIndex && p.hour === rejected.hour) continue;
			if (isTried(p)) continue;
			candidates.push(p);
		}
	}
	if (candidates.length === 0) return rejected; // esaurito: ripropone (edge case estremo)
	const free = candidates.filter((p) => isFree(calendar, p.weekdayIndex, p.hour));
	const pool = free.length > 0 ? free : candidates;
	return pool[Math.floor(Math.random() * pool.length)]!;
}

export function randomMotivo(scenario: Scenario): string {
	return scenario.motivi[Math.floor(Math.random() * scenario.motivi.length)]!;
}

export function randomLuogo(scenario: Scenario): string {
	return scenario.luoghi[Math.floor(Math.random() * scenario.luoghi.length)]!;
}

// ── Punteggio ──
// Base per accordo raggiunto + bonus se pochi turni - malus per hint usati.
export function computeScore(turns: number, hintsUsed: number): number {
	const base = 100;
	const turnBonus = Math.max(0, (5 - turns) * 15);
	const hintPenalty = hintsUsed * 12;
	return Math.max(0, base + turnBonus - hintPenalty);
}
