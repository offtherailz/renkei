import { describe, expect, it } from 'vitest';
import { coverageCell, splitByType, listClassificationSources } from './coverage';
import type { StudyObjective } from '$lib/types/models';

describe('coverageCell', () => {
	it('conta i coperti e calcola la percentuale', () => {
		const row = new Set(['word:a', 'word:b', 'word:c', 'kanji:x']);
		const col = new Set(['word:a', 'word:b', 'kanji:z']);
		const cell = coverageCell(row, col);
		expect(cell.total).toBe(4);
		expect(cell.covered).toBe(2);
		expect(cell.uncovered).toBe(2);
		expect(cell.pct).toBe(50);
	});

	it('riga vuota → total 0 e pct 0 (niente divisione per zero)', () => {
		const cell = coverageCell(new Set(), new Set(['word:a']));
		expect(cell.total).toBe(0);
		expect(cell.covered).toBe(0);
		expect(cell.pct).toBe(0);
	});

	it('colonna vuota → copertura 0%', () => {
		const cell = coverageCell(new Set(['word:a', 'word:b']), new Set());
		expect(cell.covered).toBe(0);
		expect(cell.pct).toBe(0);
	});

	it('copertura totale → 100%', () => {
		const row = new Set(['word:a', 'kanji:b']);
		const col = new Set(['word:a', 'kanji:b', 'grammar:c']);
		const cell = coverageCell(row, col);
		expect(cell.covered).toBe(2);
		expect(cell.uncovered).toBe(0);
		expect(cell.pct).toBe(100);
	});

	it('arrotonda la percentuale', () => {
		const row = new Set(['word:a', 'word:b', 'word:c']);
		const col = new Set(['word:a']);
		const cell = coverageCell(row, col);
		expect(cell.pct).toBe(33); // 1/3 = 33.33... arrotondato
	});
});

describe('splitByType', () => {
	it('conta le chiavi per prefisso tipo', () => {
		const split = splitByType(['word:a', 'word:b', 'kanji:x', 'grammar:g1', 'grammar:g2', 'grammar:g3']);
		expect(split).toEqual({ words: 2, kanji: 1, grammar: 3 });
	});

	it('ignora prefissi non di catalogo (conj:/particella:/counter:/phrase:)', () => {
		const split = splitByType(['word:a', 'conj:godan', 'particella:に', 'counter:枚', 'phrase:x']);
		expect(split).toEqual({ words: 1, kanji: 0, grammar: 0 });
	});

	it('insieme vuoto → tutti zero', () => {
		expect(splitByType([])).toEqual({ words: 0, kanji: 0, grammar: 0 });
	});
});

describe('listClassificationSources', () => {
	const now = 1_700_000_000_000;
	function obj(partial: Partial<StudyObjective> & Pick<StudyObjective, 'id' | 'name'>): StudyObjective {
		return {
			objective_type: 'custom',
			catalog_item_keys: [],
			study_enabled: true,
			created_at: now,
			updated_at: now,
			...partial
		};
	}

	it('separa radici JLPT e radici corso, ignorando obiettivi figli e altri tipi', () => {
		const all: StudyObjective[] = [
			obj({ id: 'obj-catalog-n5', name: 'Catalogo JLPT N5', objective_type: 'jlpt' }),
			obj({
				id: 'obj-catalog-n5-words',
				name: 'Parole N5',
				parent_objective_id: 'obj-catalog-n5',
				catalog_item_keys: ['word:a', 'word:b']
			}),
			obj({ id: 'obj-catalog-n4', name: 'Catalogo JLPT N4', objective_type: 'jlpt' }),
			obj({
				id: 'course:genki-1',
				name: 'Genki I',
				catalog_item_keys: []
			}),
			obj({
				id: 'course:genki-1:lesson:L01',
				name: 'Lezione 1',
				parent_objective_id: 'course:genki-1',
				catalog_item_keys: ['word:a', 'grammar:g1']
			})
		];

		const { rows, cols } = listClassificationSources(all);

		expect(rows.map((r) => r.id).sort()).toEqual(['obj-catalog-n4', 'obj-catalog-n5']);
		expect(cols.map((c) => c.id)).toEqual(['course:genki-1']);

		const n5 = rows.find((r) => r.id === 'obj-catalog-n5')!;
		expect(n5.keys.sort()).toEqual(['word:a', 'word:b']);
		expect(n5.kind).toBe('jlpt');

		const genki1 = cols[0]!;
		expect(genki1.keys.sort()).toEqual(['grammar:g1', 'word:a']);
		expect(genki1.kind).toBe('course');
	});

	it('nessun corso importato → cols vuoto', () => {
		const all: StudyObjective[] = [obj({ id: 'obj-catalog-n5', name: 'Catalogo JLPT N5', objective_type: 'jlpt' })];
		const { cols } = listClassificationSources(all);
		expect(cols).toEqual([]);
	});
});
