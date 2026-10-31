// Logica pura del gioco «Mani libere» (vocale puro): classifica ciò che l'utente
// dice (comando o risposta), costruisce il mix di round, e giudica la risposta.
// Niente DOM/voce qui → testabile. La pagina orchestra TTS/mic con queste funzioni.
import { normalizeSpeech, phraseVariants, speechMatches, kanaToKanjiWritten } from './speech';
import { buildAdjectiveTable, buildVerbTable, conjClassKey, detectAdjectiveType, detectVerbClass, type ConjugationForm } from './conjugation';
import type { Word } from '../types/models';
import type { Situation } from './usefulPhrases';
import type { ListeningDialogue } from './listeningDialogues';

export type Utterance = 'repeat' | 'slow' | 'skip' | 'pause' | 'quit' | 'explain' | 'answer';

// Comandi vocali. Il riconoscitore è ja-JP: contano soprattutto le forme
// giapponesi; le parole italiane sono best-effort. NB: la pagina valuta PRIMA se
// l'utterance è la risposta giusta e solo dopo la classifica come comando, così
// una risposta che contiene un comando (es. お待ちください) non viene rubata.
const SLOW = ['ゆっくり', 'piano', 'lento', 'slow'];
const REPEAT = ['もう一度', 'もういちど', 'もっかい', 'ripeti', 'ancora', 'again'];
const PAUSE = ['ちょっと待って', 'ちょっとまって', '待って', 'まって'];
const QUIT = ['やめて', 'やめる', '終わり', 'おわり', 'おしまい', 'ストップ', '止めて', 'basta'];
const SKIP = ['次', 'つぎ', 'パス', 'avanti', 'salta', 'skip', 'pass'];
const EXPLAIN = ['わかりません', 'わからない', 'wakarimasen', 'wakaranai', 'spiegami', 'non capisco'];

// Elenco comandi per i bottoni/legenda (etichetta + frasi da dire + azione).
export type Command = Exclude<Utterance, 'answer'>;
export const HF_COMMANDS: { label: string; icon: string; say: string[]; cmd: Command }[] = [
	{ label: "Un'altra volta", icon: '↩️', say: ['もう一度'], cmd: 'repeat' },
	{ label: 'Più piano', icon: '🐢', say: ['ゆっくり'], cmd: 'slow' },
	{ label: 'Spiegami', icon: '❓', say: ['わかりません'], cmd: 'explain' },
	{ label: 'Pausa', icon: '⏸️', say: ['ちょっと待って', '待って'], cmd: 'pause' },
	{ label: 'Avanti', icon: '⏭️', say: ['次'], cmd: 'skip' },
	{ label: 'Basta', icon: '⏹️', say: ['やめて', 'ストップ'], cmd: 'quit' }
];

function anyMatch(alts: string[], keys: string[]): boolean {
	return alts.some((a) => {
		const n = normalizeSpeech(a).toLowerCase();
		return keys.some((k) => n.includes(normalizeSpeech(k).toLowerCase()));
	});
}

// Un comando il cui trigger è contenuto nella frase CORRETTA del round va
// ignorato in questo round (bug segnalato: dire もう一度 come risposta a
// «すみません、もう一度お願いします。» faceva scattare il comando "ripeti"
// invece di essere giudicato come risposta). judgeAnswer viene già provato
// PRIMA di classifyUtterance dalla pagina, ma se il match non è perfetto
// (frase detta solo in parte) il residuo non deve comunque rubare un comando
// che è anche il contenuto giusto da dire in questo punto dell'esercizio.
function filterOverlapping(keys: string[], expectedPhrase?: string): string[] {
	if (!expectedPhrase) return keys;
	const expectedNorm = normalizeSpeech(expectedPhrase);
	return keys.filter((k) => !expectedNorm.includes(normalizeSpeech(k)));
}

