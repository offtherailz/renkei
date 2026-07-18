import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { simulate, report, type Scenario } from './studySim';

// Conteggi reali dal seed (static/seed-n5n4.json, luglio 2026):
//   N5   = 713 parole + 93 kanji + 81 gram = 887 item
//   N5+N4 = 1457 parole + 268 kanji + 168 gram = 1893 item
const N5 = 887;
const N5N4 = 1893;

const SCENARIOS: Scenario[] = [
	{ nome: 'Casual N5', cfg: { cardCount: N5, cap: 5, pCorrect: 0.85, oncePerDay: true, days: 180, seed: 1 } },
	{ nome: 'Normale N5', cfg: { cardCount: N5, cap: 10, pCorrect: 0.85, oncePerDay: true, days: 180, seed: 1 } },
	{ nome: 'Intenso N5', cfg: { cardCount: N5, cap: 20, pCorrect: 0.85, oncePerDay: true, days: 180, seed: 1 } },
	{ nome: 'Normale N5 (churn, 1/g OFF)', cfg: { cardCount: N5, cap: 10, pCorrect: 0.85, oncePerDay: false, days: 180, seed: 1 } },
	{ nome: 'Normale N5 precisione 75%', cfg: { cardCount: N5, cap: 10, pCorrect: 0.75, oncePerDay: true, days: 180, seed: 1 } },
	{ nome: 'Normale N5 precisione 95%', cfg: { cardCount: N5, cap: 10, pCorrect: 0.95, oncePerDay: true, days: 180, seed: 1 } },
	{ nome: 'Intenso N5+N4', cfg: { cardCount: N5N4, cap: 20, pCorrect: 0.85, oncePerDay: true, days: 365, seed: 1 } }
];

const RUN_REPORT = process.env.SIM === '1';

describe('Simulatore di studio — report', () => {
	(RUN_REPORT ? it : it.skip)('genera plans/2026-07-18-study-sim-report.md', () => {
		const md = report(SCENARIOS);
		const out = resolve(process.cwd(), 'plans/2026-07-18-study-sim-report.md');
		writeFileSync(out, md, 'utf8');
		expect(md).toContain('| Scenario |');
	}, 120000);

	// Sanity SEMPRE attive (anche senza SIM=1): il modello deve "reggere".
	it('scenario normale N5 (1 volta/g): carico sostenibile, deboli in calo, progresso', () => {
		const r = simulate({ cardCount: N5, cap: 10, pCorrect: 0.85, oncePerDay: true, days: 180, seed: 1 });
		const d = r.days;
		// backlog dovuto non esplode
		expect(Math.max(...d.map((x) => x.dueBacklogAtDayEnd))).toBeLessThan(10 * 8 + N5);
		// tempo/giorno di picco ragionevole (< 90 min a 10 nuove/g)
		expect(Math.max(...d.map((x) => x.minutes))).toBeLessThan(90);
		// il progresso cresce: più padroneggiate a fine periodo che a metà
		expect(d[d.length - 1]!.mastered).toBeGreaterThan(d[89]!.mastered);
		// i deboli non crescono a regime: a fine periodo <= che a giorno 30
		expect(d[d.length - 1]!.weak).toBeLessThanOrEqual(d[29]!.weak + 5);
	});

	it('1 volta/g riduce le domande giornaliere rispetto ai learning steps', () => {
		const on = simulate({ cardCount: N5, cap: 10, pCorrect: 0.85, oncePerDay: true, days: 90, seed: 1 });
		const off = simulate({ cardCount: N5, cap: 10, pCorrect: 0.85, oncePerDay: false, days: 90, seed: 1 });
		const q = (r: typeof on) => r.days.reduce((s, x) => s + x.questions, 0);
		expect(q(on)).toBeLessThan(q(off));
	});
});
