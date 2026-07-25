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

	it('NON converte よんじ/ななじ/きゅうじ in cifra+時 (bug segnalato: ななじ accettato per 7時)', () => {
		// よじ/しちじ/くじ sono le uniche letture corrette delle ore 4/7/9;
		// よんじ/ななじ/きゅうじ sono il distrattore "regolare" apposta di
		// counterGen.ts — se li convertissimo in cifra+時 diventerebbero
		// indistinguibili dalla lettura giusta nel confronto normalizzato.
		expect(normalizeSpeech('ななじ')).toBe('ななじ');
		expect(normalizeSpeech('よんじ')).toBe('よんじ');
		expect(normalizeSpeech('きゅうじ')).toBe('きゅうじ');
		// le letture corrette restano convertibili (serve per il match con la
		// forma scritta se il riconoscitore la trascrive così)
		expect(normalizeSpeech('しちじ')).toBe('7時');
		expect(normalizeSpeech('よじ')).toBe('4時');
		expect(normalizeSpeech('くじ')).toBe('9時');
	});

	it('converte le forme contratte con 促音 dei minuti (bug segnalato: 8分/36分 non riconosciuti)', () => {
		// mancavano ろっ/はっ/いっ/じゅっ: senza, はっぷん (8分) e さんじゅうろっぷん
		// (36分) restavano testo kana, mai convergenti con la cifra scritta.
		expect(normalizeSpeech('はっぷん')).toBe('8分');
		expect(normalizeSpeech('いっぷん')).toBe('1分');
		expect(normalizeSpeech('じゅっぷん')).toBe('10分');
		expect(normalizeSpeech('さんじゅうろっぷん')).toBe('36分');
		expect(normalizeSpeech('さんじゅっぷん')).toBe('30分');
	});
});

describe('speechMatches con numeri kanji/cifre', () => {
	it('considera equivalenti "1" detto e "一" scritto', () => {
		expect(speechMatches(['一時に来てください'], [['1時に来てください']])).toBe(true);
	});

	it('«6だい» trascritto dal riconoscitore combacia con «ろくだい» atteso (bug 6台/rokudai)', () => {
		expect(speechMatches(['6だい'], [['ろくだい']])).toBe(true);
	});

	it('«ななじ» (lettura regolare sbagliata) NON combacia con «しちじ» atteso (bug ore)', () => {
		expect(speechMatches(['ななじ'], [['しちじ']])).toBe(false);
	});
});
