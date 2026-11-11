// 事件 — il calendario: giorni della storia, feste, missioni, appuntamenti e la
// giornata tipo (ufficio, pranzo). Funzioni pure: la pagina le mostra.
import { PRIMO_GIORNO, settimana } from './motore';
import type { Missione, Obiettivo, Stato, Testo } from './tipi';

const h = (ore: number, min = 0): number => ore * 60 + min;
export const UN_GIORNO = 86_400_000;

// data vera di un giorno della storia (0 = lunedì 6 aprile 2026)
export const dataDi = (g: number): Date => new Date(PRIMO_GIORNO.anno, PRIMO_GIORNO.mese - 1, PRIMO_GIORNO.giorno + g);
export const giornoDi = (d: Date): number => Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - dataDi(0).getTime()) / UN_GIORNO);

// feste nazionali (Golden Week)
export const FESTIVI: Record<number, Testo> = {
	23: { ja: '昭和[しょうわ]の日', it: 'Festa di Shōwa' },
	27: { ja: 'けんぽう きねんび', it: 'Festa della Costituzione' },
	28: { ja: 'みどりの日', it: 'Festa del Verde' },
	29: { ja: 'こどもの日', it: 'Festa dei bambini' },
	30: { ja: 'ふりかえ きゅうじつ', it: 'Festivo di recupero' }
};
export const festivo = (g: number): boolean => g in FESTIVI || settimana(g) >= 5;

// i giorni di una missione: quelli delle sue scene a giorno fisso (senza la rete di sicurezza)
export function giorniMissione(m: Missione): [number, number] | null {
	const gg = m.scene.filter((sc) => !sc.ripiego && typeof sc.quando.giorno === 'number').map((sc) => sc.quando.giorno as number);
	return gg.length ? [Math.min(...gg), Math.max(...gg)] : null;
}

// la giornata tipo: ufficio nei giorni feriali
export interface Voce {
	dalle?: number;
	alle?: number;
	ja: string;
	it: string;
}
export function routine(g: number): Voce[] {
	if (festivo(g)) return [{ ja: '休み', it: 'Giorno libero' }];
	return [
		{ dalle: h(9), ja: '会社（9時までに）', it: 'In ufficio (entro le 9)' },
		{ dalle: h(12), alle: h(13, 30), ja: '昼休み', it: 'Pausa pranzo' },
		{ dalle: h(17, 30), ja: '仕事 終わり', it: 'Fine del lavoro' }
	];
}

// appuntamenti di un giorno: gli obiettivi con data
export const appuntamenti = (s: Stato, g: number): Obiettivo[] =>
	s.obiettivi.filter((o) => o.quando?.giorno === g).sort((a, b) => (a.quando!.dalle ?? a.quando!.alle ?? 0) - (b.quando!.dalle ?? b.quando!.alle ?? 0));

// il prossimo appuntamento ancora da fare (da oggi in poi)
export function prossimo(s: Stato): Obiettivo | null {
	return (
		s.obiettivi
			.filter((o) => !o.fatto && o.quando && (o.quando.giorno > s.giorno || (o.quando.giorno === s.giorno && (o.quando.alle ?? 24 * 60) > s.minuti)))
			.sort((a, b) => a.quando!.giorno - b.quando!.giorno || (a.quando!.dalle ?? 0) - (b.quando!.dalle ?? 0))[0] ?? null
	);
}

// le settimane (da lunedì) del mese che contiene il giorno g: celle = giorno della storia o null
export function mese(g: number): { anno: number; mese: number; settimane: (number | null)[][] } {
	const d = dataDi(g);
	const primo = new Date(d.getFullYear(), d.getMonth(), 1);
	const giorni = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
	const vuote = (primo.getDay() + 6) % 7; // lunedì = 0
	const celle: (number | null)[] = [...Array(vuote).fill(null), ...Array.from({ length: giorni }, (_, i) => giornoDi(new Date(d.getFullYear(), d.getMonth(), i + 1)))];
	while (celle.length % 7) celle.push(null);
	const settimane: (number | null)[][] = [];
	for (let i = 0; i < celle.length; i += 7) settimane.push(celle.slice(i, i + 7));
	return { anno: d.getFullYear(), mese: d.getMonth() + 1, settimane };
}
