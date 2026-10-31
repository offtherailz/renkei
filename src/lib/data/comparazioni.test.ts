import { describe, expect, it } from 'vitest';
import DATA from './comparazioni.json';
import { isInLevel } from './kanjiN4';

describe('comparazioni.json', () => {
	it('coppie: campi presenti, winner valido, negativa in ない', () => {
		for (const p of DATA.coppie) {
			expect(p.a?.jp, 'a.jp').toBeTruthy();
			expect(p.b?.jp, 'b.jp').toBeTruthy();
			expect(['a', 'b']).toContain(p.winner);
			expect(p.adj?.dict, 'adj.dict').toBeTruthy();
			expect(p.adj.dict.endsWith('い'), `${p.adj.dict}: い-aggettivo`).toBe(true);
			expect(p.adj.neg.endsWith('ない'), `${p.adj.neg}: negativa in ない`).toBe(true);
			// la negativa è coerente con il dizionario (たかい → たかくない)
			expect(p.adj.neg).toBe(p.adj.dict.slice(0, -1) + 'くない');
			expect(['N5', 'N4']).toContain(p.level);
		}
	});

	it('superlativi: 3+ item, winner in range, aggettivo い', () => {
		for (const s of DATA.superlativi) {
			expect(s.items.length, 'almeno 3 item').toBeGreaterThanOrEqual(3);
			expect(s.winner).toBeGreaterThanOrEqual(0);
			expect(s.winner).toBeLessThan(s.items.length);
			expect(s.adj.dict.endsWith('い'), `${s.adj.dict}: い-aggettivo`).toBe(true);
			for (const it of s.items) expect(it.jp, 'item.jp').toBeTruthy();
		}
	});

	it('frasi: un buco e 4 opzioni distinte, con perché e traduzione', () => {
		for (const f of DATA.frasi) {
			expect(f.frase.match(/＿＿/g)?.length, f.frase).toBe(1);
			expect(new Set([f.corretta, ...f.distrattori]).size, f.frase).toBe(4);
			expect(f.perche.length, f.frase).toBeGreaterThan(5);
			expect(f.it.length, f.frase).toBeGreaterThan(3);
			expect(['N5', 'N4']).toContain(f.level);
		}
	});

	it('nessun duplicato: ogni coppia e ogni gruppo una volta sola', () => {
		const coppie = DATA.coppie.map((p) => `${p.a.jp}|${p.b.jp}|${p.adj.dict}`);
		expect(new Set(coppie).size).toBe(coppie.length);
		const sup = DATA.superlativi.map((s) => `${s.items.map((i) => i.jp).join('|')}|${s.adj.dict}`);
		expect(new Set(sup).size).toBe(sup.length);
	});

	it('solo kanji entro N4', () => {
		const testi = [
			...DATA.coppie.flatMap((p) => [p.a.jp, p.b.jp]),
			...DATA.superlativi.flatMap((s) => s.items.map((i) => i.jp)),
			...DATA.frasi.flatMap((f) => [f.frase, f.corretta, ...f.distrattori])
		];
		const fuori = [...new Set(testi.join(''))].filter((c) => /[一-龯]/.test(c) && !isInLevel(c));
		expect(fuori).toEqual([]);
	});
});
