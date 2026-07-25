import { describe, it, expect } from 'vitest';
import seedData from '../../../static/seed-n5n4.json';
import raw from './coppie-n5n4.json';

interface Item {
	a: string;
	b: string;
	domanda: string;
	corretta: string;
	perche: string;
}
const ITEMS = (raw as { items: Item[] }).items;

interface SeedWord {
	id: string;
}
const seed = seedData as unknown as { words: SeedWord[] };
const wordIds = new Set(seed.words.map((w) => w.id));

describe('coppie-n5n4.json', () => {
	it('«corretta» è sempre a o b', () => {
		for (const item of ITEMS) {
			expect([item.a, item.b], item.domanda).toContain(item.corretta);
		}
	});

	it('a e b puntano a parole esistenti nel seed', () => {
		for (const item of ITEMS) {
			expect(wordIds.has(item.a), `"${item.a}" (in "${item.domanda}") non è nel seed`).toBe(true);
			expect(wordIds.has(item.b), `"${item.b}" (in "${item.domanda}") non è nel seed`).toBe(true);
		}
	});

	it('ogni voce ha domanda/perche non vuoti', () => {
		for (const item of ITEMS) {
			expect(item.domanda.length).toBeGreaterThan(0);
			expect(item.perche.length).toBeGreaterThan(0);
		}
	});

	it('nessuna coppia (a,b) duplicata', () => {
		const keys = ITEMS.map((i) => [i.a, i.b].sort().join('|'));
		expect(new Set(keys).size).toBe(keys.length);
	});
});
