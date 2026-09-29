// Assemblatore della "prova simulata" N4. Mette in fila domande in formato
// esame, nell'ordine e coi tempi reali del blueprint, pescando dal contenuto
// CURATO che abbiamo già (item curati + quiz dei trucchi + round dei mini-giochi).
// Modulo puro (niente DB, niente Svelte): testabile.
//
// I 問題 senza contenuto curato non vengono riempiti a caso: finiscono in
// `mondaiMancanti` (dichiarati, non nascosti) e si completano nelle fasi successive.

import {
	EXAM_N4_SECTIONS,
	CURATED_ITEMS,
	EXAM_SETS,
	BUNSHO_PASSAGES,
	findMondai,
	type ExamSectionId,
	type CuratedExamItem
} from './esame-n4';
import { TRUCCHI } from './esame-n4-trucchi';
import { GIOCO_JUJU, GIOCO_JOKEN } from './esame-n4-giochi';
import { READING_TEXTS, instantiate, type ReadingText } from '../core/readingTexts';
import { LISTENING_DIALOGUES, instantiateListening, type ListeningDialogue } from '../core/listeningDialogues';

export interface ProvaQuestion {
	sezione: ExamSectionId;
	mondaiSlug: string;
	mondaiTitolo: string; // titolo_jp del 問題
	suggerimento: string; // trucco d'insegnante (nascosto in 本番)
	tempoSec: number; // budget di tempo per-domanda
	prompt: string;
	choices: string[];
	correct: number;
	perche_giusta: string;
	perche_sbagliate: string[]; // può essere vuoto per gli item convertiti dai giochi
	traduzione?: string; // traduzione italiana della frase (aiuta a capire il perché)
	tier?: 'facile' | 'difficile'; // tier di difficoltà del contenuto
	// Frase completa (JP) da mostrare nei risultati per i 問題 in cui si riempiono
	// spazi (組み立て, cloze): parti inserite tra 【…】 (sottolineate) + ascoltabile intera.
	fraseCompleta?: string;
	// 発話表現: nome file immagine della situazione (in static/esame/hatsuwa/). Se
	// assente, si mostra la situazione a testo. Opzioni comunque solo-audio.
	immagine?: string;
}

// Filtro per difficoltà: 'facile' esclude i 'difficile'; 'esame' esclude i
// 'facile'; 'medio' tiene tutto. Gli item senza tier valgono per tutti.
export type Difficolta = 'facile' | 'medio' | 'esame';
export function passaTier(tier: 'facile' | 'difficile' | undefined, diff: Difficolta): boolean {
	if (!tier) return true;
	if (diff === 'facile') return tier !== 'difficile';
	if (diff === 'esame') return tier !== 'facile';
	return true;
}

// Voce di pool prima di ricevere i metadati di sezione (aggiunti da buildMock/
// mondaiPool). È anche la forma prodotta dal generatore dal catalogo (async).
export type PoolItem = Omit<ProvaQuestion, 'sezione' | 'mondaiTitolo' | 'suggerimento' | 'tempoSec'>;

export interface ProvaSezione {
	id: ExamSectionId;
	titolo_jp: string;
	titolo_it: string;
	tempoMin: number;
	questions: ProvaQuestion[];
}

export interface Mock {
	sezioni: ProvaSezione[];
	mondaiMancanti: { slug: string; titolo: string }[];
	totale: number;
}

// Trucco → 問題 principale a cui assegnare i suoi mini-quiz nella prova.
const TRUCCO_MONDAI_PRINCIPALE: Record<string, string> = {
	jita: 'yoho',
	juju: 'bunpo1',
	joken: 'bunpo1',
	keigo: 'bunpo1',
	'shieki-ukemi': 'bunpo1',
	youtai: 'bunpo1',
	setsuzoku: 'bunsho-bunpo',
	joshi: 'bunpo1',
	'fukushi-goi': 'bunmyaku'
};

