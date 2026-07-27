import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { buildTransitiviPool, pickTransitiviRounds } from './transitivi';
import type { QuizContext } from '../quiz/types';
import type { Word } from '../types/models';

describe('buildTransitiviPool (dati veri del seed)', () => {
	const seed = JSON.parse(fs.readFileSync('static/seed-n5n4.json', 'utf8'));
	const words: Word[] = seed.words;
	const context: QuizContext = {
		locale: 'it',
		wordsById: new Map(words.map((w) => [w.id, w])),
		grammarById: new Map()
	};
	const pool = buildTransitiviPool(words, context, 'it');

	it('trova un numero ragionevole di round giocabili tra le coppie 自動詞/他動詞', () => {
		expect(pool.length).toBeGreaterThanOrEqual(20);
	});

	it('ogni round ha una frase col buco, due scelte diverse e la corretta tra le scelte', () => {
		for (const r of pool) {
			expect(r.question.sentenceWithBlank).toContain('＿＿');
			expect(new Set(r.question.choices).size).toBe(r.question.choices.length);
			expect(r.question.choices).toContain(r.question.correctChoice);
			expect(r.question.choices.length).toBeGreaterThanOrEqual(2);
		}
	});

	it("pairId punta sempre a una parola presente nel seed", () => {
		for (const r of pool) {
			expect(context.wordsById.has(r.pairId)).toBe(true);
		}
	});

	it('pickTransitiviRounds pesca N round distinti senza ripetizioni entro la stessa pesca', () => {
		const picked = pickTransitiviRounds(pool, 8);
		expect(picked.length).toBe(Math.min(8, pool.length));
		expect(new Set(picked.map((r) => r.wordId)).size).toBe(picked.length);
	});
});
