// 事件 — il motore: stato del gioco, tempo, orari, condizioni e lettore delle
// scene. Tutto puro (niente DOM), così si prova con vitest.
import type { Chiacchiera, Condizione, Luogo, LuogoId, Missione, Passo, Scena, Stato } from './tipi';

export const PRIMO_GIORNO = { anno: 2026, mese: 4, giorno: 6 }; // lunedì
export const SVEGLIA = 7 * 60 + 30;
export const VIAGGIO = 15; // minuti per andare da un luogo all'altro
export const SOLDI_INIZIO = 5000;
export const TARDI = 23 * 60; // da quest'ora si torna a casa a dormire
const FINE_GIORNO = 23 * 60 + 59;
const WD = ['月', '火', '水', '木', '金', '土', '日'];
const WD_IT = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];

export const settimana = (giorno: number): number => giorno % 7; // 0 = lunedì

export function dataJa(giorno: number): string {
	const d = new Date(PRIMO_GIORNO.anno, PRIMO_GIORNO.mese - 1, PRIMO_GIORNO.giorno + giorno);
	return `${d.getMonth() + 1}月${d.getDate()}日（${WD[settimana(giorno)]}）`;
}
export function dataIt(giorno: number): string {
	const d = new Date(PRIMO_GIORNO.anno, PRIMO_GIORNO.mese - 1, PRIMO_GIORNO.giorno + giorno);
	return `${WD_IT[settimana(giorno)]} ${d.getDate()} aprile`;
}
export const hhmm = (m: number): string => `${Math.floor(m / 60) % 24}:${String(m % 60).padStart(2, '0')}`;
export const notte = (m: number): boolean => m >= 18 * 60 || m < 6 * 60;
export function fascia(m: number): string {
	if (m < 11 * 60) return '朝';
	if (m < 14 * 60) return '昼';
	if (m < 18 * 60) return '午後';
	return '夜';
}

export function nuovoStato(nome: string, missione: string, inizio?: { giorno: number; flag?: string[]; oggetti?: string[] }): Stato {
	const giorno = inizio?.giorno ?? 0;
	return {
		versione: 1,
		nome,
		missione,
		giorno,
		minuti: SVEGLIA,
		luogo: 'casa',
		soldi: SOLDI_INIZIO,
		flag: inizio?.flag ?? [],
		oggetti: inizio?.oggetti ?? ['portafoglio'],
		fatte: [],
		obiettivi: [],
		taccuino: [],
		percorso: [{ giorno, minuti: SVEGLIA, luogo: 'casa' }],
		domande: { ok: 0, tot: 0 },
		collezione: [],
		incontrati: [],
		sentite: [],
		classifica: []
	};
}

export function verifica(c: Condizione, s: Stato): boolean {
	if (c.giorno !== undefined && !(Array.isArray(c.giorno) ? c.giorno.includes(s.giorno) : c.giorno === s.giorno)) return false;
	if (c.dalle !== undefined && s.minuti < c.dalle) return false;
	if (c.alle !== undefined && s.minuti >= c.alle) return false;
	if (c.flag && !c.flag.every((f) => s.flag.includes(f))) return false;
	if (c.nonFlag && c.nonFlag.some((f) => s.flag.includes(f))) return false;
	if (c.oggetti && !c.oggetti.every((o) => s.oggetti.includes(o))) return false;
	if (c.nonOggetti && c.nonOggetti.some((o) => s.oggetti.includes(o))) return false;
	if (c.soldiMin !== undefined && s.soldi < c.soldiMin) return false;
	return true;
}

// La prima chiacchiera del luogo che non hai ancora sentito (e che vale adesso).
export function chiacchieraPer(l: Luogo, s: Stato): Chiacchiera | null {
	return l.chiacchiere?.find((c) => !s.sentite.includes(c.id) && (!c.quando || verifica(c.quando, s))) ?? null;
}

export type Apertura = 'aperto' | 'chiuso' | 'bloccato';
export function apertura(l: Luogo, s: Stato): Apertura {
	if (l.bloccato && verifica(l.bloccato, s)) return 'bloccato';
	if (!l.orario) return 'aperto';
	if (l.orario.giorni && !l.orario.giorni.includes(settimana(s.giorno))) return 'chiuso';
	return l.orario.fasce.some(([a, b]) => s.minuti >= a && s.minuti < b) ? 'aperto' : 'chiuso';
}

// La prima scena della missione, in quel luogo, che si può giocare adesso.
// inCatena: subito dopo un'altra scena nello stesso luogo; le scene ripetibili
// (es. «con chi parli?») lì non ripartono, se no non si uscirebbe più.
export function scenaPer(luogo: LuogoId, s: Stato, m: Missione, inCatena = false): Scena | null {
	return m.scene.find((sc) => sc.luogo === luogo && (sc.ripeti ? !inCatena : !s.fatte.includes(sc.id)) && verifica(sc.quando, s)) ?? null;
}

