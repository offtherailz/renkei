// 事件 — la sala giochi di 山野駅前: UFOキャッチャー e クイズ. Logica pura
// (niente DOM): scelta delle parole, turni, pagamento, collezione e classifica.
import { isInLevel } from '$lib/data/kanjiN4';
import type { LuogoId, Stato } from './tipi';

export const PARTITA = { prezzo: 100, minuti: 15 };
export const LUOGO_GIOCHI: LuogoId = 'gamecenter';
const FINE_GIORNO = 23 * 60 + 59;

// peluche dell'UFOキャッチャー (static/giorno/oggetti/<id>.png)
export const PREMI: Record<string, { ja: string; it: string }> = {
	tanuki: { ja: 'たぬき', it: 'tanuki' },
	maneki_neko: { ja: 'まねきねこ', it: 'gatto portafortuna' },
	shiba: { ja: 'しばいぬ', it: 'cane shiba' },
	daruma: { ja: 'だるま', it: 'daruma rosso' },
	daruma_blu: { ja: '青い だるま', it: 'daruma blu' },
	peluche_onigiri: { ja: 'おにぎりの ぬいぐるみ', it: 'peluche onigiri' },
	peluche_sushi: { ja: 'すしの ぬいぐるみ', it: 'peluche sushi' },
	panda: { ja: 'パンダ', it: 'panda' },
	rana: { ja: 'かえる', it: 'rana' }
};
export const ID_PREMI = Object.keys(PREMI);

// una parola del vocabolario, come la usano i giochi
export interface ParolaGioco {
	id: string;
	scrittura: string;
	lettura: string;
	it: string;
}

interface ParolaSeed {
	id: string;
	scrittura: string;
	lettura: string;
	livello_jlpt?: string;
	tipo_jp?: string;
	significato?: { it?: string[] };
}

// Parole adatte ai giochi: N5/N4, nomi, kanji solo N5/N4, brevi, con un
// significato italiano. Una per scrittura e una per lettura (niente doppioni
// che renderebbero ambigua la risposta).
export function paroleGioco(words: ParolaSeed[]): ParolaGioco[] {
	const out: ParolaGioco[] = [];
	const scritture = new Set<string>();
	const letture = new Set<string>();
	const significati = new Set<string>();
	for (const w of words) {
		if (w.livello_jlpt !== 'N5' && w.livello_jlpt !== 'N4') continue;
		if (!w.tipo_jp?.startsWith('名詞')) continue;
		const it = w.significato?.it?.[0]?.trim();
		if (!it || !w.scrittura || !w.lettura) continue;
		if (w.lettura.length < 2 || w.scrittura.length > 6) continue;
		if ([...w.scrittura].some((ch) => /[一-龯]/.test(ch) && !isInLevel(ch))) continue;
		if (!/^[ぁ-んァ-ヶー一-龯々]+$/.test(w.scrittura)) continue;
		if (scritture.has(w.scrittura) || letture.has(w.lettura) || significati.has(it)) continue;
		scritture.add(w.scrittura);
		letture.add(w.lettura);
		significati.add(it);
		out.push({ id: w.id, scrittura: w.scrittura, lettura: w.lettura, it });
	}
	return out;
}

export const conKanji = (p: ParolaGioco): boolean => /[一-龯々]/.test(p.scrittura);

// estrazioni senza ripetizioni, con un generatore che si può fissare nei test
type Caso = () => number;
function mescola<T>(xs: readonly T[], r: Caso): T[] {
	const a = [...xs];
	for (let i = a.length - 1; i > 0; i -= 1) {
		const j = Math.floor(r() * (i + 1));
		[a[i], a[j]] = [a[j]!, a[i]!];
	}
	return a;
}

