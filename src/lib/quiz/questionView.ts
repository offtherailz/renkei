import type { QuizQuestion } from './types';

// Helper di vista per rendere una QuizQuestion in un drill a scelta multipla
// (Consolida, Ripasso punti deboli): prompt, scelte e risposta corretta in
// forma uniforme, qualunque sia il mode.

export function choicesOf(q: QuizQuestion): string[] {
	return 'choices' in q && q.choices ? q.choices : [];
}

export function correctOf(q: QuizQuestion): string {
	if ('correctChoice' in q) return q.correctChoice;
	if ('correctAnswer' in q) return q.correctAnswer;
	return '';
}

export function promptOf(q: QuizQuestion): string {
	if (q.mode === 'conjugation') return `${q.dictionary} → ${q.formLabel}`;
	if (q.mode === 'counter-quiz') return `Contatore per ${q.prompt}`;
	if (q.mode === 'transitivity-pair') return q.sentenceWithBlank;
	if (q.mode === 'particle-cloze') return `Completa: ${q.sentenceWithBlank}`;
	if (q.mode === 'usage-cloze' || q.mode === 'verb-form-cloze') return `Completa: ${q.sentenceWithBlank}`;
	if (q.mode === 'cloze') return `Completa: ${q.sentenceWithBlank.replace(/<[^>]*>/g, '')}`;
	if (q.mode === 'reading-choice') return `Come si legge «${q.targetText}»? ${q.plainSentence}`;
	if ('prompt' in q && q.prompt) return q.prompt;
	return '';
}