export function viaggia(s: Stato, dest: LuogoId): Stato {
	if (dest === s.luogo) return s;
	const minuti = Math.min(s.minuti + VIAGGIO, FINE_GIORNO);
	return { ...s, luogo: dest, minuti, percorso: [...s.percorso, { giorno: s.giorno, minuti, luogo: dest }] };
}

export function dormi(s: Stato): Stato {
	const giorno = s.giorno + 1;
	return { ...s, giorno, minuti: SVEGLIA, luogo: 'casa', percorso: [...s.percorso, { giorno, minuti: SVEGLIA, luogo: 'casa' }] };
}

// Passi che si vedono e aspettano il giocatore; tutti gli altri il motore li
// applica da solo.
export type Visibile = Extract<Passo, { dice: string } | { io: string } | { pensa: string } | { narra: string } | { nota: string } | { scelta: unknown } | { domanda: unknown } | { avviso: unknown } | { prova: unknown } | { fine: string }>;

export function visibile(p: Passo): p is Visibile {
	return 'dice' in p || 'io' in p || 'pensa' in p || 'narra' in p || 'nota' in p || 'scelta' in p || 'domanda' in p || 'avviso' in p || 'prova' in p || 'fine' in p;
}

// Applica un passo che non si vede.
export function applica(s: Stato, p: Passo): Stato {
	if ('prendi' in p) return s.oggetti.includes(p.prendi) ? s : { ...s, oggetti: [...s.oggetti, p.prendi] };
	if ('togli' in p) return { ...s, oggetti: s.oggetti.filter((o) => o !== p.togli) };
	if ('flag' in p) return s.flag.includes(p.flag) ? s : { ...s, flag: [...s.flag, p.flag] };
	if ('obiettivo' in p) {
		if (s.obiettivi.some((o) => o.id === p.obiettivo)) return s;
		return { ...s, obiettivi: [...s.obiettivi, { id: p.obiettivo, ja: p.ja, it: p.it, en: p.en, fatto: false }] };
	}
	if ('completa' in p) return { ...s, obiettivi: s.obiettivi.map((o) => (o.id === p.completa ? { ...o, fatto: true } : o)) };
	if ('minuti' in p) return { ...s, minuti: Math.min(s.minuti + p.minuti, FINE_GIORNO) };
	if ('ora' in p) return { ...s, minuti: Math.min(Math.max(s.minuti, p.ora), FINE_GIORNO) };
	if ('soldi' in p) return { ...s, soldi: s.soldi + p.soldi };
	if ('vai' in p) return viaggia(s, p.vai);
	if ('dormi' in p) return dormi(s);
	return s;
}

// Avanza nella coda dei passi: applica quelli invisibili, apre i «se», si ferma
// al primo passo da mostrare. Torna lo stato nuovo, il passo da mostrare
// (o null a scena finita) e la coda rimasta.
export function avanza(s: Stato, coda: Passo[]): { stato: Stato; mostra: Visibile | null; coda: Passo[] } {
	let stato = s;
	const resto = [...coda];
	while (resto.length) {
		const p = resto.shift()!;
		if ('se' in p) {
			resto.unshift(...(verifica(p.se, stato) ? p.allora : (p.altrimenti ?? [])));
			continue;
		}
		if (visibile(p)) return { stato, mostra: p, coda: resto };
		stato = applica(stato, p);
	}
	return { stato, mostra: null, coda: resto };
}

// Per le domande coi soldi: l'opzione col valore più vicino a quanto hai.
export function giustaSoldi(valori: (number | undefined)[], soldi: number): number {
	let best = 0;
	valori.forEach((v, i) => {
		if (v !== undefined && Math.abs(v - soldi) < Math.abs((valori[best] ?? Infinity) - soldi)) best = i;
	});
	return best;
}

export const conNome = (t: string, nome: string): string => t.replaceAll('{nome}', nome);

// Testo nella lingua scelta (l'inglese, finché manca, ricade sull'italiano).
export const tr = (t: { ja: string; it: string; en?: string }, l: 'ja' | 'it' | 'en'): string => (l === 'ja' ? t.ja : l === 'en' ? (t.en ?? t.it) : t.it);

// Orario di un luogo scritto per esteso: 「月〜金 9:00〜17:00」 / «lun-ven 9:00-17:00».
const GJA = ['月', '火', '水', '木', '金', '土', '日'];
const GIT = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];
export function orarioTesto(o: { giorni?: number[]; fasce: [number, number][] } | undefined): { ja: string; it: string } {
	if (!o) return { ja: 'いつでも 開いて います', it: 'sempre aperto' };
	const g = o.giorni;
	const feriali = g && g.join() === '0,1,2,3,4';
	const ja = !g ? '毎日' : feriali ? '月〜金' : g.map((i) => GJA[i]).join('・');
	const it = !g ? 'tutti i giorni' : feriali ? 'lun-ven' : g.map((i) => GIT[i]).join(', ');
	const f = o.fasce.map(([a, b]) => `${hhmm(a)}〜${hhmm(b)}`).join('、');
	return { ja: `${ja} ${f}`, it: `${it} ${f.replaceAll('〜', '-').replaceAll('、', ', ')}` };
}

