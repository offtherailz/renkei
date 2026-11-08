// Esploratore: gioca migliaia di partite a caso (luoghi, attese, scelte, prove,
// treno) e controlla che non ci siano blocchi né stati impossibili. Riproduce le
// regole della pagina di gioco: scena o ambiente all'ingresso, scene in catena
// nello stesso luogo, ritorno a casa dalle 23, risveglio.
import { describe, expect, it } from 'vitest';
import { apertura, avanza, prendiTreno, nuovoStato, opzioniSoldi, scenaPer, STAZIONI, TARDI, viaggia } from './motore';
import { LUOGHI, LUOGO } from './mondo';
import { LUOGO_GIOCHI, pagaPartita } from './giochi';
import { M1 } from './missioni/m1';
import { M2 } from './missioni/m2';
import { M3 } from './missioni/m3';
import type { LuogoId, Missione, Passo, Stato } from './tipi';

// generatore pseudo-casuale con seme (le partite fallite si possono rigiocare)
function rng(seme: number): () => number {
	let x = seme >>> 0 || 1;
	return () => {
		x ^= x << 13;
		x ^= x >>> 17;
		x ^= x << 5;
		return (x >>> 0) / 4294967296;
	};
}

interface Esito {
	s: Stato;
	problemi: string[];
}

function partita(m: Missione, seme: number, maxPassi = 4000): Esito {
	const r = rng(seme);
	const pick = <T,>(xs: T[]): T => xs[Math.floor(r() * xs.length)]!;
	let s = nuovoStato('テスト', m.id, m.inizio);
	if (m.id !== 'm1') s = { ...s, soldi: 3000 + Math.floor(r() * 50000) };
	const problemi: string[] = [];
	const limite = (m.inizio?.giorno ?? 0) + 8;

	// gioca una lista di passi con scelte casuali
	const gioca = (passi: Passo[]): void => {
		let coda = [...passi];
		for (let guardia = 0; guardia < 500; guardia++) {
			const g0 = s.giorno;
			const res = avanza(s, coda);
			s = res.stato;
			coda = res.coda;
			const p = res.mostra;
			if (!p) return;
			if ('scelta' in p) coda = [...(pick(p.scelta).passi ?? []), ...coda];
			else if ('domanda' in p) {
				const n = p.domanda.giusta === 'soldi' ? opzioniSoldi(s.soldi).opzioni.length : p.domanda.opzioni.length;
				const g = p.domanda.giusta === 'soldi' ? opzioniSoldi(s.soldi).giusta : p.domanda.giusta;
				if (g < 0 || g >= n) problemi.push(`domanda senza risposta valida: ${p.domanda.ja}`);
			} else if ('prova' in p) {
				const scelta = r() < 0.5 && s.oggetti.length ? pick(s.oggetti) : null;
				coda = [...(scelta && p.prova.giuste.includes(scelta) ? p.prova.ok : p.prova.no), ...coda];
			} else if ('fine' in p) s = { ...s, finita: p.fine };
			if (s.giorno !== g0) giornoGiocato = true;
		}
		problemi.push('scena infinita');
	};
	let giornoGiocato = false;

	// come entra() + finisciScena() della pagina
	const entra = (dest: LuogoId): void => {
		const l = LUOGO[dest];
		if (apertura(l, s) !== 'aperto') return;
		const sc = scenaPer(dest, s, m);
		if (sc) {
			s = { ...s, fatte: [...s.fatte, sc.id] };
			gioca(sc.passi);
		} else if (dest === LUOGO_GIOCHI) {
			// sala giochi: qualche partita a 100 yen (come il menù: solo se si può pagare)
			for (let k = Math.floor(r() * 6); k > 0 && s.minuti < TARDI; k--) s = pagaPartita(s) ?? s;
		} else gioca(l.ambiente ?? []);
		for (let k = 0; k < 6 && !s.finita; k++) {
			const altra = apertura(LUOGO[s.luogo], s) === 'aperto' ? scenaPer(s.luogo, s, m) : null;
			if (!altra) break;
			s = { ...s, fatte: [...s.fatte, altra.id] };
			gioca(altra.passi);
		}
		if (!s.finita && s.minuti >= TARDI) tornaADormire();
	};
	const tornaADormire = (): void => {
		if ((LUOGO[s.luogo].quartiere ?? 'sakura') !== 'sakura') s = prendiTreno(s, 'eki');
		if (s.luogo !== 'casa') s = viaggia(s, 'casa');
		const sc = scenaPer('casa', s, m);
		if (sc) {
			s = { ...s, fatte: [...s.fatte, sc.id] };
			gioca(sc.passi);
		} else gioca([{ dormi: true }]);
	};

	for (let passo = 0; passo < maxPassi && !s.finita; passo++) {
		if (s.giorno > limite) {
			problemi.push(`missione non finita entro il giorno ${limite}`);
			break;
		}
		const azione = r();
		const quartiere = LUOGO[s.luogo].quartiere ?? 'sakura';
		const qui = LUOGHI.filter((l) => (l.quartiere ?? 'sakura') === quartiere && apertura(l, s) !== 'bloccato');
		if (azione < 0.08) {
			s = { ...s, minuti: Math.min(s.minuti + 30, 23 * 60 + 59) };
			if (s.minuti >= TARDI) tornaADormire();
		} else if (azione < 0.13 && s.flag.includes('treno.ok') && s.soldi >= 160) {
			const da = STAZIONI[quartiere]!;
			const verso = quartiere === 'sakura' ? STAZIONI.ekimae! : STAZIONI.sakura!;
			if (s.luogo !== da) s = viaggia(s, da);
			s = prendiTreno(s, verso);
		} else {
			// preferisce i luoghi con qualcosa della storia (come il ❗), ma non sempre
			const conStoria = qui.filter((l) => apertura(l, s) === 'aperto' && scenaPer(l.id, s, m));
			const dest = conStoria.length && r() < 0.6 ? pick(conStoria).id : pick(qui).id;
			if (s.minuti >= TARDI) tornaADormire();
			else {
				s = viaggia(s, dest);
				entra(dest);
			}
		}
		if (s.soldi < 0) problemi.push(`soldi sotto zero (${s.soldi}) giorno ${s.giorno}`);
		if (s.minuti > 23 * 60 + 59) problemi.push(`orologio oltre mezzanotte (${s.minuti})`);
		if (problemi.length) break;
	}
	if (!s.finita && !problemi.length) problemi.push(`non finita dopo ${maxPassi} azioni (giorno ${s.giorno})`);
	void giornoGiocato;
	return { s, problemi };
}

describe('事件: esploratore (partite a caso)', () => {
	for (const m of [M1, M2, M3]) {
		it(`${m.id}: 1500 partite a caso finiscono senza problemi`, () => {
			const falliti: string[] = [];
			for (let seme = 1; seme <= 1500 && falliti.length < 5; seme++) {
				const { problemi } = partita(m, seme);
				if (problemi.length) falliti.push(`seme ${seme}: ${problemi.join('; ')}`);
			}
			expect(falliti).toEqual([]);
		}, 60000);
	}
});
