import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { isInLevel } from '$lib/data/kanjiN4';
import { apertura, avanza, dataJa, giustaSoldi, nuovoStato, opzioniSoldi, scenaPer, verifica, viaggia } from './motore';
import { LUOGHI, LUOGO, OGGETTI, PERSONAGGI, iconaOggetto } from './mondo';
import { M1 } from './missioni/m1';
import { UI } from './ui';
import type { LuogoId, Passo, Stato, Testo } from './tipi';

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
	for (const sc of M1.scene) passi(sc.passi);
	out.push(M1.titolo);
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
		for (const sc of M1.scene) passi(sc.passi);
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
function gioca(s0: Stato, giro: LuogoId[]): { s: Stato; errori: number } {
	let s = s0;
	let errori = 0;
	for (const dest of giro) {
		s = viaggia(s, dest);
		if (apertura(LUOGO[dest], s) !== 'aperto') continue;
		const sc = scenaPer(dest, s, M1);
		if (!sc) continue;
		s = { ...s, fatte: [...s.fatte, sc.id] };
		let coda: Passo[] = sc.passi;
		for (;;) {
			const r = avanza(s, coda);
			s = r.stato;
			coda = r.coda;
			const p = r.mostra;
			if (!p) break;
			if ('scelta' in p) coda = [...(p.scelta[0]!.passi ?? []), ...coda];
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
