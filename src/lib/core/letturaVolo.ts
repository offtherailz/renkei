// 📖 Lettura al volo — velocità sul 読解 N4 d'esame (短文 / 中文 / 情報検索).
// Tecnica allenata: PRIMA la domanda (sai cosa cerchi), POI il testo a tempo,
// con il budget per domanda del mondai (EXAM_N4_SECTIONS.tempo_medio_sec).
// Logica pura (test in letturaVolo.test.ts).

import { stripFurigana } from './contestoAscolto';

export interface TestoDiviso {
	scena: string; // 〔メール〕 → 'メール' ('' se assente)
	corpo: string; // il testo da leggere (con furigana)
	domanda: string; // dopo «問:»
}

export function dividiTesto(prompt: string): TestoDiviso {
	let s = prompt;
	let domanda = '';
	const qi = s.lastIndexOf('問:');
	if (qi >= 0) {
		domanda = s.slice(qi + 2).trim();
		s = s.slice(0, qi);
	}
	let scena = '';
	const sm = s.match(/^〔([^〕]*)〕\s*/);
	if (sm) {
		scena = sm[1]!.trim();
		s = s.slice(sm[0].length);
	}
	return { scena, corpo: s.trim(), domanda };
}

// Caratteri «letti» (senza furigana né spazi): base per la velocità.
export const caratteri = (t: string): number => stripFurigana(t).replace(/[\s　]/g, '').length;

// Caratteri al minuto.
export function cpm(chars: number, secondi: number): number {
	return secondi > 0 ? Math.round((chars / secondi) * 60) : 0;
}

// Frasi del testo (per evidenziare dove sta la risposta): si spezza dopo 。！？ e
// sui separatori dei volantini (／).
export function frasi(corpo: string): string[] {
	return corpo
		.split(/(?<=[。！？!?／])/)
		.map((f) => f.trim())
		.filter((f) => f && !/^[。！？!?／]+$/.test(f));
}

// Le citazioni della spiegazione («…» o 「…」): la prova nel testo.
export function citazioni(spiegazione: string): string[] {
	const out: string[] = [];
	for (const m of spiegazione.matchAll(/[«「]([^»」]{2,})[»」]/g)) out.push(m[1]!);
	// anche tra parentesi, se dentro c'è giapponese: «(それだけが残念)»
	for (const m of spiegazione.matchAll(/[（(]([^）)]{2,})[）)]/g))
		if (/[\u3040-\u30ff\u4e00-\u9fff]/.test(m[1]!)) out.push(m[1]!);
	return out;
}

// Indice della frase che contiene la prova (confronto senza furigana/spazi).
// Prova anche con i primi caratteri della citazione (le spiegazioni a volte
// accorciano con «…»). -1 se non trovata.
export function frasePerProva(corpo: string, spiegazione: string): number {
	const norm = (t: string) => stripFurigana(t).replace(/[\s　…]/g, '');
	const fs = frasi(corpo).map(norm);
	for (const c of citazioni(spiegazione)) {
		const pezzi = c.split('…').map(norm).filter((p) => p.length >= 2);
		for (const p of pezzi) {
			const chiave = p.slice(0, Math.min(p.length, 8));
			const i = fs.findIndex((f) => f.includes(chiave));
			if (i >= 0) return i;
		}
	}
	return -1;
}

// Budget di tempo per un testo: 15 s per domanda e opzioni + il testo letto a
// VELOCITA_OBIETTIVO car/min, tra 25 s e il ritmo d'esame del mondai. Il ritmo
// ufficiale per domanda (tempo di sezione diviso) è largo per un testo con UNA
// domanda: così il cronometro misura davvero la velocità di lettura.
export const VELOCITA_OBIETTIVO = 150;
export function budgetTesto(chars: number, maxEsame: number, fattore = 1): number {
	const base = Math.min(maxEsame, Math.max(25, Math.round(15 + (chars / VELOCITA_OBIETTIVO) * 60)));
	return Math.round(base * fattore);
}

export const MONDAI_LETTURA = ['dokkai-tan', 'dokkai-chu', 'joho'] as const;
export type MondaiLettura = (typeof MONDAI_LETTURA)[number];

export const TECNICA: Record<MondaiLettura, { nome: string; jp: string; tip: string }> = {
	'dokkai-tan': {
		nome: 'Brano breve',
		jp: '内容理解（短文）',
		tip: 'Leggi la domanda, poi cerca SOLO la frase che risponde. Dopo でも / しかし / ただ c’è quasi sempre il punto.'
	},
	'dokkai-chu': {
		nome: 'Brano medio',
		jp: '内容理解（中文）',
		tip: 'Le domande seguono l’ordine del testo. Il «perché» sta vicino a 〜から / 〜ので; l’opinione dell’autore alla fine.'
	},
	joho: {
		nome: 'Ricerca di informazioni',
		jp: '情報検索',
		tip: 'NON leggere tutto: dalla domanda prendi le condizioni (giorno, ora, età, prezzo) e cercale nel volantino. Occhio a ※ e alle eccezioni.'
	}
};
