import { describe, it, expect } from 'vitest';
import seedData from '../../../static/seed-n5n4.json';

interface SeedKanji {
	id: string;
	livello_jlpt?: string;
}
const seed = seedData as unknown as { kanji: SeedKanji[] };
const VALID_LEVELS = new Set(['N5', 'N4', 'N3', 'N2', 'N1']);

describe('livello_jlpt dei kanji', () => {
	it('ogni kanji ha un livello JLPT valido (badge nella scheda)', () => {
		for (const k of seed.kanji) {
			expect(VALID_LEVELS.has(k.livello_jlpt ?? ''), `kanji ${k.id} senza livello valido`).toBe(true);
		}
	});

	it('non tutti i kanji sono sullo stesso livello (il catalogo storico è stato applicato davvero)', () => {
		const levels = new Set(seed.kanji.map((k) => k.livello_jlpt));
		expect(levels.size).toBeGreaterThan(1);
	});
});
