import { describe, expect, it } from 'vitest';
import { nuovoStato, avanza, obiettiviDi } from './motore';
import { arrivo, serata } from './missioni/comune';
import { livelli, manca, nuoviTimbri, registraRisposta, stelle, timbri, unisci } from './punteggio';
import type { Domanda, Missione, Passo } from './tipi';

const T = { chiacchiere: 39, persone: 20, missioni: 4, stelleTre: 0 };
const d = (extra: Partial<Domanda> = {}): Domanda => ({ ja: '?', it: '?', opzioni: [], giusta: 0, spiega: '', ...extra });

describe('事件: punteggio e timbri', () => {
	it('stelle: 90% ★★★, 70% ★★, sotto ★', () => {
		expect(stelle({ ok: 9, tot: 10 })).toBe(3);
		expect(stelle({ ok: 7, tot: 10 })).toBe(2);
		expect(stelle({ ok: 1, tot: 10 })).toBe(1);
		expect(stelle({ ok: 0, tot: 0 })).toBe(0);
	});

	it('le domande della storia vanno nel voto, chiacchiere e treno nel ripasso', () => {
		let s = nuovoStato('ルカ', 'm1');
		s = registraRisposta(s, true, { domanda: d() });
		s = registraRisposta(s, false, { domanda: d(), libera: true });
		s = registraRisposta(s, true, { treno: true });
		expect(s.punteggi.m1).toEqual({ ok: 1, tot: 1 });
		expect(s.ripasso).toEqual({ ok: 1, tot: 2 });
		expect(s.domande).toEqual({ ok: 2, tot: 3 });
		expect(s.contatori.treno).toBe(1);
		expect(s.contatori.giuste).toBe(2);
	});

	it('meteo e ascolto salgono i loro contatori; il primo meteo dà il timbro 天', () => {
		let s = nuovoStato('ルカ', 'm1');
		const prima = livelli(s, T);
		s = registraRisposta(s, true, { domanda: d({ tipo: 'meteo', ascolto: { ja: 'あめ', it: 'pioggia' } }) });
		expect(s.contatori.meteo).toBe(1);
		expect(s.contatori.ascolto).toBe(1);
		expect(nuoviTimbri(prima, livelli(s, T))).toEqual(['meteo']);
	});

	it('la domanda del meteo della sera è segnata come meteo', () => {
		const tipi: string[] = [];
		const giro = (ps: ReturnType<typeof serata>): void => {
			for (const p of ps) {
				if ('domanda' in p && p.domanda.tipo) tipi.push(p.domanda.tipo);
				if ('se' in p) { giro(p.allora); giro(p.altrimenti ?? []); }
				if ('scelta' in p) p.scelta.forEach((o) => giro(o.passi ?? []));
			}
		};
		giro(serata());
		expect(tipi).toContain('meteo');
		expect(tipi).toContain('notizia');
	});

	it('arrivare in ufficio entro le 9 conta come mattina puntuale', () => {
		const s = { ...nuovoStato('ルカ', 'm1'), minuti: 8 * 60 + 50 };
		expect(avanza(s, [arrivo()]).stato.contatori.puntuale).toBe(1);
		expect(avanza({ ...s, minuti: 10 * 60 }, [arrivo()]).stato.contatori.puntuale).toBeUndefined();
	});

	it('ogni timbro ha tre soglie crescenti', () => {
		for (const t of timbri(T)) expect(t.soglie[0] < t.soglie[1] && t.soglie[1] < t.soglie[2]).toBe(true);
	});
});

describe('事件: risultato delle missioni', () => {
	it('ogni obiettivo di una missione si può completare (ha il suo «completa»)', async () => {
		const { M1 } = await import('./missioni/m1');
		const { M2 } = await import('./missioni/m2');
		const { M3 } = await import('./missioni/m3');
		const { M4 } = await import('./missioni/m4');
		const mai: string[] = [];
		for (const m of [M1, M2, M3, M4]) {
			const fatti = new Set<string>();
			const giro = (ps: Passo[]): void => {
				for (const p of ps) {
					if ('completa' in p) fatti.add(p.completa);
					else if ('scelta' in p) p.scelta.forEach((o) => giro(o.passi ?? []));
					else if ('se' in p) { giro(p.allora); giro(p.altrimenti ?? []); }
					else if ('prova' in p) { giro(p.prova.ok); giro(p.prova.no); }
				}
			};
			for (const sc of m.scene) giro(sc.passi);
			for (const id of obiettiviDi(m)) if (!fatti.has(id)) mai.push(`${m.id}: ${id}`);
		}
		expect(mai).toEqual([]);
	});

	it('ogni missione ha la sua rete di sicurezza (ripiego) per «risolto da altri»', async () => {
		for (const f of ['m1', 'm2', 'm3', 'm4']) {
			const mod = (await import(`./missioni/${f}.ts`)) as Record<string, Missione>;
			const m = Object.values(mod)[0]!;
			expect(m.scene.filter((sc) => sc.ripiego).length, m.id).toBe(1);
		}
	});

	it('il migliore si tiene voce per voce; manca dice cosa resta', () => {
		const a = unisci(undefined, { ok: 9, tot: 10, obiettivi: 3, risolto: false });
		const b = unisci(a, { ok: 6, tot: 10, obiettivi: 5, risolto: true });
		expect(b).toEqual({ ok: 9, tot: 10, obiettivi: 5, risolto: true });
		const m: Missione = { id: 'x', titolo: 'x', it: 'x', scene: [{ id: 's', luogo: 'casa', quando: {}, passi: [{ obiettivo: 'o1', ja: '', it: '' }, { obiettivo: 'o2', ja: '', it: '' }] }] };
		expect(manca({ ok: 9, tot: 10, obiettivi: 2, risolto: true }, m)).toEqual({ stelle: false, obiettivi: 0, risolto: false, fatto: 100 });
		expect(manca({ ok: 5, tot: 10, obiettivi: 1, risolto: false }, m).fatto).toBeLessThan(50);
	});
});

describe('事件: calendario', () => {
	it('date, feste e mesi', async () => {
		const { dataDi, festivo, giornoDi, mese } = await import('./calendario');
		const { dataIt } = await import('./motore');
		expect(dataDi(23).getDate()).toBe(29); // 昭和の日
		expect(festivo(23)).toBe(true);
		expect(festivo(22)).toBe(false);
		expect(giornoDi(new Date(2026, 4, 1))).toBe(25);
		expect(dataIt(25)).toBe('venerdì 1 maggio');
		const m = mese(0);
		expect(m.mese).toBe(4);
		expect(m.settimane[0]![0]).toBeNull(); // aprile 2026 comincia di mercoledì
		expect(m.settimane.flat().filter((g) => g !== null)).toHaveLength(30);
	});
	it('gli appuntamenti prendono il giorno giusto («あした» = giorno dopo)', async () => {
		const { avanza } = await import('./motore');
		const s = { ...nuovoStato('ルカ', 'm4'), giorno: 21 };
		const r = avanza(s, [{ obiettivo: 'x', ja: 'あした', it: 'domani', quando: { dopo: 1, dalle: 720 } }]);
		expect(r.stato.obiettivi[0]!.quando).toEqual({ giorno: 22, dalle: 720 });
	});
	it('ogni missione ha i suoi giorni', async () => {
		const { giorniMissione } = await import('./calendario');
		const { M1 } = await import('./missioni/m1');
		const { M4 } = await import('./missioni/m4');
		expect(giorniMissione(M1)).toEqual([0, 2]);
		expect(giorniMissione(M4)).toEqual([21, 23]);
	});
});
