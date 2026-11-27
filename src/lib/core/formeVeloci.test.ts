import { describe, expect, it } from 'vitest';
import { FORME, FORMA, costruisciRoundFV, costruisciSessioneFV, formaParlata, type VerboFV } from './formeVeloci';

describe('formaParlata', () => {
	const casi: [string, 'godan' | 'ichidan' | 'irregular', string, string][] = [
		['たべる', 'ichidan', 'chatta', 'たべちゃった'],
		['のむ', 'godan', 'chatta', 'のんじゃった'],
		['いく', 'godan', 'nakya', 'いかなきゃ'],
		['まつ', 'godan', 'teru', 'まってる'],
		['かう', 'godan', 'toku', 'かっとく'],
		['よむ', 'godan', 'toku', 'よんどく'],
		['する', 'irregular', 'naide', 'しないで'],
		['くる', 'irregular', 'tara', 'きたら'],
		['かく', 'godan', 'nakutemoii', 'かかなくてもいい'],
		['すわる', 'godan', 'temoii', 'すわってもいい'],
		['あそぶ', 'godan', 'chadame', 'あそんじゃだめ'],
		['ねる', 'ichidan', 'teta', 'ねてた'],
		['べんきょうする', 'irregular', 'nakya', 'べんきょうしなきゃ']
	];
	for (const [v, c, f, atteso] of casi)
		it(`${v} + ${f} → ${atteso}`, () => expect(formaParlata(v, c, f as never)).toBe(atteso));
});

describe('distrattori', () => {
	it('ogni forma ha 3 confuse diverse, esistenti e diverse da sé', () => {
		for (const f of FORME) {
			expect(new Set(f.confusa).size).toBe(3);
			expect(f.confusa).not.toContain(f.id);
			for (const c of f.confusa) expect(FORMA[c]).toBeDefined();
		}
	});
	it('le etichette italiane sono tutte diverse', () => {
		expect(new Set(FORME.map((f) => f.it)).size).toBe(FORME.length);
	});
});

describe('sessione', () => {
	const verbi: VerboFV[] = [
		{ scrittura: '食べる', lettura: 'たべる', cls: 'ichidan', it: 'mangiare' },
		{ scrittura: '飲む', lettura: 'のむ', cls: 'godan', it: 'bere' },
		{ scrittura: '行く', lettura: 'いく', cls: 'godan', it: 'andare' },
		{ scrittura: '来る', lettura: 'くる', cls: 'irregular', it: 'venire' }
	];
	it('round: audio in kana, scritta coi kanji, 4 opzioni con la giusta', () => {
		const r = costruisciRoundFV(verbi[0]!, 'chatta')!;
		expect(r.audio).toBe('たべちゃった');
		expect(r.scritta).toBe('食べちゃった');
		expect(r.opzioni).toHaveLength(4);
		expect(r.opzioni).toContain('chatta');
	});
	it('10 giri coprono tutte le 10 forme', () => {
		const s = costruisciSessioneFV(verbi, 10);
		expect(s).toHaveLength(10);
		expect(new Set(s.map((r) => r.forma)).size).toBe(10);
	});
});
