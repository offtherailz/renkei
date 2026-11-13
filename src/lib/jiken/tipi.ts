// 事件 — tipi del motore: luoghi, personaggi, scene e passi sono dati.
// Una missione nuova = nuove scene; il motore non cambia.

// lingua dell'interfaccia: i dialoghi restano in giapponese, cambia tutto il resto
export type Lingua = 'ja' | 'it' | 'en';
export interface Testo {
	ja: string;
	it: string;
	en?: string;
}

export type Suono = 'telefono' | 'campanello' | 'stazione' | 'uccellini' | 'grilli';

export type LuogoId =
	| 'casa' | 'ufficio' | 'konbini' | 'shokudo' | 'posta' | 'panya' | 'hanaya'
	| 'koban' | 'parco' | 'gakkou' | 'kissa' | 'apartment' | 'eki' | 'jinja' | 'tera'
	| 'eki2' | 'hotel' | 'ospedale' | 'banca' | 'depa' | 'gamecenter' | 'museo' | 'ramen';

// quartieri: ognuno ha la sua mappa (static/giorno/mappa/<id>-giorno/notte.jpg)
export type Quartiere = 'sakura' | 'ekimae';

export interface Orario {
	giorni?: number[]; // giorni della settimana aperti (0 = lunedì … 6 = domenica); assente = tutti
	fasce: [number, number][]; // minuti dall'inizio del giorno, [apre, chiude)
}

export interface Luogo {
	id: LuogoId;
	nome: string; // con furigana base[lettura] dove serve
	it: string;
	en?: string;
	icona: string;
	quartiere?: Quartiere; // assente = さくら町
	sfondo: string; // file in static/giorno/sfondi
	x: number; // centro dell'edificio sulla mappa disegnata, in % della larghezza
	y: number; // … e dell'altezza
	orario?: Orario; // assente = sempre aperto
	bloccato?: Condizione; // finché è vera il luogo è chiuso col lucchetto
	perche?: Testo; // perché è bloccato
	ambiente?: Passo[]; // cosa succede se non c'è una scena della storia
	chiacchiere?: Chiacchiera[]; // prima dell'ambiente: una alla volta, mai ripetute
}

// Chiacchiera di un luogo (vocabolario fuori dalla trama): parte entrando in un
// luogo senza scene della storia, se non l'hai ancora sentita.
export interface Chiacchiera {
	id: string;
	quando?: Condizione;
	passi: Passo[];
	// chi parla (di norma il primo «dice»): deve essere lì in quel momento (DOVE in
	// mondo.ts) e fa al massimo una chiacchiera al giorno
	chi?: string;
}

export interface Personaggio {
	nome: string; // come appare nel dialogo
	sprite: string | null; // ritratto in static/giorno/ritratti (null = te stesso, o voce al telefono)
	voce: 'F' | 'M';
	yomi?: string; // lettura del nome in kana (scheda del taccuino)
	chi?: Testo; // chi è (scheda del taccuino); senza, non ha una scheda
	stesso?: string; // è lo stesso personaggio di un altro (es. 中村 al telefono)
	schermo?: boolean; // parla dalla TV: sfondo tv_salotto con lo sprite dietro lo schermo
}

export interface Condizione {
	giorno?: number | number[]; // giorno della storia (0 = primo)
	dalGiorno?: number; // da questo giorno in poi (tappe delle sotto-trame)
	alGiorno?: number; // fino a questo giorno compreso
	sentite?: string[]; // chiacchiere già sentite (il seguito di una sotto-trama)
	dalle?: number; // minuti
	alle?: number; // minuti, escluso
	flag?: string[]; // tutti presenti
	nonFlag?: string[]; // nessuno presente
	oggetti?: string[];
	nonOggetti?: string[];
	soldiMin?: number; // almeno questi soldi
}

export interface Opzione {
	ja: string;
	it?: string;
	passi?: Passo[];
	azione?: 'treno'; // la pagina fa partire il treno (stazioni)
}

export interface Domanda {
	ja: string; // la domanda (letta dalla voce narrante)
	it: string;
	// domanda d'ascolto (聴解): questo testo lo legge la voce e si vede solo dopo
	// la risposta; chi = voce dell'annuncio o di chi parla
	ascolto?: { ja: string; it: string; chi?: 'F' | 'M' };
	opzioni: { ja: string; it: string; valore?: number }[];
	giusta: number | 'soldi'; // 'soldi' = l'opzione col valore più vicino ai soldi che hai
	spiega: string;
	tipo?: 'meteo' | 'notizia'; // per i timbri (天気の 人, 物知り)
}