// Classifica un'utterance come comando (o 'answer' se non è un comando).
// Presuppone alts NON vuoto (la pagina gestisce il "niente sentito" a parte).
// expectedPhrase: la frase corretta del round corrente, per non lasciare che un
// comando "rubi" una risposta che lo contiene legittimamente (vedi sopra).
export function classifyUtterance(alts: string[], expectedPhrase?: string): Utterance {
	if (anyMatch(alts, filterOverlapping(SLOW, expectedPhrase))) return 'slow';
	if (anyMatch(alts, filterOverlapping(REPEAT, expectedPhrase))) return 'repeat';
	if (anyMatch(alts, filterOverlapping(EXPLAIN, expectedPhrase))) return 'explain';
	if (anyMatch(alts, filterOverlapping(PAUSE, expectedPhrase))) return 'pause';
	if (anyMatch(alts, filterOverlapping(QUIT, expectedPhrase))) return 'quit';
	if (anyMatch(alts, filterOverlapping(SKIP, expectedPhrase))) return 'skip';
	return 'answer';
}

export function judgeAnswer(alts: string[], varianti: string[]): boolean {
	return speechMatches(alts, [varianti]);
}

// Risposta in italiano a «cosa significa?»: vale un significato qualsiasi tra quelli
// della parola, parole intere, senza articolo e senza le precisazioni tra parentesi.
export function judgeMeaning(alts: string[], significati: string[]): boolean {
	const clean = (s: string) =>
		s
			.toLowerCase()
			.replace(/[(（][^)）]*[)）]/g, ' ')
			.replace(/[.,;:!?…"«»]/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();
	const bare = (s: string) => s.replace(/^(?:il|lo|la|i|gli|le|un|uno|una) /, '').replace(/^(?:l'|un')/, '');
	const voci = significati
		.flatMap((s) => s.split(/[,;、/]/))
		.map((s) => bare(clean(s)))
		.flatMap((s) => [s, s.replace(/^(?:essere|fare) /, '')])
		.filter((s) => s.length >= 2);
	return alts.some((a) => {
		const detto = ` ${clean(a).replace(/\bl'/g, '')} `;
		return voci.some((v) => detto.includes(` ${v} `));
	});
}

// ── Round ────────────────────────────────────────────────────────────────────

export interface FraseRound {
	kind: 'frase';
	cueIt: string; // cosa esprimere (in italiano), detto dall'app
	jp: string; // frase attesa
	varianti: string[]; // per il match vocale
	quando?: string; // spiegazione (registro/uso), letta col comando "Spiegami"
	creditKey?: string; // chiave SRS da premiare sulla giusta (default: phrase:<jp>)
	forma?: { label: string; yomi: string }; // round sulle forme: «Passato piano di: たべる»
}
// Round col colpo d'occhio allo schermo: la parola scritta, l'app chiede come si
// legge (risposta in giapponese) o cosa significa (risposta in italiano).
export interface GuardaRound {
	kind: 'guarda';
	ask: 'lettura' | 'significato';
	parola: string;
	lettura: string;
	significati: string[];
	corretta: string;
	varianti: string[];
	creditKey: string;
}
export interface ChoukaiRound {
	kind: 'choukai';
	dialogueId: string;
	questionIdx: number;
}
export type HFRound = FraseRound | ChoukaiRound | GuardaRound;

function shuffle<T>(xs: T[], rng: () => number): T[] {
	const a = [...xs];
	for (let i = a.length - 1; i > 0; i -= 1) {
		const j = Math.floor(rng() * (i + 1));
		[a[i], a[j]] = [a[j]!, a[i]!];
	}
	return a;
}

// Round «punti deboli»: ripasso vocale del vocabolario debole. L'app dice il
// significato italiano, l'utente dice la parola giapponese; la giusta premia la
// chiave SRS della parola (creditKey) così alimenta davvero il consolidamento.
export interface WeakWord {
	it: string; // significato italiano (prompt)
	jp: string; // scrittura attesa
	yomi: string; // lettura (variante per il match)
	creditKey: string; // es. word:<id>
}
export function buildWordRounds(words: WeakWord[], n: number, rng: () => number = Math.random): FraseRound[] {
	const rounds: FraseRound[] = words.map((w) => {
		const kanji = kanaToKanjiWritten(w.yomi);
		const varianti = [...new Set([...phraseVariants(w.jp), w.jp, w.yomi, ...(kanji ? [kanji] : [])].filter(Boolean))] as string[];
		return { kind: 'frase', cueIt: w.it, jp: w.jp, varianti, quando: w.yomi, creditKey: w.creditKey };
	});
	return shuffle(rounds, rng).slice(0, n);
}

// Un round su tre resta a voce, gli altri chiedono lettura e significato. Le parole
// senza kanji non hanno niente da leggere: solo significato.
export function withLookRounds(rounds: HFRound[]): HFRound[] {
	return rounds.map((r, i) => {
		if (r.kind !== 'frase' || r.forma || !r.creditKey?.startsWith('word:') || !r.quando || i % 3 === 0) return r;
		const hasKanji = /[一-龯々]/.test(r.jp);
		const ask = i % 3 === 1 && hasKanji ? 'lettura' : 'significato';
		const kanji = kanaToKanjiWritten(r.quando);
		return {
			kind: 'guarda',
			ask,
			parola: r.jp,
			lettura: r.quando,
			significati: [r.cueIt],
			corretta: ask === 'lettura' ? r.quando : r.cueIt,
			varianti: ask === 'lettura' ? [...new Set([r.quando, r.jp, ...(kanji ? [kanji] : [])])] : [],
			creditKey: r.creditKey
		} satisfies GuardaRound;
	});
}

// Forme da ripassare a voce. Le etichette sono lette dalla voce italiana.
const VERB_FORMS: { key: string; label: string }[] = [
	{ key: 'te', label: 'Forma te' },
	{ key: 'ta', label: 'Passato piano' },
	{ key: 'nai', label: 'Negativo piano' },
	{ key: 'potential', label: 'Potenziale' },
	{ key: 'volitional', label: 'Volitiva' },
	{ key: 'ba', label: 'Condizionale in ba' },
	{ key: 'passive', label: 'Passiva' },
	{ key: 'causative', label: 'Causativa' }
];
const ADJECTIVE_FORMS: { key: string; label: string }[] = [
	{ key: 'neg', label: 'Negativo' },
	{ key: 'past', label: 'Passato' },
	{ key: 'pastneg', label: 'Passato negativo' }
];
// Il coniugatore applica la regola, ma queste non la seguono o non hanno tutte le
// forme (分かれる, くれられる, いらっしゃれ, あらない): dette a voce insegnerebbero errori.
const NO_FORM_DRILL = new Set([
	'ある', '有る', 'できる', '出来る', '分かる', 'わかる', '見える', '聞こえる', 'いらっしゃる',
	'おっしゃる', 'くださる', '下さる', 'なさる', 'ござる', '問う', 'くれる', '呉れる', 'ない', '無い'
]);
// Potenziale, volitiva, passiva e causativa suonano naturali solo su azioni volute
// (われよう, はれさせる no): verbi transitivi, più gli intransitivi di questa lista.
const INTRANSITIVI_VOLONTARI = new Set([
	'行く', '来る', '帰る', '歩く', '走る', '泳ぐ', '寝る', '起きる', '働く', '遊ぶ', '休む', '座る', '立つ',
	'入る', '出る', '乗る', '降りる', '登る', '急ぐ', '笑う', '泣く'
]);
const FORME_BASE = new Set(['te', 'ta', 'nai', 'ba']);
function formaAdatta(w: Word, key: string): boolean {
	if (!w.tipo_jp.startsWith('動詞') || FORME_BASE.has(key)) return true;
	// nomi con する: 卒業できる sì, 卒業される o 卒業させよう raramente servono
	if (w.scrittura !== 'する' && w.scrittura.endsWith('する')) return key === 'potential';
	return w.transitivita_jp?.startsWith('他動詞') === true || INTRANSITIVI_VOLONTARI.has(w.scrittura);
}

function formTables(w: Word, yomi: string): { kanji: ConjugationForm[]; kana: ConjugationForm[]; forms: typeof VERB_FORMS } | null {
	if (w.tipo_jp.startsWith('動詞')) {
		const cl = detectVerbClass(w);
		const kanji = cl && buildVerbTable(w.scrittura, cl);
		const kana = cl && buildVerbTable(yomi, cl);
		return kanji && kana ? { kanji, kana, forms: VERB_FORMS } : null;
	}
	if (w.tipo_jp.startsWith('形容詞') && detectAdjectiveType(w) === 'i') {
		const kanji = buildAdjectiveTable(w.scrittura, 'i');
		const kana = buildAdjectiveTable(yomi, 'i');
		return kanji && kana ? { kanji, kana, forms: ADJECTIVE_FORMS } : null;
	}
	return null;
}

// Round sulle forme: l'app dice forma e parola, l'utente dice la forma coniugata.
// Una parola per round; la giusta premia la classe di coniugazione (come il quiz).
export function buildFormRounds(words: Word[], n: number, rng: () => number = Math.random): FraseRound[] {
	const out: FraseRound[] = [];
	for (const w of shuffle(words, rng)) {
		if (out.length >= n) break;
		const yomi = w.lettura.split(/[;；,、]/)[0]!.trim();
		if (!yomi || NO_FORM_DRILL.has(w.scrittura) || NO_FORM_DRILL.has(yomi)) continue;
		const t = formTables(w, yomi);
		if (!t) continue;
		const adatte = t.forms.filter((f) => formaAdatta(w, f.key));
		const form = adatte[Math.floor(rng() * adatte.length)]!;
		const scritta = t.kanji.find((f) => f.key === form.key)?.value;
		const parlata = t.kana.find((f) => f.key === form.key)?.value;
		if (!scritta || !parlata) continue;
		const kanji = kanaToKanjiWritten(parlata);
		const it = w.significato.it;
		out.push({
			kind: 'frase',
			cueIt: form.label,
			jp: parlata, // in kana: la voce non sbaglia la lettura (来れば)
			varianti: [...new Set([scritta, parlata, ...(kanji ? [kanji] : [])])],
			quando: Array.isArray(it) ? it.join(', ') : it,
			creditKey: conjClassKey(w) ?? `word:${w.id}`,
			forma: { label: form.label, yomi }
		});
	}
	return out;
}

// Mix deterministico (con rng iniettabile): ~1 choukai ogni 3 frasi.
export function buildRounds(
	situations: Situation[],
	dialogues: ListeningDialogue[],
	n: number,
	rng: () => number = Math.random
): HFRound[] {
	const frasi: FraseRound[] = [];
	for (const s of situations) {
		for (const f of s.frasi) {
			const varianti = [...new Set([...phraseVariants(f.jp), f.jp, f.yomi].filter(Boolean))] as string[];
			frasi.push({ kind: 'frase', cueIt: f.it, jp: f.jp, varianti, quando: f.quando });
		}
	}
	const chou: ChoukaiRound[] = dialogues.map((d) => ({ kind: 'choukai', dialogueId: d.id, questionIdx: 0 }));
	const fr = shuffle(frasi, rng);
	const ch = shuffle(chou, rng);
	const out: HFRound[] = [];
	let fi = 0;
	let ci = 0;
	while (out.length < n && (fi < fr.length || ci < ch.length)) {
		if (out.length % 3 === 2 && ci < ch.length) out.push(ch[ci++]!);
		else if (fi < fr.length) out.push(fr[fi++]!);
		else if (ci < ch.length) out.push(ch[ci++]!);
		else break;
	}
	return out;
}
