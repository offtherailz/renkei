import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildExamMix, buildMixQueue } from './listenExam';
import { instantiateListening, LISTENING_DIALOGUES } from './listeningDialogues';
import { hasDialogueTranslation } from './listeningDialoguesIt';
import { GRAMMAR_CURATED_ITEMS } from '../data/propedeutiche';
import type { ListenStep } from './listenOnly';

const seed = JSON.parse(readFileSync('static/seed-n5n4.json', 'utf8'));
const items = buildExamMix({ words: seed.words, grammar: seed.grammar, curated: GRAMMAR_CURATED_ITEMS, dialogues: LISTENING_DIALOGUES, levels: ['N4'], pause: 'media' });
const said = (s: ListenStep[], t: 'ja' | 'it') => s.flatMap((x) => (x.t === t ? [x.text] : []));

describe('buildExamMix sul catalogo vero', () => {
	it('ci sono tutte le categorie', () => {
		for (const c of ['ascolto', 'forme', 'grammatica', 'parole', 'frasi', 'trucchi', 'lettura']) expect(items.filter((i) => i.cat === c).length, c).toBeGreaterThan(0);
	});
	it('chiavi uniche, e ogni voce ha una pausa per ricordare seguita dalla risposta', () => {
		expect(new Set(items.map((i) => i.key)).size).toBe(items.length);
		for (const i of items) {
			for (const steps of [i.steps!, ...(i.altSteps ? [i.altSteps] : [])]) {
				const r = steps.findIndex((s) => s.t === 'recall');
				expect(r, i.key).toBeGreaterThanOrEqual(0);
				expect(steps.slice(r + 1).some((s) => s.t === 'ja' || s.t === 'it'), i.key).toBe(true);
			}
		}
	});
	it('la voce italiana non riceve mai giapponese né parentesi', () => {
		for (const i of items) for (const t of said(i.steps!, 'it')) {
			expect(t, i.key).not.toMatch(/[ぁ-んァ-ヶ一-龯()（）]/);
			expect(t.length, i.key).toBeGreaterThanOrEqual(2);
		}
	});
	it('la voce giapponese riceve sempre testo vero, senza simboli né A:/B:', () => {
		for (const i of items) for (const t of said(i.steps!, 'ja')) {
			expect(t, i.key).toMatch(/[ぁ-んァ-ヶ一-龯]/);
			expect(t, i.key).not.toMatch(/[＿★≒〔〕]|\b[AB][:：]/);
		}
	});
	it('niente cifre perse: 2時半 resta intero', () => {
		const t = JSON.stringify(items.flatMap((i) => said(i.steps!, 'ja')));
		expect(t).not.toMatch(/"時半/);
	});
	it('il buco è un bip, e la frase intera arriva solo dopo la pausa', () => {
		const cloze = items.filter((i) => i.steps!.some((s) => s.t === 'bip'));
		expect(cloze.length).toBeGreaterThan(20);
		for (const i of cloze) {
			const r = i.steps!.findIndex((s) => s.t === 'recall');
			expect(said(i.steps!.slice(0, r), 'ja').join(''), i.key).not.toContain(i.scritto);
			expect(said(i.steps!.slice(r), 'ja'), i.key).toContain(i.scritto);
		}
	});
	it('scelte: massimo tre, con la giusta e il suo numero', () => {
		for (const i of items) {
			const s = i.steps!.find((x) => x.t === 'scelte');
			if (s?.t !== 'scelte') continue;
			expect(s.options.length, i.key).toBeLessThanOrEqual(3);
			const n = s.options.indexOf(i.jp) + 1;
			expect(n, i.key).toBeGreaterThan(0);
			expect(said(i.steps!, 'ja').some((t) => t.startsWith(`${n}ばん`)), i.key).toBe(true);
		}
	});
});

describe('buildMixQueue', () => {
	const item = (key: string, cat: string, alt = false) => ({ key, cat, jp: key, it: key, scritto: key, steps: [{ t: 'wait', ms: 1 }], ...(alt ? { altSteps: [{ t: 'wait', ms: 2 }] } : {}) }) as never;
	const list = [...Array.from({ length: 25 }, (_, i) => item(`p${i}`, 'parole', true)), item('a0', 'ascolto'), item('a1', 'ascolto')];

	it('blocchi annunciati: solo la prima voce di ogni blocco ha l\'annuncio', () => {
		const q = buildMixQueue(list, new Set());
		expect(q[0]!.intro).toBe("Prove d'ascolto. 2 domande.");
		expect(q[1]!.intro).toBeUndefined();
		expect(q[2]!.intro).toBe("Parole. Dal giapponese all'italiano. 10 domande.");
		expect(q.slice(3, 12).every((i) => !i.intro && i.cat === 'parole')).toBe(true);
		expect(q.length).toBe(list.length);
	});
	it('la direzione resta fissa nel blocco e cambia al giro dopo', () => {
		const q = buildMixQueue(list, new Set()).filter((i) => i.cat === 'parole');
		expect(q.slice(0, 10).every((i) => (i.steps![0] as { ms: number }).ms === 1)).toBe(true);
		expect(q[10]!.intro).toBe("Parole. Dall'italiano al giapponese. 10 domande.");
		expect(q.slice(10, 20).every((i) => (i.steps![0] as { ms: number }).ms === 2)).toBe(true);
	});
	it('salta il già ascoltato; finito tutto, ricomincia', () => {
		expect(buildMixQueue(list, new Set(['a0'])).map((i) => i.key)).not.toContain('a0');
		expect(buildMixQueue(list, new Set(list.map((i) => (i as { key: string }).key))).length).toBe(list.length);
	});
});

describe('risposta completa', () => {
	it('dopo la pausa: giapponese, poi di nuovo giapponese piano', () => {
		for (const i of items) {
			const r = i.steps!.findIndex((s) => s.t === 'recall');
			const dopo = i.steps!.slice(r + 1);
			const last = dopo[dopo.length - 1];
			expect(last?.t, i.key).toBe('ja');
			expect(last?.t === 'ja' && last.rate, i.key).toBe(0.75);
		}
	});
	it('ogni voce ha la traduzione italiana dopo la pausa', () => {
		const senza = items.filter((i) => {
			const r = i.steps!.findIndex((s) => s.t === 'recall');
			return !i.steps!.slice(r + 1).some((s) => s.t === 'it');
		});
		expect(senza.map((i) => i.key)).toEqual([]);
	});
});

describe('traduzioni dei dialoghi', () => {
	it('coprono tutte le domande e le risposte possibili', () => {
		const manca = new Set<string>();
		for (let giro = 0; giro < 40; giro += 1) {
			for (const d of LISTENING_DIALOGUES) {
				for (const q of instantiateListening(d).questions) {
					if (!hasDialogueTranslation(q.q, q.choices[q.correct]!)) manca.add(`${q.q} => ${q.choices[q.correct]}`);
				}
			}
		}
		expect([...manca]).toEqual([]);
	});
});

