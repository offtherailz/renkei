import type { JLPTLevel, Kanji, Word } from '$lib/types/models';

const RANK: Record<JLPTLevel, number> = { N5: 1, N4: 2, N3: 3, N2: 4, N1: 5 };

// Un kanji dentro la parola è "più avanzato" del livello della parola stessa
// (es. parola N4 che contiene un kanji classificato N3 nel catalogo storico).
export function wordHasAdvancedKanji(word: Pick<Word, 'kanji_usati' | 'livello_jlpt'>, kanjiById: Map<string, Kanji>): boolean {
	const wordRank = RANK[word.livello_jlpt];
	return word.kanji_usati.some((id) => {
		const k = kanjiById.get(id);
		return k ? RANK[k.livello_jlpt] > wordRank : false;
	});
}
