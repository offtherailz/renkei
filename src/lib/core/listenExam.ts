// Il mix «Tutto per l'esame» di Solo ascolto: ogni voce è una sequenza di passi
// (voce giapponese, voce italiana, pausa per ricordare, prova d'ascolto a più voci).
// Pensato per l'orecchio: a blocchi annunciati, una voce alla volta. Le spiegazioni
// scritte (mescolano italiano e giapponese) non si leggono: a pezzi non si capiscono.
import { CURATED_ITEMS, type CuratedExamItem } from '../data/esame-n4';
import { TRUCCHI } from '../data/esame-n4-trucchi';
import { stripFuriganaNotation } from './furigana';
import { buildFormRounds } from './handsFree';
import { buildQueue, buildSentenceItems, buildWordItems, recallMs, spokenIt, spokenJa, type ListenDirection, type ListenItem, type ListenPause, type ListenStep } from './listenOnly';
import { instantiateListening, type ListeningDialogue } from './listeningDialogues';
import type { Grammar, Word } from '../types/models';

const JA_CHAR = /[ぁ-んァ-ヶ一-龯々]/;
const JP_BLANK = /＿+|（\s*）/;
const plain = (s: string) => stripFuriganaNotation(s).trim();

const recallFor = (pause: ListenPause, extra = 0) => ({ t: 'recall', ms: { breve: 3000, media: 5000, lunga: 8000 }[pause] + extra }) as const;

// Una frase italiana da dire dopo la risposta, solo se è tutta italiana.
function italianNote(...candidates: (string | undefined)[]): ListenStep[] {
	for (const c of candidates) {
		const t = c ? spokenIt(c.replace(/[«»“”]/g, ' ')).replace(/\s+/g, ' ').trim() : '';
		if (t.length >= 3 && !JA_CHAR.test(t)) return [{ t: 'it', text: t }];
	}
	return [];
}

function shuffled<T>(xs: T[], rng: () => number): T[] {
	const a = [...xs];
	for (let i = a.length - 1; i > 0; i -= 1) {
		const j = Math.floor(rng() * (i + 1));
		[a[i], a[j]] = [a[j]!, a[i]!];
	}
	return a;
}

// Frase col buco: un bip al posto del buco, la pausa per ricordare, la frase intera.
function clozeSteps(prompt: string, risposta: string, note: ListenStep[], pause: ListenPause): { steps: ListenStep[]; full: string } | null {
	const p = plain(prompt);
	const m = p.match(JP_BLANK);
	if (!m || m.index === undefined) return null;
	const before = p.slice(0, m.index).trim();
	const after = p.slice(m.index + m[0].length).trim();
	const full = `${before}${risposta}${after}`;
	const steps: ListenStep[] = [];
	if (before) steps.push({ t: 'ja', text: before });
	steps.push({ t: 'bip' });
	if (JA_CHAR.test(after)) steps.push({ t: 'ja', text: after.replace(/^[、。，．\s]+/, '') });
	steps.push(recallFor(pause), { t: 'ja', text: full }, ...note);
	return { steps, full };
}

