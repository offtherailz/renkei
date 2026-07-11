import { db } from './schema';
import { normalizeMastery } from '$lib/core/srs';
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
