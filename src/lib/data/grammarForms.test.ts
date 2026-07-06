import { describe, it, expect } from 'vitest';
import seedData from '../../../static/seed-n5n4.json';
import { GRAMMAR_FORMS, FORM_SLUG_BY_LABEL, ATTACHMENT_SCHEMAS } from './grammarForms';

interface SeedGrammar {
	id: string;
	frasi_esempio?: { testo: string }[];
}
const seed = seedData as unknown as { grammar: SeedGrammar[] };
const grammarById = new Map(seed.grammar.map((g) => [g.id, g]));

describe('grammarForms integrità', () => {
	const slugs = new Set(GRAMMAR_FORMS.map((f) => f.slug));

	it('gli slug sono unici', () => {
		expect(slugs.size).toBe(GRAMMAR_FORMS.length);
	});

	it('ogni "related" punta a uno slug esistente', () => {
		for (const form of GRAMMAR_FORMS) {
			for (const rel of form.related) {
				expect(slugs.has(rel), `${form.slug} → related "${rel}" inesistente`).toBe(true);
			}
		}
	});

	it('ogni consolidaId esiste nel seed e ha almeno una frase di esempio', () => {
		for (const form of GRAMMAR_FORMS) {
			if (!form.consolidaId) continue;
			const g = grammarById.get(form.consolidaId);
			expect(g, `${form.slug} → consolidaId "${form.consolidaId}" assente nel seed`).toBeDefined();
			expect(
				(g?.frasi_esempio?.length ?? 0) > 0,
				`${form.consolidaId} senza frasi_esempio: il drill sarebbe vuoto`
			).toBe(true);
		}
	});

	it('le contrazioni compaiono solo sulla scheda dedicata e sono ben formate', () => {
		for (const form of GRAMMAR_FORMS) {
			if (!form.contractions) continue;
			expect(form.slug).toBe('contrazioni');
			for (const c of form.contractions) {
				expect(c.short.length).toBeGreaterThan(0);
				expect(c.full.length).toBeGreaterThan(0);
			}
		}
	});

	it('ogni forma composta ha schema di attacco valido', () => {
		for (const form of GRAMMAR_FORMS) {
			if (!form.composed) continue;
			expect(form.attachment?.length ?? 0, `${form.slug} senza attachment`).toBeGreaterThan(0);
			expect(form.schemaId, `${form.slug} senza schemaId`).toBeDefined();
			expect(
				ATTACHMENT_SCHEMAS[form.schemaId!],
				`${form.slug} → schema "${form.schemaId}" assente dalla legenda`
			).toBeDefined();
		}
	});

	it('FORM_SLUG_BY_LABEL mappa ogni etichetta (senza furigana) al suo slug', () => {
		for (const form of GRAMMAR_FORMS) {
			const plain = form.label.replace(/\[[^\]]+\]/g, '');
			expect(FORM_SLUG_BY_LABEL[plain]).toBe(form.slug);
		}
	});
});
