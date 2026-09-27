import { describe, it, expect } from 'vitest';
import { examStrip, isInLevel } from './kanjiN4';
import { renderFuriganaToHtml } from '../core/furigana';

const ZWSP = '​';

describe('examStrip (furigana solo sopra livello)', () => {
	it('toglie il furigana sui kanji N4/N5', () => {
		expect(examStrip('安心[あんしん]した')).toBe('安心した');
		expect(examStrip('会社[かいしゃ]')).toBe('会社');
	});

	it('tiene il furigana sui kanji sopra livello (N3+/N1), con confine ZWSP', () => {
		expect(examStrip('邪魔[じゃま]')).toBe(ZWSP + '邪魔[じゃま]'); // 邪・魔 = N1
	});

	it('toglie gli spazi (わかち書き)', () => {
		expect(examStrip('私[わたし]は 学生[がくせい] です')).toBe('私は学生です');
	});

	// Regressione: senza il confine ZWSP la ruby と finiva sopra 写真を撮 (撮 = N3).
	it('la ruby sopra-livello resta sul solo kanji, non ingloba la parola prima', () => {
		const html = renderFuriganaToHtml(examStrip('写真[しゃしん]を 撮[と]っても'));
		expect(html).toContain('<ruby>撮<rt>と</rt></ruby>');
		expect(html).not.toContain('写真を撮<rt>');
	});

	it('isInLevel riconosce N4/N5 e scarta i sopra-livello', () => {
		expect(isInLevel('会')).toBe(true);
		expect(isInLevel('邪')).toBe(false);
	});
});