function fromExamItem(item: CuratedExamItem, pause: ListenPause, rng: () => number): ListenItem | null {
	const correct = plain(item.choices[item.correct]!);
	const note = italianNote(item.traduzione, item.spiegazione.perche_giusta);
	const base = { key: `esame:${item.id}`, jp: correct, it: item.traduzione ?? item.spiegazione.perche_giusta, scritto: correct };
	switch (item.mondai) {
		case 'kadai':
		case 'point':
			return { ...base, cat: 'ascolto', steps: [{ t: 'esame', prompt: plain(item.prompt) }, recallFor(pause), { t: 'ja', text: correct }, ...note] };
		case 'hatsuwa':
		case 'sokuji': {
			const wrong = shuffled(item.choices.filter((_, i) => i !== item.correct), rng).slice(0, 2);
			const options = shuffled([item.choices[item.correct]!, ...wrong], rng).map(plain);
			const n = options.indexOf(correct) + 1;
			return { ...base, cat: 'ascolto', steps: [{ t: 'scelte', prompt: plain(item.prompt), options }, recallFor(pause), { t: 'ja', text: `${n}ばん。${correct}` }, ...note] };
		}
		case 'bunpo1':
		case 'bunmyaku':
		case 'bunsho-bunpo': {
			const c = clozeSteps(item.prompt, correct, note, pause);
			return c ? { ...base, cat: 'grammatica', scritto: c.full, steps: c.steps } : null;
		}
		case 'iikae': {
			const frase = plain(item.prompt).replace(/\s*≒.*$/, '');
			return { ...base, cat: 'grammatica', scritto: `${frase} ≒ ${correct}`, steps: [{ t: 'ja', text: frase }, recallFor(pause), { t: 'ja', text: correct }, ...italianNote(item.spiegazione.perche_giusta)] };
		}
		case 'kumitate': {
			const pezzi = plain(item.prompt).split(/語群[:：]/)[1]?.split(/[・、]/).map((s) => s.trim()).filter(Boolean);
			const full = item.frase_completa ? plain(item.frase_completa).replace(/[【】]/g, '') : '';
			if (!pezzi?.length || !full) return null;
			// la traduzione è «Frase completa: giapponese — «italiano»»: serve solo l'italiano
			const it = item.traduzione?.match(/«([^»]+)»/)?.[1];
			return {
				...base,
				cat: 'grammatica',
				scritto: full,
				steps: [{ t: 'it', text: 'Metti in ordine.' }, ...pezzi.flatMap((text): ListenStep[] => [{ t: 'ja', text }, { t: 'wait', ms: 500 }]), recallFor(pause, 3000), { t: 'ja', text: full }, ...italianNote(it)]
			};
		}
		case 'dokkai-tan':
		case 'dokkai-chu': {
			const [testo, domanda] = plain(item.prompt).replace(/^〔[^〕]*〕\s*/, '').split(/問[:：]\s*/);
			if (!testo || !domanda) return null;
			const frasi = testo.split(/(?<=。)/).map((s) => s.trim()).filter(Boolean);
			return {
				...base,
				cat: 'lettura',
				steps: [...frasi.map((text): ListenStep => ({ t: 'ja', text })), { t: 'wait', ms: 800 }, { t: 'ja', text: domanda }, recallFor(pause), { t: 'ja', text: correct }, ...italianNote(item.spiegazione.perche_giusta)]
			};
		}
		default:
			return null; // 漢字読み/表記/情報検索/用法: si giocano sullo scritto, non a orecchio
	}
}

function fromDialogue(d: ListeningDialogue, pause: ListenPause): ListenItem | null {
	const run = instantiateListening(d);
	const q = run.questions[0];
	if (!q) return null;
	const correct = q.choices[q.correct]!;
	return {
		key: `dialogo:${d.id}`,
		cat: 'ascolto',
		jp: correct,
		it: d.scena,
		scritto: correct,
		steps: [
			...italianNote(d.scena),
			{ t: 'ja', text: d.domanda },
			{ t: 'wait', ms: 1200 },
			...run.lines.map((l): ListenStep => ({ t: 'ja', text: l.text, voice: l.who })),
			{ t: 'wait', ms: 800 },
			{ t: 'ja', text: q.q },
			recallFor(pause),
			{ t: 'ja', text: correct }
		]
	};
}

// Solo gli esempi: le spiegazioni dei trucchi vanno riscritte per l'orecchio.
function fromTrucchi(pause: ListenPause): ListenItem[] {
	const out: ListenItem[] = [];
	for (const t of Object.values(TRUCCHI)) {
		t.esempi.forEach((e, i) => {
			const jp = spokenJa(plain(e.jp));
			out.push({ key: `trucco:${t.id}:${i}`, cat: 'trucchi', jp, it: e.it, scritto: jp, steps: [...italianNote(e.it), recallFor(pause), { t: 'ja', text: jp }, { t: 'wait', ms: 500 }, { t: 'ja', text: jp }] });
		});
	}
	return out;
}

function fromForms(words: Word[], pause: ListenPause, rng: () => number): ListenItem[] {
	const out = new Map<string, ListenItem>();
	// una forma a caso per giro: tre giri coprono più forme per ogni parola
	for (let giro = 0; giro < 3; giro += 1) {
		for (const r of buildFormRounds(words, Number.MAX_SAFE_INTEGER, rng)) {
			const key = `forma:${r.jp}:${r.cueIt}`;
			if (out.has(key) || !r.forma) continue;
			out.set(key, {
				key,
				cat: 'forme',
				jp: r.jp,
				it: `${r.cueIt} di ${r.forma.yomi}`,
				scritto: r.jp,
				steps: [{ t: 'it', text: `${r.cueIt} di:` }, { t: 'ja', text: r.forma.yomi }, recallFor(pause), { t: 'ja', text: r.jp }, { t: 'wait', ms: 500 }, { t: 'ja', text: r.jp }]
			});
		}
	}
	return [...out.values()];
}

