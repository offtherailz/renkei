import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { isInLevel } from '$lib/data/kanjiN4';
import { apertura, avanza, dataJa, giustaSoldi, nuovoStato, opzioniSoldi, prendiTreno, prossimaMissione, scenaPer, verifica, viaggia } from './motore';
import { LUOGHI, LUOGO, OGGETTI, PERSONAGGI, iconaOggetto } from './mondo';
import { M1 } from './missioni/m1';
import { M2 } from './missioni/m2';
import { M3 } from './missioni/m3';
const MISSIONI = [M1, M2, M3];
import { UI } from './ui';
import { PREMI } from './giochi';
import type { LuogoId, Missione, Passo, Stato, Testo } from './tipi';

// tutte le frasi giapponesi di mondo e missioni
function testiJa(): string[] {
	const out: string[] = [];
	const passi = (ps: Passo[]): void => {
		for (const p of ps) {
			if ('dice' in p) out.push(p.ja);
			else if ('narra' in p) out.push(p.narra);
			else if ('nota' in p) out.push(p.nota);
			else if ('obiettivo' in p) out.push(p.ja);
			else if ('io' in p) out.push(p.io);
			else if ('pensa' in p) out.push(p.pensa);
			else if ('scelta' in p) p.scelta.forEach((o) => { out.push(o.ja); passi(o.passi ?? []); });
			else if ('se' in p) { passi(p.allora); passi(p.altrimenti ?? []); }
			else if ('domanda' in p) { out.push(p.domanda.ja); p.domanda.opzioni.forEach((o) => out.push(o.ja)); }
			else if ('prova' in p) { out.push(p.prova.ja); passi(p.prova.ok); passi(p.prova.no); }
		}
	};
	for (const l of LUOGHI) { out.push(l.nome); if (l.perche) out.push(l.perche.ja); passi(l.ambiente ?? []); }
	for (const v of Object.values(UI)) for (const t of [v].flat() as Testo[]) out.push(t.ja);
	for (const c of Object.values(PERSONAGGI)) out.push(c.nome);
	for (const o of Object.values(OGGETTI)) out.push(o.ja);
	for (const o of Object.values(PREMI)) out.push(o.ja);
	for (const m of MISSIONI) { for (const sc of m.scene) passi(sc.passi); out.push(m.titolo); if (m.epilogo) out.push(m.epilogo.ja); }
	return out;
}

describe('事件: testi', () => {
	it('kanji solo N5/N4 (gli altri con furigana base[lettura])', () => {
		const fuori: string[] = [];
		for (const t of testiJa()) {
			const senzaRuby = t.replace(/[一-龯々]+\[[^\]]+\]/g, '');
			for (const ch of senzaRuby) if (/[一-龯]/.test(ch) && !isInLevel(ch)) fuori.push(`${ch} in «${t}»`);
		}
		expect(fuori).toEqual([]);
	});
	it('personaggi, sfondi e oggetti esistono', () => {
		const mancano: string[] = [];
		for (const c of Object.values(PERSONAGGI)) if (c.sprite && !existsSync(`static/giorno/ritratti/${c.sprite}-chiusa.png`)) mancano.push(c.sprite);
		for (const l of LUOGHI) if (!existsSync(`static/giorno/sfondi/${l.sfondo}.jpg`)) mancano.push(l.sfondo);
		for (const o of Object.keys(OGGETTI)) if (!existsSync(`static/giorno/oggetti/${iconaOggetto(o)}.png`)) mancano.push(o);
		for (const o of Object.keys(PREMI)) if (!existsSync(`static/giorno/oggetti/${o}.png`)) mancano.push(o);
		// espressioni usate nelle scene
		const facce = (ps: Passo[]): void => {
			for (const p of ps) {
				if ('dice' in p && p.faccia) {
					const f = `static/giorno/ritratti/${PERSONAGGI[p.dice]?.sprite}_${p.faccia}-chiusa.png`;
					if (!existsSync(f)) mancano.push(f);
				}
				if ('scelta' in p) p.scelta.forEach((o) => facce(o.passi ?? []));
				if ('se' in p) { facce(p.allora); facce(p.altrimenti ?? []); }
				if ('prova' in p) { facce(p.prova.ok); facce(p.prova.no); }
			}
		};
		for (const m of MISSIONI) for (const sc of m.scene) facce(sc.passi);
		expect(mancano).toEqual([]);
	});
	it('chi parla è un personaggio conosciuto', () => {
		const ignoti: string[] = [];
		const passi = (ps: Passo[]): void => {
			for (const p of ps) {
				if ('dice' in p && !PERSONAGGI[p.dice]) ignoti.push(p.dice);
				if ('scelta' in p) p.scelta.forEach((o) => passi(o.passi ?? []));
				if ('se' in p) { passi(p.allora); passi(p.altrimenti ?? []); }
				if ('prova' in p) { passi(p.prova.ok); passi(p.prova.no); }
			}
		};
		for (const l of LUOGHI) passi(l.ambiente ?? []);
		for (const m of MISSIONI) for (const sc of m.scene) passi(sc.passi);
		expect(ignoti).toEqual([]);
	});
});

