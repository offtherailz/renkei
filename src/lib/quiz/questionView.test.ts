import { describe, expect, it } from 'vitest';
import { promptOf } from './questionView';
import type { QuizQuestion } from './types';

describe('promptOf — la frase col buco appare PRIMA della risposta', () => {
	const base = { wordId: 'word:x', sentenceWithBlank: '友だち＿ 手紙を 書きます。', fullSentence: '友だちに 手紙を 書きます。' };

	it('usage-cloze mostra la frase col buco', () => {
		const q = { ...base, mode: 'usage-cloze', choices: ['に', 'で', 'を'], correctChoice: 'に', translation: '' } as unknown as QuizQuestion;
		expect(promptOf(q)).toContain('友だち＿ 手紙を 書きます。');
	});

	it('verb-form-cloze mostra la frase col buco', () => {
		const q = { ...base, mode: 'verb-form-cloze', choices: ['書きます', '書いた'], correctChoice: '書きます', translation: '' } as unknown as QuizQuestion;
		expect(promptOf(q)).toContain('友だち＿ 手紙を 書きます。');
	});
});
