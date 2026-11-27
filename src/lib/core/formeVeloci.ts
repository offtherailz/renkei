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
	verbiOpzioni: VerboFV[]; // 4 verbi confondibili, con dentro `verbo`
	te: string; // forma て in kana (catena dizionario → て → parlata)
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
export function costruisciRoundFV(verbo: VerboFV, forma: FormaId, rnd: () => number = Math.random, pool: VerboFV[] = []): RoundFV | null {
	const audio = formaParlata(verbo.lettura, verbo.cls, forma);
	const scritta = formaParlata(verbo.scrittura, verbo.cls, forma);
	const te = formaTe(verbo.lettura, verbo.cls);
	if (!audio || !scritta || !te) return null;
	const opzioni = shuffle([forma, ...FORMA[forma].confusa], rnd);
	const verbiOpzioni = verbiConfondibili(verbo, pool, rnd);
	return { verbo, forma, audio, scritta, opzioni, verbiOpzioni, te };
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
			const r = costruisciRoundFV(v, f, rnd, verbi);
			if (r) { out.push(r); break; }
		}
	}
	return out;
}

// ── Risalire al verbo ────────────────────────────────────────────────────
// All'orecchio la forma て nasconde la terminazione del dizionario: んで può
// venire da む/ぶ/ぬ, って da う/つ/る. È la chiave per «acchiappare» il verbo.
export type TeTipo = 'tte' | 'nde' | 'ite' | 'ide' | 'shite' | 'ichidan' | 'kuru';

export function teTipo(lettura: string, cls: VerbClass): TeTipo {
	if (cls === 'irregular') return lettura.endsWith('する') ? 'shite' : 'kuru';
	if (cls === 'ichidan') return 'ichidan';
	if (lettura.endsWith('いく')) return 'tte';
	const last = lettura.slice(-1);
	if ('うつる'.includes(last)) return 'tte';
	if ('むぶぬ'.includes(last)) return 'nde';
	if (last === 'く') return 'ite';
	if (last === 'ぐ') return 'ide';
	return 'shite'; // す
}

export const TE_INDIZIO: Record<TeTipo, string> = {
	tte: '〜って / っちゃ / っと → il verbo finisce in う, つ o る (o è 行く)',
	nde: '〜んで / んじゃ / んど → il verbo finisce in む, ぶ o ぬ',
	ite: '〜いて / いちゃ / いと → il verbo finisce in く',
	ide: '〜いで / いじゃ / いど → il verbo finisce in ぐ',
	shite: '〜して / しちゃ / しと → il verbo finisce in す (o è 〜する)',
	ichidan: '〜て / ちゃ / と attaccato alla radice → verbo in 〜る (gruppo 2): togli る',
	kuru: 'きて / きちゃ / こない → è 来る (くる)'
};

// La forma て in kana (per la catena «dizionario → て → parlata»).
export function formaTe(lettura: string, cls: VerbClass): string | null {
	return conjugateVerb(lettura, cls)?.find((f) => f.key === 'te')?.value ?? null;
}

// Somiglianza a orecchio tra due verbi: stessa forma て (stessa trappola), stessa
// prima mora, lunghezza simile. Più alto = più confondibile.
function somiglianza(a: VerboFV, b: VerboFV): number {
	let s = 0;
	if (teTipo(a.lettura, a.cls) === teTipo(b.lettura, b.cls)) s += 3;
	if (a.lettura[0] === b.lettura[0]) s += 2;
	if (Math.abs(a.lettura.length - b.lettura.length) <= 1) s += 1;
	if (a.lettura.slice(-1) === b.lettura.slice(-1)) s += 1;
	return s;
}

// 3 verbi confondibili col bersaglio (significati italiani diversi), poi mescolati.
export function verbiConfondibili(target: VerboFV, pool: VerboFV[], rnd: () => number = Math.random): VerboFV[] {
	const visti = new Set([target.lettura]);
	const sign = new Set([target.it]);
	const candidati = shuffle(pool, rnd)
		.filter((v) => !visti.has(v.lettura))
		.map((v) => ({ v, s: somiglianza(target, v) + rnd() * 0.5 }))
		.sort((x, y) => y.s - x.s);
	const scelti: VerboFV[] = [];
	for (const { v } of candidati) {
		if (scelti.length === 3) break;
		if (visti.has(v.lettura) || sign.has(v.it)) continue;
		visti.add(v.lettura);
		sign.add(v.it);
		scelti.push(v);
	}
	return shuffle([target, ...scelti], rnd);
}
