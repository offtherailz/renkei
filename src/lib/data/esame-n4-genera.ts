// Generatore di domande d'esame dal CATALOGO dell'app (DB parole N4), riusando
// gli engine del quiz con i loro distrattori pedagogici. Client-side/async: le
// pagine prova/drill lo chiamano all'avvio e uniscono il risultato al pool curato.
//
// Copre i tipi lessicali scalabili senza perdita di qualità:
//  - 文脈規定 (bunmyaku) via createUsageClozeQuestion (parola giusta nel contesto)
//  - 表記 (hyoki) via createFlashcardReadingRecognitionQuestion (kana → kanji)
// I 漢字読み, 用法, 言い換え e le sezioni lettura/ascolto restano curati/dai
// generatori esistenti (qualità dei distrattori).

import { db } from '$lib/db/schema';
import { detectUserLocale } from '$lib/core/i18n';
import { createUsageClozeQuestion } from '$lib/quiz/engine';
import type { QuizContext } from '$lib/quiz/types';
import type { Word } from '$lib/types/models';
import type { PoolItem } from './esame-n4-prova';
import { isInLevel } from './kanjiN4';

const MAX_PER_MONDAI = 80;

// All'esame N4 il 問題1/2 testa SOLO kanji entro N4. Una parola può essere N4 ma
// scritta con kanji più avanzati (es. 複雑 → 複・雑 sono N2/N3): all'esame va in
// kana, mai come target da leggere/scrivere. Tiene solo parole coi kanji ≤ N4.
function soloKanjiN4(scrittura: string): boolean {
	const kanji = scrittura.match(/[一-龯]/g);
	if (!kanji) return false; // nessun kanji: non è un target 漢字読み/表記
	return kanji.every((k) => isInLevel(k));
}

let cache: Record<string, PoolItem[]> | null = null;

function shuffle<T>(xs: T[]): T[] {
	const a = [...xs];
	for (let i = a.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j]!, a[i]!];
	}
	return a;
}

// Coppie dakuten/handakuten ⇄ base: i distrattori tipici del 漢字読み confondono
// proprio queste (けいけん/けいげん, ば/ぱ/は…).
const DAKUTEN: Record<string, string[]> = {
	か: ['が'], き: ['ぎ'], く: ['ぐ'], け: ['げ'], こ: ['ご'],
	さ: ['ざ'], し: ['じ'], す: ['ず'], せ: ['ぜ'], そ: ['ぞ'],
	た: ['だ'], ち: ['ぢ'], つ: ['づ'], て: ['で'], と: ['ど'],
	は: ['ば', 'ぱ'], ひ: ['び', 'ぴ'], ふ: ['ぶ', 'ぷ'], へ: ['べ', 'ぺ'], ほ: ['ぼ', 'ぽ'],
	が: ['か'], ぎ: ['き'], ぐ: ['く'], げ: ['け'], ご: ['こ'],
	ざ: ['さ'], じ: ['し'], ず: ['す'], ぜ: ['せ'], ぞ: ['そ'],
	だ: ['た'], で: ['て'], ど: ['と'],
	ば: ['は', 'ぱ'], び: ['ひ', 'ぴ'], ぶ: ['ふ', 'ぷ'], べ: ['へ', 'ぺ'], ぼ: ['ほ', 'ぽ'],
	ぱ: ['は', 'ば'], ぴ: ['ひ', 'び'], ぷ: ['ふ', 'ぶ'], ぺ: ['へ', 'べ'], ぽ: ['ほ', 'ぼ']
};

// Distrattori fonetici della lettura giusta (come al 問題1): dakuten/handakuten,
// 長音 (allunga/accorcia), 促音 (っ). Sono errori di lettura plausibili, non
// letture a caso.
function phoneticVariants(r: string): string[] {
	const out = new Set<string>();
	const chars = [...r];
	for (let i = 0; i < chars.length; i += 1) {
		for (const a of DAKUTEN[chars[i]!] ?? []) {
			const c = [...chars];
			c[i] = a;
			out.add(c.join(''));
		}
	}
	// 促音: se c'è っ toglilo; altrimenti inseriscilo tra le more
	if (r.includes('っ')) out.add(r.replace('っ', ''));
	else for (let i = 1; i < chars.length; i += 1) {
		const c = [...chars];
		c.splice(i, 0, 'っ');
		out.add(c.join(''));
	}
	// 長音: togli la vocale lunga finale, oppure aggiungine una
	if (/[うい]$/.test(r)) out.add(r.slice(0, -1));
	out.add(r + 'う');
	// vocale lunga interna: しょくどう → しょくど (togli un う interno)
	out.add(r.replace(/う(?=.)/, ''));
	out.delete(r);
	return [...out].filter((v) => v.length > 0);
}

// Distrattori del 表記: stessa parola con UN kanji sostituito (送る→近る/逆る…,
// 場所→揚所/場斦…). Mantiene okurigana e lunghezza: forma tipica del 問題2.
function similarWritings(writing: string, pool: string[]): string[] {
	const positions = [...writing].map((c, i) => ({ c, i })).filter((p) => /[一-龯]/.test(p.c));
	if (positions.length === 0 || pool.length === 0) return [];
	const out = new Set<string>();
	let guard = 0;
	while (out.size < 3 && guard < 60) {
		guard += 1;
		const pos = positions[Math.floor(Math.random() * positions.length)]!;
		const repl = pool[Math.floor(Math.random() * pool.length)]!;
		if (repl === pos.c) continue;
		const arr = [...writing];
		arr[pos.i] = repl;
		const v = arr.join('');
		if (v !== writing) out.add(v);
	}
	return [...out];
}