describe('事件: motore', () => {
	it('date e orari', () => {
		expect(dataJa(0)).toBe('4月6日（月）');
		expect(dataJa(2)).toBe('4月8日（水）');
		const s = nuovoStato('ルカ', 'm1');
		expect(apertura(LUOGO.posta, { ...s, minuti: 17 * 60 })).toBe('chiuso');
		expect(apertura(LUOGO.posta, { ...s, minuti: 16 * 60 + 59 })).toBe('aperto');
		expect(apertura(LUOGO.kissa, { ...s, giorno: 2, minuti: 10 * 60 })).toBe('chiuso'); // mercoledì
		expect(apertura(LUOGO.jinja, s)).toBe('bloccato');
		expect(verifica({ giorno: [1, 2], dalle: 600 }, { ...s, giorno: 2, minuti: 600 })).toBe(true);
	});
	it('soldi: opzioni costruite sui soldi veri', () => {
		expect(opzioniSoldi(4010)).toMatchObject({ giusta: 1, opzioni: [{ ja: '5千円ぐらい' }, { ja: '4千円ぐらい' }, { ja: '3千円ぐらい' }, { ja: '2千円ぐらい' }] });
		expect(opzioniSoldi(2730).opzioni[opzioniSoldi(2730).giusta]!.ja).toBe('3千円ぐらい');
		expect(opzioniSoldi(10400).opzioni.map((o) => o.ja)).toEqual(['1万1千円ぐらい', '1万円ぐらい', '9千円ぐらい', '8千円ぐらい']);
		const poco = opzioniSoldi(600);
		expect(poco.opzioni).toHaveLength(4);
		expect(poco.opzioni[poco.giusta]!.valore).toBe(1000);
	});
	it('soldi: l’opzione più vicina', () => {
		expect(giustaSoldi([10000, 5000, 4000, 2000], 4010)).toBe(2);
		expect(giustaSoldi([10000, 5000, 4000, 2000], 4660)).toBe(1);
	});
});

// Giocatore automatico: va nei luoghi indicati, sceglie la prima opzione,
// risponde giusto alle domande e mostra la prova giusta.
function gioca(s0: Stato, giro: (LuogoId | number | `treno:${LuogoId}`)[], m: Missione = M1, scelte: Record<string, number> = {}): { s: Stato; errori: number } {
	let s = s0;
	let errori = 0;
	for (const dest of giro) {
		if (typeof dest === 'number') {
			s = { ...s, minuti: s.minuti + dest };
			continue;
		}
		if (dest.startsWith('treno:')) s = prendiTreno(s, dest.slice(6) as LuogoId);
		else s = viaggia(s, dest as LuogoId);
		if (apertura(LUOGO[s.luogo], s) !== 'aperto') continue;
		const sc = scenaPer(s.luogo, s, m);
		if (!sc) continue;
		s = { ...s, fatte: [...s.fatte, sc.id] };
		let coda: Passo[] = sc.passi;
		for (;;) {
			const r = avanza(s, coda);
			s = r.stato;
			coda = r.coda;
			const p = r.mostra;
			if (!p) break;
			if ('scelta' in p) coda = [...(p.scelta[scelte[sc.id] ?? 0]!.passi ?? []), ...coda];
			else if ('domanda' in p) {
				const ops = p.domanda.giusta === 'soldi' ? opzioniSoldi(s.soldi) : { opzioni: p.domanda.opzioni, giusta: p.domanda.giusta };
				if (ops.giusta < 0 || ops.giusta >= ops.opzioni.length) errori++;
			} else if ('prova' in p) coda = [...(p.prova.giuste.some((g) => s.oggetti.includes(g)) ? p.prova.ok : p.prova.no), ...coda];
			else if ('fine' in p) s = { ...s, finita: p.fine };
		}
	}
	return { s, errori };
}

