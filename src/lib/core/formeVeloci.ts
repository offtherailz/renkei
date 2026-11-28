// 👂 Forme al volo — riconoscere A ORECCHIO le forme del parlato veloce che
// decidono la risposta nel 聴解 (〜ちゃった, 〜なきゃ, 〜てる, 〜とく…).
// Il distrattore non è un verbo diverso ma la forma con cui si confonde:
// なきゃ (devo) ⇄ なくてもいい (non serve), てもいい (puoi) ⇄ ちゃだめ (non devi).
// Le forme si generano dal coniugatore sulla LETTURA (kana): il TTS non
// rischia letture sbagliate dei kanji. Logica pura, test in formeVeloci.test.ts.

import { conjugateVerb, detectVerbClass, type VerbClass } from './conjugation';
import type { Word } from '../types/models';

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

// Le varianti di ogni forma: la 0 è quella contratta del parlato veloce, le altre
// le forme estese (piane e cortesi) che nei dialoghi d'esame capitano altrettanto.
// Stesso significato: cambia solo come suona.
interface Basi { te: string; ta: string; nai: string }
type Gen = (b: Basi) => string;
const VARIANTI: Record<FormaId, { nome: string; gen: Gen }[]> = {
	chatta: [
		{ nome: '〜ちゃった', gen: (b) => teSwap(b.te, 'ちゃった', 'じゃった') },
		{ nome: '〜てしまった', gen: (b) => `${b.te}しまった` },
		{ nome: '〜てしまいました', gen: (b) => `${b.te}しまいました` },
		{ nome: '〜ちゃいました', gen: (b) => teSwap(b.te, 'ちゃいました', 'じゃいました') }
	],
	nakya: [
		{ nome: '〜なきゃ', gen: (b) => `${b.nai}なきゃ` },
		{ nome: '〜なくちゃ', gen: (b) => `${b.nai}なくちゃ` },
		{ nome: '〜なければならない', gen: (b) => `${b.nai}なければならない` },
		{ nome: '〜なければなりません', gen: (b) => `${b.nai}なければなりません` },
		{ nome: '〜なくてはいけません', gen: (b) => `${b.nai}なくてはいけません` }
	],
	teru: [
		{ nome: '〜てる', gen: (b) => `${b.te}る` },
		{ nome: '〜ている', gen: (b) => `${b.te}いる` },
		{ nome: '〜ています', gen: (b) => `${b.te}います` }
	],
	teta: [
		{ nome: '〜てた', gen: (b) => `${b.te}た` },
		{ nome: '〜ていた', gen: (b) => `${b.te}いた` },
		{ nome: '〜ていました', gen: (b) => `${b.te}いました` }
	],
	toku: [
		{ nome: '〜とく', gen: (b) => teSwap(b.te, 'とく', 'どく') },
		{ nome: '〜ておく', gen: (b) => `${b.te}おく` },
		{ nome: '〜ておきます', gen: (b) => `${b.te}おきます` },
		{ nome: '〜といて', gen: (b) => teSwap(b.te, 'といて', 'どいて') }
	],
	naide: [
		{ nome: '〜ないで', gen: (b) => `${b.nai}ないで` },
		{ nome: '〜ないでください', gen: (b) => `${b.nai}ないでください` }
	],
	tara: [
		{ nome: '〜たら', gen: (b) => `${b.ta}ら` } // nessuna forma estesa con lo stesso senso
	],
	nakutemoii: [
		{ nome: '〜なくてもいい', gen: (b) => `${b.nai}なくてもいい` },
		{ nome: '〜なくてもいいです', gen: (b) => `${b.nai}なくてもいいです` },
		{ nome: '〜なくても大丈夫', gen: (b) => `${b.nai}なくてもだいじょうぶ` }
	],
	temoii: [
		{ nome: '〜てもいい', gen: (b) => `${b.te}もいい` },
		{ nome: '〜てもいいです', gen: (b) => `${b.te}もいいです` },
		{ nome: '〜てもかまいません', gen: (b) => `${b.te}もかまいません` }
	],
	chadame: [
		{ nome: '〜ちゃだめ', gen: (b) => teSwap(b.te, 'ちゃだめ', 'じゃだめ') },
		{ nome: '〜てはいけません', gen: (b) => teSwap(b.te, 'てはいけません', 'ではいけません') },
		{ nome: '〜てはだめです', gen: (b) => teSwap(b.te, 'てはだめです', 'ではだめです') }
	]
};
export const N_VARIANTI = (f: FormaId) => VARIANTI[f].length;
export const nomeVariante = (f: FormaId, v: number) => VARIANTI[f][v]?.nome ?? VARIANTI[f][0]!.nome;

