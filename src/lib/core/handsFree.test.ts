import { describe, it, expect } from 'vitest';
import { classifyUtterance, judgeAnswer, judgeMeaning, buildFormRounds, withLookRounds, buildRounds, buildWordRounds, type GuardaRound, type HFRound, type WeakWord } from './handsFree';
import type { Word } from '../types/models';
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

describe('handsFree.buildWordRounds', () => {
	const words: WeakWord[] = [
		{ it: 'lavatrice', jp: '洗濯機', yomi: 'せんたくき', creditKey: 'word:w1' },
		{ it: 'frigorifero', jp: '冷蔵庫', yomi: 'れいぞうこ', creditKey: 'word:w2' }
	];

	it('crea round frase col significato it come prompt e varianti per il match', () => {
		const rounds = buildWordRounds(words, 5, () => 0.5);
		expect(rounds).toHaveLength(2);
		const r = rounds.find((x) => x.jp === '洗濯機')!;
		expect(r.cueIt).toBe('lavatrice');
		expect(r.varianti).toContain('洗濯機');
		expect(r.varianti).toContain('せんたくき');
	});

	it('porta la chiave SRS della parola per il credito', () => {
		const rounds = buildWordRounds(words, 5, () => 0.5);
		expect(rounds.every((r) => r.creditKey?.startsWith('word:'))).toBe(true);
	});

	it('rispetta il limite n', () => {
		expect(buildWordRounds(words, 1, () => 0.5)).toHaveLength(1);
	});
});

describe('handsFree.buildFormRounds', () => {
	const verb = (scrittura: string, lettura: string, classe: string) =>
		({ id: scrittura, scrittura, lettura, tipo_jp: '動詞[どうし]', classe_verbo_jp: classe, significato: { it: ['x'], en: ['x'] }, livello_jlpt: 'N5' }) as unknown as Word;

	it('la risposta è in kana per la voce, e vale anche scritta in kanji', () => {
		// rng 0: primo verbo e prima forma (te)
		const [r] = buildFormRounds([verb('食べる', 'たべる', '一段')], 1, () => 0);
		expect(r!.forma).toEqual({ label: 'Forma te', yomi: 'たべる' });
		expect(r!.jp).toBe('たべて');
		expect(r!.varianti).toContain('食べて');
		expect(r!.creditKey).toBe('conj:ichidan');
	});

	it('来る: lettura giusta per ogni forma', () => {
		const [r] = buildFormRounds([verb('来る', 'くる', '不規則')], 1, () => 0.4); // 0.4 → potenziale
		expect(r!.jp).toBe('こられる');
		expect(r!.varianti).toContain('来られる');
	});

	it('niente verbi che non seguono la regola, né letture vuote', () => {
		const rounds = buildFormRounds([verb('分かる', 'わかる', '五段'), verb('ある', 'ある', '五段'), verb('かまう', '', '五段')], 5, () => 0.5);
		expect(rounds).toEqual([]);
	});

	it('forme innaturali escluse: intransitivi non voluti, nomi con する, ない', () => {
		const forme = (w: Word) => new Set(Array.from({ length: 40 }, (_, i) => buildFormRounds([w], 1, () => i / 40)[0]?.forma?.label));
		expect(forme(verb('割れる', 'われる', '一段'))).toEqual(new Set(['Forma te', 'Passato piano', 'Negativo piano', 'Condizionale in ba']));
		expect(forme(verb('卒業する', 'そつぎょうする', '不規則'))).toEqual(new Set(['Forma te', 'Passato piano', 'Negativo piano', 'Condizionale in ba', 'Potenziale']));
		expect(forme({ ...verb('割る', 'わる', '五段'), transitivita_jp: '他動詞[たどうし]' } as Word).has('Passiva')).toBe(true);
		expect(buildFormRounds([{ ...verb('ない', 'ない', ''), tipo_jp: '形容詞[けいようし]' } as Word], 1)).toEqual([]);
	});

	it('una lettura doppia usa la prima', () => {
		const [r] = buildFormRounds([verb('行く', 'いく; ゆく', '五段')], 1, () => 0);
		expect(r!.jp).toBe('いって');
	});
});

describe('handsFree.judgeMeaning', () => {
	it('vale un significato qualsiasi, con o senza articolo', () => {
		expect(judgeMeaning(['il gatto'], ['gatto, micio'])).toBe(true);
		expect(judgeMeaning(['Micio'], ['gatto, micio'])).toBe(true);
		expect(judgeMeaning(['gatto'], ['il gatto'])).toBe(true);
	});
	it('ignora le parentesi e accetta senza essere/fare', () => {
		expect(judgeMeaning(['grande'], ['grande (di dimensioni)'])).toBe(true);
		expect(judgeMeaning(['bravo'], ['essere bravo'])).toBe(true);
	});
	it('parole intere: un pezzo non basta', () => {
		expect(judgeMeaning(['gattopardo'], ['gatto'])).toBe(false);
		expect(judgeMeaning(['cane'], ['gatto'])).toBe(false);
		expect(judgeMeaning([], ['gatto'])).toBe(false);
	});
});

describe('handsFree.withLookRounds', () => {
	const w = (jp: string, yomi: string): WeakWord => ({ it: 'significato', jp, yomi, creditKey: `word:${jp}` });
	const base = buildWordRounds([w('学校', 'がっこう'), w('学生', 'がくせい'), w('先生', 'せんせい'), w('ねこ', 'ねこ'), w('いぬ', 'いぬ'), w('水', 'みず')], 6, () => 0.999999);

	it('un round su tre resta a voce, gli altri chiedono lettura e significato', () => {
		const out = withLookRounds(base);
		expect(out.map((r) => (r.kind === 'guarda' ? r.ask : r.kind))).toEqual(['frase', 'lettura', 'significato', 'frase', 'significato', 'significato']);
	});

	it('la lettura accetta anche la parola scritta in kanji dal riconoscitore', () => {
		const g = withLookRounds(base)[1] as GuardaRound;
		expect(g.corretta).toBe(g.lettura);
		expect(g.varianti).toContain(g.parola);
	});

	it('forme e frasi senza parola restano uguali', () => {
		const forma: HFRound = { kind: 'frase', cueIt: 'x', jp: 'y', varianti: ['y'], quando: 'z', creditKey: 'conj:godan', forma: { label: 'x', yomi: 'z' } };
		const frase: HFRound = { kind: 'frase', cueIt: 'x', jp: 'y', varianti: ['y'] };
		expect(withLookRounds([frase, forma, frase])).toEqual([frase, forma, frase]);
	});
});
