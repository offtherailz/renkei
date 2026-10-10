import { db } from './schema';
import { normalizeMastery, normalizePracticeOnlyMastery } from '$lib/core/srs';
import { CONJ_CLASS_LABELS } from '$lib/core/conjugation';
import { GRAMMAR_FORMS } from '$lib/data/grammarForms';
import { findMondai } from '$lib/data/esame-n4';
import { findMazzo, findAutoMazzo } from '$lib/data/mazzi';
import type { WeakWord } from '$lib/core/handsFree';
import type { StudyObjective, SrsProgress } from '$lib/types/models';

export interface ObjectiveSummary {
	objective: StudyObjective;
	totalItems: number;
	progress: number; // 0–100
	words: number;
	kanji: number;
	grammar: number;
	dueCount: number;
}

function gatherKeys(
	objectiveId: string,
	allObjectives: StudyObjective[]
): string[] {
	const self = allObjectives.find((o) => o.id === objectiveId);
	if (!self) return [];

	const keys = [...self.catalog_item_keys];
	const children = allObjectives.filter((o) => o.parent_objective_id === objectiveId);
	for (const child of children) {
		keys.push(...gatherKeys(child.id, allObjectives));
	}
	return [...new Set(keys)];
}

function countBreakdown(keys: string[]) {
	let words = 0, kanji = 0, grammar = 0;
	for (const k of keys) {
		if (k.startsWith('word:')) words++;
		else if (k.startsWith('kanji:')) kanji++;
		else if (k.startsWith('grammar:')) grammar++;
	}
	return { words, kanji, grammar };
}

function summarizeObjectives(
	objectives: StudyObjective[],
	allObjectives: StudyObjective[],
	srsMap: Map<string, SrsProgress>,
	now: number
): ObjectiveSummary[] {
	return objectives.map((obj) => {
		const unique = gatherKeys(obj.id, allObjectives);
		const { words, kanji, grammar } = countBreakdown(unique);

		let masterySum = 0;
		let dueCount = 0;
		for (const key of unique) {
			const srs = srsMap.get(key);
			if (srs) {
				masterySum += normalizeMastery(srs.srs_stage, srs.mastery_points);
				if (srs.next_review_date <= now) dueCount++;
			}
		}

		const progress = unique.length > 0 ? Math.round(masterySum / unique.length) : 0;
		return { objective: obj, totalItems: unique.length, progress, words, kanji, grammar, dueCount };
	});
}

export async function loadObjectiveSummaries(): Promise<ObjectiveSummary[]> {
	const [allObjectives, allSrs] = await Promise.all([
		db.study_objectives.toArray(),
		db.srs_progress.toArray()
	]);
	const srsMap = new Map<string, SrsProgress>(allSrs.map((s) => [s.id_item, s]));
	const topLevel = allObjectives.filter((o) => !o.parent_objective_id);
	return summarizeObjectives(topLevel, allObjectives, srsMap, Date.now());
}

// L'albero (Parole/Kanji/Grammatica N5→pack) esiste nel DB ma non si vedeva
// da nessuna parte: questa espone i figli diretti di un nodo (es. "Catalogo
// N5" → Parole/Kanji/Grammatica, o "Kanji N5" → i suoi pack) con lo stesso
// riepilogo dei nodi di primo livello, per renderli espandibili in UI.
export async function loadObjectiveChildren(parentId: string): Promise<ObjectiveSummary[]> {
	const [allObjectives, allSrs] = await Promise.all([
		db.study_objectives.toArray(),
		db.srs_progress.toArray()
	]);
	const srsMap = new Map<string, SrsProgress>(allSrs.map((s) => [s.id_item, s]));
	const children = allObjectives
		.filter((o) => o.parent_objective_id === parentId)
		.sort((a, b) => a.name.localeCompare(b.name, 'it', { numeric: true }));
	return summarizeObjectives(children, allObjectives, srsMap, Date.now());
}

