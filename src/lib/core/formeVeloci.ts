// 👂 Forme al volo — riconoscere A ORECCHIO le forme del parlato veloce che
// decidono la risposta nel 聴解 (〜ちゃった, 〜なきゃ, 〜てる, 〜とく…).
// Il distrattore non è un verbo diverso ma la forma con cui si confonde:
// なきゃ (devo) ⇄ なくてもいい (non serve), てもいい (puoi) ⇄ ちゃだめ (non devi).
// Le forme si generano dal coniugatore sulla LETTURA (kana): il TTS non
// rischia letture sbagliate dei kanji. Logica pura, test in formeVeloci.test.ts.

import { conjugateVerb, type VerbClass } from './conjugation';

export type FormaId =
	| 'chatta'
	| 'nakya'
	| 'teru'
	| 'toku'
	| 'naide'
	| 'tara'
	| 'nakutemoii'
	| 'temoii'
	| 'chadame'
	| 'teta';

export interface FormaMeta {
	id: FormaId;
	nome: string; // come si scrive il pattern
	it: string; // la funzione, in italiano (è l'opzione di risposta)
	estesa: string; // forma «da libro» da cui viene la contrazione
	confusa: FormaId[]; // forme che all'orecchio si confondono con questa
}

export const FORME: FormaMeta[] = [
	{ id: 'chatta', nome: '〜ちゃった / じゃった', it: 'già fatto (del tutto / ops)', estesa: '〜てしまった', confusa: ['chadame', 'teta', 'toku'] },
	{ id: 'nakya', nome: '〜なきゃ', it: 'devo farlo', estesa: '〜なければ(ならない)', confusa: ['nakutemoii', 'naide', 'tara'] },
	{ id: 'teru', nome: '〜てる', it: 'lo sta facendo / stato attuale', estesa: '〜ている', confusa: ['teta', 'toku', 'chatta'] },
	{ id: 'teta', nome: '〜てた', it: 'lo stava facendo (prima)', estesa: '〜ていた', confusa: ['teru', 'chatta', 'tara'] },
	{ id: 'toku', nome: '〜とく / どく', it: 'lo fa prima, in anticipo', estesa: '〜ておく', confusa: ['teru', 'chatta', 'temoii'] },
	{ id: 'naide', nome: '〜ないで', it: 'non farlo! (richiesta)', estesa: '〜ないでください', confusa: ['nakya', 'nakutemoii', 'chadame'] },
	{ id: 'tara', nome: '〜たら', it: 'quando / se lo fa…', estesa: '〜たら', confusa: ['teta', 'nakya', 'chatta'] },
	{ id: 'nakutemoii', nome: '〜なくてもいい', it: 'non serve farlo', estesa: '〜なくてもいい', confusa: ['nakya', 'temoii', 'naide'] },
	{ id: 'temoii', nome: '〜てもいい', it: 'si può fare (permesso)', estesa: '〜てもいい', confusa: ['chadame', 'nakutemoii', 'toku'] },
	{ id: 'chadame', nome: '〜ちゃだめ / じゃだめ', it: 'non si deve fare (divieto)', estesa: '〜てはだめ', confusa: ['temoii', 'chatta', 'naide'] }
];

export const FORMA = Object.fromEntries(FORME.map((f) => [f.id, f])) as Record<FormaId, FormaMeta>;

// て → ちゃ / で → じゃ (e lo stesso per とく/どく).
function teSwap(te: string, perTe: string, perDe: string): string {
	return te.endsWith('で') ? te.slice(0, -1) + perDe : te.slice(0, -1) + perTe;
}

// La forma parlata di un verbo (in forma dizionario, kana o kanji).
export function formaParlata(dict: string, cls: VerbClass, forma: FormaId): string | null {
	const base = conjugateVerb(dict, cls);
	if (!base) return null;
	const k = Object.fromEntries(base.map((f) => [f.key, f.value]));
	const te = k.te!;
	const ta = k.ta!;
	const naiStem = k.nai!.slice(0, -2); // senza ない
	switch (forma) {
		case 'chatta': return teSwap(te, 'ちゃった', 'じゃった');
		case 'nakya': return `${naiStem}なきゃ`;
		case 'teru': return `${te}る`;
		case 'teta': return `${te}た`;
		case 'toku': return teSwap(te, 'とく', 'どく');
		case 'naide': return `${naiStem}ないで`;
		case 'tara': return `${ta}ら`;
		case 'nakutemoii': return `${naiStem}なくてもいい`;
		case 'temoii': return `${te}もいい`;
		case 'chadame': return teSwap(te, 'ちゃだめ', 'じゃだめ');
	}
}

export interface VerboFV {
	scrittura: string;
	lettura: string;
	cls: VerbClass;
	it: string; // significato italiano principale
}

export interface RoundFV {
	verbo: VerboFV;
	forma: FormaId;
	audio: string; // in kana, per il TTS
	scritta: string; // con i kanji, per la revisione
	opzioni: FormaId[]; // 4, con dentro `forma`
}

function shuffle<T>(arr: T[], rnd: () => number): T[] {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(rnd() * (i + 1));
		[a[i], a[j]] = [a[j]!, a[i]!];
	}
	return a;
}

// Un giro: la forma da riconoscere + le 3 forme con cui si confonde.
export function costruisciRoundFV(verbo: VerboFV, forma: FormaId, rnd: () => number = Math.random): RoundFV | null {
	const audio = formaParlata(verbo.lettura, verbo.cls, forma);
	const scritta = formaParlata(verbo.scrittura, verbo.cls, forma);
	if (!audio || !scritta) return null;
	const opzioni = shuffle([forma, ...FORMA[forma].confusa], rnd);
	return { verbo, forma, audio, scritta, opzioni };
}

// Sessione: forme bilanciate (ognuna almeno una volta se n ≥ 10), verbi diversi.
export function costruisciSessioneFV(verbi: VerboFV[], n: number, rnd: () => number = Math.random): RoundFV[] {
	const forme: FormaId[] = [];
	while (forme.length < n) forme.push(...shuffle(FORME.map((f) => f.id), rnd));
	const pool = shuffle(verbi, rnd);
	const out: RoundFV[] = [];
	let vi = 0;
	for (const f of forme.slice(0, n)) {
		for (let tent = 0; tent < pool.length; tent++) {
			const v = pool[vi++ % pool.length]!;
			const r = costruisciRoundFV(v, f, rnd);
			if (r) { out.push(r); break; }
		}
	}
	return out;
}
