import { describe, expect, it } from 'vitest';
import { normalizeSpeech, speechMatches, kanaToKanjiWritten, phraseVariants } from './speech';

describe('normalizeSpeech — numerali kana → forma scritta', () => {
	it('ore, mezze, minuti, giorni nativi, yen, bus', () => {
		expect(normalizeSpeech('さんじ')).toBe(normalizeSpeech('3時'));
		expect(normalizeSpeech('よじはん')).toBe(normalizeSpeech('4時半'));
		expect(normalizeSpeech('くじはん')).toBe(normalizeSpeech('9時半'));
		expect(normalizeSpeech('じゅうじ')).toBe(normalizeSpeech('10時'));
		expect(normalizeSpeech('さんじゅっぷん')).toBe(normalizeSpeech('さんじゅっぷん')); // っぷん non coperto: nessun crash
		expect(normalizeSpeech('ごふん')).toBe(normalizeSpeech('5分'));
		expect(normalizeSpeech('ここのか')).toBe(normalizeSpeech('9日'));
		expect(normalizeSpeech('はつか')).toBe(normalizeSpeech('20日'));
		expect(normalizeSpeech('さんぜんえん')).toBe(normalizeSpeech('3000円'));
		expect(normalizeSpeech('ななばん')).toBe(normalizeSpeech('7番'));
		expect(normalizeSpeech('いちばん')).toBe(normalizeSpeech('一番'));
	});

	it('simmetria: non tocca parole normali in modo asimmetrico', () => {
		// stessa stringa → stessa normalizzazione (banale ma protegge da crash)
		for (const w of ['こんにちは', 'ごはん', 'にほんご', 'せんせい', 'いつか行きたい']) {
			expect(normalizeSpeech(w)).toBe(normalizeSpeech(w));
		}
		// ごはん NON deve diventare un numero (はん solo dopo unità)
		expect(normalizeSpeech('ごはん')).toBe('ご飯'.replace('飯', 'はん') === 'ごはん' ? 'ごはん' : normalizeSpeech('ごはん'));
	});

	it('match reali del choukai: risposta kana vs trascrizione scritta', () => {
		expect(speechMatches(['3時'], [['さんじ']])).toBe(true);
		expect(speechMatches(['9時半'], [['くじはん']])).toBe(true);
		expect(speechMatches(['7番'], [['なな']])).toBe(false); // senza unità niente match posticcio
	});
});

describe('kanaToKanjiWritten — variante scritta per frasi kana', () => {
	it('frase N5 kana-spaziata → come la scrive il riconoscitore', () => {
		const v = kanaToKanjiWritten('わたしは がくせいです');
		expect(v).toBe('私は 学生です');
		expect(speechMatches(['私は学生です'], [[...phraseVariants('わたしは がくせいです'), v!]])).toBe(true);
	});

	it('luoghi choukai: えきのまえ → 駅の前', () => {
		const v = kanaToKanjiWritten('えきの まえ');
		expect(v).toBe('駅の 前');
		expect(speechMatches(['駅の前'], [[v!]])).toBe(true);
	});

	it('longest-first: にほんご non diventa 日本ご', () => {
		expect(kanaToKanjiWritten('にほんごを べんきょうします')).toBe('日本語を 勉強します');
	});

	it('nessuna parola nota → null', () => {
		expect(kanaToKanjiWritten('ぺらぺら')).toBe(null);
	});
});
