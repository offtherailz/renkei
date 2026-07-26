import { describe, it, expect } from 'vitest';
import { mergeCuratedGrammar, CURATED_GRAMMAR_SOURCE_NAME } from './grammar-extra.mjs';

// Fixture di test: NON è scripts/data/grammar-extra-n5n4.json (quello resta
// vuoto finché il coordinatore non scrive i contenuti veri).
const CURATED_FIXTURE = [
	{
		id: 'g-n4-fixture',
		struttura: '〜ことにする',
		livello: 'N4',
		spiegazione: { it: 'decidere di fare qualcosa', en: 'decide to do' },
		esempi: [{ jp: '毎日勉強することにした。', it: 'Ho deciso di studiare ogni giorno.', en: 'I decided to study every day.' }],
		study_tags: ['n4', 'grammar', 'exam-core'],
		chapter_tags: ['jlpt-n4-core']
	}
];

const NOOP_LINKED_WORDS = () => [];
const words: unknown[] = [];

describe('mergeCuratedGrammar', () => {
	it('crea una voce nuova con id non esistente, con source_name curato e i campi obbligatori', () => {
		const grammar: any[] = [];
		const result = mergeCuratedGrammar(grammar, CURATED_FIXTURE, { buildLinkedWords: NOOP_LINKED_WORDS, words });

		expect(result).toHaveLength(1);
		const entry = result[0];
		expect(entry.id).toBe('g-n4-fixture');
		expect(entry.struttura).toBe('〜ことにする');
		expect(entry.livello_jlpt).toBe('N4');
		expect(entry.spiegazione).toEqual({ it: 'decidere di fare qualcosa', en: 'decide to do' });
		expect(entry.source_name).toBe(CURATED_GRAMMAR_SOURCE_NAME);
		expect(entry.categoria_jp).toBe('文法[ぶんぽう]');
		expect(entry.chapter_tags).toEqual(['jlpt-n4-core']);
		expect(entry.study_tags).toEqual(['n4', 'grammar', 'exam-core']);
		expect(entry.frasi_esempio).toEqual([
			{
				testo: '毎日勉強することにした。',
				traduzione: { it: 'Ho deciso di studiare ogni giorno.', en: 'I decided to study every day.' },
				parole_linkate: []
			}
		]);
		expect(entry.frasi_esempio_parole_linkate).toEqual([]);
		expect(typeof entry.updated_at).toBe('number');
	});

	it('voce con id già esistente: viene aggiornata, non duplicata (lunghezza invariata)', () => {
		const existing = {
			id: 'g-n4-fixture',
			struttura: '〜ことにする (vecchia versione)',
			spiegazione: { it: 'vecchio testo', en: 'old text' },
			chapter_tags: ['jlpt-n4-core'],
			study_tags: ['n4', 'grammar'],
			source_name: CURATED_GRAMMAR_SOURCE_NAME,
			livello_jlpt: 'N4',
			categoria_jp: '文法[ぶんぽう]',
			frasi_esempio: [],
			frasi_esempio_parole_linkate: [],
			updated_at: 1
		};
		const grammar = [existing];
		const result = mergeCuratedGrammar(grammar, CURATED_FIXTURE, { buildLinkedWords: NOOP_LINKED_WORDS, words });

		expect(result).toHaveLength(1);
		expect(result[0].struttura).toBe('〜ことにする');
		expect(result[0].spiegazione.it).toBe('decidere di fare qualcosa');
		// stesso oggetto mutato in place, non un duplicato aggiunto in coda
		expect(result[0]).toBe(existing);
	});

	it('simula un re-sync: normalizeGrammar preserva le voci curate perché source_name non è quello dell API', () => {
		const grammar: any[] = [];
		mergeCuratedGrammar(grammar, CURATED_FIXTURE, { buildLinkedWords: NOOP_LINKED_WORDS, words });

		const GRAMMAR_SOURCE_NAME = 'Sigmabond01/jlpt-grammar-api';
		// stesso predicato usato da normalizeGrammar in sync-open-source-seed.mjs
		// per decidere se una voce del seed esistente sopravvive al sync:
		// `if (item.source_name === GRAMMAR_SOURCE.name) continue;` altrimenti
		// viene preservata (byId.set(item.id, { ...byId.get(item.id), ...item })).
		const survivesResync = grammar.every((item) => item.source_name !== GRAMMAR_SOURCE_NAME);
		expect(survivesResync).toBe(true);
		expect(grammar[0].source_name).toBe(CURATED_GRAMMAR_SOURCE_NAME);
	});
});
