import { describe, it, expect } from 'vitest';
import {
	EXAM_N4_SECTIONS,
	EXAM_N4_HOT_POINTS,
	EXAM_N4_SCORING,
	CURATED_ITEMS,
	allMondai,
	findMondai,
	mondaiKey,
	totalQuestions
} from './esame-n4';

describe('blueprint esame N4', () => {
	it('ha le 3 sezioni ufficiali con i tempi giusti', () => {
		expect(EXAM_N4_SECTIONS.map((s) => s.id)).toEqual(['moji-goi', 'bunpo-dokkai', 'choukai']);
		const tempi = Object.fromEntries(EXAM_N4_SECTIONS.map((s) => [s.id, s.tempo_sezione_min]));
		expect(tempi).toEqual({ 'moji-goi': 25, 'bunpo-dokkai': 55, choukai: 35 });
	});

	it('gli slug dei mondai sono unici', () => {
		const slugs = allMondai().map((m) => m.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
		expect(slugs.length).toBe(15);
	});

	it('ogni mondai ha budget di tempo, conteggio e suggerimento', () => {
		for (const m of allMondai()) {
			expect(m.count).toBeGreaterThan(0);
			expect(m.tempo_medio_sec).toBeGreaterThan(0);
			expect(m.suggerimento.trim().length).toBeGreaterThan(10);
		}
	});

	it('il tempo per-domanda di ogni sezione sta dentro il tempo ufficiale', () => {
		for (const s of EXAM_N4_SECTIONS) {
			const somma = s.mondai.reduce((n, m) => n + m.count * m.tempo_medio_sec, 0);
			expect(somma).toBeLessThanOrEqual(s.tempo_sezione_min * 60);
		}
	});

	it('totalQuestions somma tutte le domande', () => {
		const atteso = EXAM_N4_SECTIONS.flatMap((s) => s.mondai).reduce((n, m) => n + m.count, 0);
		expect(totalQuestions()).toBe(atteso);
	});

	it('findMondai/mondaiKey coerenti per ogni slug', () => {
		for (const m of allMondai()) {
			expect(findMondai(m.slug)?.mondai.slug).toBe(m.slug);
			expect(mondaiKey(m.slug)).toBe(`mondai:${m.slug}`);
		}
		expect(findMondai('inesistente')).toBeNull();
	});

	it('i punti caldi puntano solo a mondai esistenti', () => {
		const slugs = new Set(allMondai().map((m) => m.slug));
		for (const h of EXAM_N4_HOT_POINTS) {
			expect(h.mondai.length).toBeGreaterThan(0);
			for (const s of h.mondai) expect(slugs.has(s)).toBe(true);
		}
	});

	it('gli item curati (quando presenti) referenziano un mondai valido', () => {
		const slugs = new Set(allMondai().map((m) => m.slug));
		for (const item of CURATED_ITEMS) {
			expect(slugs.has(item.mondai)).toBe(true);
			expect(item.correct).toBeGreaterThanOrEqual(0);
			expect(item.correct).toBeLessThan(item.choices.length);
			// una spiegazione per ciascun distrattore
			expect(item.spiegazione.perche_sbagliate.length).toBe(item.choices.length - 1);
		}
	});

	it('lo scoring N4 ha i minimi settoriali noti', () => {
		expect(EXAM_N4_SCORING.totaleMinimo).toBe(90);
		expect(EXAM_N4_SCORING.totaleMax).toBe(180);
		expect(EXAM_N4_SCORING.linguaLettura.minimo).toBe(38);
		expect(EXAM_N4_SCORING.ascolto.minimo).toBe(19);
	});
});
