import { describe, it, expect } from 'vitest';
import { haKanjiOltre, parolaOltre, wordHasAdvancedKanji } from './kanjiLevel';
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

describe('haKanjiOltre / parolaOltre (impostazione «Il mio livello»)', () => {
	const liv = new Map<string, 'N5' | 'N4' | 'N3'>([['日', 'N5'], ['会', 'N4'], ['腹', 'N3']]);
	const of = (k: string) => liv.get(k);
	it('kanji oltre il livello scelto', () => {
		expect(haKanjiOltre('日本', of, 'N4')).toBe(true); // 本 assente dal catalogo di prova → oltre
		expect(haKanjiOltre('会う', of, 'N4')).toBe(false);
		expect(haKanjiOltre('会う', of, 'N5')).toBe(true);
		expect(haKanjiOltre('お腹', of, 'N4')).toBe(true);
		expect(haKanjiOltre('お腹', of, 'N3')).toBe(false);
		expect(haKanjiOltre('お腹', of, 'tutti')).toBe(false);
		expect(haKanjiOltre('ひらがな', of, 'N5')).toBe(false);
	});
	it('parola oltre il livello (EXTRA conta come N4)', () => {
		expect(parolaOltre('N3', 'N4')).toBe(true);
		expect(parolaOltre('N4', 'N4')).toBe(false);
		expect(parolaOltre('EXTRA', 'N5')).toBe(true);
		expect(parolaOltre('N1', 'tutti')).toBe(false);
	});
});
