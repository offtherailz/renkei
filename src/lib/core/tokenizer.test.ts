import { describe, expect, it } from 'vitest';
import { BudouxJapaneseTokenizer, SegmentedJapaneseTokenizer, parseSegmenti } from './tokenizer';

describe('BudouxJapaneseTokenizer', () => {
	it('non lascia una particella-kana isolata a inizio frase (のど ≠ の+ど)', async () => {
		const tok = await BudouxJapaneseTokenizer.create();
		const tokens = tok.tokenize('のどがかわきました。お茶でも飲みませんか。');
		expect(tokens[0]).toBe('のどが');
		// vale anche per la frase che inizia dopo il punto
		const tokens2 = tok.tokenize('はい。のどがかわきました。');
		const afterDot = tokens2[tokens2.findIndex((t) => t.endsWith('。')) + 1];
		expect(afterDot?.startsWith('の')).toBe(true);
		expect(afterDot).not.toBe('の');
	});

	it('non tocca i tagli normali', async () => {
		const tok = await BudouxJapaneseTokenizer.create();
		expect(tok.tokenize('学校に行きます。').join('|')).toContain('学校に');
	});

	it('non lascia isolato nessun kana a inizio frase, non solo le particelle (うそを → う+そを)', async () => {
		const tok = await BudouxJapaneseTokenizer.create();
		expect(tok.tokenize('うそをつかないでください。')[0]).toBe('うそを');
		expect(tok.tokenize('くすりの おかげで よく なりました。')[0]).toBe('くすりの');
		expect(tok.tokenize('あそこから人影が見えた。')[0]).toBe('あそこから');
	});
});

describe('SegmentedJapaneseTokenizer', () => {
	const segmenti = parseSegmenti({
		frasi: {
			'えきの まえに ぎんこうが あります。': ['えき·の|まえ·に|ぎんこう·が|あり·ます·。', { 3: ['masu'] }],
			'友達に御飯をおごってもらった。': ['友達·に|御飯·を|おごっ·て·もらっ·た·。']
		}
	});
	const fallback = { tokenize: (t: string) => ['FALLBACK', t] };
	const tok = new SegmentedJapaneseTokenizer(segmenti, fallback);

	it('usa i pezzi precalcolati per le frasi a catalogo, senza i confini di parola', () => {
		expect(tok.tokenize('友達に御飯をおごってもらった。')).toEqual(['友達に', '御飯を', 'おごってもらった。']);
	});

	it('trova la frase anche se gli spazi sono diversi (pieni, doppi, ai bordi)', () => {
		expect(tok.tokenize(' えきの　まえに ぎんこうが  あります。 ')).toEqual(['えきの', 'まえに', 'ぎんこうが', 'あります。']);
	});

	it('fuori catalogo passa al tokenizer di riserva', () => {
		expect(tok.tokenize('これは新しい文です。')).toEqual(['FALLBACK', 'これは新しい文です。']);
	});

	it('restituisce una copia: chi mescola i pezzi non rovina la cache', () => {
		tok.tokenize('友達に御飯をおごってもらった。').reverse();
		expect(tok.tokenize('友達に御飯をおごってもらった。')[0]).toBe('友達に');
	});
});
