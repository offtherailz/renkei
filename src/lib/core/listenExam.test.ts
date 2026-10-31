import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildExamMix, buildMixQueue, mixedSteps } from './listenExam';
import { LISTENING_DIALOGUES } from './listeningDialogues';
import { GRAMMAR_CURATED_ITEMS } from '../data/propedeutiche';

const seed = JSON.parse(readFileSync('static/seed-n5n4.json', 'utf8'));
const mix = () => buildExamMix({ words: seed.words, grammar: seed.grammar, curated: GRAMMAR_CURATED_ITEMS, dialogues: LISTENING_DIALOGUES, levels: ['N4'], pause: 'media' });

describe('mixedSteps', () => {
	it('ogni pezzo alla sua voce, senza simboli né furigana', () => {
		expect(mixedSteps('〜てから = «da quando»: 来[き]てから三年.')).toEqual([
			{ t: 'ja', text: 'てから' },
			{ t: 'it', text: 'da quando' },
			{ t: 'ja', text: '来てから三年' }
		]);
	});
	it('niente emoji né punteggiatura ai bordi', () => {
		expect(mixedSteps('🎭 Cambiano idea: conta l’ultima.')).toEqual([{ t: 'it', text: 'Cambiano idea: conta l’ultima.' }]);
	});
	it('il solo italiano resta un pezzo unico', () => {
		expect(mixedSteps('Solo italiano, qui.')).toEqual([{ t: 'it', text: 'Solo italiano, qui.' }]);
	});
});

describe('buildExamMix sul catalogo vero', () => {
	const items = mix();
	const cats = (c: string) => items.filter((i) => i.cat === c);

	it('ci sono tutte le categorie', () => {
		for (const c of ['ascolto', 'forme', 'grammatica', 'parole', 'frasi', 'trucchi', 'lettura']) expect(cats(c).length, c).toBeGreaterThan(0);
	});
	it('chiavi uniche e ogni voce ha passi', () => {
		expect(new Set(items.map((i) => i.key)).size).toBe(items.length);
		for (const i of items) expect(i.steps?.length, i.key).toBeGreaterThan(0);
	});
	it('nessun buco o segnaposto letto ad alta voce, né testi vuoti', () => {
		for (const i of items) {
			for (const s of i.steps!) {
				if (s.t === 'ja' || s.t === 'it') {
					expect(s.text.trim().length, i.key).toBeGreaterThan(0);
					expect(s.text, i.key).not.toMatch(/＿|\[|★/);
				}
			}
		}
	});
	it('chi ha una pausa per ricordare dice la risposta dopo, non prima', () => {
		for (const i of items.filter((x) => x.cat === 'grammatica' && x.steps!.some((s) => s.t === 'recall'))) {
			const r = i.steps!.findIndex((s) => s.t === 'recall');
			const prima = i.steps!.slice(0, r).filter((s) => s.t === 'ja').map((s) => (s as { text: string }).text).join('');
			if (i.key.startsWith('esame:bp') || i.key.startsWith('esame:bn')) expect(prima.includes(i.scritto), i.key).toBe(false);
		}
	});
	it('sokuji: tre opzioni con la giusta, numero giusto nella risposta', () => {
		for (const i of items.filter((x) => x.steps!.some((s) => s.t === 'scelte'))) {
			const s = i.steps!.find((x) => x.t === 'scelte') as { options: string[] };
			expect(s.options.length, i.key).toBeLessThanOrEqual(3);
			const n = s.options.indexOf(i.jp) + 1;
			expect(n, i.key).toBeGreaterThan(0);
			expect(i.steps!.some((x) => x.t === 'ja' && x.text.startsWith(`${n}ばん`)), i.key).toBe(true);
		}
	});
});

describe('buildMixQueue', () => {
	const item = (key: string, cat: string) => ({ key, cat, jp: key, it: key, scritto: key, steps: [] });
	const items = [...Array.from({ length: 6 }, (_, i) => item(`p${i}`, 'parole')), item('a0', 'ascolto'), item('a1', 'ascolto'), item('a2', 'ascolto')];

	it('alterna le categorie secondo i turni', () => {
		const q = buildMixQueue(items, new Set());
		expect(q.slice(0, 5).map((i) => i.cat)).toEqual(['ascolto', 'ascolto', 'parole', 'parole', 'parole']);
		expect(q.length).toBe(items.length);
	});
	it('salta il già ascoltato; finito tutto, ricomincia', () => {
		expect(buildMixQueue(items, new Set(['a0', 'a1'])).map((i) => i.key)).toContain('a2');
		expect(buildMixQueue(items, new Set(['a0', 'a1'])).map((i) => i.key)).not.toContain('a0');
		expect(buildMixQueue(items, new Set(items.map((i) => i.key))).length).toBe(items.length);
	});
});
