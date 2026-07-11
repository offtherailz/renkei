import { describe, it, expect } from 'vitest';
import { newCardsUsedToday, canIntroduceNewCard, recordNewCardIntroduced } from './dailyNewCards';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-07-12T15:00:00').getTime();

describe('newCardsUsedToday', () => {
	it('nessun dato salvato: zero', () => {
		expect(newCardsUsedToday({}, NOW)).toBe(0);
	});

	it('dato di ieri: azzerato (nuovo giorno)', () => {
		expect(newCardsUsedToday({ nuove_oggi: 20, nuove_oggi_data: '2026-07-11' }, NOW)).toBe(0);
	});

	it('dato di oggi: conta quello salvato', () => {
		expect(newCardsUsedToday({ nuove_oggi: 7, nuove_oggi_data: '2026-07-12' }, NOW)).toBe(7);
	});
});

describe('canIntroduceNewCard', () => {
	it('sotto il tetto: sì', () => {
		expect(canIntroduceNewCard({ nuove_oggi: 5, nuove_oggi_data: '2026-07-12' }, 20, NOW)).toBe(true);
	});

	it('al tetto: no', () => {
		expect(canIntroduceNewCard({ nuove_oggi: 20, nuove_oggi_data: '2026-07-12' }, 20, NOW)).toBe(false);
	});

	it('giorno nuovo, anche se ieri era sopra il tetto: sì', () => {
		expect(canIntroduceNewCard({ nuove_oggi: 999, nuove_oggi_data: '2026-07-11' }, 20, NOW)).toBe(true);
	});
});

describe('recordNewCardIntroduced', () => {
	it('incrementa il contatore di oggi', () => {
		const patch = recordNewCardIntroduced({ nuove_oggi: 3, nuove_oggi_data: '2026-07-12' }, NOW);
		expect(patch).toEqual({ nuove_oggi: 4, nuove_oggi_data: '2026-07-12' });
	});

	it('riparte da 1 se il giorno è cambiato', () => {
		const patch = recordNewCardIntroduced({ nuove_oggi: 999, nuove_oggi_data: '2026-07-11' }, NOW);
		expect(patch).toEqual({ nuove_oggi: 1, nuove_oggi_data: '2026-07-12' });
	});

	it('la mezzanotte separa correttamente i giorni', () => {
		const yesterday = NOW - DAY;
		const patchYesterday = recordNewCardIntroduced({}, yesterday);
		expect(canIntroduceNewCard(patchYesterday, 20, NOW)).toBe(true);
	});
});
