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

describe('forme estese', async () => {
	const { formaParlata, scegliVariante, nomeVariante, N_VARIANTI, costruisciSessioneFV } = await import('./formeVeloci');
	const casi: [string, 'godan' | 'ichidan' | 'irregular', string, number, string][] = [
		['たべる', 'ichidan', 'chatta', 1, 'たべてしまった'],
		['のむ', 'godan', 'chatta', 3, 'のんじゃいました'],
		['いく', 'godan', 'nakya', 3, 'いかなければなりません'],
		['まつ', 'godan', 'teru', 2, 'まっています'],
		['かう', 'godan', 'toku', 1, 'かっておく'],
		['よむ', 'godan', 'toku', 3, 'よんどいて'],
		['する', 'irregular', 'naide', 1, 'しないでください'],
		['かく', 'godan', 'nakutemoii', 1, 'かかなくてもいいです'],
		['すわる', 'godan', 'temoii', 2, 'すわってもかまいません'],
		['あそぶ', 'godan', 'chadame', 1, 'あそんではいけません'],
		['ねる', 'ichidan', 'teta', 1, 'ねていた']
	];
	for (const [v, c, f, i, atteso] of casi)
		it(`${v} + ${f}[${i}] → ${atteso}`, () => expect(formaParlata(v, c, f as never, i)).toBe(atteso));
	it('registro: contratte = 0, estese ≥ 1, たら resta 0', () => {
		for (let k = 0; k < 20; k++) {
			expect(scegliVariante('chatta', 'contratte', Math.random)).toBe(0);
			expect(scegliVariante('chatta', 'estese', Math.random)).toBeGreaterThanOrEqual(1);
			expect(scegliVariante('tara', 'estese', Math.random)).toBe(0);
		}
		expect(N_VARIANTI('nakya')).toBe(5);
		expect(nomeVariante('chatta', 1)).toBe('〜てしまった');
	});
	it('sessione mista: ci sono sia contratte sia estese', () => {
		const verbi = [{ scrittura: '食べる', lettura: 'たべる', cls: 'ichidan' as const, it: 'mangiare' }];
		const s = costruisciSessioneFV(verbi, 40, Math.random, 'miste');
		expect(s.some((r) => r.variante === 0)).toBe(true);
		expect(s.some((r) => r.variante > 0)).toBe(true);
	});
});

describe('verbiDaParole', async () => {
	const { verbiDaParole } = await import('./formeVeloci');
	const W = (lettura: string, scrittura = lettura) => ({ id: scrittura, scrittura, lettura, tipo_jp: '動詞[どうし]', livello_jlpt: 'N4', classe_verbo_jp: '五段動詞[ごだんどうし]', significato: { it: ['x'], en: [] } }) as never;
	it('esclude onorifici e umili', () => {
		const v = verbiDaParole([W('のむ'), W('おやすみになる'), W('いたす'), W('まいる'), W('いらっしゃる'), W('おきる')]);
		expect(v.map((x) => x.lettura)).toEqual(['のむ', 'おきる']);
	});
});