// La forma di un verbo (dizionario in kana o kanji). variante 0 = contratta.
export function formaParlata(dict: string, cls: VerbClass, forma: FormaId, variante = 0): string | null {
	const base = conjugateVerb(dict, cls);
	if (!base) return null;
	const k = Object.fromEntries(base.map((f) => [f.key, f.value]));
	const b: Basi = { te: k.te!, ta: k.ta!, nai: k.nai!.slice(0, -2) };
	const v = VARIANTI[forma][variante] ?? VARIANTI[forma][0]!;
	return v.gen(b);
}

// Che registro allenare: solo contratte, solo estese o un po' e un po'.
export type Registro = 'contratte' | 'estese' | 'miste';
export function scegliVariante(forma: FormaId, registro: Registro, rnd: () => number): number {
	const n = VARIANTI[forma].length;
	if (registro === 'contratte' || n === 1) return 0;
	if (registro === 'estese') return 1 + Math.floor(rnd() * (n - 1));
	return rnd() < 0.5 ? 0 : 1 + Math.floor(rnd() * (n - 1));
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
	variante: number; // 0 = contratta, ≥1 = estesa (vedi VARIANTI)
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
export function costruisciRoundFV(verbo: VerboFV, forma: FormaId, rnd: () => number = Math.random, pool: VerboFV[] = [], variante = 0): RoundFV | null {
	const audio = formaParlata(verbo.lettura, verbo.cls, forma, variante);
	const scritta = formaParlata(verbo.scrittura, verbo.cls, forma, variante);
	const te = formaTe(verbo.lettura, verbo.cls);
	if (!audio || !scritta || !te) return null;
	const opzioni = shuffle([forma, ...FORMA[forma].confusa], rnd);
	const verbiOpzioni = verbiConfondibili(verbo, pool, rnd);
	return { verbo, forma, audio, scritta, opzioni, verbiOpzioni, te, variante };
}

// Sessione: forme bilanciate (ognuna almeno una volta se n ≥ 10), verbi diversi.
export function costruisciSessioneFV(verbi: VerboFV[], n: number, rnd: () => number = Math.random, registro: Registro = 'contratte'): RoundFV[] {
	const forme: FormaId[] = [];
	while (forme.length < n) forme.push(...shuffle(FORME.map((f) => f.id), rnd));
	const pool = shuffle(verbi, rnd);
	const out: RoundFV[] = [];
	let vi = 0;
	for (const f of forme.slice(0, n)) {
		for (let tent = 0; tent < pool.length; tent++) {
			const v = pool[vi++ % pool.length]!;
			const r = costruisciRoundFV(v, f, rnd, verbi, scegliVariante(f, registro, rnd));
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

// Verbi N5/N4 usabili: classe nota, lettura tutta in hiragana. Esclusi ある
// (negativo irregolare) e gli onorifici in -さる/-しゃる (masu irregolare).
export function verbiDaParole(words: Word[]): VerboFV[] {
	const out: VerboFV[] = [];
	const seen = new Set<string>();
	for (const w of words) {
		if (!String(w.tipo_jp ?? '').startsWith('動詞')) continue;
		if (w.livello_jlpt !== 'N5' && w.livello_jlpt !== 'N4') continue;
		const cls = detectVerbClass(w);
		const lettura = (w.lettura ?? '').trim();
		if (!cls || !/^[ぁ-ゖー]+$/.test(lettura) || seen.has(lettura)) continue;
		if (lettura === 'ある' || /(さる|しゃる)$/.test(lettura)) continue;
		// onorifici/umili composti (おやすみになる, お〜する): forme parlate innaturali
		if (/^[おご].+(になる|する|いたす)$/.test(lettura) || /(いたす|まいる|もうす|もうしあげる)$/.test(lettura)) continue;
		const it = w.significato?.it?.[0];
		if (!it) continue;
		seen.add(lettura);
		out.push({ scrittura: w.scrittura, lettura, cls, it });
	}
	return out;
}

// La funzione della forma detta a voce (senza barre né parentesi).
export const FORMA_A_VOCE: Record<FormaId, string> = {
	chatta: 'già fatto: del tutto, o per sbaglio',
	nakya: 'devo farlo',
	teru: 'lo sta facendo, o è uno stato attuale',
	teta: 'lo stava facendo, prima',
	toku: 'lo fa prima, in anticipo',
	naide: 'non farlo, per favore',
	tara: 'quando lo fa, o se lo fa',
	nakutemoii: 'non serve farlo',
	temoii: 'si può fare',
	chadame: 'non si deve fare'
};
