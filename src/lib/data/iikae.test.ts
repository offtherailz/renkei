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
			expect(['N5', 'N4', 'N3']).toContain(item.livello);
			// la corretta (prima opzione) non è identica alla frase originale
			expect(item.opzioni[0]).not.toBe(item.frase);
		}
	});

	// I gruppi vivono nel campo dedicato `parafrasi` (17/07): equivalenti a
	// livello di frase, distinti dai sinonimi lessicali interscambiabili.
	it('le parole dei gruppi sono collegate come parafrasi bidirezionali nel seed', () => {
		// scrittura sempre prioritaria sulla lettura: due parole diverse possono
		// condividere una lettura (内/うち sono entrambe "うち") — se la lettura
		// di un omofono venisse inserita dopo, sovrascriverebbe la voce corretta
		// (quella la cui SCRITTURA è proprio quella lettura).
		const byForm = new Map<string, { scrittura: string; lettura?: string; parafrasi?: string[] }>();
		for (const w of seed.words as { scrittura: string; lettura?: string; parafrasi?: string[] }[]) {
			byForm.set(w.scrittura, w);
		}
		for (const w of seed.words as { scrittura: string; lettura?: string; parafrasi?: string[] }[]) {
			if (w.lettura && !byForm.has(w.lettura)) byForm.set(w.lettura, w);
		}
		for (const g of data.gruppi) {
			const words = g.parole.map((p: string) => byForm.get(p)).filter(Boolean);
			for (const w of words) {
				for (const other of words) {
					if (other === w) continue;
					expect(
						(w!.parafrasi ?? []).includes(other!.scrittura),
						`${w!.scrittura} non collega ${other!.scrittura}`
					).toBe(true);
				}
			}
		}
	});
});
