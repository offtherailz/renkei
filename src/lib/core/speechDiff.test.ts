import { describe, it, expect } from 'vitest';
import { diffChars, bestDiffTarget } from './speechDiff';

describe('diffChars', () => {
	it('non segnala nulla per un match perfetto', () => {
		const parts = diffChars('もう少しゆっくり話してください', 'もう少しゆっくり話してください。');
		expect(parts.every((p) => p.kind === 'same')).toBe(true);
	});

	it('non segnala il punto fermo come mancante', () => {
		const parts = diffChars('すみません', 'すみません。');
		expect(parts.some((p) => p.kind === 'miss')).toBe(false);
	});

	it('non segnala "1" e "一" come diversi', () => {
		const parts = diffChars('1時にきてください', '一時に来てください');
		// la differenza kanji/kana di 来る non conta qui: verifichiamo solo che
		// il numero non generi un extra/miss isolato sul carattere del numero
		expect(parts.some((p) => p.kind === 'miss' && p.text === '1')).toBe(false);
		expect(parts.some((p) => p.kind === 'extra' && p.text === '一')).toBe(false);
	});

	it('segnala una parola mancante come miss', () => {
		const parts = diffChars('ありがとう', 'どうもありがとう');
		expect(parts.some((p) => p.kind === 'miss')).toBe(true);
	});

	it('segnala una parola detta in più come extra', () => {
		const parts = diffChars('えーと、ありがとう', 'ありがとう');
		expect(parts.some((p) => p.kind === 'extra')).toBe(true);
	});
});

describe('bestDiffTarget', () => {
	it('sceglie la forma più vicina a quello che hai detto', () => {
		const said = 'もうすこしゆっくりはなしてください';
		const target = bestDiffTarget(said, ['もう少しゆっくり話してください。', 'もうすこしゆっくりはなしてください。']);
		expect(target).toBe('もうすこしゆっくりはなしてください。');
	});

	it('ignora i candidati assenti', () => {
		expect(bestDiffTarget('test', [undefined, 'test'])).toBe('test');
	});
});
