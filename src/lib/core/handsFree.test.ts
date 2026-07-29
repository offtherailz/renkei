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
		expect(classifyUtterance(['ちょっと待って'])).toBe('pause');
		expect(classifyUtterance(['待って'])).toBe('pause');
		expect(classifyUtterance(['やめて'])).toBe('quit');
		expect(classifyUtterance(['ストップ'])).toBe('quit');
	});
	it('tutto il resto è una risposta', () => {
		expect(classifyUtterance(['おはようございます'])).toBe('answer');
		expect(classifyUtterance(['いってきます'])).toBe('answer');
	});
	it('riconosce わかりません come richiesta di spiegazione', () => {
		expect(classifyUtterance(['わかりません'])).toBe('explain');
		expect(classifyUtterance(['わからない'])).toBe('explain');
	});
	it('bug segnalato: un comando contenuto nella frase corretta del round non va rubato', () => {
		const expected = 'すみません、もう一度お願いします。';
		// senza il contesto della frase attesa, もう一度 resta un comando (comportamento di default)
		expect(classifyUtterance(['もう一度'])).toBe('repeat');
		// con la frase attesa che lo contiene legittimamente, non deve scattare il comando
		expect(classifyUtterance(['もう一度'], expected)).toBe('answer');
		// gli altri comandi restano attivi anche in quel round
		expect(classifyUtterance(['ゆっくり'], expected)).toBe('slow');
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

	it('le frasi portano anche "quando" (per il comando Spiegami)', () => {
		const situationsConQuando: Situation[] = [
			{ id: 's2', emoji: '💼', titolo: 'Ufficio', consigli: '', frasi: [
				{ jp: 'すみません、もう一度お願いします。', yomi: 'すみません、もういちどおねがいします。', it: 'Scusi, può ripetere?', quando: 'La richiesta standard.' }
			] }
		];
		const rounds = buildRounds(situationsConQuando, [], 1, () => 0.5);
		const frase = rounds.find((r) => r.kind === 'frase');
		expect(frase && 'quando' in frase && frase.quando).toBe('La richiesta standard.');
	});
});
