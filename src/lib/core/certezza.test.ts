import { describe, it, expect } from 'vitest';
import { SITUATIONS, buildRounds, computeScore } from './certezza';
import { COMPOSED_SLUGS } from '../data/grammarForms';

describe('SITUATIONS', () => {
	it('copre 9 sfumature distinte', () => {
		expect(SITUATIONS).toHaveLength(9);
		expect(new Set(SITUATIONS.map((s) => s.slug)).size).toBe(9);
	});

	it('ogni slug punta a una costruzione esistente nel catalogo', () => {
		for (const s of SITUATIONS) {
			expect(COMPOSED_SLUGS.has(s.slug), `slug "${s.slug}" non è nel catalogo`).toBe(true);
		}
	});

	it('ogni situazione ha 4 opzioni: 1 corretta e 3 distrattori con motivo', () => {
		for (const s of SITUATIONS) {
			expect(s.options).toHaveLength(4);
			const corrects = s.options.filter((o) => o.correct);
			const wrongs = s.options.filter((o) => !o.correct);
			expect(corrects).toHaveLength(1);
			expect(wrongs).toHaveLength(3);
			for (const w of wrongs) expect(w.reason).toBeTruthy();
			for (const o of s.options) {
				expect(o.jp.length).toBeGreaterThan(0);
				expect(o.read.length).toBeGreaterThan(0);
			}
		}
	});
});

describe('buildRounds', () => {
	it('produce un round per situazione', () => {
		expect(buildRounds()).toHaveLength(SITUATIONS.length);
	});

	it('correctIndex punta sempre a un\'opzione corretta', () => {
		for (let i = 0; i < 10; i += 1) {
			for (const r of buildRounds()) {
				expect(r.options[r.correctIndex]!.correct).toBe(true);
			}
		}
	});

	it('mescola l\'ordine delle situazioni nel tempo', () => {
		const orders = new Set<string>();
		for (let i = 0; i < 30; i += 1) {
			orders.add(buildRounds().map((r) => r.situation.slug).join(','));
		}
		expect(orders.size).toBeGreaterThan(1);
	});

	it('mescola le opzioni di ogni round nel tempo', () => {
		const positions = new Set<number>();
		for (let i = 0; i < 40; i += 1) {
			const rounds = buildRounds();
			const r = rounds.find((x) => x.situation.slug === 'deshou')!;
			positions.add(r.correctIndex);
		}
		expect(positions.size).toBeGreaterThan(1);
	});
});

describe('computeScore', () => {
	it('cresce con più risposte corrette', () => {
		expect(computeScore(9, 9, 0)).toBeGreaterThan(computeScore(9, 4, 0));
	});
	it('bonus per il punteggio pieno', () => {
		expect(computeScore(9, 9, 0) - computeScore(9, 8, 0)).toBeGreaterThan(20);
	});
	it('penalizza gli hint', () => {
		expect(computeScore(9, 9, 0)).toBeGreaterThan(computeScore(9, 9, 3));
	});
	it('non va mai sotto zero', () => {
		expect(computeScore(0, 0, 50)).toBeGreaterThanOrEqual(0);
	});
});
