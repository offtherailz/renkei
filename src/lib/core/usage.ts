// Helper per le "prove d'uso": oscurare la parola nella sua frase d'esempio
// e riconoscere quale forma coniugata del verbo compare nella frase.

import type { ConjugationForm } from './conjugation';

export const USAGE_BLANK = '＿＿';

export function blankSentence(sentence: string, target: string): string | null {
	if (!target || !sentence.includes(target)) return null;
	return sentence.replace(target, USAGE_BLANK);
}

// Trova la forma coniugata presente nella frase, preferendo il match più lungo
// (食べている deve vincere su 食べて, che vince su 食べ).
export function findConjugatedForm(
	sentence: string,
	forms: ConjugationForm[]
): ConjugationForm | null {
	const matches = forms
		.filter((f) => f.value.length > 1 && sentence.includes(f.value))
		.sort((a, b) => b.value.length - a.value.length);
	return matches[0] ?? null;
}
