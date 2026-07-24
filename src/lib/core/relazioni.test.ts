import { describe, it, expect } from 'vitest';
import {
	SCENARIOS,
	findScenario,
	buildTurns,
	computeScore,
	THEME_KEYWORD,
	type Scenario
} from './relazioni';
import { COMPOSED_SLUGS } from '../data/grammarForms';

describe('SCENARIOS', () => {
	it('copre i 3 scenari con il registro giusto', () => {
		expect(SCENARIOS).toHaveLength(3);
		expect(findScenario('shotaimen').register).toBe('teinei');
		expect(findScenario('tomodachi').register).toBe('plain');
		expect(findScenario('joushi').register).toBe('keigo');
	});

	it('lancia per uno scenario inesistente', () => {
		// @ts-expect-error test volutamente con id non valido
		expect(() => findScenario('nope')).toThrow();
	});

	it('ogni scenario include i temi greeting e closing', () => {
		for (const s of SCENARIOS) {
			expect(s.themes.some((t) => t.theme === 'greeting')).toBe(true);
			expect(s.themes.some((t) => t.theme === 'closing')).toBe(true);
		}
	});

	it('ogni scenario include il tema permission con gram che punta a una costruzione del catalogo', () => {
		for (const s of SCENARIOS) {
			const perm = s.themes.find((t) => t.theme === 'permission');
			expect(perm, `${s.id} senza tema permission`).toBeDefined();
			expect(perm!.gram, `${s.id} permission senza gram`).toBeTruthy();
			expect(COMPOSED_SLUGS.has(perm!.gram!), `${s.id} → gram "${perm!.gram}" non è nel catalogo`).toBe(true);
		}
	});

	it('ogni tema ha almeno una opzione corretta e almeno un distrattore con motivo', () => {
		for (const s of SCENARIOS) {
			for (const bank of s.themes) {
				const corrects = bank.options.filter((o) => o.correct);
				const wrongs = bank.options.filter((o) => !o.correct);
				expect(corrects.length).toBeGreaterThanOrEqual(1);
				expect(wrongs.length).toBeGreaterThanOrEqual(1);
				for (const w of wrongs) expect(w.reason).toBeTruthy();
				// ogni opzione ha lettura/it/en valorizzati (non vuoti)
				for (const o of bank.options) {
					expect(o.jp.length).toBeGreaterThan(0);
					expect(o.read.length).toBeGreaterThan(0);
					expect(o.it.length).toBeGreaterThan(0);
					expect(o.en.length).toBeGreaterThan(0);
				}
			}
		}
	});
});

// ── Registro: le opzioni corrette devono usare le forme del registro dello
// scenario, i distrattori devono usare forme di un ALTRO registro. ──
const PLAIN_MARKERS = ['だよ', 'だね', 'かな', 'んだ', 'いいね', 'うん'];
const TEINEI_MARKERS = ['です', 'ます', 'ですか', 'ました'];
const KEIGO_MARKERS = ['ございます', 'おります', 'いただき', 'なさる', 'いたします', 'よろしいでしょうか'];

function hasAny(text: string, markers: string[]): boolean {
	return markers.some((m) => text.includes(m));
}

describe('registro — 丁寧 (shotaimen)', () => {
	const s = findScenario('shotaimen');
	it('le opzioni corrette sono in 丁寧 (です・ます), i distrattori sono troppo casual (piano)', () => {
		for (const bank of s.themes) {
			for (const o of bank.options.filter((o) => o.correct)) {
				expect(hasAny(o.jp, TEINEI_MARKERS) || o.jp.includes('そうですか') || o.jp.includes('いいですね')).toBe(true);
			}
			for (const o of bank.options.filter((o) => !o.correct)) {
				// distrattori shotaimen sono piano/casual: non devono contenere です/ます
				expect(hasAny(o.jp, TEINEI_MARKERS)).toBe(false);
			}
		}
	});
});

describe('registro — 普通体 (tomodachi)', () => {
	const s = findScenario('tomodachi');
	it('le opzioni corrette sono in piano, i distrattori sono troppo formali (keigo)', () => {
		for (const bank of s.themes) {
			for (const o of bank.options.filter((o) => o.correct)) {
				// nessuna corretta usa keigo/teinei formale
				expect(hasAny(o.jp, KEIGO_MARKERS)).toBe(false);
				expect(o.jp.includes('です') && !o.jp.includes('んだ')).toBe(false);
			}
			for (const o of bank.options.filter((o) => !o.correct)) {
				expect(hasAny(o.jp, TEINEI_MARKERS) || hasAny(o.jp, KEIGO_MARKERS)).toBe(true);
			}
		}
	});
});

