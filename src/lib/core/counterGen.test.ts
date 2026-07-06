import { describe, it, expect } from 'vitest';
import { readNumber, dayReading, hourReading, minuteReading, yenReading, monthReading, generateReading, generateClockReading, generateNumberDictation, generateAppointment, clockReading, GENERATED_COUNTERS } from './counterGen';

describe('readNumber', () => {
	it('legge unità e decine', () => {
		expect(readNumber(1)).toBe('いち');
		expect(readNumber(4)).toBe('よん');
		expect(readNumber(10)).toBe('じゅう');
		expect(readNumber(25)).toBe('にじゅうご');
	});
	it('applica il rendaku di centinaia e migliaia', () => {
		expect(readNumber(300)).toBe('さんびゃく');
		expect(readNumber(600)).toBe('ろっぴゃく');
		expect(readNumber(800)).toBe('はっぴゃく');
		expect(readNumber(3000)).toBe('さんぜん');
		expect(readNumber(8000)).toBe('はっせん');
	});
	it('compone con 万', () => {
		expect(readNumber(10000)).toBe('いちまん');
		expect(readNumber(12000)).toBe('いちまんにせん');
	});
});

describe('dayReading', () => {
	it('usa le native irregolari 1-10, 14, 20, 24', () => {
		expect(dayReading(1)).toBe('ついたち');
		expect(dayReading(4)).toBe('よっか');
		expect(dayReading(8)).toBe('ようか');
		expect(dayReading(10)).toBe('とおか');
		expect(dayReading(14)).toBe('じゅうよっか');
		expect(dayReading(20)).toBe('はつか');
		expect(dayReading(24)).toBe('にじゅうよっか');
	});
	it('è regolare (+にち) per gli altri giorni', () => {
		expect(dayReading(11)).toBe('じゅういちにち');
		expect(dayReading(25)).toBe('にじゅうごにち');
		expect(dayReading(31)).toBe('さんじゅういちにち');
	});
});

describe('hourReading', () => {
	it('gestisce le ore trappola', () => {
		expect(hourReading(4)).toBe('よじ');
		expect(hourReading(7)).toBe('しちじ');
		expect(hourReading(9)).toBe('くじ');
		expect(hourReading(12)).toBe('じゅうにじ');
	});
});

describe('minuteReading', () => {
	it('applica ふん/ぷん', () => {
		expect(minuteReading(1)).toBe('いっぷん');
		expect(minuteReading(3)).toBe('さんぷん');
		expect(minuteReading(5)).toBe('ごふん');
		expect(minuteReading(10)).toBe('じゅっぷん');
		expect(minuteReading(30)).toBe('さんじゅっぷん');
		expect(minuteReading(21)).toBe('にじゅういっぷん');
		expect(minuteReading(45)).toBe('よんじゅうごふん');
	});
});

describe('yenReading', () => {
	it('legge i prezzi', () => {
		expect(yenReading(300)).toBe('さんびゃくえん');
		expect(yenReading(1500)).toBe('せんごひゃくえん');
	});
});

describe('generateReading', () => {
	it('produce prompt e distrattori per i contatori generati', () => {
		for (const id of GENERATED_COUNTERS) {
			const g = generateReading(id);
			expect(g).not.toBeNull();
			expect(g!.correct.length).toBeGreaterThan(0);
			expect(g!.distractors).not.toContain(g!.correct);
			expect(g!.distractors.length).toBeGreaterThanOrEqual(1);
		}
	});
	it('ritorna null per contatori non generati', () => {
		expect(generateReading('本')).toBeNull();
	});
});

describe('clockReading / orario', () => {
	it('concatena ore e minuti', () => {
		expect(clockReading(4, 30)).toBe('よじさんじゅっぷん');
		expect(clockReading(9, 0)).toBe('くじ');
		expect(clockReading(7, 15)).toBe('しちじじゅうごふん');
	});
	it('generateClockReading ha prompt HH:MM e distrattori distinti', () => {
		for (let i = 0; i < 30; i += 1) {
			const g = generateClockReading();
			expect(g.prompt).toMatch(/^\d+:\d{2}$/);
			expect(g.distractors).not.toContain(g.correct);
			expect(g.distractors.length).toBeGreaterThanOrEqual(2);
		}
	});
});

describe('generateNumberDictation', () => {
	it('lettura coerente col numero', () => {
		for (let i = 0; i < 20; i += 1) {
			const d = generateNumberDictation();
			expect(d.reading).toBe(readNumber(d.n));
		}
	});
});

describe('monthReading', () => {
	it('gestisce i mesi trappola', () => {
		expect(monthReading(4)).toBe('しがつ');
		expect(monthReading(7)).toBe('しちがつ');
		expect(monthReading(9)).toBe('くがつ');
		expect(monthReading(12)).toBe('じゅうにがつ');
	});
});

describe('generateAppointment', () => {
	it('campi in range e half = 30', () => {
		for (let i = 0; i < 30; i += 1) {
			const a = generateAppointment();
			expect(a.month).toBeGreaterThanOrEqual(1);
			expect(a.month).toBeLessThanOrEqual(12);
			expect(a.day).toBeLessThanOrEqual(31);
			expect(a.hour).toBeLessThanOrEqual(12);
			expect([0, 15, 30, 45]).toContain(a.minute);
			if (a.minute === 30) expect(a.reading).toContain('はん');
		}
	});
});
