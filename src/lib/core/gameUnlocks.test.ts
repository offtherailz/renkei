import { describe, it, expect, beforeEach } from 'vitest';
import { isUnlocked, forceUnlock } from './gameUnlocks';
import { recordGameResult } from './gameBelts';

// Ambiente node "puro" (niente jsdom): niente localStorage globale — le altre
// suite non ne hanno mai avuto bisogno perché testano solo funzioni pure.
// Qui serve davvero (isUnlocked/forceUnlock leggono/scrivono storage), quindi
// un finto minimale basta a coprire get/set/clear.
function fakeLocalStorage(): Storage {
	const store = new Map<string, string>();
	return {
		getItem: (k: string) => store.get(k) ?? null,
		setItem: (k: string, v: string) => void store.set(k, v),
		removeItem: (k: string) => void store.delete(k),
		clear: () => store.clear(),
		key: () => null,
		get length() {
			return store.size;
		}
	} as Storage;
}

beforeEach(() => {
	(globalThis as { localStorage?: Storage }).localStorage = fakeLocalStorage();
});

describe('isUnlocked', () => {
	it('un gioco senza prerequisiti è sempre sbloccato', () => {
		expect(isUnlocked('riordina')).toBe(true);
	});

	it('un gioco della filiera resta bloccato finché i prerequisiti non hanno almeno arancione', () => {
		expect(isUnlocked('read-clock')).toBe(false);
		recordGameResult('read-時', true); // pulita → arancione
		expect(isUnlocked('read-clock')).toBe(false); // manca ancora read-分
		recordGameResult('read-分', true);
		expect(isUnlocked('read-clock')).toBe(true);
	});

	it('forceUnlock scavalca il requisito (il trucco a 7 tap)', () => {
		expect(isUnlocked('read-clock')).toBe(false);
		forceUnlock('read-clock');
		expect(isUnlocked('read-clock')).toBe(true);
	});

	it('forceUnlock è permanente e non duplica le voci salvate', () => {
		forceUnlock('appuntamento');
		forceUnlock('appuntamento');
		expect(isUnlocked('appuntamento')).toBe(true);
	});
});
