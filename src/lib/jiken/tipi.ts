// 事件 — tipi del motore: luoghi, personaggi, scene e passi sono dati.
// Una missione nuova = nuove scene; il motore non cambia.

export type LuogoId =
	| 'casa' | 'ufficio' | 'konbini' | 'shokudo' | 'posta' | 'panya' | 'hanaya'
	| 'koban' | 'parco' | 'gakkou' | 'kissa' | 'apartment' | 'eki' | 'jinja' | 'tera';

export interface Orario {
	giorni?: number[]; // giorni della settimana aperti (0 = lunedì … 6 = domenica); assente = tutti
	fasce: [number, number][]; // minuti dall'inizio del giorno, [apre, chiude)
}

export interface Luogo {
	id: LuogoId;
	nome: string; // con furigana base[lettura] dove serve
	it: string;
	icona: string;
	sfondo: string; // file in static/giorno/sfondi
	x: number; // centro dell'edificio sulla mappa disegnata, in % della larghezza
	y: number; // … e dell'altezza
	orario?: Orario; // assente = sempre aperto
	orarioIt?: string;
	bloccato?: Condizione; // finché è vera il luogo è chiuso col lucchetto
	bloccatoIt?: string;
	ambiente?: Passo[]; // cosa succede se non c'è una scena della storia
}

export interface Personaggio {
	nome: string; // come appare nel dialogo
	sprite: string | null; // ritratto in static/giorno/ritratti (null = te stesso, o voce al telefono)
	voce: 'F' | 'M';
}

export interface Condizione {
	giorno?: number | number[]; // giorno della storia (0 = primo)
	dalle?: number; // minuti
	alle?: number; // minuti, escluso
	flag?: string[]; // tutti presenti
	nonFlag?: string[]; // nessuno presente
	oggetti?: string[];
	nonOggetti?: string[];
}

export interface Opzione {
	ja: string;
	it?: string;
	passi?: Passo[];
}

export interface Domanda {
	ja: string; // la domanda (letta dalla voce narrante)
	it: string;
	opzioni: { ja: string; it: string; valore?: number }[];
	giusta: number | 'soldi'; // 'soldi' = l'opzione col valore più vicino ai soldi che hai
	spiega: string;
}

export interface Prova {
	ja: string; // la richiesta (chi parla è l'ultimo personaggio)
	it: string;
	giuste: string[]; // oggetti del taccuino che vanno bene
	ok: Passo[];
	no: Passo[];
}

// Un passo della scena. Si scrive come oggetto con una sola chiave principale.
export type Passo =
	| { dice: string; ja: string; it: string; taccuino?: boolean }
	| { io: string; it: string } // battuta tua (testo che dici tu)
	| { narra: string } // narrazione in italiano
	| { scelta: Opzione[] }
	| { se: Condizione; allora: Passo[]; altrimenti?: Passo[] }
	| { domanda: Domanda }
	| { prova: Prova }
	| { prendi: string; it: string }
	| { togli: string }
	| { flag: string }
	| { obiettivo: string; it: string } // aggiunge un obiettivo (id + testo per il taccuino)
	| { completa: string } // segna un obiettivo come fatto
	| { minuti: number }
	| { ora: number } // porta l'orologio almeno a quest'ora
	| { soldi: number } // + entrate, − spese
	| { vai: LuogoId }
	| { dormi: true }
	| { fine: string }; // missione conclusa (titolo)

export interface Scena {
	id: string;
	luogo: LuogoId;
	quando: Condizione;
	ripeti?: boolean; // di norma una scena si gioca una volta sola
	passi: Passo[];
}

export interface Missione {
	id: string;
	titolo: string;
	it: string;
	scene: Scena[];
}

export interface Obiettivo {
	id: string;
	it: string;
	fatto: boolean;
}

export interface Appunto {
	giorno: number;
	chi: string;
	ja: string;
	it: string;
}

export interface Tappa {
	giorno: number;
	minuti: number;
	luogo: LuogoId;
}

export interface Stato {
	versione: 1;
	nome: string;
	missione: string;
	giorno: number;
	minuti: number;
	luogo: LuogoId;
	soldi: number;
	flag: string[];
	oggetti: string[];
	fatte: string[]; // scene già giocate
	obiettivi: Obiettivo[];
	taccuino: Appunto[];
	percorso: Tappa[];
	domande: { ok: number; tot: number };
	finita?: string;
}
