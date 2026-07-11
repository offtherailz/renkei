import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const data = JSON.parse(readFileSync(resolve(__dirname, '../../../scripts/data/iikae-n5n4.json'), 'utf8'));
const seed = JSON.parse(readFileSync(resolve(__dirname, '../../../static/seed-n5n4.json'), 'utf8'));

const inSeed = (p: string): boolean =>
	seed.words.some((w: { scrittura: string; lettura?: string }) => w.scrittura === p || w.lettura === p);

describe('dataset 言い換え', () => {
	it('i gruppi hanno almeno 2 parole, tutte presenti nel seed', () => {
		for (const g of data.gruppi) {
			expect(g.parole.length, g.parole.join('＝')).toBeGreaterThanOrEqual(2);
			for (const p of g.parole) expect(inSeed(p), `${p} non è nel seed`).toBe(true);
		}
	});

	it('gli item hanno 4 opzioni uniche e la marcata compare nella frase', () => {
		for (const item of data.items) {
			expect(item.opzioni.length, item.frase).toBe(4);
			expect(new Set(item.opzioni).size, item.frase).toBe(4);
			expect(item.frase.includes(item.marcata), `${item.marcata} ∉ ${item.frase}`).toBe(true);
			expect(['N5', 'N4']).toContain(item.livello);
			// la corretta (prima opzione) non è identica alla frase originale
			expect(item.opzioni[0]).not.toBe(item.frase);
		}
	});

	it('i sinonimi dei gruppi sono collegati bidirezionalmente nel seed', () => {
		const byForm = new Map(
			seed.words.flatMap((w: { scrittura: string; lettura?: string; sinonimi?: string[] }) => {
				const entries: [string, typeof w][] = [[w.scrittura, w]];
				if (w.lettura) entries.push([w.lettura, w]);
				return entries;
			})
		);
		for (const g of data.gruppi) {
			const words = g.parole.map((p: string) => byForm.get(p)).filter(Boolean);
			for (const w of words) {
				for (const other of words) {
					if (other === w) continue;
					expect(
						(w!.sinonimi ?? []).includes(other!.scrittura),
						`${w!.scrittura} non collega ${other!.scrittura}`
					).toBe(true);
				}
			}
		}
	});
});
