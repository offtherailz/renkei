import { describe, it, expect } from 'vitest';
import { BELT_GAMES, beltFor, danFor, beltVisual, nextBeltHint, nextDanHint, epicStepsForStreak, type BeltProgress } from './gameBelts';

const p = (played: number, clean: number, epic = 0): BeltProgress => ({ played, clean, epic });

describe('BELT_GAMES', () => {
	it('ha id unici e copre tutti i giochi (route + in-page)', () => {
		expect(new Set(BELT_GAMES.map((g) => g.id)).size).toBe(BELT_GAMES.length);
		expect(BELT_GAMES.length).toBe(31);
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
	it('初段 a 10 pulite, 二段 a 15; dal 三段 servono anche le imprese', () => {
		expect(danFor(p(12, 10))).toBe('初段');
		expect(danFor(p(20, 15))).toBe('二段');
		expect(danFor(p(30, 20, 0))).toBe('二段'); // pulite da 三段 ma zero imprese
		expect(danFor(p(30, 20, 1))).toBe('三段');
		expect(danFor(p(60, 50, 8))).toBe('九段');
	});
	it('十段 Gran Maestro: 60 pulite E 10 imprese', () => {
		expect(danFor(p(99, 60, 9))).toBe('九段');
		expect(danFor(p(99, 59, 10))).toBe('九段');
		expect(danFor(p(99, 60, 10))).toContain('十段');
		expect(danFor(p(99, 60, 10))).toContain('Gran Maestro');
	});
	it('il Gran Maestro porta la cintura rossa, gli altri la nera', () => {
		expect(beltVisual(p(99, 60, 10))).toBe('rossa');
		expect(beltVisual(p(20, 15, 0))).toBe('nera');
		expect(beltVisual(p(5, 2))).toBe('verde');
	});
});

describe('nextDanHint', () => {
	it('indica pulite e imprese mancanti per il prossimo dan', () => {
		const hint = nextDanHint(p(30, 16, 0));
		expect(hint).toContain('三段');
		expect(hint).toContain('4 pulite');
		expect(hint).toContain('1 imprese');
	});
	it('null prima della nera e alla vetta', () => {
		expect(nextDanHint(p(5, 2))).toBeNull();
		expect(nextDanHint(p(99, 60, 10))).toBeNull();
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

describe('epicStepsForStreak', () => {
	it('zero imprese sotto la soglia', () => {
		expect(epicStepsForStreak(0)).toBe(0);
		expect(epicStepsForStreak(11)).toBe(0);
	});
	it('1 impresa da 12, poi +1 ogni 13 in più (idea utente: strisce lunghe avanzano più veloce)', () => {
		expect(epicStepsForStreak(12)).toBe(1);
		expect(epicStepsForStreak(24)).toBe(1);
		expect(epicStepsForStreak(25)).toBe(2);
		expect(epicStepsForStreak(38)).toBe(3);
	});
	it('cresce sempre con la lunghezza della serie (mai a scalare)', () => {
		expect(epicStepsForStreak(100)).toBeGreaterThan(epicStepsForStreak(50));
	});
});
