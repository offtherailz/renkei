import { describe, it, expect } from 'vitest';
import { wordHasAdvancedKanji } from './kanjiLevel';
import type { Kanji } from '$lib/types/models';

function fakeKanji(id: string, livello_jlpt: Kanji['livello_jlpt']): Kanji {
	return {
		id,
		significato: { it: '', en: '' },
		livello_jlpt,
		letture_on: [],
		letture_kun: [],
		link_koohii: '',
		parole_correlate: [],
		updated_at: 0
	};
}

describe('wordHasAdvancedKanji', () => {
	const kanjiById = new Map([
		['悪', fakeKanji('悪', 'N4')],
		['静', fakeKanji('静', 'N3')],
		['日', fakeKanji('日', 'N5')]
	]);

	it('nessun kanji più avanzato del livello della parola: false', () => {
		expect(wordHasAdvancedKanji({ kanji_usati: ['悪'], livello_jlpt: 'N4' }, kanjiById)).toBe(false);
	});

	it('un kanji di livello più alto dentro una parola più semplice: true', () => {
		expect(wordHasAdvancedKanji({ kanji_usati: ['静'], livello_jlpt: 'N4' }, kanjiById)).toBe(true);
	});

	it('kanji dello stesso livello o più facile: false', () => {
		expect(wordHasAdvancedKanji({ kanji_usati: ['日'], livello_jlpt: 'N4' }, kanjiById)).toBe(false);
	});

	it('kanji non trovato nella mappa: ignorato, non esplode', () => {
		expect(wordHasAdvancedKanji({ kanji_usati: ['不在'], livello_jlpt: 'N4' }, kanjiById)).toBe(false);
	});
});
