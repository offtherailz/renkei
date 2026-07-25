import { describe, it, expect } from 'vitest';
import { BELT_GAMES, beltFor, danFor, nextBeltHint, type BeltProgress } from './gameBelts';

const p = (played: number, clean: number): BeltProgress => ({ played, clean });

describe('BELT_GAMES', () => {
	it('ha id unici e copre tutti i giochi (route + in-page)', () => {
		expect(new Set(BELT_GAMES.map((g) => g.id)).size).toBe(BELT_GAMES.length);
		expect(BELT_GAMES.length).toBe(30);
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
	it('scala delle pulite: 2 verde, 4 blu, 6 viola, 8 marrone, 10 nera', () => {
		expect(beltFor(p(9, 2))).toBe('verde');
		expect(beltFor(p(9, 4))).toBe('blu');
		expect(beltFor(p(9, 6))).toBe('viola');
		expect(beltFor(p(9, 8))).toBe('marrone');
		expect(beltFor(p(12, 10))).toBe('nera');
	});
});

describe('danFor', () => {
	it('niente dan prima della nera', () => {
		expect(danFor(p(9, 8))).toBeNull();
	});
	it('初段 a 10 pulite, poi +1 ogni 5, fino a 十段 Gran Maestro', () => {
		expect(danFor(p(12, 10))).toBe('初段');
		expect(danFor(p(20, 15))).toBe('二段');
		expect(danFor(p(60, 55))).toContain('十段');
		expect(danFor(p(60, 55))).toContain('Gran Maestro');
		expect(danFor(p(99, 99))).toContain('十段');
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
		expect(nextBeltHint(p(5, 2))).toContain('blu');
		expect(nextBeltHint(p(5, 2))).toContain('2');
		expect(nextBeltHint(p(5, 4))).toContain('viola');
	});
	it('sulla nera non c\'è una cintura successiva', () => {
		expect(nextBeltHint(p(12, 10))).toBeNull();
	});
});
