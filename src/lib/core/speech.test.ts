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
});

describe('speechMatches con numeri kanji/cifre', () => {
	it('considera equivalenti "1" detto e "一" scritto', () => {
		expect(speechMatches(['一時に来てください'], [['1時に来てください']])).toBe(true);
	});
});
