import { describe, it, expect } from 'vitest';
import { TRUCCHI, getTrucco } from './esame-n4-trucchi';
import { GIOCO_JUJU, GIOCO_JOKEN, type GiocoRound } from './esame-n4-giochi';
import { EXAM_N4_HOT_POINTS, allMondai } from './esame-n4';

describe('trucchi N4', () => {
	it('ogni punto caldo ha il suo trucco', () => {
		for (const h of EXAM_N4_HOT_POINTS) {
			expect(getTrucco(h.id), `manca trucco ${h.id}`).not.toBeNull();
		}
	});

	it('gli id dei trucchi combaciano con la chiave', () => {
		for (const [key, t] of Object.entries(TRUCCHI)) expect(t.id).toBe(key);
	});

	it('ogni trucco ha spiegazione, esempi (6+) e quiz', () => {
		for (const t of Object.values(TRUCCHI)) {
			expect(t.spiegazione.length).toBeGreaterThan(20);
			expect(t.esempi.length).toBeGreaterThanOrEqual(6);
			expect(t.quiz.length).toBeGreaterThan(0);
			for (const ex of t.esempi) {
				expect(ex.jp.trim()).not.toBe('');
				expect(ex.it.trim()).not.toBe('');
				expect(ex.en.trim()).not.toBe('');
				expect(ex.nota.trim()).not.toBe('');
			}
		}
	});

	it('ogni quiz ha indice valido e una spiegazione per distrattore', () => {
		for (const t of Object.values(TRUCCHI)) {
			for (const q of t.quiz) {
				expect(q.correct).toBeGreaterThanOrEqual(0);
				expect(q.correct).toBeLessThan(q.choices.length);
				expect(q.perche_sbagliate.length).toBe(q.choices.length - 1);
				expect(q.perche_giusta.trim()).not.toBe('');
			}
		}
	});

	it('i link drill/grammatica dei trucchi puntano a rotte note', () => {
		// prime segmento della href (senza hash/param) fra le rotte esistenti
		const known = new Set([
			'transitivi', 'coppie', 'keigo', 'forme-composte', 'certezza', 'avverbi',
			'particelle', 'comparazioni', 'iikae', 'esame'
		]);
		for (const t of Object.values(TRUCCHI)) {
			const hrefs = [t.drill?.href, ...(t.grammatica ?? []).map((g) => g.href)].filter(
				(h): h is string => !!h
			);
			for (const h of hrefs) {
				const first = h.split(/[/#?]/)[0]!;
				expect(known.has(first), `href sconosciuta: ${h}`).toBe(true);
			}
		}
	});
});

describe('mini-giochi N4', () => {
	const checkRounds = (rounds: GiocoRound[]) => {
		expect(rounds.length).toBeGreaterThanOrEqual(6);
		for (const r of rounds) {
			expect(r.contesto.trim()).not.toBe('');
			expect(r.prompt.includes('＿')).toBe(true);
			expect(r.choices.length).toBeGreaterThanOrEqual(3);
			expect(r.correct).toBeGreaterThanOrEqual(0);
			expect(r.correct).toBeLessThan(r.choices.length);
			expect(r.spiega.trim()).not.toBe('');
		}
	};

	it('juju: round validi con frecce da→a', () => {
		checkRounds(GIOCO_JUJU);
		for (const r of GIOCO_JUJU) {
			expect(r.da?.trim()).toBeTruthy();
			expect(r.a?.trim()).toBeTruthy();
		}
	});

	it('joken: round validi', () => {
		checkRounds(GIOCO_JOKEN);
	});

	it('gli slug allmondai coprono le chiavi di credito dei giochi', () => {
		const slugs = new Set(allMondai().map((m) => m.slug));
		for (const s of ['hatsuwa', 'sokuji', 'bunpo1', 'kumitate']) expect(slugs.has(s)).toBe(true);
	});
});