// Obiettivi (pack e lezioni, a qualunque livello) "completati": ogni loro
// carta ha almeno un record SRS, cioè è stata incontrata almeno una volta.
export async function loadCompletedObjectives(): Promise<{ id: string; name: string }[]> {
	const [allObjectives, allSrs] = await Promise.all([
		db.study_objectives.toArray(),
		db.srs_progress.toArray()
	]);
	const seen = new Set(allSrs.map((s) => s.id_item));
	const done: { id: string; name: string }[] = [];
	for (const obj of allObjectives) {
		const keys = gatherKeys(obj.id, allObjectives);
		if (keys.length > 0 && keys.every((k) => seen.has(k))) {
			done.push({ id: obj.id, name: obj.name });
		}
	}
	return done;
}

export interface SkillStat {
	total: number; // item di questo tipo con progresso registrato (in studio)
	mastery: number; // 0–100 medio di consolidamento
	due: number; // in ritardo (ripasso pronto)
}
export interface SkillMastery {
	words: SkillStat;
	kanji: SkillStat;
	grammar: SkillStat;
	counters: SkillStat;
}

// Consolidamento diviso per skill (parole / kanji / grammatica), ricavato dai
// progressi SRS. NB: è una foto dello stato attuale, non l'accuracy nel tempo
// (le sessioni non registrano il tipo di ogni risposta).
export async function loadSkillMastery(): Promise<SkillMastery> {
	const allSrs = await db.srs_progress.toArray();
	const now = Date.now();
	const empty = (): SkillStat & { sum: number } => ({ total: 0, mastery: 0, due: 0, sum: 0 });
	const acc: Record<'words' | 'kanji' | 'grammar' | 'counters', SkillStat & { sum: number }> = {
		words: empty(),
		kanji: empty(),
		grammar: empty(),
		counters: empty()
	};
	for (const srs of allSrs) {
		let bucket: (SkillStat & { sum: number }) | null = null;
		if (srs.id_item.startsWith('word:')) bucket = acc.words;
		else if (srs.id_item.startsWith('kanji:')) bucket = acc.kanji;
		else if (srs.id_item.startsWith('grammar:')) bucket = acc.grammar;
		else if (srs.id_item.startsWith('counter:')) bucket = acc.counters;
		if (!bucket) continue;
		bucket.total += 1;
		bucket.sum += normalizeMastery(srs.srs_stage, srs.mastery_points);
		if (srs.next_review_date <= now) bucket.due += 1;
	}
	const finalize = (b: SkillStat & { sum: number }): SkillStat => ({
		total: b.total,
		mastery: b.total > 0 ? Math.round(b.sum / b.total) : 0,
		due: b.due
	});
	return {
		words: finalize(acc.words),
		kanji: finalize(acc.kanji),
		grammar: finalize(acc.grammar),
		counters: finalize(acc.counters)
	};
}

// Item nel "pool attivo": obiettivi in studio (+figli in studio). I ripassi
// di obiettivi in pausa restano salvati ma non vengono proposti né contati.
export async function getActiveItemKeys(): Promise<Set<string>> {
	const objectives = await db.study_objectives.toArray();
	const byId = new Map(objectives.map((o) => [o.id, o]));
	// attivo solo se ESSO e tutti gli antenati sono attivi (la pausa del padre
	// mette in pausa i figli) — stessa semantica del pool quiz.
	const effEnabled = (o: (typeof objectives)[number]): boolean => {
		let cur: (typeof objectives)[number] | undefined = o;
		const guard = new Set<string>();
		while (cur) {
			if (guard.has(cur.id)) break;
			guard.add(cur.id);
			if (!cur.study_enabled) return false;
			cur = cur.parent_objective_id ? byId.get(cur.parent_objective_id) : undefined;
		}
		return true;
	};
	const keys = new Set<string>();
	for (const o of objectives) if (effEnabled(o)) for (const k of o.catalog_item_keys) keys.add(k);
	return keys;
}

// Le pratiche fuori piano (contatori dalle avventure…) sono sempre "attive":
// non appartengono a nessun obiettivo.
function isPlanKey(key: string): boolean {
	return key.startsWith('word:') || key.startsWith('kanji:') || key.startsWith('grammar:');
}

