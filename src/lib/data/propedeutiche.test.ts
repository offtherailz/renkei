import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { curatedForGrammar, GRAMMAR_CURATED_ITEMS } from './propedeutiche';
import { isInLevel } from './kanjiN4';

const seed = JSON.parse(readFileSync('static/seed-n5n4.json', 'utf8')) as { grammar: { id: string; struttura: string }[] };

describe('grammatica-contesto.json', () => {
	const ids = new Set(seed.grammar.map((g) => g.id));

	it('ogni item punta a un punto del catalogo, con un buco e 4 opzioni distinte', () => {
		for (const i of GRAMMAR_CURATED_ITEMS) {
			expect(ids.has(i.grammatica), i.grammatica).toBe(true);
			expect(i.frase_con_buco.match(/＿＿/g)?.length, i.frase_con_buco).toBe(1);
			expect(new Set([i.corretta, ...i.distrattori]).size, i.frase_con_buco).toBe(4);
			expect(i.perche.length, i.frase_con_buco).toBeGreaterThan(10);
			expect(i.traduzione_it.length, i.frase_con_buco).toBeGreaterThan(3);
		}
	});

	it('solo kanji entro N4, anche nelle opzioni', () => {
		const fuori: string[] = [];
		for (const i of GRAMMAR_CURATED_ITEMS) {
			for (const c of [i.frase_con_buco, i.corretta, ...i.distrattori].join('')) {
				if (/[一-龯]/.test(c) && !isInLevel(c)) fuori.push(`${c} in ${i.frase_con_buco}`);
			}
		}
		expect(fuori).toEqual([]);
	});


	it('curatedForGrammar unisce item propri, costruzioni e particelle', () => {
		expect(curatedForGrammar('grammar-api-N4-49', '〜のに').length).toBeGreaterThan(0);
		expect(curatedForGrammar('grammar-api-N4-64', '〜つもり').length).toBeGreaterThan(1);
		expect(curatedForGrammar('grammar-api-N5-58', 'を').length).toBeGreaterThan(0);
	});
});
