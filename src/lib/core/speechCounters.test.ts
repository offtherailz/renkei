// Verifica sistematica (non a campione): per OGNI valore dei contatori 日/時/分,
// la lettura corretta deve combaciare con se stessa, e il distrattore
// "lettura regolare sbagliata" — lo stesso che counterGen.ts genera apposta
// per il multiple-choice — NON deve mai combaciare con la lettura corretta.
// Nato da un bug reale (ななじ/よんじ/きゅうじ accettate per 7時/4時/9時 —
// collassavano nella normalizzazione) e dalla richiesta dell'utente di
// verificare i distrattori in modo sistematico, non a campione.
import { describe, it, expect } from 'vitest';
import { speechMatches } from './speech';
import { readNumber, dayReading, hourReading, minuteReading } from './counterGen';

describe('voce — 日 (giorni del mese): distrattore "regolare" mai accettato', () => {
	for (let n = 1; n <= 31; n += 1) {
		const correct = dayReading(n);
		// stessi due distrattori "regolari" generati da counterGen.ts per 日
		const wrongNichi = readNumber(n) + 'にち';
		const wrongKa = readNumber(n) + 'か';
		it(`${n}日: "${correct}" combacia con se stessa`, () => {
			expect(speechMatches([correct], [[correct]])).toBe(true);
		});
		if (wrongNichi !== correct) {
			it(`${n}日: distrattore "${wrongNichi}" NON combacia con "${correct}"`, () => {
				expect(speechMatches([wrongNichi], [[correct]])).toBe(false);
			});
		}
		if (wrongKa !== correct) {
			it(`${n}日: distrattore "${wrongKa}" NON combacia con "${correct}"`, () => {
				expect(speechMatches([wrongKa], [[correct]])).toBe(false);
			});
		}
	}
});

describe('voce — 時 (ore): distrattore "regolare" mai accettato', () => {
	for (let n = 1; n <= 12; n += 1) {
		const correct = hourReading(n);
		// stesso distrattore "regolare" generato da counterGen.ts per 時
		const wrong = readNumber(n) + 'じ';
		it(`${n}時: "${correct}" combacia con se stessa`, () => {
			expect(speechMatches([correct], [[correct]])).toBe(true);
		});
		if (wrong !== correct) {
			it(`${n}時: distrattore "${wrong}" NON combacia con "${correct}"`, () => {
				expect(speechMatches([wrong], [[correct]])).toBe(false);
			});
		}
	}
});

describe('voce — 分 (minuti): distrattore rendaku scambiato mai accettato', () => {
	function swapRendaku(r: string): string {
		return r.includes('ぷん') ? r.replace(/ぷん$/, 'ふん') : r.replace(/ふん$/, 'ぷん');
	}
	for (let n = 1; n <= 59; n += 1) {
		const correct = minuteReading(n);
		// stesso distrattore rendaku-scambiato generato da counterGen.ts per 分
		const wrong = swapRendaku(correct);
		it(`${n}分: "${correct}" combacia con se stessa`, () => {
			expect(speechMatches([correct], [[correct]])).toBe(true);
		});
		if (wrong !== correct) {
			it(`${n}分: distrattore rendaku "${wrong}" NON combacia con "${correct}"`, () => {
				expect(speechMatches([wrong], [[correct]])).toBe(false);
			});
		}
	}
});
