import type { JLPTLevel, Kanji, Word } from '$lib/types/models';

// EXTRA (fuori liste JLPT) trattata come N4 ai fini del confronto kanji.
const RANK: Record<JLPTLevel, number> = { N5: 1, N4: 2, EXTRA: 2, N3: 3, N2: 4, N1: 5 };

// Un kanji dentro la parola è "più avanzato" del livello della parola stessa
// (es. parola N4 che contiene un kanji classificato N3 nel catalogo storico).
export function wordHasAdvancedKanji(word: Pick<Word, 'kanji_usati' | 'livello_jlpt'>, kanjiById: Map<string, Kanji>): boolean {
	const wordRank = RANK[word.livello_jlpt];
	return word.kanji_usati.some((id) => {
		const k = kanjiById.get(id);
		return k ? RANK[k.livello_jlpt] > wordRank : false;
	});
}

// Livello kanji scelto dall'utente (impostazione livello_kanji): un kanji è
// «oltre» se il suo livello JLPT supera quello scelto. Kanji assenti dal
// catalogo (N2/N1 o rari) contano come oltre. 'tutti' = mai oltre.
export type LivelloKanji = 'N5' | 'N4' | 'N3' | 'tutti';
export const TETTO_LIVELLO: Record<LivelloKanji, number> = { N5: 1, N4: 2, N3: 3, tutti: 99 };
const TETTO = TETTO_LIVELLO;
export function haKanjiOltre(testo: string, livelloOf: (kanji: string) => JLPTLevel | undefined, livello: LivelloKanji): boolean {
	if (livello === 'tutti') return false;
	for (const ch of testo) {
		if (!/[一-龯々]/.test(ch) || ch === '々') continue;
		const l = livelloOf(ch);
		if ((l ? RANK[l] : 99) > TETTO[livello]) return true;
	}
	return false;
}

// Una parola del catalogo è oltre il livello scelto? (EXTRA conta come N4)
export function parolaOltre(livelloParola: JLPTLevel, livello: LivelloKanji): boolean {
	return RANK[livelloParola] > TETTO[livello];
}