// Item deboli (mastery < 60%): usato dal teaser in home e dalla pagina
// /punti-deboli (elenco completo). `limit` assente → nessun taglio.
export interface WeakItem {
	kind: string; // 'word' | 'grammar' | 'counter' | 'kanji' | 'phrase' | 'conj' | 'particella'
	raw: string; // suffisso dopo 'kind:' (es. 'godan', 'に', id parola)
	label: string;
	href: string; // path relativo (senza base) alla pagina/riferimento dell'elemento
	pct: number;
}

// La riga dei punti deboli linka alla PAGINA dell'elemento (scheda/riferimento),
// non al drill: conj → /forme, particella → /particelle, contatore → /contatori,
// parola/kanji/grammatica → /detail. Il drill vero è il ripasso iterato (Blocco F).
const CONJ_FORME_SLUG: Record<string, string> = {
	godan: 'godan',
	ichidan: 'ichidan',
	irregular: 'fukisoku',
	'i-keiyoushi': 'i-keiyoushi',
	'na-keiyoushi': 'na-keiyoushi'
};

// Kind "solo pratica": non hanno mai uno srs_stage vero (resta 0), quindi il
// peso 70/30 con lo stage li terrebbe bloccati sotto soglia a vita. Per questi
// la padronanza è tutta nei mastery_points. 'phrase' (avventure/giochi a voce)
// e 'conj' (coniugazione per classe), 'particella' e 'gram' (costruzioni:
// potenziale, passiva, condizionali…) — contatori di sola pratica.
const practiceOnlyKinds = new Set(['phrase', 'conj', 'particella', 'gram', 'mondai']);
function pctFor(r: SrsProgress): number {
	const kind = r.id_item.includes(':') ? r.id_item.split(':')[0] : 'word';
	return practiceOnlyKinds.has(kind)
		? normalizePracticeOnlyMastery(r.mastery_points)
		: normalizeMastery(r.srs_stage, r.mastery_points);
}

export async function loadWeakItems(limit?: number): Promise<WeakItem[]> {
	const rows = await db.srs_progress.toArray();
	const active = await getActiveItemKeys();
	const scored = rows
		.filter((r) => !isPlanKey(r.id_item) || active.has(r.id_item))
		// "Debole" = ha dato prova di debolezza (almeno un errore), non "è ancora
		// giovane": senza questo filtro ogni carta appena introdotta (stage 0-1,
		// mastery bassa per definizione) inonderebbe la lista il giorno dopo.
		// Fallback per le righe storiche senza `lapses`: mastery negativa = ha
		// sbagliato più che indovinato (es. i miss delle avventure).
		.filter((r) => !r.buried)
		// Le frasi (phrase: avventure/giochi a voce) NON entrano nei punti deboli:
		// si consolidano rigiocando l'attività, non con un drill — e la voce non
		// penalizza. Molte inoltre non hanno una pagina propria (le frasi delle
		// avventure vivono nei copioni) → il link «consolida» sarebbe rotto.
		.filter((r) => !r.id_item.startsWith('phrase:'))
		.filter((r) => (r.lapses ?? 0) > 0 || r.mastery_points < 0)
		.map((r) => ({ r, pct: pctFor(r) }))
		.filter((x) => x.pct < 60)
		.sort((a, b) => a.pct - b.pct);
	const sliced = typeof limit === 'number' ? scored.slice(0, limit) : scored;
	const out: WeakItem[] = [];
	for (const { r, pct } of sliced) {
		const [kind, ...rest] = r.id_item.includes(':') ? r.id_item.split(':') : ['word', r.id_item];
		const raw = rest.join(':') || r.id_item;
		let label = raw;
		// default: item senza pagina propria (phrase dalle avventure) → drill vocale
		let href = `consolida/${encodeURIComponent(r.id_item)}`;
		if (kind === 'word') {
			label = (await db.words.get(raw))?.scrittura ?? raw;
			href = `detail/${encodeURIComponent(`word:${raw}`)}`;
		} else if (kind === 'kanji') {
			href = `detail/${encodeURIComponent(`kanji:${raw}`)}`;
		} else if (kind === 'grammar') {
			label = (await db.grammar.get(raw))?.struttura ?? raw;
			href = `detail/${encodeURIComponent(`grammar:${raw}`)}`;
		} else if (kind === 'counter') {
			label = (await db.counters.get(raw))?.simbolo ?? raw;
			href = `contatori#${encodeURIComponent(raw)}`;
		} else if (kind === 'conj') {
			label = CONJ_CLASS_LABELS[raw] ?? raw;
			href = `forme#${CONJ_FORME_SLUG[raw] ?? raw}`;
		} else if (kind === 'particella') {
			label = `Particella ${raw}`;
			href = `particelle#${encodeURIComponent(raw)}`;
		} else if (kind === 'gram') {
			label = GRAMMAR_FORMS.find((f) => f.slug === raw)?.title ?? raw;
			href = `forme-composte#${raw}`;
		} else if (kind === 'mondai') {
			const found = findMondai(raw);
			label = found ? `${found.mondai.titolo_jp} · ${found.mondai.titolo_it}` : raw;
			href = `esame/${encodeURIComponent(raw)}`;
		}
		out.push({ kind, raw, label, href, pct });
	}
	return out;
}

