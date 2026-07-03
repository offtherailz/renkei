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

export async function countDueCards(): Promise<number> {
	const now = Date.now();
	return db.srs_progress
		.where('[srs_stage+next_review_date]')
		.between([0, 0], [7, now], true, true)
		.count();
}
