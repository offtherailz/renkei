// Il mix «Tutto per l'esame» di Solo ascolto: ogni voce è una sequenza di passi
// (voce giapponese, voce italiana, pausa per ricordare, prova d'ascolto a più voci).
// Puro: la pagina esegue i passi.
import { CURATED_ITEMS, EXAM_N4_HOT_POINTS, type CuratedExamItem } from '../data/esame-n4';
import { TRUCCHI } from '../data/esame-n4-trucchi';
import { stripFuriganaNotation } from './furigana';
import { buildFormRounds } from './handsFree';
import { buildQueue, buildSentenceItems, buildWordItems, recallMs, type ListenDirection, type ListenItem, type ListenPause, type ListenStep } from './listenOnly';
import { instantiateListening, type ListeningDialogue } from './listeningDialogues';
import type { Grammar, Word } from '../types/models';

const JA_RUN = /[ぁ-んァ-ヶー一-龯々〆]/;
const JA_SPLIT = /([ぁ-んァ-ヶー一-龯々〆][ぁ-んァ-ヶー一-龯々〆〜～・、。！？\s]*)/;

// Le spiegazioni mescolano italiano e giapponese: ogni pezzo alla sua voce, se no la
// voce italiana storpia il giapponese. Via i simboli che la voce leggerebbe male.
export function mixedSteps(text: string): ListenStep[] {
	const clean = stripFuriganaNotation(text).replace(/[«»「」『』【】()（）→≒=＝★①②③④]/g, ' ').replace(/[〜～]|\p{Extended_Pictographic}/gu, '');
	const out: ListenStep[] = [];
	for (const part of clean.split(JA_SPLIT)) {
		const t = part.trim();
		if (!t) continue;
		if (JA_RUN.test(t)) out.push({ t: 'ja', text: t });
		else if (/[A-Za-zÀ-ÿ]/.test(t)) out.push({ t: 'it', text: t.replace(/^[\s:;,.…]+|[\s:;,…]+$/g, '').replace(/\s+/g, ' ') });
	}
	return out;
}

const JP_BLANK = /＿+|（\s*）/;
const plain = (s: string) => stripFuriganaNotation(s).trim();

const recallFor = (pause: ListenPause, extra = 0) => ({ t: 'recall', ms: { breve: 3000, media: 5000, lunga: 8000 }[pause] + extra }) as const;

function examAnswer(item: CuratedExamItem): { correct: string; why: ListenStep[] } {
	return { correct: plain(item.choices[item.correct]!), why: mixedSteps(item.spiegazione.perche_giusta) };
}

function shuffled<T>(xs: T[], rng: () => number): T[] {
	const a = [...xs];
	for (let i = a.length - 1; i > 0; i -= 1) {
		const j = Math.floor(rng() * (i + 1));
		[a[i], a[j]] = [a[j]!, a[i]!];
	}
	return a;
}

// Frase col buco: si sente fino al buco, un attimo di silenzio, il resto; poi la pausa
// per ricordare e la frase intera.
function clozeSteps(prompt: string, risposta: string, why: ListenStep[], pause: ListenPause): { steps: ListenStep[]; full: string } | null {
	const p = plain(prompt);
	const m = p.match(JP_BLANK);
	if (!m || m.index === undefined) return null;
	const before = p.slice(0, m.index).trim();
	const after = p.slice(m.index + m[0].length).trim();
	const full = `${before}${risposta}${after}`;
	const steps: ListenStep[] = [];
	if (before) steps.push({ t: 'ja', text: before });
	steps.push({ t: 'wait', ms: 1200 });
	if (after) steps.push({ t: 'ja', text: after });
	steps.push(recallFor(pause), { t: 'ja', text: full }, ...why);
	return { steps, full };
}

