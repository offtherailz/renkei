import { describe, it, expect } from 'vitest';
import { SHOP_ITEMS, generateShoppingList } from './shopItems';
import { readCounterN } from './counterReadings';
import type { Counter } from '../types/models';

describe('SHOP_ITEMS', () => {
	it('ha id, emoji e contatore per ogni voce', () => {
		const ids = new Set<string>();
		for (const it of SHOP_ITEMS) {
			expect(it.emoji.length).toBeGreaterThan(0);
			expect(it.counterId.length).toBeGreaterThan(0);
			expect(ids.has(it.id)).toBe(false);
			ids.add(it.id);
		}
	});
});

describe('generateShoppingList', () => {
	it('lista con quantità 1-4 e griglia che include i richiesti', () => {
		for (let i = 0; i < 20; i += 1) {
			const { list, grid } = generateShoppingList(3, 3);
			expect(list.length).toBe(3);
			for (const r of list) {
				expect(r.qty).toBeGreaterThanOrEqual(1);
				expect(r.qty).toBeLessThanOrEqual(4);
				expect(grid).toContain(r.item);
			}
			// nessun duplicato nella griglia
			expect(new Set(grid).size).toBe(grid.length);
		}
	});
});

describe('readCounterN con la serie nativa つ', () => {
	it('compone ふたつ / みっつ', () => {
		const tsu = {
			id: 'つ', simbolo: 'つ', lettura: 'つ',
			significato: { it: '', en: '' }, livello_jlpt: 'N5',
			letture_irregolari: 'ひとつ (1)・ふたつ (2)・みっつ (3)', updated_at: 0
		} as Counter;
		expect(readCounterN(tsu, 2)).toBe('ふたつ');
		expect(readCounterN(tsu, 3)).toBe('みっつ');
	});
});