// Parole deboli per il ripasso vocale «Mani libere» (significato it → parola jp).
// Stesso criterio di debolezza di loadWeakItems, ma solo parole e con i dati
// (it/scrittura/lettura) pronti per il round vocale.
export async function loadWeakWordsRecall(limit = 20): Promise<WeakWord[]> {
	const rows = await db.srs_progress.toArray();
	const active = await getActiveItemKeys();
	const scored = rows
		.filter((r) => !isPlanKey(r.id_item) || active.has(r.id_item))
		.filter((r) => !r.buried)
		.filter((r) => r.id_item.startsWith('word:') || !r.id_item.includes(':'))
		.filter((r) => (r.lapses ?? 0) > 0 || r.mastery_points < 0)
		.map((r) => ({ r, pct: pctFor(r) }))
		.filter((x) => x.pct < 60)
		.sort((a, b) => a.pct - b.pct)
		.slice(0, limit);
	const out: WeakWord[] = [];
	for (const { r } of scored) {
		const id = r.id_item.startsWith('word:') ? r.id_item.slice('word:'.length) : r.id_item;
		const w = await db.words.get(id);
		if (!w) continue;
		const it = Array.isArray(w.significato.it) ? w.significato.it.join(', ') : w.significato.it;
		if (!it || !w.scrittura) continue;
		out.push({ it, jp: w.scrittura, yomi: w.lettura, creditKey: `word:${id}` });
	}
	return out;
}

// Parole di un mazzo tematico per il ripasso vocale «Mani libere». Copre sia i
// mazzi curati (carte con jp/yomi/it pronti) sia i mazzi automatici di parole
// (filtro su catalogo). Credito sulla parola di catalogo quando risolvibile.
export async function loadMazzoWordsRecall(mazzoId: string, limit = 20): Promise<WeakWord[]> {
	const out: WeakWord[] = [];
	const curato = findMazzo(mazzoId);
	if (curato) {
		for (const c of curato.carte) {
			if (!c.it || !c.jp) continue;
			const w = await db.words.where('scrittura').equals(c.jp).first();
			out.push({ it: c.it, jp: c.jp, yomi: c.yomi, creditKey: w ? `word:${w.id}` : `phrase:${c.jp}` });
			if (out.length >= limit) break;
		}
		return out;
	}
	const auto = findAutoMazzo(mazzoId);
	if (auto && auto.kind === 'word') {
		const q = await loadAutoQueue(mazzoId, limit);
		for (const { raw } of q) {
			const w = await db.words.get(raw);
			if (!w) continue;
			const it = Array.isArray(w.significato.it) ? w.significato.it.join(', ') : w.significato.it;
			if (!it || !w.scrittura) continue;
			out.push({ it, jp: w.scrittura, yomi: w.lettura, creditKey: `word:${w.id}` });
		}
	}
	return out;
}