// Pool interno: tutte le domande curate disponibili, raggruppate per slug 問題.
// `extra` = domande generate dal catalogo (async, iniettate dalle pagine).
// Mescola le opzioni mantenendo l'aggancio risposta-giusta e nota-per-distrattore.
// (Gli item curati hanno la giusta in posizione 0: senza questo sarebbe sempre la prima.)
export function shuffleChoices(
	choices: string[],
	correct: number,
	wrong: string[] = []
): { choices: string[]; correct: number; wrong: string[] } {
	const items = choices.map((c, i) => {
		if (i === correct) return { c, note: null as string | null };
		let k = 0;
		for (let j = 0; j < choices.length; j += 1) {
			if (j === correct) continue;
			if (j === i) break;
			k += 1;
		}
		return { c, note: wrong[k] ?? '' };
	});
	const sh = shuffle(items);
	return {
		choices: sh.map((x) => x.c),
		correct: sh.findIndex((x) => x.note === null),
		wrong: sh.filter((x) => x.note !== null).map((x) => x.note as string)
	};
}

// 発話表現/即時応答 all'esame hanno SOLO 3 opzioni: se un item ne ha di più,
// tieni la giusta + i primi 2 distrattori (con le loro note), poi si mescola.
function keepThree(choices: string[], correct: number, wrong: string[]): { choices: string[]; correct: number; wrong: string[] } {
	const others = choices.map((c, i) => ({ c, i })).filter((x) => x.i !== correct).slice(0, 2);
	const noteFor = (idx: number): string => {
		let k = 0;
		for (let j = 0; j < choices.length; j += 1) {
			if (j === correct) continue;
			if (j === idx) return wrong[k] ?? '';
			k += 1;
		}
		return '';
	};
	return { choices: [choices[correct]!, ...others.map((x) => x.c)], correct: 0, wrong: others.map((x) => noteFor(x.i)) };
}

