// Logica pura di «Solo ascolto» (Mani libere senza microfono): la voce propone, si
// lascia una pausa per il richiamo, poi legge la risposta. Niente DOM/voce qui.
import { stripFuriganaNotation } from './furigana';
import { isFormEnumeration } from './sentenceFilters';
import type { Grammar, Word } from '../types/models';

export interface ListenItem {
	key: string; // per ricordare cosa è già stato ascoltato
	jp: string; // ciò che dice la voce giapponese
	it: string;
	scritto: string; // come mostrarlo a chi tira fuori il telefono
	cat?: string; // categoria nel mix «Tutto per l'esame»
	steps?: ListenStep[]; // sequenza propria; senza, la decide la direzione scelta
}
export type ListenStep =
	| { t: 'ja'; text: string; rate?: number; voice?: 'M' | 'F' }
	| { t: 'it'; text: string }
	| { t: 'wait'; ms: number }
	| { t: 'recall'; ms: number } // pausa per ricordare: dopo si mostra la soluzione
	| { t: 'esame'; prompt: string } // prova d'ascolto a più voci
	| { t: 'scelte'; prompt: string; options: string[] }; // battuta e risposte numerate
export type ListenDirection = 'jp-it' | 'it-jp';
export type ListenPause = 'breve' | 'media' | 'lunga';

interface CuratedSentence {
	grammatica: string;
	frase_con_buco: string;
	corretta: string;
	traduzione_it: string;
}

// Le frasi d'esempio dei livelli scelti più gli item curati di grammatica, una volta sola.
export function buildSentenceItems(words: Word[], grammar: Grammar[], curated: CuratedSentence[], levels: string[]): ListenItem[] {
	const out = new Map<string, ListenItem>();
	const add = (testo: string, it: string | undefined) => {
		const jp = stripFuriganaNotation(testo).trim();
		if (!jp || !it || out.has(jp) || /[〜～＿_]/.test(jp) || isFormEnumeration(jp)) return;
		out.set(jp, { key: jp, jp, it, scritto: jp });
	};
	for (const x of [...words, ...grammar]) {
		if (!levels.includes(x.livello_jlpt)) continue;
		for (const ex of x.frasi_esempio ?? []) add(ex.testo, ex.traduzione?.it);
	}
	const levelOf = new Map(grammar.map((g) => [g.id, g.livello_jlpt as string]));
	for (const c of curated) {
		if (levels.includes(levelOf.get(c.grammatica) ?? '')) add(c.frase_con_buco.replace(/＿＿/, c.corretta), c.traduzione_it);
	}
	return [...out.values()];
}

// Parole: la voce dice la lettura, che evita errori sui kanji.
export function buildWordItems(words: Word[], levels: string[]): ListenItem[] {
	const out: ListenItem[] = [];
	for (const w of words) {
		if (!levels.includes(w.livello_jlpt) || !w.scrittura || /[〜～]/.test(w.scrittura)) continue;
		const jp = (w.lettura ?? '').split(/[;；]/)[0]!.trim();
		const sig = w.significato.it;
		const it = (Array.isArray(sig) ? sig.slice(0, 3).join(', ') : sig) ?? '';
		if (jp && it) out.push({ key: w.id, jp, it, scritto: w.scrittura });
	}
	return out;
}

// Prima ciò che non è stato ascoltato; a pari merito a caso. Finito tutto si ricomincia.
export function buildQueue(items: ListenItem[], seen: ReadonlySet<string>, rng: () => number = Math.random): ListenItem[] {
	const todo = items.filter((i) => !seen.has(i.key));
	const a = [...(todo.length > 0 ? todo : items)];
	for (let i = a.length - 1; i > 0; i -= 1) {
		const j = Math.floor(rng() * (i + 1));
		[a[i], a[j]] = [a[j]!, a[i]!];
	}
	return a;
}

const PAUSE_BASE: Record<ListenPause, number> = { breve: 2000, media: 3500, lunga: 6000 };

// Più la frase è lunga più serve tempo, e produrla ne chiede più che capirla.
export function recallMs(item: ListenItem, direction: ListenDirection, pause: ListenPause): number {
	const perChar = direction === 'it-jp' ? 170 : 70;
	return Math.min(16000, PAUSE_BASE[pause] + item.jp.length * perChar);
}
