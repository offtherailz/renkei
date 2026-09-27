import { describe, it, expect } from 'vitest';
import { buildMock, buildSet, countByMondai, mondaiPool, passaTier } from './esame-n4-prova';
import { EXAM_N4_SECTIONS, EXAM_SETS, CURATED_ITEMS, findMondai } from './esame-n4';

describe('prova simulata N4', () => {
	it('assembla sezioni con domande curate valide', () => {
		const mock = buildMock({ shuffle: false });
		expect(mock.sezioni.length).toBeGreaterThan(0);
		let count = 0;
		for (const s of mock.sezioni) {
			expect(s.questions.length).toBeGreaterThan(0);
			for (const q of s.questions) {
				count += 1;
				expect(q.correct).toBeGreaterThanOrEqual(0);
				expect(q.correct).toBeLessThan(q.choices.length);
				expect(q.prompt.trim()).not.toBe('');
				expect(q.tempoSec).toBeGreaterThan(0);
				expect(q.mondaiTitolo.trim()).not.toBe('');
			}
		}
		expect(mock.totale).toBe(count);
	});

	it('non supera il conteggio del blueprint per ogni 問題', () => {
		const mock = buildMock({ shuffle: false });
		const perSlug = new Map<string, number>();
		for (const s of mock.sezioni)
			for (const q of s.questions) perSlug.set(q.mondaiSlug, (perSlug.get(q.mondaiSlug) ?? 0) + 1);
		for (const [slug, n] of perSlug) {
			const cap = findMondai(slug)?.mondai.count ?? 0;
			expect(n).toBeLessThanOrEqual(cap);
		}
	});

	it('dichiara i tipi scoperti in mondaiMancanti (non li riempie)', () => {
		const mock = buildMock({ shuffle: false });
		const presenti = new Set(mock.sezioni.flatMap((s) => s.questions.map((q) => q.mondaiSlug)));
		const mancanti = new Set(mock.mondaiMancanti.map((m) => m.slug));
		// ogni 問題 del blueprint è o presente o dichiarato mancante, mai entrambi
		for (const sec of EXAM_N4_SECTIONS) {
			for (const m of sec.mondai) {
				const inA = presenti.has(m.slug);
				const inB = mancanti.has(m.slug);
				expect(inA || inB, `${m.slug} né presente né mancante`).toBe(true);
				expect(inA && inB, `${m.slug} in entrambi`).toBe(false);
			}
		}
		// con la Fase 3 tutti i 15 問題 hanno contenuto curato: nessun mancante
		expect(mancanti.size).toBe(0);
		expect(presenti.size).toBe(15);
	});

	it('countByMondai combacia col pool del singolo 問題', () => {
		const counts = countByMondai();
		for (const [slug, n] of Object.entries(counts)) {
			expect(n).toBeGreaterThan(0);
			expect(mondaiPool(slug, { shuffle: false }).length).toBe(n);
		}
		// 問題 con contenuto curato: 文脈規定 (trucchi) e 漢字読み (item curati Fase 3)
		expect(counts['bunmyaku']).toBeGreaterThan(0);
		expect(counts['kanji-yomi']).toBeGreaterThan(0);
		expect(mondaiPool('kanji-yomi').length).toBe(counts['kanji-yomi']);
	});

	it('mondaiPool restituisce domande complete e valide', () => {
		const qs = mondaiPool('bunpo1', { shuffle: false });
		expect(qs.length).toBeGreaterThan(0);
		for (const q of qs) {
			expect(q.mondaiSlug).toBe('bunpo1');
			expect(q.tempoSec).toBeGreaterThan(0);
			expect(q.correct).toBeLessThan(q.choices.length);
		}
	});

	it('ogni Set d’autore referenzia solo item curati esistenti', () => {
		const ids = new Set(CURATED_ITEMS.map((it) => it.id));
		for (const set of EXAM_SETS) {
			expect(set.itemIds.length).toBeGreaterThan(0);
			for (const id of set.itemIds) expect(ids.has(id), `id sconosciuto: ${id}`).toBe(true);
		}
	});

	it('buildSet costruisce una prova ordinata e completa', () => {
		const mock = buildSet('set-1');
		expect(mock).not.toBeNull();
		const ids = mock!.sezioni.map((s) => s.id);
		expect(ids).toEqual(EXAM_N4_SECTIONS.map((s) => s.id).filter((id) => ids.includes(id)));
		const totale = mock!.sezioni.reduce((n, s) => n + s.questions.length, 0);
		expect(mock!.totale).toBe(totale);
		expect(totale).toBe(EXAM_SETS.find((s) => s.id === 'set-1')!.itemIds.length);
		expect(buildSet('inesistente')).toBeNull();
	});

	it('passaTier: facile esclude i difficili, esame esclude i facili', () => {
		expect(passaTier(undefined, 'facile')).toBe(true);
		expect(passaTier(undefined, 'esame')).toBe(true);
		expect(passaTier('difficile', 'facile')).toBe(false);
		expect(passaTier('difficile', 'esame')).toBe(true);
		expect(passaTier('facile', 'esame')).toBe(false);
		expect(passaTier('facile', 'facile')).toBe(true);
		expect(passaTier('facile', 'medio')).toBe(true);
		expect(passaTier('difficile', 'medio')).toBe(true);
	});

	it('le sezioni rispettano l’ordine ufficiale', () => {
		const mock = buildMock({ shuffle: false });
		const ids = mock.sezioni.map((s) => s.id);
		const ordine = EXAM_N4_SECTIONS.map((s) => s.id).filter((id) => ids.includes(id));
		expect(ids).toEqual(ordine);
	});

	it('le prove ufficiali fisse (seed) sono deterministiche e distinte', () => {
		const sig = (m: ReturnType<typeof buildMock>) =>
			m.sezioni.flatMap((s) => s.questions.map((q) => q.prompt)).join('|');
		const a1 = buildMock({ seed: 1001, difficolta: 'esame' });
		const a2 = buildMock({ seed: 1001, difficolta: 'esame' });
		const b = buildMock({ seed: 1002, difficolta: 'esame' });
		expect(sig(a1)).toBe(sig(a2)); // stesso seed → prova identica
		expect(sig(a1)).not.toBe(sig(b)); // seed diversi → prove diverse
	});

	it('la prova ufficiale fissa riempie i conteggi reali', () => {
		const mock = buildMock({ seed: 1001, difficolta: 'esame' });
		const perSlug = new Map<string, number>();
		for (const s of mock.sezioni)
			for (const q of s.questions) perSlug.set(q.mondaiSlug, (perSlug.get(q.mondaiSlug) ?? 0) + 1);
		const sotto: string[] = [];
		for (const sec of EXAM_N4_SECTIONS)
			for (const m of sec.mondai) if ((perSlug.get(m.slug) ?? 0) < m.count) sotto.push(m.slug);
		expect(sotto, `mondai sotto il conteggio: ${sotto.join(', ')}`).toEqual([]);
	});

	// La "Prova d'esame ufficiale" deve riempire i conteggi reali a ENTRAMBE le
	// difficoltà, altrimenti non è realistica. Segnala i mondai ancora sottili.
	for (const diff of ['facile', 'esame'] as const) {
		it(`riempie i conteggi ufficiali a difficoltà ${diff}`, () => {
			const mock = buildMock({ shuffle: false, difficolta: diff });
			const perSlug = new Map<string, number>();
			for (const s of mock.sezioni)
				for (const q of s.questions) perSlug.set(q.mondaiSlug, (perSlug.get(q.mondaiSlug) ?? 0) + 1);
			const sotto: string[] = [];
			for (const sec of EXAM_N4_SECTIONS)
				for (const m of sec.mondai) {
					const n = perSlug.get(m.slug) ?? 0;
					if (n < m.count) sotto.push(`${m.slug}: ${n}/${m.count}`);
				}
			expect(sotto, `mondai sotto il conteggio a ${diff}: ${sotto.join(', ')}`).toEqual([]);
		});
	}
});
