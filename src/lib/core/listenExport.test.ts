// Genera i contenuti dell'app Android: stesse voci di Solo ascolto, con le prove
// d'ascolto già espanse in battute. Si lancia a mano o in CI:
// EXPORT_ASCOLTO=1 npx vitest run src/lib/core/listenExport.test.ts
import { describe, expect, it } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { buildExamMix } from './listenExam';
import { examChoicesSegments, examListeningSegments, type ExamSegment } from './examListening';
import { stripFuriganaNotation } from './furigana';
import { LISTENING_DIALOGUES } from './listeningDialogues';
import { GRAMMAR_CURATED_ITEMS } from '../data/propedeutiche';
import type { ListenItem, ListenStep } from './listenOnly';

type OutStep = { t: string; x?: string; ms?: number; r?: number; v?: string };

function fromSegments(segs: ExamSegment[]): OutStep[] {
	return segs.flatMap((s): OutStep[] => {
		if (s.chime) return [{ t: 'c' }];
		if (s.pause) return [{ t: 'w', ms: s.pause }];
		return s.text ? [{ t: 'j', x: stripFuriganaNotation(s.text), r: s.options?.rate ?? 1, v: s.who }] : [];
	});
}

export function toOutSteps(steps: ListenStep[]): OutStep[] {
	return steps.flatMap((s): OutStep[] => {
		switch (s.t) {
			case 'ja':
				return [{ t: 'j', x: s.text, r: s.rate ?? 1, v: s.voice ?? '' }];
			case 'it':
				return [{ t: 'i', x: s.text }];
			case 'wait':
				return [{ t: 'w', ms: s.ms }];
			case 'recall':
				return [{ t: 'r', ms: s.ms }];
			case 'bip':
				return [{ t: 'b' }];
			case 'esame':
				return fromSegments(examListeningSegments(s.prompt));
			case 'scelte':
				return fromSegments(examChoicesSegments(s.prompt, s.options, 'sokuji'));
		}
	});
}

const levelOf = (i: ListenItem, level: string) => (i.key.startsWith('esame:') || i.key.startsWith('trucco:') ? '*' : level);

describe('export per l\'app Android', () => {
	it.skipIf(!process.env.EXPORT_ASCOLTO)('scrive items.json', () => {
		const seed = JSON.parse(readFileSync('static/seed-n5n4.json', 'utf8'));
		const build = (level: string) => buildExamMix({ words: seed.words, grammar: seed.grammar, curated: GRAMMAR_CURATED_ITEMS, dialogues: LISTENING_DIALOGUES, levels: [level], pause: 'media' });
		const out = new Map<string, object>();
		for (const level of ['N4', 'N5']) {
			for (const i of build(level)) {
				if (out.has(i.key)) continue;
				out.set(i.key, { k: i.key, c: i.cat, l: levelOf(i, level), j: i.jp, i: i.it, w: i.scritto, s: toOutSteps(i.steps!), ...(i.altSteps ? { a: toOutSteps(i.altSteps) } : {}) });
			}
		}
		const dir = 'android-ascolto/app/src/main/assets';
		mkdirSync(dir, { recursive: true });
		writeFileSync(`${dir}/items.json`, JSON.stringify([...out.values()]));
		expect(out.size).toBeGreaterThan(3000);
	});

	it('le prove d\'ascolto diventano battute giapponesi con chi parla', () => {
		const out = toOutSteps([{ t: 'esame', prompt: '〔会話〕女:「行きますか。」 男:「はい。」 問: どこへ 行きますか。' }]);
		expect(out[0]).toEqual({ t: 'c' });
		const parole = out.filter((s) => s.t === 'j');
		expect(parole.some((s) => s.v === 'F' && s.x === '行きますか。')).toBe(true);
		expect(parole.some((s) => s.v === 'M' && s.x === 'はい。')).toBe(true);
		expect(parole.some((s) => s.v === 'N' && s.x === 'どこへ 行きますか。')).toBe(true);
	});
});
