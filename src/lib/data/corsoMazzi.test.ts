// Controlla il file dei mazzi delle lezioni (non tipizzato: è JSON da importare).
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { cardCatalogKeys } from './mazzi';

// In chiaro solo in locale (nel repo c'è la versione cifrata): senza, il controllo si salta.
const PATH = 'corsi/mazzi-lezioni.renkei-course.json';
const corso = existsSync(PATH) ? JSON.parse(readFileSync(PATH, 'utf8')) : { versione: '1.0', corso: { id: 'vuoto' }, mazzi: [] };
const seed = JSON.parse(readFileSync('static/seed-n5n4.json', 'utf8')) as { words: { scrittura: string; lettura: string }[] };
const FURIGANA = /[^\s\[\]]+\[[^\]]*\]/g;

describe('corsi/mazzi-lezioni.renkei-course.json', () => {
	it('formato valido per l\'import', () => {
		expect(corso.versione).toBe('1.0');
		expect(corso.corso.id).toBeTruthy();
		const ids = corso.mazzi.map((m: { id: string }) => m.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const m of corso.mazzi) {
			expect(m.titolo && m.emoji && m.descrizione, m.id).toBeTruthy();
			for (const c of m.carte) expect(c.jp && c.yomi && c.it, `${m.id} ${c.jp}`).toBeTruthy();
		}
	});

	it('esercizi: un buco, opzioni distinte, spiegazione e traduzione', () => {
		for (const m of corso.mazzi) {
			for (const e of m.esercizi ?? []) {
				expect(e.prompt.match(/＿＿/g)?.length, e.prompt).toBe(1);
				expect(new Set(e.choices).size, e.prompt).toBe(e.choices.length);
				expect(e.spiega && e.traduzione, e.prompt).toBeTruthy();
			}
		}
	});

	it('furigana ben formato: niente parentesi aperte', () => {
		for (const m of corso.mazzi) {
			const testi = [...m.carte.map((c: { es?: string }) => c.es ?? ''), ...(m.esercizi ?? []).map((e: { prompt: string }) => e.prompt), ...(m.produzione ?? []).map((p: { risposta: string }) => p.risposta)];
			for (const t of testi) expect(t.replace(FURIGANA, ''), `${m.id}: ${t}`).not.toMatch(/[[\]]/);
		}
	});

	it('quasi tutte le carte hanno la parola a catalogo (serve al mini-test)', () => {
		const W = new Set(seed.words.map((w) => w.scrittura));
		const Y = new Set(seed.words.map((w) => w.lettura));
		for (const m of corso.mazzi) {
			const senza = m.carte.filter((c: { jp: string; yomi: string }) => {
				const k = cardCatalogKeys(c as never);
				return !k.writings.some((x) => W.has(x)) && !k.readings.some((x) => Y.has(x));
			});
			expect(senza.length / m.carte.length, `${m.id}: ${senza.map((c: { jp: string }) => c.jp).join(', ')}`).toBeLessThan(0.25); // le espressioni (調子がいい…) restano solo flashcard
		}
	});
});
