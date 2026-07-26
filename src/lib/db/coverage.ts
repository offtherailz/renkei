import { db } from './schema';
import { normalizeMastery } from '$lib/core/srs';
import { gatherKeys } from './queries';
import type { StudyObjective, SrsProgress } from '$lib/types/models';

// ── Funzioni PURE (testabili senza Dexie) ──────────────────────────────────

export interface CoverageCell {
	total: number; // quante chiavi ha la riga
	covered: number; // quante di quelle sono anche nella colonna
	uncovered: number; // total - covered
	pct: number; // 0-100, covered/total (0 se total=0)
}

// Quante chiavi della riga (es. tutte le parole N4) sono anche nella colonna
// (es. tutte le chiavi di Genki II). Le chiavi "extra" della colonna che non
// stanno nella riga non contano: la cella misura la copertura DELLA RIGA.
export function coverageCell(rowKeys: Set<string>, colKeys: Set<string>): CoverageCell {
	let covered = 0;
	for (const k of rowKeys) {
		if (colKeys.has(k)) covered++;
	}
	const total = rowKeys.size;
	const uncovered = total - covered;
	const pct = total > 0 ? Math.round((covered / total) * 100) : 0;
	return { total, covered, uncovered, pct };
}

export interface TypeSplit {
	words: number;
	kanji: number;
	grammar: number;
}

// Conta le chiavi per tipo (prefisso "word:"/"kanji:"/"grammar:"), ignorando
// altri tipi (conj:/particella:/counter:/phrase:/gram: non appartengono alle
// classificazioni per obiettivo di catalogo).
export function splitByType(keys: Iterable<string>): TypeSplit {
	let words = 0,
		kanji = 0,
		grammar = 0;
	for (const k of keys) {
		if (k.startsWith('word:')) words++;
		else if (k.startsWith('kanji:')) kanji++;
		else if (k.startsWith('grammar:')) grammar++;
	}
	return { words, kanji, grammar };
}

// ── Sorgenti di classificazione ────────────────────────────────────────────
// Punto d'innesto per estendere /copertura a nuove classificazioni (es. domani
// "capitoli di un libro" via chapter_tags) senza toccare la pagina: basta far
// sì che listClassificationSources() restituisca anche righe/colonne di quel
// tipo, con le stesse forme { id, name, keys }.

export type ClassificationKind = 'jlpt' | 'course' | 'chapter';

export interface ClassificationSource {
	id: string; // objective id (es. "obj-catalog-n4", "course:genki-1")
	kind: ClassificationKind;
	name: string;
	keys: string[]; // catalog_item_keys uniche (proprie + figli)
}

// Righe = radici JLPT (obj-catalog-n5, obj-catalog-n4, …). Colonne = radici
// corso (course:<id>). Entrambe derivate dagli study_objectives esistenti,
// non cablate a mano: una terza sorgente (chapter) si aggiunge qui.
export function listClassificationSources(allObjectives: StudyObjective[]): {
	rows: ClassificationSource[];
	cols: ClassificationSource[];
} {
	const jlptRoots = allObjectives.filter(
		(o) => o.objective_type === 'jlpt' && !o.parent_objective_id
	);
	const courseRoots = allObjectives.filter(
		(o) => !o.parent_objective_id && o.id.startsWith('course:')
	);

	const rows: ClassificationSource[] = jlptRoots.map((o) => ({
		id: o.id,
		kind: 'jlpt',
		name: o.name,
		keys: gatherKeys(o.id, allObjectives)
	}));

	const cols: ClassificationSource[] = courseRoots.map((o) => ({
		id: o.id,
		kind: 'course',
		name: o.name,
		keys: gatherKeys(o.id, allObjectives)
	}));

	return { rows, cols };
}

// ── Funzioni che leggono il DB ──────────────────────────────────────────────

export interface CoverageMatrixCell extends CoverageCell {
	mastery: number; // 0-100, media dei coperti (0 se covered=0)
}

export interface CoverageRow {
	source: ClassificationSource;
	split: TypeSplit;
	cells: Record<string, CoverageMatrixCell>; // per colId
}

export interface CoverageMatrix {
	rows: CoverageRow[];
	cols: ClassificationSource[];
}

export async function loadCoverageMatrix(): Promise<CoverageMatrix> {
	const [allObjectives, allSrs] = await Promise.all([
		db.study_objectives.toArray(),
		db.srs_progress.toArray()
	]);
	const srsMap = new Map<string, SrsProgress>(allSrs.map((s) => [s.id_item, s]));
	const { rows, cols } = listClassificationSources(allObjectives);

	const matrixRows: CoverageRow[] = rows.map((row) => {
		const rowKeySet = new Set(row.keys);
		const cells: Record<string, CoverageMatrixCell> = {};
		for (const col of cols) {
			const colKeySet = new Set(col.keys);
			const cell = coverageCell(rowKeySet, colKeySet);
			let masterySum = 0;
			let masteryCount = 0;
			for (const key of row.keys) {
				if (!colKeySet.has(key)) continue;
				const srs = srsMap.get(key);
				if (srs) {
					masterySum += normalizeMastery(srs.srs_stage, srs.mastery_points);
					masteryCount++;
				}
			}
			const mastery = masteryCount > 0 ? Math.round(masterySum / masteryCount) : 0;
			cells[col.id] = { ...cell, mastery };
		}
		return { source: row, split: splitByType(row.keys), cells };
	});

	return { rows: matrixRows, cols };
}

export interface UncoveredItem {
	key: string; // "word:<id>" | "kanji:<id>" | "grammar:<id>"
	type: 'word' | 'kanji' | 'grammar';
	id: string;
	text: string; // scrittura (parole), carattere (kanji), struttura (grammatica)
	href: string; // path relativo (senza base) alla scheda dell'item
}

// Item della riga NON presenti nella colonna (o in nessuna colonna, se colId
// è omesso), con etichetta leggibile. `limit` assente → nessun taglio.
export async function loadUncoveredItems(
	rowId: string,
	colId: string | null,
	limit?: number
): Promise<UncoveredItem[]> {
	const allObjectives = await db.study_objectives.toArray();
	const { rows, cols } = listClassificationSources(allObjectives);
	const row = rows.find((r) => r.id === rowId);
	if (!row) return [];

	const colKeySet = new Set<string>();
	if (colId) {
		const col = cols.find((c) => c.id === colId);
		if (col) for (const k of col.keys) colKeySet.add(k);
	} else {
		for (const col of cols) for (const k of col.keys) colKeySet.add(k);
	}

	const missingKeys = row.keys.filter((k) => !colKeySet.has(k));
	const sliced = typeof limit === 'number' ? missingKeys.slice(0, limit) : missingKeys;

	const out: UncoveredItem[] = [];
	for (const key of sliced) {
		const [type, ...rest] = key.split(':');
		const id = rest.join(':');
		if (type === 'word') {
			const w = await db.words.get(id);
			out.push({ key, type: 'word', id, text: w?.scrittura ?? id, href: `detail/${encodeURIComponent(key)}` });
		} else if (type === 'kanji') {
			const k = await db.kanji.get(id);
			out.push({ key, type: 'kanji', id, text: k?.id ?? id, href: `detail/${encodeURIComponent(key)}` });
		} else if (type === 'grammar') {
			const g = await db.grammar.get(id);
			out.push({
				key,
				type: 'grammar',
				id,
				text: g?.struttura ?? id,
				href: `detail/${encodeURIComponent(key)}`
			});
		}
	}
	return out;
}
