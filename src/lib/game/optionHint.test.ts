import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { optionHint } from './optionHint';
import type { WordHit } from '$lib/core/wordLookup';

const seed = JSON.parse(fs.readFileSync('static/seed-n5n4.json', 'utf8'));
const index = new Map<string, WordHit>();
for (const w of seed.words) {
	const h = { id: w.id, scrittura: w.scrittura, lettura: w.lettura, tipo_jp: w.tipo_jp, livello_jlpt: w.livello_jlpt, significato: w.significato.it[0] ?? '' };
	if (!index.has(w.scrittura)) index.set(w.scrittura, h);
	if (!index.has(w.lettura)) index.set(w.lettura, h);
}
const L1 = '＿＿の ことばは ひらがなで どう かきますか。';

describe('optionHint', () => {
	it('letture: altra parola o inesistente', () => {
		expect(optionHint(index, 'moji', L1, 'まち', false)).toMatch(/lettura di (町|街)/);
		expect(optionHint(index, 'moji', L1, 'こうぎょ', false)).toMatch(/inesistente/);
	});
	it('scritture: parola vera o kanji sbagliati', () => {
		expect(optionHint(index, 'moji', '', '重い', false)).toMatch(/重い/);
		expect(optionHint(index, 'moji', '', '医暑', false)).toMatch(/inesistente/);
	});
	it('particelle e parole', () => {
		expect(optionHint(index, 'bunpou', '', 'を', false)).toMatch(/^を: /);
		expect(optionHint(index, 'goi', '', 'ふべんに', false)).toMatch(/scomodo|inconveniente/i);
	});
});
