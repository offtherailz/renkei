import { describe, expect, it } from 'vitest';
import { computeStreak, weeklyRecap, isMilestone } from './celebration';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-07-12T15:00:00').getTime();
const s = (giorniFa: number, answers = 10, correct = 8) => ({
	startedAt: NOW - giorniFa * DAY,
	answers,
	correct
});

describe('computeStreak', () => {
	it('conta i giorni consecutivi fino a oggi', () => {
		const r = computeStreak([s(0), s(1), s(2)], NOW);
		expect(r).toEqual({ giorni: 3, attivoOggi: true, aRischio: false });
	});

	it('tollera un singolo giorno saltato dentro la catena', () => {
		const r = computeStreak([s(0), s(2), s(3)], NOW);
		expect(r.giorni).toBe(3);
		expect(r.attivoOggi).toBe(true);
	});

	it('due giorni saltati chiudono la catena', () => {
		const r = computeStreak([s(0), s(3), s(4)], NOW);
		expect(r.giorni).toBe(1);
	});

	it('ieri attivo ma oggi no: streak viva e non a rischio persa', () => {
		const r = computeStreak([s(1), s(2)], NOW);
		expect(r).toEqual({ giorni: 2, attivoOggi: false, aRischio: true });
	});

	it('ultima attività due giorni fa: oggi è l\'ultimo giorno per salvarla', () => {
		const r = computeStreak([s(2), s(3)], NOW);
		expect(r).toEqual({ giorni: 0, attivoOggi: false, aRischio: true });
	});

	it('nessuna attività recente: zero', () => {
		const r = computeStreak([s(5)], NOW);
		expect(r).toEqual({ giorni: 0, attivoOggi: false, aRischio: false });
	});

	it('sessioni senza risposte non contano', () => {
		const r = computeStreak([s(0, 0, 0)], NOW);
		expect(r.giorni).toBe(0);
	});
});

describe('weeklyRecap', () => {
	it('aggrega gli ultimi 7 giorni e confronta con la settimana prima', () => {
		const r = weeklyRecap([s(0, 10, 9), s(1, 20, 15), s(9, 30, 20)], NOW);
		expect(r.giorniAttivi).toBe(2);
		expect(r.risposte).toBe(30);
		expect(r.accuratezza).toBe(80);
		expect(r.rispostePrec).toBe(30);
	});
});

describe('milestones', () => {
	it('riconosce i traguardi', () => {
		expect(isMilestone(7)).toBe(true);
		expect(isMilestone(8)).toBe(false);
	});
});
