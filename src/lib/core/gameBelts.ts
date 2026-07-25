// Cinture di karatè per gioco («doma tutti i giochi» — premio incrementale).
//
// Ogni gioco della lista ha contatori locali {partite, pulite}:
// - partita  = una sessione portata a termine (scena finale raggiunta)
// - pulita   = prestazione da insegnante (criterio per-gioco: vedi la pagina
//   del gioco — di norma max 1 errore, serie ≥5 per i giochi a serie,
//   accordo senza aiuti per i negoziali)
// La cintura deriva dai contatori; la cintura nera è 初段 e si sale di dan.
// «Domato» = gialla (3 partite) o almeno una pulita — conta per il banner in /giochi
// ed è il requisito degli sblocchi (gameUnlocks).
//
// Le cinture NON bloccano niente: gli sblocchi (solo filiera numeri/tempo)
// stanno in gameUnlocks.ts. Storage: localStorage (come gli highscore) —
// dato di dispositivo, non entra nel bundle di export.

import { appState } from '$lib/stores.svelte';

export type BeltColor = 'nessuna' | 'bianca' | 'gialla' | 'arancione' | 'verde' | 'blu' | 'viola' | 'marrone' | 'nera';

export interface BeltProgress {
	played: number; // partite completate
	clean: number; // prestazioni pulite
}

const KEY = 'renkei_game_belts';

// I giochi con le cinture (catalogo: id → nome/icona per toast e banner).
// Ordine consigliato dal propedeutico alla vetta. Nessun blocco qui.
export const BELT_GAMES: { id: string; label: string; icon: string }[] = [
	// giochi sui numeri e sul tempo (dentro /giochi)
	{ id: 'read-日', label: 'Giorni del mese', icon: '📅' },
	{ id: 'read-時', label: 'Ore', icon: '🕐' },
	{ id: 'read-分', label: 'Minuti', icon: '⏱️' },
	{ id: 'read-円', label: 'Prezzi (yen)', icon: '💴' },
	{ id: 'read-clock', label: 'Che ore sono?', icon: '⏰' },
	{ id: 'read-count', label: 'Conta gli oggetti', icon: '🔢' },
	{ id: 'read-mix', label: 'Misto', icon: '🎲' },
	{ id: 'listen-number', label: 'Scrivi il numero', icon: '👂' },
	{ id: 'listen-date', label: 'Ascolta la data', icon: '📆' },
	{ id: 'listen-time', label: 'Ascolta l\'ora', icon: '🕒' },
	{ id: 'listen-appt', label: 'Data e ora', icon: '🗓️' },
	{ id: 'shop-pay', label: 'Alla cassa', icon: '🛒' },
	{ id: 'shopping-list', label: 'Lista della spesa', icon: '🛍️' },
	{ id: 'greetings', label: 'Saluti', icon: '🗣️' },
	{ id: 'konbini-order', label: 'Al konbini', icon: '🏪' },
	// attività con pagina propria
	{ id: 'riordina', label: 'Riordina la frase', icon: '🧩' },
	{ id: 'coppie', label: 'Coppie difficili', icon: '🔀' },
	{ id: 'dettato', label: 'Dettato', icon: '✍️' },
	{ id: 'avverbi', label: 'Avverbi', icon: '🎚️' },
	{ id: 'catena', label: 'Catena di forme', icon: '🧬' },
	{ id: 'contrazioni', label: 'Contrazioni', icon: '✂️' },
	{ id: 'comparazioni', label: 'Comparazioni', icon: '⚖️' },
	{ id: 'iikae', label: 'Dillo in un altro modo', icon: '🎯' },
	{ id: 'choukai', label: 'Choukai', icon: '👂' },
	{ id: 'leggi-a-voce', label: 'Leggi a voce', icon: '📢' },
	{ id: 'di-la-data', label: 'Dì la data', icon: '🗣️' },
	{ id: 'shadowing', label: 'Shadowing', icon: '🎤' },
	{ id: 'appuntamento', label: 'Prendi appuntamento', icon: '📅' },
	{ id: 'relazioni', label: 'Relazioni', icon: '🫂' },
	{ id: 'keigo', label: 'Keigo', icon: '🎎' }
];

// Scala delle cinture: condizione minima per ognuna. La cintura è la PIÙ ALTA
// con condizione soddisfatta (si può «saltare» la gialla con una pulita subito).
const BELT_LADDER: { color: BeltColor; cond: (p: BeltProgress) => boolean }[] = [
	{ color: 'bianca', cond: (p) => p.played >= 1 },
	{ color: 'gialla', cond: (p) => p.played >= 3 },
	{ color: 'arancione', cond: (p) => p.clean >= 1 },
	{ color: 'verde', cond: (p) => p.clean >= 2 },
	{ color: 'blu', cond: (p) => p.clean >= 4 },
	{ color: 'viola', cond: (p) => p.clean >= 6 },
	{ color: 'marrone', cond: (p) => p.clean >= 8 },
	{ color: 'nera', cond: (p) => p.clean >= 10 }
];