// Genera domande dal catalogo. Cache in memoria (una volta per sessione).
export async function generaDaCatalogo(): Promise<Record<string, PoolItem[]>> {
	if (cache) return cache;
	const out: Record<string, PoolItem[]> = { bunmyaku: [], hyoki: [], 'kanji-yomi': [] };
	try {
		const all = await db.words.toArray();
		const words = all.filter((w) => w.livello_jlpt === 'N4');
		if (words.length === 0) {
			cache = out;
			return out;
		}
		const locale = detectUserLocale();
		const grammar = await db.grammar.toArray();
		// Pool kanji del catalogo (N5/N4): serve per i distrattori del 表記 (kanji
		// simili). Solo i kanji "veri" (un carattere 一-龯).
		const kanjiPool = (await db.kanji.toArray()).map((k) => k.id).filter((c) => /^[一-龯]$/.test(c));
		const context: QuizContext = {
			locale,
			wordsById: new Map(all.map((w) => [w.id, w])),
			grammarById: new Map(grammar.map((g) => [g.id, g]))
		};

		// 文脈規定: parola giusta nel contesto (serve una frase d'esempio).
		for (const w of shuffle(words).filter((w) => (w.frasi_esempio ?? []).length > 0)) {
			if (out.bunmyaku!.length >= MAX_PER_MONDAI) break;
			const q = createUsageClozeQuestion(w, locale, context);
			if (!q) continue;
			const correct = q.choices.indexOf(q.correctChoice);
			if (correct < 0) continue;
			out.bunmyaku!.push({
				mondaiSlug: 'bunmyaku',
				prompt: q.sentenceWithBlank,
				choices: q.choices,
				correct,
				perche_giusta: `«${q.correctChoice}» completa la frase.`,
				perche_sbagliate: [],
				traduzione: q.translation
			});
		}

		const escapeReg = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

		// 表記 (問題2): frase con la parola in KANA sottolineata; si sceglie il KANJI.
		// Distrattori = stessa parola con un kanji simile sostituito (送る→近る/逆る…).
		for (const w of shuffle(words).filter((w: Word) => w.scrittura !== w.lettura && soloKanjiN4(w.scrittura))) {
			if (out.hyoki!.length >= MAX_PER_MONDAI) break;
			const ex = (w.frasi_esempio ?? []).find((e) => e.testo.includes(w.scrittura));
			if (!ex) continue;
			// il termine appare in kana (la sua lettura), sottolineato: si sceglie il kanji
			const marked = ex.testo.replace(new RegExp(escapeReg(w.scrittura) + '(\\[[^\\]]*\\])?'), `【${w.lettura}】`);
			if (!marked.includes(`【${w.lettura}】`)) continue;
			const distr = similarWritings(w.scrittura, kanjiPool);
			if (distr.length < 3) continue;
			const choices = shuffle([w.scrittura, ...distr]);
			out.hyoki!.push({
				mondaiSlug: 'hyoki',
				prompt: marked,
				choices,
				correct: choices.indexOf(w.scrittura),
				perche_giusta: `«${w.lettura}» si scrive ${w.scrittura}.`,
				perche_sbagliate: [],
				traduzione: locale === 'it' ? ex.traduzione.it : ex.traduzione.en
			});
		}

		// 漢字読み (問題1): la parola è dentro una FRASE d'esempio, sottolineata (【…】).
		// Distrattori = varianti FONETICHE della lettura (dakuten/長音/促音), come
		// all'esame; se non bastano, letture reali di altre parole N4 di lunghezza simile.
		const kanjiWords = words.filter((w) => w.scrittura !== w.lettura && soloKanjiN4(w.scrittura));
		for (const w of shuffle(kanjiWords)) {
			if (out['kanji-yomi']!.length >= MAX_PER_MONDAI) break;
			const correctR = w.lettura;
			const ex = (w.frasi_esempio ?? []).find((e) => e.testo.includes(w.scrittura));
			if (!ex) continue;
			// sottolinea il termine e rimuovi la SUA lettura (è ciò che si chiede)
			const marked = ex.testo.replace(new RegExp(escapeReg(w.scrittura) + '(\\[[^\\]]*\\])?'), `【${w.scrittura}】`);
			if (!marked.includes(`【${w.scrittura}】`)) continue;
			let distr = shuffle([...new Set(phoneticVariants(correctR))].filter((v) => v !== correctR)).slice(0, 3);
			if (distr.length < 3) {
				const extra = [
					...new Set(
						shuffle(kanjiWords)
							.filter((x) => x.lettura !== correctR && !distr.includes(x.lettura))
							.map((x) => x.lettura)
					)
				].sort((a, b) => Math.abs(a.length - correctR.length) - Math.abs(b.length - correctR.length));
				distr = [...distr, ...extra].slice(0, 3);
			}
			if (distr.length < 3) continue;
			const choices = shuffle([correctR, ...distr]);
			out['kanji-yomi']!.push({
				mondaiSlug: 'kanji-yomi',
				prompt: marked,
				choices,
				correct: choices.indexOf(correctR),
				perche_giusta: `${w.scrittura} = ${w.lettura}.`,
				perche_sbagliate: [],
				traduzione: locale === 'it' ? ex.traduzione.it : ex.traduzione.en
			});
		}
	} catch {
		/* DB non pronto o engine non disponibile: si resta al solo pool curato */
	}
	cache = out;
	return out;
}
