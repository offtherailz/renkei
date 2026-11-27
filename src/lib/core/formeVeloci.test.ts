import { describe, expect, it } from 'vitest';
import { FORME, FORMA, costruisciRoundFV, costruisciSessioneFV, formaParlata, formaTe, teTipo, verbiConfondibili, type VerboFV } from './formeVeloci';

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

describe('risalire al verbo', () => {
	const V = (scrittura: string, lettura: string, cls: 'godan' | 'ichidan' | 'irregular', it: string): VerboFV => ({ scrittura, lettura, cls, it });
	const pool = [
		V('飲む', 'のむ', 'godan', 'bere'), V('呼ぶ', 'よぶ', 'godan', 'chiamare'), V('読む', 'よむ', 'godan', 'leggere'),
		V('遊ぶ', 'あそぶ', 'godan', 'giocare'), V('乗る', 'のる', 'godan', 'salire'), V('食べる', 'たべる', 'ichidan', 'mangiare'),
		V('書く', 'かく', 'godan', 'scrivere'), V('泳ぐ', 'およぐ', 'godan', 'nuotare'), V('話す', 'はなす', 'godan', 'parlare'),
		V('来る', 'くる', 'irregular', 'venire'), V('勉強する', 'べんきょうする', 'irregular', 'studiare')
	];
	it('teTipo', () => {
		expect(teTipo('のむ', 'godan')).toBe('nde');
		expect(teTipo('かう', 'godan')).toBe('tte');
		expect(teTipo('いく', 'godan')).toBe('tte');
		expect(teTipo('かく', 'godan')).toBe('ite');
		expect(teTipo('およぐ', 'godan')).toBe('ide');
		expect(teTipo('はなす', 'godan')).toBe('shite');
		expect(teTipo('たべる', 'ichidan')).toBe('ichidan');
		expect(teTipo('くる', 'irregular')).toBe('kuru');
		expect(teTipo('べんきょうする', 'irregular')).toBe('shite');
	});
	it('formaTe', () => {
		expect(formaTe('のむ', 'godan')).toBe('のんで');
		expect(formaTe('たべる', 'ichidan')).toBe('たべて');
	});
	it('i verbi confondibili: 4, unici, col bersaglio, e preferiscono la stessa forma て', () => {
		const target = pool[0]!; // のむ (んで)
		let stessaTe = 0;
		for (let i = 0; i < 30; i++) {
			const ops = verbiConfondibili(target, pool);
			expect(ops).toHaveLength(4);
			expect(new Set(ops.map((v) => v.lettura)).size).toBe(4);
			expect(ops).toContain(target);
			stessaTe += ops.filter((v) => v !== target && teTipo(v.lettura, v.cls) === 'nde').length;
		}
		expect(stessaTe / 30).toBeGreaterThanOrEqual(2); // よぶ, よむ, あそぶ quasi sempre
	});
	it('il round porta verbi e forma て', () => {
		const r = costruisciRoundFV(pool[0]!, 'chatta', Math.random, pool)!;
		expect(r.te).toBe('のんで');
		expect(r.verbiOpzioni).toContain(pool[0]);
	});
});
