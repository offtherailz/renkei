// Helper per le "prove d'uso": oscurare la parola nella sua frase d'esempio
// e riconoscere quale forma coniugata del verbo compare nella frase.

import type { ConjugationForm } from './conjugation';

export const USAGE_BLANK = '＿＿';

// Sceglie QUALE occorrenza del target oscurare: non la prima cieca. Una
// occorrenza incollata a ciò che precede (nessun confine prima) e con un
// confine dopo è quella "vera" (grammatica attaccata al verbo, parola intera);
// una a inizio frase/parola rischia di essere DENTRO un'altra parola
// (il か di かれ, bug reale del cloze grammaticale).
const BOUNDARY = /[\s、。！？「」]/;
export function pickOccurrenceIndex(sentence: string, target: string): number {
	let best = -1;
	let bestScore = -Infinity;
	for (let i = sentence.indexOf(target); i !== -1; i = sentence.indexOf(target, i + 1)) {
		const prev = i === 0 ? '' : sentence[i - 1]!;
		const next = sentence[i + target.length] ?? '';
		let score = 0;
		if (next === '' || BOUNDARY.test(next)) score += 2;
		if (prev === '' || BOUNDARY.test(prev)) score -= 2;
		if (score > bestScore) {
			bestScore = score;
			best = i;
		}
	}
	return best;
}

export function blankSentence(sentence: string, target: string): string | null {
	if (!target) return null;
	const at = pickOccurrenceIndex(sentence, target);
	if (at === -1) return null;
	return `${sentence.slice(0, at)}${USAGE_BLANK}${sentence.slice(at + target.length)}`;
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
