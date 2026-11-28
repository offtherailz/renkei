// 🚗 Esame al volo — la versione SOLO AUDIO di «Contesto al volo» e «Forme al
// volo», per Solo ascolto (in macchina, senza toccare niente).
//  · Ascolto d'esame: apertura → pausa «cosa mi chiedono?» → la voce italiana lo
//    dice → le opzioni numerate (all'esame sono stampate) → il dialogo → pausa →
//    numero e risposta, il perché in italiano, la traduzione del dialogo.
//  · Forme al volo: la forma parlata → pausa → verbo, significato, funzione della
//    forma → scomposizione dizionario → て → forma parlata.
// Logica pura: test in listenAlVolo.test.ts.
import { stripFuriganaNotation } from './furigana';
import { costruisciRound, adattoAlContesto, type TipoDomanda } from './contestoAscolto';
import { costruisciSessioneFV, FORMA_A_VOCE, type VerboFV } from './formeVeloci';
import { spokenIt, buildQueue, type ListenItem, type ListenPause, type ListenStep } from './listenOnly';

export interface DomandaAscolto {
	prompt: string;
	choices: string[];
	correct: number;
	perche_giusta: string;
	traduzione?: string;
}

const JA = /[ぁ-んァ-ヶ一-龯々]/;
const plain = (s: string) => stripFuriganaNotation(s).trim();
const RECALL: Record<ListenPause, number> = { breve: 4000, media: 6000, lunga: 9000 };

// Cosa ti chiedono, detto a voce in italiano (senza giapponese: a pezzi non si capisce).
export const TIPO_A_VOCE: Record<TipoDomanda, { chiede: string; consiglio: string }> = {
	prima: { chiede: 'cosa fa per prima cosa', consiglio: "Segui l'ordine delle azioni: spesso cambia a metà." },
	azione: { chiede: "cosa farà, l'azione decisa", consiglio: "Conta l'ultima decisione: le prime proposte sono trappole." },
	perche: { chiede: 'il motivo', consiglio: 'Le cause dette e poi negate sono trappole.' },
	quando: { chiede: 'quando, o a che ora', consiglio: 'Segna gli orari e cancella quelli cambiati.' },
	dove: { chiede: 'dove', consiglio: 'Vale il luogo scelto alla fine, non il primo proposto.' },
	chi: { chiede: 'con chi, o quale persona', consiglio: 'Chi è occupato o non può, viene scartato.' },
	come: { chiede: 'in che modo, con quale mezzo', consiglio: 'Ascolta il mezzo e i rifiuti: daijōbu vuol dire no grazie.' },
	prezzo: { chiede: 'quanto si paga', consiglio: 'Prezzo e sconto: spesso serve un piccolo calcolo.' },
	quanti: { chiede: 'quanti', consiglio: 'Segna i numeri: la quantità può cambiare.' },
	cosa: { chiede: 'quale cosa', consiglio: "Elimina quello che c'è già, che non serve o che viene scartato." }
};

// Una spiegazione si dice solo se resta italiana togliendo le citazioni giapponesi.
export function soloItaliano(s: string | undefined): string {
	if (!s) return '';
	const t = spokenIt(
		s
			.replace(/[«「『][^»」』]*[»」』]/g, ' ')
			.replace(/[→=:]/g, ', ')
			.replace(/[«»“”]/g, ' ')
	)
		.replace(/\s*,\s*(,\s*)+/g, ', ')
		.replace(/[\s,;]+(?=[.!?]|$)/g, '')
		.replace(/^[\s,.;]+/g, '')
		.replace(/\s+/g, ' ')
		.trim();
	return t.length >= 6 && !JA.test(t) ? t : '';
}

// Le opzioni si leggono solo se sono parole (non ア/イ/1/2 di un disegno).
const leggibile = (c: string) => plain(c).replace(/[\s　]/g, '').length >= 2 && JA.test(plain(c));

