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
import { preloadDistractorIndex } from '$lib/quiz/distractorIndex';
import {
	createUsageClozeQuestion,
	createFlashcardReadingRecognitionQuestion
} from '$lib/quiz/engine';
import type { QuizContext } from '$lib/quiz/types';
import type { Word } from '$lib/types/models';
import type { PoolItem } from './esame-n4-prova';

const MAX_PER_MONDAI = 80;

let cache: Record<string, PoolItem[]> | null = null;

function shuffle<T>(xs: T[]): T[] {
	const a = [...xs];
	for (let i = a.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j]!, a[i]!];
	}
	return a;
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
		const context: QuizContext = {
			locale,
			wordsById: new Map(all.map((w) => [w.id, w])),
			grammarById: new Map(grammar.map((g) => [g.id, g]))
		};
		const distractorIndex = await preloadDistractorIndex();

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

		// 表記: dalla lettura in kana, scegli la scrittura in kanji giusta.
		for (const w of shuffle(words).filter((w: Word) => w.scrittura !== w.lettura)) {
			if (out.hyoki!.length >= MAX_PER_MONDAI) break;
			const q = createFlashcardReadingRecognitionQuestion(w, locale, distractorIndex, context);
			if (!q.choices || q.choices.length < 3) continue;
			const correct = q.choices.indexOf(q.correctAnswer);
			if (correct < 0) continue;
			out.hyoki!.push({
				mondaiSlug: 'hyoki',
				prompt: `この ことばは 漢字で どう 書きますか。　【${q.prompt}】`,
				choices: q.choices,
				correct,
				perche_giusta: `«${q.correctAnswer}» si legge ${q.prompt}.`,
				perche_sbagliate: []
			});
		}

		// 漢字読み: come all'esame vero, la parola è dentro una FRASE d'esempio e va
		// sottolineata (【…】), non isolata con "◯の読み方は". Distrattori = letture
		// reali di altre parole N4 (livello garantito), lunghezza simile.
		const kanjiWords = words.filter((w) => w.scrittura !== w.lettura);
		const escapeReg = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		for (const w of shuffle(kanjiWords)) {
			if (out['kanji-yomi']!.length >= MAX_PER_MONDAI) break;
			const correctR = w.lettura;
			// frase d'esempio che contiene la parola (col termine nel contesto)
			const ex = (w.frasi_esempio ?? []).find((e) => e.testo.includes(w.scrittura));
			if (!ex) continue;
			// sottolinea il termine e rimuovi la SUA lettura (è ciò che si chiede)
			const marked = ex.testo.replace(new RegExp(escapeReg(w.scrittura) + '(\\[[^\\]]*\\])?'), `【${w.scrittura}】`);
			if (!marked.includes(`【${w.scrittura}】`)) continue;
			const distr = [
				...new Set(
					shuffle(kanjiWords)
						.filter((x) => x.lettura !== correctR && x.scrittura !== w.scrittura)
						.map((x) => x.lettura)
				)
			]
				.sort((a, b) => Math.abs(a.length - correctR.length) - Math.abs(b.length - correctR.length))
				.slice(0, 3);
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
