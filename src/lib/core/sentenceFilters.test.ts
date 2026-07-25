import { describe, it, expect } from 'vitest';
import { isFormEnumeration } from './sentenceFilters';

describe('isFormEnumeration', () => {
	it('riconosce gli elenchi di forme del seed (nessuna frase vera)', () => {
		for (const s of [
			'飲むな、食べるな、するな、来るな。',
			'飲もう、食べよう、しよう、来よう。',
			'飲ませる、食べさせる、させる、来させる。',
			'飲まされる、食べさせられる、させられる、来させられる。',
			'飲まれる、食べられる、される、来られる。',
			'飲め、食べろ、しろ、来い。'
		]) {
			expect(isFormEnumeration(s), s).toBe(true);
		}
	});

	it('NON scatta sulle frasi vere, anche con più virgole', () => {
		for (const s of [
			'おいしいかどうか、わからないから、食べない。',
			'母は 弟に 野菜を 食べさせました。',
			'あぶない！ 止まれ！',
			'ここで 泳ぐな と 書いて あります。',
			'一緒に帰ろう。'
		]) {
			expect(isFormEnumeration(s), s).toBe(false);
		}
	});
});
