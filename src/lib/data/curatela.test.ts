import { describe, it, expect } from 'vitest';
import seed from '../../../static/seed-n5n4.json';
import overrides from '../../../scripts/data/word-overrides.json';
import idioms from '../../../scripts/data/idioms-n5n4.json';
import extraWords from '../../../scripts/data/extra-words-n5n4.json';

// Guardia contro la regressione del 26/07: alcune curatele vivevano SOLO
// dentro static/seed-n5n4.json e non nei file sorgente, così `npm run
// sync:open-seed` le cancellava rigenerando il catalogo (57 gruppi di frasi
// d'esempio persi, più sinonimi/correlati dei verbi in -する).
//
// Cosa copre: che per ogni voce curata a mano il seed non sia più ricco della
// sua fonte — se lo fosse, quel di più esiste solo nel seed ed è a rischio.
// Cosa NON copre: non rilancia il sync (troppo lento e richiede rete), quindi
// non prova l'idempotenza completa; verifica l'invariante che la causava.

type Frase = { testo: string };
type SeedWord = {
	id: string;
	scrittura: string;
	frasi_esempio?: Frase[];
	sinonimi?: string[];
	contrari?: string[];
	correlati?: string[];
};
type Curated = { scrittura: string; esempi?: unknown[]; esempio?: unknown };

const words = seed.words as SeedWord[];
const ov = overrides as Record<string, Record<string, unknown>>;
const bySource = new Map<string, Curated>();
for (const entry of [...(idioms as Curated[]), ...(extraWords as Curated[])]) {
	bySource.set(entry.scrittura, entry);
}

// I file curati (idiomi, vocaboli extra) sostituiscono in blocco le frasi
// d'esempio durante il sync: se il seed ne ha di più, le extra si perdono.
describe('curatela: frasi d’esempio dei file curati', () => {
	it('nessuna voce curata ha nel seed più frasi della sua fonte', () => {
		const perse: string[] = [];
		for (const w of words) {
			const src = bySource.get(w.scrittura);
			if (!src) continue;
			const nSeed = w.frasi_esempio?.length ?? 0;
			const nFonte = (src.esempi ?? (src.esempio ? [src.esempio] : [])).length;
			if (nSeed > nFonte) perse.push(`${w.id}: seed ${nSeed} > fonte ${nFonte}`);
		}
		expect(perse, `curatele a rischio:\n${perse.join('\n')}`).toEqual([]);
	});
});

// I verbi in -する vengono creati dal sync DOPO l'applicazione degli
// overrides: le loro relazioni curate devono stare negli overrides, altrimenti
// vengono ricalcolate da zero.
describe('curatela: relazioni dei verbi in -する', () => {
	// Quando l'override NON ha affatto il campo, il sync ricostruisce la
	// relazione con la sua euristica: non è materiale curato e non è a rischio.
	// Il caso pericoloso è l'override che esiste ma è più povero del seed:
	// vuol dire che qualcuno ha arricchito il seed invece della fonte.
	it('nessun override di verbo in -する è più povero del seed', () => {
		const perse: string[] = [];
		for (const w of words) {
			if (!w.id.endsWith('する')) continue;
			for (const campo of ['sinonimi', 'contrari', 'correlati'] as const) {
				const nelSeed = w[campo] ?? [];
				const nellOverride = ov[w.id]?.[campo] as string[] | undefined;
				if (nellOverride === undefined) continue; // rigenerato dall'euristica
				if (nellOverride.length < nelSeed.length) {
					perse.push(`${w.id}.${campo}: seed ${nelSeed.length} > override ${nellOverride.length}`);
				}
			}
		}
		expect(perse, `relazioni a rischio:\n${perse.join('\n')}`).toEqual([]);
	});
});