function directionSteps(item: ListenItem, direction: ListenDirection, pause: ListenPause): ListenStep[] {
	const recall: ListenStep = { t: 'recall', ms: recallMs(item, direction, pause) };
	return direction === 'jp-it'
		? [{ t: 'ja', text: item.jp }, recall, { t: 'it', text: item.it }, { t: 'wait', ms: 500 }, { t: 'ja', text: item.jp }]
		: [{ t: 'it', text: item.it }, recall, { t: 'ja', text: item.jp }, { t: 'wait', ms: 500 }, { t: 'ja', text: item.jp, rate: 0.8 }];
}
const withDirections = (item: ListenItem, cat: string, pause: ListenPause): ListenItem => ({
	...item,
	key: `${cat}:${item.key}`,
	cat,
	steps: directionSteps(item, 'jp-it', pause),
	altSteps: directionSteps(item, 'it-jp', pause)
});

export interface ExamMixInput {
	words: Word[];
	grammar: Grammar[];
	curated: Parameters<typeof buildSentenceItems>[2];
	dialogues: ListeningDialogue[];
	levels: string[];
	pause: ListenPause;
	rng?: () => number;
}

// Tutte le voci, divise per categoria: sempre N4 per le prove d'esame e i trucchi,
// i livelli scelti per il resto del catalogo.
export function buildExamMix(input: ExamMixInput): ListenItem[] {
	const { words, grammar, curated, dialogues, levels, pause, rng = Math.random } = input;
	const inLevel = words.filter((w) => levels.includes(w.livello_jlpt));
	return [
		...CURATED_ITEMS.map((i) => fromExamItem(i, pause, rng)).filter((x): x is ListenItem => x !== null),
		...dialogues.filter((d) => levels.includes(d.livello)).map((d) => fromDialogue(d, pause)).filter((x): x is ListenItem => x !== null),
		...fromTrucchi(pause),
		...fromForms(inLevel, pause, rng),
		...buildSentenceItems(words, grammar, curated, levels).map((i) => withDirections(i, 'frasi', pause)),
		...buildWordItems(words, levels).map((i) => withDirections(i, 'parole', pause))
	];
}

// A blocchi, così si sa sempre cosa si sta ascoltando.
const MIX_BLOCKS: { cat: string; n: number; titolo: string }[] = [
	{ cat: 'ascolto', n: 4, titolo: "Prove d'ascolto" },
	{ cat: 'forme', n: 10, titolo: 'Forme' },
	{ cat: 'grammatica', n: 5, titolo: 'Grammatica' },
	{ cat: 'parole', n: 10, titolo: 'Parole' },
	{ cat: 'frasi', n: 6, titolo: 'Frasi' },
	{ cat: 'trucchi', n: 4, titolo: 'Esempi dei punti difficili' },
	{ cat: 'lettura', n: 2, titolo: 'Lettura' }
];
const DIRECTION_SAY: Record<ListenDirection, string> = { 'jp-it': "Dal giapponese all'italiano.", 'it-jp': "Dall'italiano al giapponese." };

export function buildMixQueue(items: ListenItem[], seen: ReadonlySet<string>, rng: () => number = Math.random): ListenItem[] {
	const anyTodo = items.some((i) => !seen.has(i.key));
	const skip: ReadonlySet<string> = anyTodo ? seen : new Set();
	const code = MIX_BLOCKS.map((b) => ({ ...b, turn: 0, todo: buildQueue(items.filter((i) => i.cat === b.cat), new Set(), rng).filter((i) => !skip.has(i.key)) }));
	const out: ListenItem[] = [];
	while (code.some((c) => c.todo.length > 0)) {
		for (const c of code) {
			const block = c.todo.splice(0, c.n);
			if (block.length === 0) continue;
			// la direzione resta la stessa per tutto il blocco e cambia al giro dopo
			const direction: ListenDirection = c.turn % 2 === 0 ? 'jp-it' : 'it-jp';
			c.turn += 1;
			const quante = block.length === 1 ? 'Una domanda.' : `${block.length} domande.`;
			block.forEach((item, i) => {
				const steps = direction === 'it-jp' && item.altSteps ? item.altSteps : item.steps;
				const verso = item.altSteps ? ` ${DIRECTION_SAY[direction]}` : '';
				out.push({ ...item, steps, ...(i === 0 ? { intro: `${c.titolo}.${verso} ${quante}` } : {}) });
			});
		}
	}
	return out;
}
