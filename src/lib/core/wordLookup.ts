// Indice condiviso scrittura/lettura → info parola, per il lookup rapido nelle
// frasi interattive. Caricato una volta da Dexie, cache in memoria.

import { db } from '../db/schema';

export interface WordHit {
	id: string;
	scrittura: string;
	lettura: string;
	tipo_jp: string;
	livello_jlpt: string;
	significato: string; // primo significato nella lingua utente
}

let index: Map<string, WordHit> | null = null;
let building: Promise<Map<string, WordHit>> | null = null;

export async function ensureWordIndex(locale: 'it' | 'en' = 'it'): Promise<Map<string, WordHit>> {
	if (index) return index;
	if (building) return building;
	building = (async () => {
		const rows = await db.words.toArray();
		const map = new Map<string, WordHit>();
		for (const w of rows) {
			const gloss = (locale === 'it' ? w.significato.it : w.significato.en) ?? w.significato.it ?? [];
			const hit: WordHit = {
				id: w.id,
				scrittura: w.scrittura,
				lettura: w.lettura,
				tipo_jp: w.tipo_jp,
				livello_jlpt: w.livello_jlpt,
				significato: gloss[0] ?? ''
			};
			// la scrittura vince sulla lettura in caso di collisione
			if (!map.has(w.scrittura)) map.set(w.scrittura, hit);
			if (!map.has(w.lettura)) map.set(w.lettura, hit);
		}
		index = map;
		return map;
	})();
	return building;
}

// Cerca il token: match esatto, poi la sottostringa più lunga (per い/て/た
// forme flesse cerca anche prefissi progressivamente più corti).
export function lookupToken(map: Map<string, WordHit>, token: string): WordHit | null {
	const t = token.trim();
	if (!t) return null;
	if (map.has(t)) return map.get(t)!;
	for (let end = t.length - 1; end >= 2; end -= 1) {
		const sub = t.slice(0, end);
		if (map.has(sub)) return map.get(sub)!;
	}
	return null;
}

export function jishoUrl(q: string): string {
	return `https://jisho.org/search/${encodeURIComponent(q)}`;
}
