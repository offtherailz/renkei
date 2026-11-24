import { describe, it, expect } from 'vitest';
import seedData from '../../../static/seed-n5n4.json';
import raw from './coppie-n5n4.json';

interface Item {
	a: string;
	b: string;
	domanda: string;
	corretta: string;
	perche: string;
	grammatica?: [string, string];
	frase?: string;
	piena?: string;
}
const ITEMS = (raw as { items: Item[] }).items;

interface SeedWord {
	id: string;
}
const seed = seedData as unknown as { words: SeedWord[]; grammar: { id: string }[] };
const wordIds = new Set(seed.words.map((w) => w.id));
const grammarIds = new Set(seed.grammar.map((g) => g.id));

describe('coppie-n5n4.json', () => {
	it('«corretta» è sempre a o b', () => {
		for (const item of ITEMS) {
			expect([item.a, item.b], item.domanda).toContain(item.corretta);
		}
	});

	it('a e b puntano a parole esistenti nel seed', () => {
		for (const item of ITEMS.filter((i) => !i.grammatica)) {
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

	it('coppie di grammatica: punti a catalogo, frase col buco e frase completa coerenti', () => {
		for (const item of ITEMS.filter((i) => i.grammatica)) {
			for (const id of item.grammatica!) expect(grammarIds.has(id), `${id} non è nel seed`).toBe(true);
			expect(item.frase, item.domanda).toContain('＿＿');
			const [prima, dopo] = item.frase!.split('＿＿');
			expect(item.piena!.startsWith(prima!) && item.piena!.endsWith(dopo!), item.domanda).toBe(true);
			// la parte inserita contiene la forma giusta (senza 〜 e senza la desinenza)
			const inserita = item.piena!.slice(prima!.length, item.piena!.length - dopo!.length);
			expect(inserita.startsWith(item.corretta.replace('〜', '').slice(0, 3)), `${inserita} vs ${item.corretta}`).toBe(true);
		}
	});

	it('nessuna coppia (a,b) duplicata', () => {
		// le coppie di grammatica hanno più frasi per la stessa coppia: chiave con la frase
		const keys = ITEMS.map((i) => [i.a, i.b].sort().join('|') + (i.grammatica ? '|' + i.frase : ''));
		expect(new Set(keys).size).toBe(keys.length);
	});
});