// Copertura N4 per il cruscotto «Pronto per l'N4»: quanti kanji / parole /
// grammatica di livello N4 sono già padroneggiati (mastery ≥ 60%) sul totale.
export interface CoveragePart {
	done: number;
	total: number;
}
export interface N4Readiness {
	kanji: CoveragePart;
	words: CoveragePart;
	grammar: CoveragePart;
}
export async function loadN4Readiness(): Promise<N4Readiness> {
	const [words, kanji, grammar, srs] = await Promise.all([
		db.words.toArray(),
		db.kanji.toArray(),
		db.grammar.toArray(),
		db.srs_progress.toArray()
	]);
	const byId = new Map(srs.map((r) => [r.id_item, r]));
	const mastered = (key: string): boolean => {
		const r = byId.get(key);
		return r ? normalizeMastery(r.srs_stage, r.mastery_points) >= 60 : false;
	};
	const calc = (arr: { id: string; livello_jlpt: string }[], prefix: string): CoveragePart => {
		const n4 = arr.filter((x) => x.livello_jlpt === 'N4');
		return { total: n4.length, done: n4.filter((x) => mastered(`${prefix}:${x.id}`)).length };
	};
	return {
		kanji: calc(kanji, 'kanji'),
		words: calc(words, 'word'),
		grammar: calc(grammar, 'grammar')
	};
}

// Coda di ripasso mirato N4 per area (dalle card del cruscotto "Pronto per l'N4?").
// Restituisce le carte N4 NON ancora padroneggiate (mastery < 60), le mai viste
// per prime, poi le altre dalla padronanza più bassa. Formato adatto a weakQueue.
export type N4ReviewArea = 'kanji' | 'word' | 'grammar';
export async function loadN4ReviewQueue(area: N4ReviewArea, limit = 12): Promise<{ kind: string; raw: string }[]> {
	const table = area === 'kanji' ? db.kanji : area === 'word' ? db.words : db.grammar;
	const [items, srs] = await Promise.all([table.toArray(), db.srs_progress.toArray()]);
	const byId = new Map(srs.map((r) => [r.id_item, r]));
	const n4 = (items as { id: string; livello_jlpt: string }[]).filter((x) => x.livello_jlpt === 'N4');
	const scored = n4
		.map((x) => {
			const r = byId.get(`${area}:${x.id}`);
			const m = r ? normalizeMastery(r.srs_stage, r.mastery_points) : -1; // -1 = mai vista
			return { id: x.id, m };
		})
		.filter((x) => x.m < 60)
		.sort((a, b) => a.m - b.m);
	return scored.slice(0, limit).map((x) => ({ kind: area, raw: x.id }));
}

// Coda di ripasso per una COLLEZIONE tematica (mazzo): le parole del mazzo che
// esistono a catalogo diventano item del quiz, che ci genera sopra TUTTI i tipi
// di domanda (lettura/ascolto/composizione/kanji…). Le voci non a catalogo
// (espressioni tipo 調子がいい) restano solo nelle flashcard, qui si saltano.
export async function loadCollezioneQueue(mazzoId: string): Promise<{ kind: string; raw: string }[]> {
	const { findMazzo } = await import('$lib/data/mazzi');
	const mazzo = findMazzo(mazzoId);
	if (!mazzo) return [];
	const words = await db.words.toArray();
	const byWriting = new Map(words.map((w) => [w.scrittura, w]));
	const byReading = new Map(words.map((w) => [w.lettura, w]));
	const out: { kind: string; raw: string }[] = [];
	const seen = new Set<string>();
	for (const c of mazzo.carte) {
		const w = byWriting.get(c.jp) ?? byReading.get(c.yomi);
		if (w && !seen.has(w.id)) {
			seen.add(w.id);
			out.push({ kind: 'word', raw: w.id });
		}
	}
	return out;
}