describe('事件: missione 1 si può finire', () => {
	it('giro completo in tre giornate', () => {
		let s = nuovoStato('ルカ', 'm1');
		let r = gioca(s, ['casa', 'ufficio', 'shokudo', 'posta', 'ufficio', 'konbini', 'casa']);
		s = r.s;
		expect(s.giorno).toBe(1);
		expect(s.oggetti).not.toContain('portafoglio');
		expect(s.flag).toContain('posta.ok');
		r = gioca(s, ['casa', 'ufficio', 'shokudo', 'konbini', 'koban', 'ufficio', 'casa']);
		s = r.s;
		expect(s.giorno).toBe(2);
		expect(s.oggetti).toContain('portafoglio');
		r = gioca(s, ['casa', 'ufficio', 'parco', 'kissa', 'ufficio', 'panya', 'gakkou', 'casa']);
		s = r.s;
		expect(r.errori).toBe(0);
		expect(s.flag).toContain('grazie.ok');
		expect(s.flag).toContain('regalo.dato');
		expect(s.finita).toBe('はじめての 一週間');
		expect(s.obiettivi.filter((o) => !o.fatto)).toEqual([]);
	});
});

describe('事件: risposte dette a voce', () => {
	it('riconosce l’opzione anche scritta in kanji dal riconoscitore', async () => {
		const { opzioneDetta: od, lettureKanji } = await import('./voce');
		const { readFileSync } = await import('node:fs');
		const letture = lettureKanji(JSON.parse(readFileSync('static/seed-n5n4.json', 'utf8')).words);
		const opzioneDetta = (s: string[], o: string[]) => od(s, o, letture);
		const a = ['はい、よく ねられました。', 'いいえ、あまり ねられませんでした。'];
		expect(opzioneDetta(['はいよく寝られました'], a)).toBe(0);
		expect(opzioneDetta(['いいえあまり寝られませんでした'], a)).toBe(1);
		const b = ['{nome}です。よろしく おねがいします。', 'どうも。'];
		expect(opzioneDetta(['ルカですよろしくお願いします'], b.map((x) => x.replace('{nome}', 'ルカ')))).toBe(0);
		const c = ['さいふを なくしました。', 'さいふを ひろいました。'];
		expect(opzioneDetta(['財布をなくしました'], c)).toBe(0);
		expect(opzioneDetta(['財布を拾いました'], c)).toBe(1);
		expect(opzioneDetta(['今日はいい天気ですね'], c)).toBe(null);
	});
});

describe('事件: nome in katakana', () => {
	it.each([
		['luca', 'ルカ'], ['Giulia', 'ジュリア'], ['chiara', 'キアラ'], ['francesca', 'フランチェスカ'],
		['marco', 'マルコ'], ['giorgio', 'ジョルジョ'], ['simone', 'シモネ'], ['ルカ', 'ルカ'], ['', 'ルカ']
	])('%s → %s', async (n, k) => {
		const { nomeKatakana } = await import('./voce');
		const { romajiToHiragana } = await import('$lib/core/romaji');
		expect(nomeKatakana(n, romajiToHiragana)).toBe(k);
	});
});

