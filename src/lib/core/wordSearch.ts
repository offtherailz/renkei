import type { Word } from '$lib/types/models';
import { pickLocalizedArray } from './i18n';
import { kanaSearchKey, romajiQueryKey } from './romaji';

// Ricerca parole condivisa (Vocabolario + 🔍 ricerca rapida): scrittura,
// lettura, significato, e romaji/kana tolleranti (setsumei → せつめい,
// benkyoo → べんきょう). readingKey = kanaSearchKey(w.lettura), da
// precalcolare una volta per catalogo.
export type WordMatcher = (w: Word, readingKey: string) => boolean;

export function queryKanaKey(query: string): string | null {
	const q = query.trim();
	if (!q) return null;
	if (/^[ぁ-んァ-ヶー]+$/.test(q)) return kanaSearchKey(q);
	return romajiQueryKey(q);
}

export function makeWordMatcher(query: string, locale: 'it' | 'en'): WordMatcher {
	const q = query.trim().toLowerCase();
	if (!q) return () => true;
	const rk = queryKanaKey(q);
	return (w, readingKey) =>
		w.scrittura.includes(q) ||
		w.lettura.includes(q) ||
		(rk !== null && readingKey.includes(rk)) ||
		pickLocalizedArray(w.significato, locale).some((m) => m.toLowerCase().includes(q));
}

// Prima i match esatti (scrittura/lettura/romaji identici o significato
// uguale), poi quelli che iniziano con la query, poi il resto; a parità
// le parole più corte.
export function rankWords(words: Word[], query: string, locale: 'it' | 'en', keys: Map<string, string>): Word[] {
	const q = query.trim().toLowerCase();
	const rk = queryKanaKey(q);
	const score = (w: Word): number => {
		const key = keys.get(w.id) ?? '';
		const means = pickLocalizedArray(w.significato, locale).map((m) => m.toLowerCase());
		if (w.scrittura === q || w.lettura === q || (rk !== null && key === rk) || means.includes(q)) return 0;
		if (w.scrittura.startsWith(q) || w.lettura.startsWith(q) || (rk !== null && key.startsWith(rk)) || means.some((m) => m.startsWith(q))) return 1;
		return 2;
	};
	return words
		.map((w) => ({ w, s: score(w) }))
		.sort((a, b) => a.s - b.s || a.w.scrittura.length - b.w.scrittura.length)
		.map((x) => x.w);
}