function fromExamItem(item: CuratedExamItem, pause: ListenPause, rng: () => number): ListenItem | null {
	const { correct, why } = examAnswer(item);
	const base = { key: `esame:${item.id}`, jp: correct, it: item.traduzione ?? item.spiegazione.perche_giusta, scritto: correct };
	switch (item.mondai) {
		case 'kadai':
		case 'point':
			return { ...base, cat: 'ascolto', steps: [{ t: 'esame', prompt: plain(item.prompt) }, recallFor(pause), { t: 'ja', text: correct }, ...why] };
		case 'hatsuwa':
		case 'sokuji': {
			const wrong = shuffled(item.choices.filter((_, i) => i !== item.correct), rng).slice(0, 2);
			const options = shuffled([item.choices[item.correct]!, ...wrong], rng).map(plain);
			const n = options.indexOf(correct) + 1;
			return { ...base, cat: 'ascolto', steps: [{ t: 'scelte', prompt: plain(item.prompt), options }, recallFor(pause), { t: 'ja', text: `${n}ばん。${correct}` }, ...why] };
		}
		case 'bunpo1':
		case 'bunmyaku':
		case 'bunsho-bunpo': {
			const c = clozeSteps(item.prompt, correct, why, pause);
			return c ? { ...base, cat: 'grammatica', scritto: c.full, steps: c.steps } : null;
		}
		case 'iikae': {
			const frase = plain(item.prompt).replace(/\s*≒.*$/, '');
			return { ...base, cat: 'grammatica', scritto: `${frase} ≒ ${correct}`, steps: [{ t: 'ja', text: frase }, recallFor(pause), { t: 'ja', text: correct }, ...why] };
		}
		case 'yoho':
			return { ...base, cat: 'grammatica', steps: [{ t: 'ja', text: correct }, { t: 'wait', ms: 800 }, ...why, { t: 'ja', text: correct }] };
		case 'kumitate': {
			const pezzi = plain(item.prompt).split(/語群[:：]/)[1]?.split(/[・、]/).map((s) => s.trim()).filter(Boolean);
			const full = item.frase_completa ? plain(item.frase_completa).replace(/[【】]/g, '') : '';
			if (!pezzi?.length || !full) return null;
			return {
				...base,
				cat: 'grammatica',
				scritto: full,
				steps: [{ t: 'it', text: 'Metti in ordine.' }, ...pezzi.flatMap((text): ListenStep[] => [{ t: 'ja', text }, { t: 'wait', ms: 500 }]), recallFor(pause, 3000), { t: 'ja', text: full }, ...why]
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
				steps: [...frasi.map((text): ListenStep => ({ t: 'ja', text })), { t: 'wait', ms: 800 }, { t: 'ja', text: domanda }, recallFor(pause), { t: 'ja', text: correct }, ...why]
			};
		}
		default:
			return null; // 漢字読み/表記/情報検索: si giocano sulla scrittura, non a orecchio
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
		it: q.spiega,
		scritto: correct,
		steps: [
			{ t: 'it', text: d.scena },
			{ t: 'ja', text: d.domanda },
			{ t: 'wait', ms: 1200 },
			...run.lines.map((l): ListenStep => ({ t: 'ja', text: l.text, voice: l.who })),
			{ t: 'wait', ms: 800 },
			{ t: 'ja', text: q.q },
			recallFor(pause),
			{ t: 'ja', text: correct },
			...mixedSteps(q.spiega)
		]
	};
}

function fromTrucchi(pause: ListenPause): ListenItem[] {
	const out: ListenItem[] = [];
	const label = new Map(EXAM_N4_HOT_POINTS.map((h) => [h.id, h.label]));
	for (const t of Object.values(TRUCCHI)) {
		const nome = label.get(t.id) ?? t.id;
		out.push({ key: `trucco:${t.id}`, cat: 'trucchi', jp: nome, it: t.spiegazione, scritto: nome, steps: [...mixedSteps(nome), ...mixedSteps(t.spiegazione)] });
		t.esempi.forEach((e, i) => {
			const jp = plain(e.jp);
			out.push({ key: `trucco:${t.id}:${i}`, cat: 'trucchi', jp, it: e.it, scritto: jp, steps: [{ t: 'it', text: e.it }, recallFor(pause), { t: 'ja', text: jp }, ...mixedSteps(e.nota)] });
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

function directed(item: ListenItem, cat: string, direction: ListenDirection, pause: ListenPause): ListenItem {
	const recall: ListenStep = { t: 'recall', ms: recallMs(item, direction, pause) };
	const steps: ListenStep[] =
		direction === 'jp-it'
			? [{ t: 'ja', text: item.jp }, recall, { t: 'it', text: item.it }, { t: 'wait', ms: 500 }, { t: 'ja', text: item.jp }]
			: [{ t: 'it', text: item.it }, recall, { t: 'ja', text: item.jp }, { t: 'wait', ms: 500 }, { t: 'ja', text: item.jp, rate: 0.8 }];
	return { ...item, key: `${cat}:${item.key}`, cat, steps };
}

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
		// la direzione cambia di giro in giro: orecchio e produzione insieme
		...buildSentenceItems(words, grammar, curated, levels).map((i) => directed(i, 'frasi', rng() < 0.7 ? 'jp-it' : 'it-jp', pause)),
		...buildWordItems(words, levels).map((i) => directed(i, 'parole', rng() < 0.5 ? 'jp-it' : 'it-jp', pause))
	];
}

// Quante voci per giro: ascolto spesso, frasi e parole non devono coprire il resto.
const MIX_TURNS: [string, number][] = [
	['ascolto', 2],
	['forme', 3],
	['grammatica', 2],
	['parole', 3],
	['frasi', 2],
	['trucchi', 1],
	['lettura', 1]
];

export function buildMixQueue(items: ListenItem[], seen: ReadonlySet<string>, rng: () => number = Math.random): ListenItem[] {
	const code = MIX_TURNS.map(([cat, n]) => ({ n, todo: buildQueue(items.filter((i) => i.cat === cat), seen, rng).filter((i) => !seen.has(i.key)) }));
	const out: ListenItem[] = [];
	while (code.some((c) => c.todo.length > 0)) {
		for (const c of code) out.push(...c.todo.splice(0, c.n));
	}
	return out.length > 0 ? out : buildQueue(items, new Set(), rng);
}
