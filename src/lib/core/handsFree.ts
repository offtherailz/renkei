// Logica pura del gioco «Mani libere» (vocale puro): classifica ciò che l'utente
// dice (comando o risposta), costruisce il mix di round, e giudica la risposta.
// Niente DOM/voce qui → testabile. La pagina orchestra TTS/mic con queste funzioni.
import { normalizeSpeech, phraseVariants, speechMatches } from './speech';
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
		const n = normalizeSpeech(a);
		return keys.some((k) => n.includes(normalizeSpeech(k)));
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

// ── Round ────────────────────────────────────────────────────────────────────

export interface FraseRound {
	kind: 'frase';
	cueIt: string; // cosa esprimere (in italiano), detto dall'app
	jp: string; // frase attesa
	varianti: string[]; // per il match vocale
	quando?: string; // spiegazione (registro/uso), letta col comando "Spiegami"
}
export interface ChoukaiRound {
	kind: 'choukai';
	dialogueId: string;
	questionIdx: number;
}
export type HFRound = FraseRound | ChoukaiRound;

function shuffle<T>(xs: T[], rng: () => number): T[] {
	const a = [...xs];
	for (let i = a.length - 1; i > 0; i -= 1) {
		const j = Math.floor(rng() * (i + 1));
		[a[i], a[j]] = [a[j]!, a[i]!];
	}
	return a;
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
