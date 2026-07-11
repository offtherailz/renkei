import { describe, expect, it } from 'vitest';
import { computeStreak, weeklyRecap, isMilestone, detectNewCompletions, type StorageLike } from './celebration';

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

describe('detectNewCompletions', () => {
	const fakeStorage = (): StorageLike & { data: Map<string, string> } => {
		const data = new Map<string, string>();
		return {
			data,
			getItem: (k) => data.get(k) ?? null,
			setItem: (k, v) => void data.set(k, v)
		};
	};

	it('al primo avvio semina in silenzio (niente feste retroattive)', () => {
		const st = fakeStorage();
		expect(detectNewCompletions(['a', 'b'], st)).toEqual([]);
		// ma da lì in poi rileva i nuovi
		expect(detectNewCompletions(['a', 'b', 'c'], st)).toEqual(['c']);
	});

	it('festeggia una volta sola', () => {
		const st = fakeStorage();
		detectNewCompletions([], st);
		expect(detectNewCompletions(['pack-1'], st)).toEqual(['pack-1']);
		expect(detectNewCompletions(['pack-1'], st)).toEqual([]);
	});

	it('un pack tornato incompleto (nuove carte) non rifesteggia', () => {
		const st = fakeStorage();
		detectNewCompletions(['pack-1'], st);
		expect(detectNewCompletions([], st)).toEqual([]);
		expect(detectNewCompletions(['pack-1'], st)).toEqual([]);
	});

	it('snapshot corrotto: riparte senza esplodere', () => {
		const st = fakeStorage();
		st.setItem('renkei_packs_done', '{non-json');
		expect(detectNewCompletions(['a'], st)).toEqual(['a']);
	});
});
