import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { KEIGO_VERBS, KEIGO_ITEMS } from './keigo';

const seed = JSON.parse(readFileSync(resolve(__dirname, '../../../static/seed-n5n4.json'), 'utf8'));
const inSeed = (p: string): boolean =>
	seed.words.some((w: { scrittura: string; lettura?: string }) => w.scrittura === p || w.lettura === p);

describe('keigo', () => {
	it('ogni verbo ha almeno una forma keigo e le parole citate sono nel seed', () => {
		for (const v of KEIGO_VERBS) {
			expect(Boolean(v.sonkeigo || v.kenjougo), v.plain).toBe(true);
			for (const f of [v.sonkeigo, v.kenjougo]) {
				if (f?.parola) expect(inSeed(f.parola), `${f.parola} non è nel seed`).toBe(true);
			}
		}
	});

	it('gli item hanno 4 opzioni uniche e la parola nel seed', () => {
		for (const it of KEIGO_ITEMS) {
			expect(it.opzioni.length, it.situazione).toBe(4);
			expect(new Set(it.opzioni).size, it.situazione).toBe(4);
			if (it.parola) expect(inSeed(it.parola), `${it.parola} non è nel seed`).toBe(true);
			// la corretta (prima opzione) contiene la forma keigo della parola citata
			expect(it.opzioni[0]!.length, it.situazione).toBeGreaterThan(4);
		}
	});
});
