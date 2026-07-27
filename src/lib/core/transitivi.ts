import type { Word, LocaleCode } from '../types/models';
import type { QuizContext } from '../quiz/types';
import { createTransitivityPairQuestion } from '../quiz/engine';
import type { TransitivityPairQuestion } from '../quiz/types';

export interface TransitiviRound {
	wordId: string;
	pairId: string;
	question: TransitivityPairQuestion;
}

function shuffle<T>(xs: readonly T[]): T[] {
	const a = [...xs];
	for (let i = a.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j]!, a[i]!];
	}
	return a;
}

// Pesca, tra le parole con una coppia 自動詞/他動詞 (id_verbo_corrispondente),
// quelle per cui esiste una frase d'esempio con il buco が/を mirato e il
// gemello coniugabile nella stessa forma: stesso motore del quiz principale
// (createTransitivityPairQuestion), qui per un gioco dedicato che pesca solo
// tra queste coppie invece che tra tutte le parole.
export function buildTransitiviPool(words: Word[], context: QuizContext, locale: LocaleCode): TransitiviRound[] {
	const pool: TransitiviRound[] = [];
	for (const w of words) {
		if (!w.id_verbo_corrispondente) continue;
		const q = createTransitivityPairQuestion(w, context, locale);
		if (q) pool.push({ wordId: w.id, pairId: w.id_verbo_corrispondente, question: q });
	}
	return pool;
}

export function pickTransitiviRounds(pool: TransitiviRound[], n: number): TransitiviRound[] {
	return shuffle(pool).slice(0, n);
}