// un foglio da leggere (volantino, orari, regolamento, biglietto…), come il
// 情報検索 / 読解 dell'esame. Righe «voce｜valore» diventano una tabella.
export interface Avviso {
	titolo: string;
	righe: string[];
	it: string; // la traduzione (col 🇮🇹)
	tipo?: 'volantino' | 'cartello' | 'biglietto' | 'lettera';
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
	| { dice: string; ja: string; it: string; taccuino?: boolean; faccia?: string; suono?: Suono } // faccia = espressione (ritratti/<sprite>_<faccia>-chiusa.png)
	| { io: string; it: string; detto?: boolean } // battuta tua (detto = l'hai già pronunciata al microfono)
	| { pensa: string; it: string } // un tuo pensiero (non lo dici)
	| { narra: string; it: string; en?: string; suono?: Suono } // narrazione (giapponese + traduzione)
	| { nota: string; it: string; en?: string } // spiegazione di lingua o di gioco (💡)
	| { scelta: Opzione[] }
	| { se: Condizione; allora: Passo[]; altrimenti?: Passo[] }
	| { domanda: Domanda }
	| { avviso: Avviso }
	| { prova: Prova }
	| { prendi: string; it: string }
	| { togli: string }
	| { flag: string }
	| { obiettivo: string; ja: string; it: string; en?: string; quando?: { dopo?: number; dalle?: number; alle?: number } } // aggiunge un obiettivo (quando: appuntamento, dopo = fra quanti giorni)
	| { completa: string } // segna un obiettivo come fatto
	| { minuti: number }
	| { ora: number } // porta l'orologio almeno a quest'ora
	| { soldi: number } // + entrate, − spese
	| { vai: LuogoId }
	| { dormi: true }
	| { conta: string } // sale un contatore dei timbri (es. 'puntuale')
	| { sente: string; chi?: string } // chiacchiera ascoltata (non torna più; chi = ha già parlato oggi)
	| { fine: string }; // missione conclusa (titolo)

export interface Scena {
	id: string;
	luogo: LuogoId;
	quando: Condizione;
	ripeti?: boolean; // di norma una scena si gioca una volta sola
	ripiego?: boolean; // rete di sicurezza: la missione si chiude senza che il caso l'abbia risolto il giocatore
	passi: Passo[];
}

export interface Missione {
	id: string;
	titolo: string;
	it: string;
	en?: string;
	// da dove parte (giorno della storia, flag e oggetti) quando la si gioca da sola
	inizio?: { giorno: number; flag?: string[]; oggetti?: string[] };
	epilogo?: Testo; // cosa è successo, nella schermata finale
	scene: Scena[];
}

export interface Obiettivo {
	id: string;
	ja: string;
	it: string;
	en?: string;
	fatto: boolean;
	quando?: Quando; // appuntamento: compare nel calendario
}
// giorno della storia e fascia oraria (minuti) di un appuntamento
export interface Quando {
	giorno: number;
	dalle?: number;
	alle?: number;
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
	domande: { ok: number; tot: number }; // tutte le risposte
	punteggi: Record<string, { ok: number; tot: number }>; // per missione: solo le domande della storia
	ripasso: { ok: number; tot: number }; // chiacchiere, treno: fuori dal voto della missione
	contatori: Record<string, number>; // per i timbri (meteo, ascolto, puntuale…)
	timbri?: Record<string, number>; // livelli dei timbri già mostrati
	note?: Record<number, string>; // note del giocatore nel calendario, per giorno
	libera?: boolean; // la scena in corso è una chiacchiera (le domande vanno nel ripasso)
	collezione: Premio[]; // peluche vinti alla sala giochi
	incontrati: string[]; // personaggi conosciuti, in ordine (schede del taccuino)
	sentite: string[]; // chiacchiere dei luoghi già sentite
	oggi?: { giorno: number; persone: string[] }; // chi ti ha già fatto una chiacchiera oggi
	classifica: { punti: number; giorno: number }[]; // i migliori punteggi della クイズ
	// scena interrotta (pagina chiusa a metà dialogo): il passo mostrato e quelli
	// dopo, per riprendere da lì invece di perderli
	scena?: Passo[];
	finita?: string;
}

export interface Premio {
	premio: string; // id del peluche (static/giorno/oggetti)
	ja: string; // la parola del cartellino
	lettura: string;
	it: string;
	giorno: number;
}
