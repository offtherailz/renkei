// Livelli JLPT dei kanji del catalogo, caricati una volta dal DB per le
// frasi cliccabili (furigana sui kanji oltre il livello dell'utente).
import { db } from '$lib/db/schema';
import type { JLPTLevel } from '$lib/types/models';

let livelli: Promise<Map<string, JLPTLevel>> | null = null;

export function caricaLivelliKanji(): Promise<Map<string, JLPTLevel>> {
	livelli ??= db.kanji
		.toArray()
		.then((rows) => new Map(rows.map((k) => [k.id, k.livello_jlpt])))
		.catch(() => {
			livelli = null;
			return new Map<string, JLPTLevel>();
		});
	return livelli;
}
