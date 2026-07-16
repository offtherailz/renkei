import { db } from './schema';
import { normalizeMastery, normalizePracticeOnlyMastery } from '$lib/core/srs';
import { CONJ_CLASS_LABELS } from '$lib/core/conjugation';
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
	const enabled = objectives.filter((o) => o.study_enabled);
	const keys = new Set<string>();
	const stack = [...enabled];
	const seen = new Set(enabled.map((o) => o.id));
	while (stack.length) {
		const obj = stack.pop()!;
		for (const k of obj.catalog_item_keys) keys.add(k);
		for (const child of objectives.filter(
			(o) => o.parent_objective_id === obj.id && o.study_enabled && !seen.has(o.id)
		)) {
			seen.add(child.id);
			stack.push(child);
		}
	}
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
// e 'conj' (coniugazione per classe) e 'particella' (contatori di sola pratica).
const practiceOnlyKinds = new Set(['phrase', 'conj', 'particella']);
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
		}
		out.push({ kind, raw, label, href, pct });
	}
	return out;
}

export async function countDueCards(): Promise<{ attivi: number; inPausa: number }> {
	const now = Date.now();
	// Due = next_review_date <= adesso (a qualunque stage). Vedi nota in
	// getDueSrsCards: l'indice composto sovrastimerebbe includendo date future.
	const due = await db.srs_progress.where('next_review_date').belowOrEqual(now).toArray();
	const active = await getActiveItemKeys();
	let attivi = 0;
	let inPausa = 0;
	for (const r of due) {
		if (!isPlanKey(r.id_item) || active.has(r.id_item)) attivi += 1;
		else inPausa += 1;
	}
	return { attivi, inPausa };
}