// Coda per un mazzo AUTO (filtro sul catalogo): parole per tipo/livello/tag, o
// punti grammaticali per livello. Mescolate e limitate a una dose di sessione.
export async function loadAutoQueue(id: string, limit = 15): Promise<{ kind: string; raw: string }[]> {
	const { findAutoMazzo } = await import('$lib/data/mazzi');
	const m = findAutoMazzo(id);
	if (!m) return [];
	const shuffle = <T>(xs: T[]): T[] => {
		const a = [...xs];
		for (let i = a.length - 1; i > 0; i -= 1) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j]!, a[i]!];
		}
		return a;
	};
	if (m.kind === 'grammar') {
		const g = await db.grammar.toArray();
		let gruppoMap: Record<string, string> = {};
		if (m.gruppo) gruppoMap = (await import('$lib/data/grammar-gruppi.json')).default as Record<string, string>;
		const pool = g.filter(
			(x) =>
				(!m.livello || x.livello_jlpt === m.livello) &&
				(!m.gruppo || gruppoMap[x.id] === m.gruppo) &&
				(x.frasi_esempio?.length ?? 0) > 0
		);
		return shuffle(pool).slice(0, limit).map((x) => ({ kind: 'grammar', raw: x.id }));
	}
	const w = await db.words.toArray();
	const pool = w.filter(
		(x) =>
			(!m.tipo || x.tipo_jp.startsWith(m.tipo)) &&
			(!m.livello || x.livello_jlpt === m.livello) &&
			(!m.tag || (x.study_tags ?? []).includes(m.tag))
	);
	return shuffle(pool).slice(0, limit).map((x) => ({ kind: 'word', raw: x.id }));
}

// Padronanza della grammatica per GRUPPO funzionale (per il cruscotto diagnostico).
// Usa grammar-gruppi.json (id→gruppo) + SRS. mastery media sui punti già provati.
export interface GrammarGroupStat { gruppo: string; total: number; tested: number; mastery: number }
export async function loadGrammarGroupStats(): Promise<Record<string, GrammarGroupStat>> {
	const map = (await import('$lib/data/grammar-gruppi.json')).default as Record<string, string>;
	const [grammar, srs] = await Promise.all([db.grammar.toArray(), db.srs_progress.toArray()]);
	const byId = new Map(srs.map((r) => [r.id_item, r]));
	const out: Record<string, GrammarGroupStat> = {};
	for (const g of grammar) {
		if ((g.frasi_esempio?.length ?? 0) === 0) continue;
		const gr = map[g.id];
		if (!gr) continue;
		const st = (out[gr] ??= { gruppo: gr, total: 0, tested: 0, mastery: 0 });
		st.total += 1;
		const r = byId.get(`grammar:${g.id}`);
		if (r) {
			st.tested += 1;
			st.mastery += normalizeMastery(r.srs_stage, r.mastery_points);
		}
	}
	for (const st of Object.values(out)) st.mastery = st.tested ? Math.round(st.mastery / st.tested) : -1; // -1 = non provato
	return out;
}

// Coda "giro diagnostico" grammatica: ~1-2 punti per ogni gruppo funzionale,
// preferendo i NON ancora provati → sonda tutta la grammatica in fretta.
export async function loadGrammarDiagnosticaQueue(perGruppo = 1): Promise<{ kind: string; raw: string }[]> {
	const map = (await import('$lib/data/grammar-gruppi.json')).default as Record<string, string>;
	const [grammar, srs] = await Promise.all([db.grammar.toArray(), db.srs_progress.toArray()]);
	const have = new Set(srs.map((r) => r.id_item));
	const shuffle = <T>(xs: T[]): T[] => {
		const a = [...xs];
		for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; }
		return a;
	};
	const byGroup: Record<string, typeof grammar> = {};
	for (const g of grammar) {
		if ((g.frasi_esempio?.length ?? 0) === 0) continue;
		const gr = map[g.id];
		if (!gr) continue;
		(byGroup[gr] ??= []).push(g);
	}
	const out: { kind: string; raw: string }[] = [];
	for (const list of Object.values(byGroup)) {
		// prima i non provati, poi gli altri
		const sorted = shuffle(list).sort((a, b) => Number(have.has(`grammar:${a.id}`)) - Number(have.has(`grammar:${b.id}`)));
		for (const g of sorted.slice(0, perGruppo)) out.push({ kind: 'grammar', raw: g.id });
	}
	return shuffle(out);
}