// Domanda «quanti soldi ci sono?»: le opzioni si costruiscono intorno ai soldi
// che hai davvero (arrotondati alle migliaia), così il conto torna sempre.
export function opzioniSoldi(soldi: number): { opzioni: { ja: string; it: string; valore: number }[]; giusta: number } {
	const base = Math.max(1000, Math.round(soldi / 1000) * 1000);
	const valori = [base + 1000, base, base - 1000, base - 2000].filter((v) => v > 0);
	while (valori.length < 4) valori.unshift(valori[0]! + 1000);
	const ja = (v: number): string => {
		const man = Math.floor(v / 10000);
		const sen = (v % 10000) / 1000;
		return `${man ? `${man}万` : ''}${sen ? `${sen}千` : ''}円ぐらい`;
	};
	const opzioni = valori.map((v) => ({ ja: ja(v), it: `circa ${v.toLocaleString('it-IT')} yen`, valore: v }));
	return { opzioni, giusta: valori.indexOf(base) };
}

// Salvataggi di versioni precedenti del gioco: completa i campi mancanti,
// così una modifica alla struttura non rompe le partite già iniziate.
export function migra(raw: unknown): Stato | null {
	if (!raw || typeof raw !== 'object') return null;
	const r = raw as Partial<Stato>;
	if (r.versione !== 1 || typeof r.giorno !== 'number' || !r.missione) return null;
	const base = nuovoStato(r.nome ?? 'ルカ', r.missione);
	return {
		...base,
		...r,
		versione: 1,
		minuti: Math.min(r.minuti ?? SVEGLIA, FINE_GIORNO), // partite rimaste «alle 35»
		flag: r.flag ?? [],
		oggetti: r.oggetti ?? [],
		fatte: r.fatte ?? [],
		obiettivi: (r.obiettivi ?? []).map((o) => ({ ...o, ja: o.ja ?? o.it })),
		taccuino: r.taccuino ?? [],
		percorso: r.percorso ?? [],
		domande: r.domande ?? { ok: 0, tot: 0 },
		collezione: r.collezione ?? [],
		incontrati: r.incontrati ?? [],
		sentite: r.sentite ?? [],
		classifica: r.classifica ?? []
	} as Stato;
}

// Missione finita → la successiva nella stessa partita: soldi, oggetti, flag e
// taccuino restano; si salta al giorno in cui comincia la nuova.
export function prossimaMissione(s: Stato, m: { id: string; inizio?: { giorno: number; flag?: string[] } }): Stato {
	const giorno = Math.max(s.giorno, m.inizio?.giorno ?? s.giorno);
	return {
		...s,
		missione: m.id,
		finita: undefined,
		scena: undefined,
		giorno,
		minuti: SVEGLIA,
		luogo: 'casa',
		flag: [...new Set([...s.flag, ...(m.inizio?.flag ?? [])])],
		// gli obiettivi sono della missione: quelli rimasti aperti non si chiuderebbero più
		obiettivi: [],
		percorso: [...s.percorso, { giorno, minuti: SVEGLIA, luogo: 'casa' }]
	};
}

// Obiettivi che una missione può dare (per ripulire salvataggi con obiettivi
// rimasti da una missione precedente, che non si chiuderebbero mai).
export function obiettiviDi(m: Missione): Set<string> {
	const ids = new Set<string>();
	const giro = (ps: Passo[]): void => {
		for (const p of ps) {
			if ('obiettivo' in p) ids.add(p.obiettivo);
			else if ('scelta' in p) p.scelta.forEach((o) => giro(o.passi ?? []));
			else if ('se' in p) { giro(p.allora); giro(p.altrimenti ?? []); }
			else if ('prova' in p) { giro(p.prova.ok); giro(p.prova.no); }
		}
	};
	m.scene.forEach((sc) => giro(sc.passi));
	return ids;
}
export function pulisciObiettivi(s: Stato, m: Missione): Stato {
	const ids = obiettiviDi(m);
	const ok = s.obiettivi.filter((o) => ids.has(o.id));
	return ok.length === s.obiettivi.length ? s : { ...s, obiettivi: ok };
}

// Treno tra さくら町駅 e 山野駅: 10 minuti, 160 yen dalla carta IC (o dai soldi).
export const TRENO = { minuti: 10, prezzo: 160 };
export const STAZIONI: Record<string, LuogoId> = { sakura: 'eki', ekimae: 'eki2' };
export function prendiTreno(s: Stato, verso: LuogoId): Stato {
	// senza i soldi del biglietto si torna a piedi: niente spesa, ma più tempo
	const paga = s.soldi >= TRENO.prezzo;
	const minuti = Math.min(s.minuti + (paga ? TRENO.minuti : 60), FINE_GIORNO);
	return { ...s, luogo: verso, minuti, soldi: paga ? s.soldi - TRENO.prezzo : s.soldi, percorso: [...s.percorso, { giorno: s.giorno, minuti, luogo: verso }] };
}
