import { describe, expect, it } from 'vitest';
import { BudouxJapaneseTokenizer } from './tokenizer';

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
