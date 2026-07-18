import { describe, expect, it } from 'vitest';
import { LISTENING_DIALOGUES, instantiateListening } from './listeningDialogues';

describe('listeningDialogues', () => {
	it('slot e riferimenti coerenti', () => {
		for (const d of LISTENING_DIALOGUES) {
			const ids = new Set(d.slots.map((s) => s.id));
			for (const l of d.lines) {
				for (const p of l.parts) {
					if (typeof p !== 'string') expect(ids.has(p.slot), `${d.id}: slot ${p.slot}`).toBe(true);
				}
			}
			for (const q of d.questions) {
				if ('slot' in q) expect(ids.has(q.slot), `${d.id}: domanda su ${q.slot}`).toBe(true);
				if ('truthOf' in q) {
					const s = d.slots.find((x) => x.id === q.truthOf);
					expect(s?.answerSlot?.length, `${d.id}: answerSlot`).toBe(s?.options.length);
					for (const a of s!.answerSlot!) expect(ids.has(a), `${d.id}: → ${a}`).toBe(true);
				}
			}
			for (const s of d.slots) {
				for (const o of s.options) {
					for (const m of o.matchAll(/\{(\w+)\}/g)) expect(ids.has(m[1]!), `${d.id}: ref {${m[1]}}`).toBe(true);
				}
			}
		}
	});

	it('la risposta giusta è sempre nel dialogo, con la battuta-evidenza', () => {
		for (const d of LISTENING_DIALOGUES) {
			for (let i = 0; i < 20; i += 1) {
				const run = instantiateListening(d);
				const all = run.lines.map((l) => l.text).join('');
				expect(all).not.toMatch(/undefined|object/);
				run.questions.forEach((q, qi) => {
					expect(q.choices.length, `${d.id}: scelte`).toBeGreaterThanOrEqual(2);
					expect(new Set(q.choices).size, `${d.id}: duplicati`).toBe(q.choices.length);
					const src = d.questions[qi]!;
					if (!('slot' in src) && !('truthOf' in src)) return; // le fixed possono parafrasare
					const correct = q.choices[q.correct]!;
					expect(all.replace(/[\s　]/g, ''), `${d.id}: risposta nel dialogo`).toContain(correct.replace(/[\s　]/g, ''));
					expect(q.evidenceLine, `${d.id}: battuta-evidenza`).toBeDefined();
				});
			}
		}
	});

	it('ogni domanda ha un «perché» (spiega) con la risposta giusta citata', () => {
		for (const d of LISTENING_DIALOGUES) {
			for (let i = 0; i < 10; i += 1) {
				const run = instantiateListening(d);
				run.questions.forEach((q) => {
					expect(q.spiega, `${d.id}: spiega`).toBeTruthy();
					// il perché cita SEMPRE la risposta corretta fra 「」
					expect(q.spiega, `${d.id}: spiega cita la risposta`).toContain(`「${q.choices[q.correct]}」`);
				});
			}
		}
	});
});