function poolByMondai(extra?: Record<string, PoolItem[]>): Record<string, PoolItem[]> {
	const pool: Record<string, PoolItem[]> = {};
	const push = (slug: string, q: PoolItem) => {
		let { choices, correct } = q;
		let wrong = q.perche_sbagliate;
		if ((slug === 'hatsuwa' || slug === 'sokuji') && choices.length > 3) {
			const t = keepThree(choices, correct, wrong);
			choices = t.choices; correct = t.correct; wrong = t.wrong;
		}
		const s = shuffleChoices(choices, correct, wrong);
		(pool[slug] ??= []).push({ ...q, choices: s.choices, correct: s.correct, perche_sbagliate: s.wrong });
	};

	// 1) Item curati espliciti
	for (const it of CURATED_ITEMS) {
		push(it.mondai, {
			mondaiSlug: it.mondai,
			prompt: it.prompt,
			choices: it.choices,
			correct: it.correct,
			perche_giusta: it.spiegazione.perche_giusta,
			perche_sbagliate: it.spiegazione.perche_sbagliate,
			traduzione: it.traduzione,
			tier: it.tier,
			fraseCompleta: it.frase_completa,
			immagine: it.immagine
		});
	}

	// 1b) 文章の文法 (問題3): ogni brano → un item per buco (formato reale).
	for (const p of BUNSHO_PASSAGES) {
		for (const b of p.buchi) {
			const prompt = p.testo.replace(/【(\d+)】/g, (_m, k) => (Number(k) === b.n ? '＿＿' : `（${k}）`));
			push('bunsho-bunpo', {
				mondaiSlug: 'bunsho-bunpo',
				prompt,
				choices: b.choices,
				correct: b.correct,
				perche_giusta: b.perche_giusta,
				perche_sbagliate: b.perche_sbagliate,
				traduzione: p.traduzione,
				tier: p.tier
			});
		}
	}

	// 2) Mini-quiz dei trucchi
	for (const [id, t] of Object.entries(TRUCCHI)) {
		const slug = TRUCCO_MONDAI_PRINCIPALE[id] ?? t.id;
		for (const q of t.quiz) {
			push(slug, {
				mondaiSlug: slug,
				prompt: q.prompt,
				choices: q.choices,
				correct: q.correct,
				perche_giusta: q.perche_giusta,
				perche_sbagliate: q.perche_sbagliate,
				traduzione: q.traduzione
			});
		}
	}

	// 3) Round dei mini-giochi. Sono CLOZE grammaticali (scegli la forma nel buco):
	// 授受 e 条件 vanno entrambi in 文法1 (文の文法), NON in 発話表現 (che è
	// «situazione → cosa dici»). 発話表現 usa solo item curati col formato giusto.
	for (const r of GIOCO_JUJU) {
		push('bunpo1', {
			mondaiSlug: 'bunpo1',
			prompt: r.prompt,
			choices: r.choices,
			correct: r.correct,
			perche_giusta: r.spiega,
			perche_sbagliate: []
		});
	}
	for (const r of GIOCO_JOKEN) {
		push('bunpo1', {
			mondaiSlug: 'bunpo1',
			prompt: r.prompt,
			choices: r.choices,
			correct: r.correct,
			perche_giusta: r.spiega,
			perche_sbagliate: []
		});
	}

	// 4) Letture curate esistenti (READING_TEXTS, solo N4) → 情報検索/読解
	for (const text of READING_TEXTS) {
		if (text.livello !== 'N4') continue;
		const slug = classifyReading(text);
		const run = instantiate(text);
		for (const rq of run.questions) {
			push(slug, {
				mondaiSlug: slug,
				prompt: `〔${text.tipo}〕${run.rendered}　問: ${rq.q}`,
				choices: rq.choices,
				correct: rq.correct,
				perche_giusta: rq.evidence ? `Nel testo: 「${rq.evidence}」` : 'La risposta è nel testo.',
				perche_sbagliate: [],
				tier: 'facile'
			});
		}
	}

	// 5) Dialoghi curati esistenti (LISTENING_DIALOGUES, solo N4) → 課題/ポイント理解
	for (const d of LISTENING_DIALOGUES) {
		if (d.livello !== 'N4') continue;
		const slug = classifyListening(d);
		const run = instantiateListening(d);
		const copione = run.lines.map((l) => `${l.who === 'F' ? '女' : '男'}: ${l.text}`).join(' ');
		for (const rq of run.questions) {
			push(slug, {
				mondaiSlug: slug,
				prompt: `${copione}　問: ${rq.q}`,
				choices: rq.choices,
				correct: rq.correct,
				perche_giusta: rq.spiega || 'Riascolta il dialogo.',
				perche_sbagliate: [],
				tier: 'facile'
			});
		}
	}

	// 6) Extra generati dal catalogo (async): uniti in coda al pool curato.
	if (extra) {
		for (const [slug, items] of Object.entries(extra)) {
			for (const it of items) push(slug, it);
		}
	}

	return pool;
}

// Instradamento statico (indipendente dai valori pescati, così i conteggi
// restano stabili): gli avvisi/orari vanno a 情報検索; articoli/lettere lunghe a
// 読解 中文; il resto a 読解 短文.
const NOTICE_TIPI = new Set(['お知らせ', 'おしらせ', 'てんきよほう']);
const CHU_TIPI = new Set(['記事', 'レポート', '手紙', 'ブログ']);
function classifyReading(text: ReadingText): string {
	if (NOTICE_TIPI.has(text.tipo)) return 'joho';
	if (CHU_TIPI.has(text.tipo)) return 'dokkai-chu';
	return 'dokkai-tan';
}
// 課題理解 = «cosa si deve fare»; il resto → ポイント理解.
function classifyListening(d: ListeningDialogue): string {
	return /どう|何を|なにを|まず|これから|次に|しなければ/.test(d.domanda) ? 'kadai' : 'point';
}

// Quante domande curate abbiamo per ciascun 問題 (slug → conteggio).
export function countByMondai(extra?: Record<string, PoolItem[]>): Record<string, number> {
	const pool = poolByMondai(extra);
	const out: Record<string, number> = {};
	for (const [slug, arr] of Object.entries(pool)) out[slug] = arr.length;
	return out;
}