describe('registro — 敬語 asimmetrico (joushi)', () => {
	const s = findScenario('joushi');
	it('le opzioni corrette sono in umile/onorifico, i distrattori sono in piano (maleducato col capo)', () => {
		for (const bank of s.themes) {
			for (const o of bank.options.filter((o) => o.correct)) {
				expect(hasAny(o.jp, KEIGO_MARKERS)).toBe(true);
			}
			for (const o of bank.options.filter((o) => !o.correct)) {
				// distrattori joushi sono in piano: mai keigo
				expect(hasAny(o.jp, KEIGO_MARKERS)).toBe(false);
			}
		}
	});
	it('NON contiene mai per l\'utente una forma piana pura come opzione corretta', () => {
		for (const bank of s.themes) {
			for (const o of bank.options.filter((o) => o.correct)) {
				expect(o.jp.endsWith('だよ') || o.jp.endsWith('の？')).toBe(false);
			}
		}
	});
});

describe('buildTurns', () => {
	function turnsFor(s: Scenario) {
		return buildTurns(s);
	}

	it('produce tanti turni quanti temi ha lo scenario (5-7)', () => {
		for (const s of SCENARIOS) {
			const turns = turnsFor(s);
			expect(turns.length).toBe(s.themes.length);
			expect(turns.length).toBeGreaterThanOrEqual(5);
			expect(turns.length).toBeLessThanOrEqual(7);
		}
	});

	it('il primo turno è sempre greeting e l\'ultimo è sempre closing', () => {
		for (const s of SCENARIOS) {
			const turns = turnsFor(s);
			expect(turns[0]!.theme).toBe('greeting');
			expect(turns[turns.length - 1]!.theme).toBe('closing');
		}
	});

	it('mescola l\'ordine dei temi centrali nel tempo (non sempre identico)', () => {
		const s = findScenario('shotaimen');
		const orders = new Set<string>();
		for (let i = 0; i < 30; i += 1) {
			const turns = turnsFor(s);
			orders.add(turns.map((t) => t.theme).join(','));
		}
		expect(orders.size).toBeGreaterThan(1);
	});

	it('correctIndex punta sempre a una opzione con correct=true', () => {
		for (const s of SCENARIOS) {
			for (let i = 0; i < 10; i += 1) {
				const turns = turnsFor(s);
				for (const t of turns) {
					expect(t.options[t.correctIndex]!.correct).toBe(true);
				}
			}
		}
	});

	it('le opzioni di ogni turno sono mescolate (posizione della corretta varia)', () => {
		const s = findScenario('shotaimen');
		const positions = new Set<number>();
		for (let i = 0; i < 40; i += 1) {
			const turns = turnsFor(s);
			const workTurn = turns.find((t) => t.theme === 'work')!;
			positions.add(workTurn.correctIndex);
		}
		expect(positions.size).toBeGreaterThan(1);
	});
});

describe('computeScore', () => {
	it('cresce con più risposte corrette', () => {
		expect(computeScore(6, 6, 0)).toBeGreaterThan(computeScore(6, 3, 0));
	});
	it('dà un bonus per il punteggio pieno (tutte corrette)', () => {
		const full = computeScore(5, 5, 0);
		const almostFull = computeScore(5, 4, 0);
		expect(full - almostFull).toBeGreaterThan(20); // 20 base + 30 bonus accuratezza
	});
	it('penalizza gli hint usati', () => {
		expect(computeScore(5, 5, 0)).toBeGreaterThan(computeScore(5, 5, 3));
	});
	it('non va mai sotto zero', () => {
		expect(computeScore(0, 0, 50)).toBeGreaterThanOrEqual(0);
	});
});

describe('THEME_KEYWORD', () => {
	it('mappa solo i temi con parola-chiave esistente nel catalogo (仕事/趣味/家族)', () => {
		expect(THEME_KEYWORD.work).toBe('仕事');
		expect(THEME_KEYWORD.hobby).toBe('趣味');
		expect(THEME_KEYWORD.family).toBe('家族');
		expect(THEME_KEYWORD.greeting).toBeUndefined();
		expect(THEME_KEYWORD.origin).toBeUndefined();
		expect(THEME_KEYWORD.closing).toBeUndefined();
	});
});