// Padronanza per-mondai dell'esame N4 (chiavi 'mondai:<slug>'). Ritorna la %
// solo per i mondai che hanno almeno un tentativo; gli altri restano ignoti
// (la landing li mostra come "non ancora provato"). Sola pratica → mastery.
export async function loadMondaiMastery(): Promise<Record<string, number>> {
	const rows = await db.srs_progress.where('id_item').startsWith('mondai:').toArray();
	const out: Record<string, number> = {};
	for (const r of rows) {
		const slug = r.id_item.slice('mondai:'.length);
		if (slug) out[slug] = normalizePracticeOnlyMastery(r.mastery_points);
	}
	return out;
}

export async function countDueCards(): Promise<{ attivi: number; inPausa: number }> {
	const now = Date.now();
	// Due = next_review_date <= adesso (a qualunque stage). Vedi nota in
	// getDueSrsCards: l'indice composto sovrastimerebbe includendo date future.
	const due = await db.srs_progress.where('next_review_date').belowOrEqual(now).toArray();
	const active = await getActiveItemKeys();
	// Generabilità: il quiz sa costruire una domanda solo se l'elemento esiste in
	// catalogo, e per la grammatica solo se ha almeno una frase d'esempio. Una
	// carta dovuta ma NON generabile (grammatica senza frasi, kanji/contatore
	// rimosso) veniva contata «in attesa» mentre il quiz diceva subito «tutto
	// completato»: la escludiamo per far combaciare home e sessione.
	const [grammar, kanji, counters, words] = await Promise.all([
		db.grammar.toArray(),
		db.kanji.toArray(),
		db.counters.toArray(),
		db.words.toArray()
	]);
	const grammarOk = new Set(grammar.filter((g) => (g.frasi_esempio?.length ?? 0) > 0).map((g) => `grammar:${g.id}`));
	const kanjiOk = new Set(kanji.map((k) => `kanji:${k.id}`));
	const counterOk = new Set(counters.map((c) => `counter:${c.id}`));
	const wordOk = new Set(words.map((w) => `word:${w.id}`));
	const isServable = (key: string): boolean => {
		if (key.startsWith('grammar:')) return grammarOk.has(key);
		if (key.startsWith('kanji:')) return kanjiOk.has(key);
		if (key.startsWith('counter:')) return counterOk.has(key);
		if (key.startsWith('word:')) return wordOk.has(key);
		return true; // id "nudo" = parola vecchia; il quiz la genera comunque
	};
	let attivi = 0;
	let inPausa = 0;
	for (const r of due) {
		if (r.buried) continue; // seppellite dall'utente: fuori dai conteggi
		// Le righe solo-pratica (conj:/particella:/phrase:) non hanno un vero
		// calendario: la loro next_review_date resta ferma alla creazione, quindi
		// risulterebbero "dovute" per sempre — ma il quiz non le serve mai (si
		// allenano da punti deboli/ripasso). Contarle gonfiava il numero in home
		// ("N in attesa") con un quiz che poi diceva subito "tutto fatto".
		const kind = r.id_item.includes(':') ? r.id_item.split(':')[0]! : 'word';
		if (practiceOnlyKinds.has(kind)) continue;
		if (!isServable(r.id_item)) continue;
		if (!isPlanKey(r.id_item) || active.has(r.id_item)) attivi += 1;
		else inPausa += 1;
	}
	return { attivi, inPausa };
}

// Carte MAI viste negli obiettivi attivi: con 0 ripassi dovuti la home deve
// distinguere "davvero tutto fatto" da "ci sono ancora carte nuove da iniziare"
// (es. subito dopo un reset dei progressi tutto è nuovo, niente è dovuto).
export async function countUnseenActive(): Promise<number> {
	const active = await getActiveItemKeys();
	const seen = new Set((await db.srs_progress.toArray()).map((r) => r.id_item));
	let n = 0;
	for (const k of active) if (!seen.has(k)) n += 1;
	return n;
}
