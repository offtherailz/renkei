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

export async function loadObjectiveSummaries(): Promise<ObjectiveSummary[]> {
	const [allObjectives, allSrs] = await Promise.all([
		db.study_objectives.toArray(),
		db.srs_progress.toArray()
	]);

	const srsMap = new Map<string, SrsProgress>(allSrs.map((s) => [s.id_item, s]));
	const now = Date.now();

	const topLevel = allObjectives.filter((o) => !o.parent_objective_id);
	return topLevel.map((obj) => {
		const keys = gatherKeys(obj.id, allObjectives);
		const unique = [...new Set(keys)];
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

export interface SkillStat {
	total: number; // item di questo tipo con progresso registrato (in studio)
	mastery: number; // 0–100 medio di consolidamento
	due: number; // in ritardo (ripasso pronto)
}
export interface SkillMastery {
	words: SkillStat;
	kanji: SkillStat;
	grammar: SkillStat;
}

// Consolidamento diviso per skill (parole / kanji / grammatica), ricavato dai
// progressi SRS. NB: è una foto dello stato attuale, non l'accuracy nel tempo
// (le sessioni non registrano il tipo di ogni risposta).
export async function loadSkillMastery(): Promise<SkillMastery> {
	const allSrs = await db.srs_progress.toArray();
	const now = Date.now();
	const empty = (): SkillStat & { sum: number } => ({ total: 0, mastery: 0, due: 0, sum: 0 });
	const acc: Record<'words' | 'kanji' | 'grammar', SkillStat & { sum: number }> = {
		words: empty(),
		kanji: empty(),
		grammar: empty()
	};
	for (const srs of allSrs) {
		let bucket: (SkillStat & { sum: number }) | null = null;
		if (srs.id_item.startsWith('word:')) bucket = acc.words;
		else if (srs.id_item.startsWith('kanji:')) bucket = acc.kanji;
		else if (srs.id_item.startsWith('grammar:')) bucket = acc.grammar;
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
	return { words: finalize(acc.words), kanji: finalize(acc.kanji), grammar: finalize(acc.grammar) };
}

export async function countDueCards(): Promise<number> {
	const now = Date.now();
	return db.srs_progress
		.where('[srs_stage+next_review_date]')
		.between([0, 0], [7, now], true, true)
		.count();
}