describe('事件: salvataggi', () => {
	it('migra completa i salvataggi vecchi e scarta quelli rotti', async () => {
		const { migra } = await import('./motore');
		const vecchio = { versione: 1, nome: 'ルカ', missione: 'm1', giorno: 1, minuti: 600, luogo: 'casa', soldi: 4000, flag: ['x'], oggetti: [], fatte: [], obiettivi: [{ id: 'a', it: 'fare', fatto: false }] };
		const m = migra(vecchio)!;
		expect(m.obiettivi[0]!.ja).toBe('fare');
		expect(m.domande).toEqual({ ok: 0, tot: 0 });
		expect(m.taccuino).toEqual([]);
		expect(migra(null)).toBeNull();
		expect(migra({ versione: 2 })).toBeNull();
	});
});

describe('事件: missione 2 si può finire, continuando dalla 1', () => {
	it('tre giornate col gatto', () => {
		let s = prossimaMissione({ ...nuovoStato('ルカ', 'm1'), giorno: 3, flag: ['d0.casa', 'portafoglio.ok', 'grazie.ok'], finita: 'x' }, M2);
		expect(s.giorno).toBe(7);
		expect(s.finita).toBeUndefined();
		let r = gioca(s, ['casa', 'ufficio', 'shokudo', 'ufficio', 'apartment', 'konbini', 'casa'], M2);
		s = r.s;
		expect(s.giorno).toBe(8);
		expect(s.oggetti).toContain('volantino_gatto');
		r = gioca(s, ['casa', 'ufficio', 'kissa', 'parco', 'jinja', 'ufficio', 'casa'], M2);
		s = r.s;
		expect(s.giorno).toBe(9);
		expect(s.flag).toContain('jinja.aperto');
		expect(s.flag).toContain('m2.ciotola');
		r = gioca(s, ['casa', 'ufficio', 'shokudo', 'ufficio', 30, 'jinja', 'casa'], M2);
		s = r.s;
		expect(r.errori).toBe(0);
		expect(s.flag).toContain('mike.ok');
		expect(s.finita).toBe('いなくなった ミケ');
		expect(s.obiettivi.filter((o) => !o.fatto).map((o) => o.id)).toEqual([]);
	});
});

describe('事件: missione 3 si può finire (indagine, carta IC, treno, hotel)', () => {
	it('tre giornate in ufficio e in centro', () => {
		let s = nuovoStato('ルカ', 'm3', M3.inizio);
		s = { ...s, soldi: 40000 };
		let r = gioca(s, ['casa', 'ufficio', 'shokudo', 'ufficio', 'casa'], M3);
		s = r.s;
		expect(s.giorno).toBe(15);
		// martedì: si interroga una persona per volta (la scelta n.0, poi 1, poi 2), poi magazzino e confronto
		const giro = (i: number) => gioca(s, ['ufficio'], M3, { 'm3-interroga': i }).s;
		s = gioca(s, ['casa', 'ufficio'], M3).s; // la scoperta del furto
		s = gioca(s, ['parco'], M3).s;
		s = giro(0);
		s = gioca(s, ['parco', 'ufficio'], M3, { 'm3-interroga': 1 }).s;
		s = gioca(s, ['parco', 'ufficio'], M3, { 'm3-interroga': 2 }).s;
		expect(s.flag).toEqual(expect.arrayContaining(['m3.tanaka', 'm3.suzuki', 'm3.hayashi', 'm3.magazzino.hint']));
		s = gioca(s, ['parco', 'ufficio'], M3).s; // magazzino: lo scontrino
		expect(s.oggetti).toContain('scontrino_copie');
		s = gioca(s, ['parco', 'ufficio'], M3, { 'm3-interroga': 3 }).s; // confronto con la prova
		expect(s.flag).toContain('m3.confessa');
		r = gioca(s, ['konbini', 'ufficio', 'eki', 480, 'casa'], M3);
		s = r.s;
		expect(s.flag).toEqual(expect.arrayContaining(['m3.ritrovato', 'm3.consegnato', 'treno.ok']));
		expect(s.giorno).toBe(16);
		r = gioca(s, ['casa', 'eki', 'treno:eki2', 'hotel', 'treno:eki', 'casa', 360, 'casa'], M3);
		s = r.s;
		expect(r.errori).toBe(0);
		expect(s.flag).toContain('m3.riunione');
		expect(s.finita).toBe('消[き]えた 資料[しりょう]');
	});
});
