import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// static/segmenti-n5n4.json è generato da scripts/segmenta-frasi.mjs
const file = JSON.parse(readFileSync('static/segmenti-n5n4.json', 'utf8')) as {
	etichette: Record<string, string>;
	frasi: Record<string, [string, Record<string, string[]>?]>;
};
const compatta = (s: string) => s.replace(/[\s　|·]+/g, '');

describe('segmenti-n5n4.json', () => {
	it('ogni segmentazione ricompone esattamente la sua frase', () => {
		for (const [frase, [seg]] of Object.entries(file.frasi)) {
			expect(compatta(seg)).toBe(compatta(frase));
		}
	});

	it('nessun pezzo vuoto e forme solo con codici noti, su pezzi esistenti', () => {
		for (const [seg, forme] of Object.values(file.frasi)) {
			const pezzi = seg.split('|');
			expect(pezzi.every((p) => p.replace(/·/g, '').length > 0)).toBe(true);
			for (const [i, codici] of Object.entries(forme ?? {})) {
				expect(Number(i)).toBeLessThan(pezzi.length);
				for (const c of codici) expect(file.etichette[c]).toBeTruthy();
			}
		}
	});

	it('le parole in kana non si spezzano (casi che BudouX e kuromoji sbagliavano)', () => {
		const perCompatta = new Map(Object.entries(file.frasi).map(([f, v]) => [compatta(f), v[0]]));
		const pezzi = (f: string) => perCompatta.get(compatta(f))!.replace(/·/g, '').split('|');
		expect(pezzi('えきの まえに ぎんこうが あります。')).toEqual(['えきの', 'まえに', 'ぎんこうが', 'あります。']);
		expect(pezzi('てがみは三かで着きます。')[0]).toBe('てがみは');
	});
});
