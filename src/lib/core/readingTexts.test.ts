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
				if ('truthOf' in q) {
					const s = t.slots.find((x) => x.id === q.truthOf);
					expect(s, `${t.id}: slot ${q.truthOf}`).toBeDefined();
					expect(s!.answerSlot?.length, `${t.id}: answerSlot di ${q.truthOf}`).toBe(s!.options.length);
					for (const a of s!.answerSlot!) expect(ids.has(a), `${t.id}: answerSlot → ${a}`).toBe(true);
				}
			}
			// i riferimenti {x} nelle opzioni puntano a slot semplici esistenti
			for (const s of t.slots) {
				for (const o of s.options) {
					for (const m of o.matchAll(/\{(\w+)\}/g)) {
						expect(ids.has(m[1]!), `${t.id}: ref {${m[1]}}`).toBe(true);
					}
				}
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

	it('i valori pescati degli slot usati nel testo compaiono nel testo reso', () => {
		for (const t of READING_TEXTS) {
			const run = instantiate(t);
			const usati = new Set(t.parts.filter((p) => typeof p !== 'string').map((p) => (p as { slot: string }).slot));
			for (const [id, v] of Object.entries(run.picked)) {
				if (usati.has(id)) expect(run.rendered, `${t.id}: slot ${id}`).toContain(v);
			}
		}
	});

	it('correzione in corsa: la risposta è nel testo e coerente con la variante pescata', () => {
		for (const t of READING_TEXTS) {
			for (const q of t.questions) {
				if (!('truthOf' in q)) continue;
				for (let i = 0; i < 20; i += 1) {
					const run = instantiate(t);
					const tq = run.questions[t.questions.indexOf(q)]!;
					const correct = tq.choices[tq.correct]!;
					expect(run.rendered, `${t.id}: risposta nel testo`).toContain(correct);
					expect(tq.evidence, `${t.id}: evidenza`).toBeDefined();
				}
			}
		}
	});
});
