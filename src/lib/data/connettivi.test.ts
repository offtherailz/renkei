import { describe, expect, it } from 'vitest';
import seedData from '../../../static/seed-n5n4.json';
import raw from './connettivi.json';

const DATA = raw as { funzioni: Record<string, string>; items: { frase: string; scelte: string[]; corretta: string; parola: string; funzione: string; perche: string; it: string }[] };
const wordIds = new Set((seedData as unknown as { words: { id: string }[] }).words.map((w) => w.id));

describe('connettivi.json', () => {
	it('ogni frase ha un buco, 4 scelte diverse con la corretta, funzione nota e parola a catalogo', () => {
		for (const it of DATA.items) {
			expect(it.frase.split('＿＿').length, it.frase).toBe(2);
			expect(new Set(it.scelte).size, it.frase).toBe(4);
			expect(it.scelte, it.frase).toContain(it.corretta);
			expect(DATA.funzioni[it.funzione], it.funzione).toBeTruthy();
			expect(wordIds.has(it.parola), `${it.parola} non è nel seed`).toBe(true);
			expect(it.perche.length && it.it.length).toBeGreaterThan(0);
		}
	});
	it('nessuna frase doppia', () => {
		const f = DATA.items.map((i) => i.frase);
		expect(new Set(f).size).toBe(f.length);
	});
});
