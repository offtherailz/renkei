// 事件: la giornata di un giocatore diligente (va sempre dove c'è il ❗,
// altrimenti aspetta). Controlla che l'orologio racconti giornate credibili:
// in ufficio entro le 9, pomeriggio dopo la pausa pranzo, sera a casa.
// Con TEMPI=1 stampa la linea del tempo di ogni missione.
import { describe, expect, it } from 'vitest';
import { LUOGHI, LUOGO } from './mondo';
import { M1 } from './missioni/m1';
import { M2 } from './missioni/m2';
import { M3 } from './missioni/m3';
import { M4 } from './missioni/m4';
import { apertura, avanza, hhmm, nuovoStato, opzioniSoldi, prendiTreno, scenaPer, STAZIONI, TARDI, viaggia, VIAGGIO } from './motore';
import type { LuogoId, Missione, Passo, Stato } from './tipi';

interface Tappa { giorno: number; da: number; a: number | null; luogo: LuogoId; id: string }
function gioca(m: Missione, scegli: number): { log: string[]; tappe: Tappa[]; finita: boolean } {
	const tappe: Tappa[] = [];
	let s: Stato = nuovoStato('テスト', m.id, m.inizio);
	if (m.id !== 'm1') s = { ...s, soldi: 20000 };
	const log: string[] = [];
	const passi = (ps: Passo[]): void => {
		let coda = [...ps];
		for (let k = 0; k < 400; k++) {
			const r = avanza(s, coda); s = r.stato; coda = r.coda;
			const p = r.mostra; if (!p) return;
			if ('scelta' in p) coda = [...(p.scelta[(scegli++) % p.scelta.length]!.passi ?? []), ...coda];
			else if ('prova' in p) { const ok = p.prova.giuste.find((o) => s.oggetti.includes(o)); coda = [...(ok ? p.prova.ok : p.prova.no), ...coda]; }
			else if ('fine' in p) s = { ...s, finita: p.fine };
			else if ('domanda' in p && p.domanda.giusta === 'soldi') opzioniSoldi(s.soldi);
		}
	};
	const scena = (dest: LuogoId, catena = false): boolean => {
		const sc = apertura(LUOGO[dest], s) === 'aperto' ? scenaPer(dest, s, m, catena) : null;
		if (!sc) return false;
		const g = s.giorno, t = s.minuti;
		s = { ...s, fatte: sc.ripeti ? s.fatte : [...s.fatte, sc.id] };
		passi(sc.passi);
		tappe.push({ giorno: g, da: t, a: s.giorno !== g ? null : s.minuti, luogo: dest, id: sc.id });
		log.push(`g${g} ${hhmm(t).padStart(5)}→${s.giorno !== g ? 'notte' : hhmm(s.minuti).padStart(5)} ${dest.padEnd(9)} ${sc.id}`);
		return true;
	};
	const aCasa = (): void => {
		if ((LUOGO[s.luogo].quartiere ?? 'sakura') !== 'sakura') s = prendiTreno(s, 'eki');
		s = viaggia(s, 'casa');
		if (!scena('casa')) { log.push(`g${s.giorno} ${hhmm(s.minuti)} casa (a letto)`); passi([{ dormi: true }]); }
	};
	scena('casa');
	for (let i = 0; i < 400 && !s.finita; i++) {
		while (!s.finita && scena(s.luogo, true)) {}
		if (s.finita) break;
		if (s.minuti >= TARDI) { aCasa(); continue; }
		const q = LUOGO[s.luogo].quartiere ?? 'sakura';
		const prova = (ls: typeof LUOGHI) => ls.find((l) => apertura(l, s) !== 'bloccato' && apertura(l, { ...s, minuti: s.minuti + VIAGGIO }) === 'aperto' && scenaPer(l.id, { ...s, minuti: s.minuti + VIAGGIO }, m));
		const qui = prova(LUOGHI.filter((l) => (l.quartiere ?? 'sakura') === q && l.id !== 'casa')) ?? prova(LUOGHI.filter((l) => l.id === 'casa' && q === 'sakura'));
		const la = s.flag.includes('treno.ok') ? prova(LUOGHI.filter((l) => (l.quartiere ?? 'sakura') !== q)) : undefined;
		if (qui) { s = viaggia(s, qui.id); scena(qui.id); }
		else if (la) { s = prendiTreno(viaggia(s, STAZIONI[q]!), STAZIONI[q === 'sakura' ? 'ekimae' : 'sakura']!); s = viaggia(s, la.id); scena(la.id); }
		else { s = { ...s, minuti: Math.min(s.minuti + 30, 23 * 60 + 59) }; }
	}
	log.push(s.finita ? `FINE g${s.giorno} ${hhmm(s.minuti)}` : 'NON FINITA');
	return { log, tappe, finita: !!s.finita };
}

const h = (o: number, mi = 0): number => o * 60 + mi;
describe('事件: la giornata di un giocatore diligente', () => {
	for (const m of [M1, M2, M3, M4]) {
		it(`${m.id}: giornate credibili`, () => {
			const { log, tappe, finita } = gioca(m, 0);
			if (process.env.TEMPI) console.log(`\n=== ${m.id}\n${log.join('\n')}`);
			expect(finita).toBe(true);
			const problemi: string[] = [];
			for (const g of [...new Set(tappe.map((t) => t.giorno))]) {
				const oggi = tappe.filter((t) => t.giorno === g);
				const uff = oggi.filter((t) => t.luogo === 'ufficio');
				if (g % 7 < 5 && uff.length && uff[0]!.da > h(9)) problemi.push(`g${g}: in ufficio alle ${hhmm(uff[0]!.da)}`);
				for (const t of uff.filter((t) => t.id.endsWith('pomeriggio'))) if (t.da < h(12, 30) || t.da > h(13, 30)) problemi.push(`g${g}: pomeriggio alle ${hhmm(t.da)}`);
				// nessuna scena comincia prima che sia finita la precedente
				oggi.forEach((t, i) => { const p = oggi[i - 1]; if (p?.a !== undefined && p.a !== null && t.da < p.a) problemi.push(`g${g}: ${t.id} alle ${hhmm(t.da)} prima della fine di ${p.id}`); });
			}
			expect(problemi).toEqual([]);
		});
	}
});
