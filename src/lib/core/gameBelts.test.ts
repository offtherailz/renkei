import { describe, it, expect } from 'vitest';
import { GAME_PATH, beltFor, danFor, nextBeltHint, type BeltProgress } from './gameBelts';

const p = (played: number, clean: number): BeltProgress => ({ played, clean });

describe('GAME_PATH', () => {
	it('ha id unici e 15 stazioni', () => {
		expect(new Set(GAME_PATH.map((g) => g.id)).size).toBe(GAME_PATH.length);
		expect(GAME_PATH.length).toBe(15);
	});
});

describe('beltFor', () => {
	it('nessuna cintura senza partite', () => {
		expect(beltFor(p(0, 0))).toBe('nessuna');
	});
	it('bianca alla prima partita, gialla alla terza', () => {
		expect(beltFor(p(1, 0))).toBe('bianca');
		expect(beltFor(p(2, 0))).toBe('bianca');
		expect(beltFor(p(3, 0))).toBe('gialla');
	});
	it('una pulita vale arancione anche se le partite sono poche (salto di cintura)', () => {
		expect(beltFor(p(1, 1))).toBe('arancione');
	});
	it('scala delle pulite: 3 verde, 5 blu, 7 marrone, 10 nera', () => {
		expect(beltFor(p(9, 3))).toBe('verde');
		expect(beltFor(p(9, 5))).toBe('blu');
		expect(beltFor(p(9, 7))).toBe('marrone');
		expect(beltFor(p(12, 10))).toBe('nera');
	});
});

describe('danFor', () => {
	it('niente dan prima della nera', () => {
		expect(danFor(p(9, 7))).toBeNull();
	});
	it('初段 a 10 pulite, poi +1 ogni 5, tetto 五段', () => {
		expect(danFor(p(12, 10))).toBe('初段');
		expect(danFor(p(20, 15))).toBe('二段');
		expect(danFor(p(99, 99))).toBe('五段');
	});
});

describe('nextBeltHint', () => {
	it('indica le partite mancanti verso bianca/gialla', () => {
		expect(nextBeltHint(p(0, 0))).toContain('bianca');
		expect(nextBeltHint(p(1, 0))).toContain('gialla');
		expect(nextBeltHint(p(1, 0))).toContain('2');
	});
	it('indica le pulite mancanti oltre la gialla', () => {
		expect(nextBeltHint(p(3, 0))).toContain('arancione');
		expect(nextBeltHint(p(5, 3))).toContain('blu');
		expect(nextBeltHint(p(5, 3))).toContain('2');
	});
	it('sulla nera non c\'è una cintura successiva', () => {
		expect(nextBeltHint(p(12, 10))).toBeNull();
	});
});
