import { describe, expect, it } from 'vitest';
import { READING_TEXTS, instantiate } from './readingTexts';

describe('readingTexts', () => {
	it('ogni slot usato nel testo o nelle domande esiste', () => {
		for (const t of READING_TEXTS) {
			const ids = new Set(t.slots.map((s) => s.id));
			for (const p of t.parts) {
				if (typeof p !== 'string') expect(ids.has(p.slot), `${t.id}: slot ${p.slot}`).toBe(true);
			}
			for (const q of t.questions) {
				if ('slot' in q) expect(ids.has(q.slot), `${t.id}: domanda su slot ${q.slot}`).toBe(true);
			}
		}
	});

	it('instantiate produce testo senza segnaposto e domande con la risposta tra le scelte', () => {
		for (const t of READING_TEXTS) {
			for (let i = 0; i < 5; i += 1) {
				const run = instantiate(t);
				expect(run.rendered).not.toMatch(/undefined|object/);
				for (const q of run.questions) {
					expect(q.choices.length, `${t.id}: scelte`).toBeGreaterThanOrEqual(2);
					expect(q.correct, `${t.id}: indice corretto`).toBeGreaterThanOrEqual(0);
					expect(new Set(q.choices).size, `${t.id}: scelte duplicate`).toBe(q.choices.length);
				}
			}
		}
	});

	it('i valori pescati compaiono nel testo reso', () => {
		for (const t of READING_TEXTS) {
			const run = instantiate(t);
			for (const v of Object.values(run.picked)) expect(run.rendered).toContain(v);
		}
	});
});
