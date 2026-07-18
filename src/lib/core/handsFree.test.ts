import { describe, it, expect } from 'vitest';
import { classifyUtterance, judgeAnswer, buildRounds } from './handsFree';
import type { Situation } from './usefulPhrases';
import type { ListeningDialogue } from './listeningDialogues';

describe('handsFree.classifyUtterance', () => {
	it('riconosce i comandi giapponesi', () => {
		expect(classifyUtterance(['もう一度'])).toBe('repeat');
		expect(classifyUtterance(['もういちど お願いします'])).toBe('repeat');
		expect(classifyUtterance(['ゆっくり'])).toBe('slow');
		expect(classifyUtterance(['次'])).toBe('skip');
		expect(classifyUtterance(['つぎ'])).toBe('skip');
	});
	it('tutto il resto è una risposta', () => {
		expect(classifyUtterance(['おはようございます'])).toBe('answer');
		expect(classifyUtterance(['いってきます'])).toBe('answer');
	});
});

describe('handsFree.judgeAnswer', () => {
	it('accetta la frase giusta (varianti kanji/kana)', () => {
		expect(judgeAnswer(['行ってきます'], ['いってきます', '行ってきます'])).toBe(true);
		expect(judgeAnswer(['こんにちは'], ['いってきます'])).toBe(false);
	});
});

describe('handsFree.buildRounds', () => {
	const situations: Situation[] = [
		{ id: 's1', emoji: '💼', titolo: 'Ufficio', consigli: '', frasi: [
			{ jp: 'おはようございます。', yomi: 'おはようございます。', it: 'Buongiorno.', quando: '' },
			{ jp: 'お疲れ様でした。', yomi: 'おつかれさまでした。', it: 'Buon lavoro.', quando: '' },
			{ jp: '失礼します。', yomi: 'しつれいします。', it: 'Permesso.', quando: '' }
		] }
	];
	const dialogues = [{ id: 'd1' }, { id: 'd2' }] as unknown as ListeningDialogue[];

	it('mix deterministico con rng finto, ~1 choukai ogni 3', () => {
		let s = 1;
		const rng = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
		const rounds = buildRounds(situations, dialogues, 6, rng);
		expect(rounds.length).toBeGreaterThan(0);
		// il 3° elemento (indice 2) è un choukai per la regola di mix
		expect(rounds[2]?.kind).toBe('choukai');
		// deterministico: stessa seq con lo stesso seed
		s = 1;
		const rng2 = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
		expect(buildRounds(situations, dialogues, 6, rng2)).toEqual(rounds);
	});

	it('le frasi portano le varianti per il match', () => {
		const rounds = buildRounds(situations, [], 3, () => 0.5);
		const frase = rounds.find((r) => r.kind === 'frase');
		expect(frase && 'varianti' in frase && frase.varianti.length).toBeGreaterThan(0);
	});
});
