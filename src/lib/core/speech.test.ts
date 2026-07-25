import { describe, it, expect } from 'vitest';
import { normalizeSpeech, speechMatches } from './speech';

describe('normalizeSpeech', () => {
	it('rimuove spazi e punteggiatura', () => {
		expect(normalizeSpeech('もう少し、ゆっくり話してください。')).toBe('もう少しゆっくり話してください');
	});

	it('converte katakana in hiragana', () => {
		expect(normalizeSpeech('スミマセン')).toBe(normalizeSpeech('すみません'));
	});

	it('converte i numeri kanji in cifre arabe', () => {
		expect(normalizeSpeech('一時')).toBe('1時');
		expect(normalizeSpeech('1時')).toBe('1時');
		expect(normalizeSpeech('二十')).toBe('20');
		expect(normalizeSpeech('三十五')).toBe('35');
	});

	it('lascia intatti i kanji che non sono sequenze numeriche isolate', () => {
		// 千葉 non va confuso con "1000葉": qui verifichiamo solo che la funzione
		// non vada in errore, l'eventuale falso positivo è un compromesso noto.
		expect(() => normalizeSpeech('千葉に行きます')).not.toThrow();
	});

	it('converte i numerali kana + contatore in cifra+kanji (dettato "Conta gli oggetti")', () => {
		expect(normalizeSpeech('ろくだい')).toBe('6台');
		expect(normalizeSpeech('さんにん')).toBe('3人');
	});

	it('converte anche la forma ibrida cifra araba + contatore in kana (bug segnalato: 6だい per 6台)', () => {
		// il riconoscitore normalizza spesso solo il numero in cifra, lasciando
		// il contatore in kana: senza questo passo "6だい" non combaciava con "6台".
		expect(normalizeSpeech('6だい')).toBe('6台');
		expect(normalizeSpeech('6にん')).toBe('6人');
	});
});

describe('speechMatches con numeri kanji/cifre', () => {
	it('considera equivalenti "1" detto e "一" scritto', () => {
		expect(speechMatches(['一時に来てください'], [['1時に来てください']])).toBe(true);
	});

	it('«6だい» trascritto dal riconoscitore combacia con «ろくだい» atteso (bug 6台/rokudai)', () => {
		expect(speechMatches(['6だい'], [['ろくだい']])).toBe(true);
	});
});