// Dan della nera: 初段 a 10 pulite, +1 ogni 5. 十段 = Gran Maestro.
const DAN_LABELS = ['初段', '二段', '三段', '四段', '五段', '六段', '七段', '八段', '九段', '十段'];

function readAll(): Record<string, BeltProgress> {
	if (typeof localStorage === 'undefined') return {};
	try {
		return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, BeltProgress>;
	} catch {
		return {};
	}
}

export function beltProgress(gameId: string): BeltProgress {
	return readAll()[gameId] ?? { played: 0, clean: 0 };
}

export function beltFor(p: BeltProgress): BeltColor {
	let belt: BeltColor = 'nessuna';
	for (const step of BELT_LADDER) if (step.cond(p)) belt = step.color;
	return belt;
}

// Dan della cintura nera: 初段 a 10 pulite, poi +1 ogni 5 (tetto 十段).
export function danFor(p: BeltProgress): string | null {
	if (beltFor(p) !== 'nera') return null;
	const dan = Math.min(DAN_LABELS.length, 1 + Math.floor((p.clean - 10) / 5));
	const label = DAN_LABELS[dan - 1]!;
	return dan === DAN_LABELS.length ? `${label} 👑 Gran Maestro` : label;
}

// Etichetta compatta per le card: «— / bianca / … / nera 二段».
export function beltLabel(gameId: string): string | null {
	const p = beltProgress(gameId);
	const belt = beltFor(p);
	if (belt === 'nessuna') return null;
	return belt === 'nera' ? `nera ${danFor(p)}` : belt;
}

// Pulite richieste per ogni cintura oltre la gialla.
const CLEAN_TARGETS: Partial<Record<BeltColor, number>> = {
	arancione: 1,
	verde: 2,
	blu: 4,
	viola: 6,
	marrone: 8,
	nera: 10
};

// Cosa manca per la prossima cintura (per la card del gioco).
export function nextBeltHint(p: BeltProgress): string | null {
	const belt = beltFor(p);
	const idx = BELT_LADDER.findIndex((b) => b.color === belt);
	const next = BELT_LADDER[idx + 1];
	if (!next) return null; // nera: si sale di dan
	if (next.color === 'bianca' || next.color === 'gialla') {
		const target = next.color === 'bianca' ? 1 : 3;
		return `${next.color}: ancora ${target - p.played} partite`;
	}
	const target = CLEAN_TARGETS[next.color] ?? 1;
	return `${next.color}: ancora ${target - p.clean} pulite`;
}

// «Domato»: gialla (3 partite) o almeno una pulita. Requisito degli sblocchi.
export function conquered(p: BeltProgress): boolean {
	return p.played >= 3 || p.clean >= 1;
}

// Quanti giochi sono domati (per il banner in /giochi).
export function conqueredCount(): number {
	return BELT_GAMES.filter((g) => conquered(beltProgress(g.id))).length;
}

// Registra la fine di una partita. Aggiorna i contatori, e se c'è un salto di
// cintura o uno sblocco mostra il toast globale (layout).
export function recordGameResult(gameId: string, clean: boolean): void {
	if (typeof localStorage === 'undefined') return;
	const all = readAll();
	const prev = all[gameId] ?? { played: 0, clean: 0 };
	const prevBelt = beltFor(prev);
	const prevDan = danFor(prev);
	const prevConquered = conquered(prev);
	const next: BeltProgress = { played: prev.played + 1, clean: prev.clean + (clean ? 1 : 0) };
	all[gameId] = next;
	localStorage.setItem(KEY, JSON.stringify(all));

	const belt = beltFor(next);
	const dan = danFor(next);
	const messages: string[] = [];
	if (belt !== prevBelt || dan !== prevDan) {
		const name = belt === 'nera' ? `nera ${dan}` : belt;
		const label = BELT_GAMES.find((g) => g.id === gameId)?.label ?? gameId;
		messages.push(`🥋 Cintura ${name} in ${label}!`);
	}
	if (!prevConquered && conquered(next)) {
		const g = BELT_GAMES.find((x) => x.id === gameId);
		if (g) messages.push(`💪 ${g.icon} ${g.label} domato!`);
	}
	if (messages.length > 0) appState.beltToast = { messages, at: Date.now() };
}
