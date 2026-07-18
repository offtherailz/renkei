import { describe, expect, it } from 'vitest';
import DATA from './comparazioni.json';

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
});
