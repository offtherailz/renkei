// 事件 — punteggio delle missioni e timbri (はんこ) del quaderno.
// Il voto della missione conta solo le domande della storia (sempre le stesse,
// quindi confrontabili se la rigiochi); chiacchiere e treno vanno nel «ripasso».
// I timbri sono traguardi a tre livelli per tipo, calcolati dallo stato.
import type { Domanda, Stato } from './tipi';
import { PREMI } from './giochi';

export type Conta = { ok: number; tot: number };

// stelle di una missione: ★★★ dal 90%, ★★ dal 70%, ★ altrimenti (0 senza domande)
export function stelle(c: Conta | undefined): number {
	if (!c || !c.tot) return 0;
	const p = c.ok / c.tot;
	return p >= 0.9 ? 3 : p >= 0.7 ? 2 : 1;
}
export const percento = (c: Conta | undefined): number => (c && c.tot ? Math.round((c.ok / c.tot) * 100) : 0);

const piu = (c: Conta | undefined, ok: boolean): Conta => ({ ok: (c?.ok ?? 0) + (ok ? 1 : 0), tot: (c?.tot ?? 0) + 1 });
const conta = (s: Stato, chiavi: string[]): Record<string, number> => {
	const out = { ...s.contatori };
	for (const k of chiavi) out[k] = (out[k] ?? 0) + 1;
	return out;
};

// Una risposta: dove va (storia della missione o ripasso) e quali contatori sale.
export function registraRisposta(s: Stato, ok: boolean, d: { domanda?: Domanda; libera?: boolean; treno?: boolean }): Stato {
	const domande = piu(s.domande, ok);
	const storia = !d.libera && !d.treno;
	const chiavi: string[] = [];
	if (ok) {
		chiavi.push('giuste');
		if (d.treno) chiavi.push('treno');
		if (d.domanda?.ascolto) chiavi.push('ascolto');
		if (d.domanda?.tipo) chiavi.push(d.domanda.tipo);
	}
	return {
		...s,
		domande,
		punteggi: storia ? { ...s.punteggi, [s.missione]: piu(s.punteggi[s.missione], ok) } : s.punteggi,
		ripasso: storia ? s.ripasso : piu(s.ripasso, ok),
		contatori: conta(s, chiavi)
	};
}

export const aggiungiConta = (s: Stato, chiave: string): Stato => ({ ...s, contatori: conta(s, [chiave]) });

// ── timbri
export interface Timbro {
	id: string;
	kanji: string; // al centro del timbro (N5/N4)
	ja: string; // il nome, con furigana fuori livello
	it: string;
	soglie: [number, number, number];
}
export interface Totali {
	chiacchiere: number;
	persone: number;
	missioni: number;
	stelleTre: number; // missioni finite con ★★★ (dal migliore risultato)
}

export function timbri(t: Totali): Timbro[] {
	const premi = Object.keys(PREMI).length;
	return [
		{ id: 'giuste', kanji: '正', ja: 'よく できました', it: 'Risposte giuste', soglie: [10, 50, 150] },
		{ id: 'meteo', kanji: '天', ja: '天気の 人', it: 'Meteo capiti', soglie: [1, 5, 10] },
		{ id: 'ascolto', kanji: '聞', ja: '聞き上手', it: 'Ascolti giusti', soglie: [5, 20, 50] },
		{ id: 'notizia', kanji: '知', ja: '物知り', it: 'Notizie del TG capite', soglie: [1, 5, 10] },
		{ id: 'treno', kanji: '電', ja: '電車の 中で', it: 'Domande ★ in treno', soglie: [5, 20, 50] },
		{ id: 'puntuale', kanji: '時', ja: '時間を まもる', it: 'Mattine puntuali', soglie: [3, 10, 20] },
		{ id: 'chiacchiere', kanji: '話', ja: '町の こえ', it: 'Chiacchiere sentite', soglie: [5, 20, Math.max(21, t.chiacchiere)] },
		{ id: 'persone', kanji: '人', ja: 'かおが 広い', it: 'Persone conosciute', soglie: [5, 15, Math.max(16, t.persone)] },
		{ id: 'premi', kanji: '楽', ja: 'UFOキャッチャー名人[めいじん]', it: 'Premi vinti', soglie: [1, 5, Math.max(6, premi)] },
		{ id: 'quiz', kanji: '問', ja: 'クイズ王[おう]', it: 'Record alla クイズ', soglie: [50, 200, 500] },
		{ id: 'stelle', kanji: '名', ja: '名探偵[めいたんてい]', it: 'Missioni con ★★★', soglie: [1, 3, Math.max(4, t.missioni)] }
	];
}

// quanto vale adesso il contatore di un timbro
export function valore(id: string, s: Stato, t: Totali): number {
	if (id === 'chiacchiere') return s.sentite.length;
	if (id === 'persone') return s.incontrati.length;
	if (id === 'premi') return new Set(s.collezione.map((p) => p.premio)).size;
	if (id === 'quiz') return s.classifica[0]?.punti ?? 0;
	if (id === 'stelle') return t.stelleTre;
	return s.contatori[id] ?? 0;
}

export const livello = (tb: Timbro, v: number): number => tb.soglie.filter((x) => v >= x).length;

export function livelli(s: Stato, t: Totali): Record<string, number> {
	return Object.fromEntries(timbri(t).map((tb) => [tb.id, livello(tb, valore(tb.id, s, t))]));
}

// timbri saliti di livello rispetto a quelli già visti
export function nuoviTimbri(visti: Record<string, number>, ora: Record<string, number>): string[] {
	return Object.keys(ora).filter((k) => (ora[k] ?? 0) > (visti[k] ?? 0));
}