// Tutte le domande curate di un singolo 問題 (per il drill dedicato), come
// ProvaQuestion complete. Vuoto se il tipo è ancora in preparazione.
export function mondaiPool(slug: string, opts: BuildOptions = {}): ProvaQuestion[] {
	const found = findMondai(slug);
	if (!found) return [];
	const items = (poolByMondai(opts.extra)[slug] ?? []).filter((q) => passaTier(q.tier, opts.difficolta ?? 'medio'));
	const ordered = (opts.shuffle ?? true) ? shuffle(items) : items;
	return ordered.map((q) => ({
		...q,
		sezione: found.section.id,
		mondaiTitolo: found.mondai.titolo_jp,
		suggerimento: found.mondai.suggerimento,
		tempoSec: found.mondai.tempo_medio_sec
	}));
}

// Costruisce una prova da un Set d'autore (selezione fissa di CURATED_ITEMS),
// nell'ordine ufficiale delle sezioni. Ripetibile e identica ogni volta.
export function buildSet(setId: string): Mock | null {
	const set = EXAM_SETS.find((s) => s.id === setId);
	if (!set) return null;
	const byId = new Map(CURATED_ITEMS.map((it) => [it.id, it]));
	const bySlug: Record<string, CuratedExamItem[]> = {};
	for (const id of set.itemIds) {
		const it = byId.get(id);
		if (it) (bySlug[it.mondai] ??= []).push(it);
	}
	const sezioni: ProvaSezione[] = [];
	let totale = 0;
	for (const sec of EXAM_N4_SECTIONS) {
		const questions: ProvaQuestion[] = [];
		for (const m of sec.mondai) {
			for (const it of bySlug[m.slug] ?? []) {
				let ic = it.choices, icorr = it.correct, iw = it.spiegazione.perche_sbagliate;
				if ((m.slug === 'hatsuwa' || m.slug === 'sokuji') && ic.length > 3) {
					const t = keepThree(ic, icorr, iw);
					ic = t.choices; icorr = t.correct; iw = t.wrong;
				}
				const s = shuffleChoices(ic, icorr, iw);
				questions.push({
					sezione: sec.id,
					mondaiSlug: m.slug,
					mondaiTitolo: m.titolo_jp,
					suggerimento: m.suggerimento,
					tempoSec: m.tempo_medio_sec,
					prompt: it.prompt,
					choices: s.choices,
					correct: s.correct,
					perche_giusta: it.spiegazione.perche_giusta,
					perche_sbagliate: s.wrong,
					traduzione: it.traduzione,
					fraseCompleta: it.frase_completa,
					immagine: it.immagine
				});
			}
		}
		if (questions.length > 0) {
			sezioni.push({ id: sec.id, titolo_jp: sec.titolo_jp, titolo_it: sec.titolo_it, tempoMin: sec.tempo_sezione_min, questions });
			totale += questions.length;
		}
	}
	return { sezioni, mondaiMancanti: [], totale };
}

// Minuti consigliati totali di un Set (somma dei tempi per-domanda dei suoi item).
export function setTotalMinutes(setId: string): number {
	const set = EXAM_SETS.find((s) => s.id === setId);
	if (!set) return 0;
	const byId = new Map(CURATED_ITEMS.map((it) => [it.id, it]));
	let sec = 0;
	for (const id of set.itemIds) {
		const it = byId.get(id);
		if (!it) continue;
		const f = findMondai(it.mondai);
		if (f) sec += f.mondai.tempo_medio_sec;
	}
	return Math.round(sec / 60);
}

// Minuti consigliati totali dell'esame (somma count×tempo su tutti i 問題).
export function examActiveMinutes(): number {
	let sec = 0;
	for (const s of EXAM_N4_SECTIONS) for (const m of s.mondai) sec += m.count * m.tempo_medio_sec;
	return Math.round(sec / 60);
}

