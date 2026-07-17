// Guardie di qualità sui dati curati (word/grammar-overrides e seed):
// ogni nuova ondata di frasi/traduzioni deve passare da qui.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

type Example = { testo: string; traduzione?: { it?: string; en?: string } };
type WordPatch = { frasi_esempio?: Example[]; significato?: { it?: string[]; en?: string[] } };

const wordOverrides = JSON.parse(readFileSync('scripts/data/word-overrides.json', 'utf8')) as Record<string, WordPatch>;
const grammarOverrides = JSON.parse(readFileSync('scripts/data/grammar-overrides.json', 'utf8')) as Record<
	string,
	{ struttura?: string; frasi_esempio?: Example[] }
>;
const seed = JSON.parse(readFileSync('static/seed-n5n4.json', 'utf8')) as {
	words: { id: string; scrittura: string; lettura: string; significato: { it: string[]; en: string[] }; frasi_esempio?: Example[] }[];
};
const wordsById = new Map(seed.words.map((w) => [w.id, w]));

// La parola può comparire coniugata: accetta scrittura/lettura intere o lo
// stem (senza l'ultimo kana per verbi/aggettivi, senza する per i suru-verbi).
// Gli id multi-forma ("いい; よい", "回る、回す") valgono per ciascuna forma.
function stemVariants(scrittura: string, lettura: string): string[] {
	const bases = [scrittura, lettura]
		.filter(Boolean)
		.flatMap((s) => s.split(/[;、]/))
		// 〜 è un segnaposto (〜さんによろしく…): nelle frasi è sostituito da un
		// nome vero, quindi si confronta la parte dopo il 〜
		.map((s) => s.trim().replace(/^〜/, ''))
		.filter(Boolean);
	const out = new Set(bases);
	for (const base of bases) {
		if (base.length >= 2 && 'るうくぐすつぬぶむい'.includes(base[base.length - 1]!)) out.add(base.slice(0, -1));
		if (base.endsWith('する')) out.add(base.slice(0, -2));
	}
	return [...out].filter(Boolean);
}

describe('word-overrides: frasi d\'esempio', () => {
	const entries = Object.entries(wordOverrides).filter(([, p]) => p.frasi_esempio?.length);

	it('ogni frase è ben formata (punteggiatura, lunghezza, niente caratteri latini)', () => {
		for (const [id, p] of entries) {
			for (const ex of p.frasi_esempio!) {
				expect(ex.testo, id).toMatch(/[。！？!?]$/);
				expect(ex.testo.length, `${id}: ${ex.testo}`).toBeGreaterThanOrEqual(5);
				expect(ex.testo.length, `${id}: ${ex.testo}`).toBeLessThanOrEqual(34);
				// il latino è vietato SALVO quando è la parola stessa a contenerlo (Wi-Fiルーター)
				if (!/[A-Za-z]/.test(id)) {
					expect(ex.testo, `${id}: caratteri latini`).not.toMatch(/[A-Za-z]/);
				}
				expect(ex.testo, `${id}: particella doppia`).not.toMatch(/をを|がが|はは|にに|でで/);
			}
		}
	});

	it('ogni frase ha traduzioni it/en non vuote e distinte dal giapponese', () => {
		for (const [id, p] of entries) {
			for (const ex of p.frasi_esempio!) {
				expect(ex.traduzione?.it?.trim(), `${id}: it`).toBeTruthy();
				expect(ex.traduzione?.en?.trim(), `${id}: en`).toBeTruthy();
				expect(ex.traduzione!.it, `${id}: it = testo?`).not.toBe(ex.testo);
			}
		}
	});

	it('la frase contiene la parola della carta (anche coniugata)', () => {
		for (const [id, p] of entries) {
			const w = wordsById.get(id);
			expect(w, `${id}: parola non nel seed`).toBeDefined();
			const variants = stemVariants(w!.scrittura, w!.lettura);
			for (const ex of p.frasi_esempio!) {
				expect(
					variants.some((v) => ex.testo.includes(v)),
					`${id}: «${ex.testo}» non contiene ${w!.scrittura}/${w!.lettura}`
				).toBe(true);
			}
		}
	});

	it('le glosse tradotte sono non vuote', () => {
		for (const [id, p] of Object.entries(wordOverrides)) {
			if (!p.significato) continue;
			expect(p.significato.it?.length, `${id}: significato.it`).toBeGreaterThan(0);
			for (const g of p.significato.it!) expect(g.trim(), `${id}: glossa vuota`).toBeTruthy();
		}
	});
});

describe('grammar-overrides', () => {
	it('strutture e frasi ben formate', () => {
		for (const [id, p] of Object.entries(grammarOverrides)) {
			if (p.struttura !== undefined) expect(p.struttura.trim(), id).toBeTruthy();
			for (const ex of p.frasi_esempio ?? []) {
				expect(ex.testo, id).toMatch(/[。！？!?]$/);
				expect(ex.traduzione?.it?.trim(), `${id}: it`).toBeTruthy();
			}
		}
	});
});

describe('seed: invarianti globali', () => {
	it('ogni parola ha glosse it non vuote', () => {
		for (const w of seed.words) {
			expect(w.significato.it?.length, w.id).toBeGreaterThan(0);
			expect(w.significato.it[0]!.trim(), w.id).toBeTruthy();
		}
	});

	it('ogni frase d\'esempio del seed ha testo e traduzione', () => {
		for (const w of seed.words) {
			for (const ex of w.frasi_esempio ?? []) {
				expect(ex.testo?.trim(), w.id).toBeTruthy();
				expect(ex.traduzione?.it ?? ex.traduzione?.en, w.id).toBeTruthy();
			}
		}
	});
});
