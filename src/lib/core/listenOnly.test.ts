import { describe, expect, it } from 'vitest';
import { buildQueue, buildSentenceItems, buildWordItems, recallMs, type ListenItem } from './listenOnly';
import type { Grammar, Word } from '../types/models';

const ex = (testo: string, it = 'trad') => ({ testo, traduzione: { it, en: 'x' } });
const word = (id: string, livello: string, frasi: unknown[] = [], extra: object = {}) =>
	({ id, scrittura: id, lettura: id, livello_jlpt: livello, significato: { it: ['a', 'b', 'c', 'd'], en: [] }, frasi_esempio: frasi, ...extra }) as unknown as Word;
const gram = (id: string, livello: string, frasi: unknown[] = []) => ({ id, livello_jlpt: livello, frasi_esempio: frasi }) as unknown as Grammar;

describe('buildSentenceItems', () => {
	it('solo i livelli scelti, senza furigana e senza doppioni', () => {
		const out = buildSentenceItems(
			[word('a', 'N5', [ex('猫[ねこ]がいます。')]), word('b', 'N5', [ex('猫がいます。')]), word('c', 'N3', [ex('難しい話です。')])],
			[gram('g', 'N4', [ex('行きたいです。')])],
			[],
			['N5', 'N4']
		);
		expect(out.map((i) => i.jp)).toEqual(['猫がいます。', '行きたいです。']);
	});
	it('niente frasi senza traduzione o con segnaposto', () => {
		const out = buildSentenceItems([word('a', 'N5', [ex('〜があります。'), { testo: '本です。' }])], [], [], ['N5']);
		expect(out).toEqual([]);
	});
	it('gli item curati entrano con il buco riempito, per livello del punto', () => {
		const curated = [{ grammatica: 'g', frase_con_buco: '駅に ＿＿ ください。', corretta: '来て', traduzione_it: 'Vieni' }, { grammatica: 'x', frase_con_buco: 'A＿＿', corretta: 'B', traduzione_it: 'C' }];
		const out = buildSentenceItems([], [gram('g', 'N4')], curated, ['N4']);
		expect(out.map((i) => i.jp)).toEqual(['駅に 来て ください。']);
	});
});

describe('buildWordItems', () => {
	it('la voce dice la prima lettura, massimo tre significati', () => {
		const [i] = buildWordItems([word('行く', 'N5', [], { lettura: 'いく; ゆく' })], ['N5']);
		expect(i).toMatchObject({ jp: 'いく', scritto: '行く', it: 'a, b, c' });
	});
	it('niente livelli esclusi né voci con segnaposto', () => {
		expect(buildWordItems([word('〜費', 'N5'), word('x', 'N3')], ['N5'])).toEqual([]);
	});
});

describe('buildQueue', () => {
	const items = ['a', 'b', 'c'].map((key) => ({ key, jp: key, it: key, scritto: key }));
	it('salta ciò che è già ascoltato', () => {
		expect(buildQueue(items, new Set(['a', 'c'])).map((i) => i.key)).toEqual(['b']);
	});
	it('finito tutto, ricomincia da tutti', () => {
		expect(buildQueue(items, new Set(['a', 'b', 'c'])).length).toBe(3);
	});
});

describe('recallMs', () => {
	const item = (n: number): ListenItem => ({ key: 'k', jp: 'あ'.repeat(n), it: 'x', scritto: 'x' });
	it('produrre chiede più tempo che capire, e le frasi lunghe di più', () => {
		expect(recallMs(item(10), 'it-jp', 'media')).toBeGreaterThan(recallMs(item(10), 'jp-it', 'media'));
		expect(recallMs(item(30), 'jp-it', 'media')).toBeGreaterThan(recallMs(item(5), 'jp-it', 'media'));
		expect(recallMs(item(10), 'jp-it', 'lunga')).toBeGreaterThan(recallMs(item(10), 'jp-it', 'breve'));
	});
	it('ha un tetto', () => {
		expect(recallMs(item(500), 'it-jp', 'lunga')).toBe(16000);
	});
});