// ── UFOキャッチャー: n peluche, ognuno col cartellino di una parola; la voce
// dice quella giusta.
export interface PeluchePosto {
	premio: string;
	parola: ParolaGioco;
}
export interface TurnoUfo {
	posti: PeluchePosto[];
	giusto: number;
}
export function turnoUfo(parole: ParolaGioco[], n = 5, r: Caso = Math.random): TurnoUfo {
	// quasi tutte coi kanji (le parole in katakana per un italiano sono facili), una qualsiasi
	const kanji = mescola(parole.filter(conKanji), r).slice(0, n - 1);
	const altra = mescola(parole, r).find((p) => !kanji.includes(p));
	const scelte = mescola(altra ? [...kanji, altra] : kanji, r);
	const premi = mescola(ID_PREMI, r);
	const posti = scelte.map((parola, i) => ({ premio: premi[i % premi.length]!, parola }));
	return { posti, giusto: Math.floor(r() * posti.length) };
}

// ── クイズ: lettura di una parola coi kanji, o significato di una parola.
export interface DomandaQuiz {
	tipo: 'lettura' | 'significato';
	parola: ParolaGioco;
	opzioni: string[];
	giusta: number;
}
export function domandaQuiz(parole: ParolaGioco[], r: Caso = Math.random, evita: string[] = []): DomandaQuiz {
	const libere = parole.filter((p) => !evita.includes(p.id));
	const pool = libere.length >= 4 ? libere : parole;
	const tipo = r() < 0.5 ? 'lettura' : 'significato';
	// letture: solo parole coi kanji; significati: quasi sempre coi kanji anche loro
	const candidati = tipo === 'lettura' || r() < 0.8 ? pool.filter(conKanji) : pool;
	const parola = mescola(candidati.length ? candidati : pool, r)[0]!;
	const valore = (p: ParolaGioco): string => (tipo === 'lettura' ? p.lettura : p.it);
	// per le letture, distrattori della stessa lunghezza (più difficili da scartare)
	const altre = parole.filter((p) => p.id !== parola.id && valore(p) !== valore(parola));
	const simili = tipo === 'lettura' ? altre.filter((p) => Math.abs(p.lettura.length - parola.lettura.length) <= 1) : altre;
	const distrattori = mescola(simili.length >= 3 ? simili : altre, r).slice(0, 3).map(valore);
	const opzioni = mescola([valore(parola), ...distrattori], r);
	return { tipo, parola, opzioni, giusta: opzioni.indexOf(valore(parola)) };
}
export const SECONDI_QUIZ = 10;
export const VITE_QUIZ = 3;
// punti: 10 a risposta, più un secondo di bonus per ogni secondo avanzato
export const puntiRisposta = (secondiRimasti: number): number => 10 + Math.max(0, Math.floor(secondiRimasti));

// ── stato: pagare la partita, collezione dei premi, classifica del quiz
export function puoiGiocare(s: Stato): boolean {
	return s.oggetti.includes('portafoglio') && s.soldi >= PARTITA.prezzo;
}
export function pagaPartita(s: Stato): Stato | null {
	if (!puoiGiocare(s)) return null;
	return { ...s, soldi: s.soldi - PARTITA.prezzo, minuti: Math.min(s.minuti + PARTITA.minuti, FINE_GIORNO) };
}
export function vinciPremio(s: Stato, posto: PeluchePosto): Stato {
	const p = posto.parola;
	return { ...s, collezione: [...s.collezione, { premio: posto.premio, ja: p.scrittura, lettura: p.lettura, it: p.it, giorno: s.giorno }] };
}
export const MAX_CLASSIFICA = 5;
// aggiunge un punteggio alla classifica (i 5 migliori); torna anche il posto (-1 = fuori)
export function registraPunti(s: Stato, punti: number): { stato: Stato; posto: number } {
	if (punti <= 0) return { stato: s, posto: -1 };
	const voce = { punti, giorno: s.giorno };
	const tutte = [...s.classifica, voce].sort((a, b) => b.punti - a.punti).slice(0, MAX_CLASSIFICA);
	return { stato: { ...s, classifica: tutte }, posto: tutte.indexOf(voce) };
}
