// 📖 Lettura al volo — velocità sul 読解 N4 d'esame (短文 / 中文 / 情報検索).
// Tecnica allenata: PRIMA la domanda (sai cosa cerchi), POI il testo a tempo,
// con il budget per domanda del mondai (EXAM_N4_SECTIONS.tempo_medio_sec).
// Logica pura (test in letturaVolo.test.ts).

import { stripFurigana, classificaDomanda, TIPO_LABEL, type TipoDomanda } from './contestoAscolto';

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

// ── 🎯 Cosa cogliere (spiegazione sempre visibile, anche se indovini) ────────


export const CONSIGLIO_LETTURA: Record<TipoDomanda, string> = {
	prima: 'Segui l’ordine: まず / 最初に / 〜てから / 〜前に.',
	azione: 'Cosa si deve fare: cerca 〜てください / 〜なければなりません / 〜こと, e le condizioni (〜とき / 〜場合).',
	perche: 'Cerca la causa: 〜から / 〜ので / 〜ため / 〜て, spesso vicino a でも / しかし.',
	quando: 'Cerca date e orari, e i cambi: 変更 / 〜に変わりました / 予定でしたが.',
	dove: 'Cerca i luoghi (〜で / 〜に) e se il posto cambia.',
	chi: 'Cerca le persone e cosa fa ciascuna: chi scrive, chi riceve, chi può.',
	come: 'Cerca il mezzo o il modo: 〜で / 〜て / 方法.',
	prezzo: 'Fai il conto: prezzo base, sconti (〜引き), condizioni (学生 / ※).',
	quanti: 'Conta: numeri e limiti (〜まで / 〜以上 / 〜以内).',
	cosa: 'Trova la frase con la parola della domanda; leggi quella e la successiva. Scarta ciò che non è detto o è negato.'
};

export const SEGNALI_LETTURA: { jp: string; it: string; re: RegExp }[] = [
	{ jp: 'でも / しかし / けれど', it: 'svolta: il punto viene dopo', re: /でも|しかし|けれど|けど/ },
	{ jp: 'ただ / ただし', it: 'eccezione o limite', re: /ただし|ただ、|ただ /},
	{ jp: '〜から / 〜ので / 〜ため', it: 'causa', re: /から|ので|ため/ },
	{ jp: 'だから / それで', it: 'conseguenza', re: /だから|それで/ },
	{ jp: '※', it: 'nota: regola speciale', re: /※/ },
	{ jp: '変更 / 変わり / 予定でした', it: 'cambio di programma', re: /変更|変わ|予定でした|予定だった/ },
	{ jp: '〜まで / 〜以内 / 〜以上', it: 'limite', re: /まで|以内|以上/ },
	{ jp: '〜だけ / 〜しか', it: 'solo', re: /だけ|しか/ },
	{ jp: '〜てください / 〜こと', it: 'istruzione', re: /てください|でください|こと。/ },
	{ jp: '今は / 今では / 最初は', it: 'prima ≠ adesso', re: /今は|今では|最初は|前は/ }
];

export interface NotaOpzione {
	scelta: string;
	nota: string;
	nelTesto: boolean; // la scelta compare nel testo (= trappola tipica)
}

const pulito = (t: string) => stripFurigana(t).replace(/[\s　、。]/g, '');

// Le opzioni sbagliate con la loro nota. `perche_sbagliate` è allineato alle
// opzioni non giuste nell'ordine in cui compaiono; se la nota manca, si dice se
// l'opzione compare nel testo (trappola) o no.
export function noteAltre(choices: string[], correct: number, perche: string[], testo: string): NotaOpzione[] {
	const t = pulito(testo);
	const out: NotaOpzione[] = [];
	let k = 0;
	choices.forEach((c, i) => {
		if (i === correct) return;
		const scritta = (perche[k++] ?? '').trim();
		const p = pulito(c);
		const nelTesto = p.length >= 2 && t.includes(p);
		const nota = scritta || (nelTesto ? 'compare nel testo, ma non risponde alla domanda: è la trappola' : 'non compare nel testo');
		out.push({ scelta: c, nota, nelTesto });
	});
	return out;
}

export interface Spiegazione {
	tipo: TipoDomanda;
	tipoLabel: string;
	consiglio: string;
	chiave: number; // indice della frase chiave in frasi(corpo), -1 se non trovata
	altre: NotaOpzione[];
	segnali: { jp: string; it: string }[];
}

export function spiegaLettura(corpo: string, domanda: string, choices: string[], correct: number, percheGiusta: string, percheSbagliate: string[]): Spiegazione {
	const tipo = classificaDomanda(domanda);
	let chiave = frasePerProva(corpo, percheGiusta);
	// senza citazione: la frase che contiene la risposta giusta
	if (chiave < 0) {
		const r = pulito(choices[correct] ?? '');
		if (r.length >= 2) chiave = frasi(corpo).findIndex((f) => pulito(f).includes(r));
	}
	const testo = stripFurigana(corpo);
	return {
		tipo,
		tipoLabel: TIPO_LABEL[tipo],
		consiglio: CONSIGLIO_LETTURA[tipo],
		chiave,
		altre: noteAltre(choices, correct, percheSbagliate, corpo),
		segnali: SEGNALI_LETTURA.filter((s) => s.re.test(testo)).map(({ jp, it }) => ({ jp, it }))
	};
}
