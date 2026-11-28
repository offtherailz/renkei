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
	return costruisciSessioneFV(verbi, n, rng, 'miste').map((r) => ({
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

// ── Ripasso parole: per tipo, con la frase d'esempio ─────────────────────────
export const GRUPPI_PAROLE: { id: string; titolo: string; match: (tipo: string) => boolean }[] = [
	{ id: 'verbi', titolo: 'Parole: verbi', match: (t) => t.startsWith('動詞') },
	{ id: 'avverbi', titolo: 'Parole: avverbi e connettivi', match: (t) => t.startsWith('副詞') || t.startsWith('接続詞') },
	{ id: 'aggettivi', titolo: 'Parole: aggettivi', match: (t) => t.startsWith('形容詞') },
	{ id: 'nomi', titolo: 'Parole: nomi', match: (t) => t.startsWith('名詞') },
	{ id: 'espressioni', titolo: 'Parole: espressioni', match: (t) => t.startsWith('慣用表現') }
];

export interface ParolaAscolto {
	id: string;
	scrittura: string;
	lettura: string;
	tipo_jp: string;
	livello_jlpt: string;
	significato: { it: string[] };
	frasi_esempio?: { testo: string; traduzione?: { it?: string } }[];
}

export function vociParole(words: ParolaAscolto[], pause: ListenPause, livelli: string[] = ['N5', 'N4']): ListenItem[] {
	const out: ListenItem[] = [];
	const visti = new Set<string>();
	for (const w of words) {
		if (!livelli.includes(w.livello_jlpt)) continue;
		const g = GRUPPI_PAROLE.find((x) => x.match(String(w.tipo_jp ?? '')));
		const lettura = (w.lettura ?? '').trim();
		const sign = (w.significato?.it ?? []).slice(0, 2).map((x) => spokenIt(x)).filter(Boolean).join(', ');
		if (!g || !lettura || !sign || JA.test(sign) || visti.has(`${w.scrittura}|${lettura}`)) continue;
		visti.add(`${w.scrittura}|${lettura}`);
		// la frase d'esempio più corta con traduzione italiana
		const es = (w.frasi_esempio ?? [])
			.map((f) => ({ ja: plain(f.testo), it: spokenIt(f.traduzione?.it ?? '') }))
			.filter((f) => f.ja.length > 0 && f.ja.length <= 40 && f.it.length >= 3 && !JA.test(f.it))
			.sort((a, b) => a.ja.length - b.ja.length)[0];
		out.push({
			key: `volo-parola:${w.id}`,
			cat: `volo-parole-${g.id}`,
			jp: lettura,
			it: sign,
			scritto: `${w.scrittura}${w.scrittura !== lettura ? ` (${lettura})` : ''} — ${sign}`,
			steps: [
				{ t: 'ja', text: lettura },
				{ t: 'recall', ms: RECALL[pause] - 2000 },
				{ t: 'it', text: sign },
				...(es ? [{ t: 'wait', ms: 300 } as ListenStep, { t: 'ja', text: es.ja } as ListenStep, { t: 'it', text: es.it } as ListenStep] : []),
				{ t: 'ja', text: lettura, rate: 0.8 }
			]
		});
	}
	return out;
}

export function buildAlVolo(domande: DomandaAscolto[], verbi: VerboFV[], pause: ListenPause, rng: () => number = Math.random, parole: ParolaAscolto[] = []): ListenItem[] {
	const ascolto = domande.map((q) => voceAscolto(q, pause)).filter((x): x is ListenItem => x !== null);
	// tante forme: ~5 per ogni dialogo, generate a caso (non si esauriscono)
	return [...ascolto, ...vociForme(verbi, Math.max(60, ascolto.length * 5), pause, rng), ...vociParole(parole, pause)];
}

// A blocchi annunciati: 2 dialoghi d'esame, 6 forme, 6 parole (un tipo per volta,
// a rotazione: verbi, avverbi, aggettivi, nomi, espressioni), e così via.
export function buildAlVoloQueue(items: ListenItem[], seen: ReadonlySet<string>, rng: () => number = Math.random): ListenItem[] {
	const anyTodo = items.some((i) => i.cat === 'volo-ascolto' && !seen.has(i.key));
	const skip: ReadonlySet<string> = anyTodo ? seen : new Set();
	const coda = (cat: string) => buildQueue(items.filter((i) => i.cat === cat), new Set(), rng).filter((i) => !skip.has(i.key));
	const ascolto = { titolo: "Ascolto d'esame", n: 2, todo: coda('volo-ascolto') };
	const forme = { titolo: 'Forme al volo', n: 6, todo: coda('volo-forme') };
	const parole = GRUPPI_PAROLE.map((g) => ({ titolo: g.titolo, n: 6, todo: coda(`volo-parole-${g.id}`) }));
	const out: ListenItem[] = [];
	const push = (c: { titolo: string; n: number; todo: ListenItem[] }) =>
		c.todo.splice(0, c.n).forEach((item, i) => out.push(i === 0 ? { ...item, intro: `${c.titolo}.` } : item));
	let turno = 0;
	const restano = () => ascolto.todo.length + forme.todo.length + parole.reduce((n, p) => n + p.todo.length, 0) > 0;
	while (restano()) {
		push(ascolto);
		push(forme);
		// il prossimo gruppo di parole che ha ancora voci
		for (let k = 0; k < parole.length; k++) {
			const p = parole[(turno + k) % parole.length]!;
			if (p.todo.length > 0) {
				push(p);
				turno = (turno + k + 1) % parole.length;
				break;
			}
		}
	}
	return out;
}
