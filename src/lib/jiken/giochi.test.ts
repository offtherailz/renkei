import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { isInLevel } from '$lib/data/kanjiN4';
import { conKanji, domandaQuiz, MAX_CLASSIFICA, PARTITA, pagaPartita, paroleGioco, puntiRisposta, registraPunti, turnoUfo, vinciPremio } from './giochi';
import { migra, nuovoStato } from './motore';

const seed = JSON.parse(readFileSync('static/seed-n5n4.json', 'utf8')) as { words: Parameters<typeof paroleGioco>[0] };
const parole = paroleGioco(seed.words);

function rng(seme: number): () => number {
	let x = seme >>> 0 || 1;
	return () => {
		x ^= x << 13;
		x ^= x >>> 17;
		x ^= x << 5;
		return (x >>> 0) / 4294967296;
	};
}

describe('事件: sala giochi', () => {
	it('parole dei giochi: tante, N5/N4, senza doppioni', () => {
		expect(parole.length).toBeGreaterThan(300);
		expect(parole.filter(conKanji).length).toBeGreaterThan(150);
		for (const p of parole) for (const ch of p.scrittura) if (/[一-龯]/.test(ch)) expect(isInLevel(ch), `${ch} in ${p.scrittura}`).toBe(true);
		expect(new Set(parole.map((p) => p.lettura)).size).toBe(parole.length);
		expect(new Set(parole.map((p) => p.scrittura)).size).toBe(parole.length);
	});

	it('UFOキャッチャー: peluche diversi, parole diverse, una giusta', () => {
		for (let seme = 1; seme <= 200; seme++) {
			const t = turnoUfo(parole, 5, rng(seme));
			expect(t.posti).toHaveLength(5);
			expect(new Set(t.posti.map((p) => p.parola.id)).size).toBe(5);
			expect(new Set(t.posti.map((p) => p.premio)).size).toBe(5);
			expect(t.giusto).toBeGreaterThanOrEqual(0);
			expect(t.giusto).toBeLessThan(5);
		}
	});

	it('クイズ: 4 opzioni diverse, quella giusta è la risposta della parola', () => {
		for (let seme = 1; seme <= 300; seme++) {
			const d = domandaQuiz(parole, rng(seme));
			expect(d.opzioni).toHaveLength(4);
			expect(new Set(d.opzioni).size).toBe(4);
			expect(d.opzioni[d.giusta]).toBe(d.tipo === 'lettura' ? d.parola.lettura : d.parola.it);
			if (d.tipo === 'lettura') expect(conKanji(d.parola)).toBe(true);
		}
		// le parole appena uscite non tornano subito
		const evita = parole.slice(0, parole.length - 10).map((p) => p.id);
		for (let seme = 1; seme <= 50; seme++) expect(evita).not.toContain(domandaQuiz(parole, rng(seme), evita).parola.id);
		expect(puntiRisposta(7.6)).toBe(17);
		expect(puntiRisposta(-1)).toBe(10);
	});

	it('una partita costa 100 yen e 15 minuti; senza soldi o portafoglio non si gioca', () => {
		const s = { ...nuovoStato('テスト', 'm3'), minuti: 600, soldi: 250 };
		const a = pagaPartita(s)!;
		expect(a.soldi).toBe(250 - PARTITA.prezzo);
		expect(a.minuti).toBe(600 + PARTITA.minuti);
		expect(pagaPartita({ ...s, soldi: 99 })).toBeNull();
		expect(pagaPartita({ ...s, oggetti: [] })).toBeNull();
		expect(pagaPartita({ ...s, minuti: 23 * 60 + 55 })!.minuti).toBe(23 * 60 + 59);
	});

	it('collezione e classifica restano nel salvataggio', () => {
		let s = nuovoStato('テスト', 'm3');
		const t = turnoUfo(parole, 5, rng(3));
		s = vinciPremio(s, t.posti[t.giusto]!);
		expect(s.collezione).toHaveLength(1);
		expect(s.collezione[0]!.ja).toBe(t.posti[t.giusto]!.parola.scrittura);
		for (const p of [30, 80, 0, 50, 120, 10, 90]) s = registraPunti(s, p).stato;
		expect(s.classifica.map((c) => c.punti)).toEqual([120, 90, 80, 50, 30]);
		expect(s.classifica).toHaveLength(MAX_CLASSIFICA);
		expect(registraPunti(s, 100).posto).toBe(1);
		expect(registraPunti(s, 5).posto).toBe(-1);
		const dopo = migra(JSON.parse(JSON.stringify(s)))!;
		expect(dopo.collezione).toEqual(s.collezione);
		expect(dopo.classifica).toEqual(s.classifica);
		// salvataggi di prima della sala giochi
		const { collezione: _c, classifica: _k, ...vecchio } = s;
		const m = migra(vecchio)!;
		expect(m.collezione).toEqual([]);
		expect(m.classifica).toEqual([]);
	});
});
