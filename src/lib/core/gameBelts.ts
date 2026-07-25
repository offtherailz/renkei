// Cinture di karatè per gioco («doma tutti i giochi» — premio incrementale).
//
// Ogni gioco della lista ha contatori locali {partite, pulite, imprese}:
// - partita = una sessione portata a termine (scena finale raggiunta)
// - pulita  = prestazione da insegnante (di norma max 1 errore, serie ≥5 per
//   i giochi a serie, accordo senza aiuti per i negoziali)
// - impresa = prestazione magistrale (0 errori, serie ≥12, senza riascolti…)
// La cintura deriva dai contatori; la nera è 初段, i dan salgono con pulite E
// imprese fino al 十段 Gran Maestro (cintura ROSSA, come nel karate).
// Sblocchi (gameUnlocks) e banner in /giochi: conta avere ALMENO la cintura
// arancione (1 partita pulita).
//
// Le cinture NON bloccano niente: gli sblocchi (solo filiera numeri/tempo)
// stanno in gameUnlocks.ts. Storage: localStorage (come gli highscore) —
// dato di dispositivo, non entra nel bundle di export.

import { appState } from '$lib/stores.svelte';

export type BeltColor = 'nessuna' | 'bianca' | 'gialla' | 'arancione' | 'verde' | 'blu' | 'viola' | 'marrone' | 'nera' | 'rossa';

export interface BeltProgress {
	played: number; // partite completate
	clean: number; // prestazioni pulite
	epic: number; // imprese (prestazioni magistrali)
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
	{ id: 'certezza', label: 'Quanto sei sicuro?', icon: '🎲' },
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

// I 10 dan della nera: pulite E imprese richieste. I primi si sbloccano con
// la sola qualità costante, gli ultimi chiedono prestazioni magistrali;
// il 十段 (Gran Maestro) porta la cintura rossa.
const DAN_LADDER: { label: string; clean: number; epic: number }[] = [
	{ label: '初段', clean: 10, epic: 0 },
	{ label: '二段', clean: 15, epic: 0 },
	{ label: '三段', clean: 20, epic: 1 },
	{ label: '四段', clean: 25, epic: 2 },
	{ label: '五段', clean: 30, epic: 3 },
	{ label: '六段', clean: 35, epic: 4 },
	{ label: '七段', clean: 40, epic: 5 },
	{ label: '八段', clean: 45, epic: 6 },
	{ label: '九段', clean: 50, epic: 8 },
	{ label: '十段', clean: 60, epic: 10 }
];

function readAll(): Record<string, BeltProgress> {
	if (typeof localStorage === 'undefined') return {};
	try {
		return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, BeltProgress>;
	} catch {
		return {};
	}
}

export function beltProgress(gameId: string): BeltProgress {
	const p = readAll()[gameId];
	// epic è arrivato dopo: i dati salvati prima non ce l'hanno
	return p ? { played: p.played, clean: p.clean, epic: p.epic ?? 0 } : { played: 0, clean: 0, epic: 0 };
}

export function beltFor(p: BeltProgress): BeltColor {
	let belt: BeltColor = 'nessuna';
	for (const step of BELT_LADDER) if (step.cond(p)) belt = step.color;
	return belt;
}

// Dan raggiunto: il più alto con pulite E imprese sufficienti.
export function danFor(p: BeltProgress): string | null {
	if (beltFor(p) !== 'nera') return null;
	let label: string | null = null;
	let last = false;
	for (let i = 0; i < DAN_LADDER.length; i += 1) {
		const d = DAN_LADDER[i]!;
		if (p.clean >= d.clean && p.epic >= d.epic) {
			label = d.label;
			last = i === DAN_LADDER.length - 1;
		}
	}
	return last ? `${label} 👑 Gran Maestro` : label;
}

// Colore da disegnare: il Gran Maestro porta la ROSSA, gli altri la loro.
export function beltVisual(p: BeltProgress): BeltColor {
	return danFor(p)?.includes('十段') ? 'rossa' : beltFor(p);
}

// Etichetta compatta per le card: «— / bianca / … / nera 二段».
export function beltLabel(gameId: string): string | null {
	const p = beltProgress(gameId);
	const belt = beltFor(p);
	if (belt === 'nessuna') return null;
	if (belt !== 'nera') return belt;
	const dan = danFor(p)!;
	return dan.includes('十段') ? `rossa ${dan}` : `nera ${dan}`;
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

// Cosa manca per il prossimo dan (per la card, quando sei già nera).
export function nextDanHint(p: BeltProgress): string | null {
	if (beltFor(p) !== 'nera') return null;
	const next = DAN_LADDER.find((d) => p.clean < d.clean || p.epic < d.epic);
	if (!next) return null; // Gran Maestro: vetta raggiunta
	const parts: string[] = [];
	if (p.clean < next.clean) parts.push(`${next.clean - p.clean} pulite`);
	if (p.epic < next.epic) parts.push(`${next.epic - p.epic} imprese ⚡`);
	return `${next.label}: ancora ${parts.join(' e ')}`;
}

// Almeno la cintura arancione (1 pulita): requisito degli sblocchi.
export function conquered(p: BeltProgress): boolean {
	return p.clean >= 1;
}

// Quanti giochi hanno almeno l'arancione (per il banner in /giochi).
export function conqueredCount(): number {
	return BELT_GAMES.filter((g) => conquered(beltProgress(g.id))).length;
}

// Kanji del dan (初/二/…/十) da mostrare in oro sulla cintura nera/rossa.
export function danKanji(p: BeltProgress): string | null {
	const d = danFor(p);
	return d ? d[0]! : null;
}

// Registra la fine di una partita (un'impresa è anche pulita). Aggiorna i
// contatori; salti di cintura/dan e imprese finiscono nel toast.
export function recordGameResult(gameId: string, clean: boolean, epic = false): void {
	if (typeof localStorage === 'undefined') return;
	const all = readAll();
	const raw = all[gameId];
	const prev: BeltProgress = raw ? { played: raw.played, clean: raw.clean, epic: raw.epic ?? 0 } : { played: 0, clean: 0, epic: 0 };
	const prevBelt = beltFor(prev);
	const prevDan = danFor(prev);
	const next: BeltProgress = {
		played: prev.played + 1,
		clean: prev.clean + (clean || epic ? 1 : 0),
		epic: prev.epic + (epic ? 1 : 0)
	};
	all[gameId] = next;
	localStorage.setItem(KEY, JSON.stringify(all));

	const gameLabel = BELT_GAMES.find((g) => g.id === gameId)?.label ?? gameId;
	const belt = beltFor(next);
	const dan = danFor(next);
	const messages: string[] = [];
	if (epic) messages.push(`⚡ Impresa in ${gameLabel}!`);
	if (belt !== prevBelt || dan !== prevDan) {
		const name = belt === 'nera' ? (dan?.includes('十段') ? `ROSSA ${dan}` : `nera ${dan}`) : belt;
		messages.push(`🥋 Cintura ${name} in ${gameLabel}!`);
	}
	if (messages.length > 0) appState.beltToast = { messages, at: Date.now() };
}
