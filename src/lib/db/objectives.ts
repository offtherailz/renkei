import { db } from "./schema";
import type { JLPTLevel, StudyObjective } from "../types/models";

function chunkKeys(keys: string[], size: number): string[][] {
	const chunks: string[][] = [];
	for (let i = 0; i < keys.length; i += size) {
		chunks.push(keys.slice(i, i + size));
	}
	return chunks;
}

function buildPackObjectives(
	parentId: string,
	label: string,
	level: JLPTLevel,
	keys: string[],
	packSize: number,
	now: number
): StudyObjective[] {
	return chunkKeys(keys, packSize).map((chunk, index) => ({
		id: `${parentId}-pack-${index + 1}`,
		name: `${label} • Pack ${index + 1}`,
		objective_type: "custom" as const,
		target_jlpt: level,
		parent_objective_id: parentId,
		catalog_item_keys: chunk,
		study_enabled: true,
		created_at: now,
		updated_at: now
	}));
}

export async function ensureDefaultObjectives(): Promise<void> {
	const rows = await db.study_objectives.toArray();
	const [seedWords, seedGrammar, seedKanji] = await Promise.all([
		db.words.toArray(),
		db.grammar.toArray(),
		db.kanji.toArray()
	]);

	const levelWordKeys = (level: JLPTLevel): string[] =>
		seedWords.filter((w) => w.livello_jlpt === level).map((w) => `word:${w.id}`);

	const levelGrammarKeys = (level: JLPTLevel): string[] =>
		seedGrammar.filter((g) => g.livello_jlpt === level).map((g) => `grammar:${g.id}`);

	const levelKanjiKeys = (level: JLPTLevel): string[] => {
		const kanjiSet = new Set(
			seedWords.filter((w) => w.livello_jlpt === level).flatMap((w) => w.kanji_usati)
		);
		return seedKanji.filter((k) => kanjiSet.has(k.id)).map((k) => `kanji:${k.id}`);
	};

	const now = Date.now();
	const defaults: StudyObjective[] = [
		{
			id: "obj-catalog-n5",
			name: "Catalogo JLPT N5",
			objective_type: "jlpt",
			target_jlpt: "N5",
			catalog_item_keys: [],
			study_enabled: true,
			created_at: now,
			updated_at: now
		},
		{
			id: "obj-catalog-n5-words",
			name: "Parole N5",
			objective_type: "custom",
			target_jlpt: "N5",
			parent_objective_id: "obj-catalog-n5",
			catalog_item_keys: levelWordKeys("N5"),
			study_enabled: true,
			created_at: now,
			updated_at: now
		},
		{
			id: "obj-catalog-n5-kanji",
			name: "Kanji N5",
			objective_type: "custom",
			target_jlpt: "N5",
			parent_objective_id: "obj-catalog-n5",
			catalog_item_keys: levelKanjiKeys("N5"),
			study_enabled: true,
			created_at: now,
			updated_at: now
		},
		{
			id: "obj-catalog-n5-grammar",
			name: "Grammatica N5",
			objective_type: "custom",
			target_jlpt: "N5",
			parent_objective_id: "obj-catalog-n5",
			catalog_item_keys: levelGrammarKeys("N5"),
			study_enabled: true,
			created_at: now,
			updated_at: now
		},
		{
			id: "obj-catalog-n4",
			name: "Catalogo JLPT N4",
			objective_type: "jlpt",
			target_jlpt: "N4",
			catalog_item_keys: [],
			study_enabled: true,
			created_at: now,
			updated_at: now
		},
		{
			id: "obj-catalog-n4-words",
			name: "Parole N4",
			objective_type: "custom",
			target_jlpt: "N4",
			parent_objective_id: "obj-catalog-n4",
			catalog_item_keys: levelWordKeys("N4"),
			study_enabled: true,
			created_at: now,
			updated_at: now
		},
		{
			id: "obj-catalog-n4-kanji",
			name: "Kanji N4",
			objective_type: "custom",
			target_jlpt: "N4",
			parent_objective_id: "obj-catalog-n4",
			catalog_item_keys: levelKanjiKeys("N4"),
			study_enabled: true,
			created_at: now,
			updated_at: now
		},
		{
			id: "obj-catalog-n4-grammar",
			name: "Grammatica N4",
			objective_type: "custom",
			target_jlpt: "N4",
			parent_objective_id: "obj-catalog-n4",
			catalog_item_keys: levelGrammarKeys("N4"),
			study_enabled: true,
			created_at: now,
			updated_at: now
		}
	];

	defaults.push(
		...buildPackObjectives("obj-catalog-n5-words", "Parole N5", "N5", levelWordKeys("N5"), 50, now),
		...buildPackObjectives("obj-catalog-n5-kanji", "Kanji N5", "N5", levelKanjiKeys("N5"), 20, now),
		...buildPackObjectives("obj-catalog-n5-grammar", "Grammatica N5", "N5", levelGrammarKeys("N5"), 8, now),
		...buildPackObjectives("obj-catalog-n4-words", "Parole N4", "N4", levelWordKeys("N4"), 50, now),
		...buildPackObjectives("obj-catalog-n4-kanji", "Kanji N4", "N4", levelKanjiKeys("N4"), 20, now),
		...buildPackObjectives("obj-catalog-n4-grammar", "Grammatica N4", "N4", levelGrammarKeys("N4"), 8, now)
	);

	const previousById = new Map(rows.map((row) => [row.id, row]));
	const syncedDefaults = defaults.map((objective) => {
		const previous = previousById.get(objective.id);
		return previous
			? { ...objective, study_enabled: previous.study_enabled, created_at: previous.created_at, updated_at: now }
			: objective;
	});

	const staleSystemIds = rows
		.map((row) => row.id)
		.filter((id) => id.startsWith("obj-catalog-") && !syncedDefaults.some((next) => next.id === id));

	if (staleSystemIds.length > 0) {
		await db.study_objectives.bulkDelete(staleSystemIds);
	}

	await db.study_objectives.bulkPut(syncedDefaults);
}

export async function ensureDefaultSettings(): Promise<void> {
	const DEFAULT_SETTINGS = {
		id: "default" as const,
		auto_next_delay_ms: 2000,
		max_answer_time_ms: 20000,
		session_duration_minutes: 5,
		session_timer_runs_in_detail: false,
		updated_at: Date.now()
	};
	const row = await db.app_settings.get("default");
	if (!row) {
		await db.app_settings.put(DEFAULT_SETTINGS);
	}
}

export async function ensureDefaultStudyGoal(): Promise<void> {
	const row = await db.study_goals.get("default");
	if (row) return;
	await db.study_goals.put({
		id: "default",
		target_jlpt: "N4",
		daily_new_words: 10,
		daily_reviews: 20,
		daily_grammar: 5,
		modes_priority: ["multiple-choice", "flashcard-production", "sentence-ordering", "cloze"],
		updated_at: Date.now()
	});
}
