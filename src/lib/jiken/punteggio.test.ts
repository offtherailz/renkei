import { describe, expect, it } from 'vitest';
import { nuovoStato, avanza } from './motore';
import { arrivo, serata } from './missioni/comune';
import { livelli, nuoviTimbri, registraRisposta, stelle, timbri } from './punteggio';
import type { Domanda } from './tipi';

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