// Ripasso mirato: una prova breve che pesca dai 問題 dove vai peggio
// (padronanza più bassa). `mastery` = mappa slug→% (da loadMondaiMastery).
export function buildWeakFocus(mastery: Record<string, number>, opts: BuildOptions = {}): Mock | null {
	const pool = poolByMondai(opts.extra);
	const slugs = Object.keys(pool).filter((s) => (pool[s]?.length ?? 0) > 0);
	if (slugs.length === 0) return null;
	// padronanza crescente; le tipologie mai provate (sconosciute) vanno in coda.
	slugs.sort((a, b) => (mastery[a] ?? 101) - (mastery[b] ?? 101));
	const weak = slugs.slice(0, 6);
	const questions: ProvaQuestion[] = [];
	const diff = opts.difficolta ?? 'medio';
	for (const slug of weak) {
		const found = findMondai(slug);
		if (!found) continue;
		for (const q of shuffle((pool[slug] ?? []).filter((x) => passaTier(x.tier, diff))).slice(0, 3)) {
			questions.push({
				...q,
				sezione: found.section.id,
				mondaiTitolo: found.mondai.titolo_jp,
				suggerimento: found.mondai.suggerimento,
				tempoSec: found.mondai.tempo_medio_sec
			});
		}
	}
	if (questions.length === 0) return null;
	const shuffled = shuffle(questions);
	const tempoMin = Math.max(1, Math.round(shuffled.reduce((n, q) => n + q.tempoSec, 0) / 60));
	return {
		sezioni: [{ id: 'moji-goi', titolo_jp: '🎯 Ripasso mirato', titolo_it: 'Le tue tipologie più deboli', tempoMin, questions: shuffled }],
		mondaiMancanti: [],
		totale: shuffled.length
	};
}

function shuffle<T>(xs: T[], rng: () => number = Math.random): T[] {
	const a = [...xs];
	for (let i = a.length - 1; i > 0; i -= 1) {
		const j = Math.floor(rng() * (i + 1));
		[a[i], a[j]] = [a[j]!, a[i]!];
	}
	return a;
}

// PRNG deterministico (mulberry32): con lo stesso seed la prova pesca sempre le
// stesse domande nello stesso ordine — così le "Prove ufficiali" fisse sono
// identiche a ogni apertura e su ogni dispositivo (solo pool curato, no catalogo).
function makeRng(seed: number): () => number {
	let s = seed >>> 0;
	return () => {
		s |= 0;
		s = (s + 0x6d2b79f5) | 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export interface BuildOptions {
	shuffle?: boolean; // default true; false per test deterministici
	extra?: Record<string, PoolItem[]>; // domande generate dal catalogo
	difficolta?: Difficolta; // filtra gli item per tier di difficoltà
	seed?: number; // se presente: selezione/ordine deterministici (prove fisse)
}

// Costruisce una prova: per ogni 問題 del blueprint prende fino a `count`
// domande dal pool curato. I 問題 senza contenuto finiscono in mondaiMancanti.
export function buildMock(opts: BuildOptions = {}): Mock {
	const rng = opts.seed != null ? makeRng(opts.seed) : Math.random;
	const doShuffle = opts.seed != null ? true : (opts.shuffle ?? true);
	const pool = poolByMondai(opts.extra);
	const sezioni: ProvaSezione[] = [];
	const mancanti: { slug: string; titolo: string }[] = [];
	let totale = 0;

	for (const sec of EXAM_N4_SECTIONS) {
		const questions: ProvaQuestion[] = [];
		for (const m of sec.mondai) {
			const diff = opts.difficolta ?? 'medio';
			const disponibili = (pool[m.slug] ?? []).filter((q) => passaTier(q.tier, diff));
			if (disponibili.length === 0) {
				mancanti.push({ slug: m.slug, titolo: `${m.titolo_jp} · ${m.titolo_it}` });
				continue;
			}
			const scelte = (doShuffle ? shuffle(disponibili, rng) : disponibili).slice(0, m.count);
			for (const q of scelte) {
				questions.push({
					...q,
					sezione: sec.id,
					mondaiTitolo: m.titolo_jp,
					suggerimento: m.suggerimento,
					tempoSec: m.tempo_medio_sec
				});
			}
		}
		if (questions.length > 0) {
			sezioni.push({
				id: sec.id,
				titolo_jp: sec.titolo_jp,
				titolo_it: sec.titolo_it,
				tempoMin: sec.tempo_sezione_min,
				questions
			});
			totale += questions.length;
		}
	}

	return { sezioni, mondaiMancanti: mancanti, totale };
}