export function voceAscolto(q: DomandaAscolto, pause: ListenPause): ListenItem | null {
	if (!adattoAlContesto(q.prompt) || !q.choices.every(leggibile)) return null;
	const r = costruisciRound(q.prompt);
	const correct = plain(q.choices[q.correct]!);
	const n = q.correct + 1;
	const t = TIPO_A_VOCE[r.tipo];
	const chi: ListenStep[] = r.chi ? (JA.test(r.chiCorretta) ? [{ t: 'it', text: 'Riguarda:' }, { t: 'ja', text: plain(r.chiCorretta) }] : [{ t: 'it', text: `Riguarda: ${r.chiCorretta}.` }]) : [];
	const perche = soloItaliano(q.perche_giusta);
	const trad = q.traduzione ? spokenIt(q.traduzione.replace(/[«»]/g, ' ')).replace(/\s+/g, ' ').trim() : '';
	const steps: ListenStep[] = [
		{ t: 'esame', prompt: plain(q.prompt), part: 'apertura' },
		{ t: 'wait', ms: 2500 }, // cosa mi chiedono?
		{ t: 'it', text: `Ti chiedono: ${t.chiede}.` },
		...chi,
		{ t: 'it', text: t.consiglio },
		{ t: 'wait', ms: 600 },
		...q.choices.flatMap((c, i): ListenStep[] => [{ t: 'ja', text: `${i + 1}ばん` }, { t: 'ja', text: plain(c) }, { t: 'wait', ms: 350 }]),
		{ t: 'esame', prompt: plain(q.prompt), part: 'dialogo' },
		{ t: 'recall', ms: RECALL[pause] },
		{ t: 'ja', text: `${n}ばん` },
		{ t: 'ja', text: correct },
		...(perche ? [{ t: 'it', text: perche } as ListenStep] : []),
		...(trad && !JA.test(trad) ? [{ t: 'wait', ms: 400 } as ListenStep, { t: 'it', text: `Il dialogo diceva: ${trad}` } as ListenStep] : [])
	];
	return {
		key: `volo-ascolto:${plain(q.prompt).slice(0, 60)}`,
		cat: 'volo-ascolto',
		jp: correct,
		it: perche || trad || correct,
		scritto: `${plain(r.domanda)} → ${n}. ${correct}`,
		steps
	};
}

export function vociForme(verbi: VerboFV[], n: number, pause: ListenPause, rng: () => number = Math.random): ListenItem[] {
	return costruisciSessioneFV(verbi, n, rng).map((r) => ({
		key: `volo-forma:${r.audio}`,
		cat: 'volo-forme',
		jp: r.audio,
		it: `${r.verbo.it}: ${FORMA_A_VOCE[r.forma]}`,
		scritto: `${r.scritta} (${r.verbo.scrittura}) — ${FORMA_A_VOCE[r.forma]}`,
		steps: [
			{ t: 'ja', text: r.audio },
			{ t: 'recall', ms: RECALL[pause] - 1000 },
			{ t: 'ja', text: r.verbo.lettura },
			{ t: 'it', text: `${spokenIt(r.verbo.it)}. ${FORMA_A_VOCE[r.forma]}.` },
			{ t: 'wait', ms: 400 },
			{ t: 'ja', text: r.verbo.lettura, rate: 0.8 },
			{ t: 'ja', text: r.te, rate: 0.8 },
			{ t: 'ja', text: r.audio, rate: 0.8 }
		]
	}));
}

export function buildAlVolo(domande: DomandaAscolto[], verbi: VerboFV[], pause: ListenPause, rng: () => number = Math.random): ListenItem[] {
	const ascolto = domande.map((q) => voceAscolto(q, pause)).filter((x): x is ListenItem => x !== null);
	// tante forme: ~5 per ogni dialogo, generate a caso (non si esauriscono)
	return [...ascolto, ...vociForme(verbi, Math.max(60, ascolto.length * 5), pause, rng)];
}

// A blocchi annunciati: 2 dialoghi d'esame, poi 6 forme, e così via.
const BLOCCHI: { cat: string; n: number; titolo: string }[] = [
	{ cat: 'volo-ascolto', n: 2, titolo: "Ascolto d'esame" },
	{ cat: 'volo-forme', n: 6, titolo: 'Forme al volo' }
];

export function buildAlVoloQueue(items: ListenItem[], seen: ReadonlySet<string>, rng: () => number = Math.random): ListenItem[] {
	const anyTodo = items.some((i) => i.cat === 'volo-ascolto' && !seen.has(i.key));
	const skip: ReadonlySet<string> = anyTodo ? seen : new Set();
	const code = BLOCCHI.map((b) => ({ ...b, todo: buildQueue(items.filter((i) => i.cat === b.cat), new Set(), rng).filter((i) => !skip.has(i.key)) }));
	const out: ListenItem[] = [];
	while (code.some((c) => c.todo.length > 0)) {
		for (const c of code) {
			const block = c.todo.splice(0, c.n);
			block.forEach((item, i) => out.push(i === 0 ? { ...item, intro: `${c.titolo}.` } : item));
		}
	}
	return out;
}
