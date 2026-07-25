// Sblocchi dei giochi: SOLO la filiera numeri/tempo. Tutto il resto è
// sempre libero. Il requisito NON è spiegato in UI (niente hint testuale):
// la card mostra solo 🔒, scoprire cosa sblocca cosa fa parte del gioco.
//
// Regola (insegnante + gamification, «fattibile»): un prerequisito è
// soddisfatto con ALMENO la cintura arancione in quel gioco (1 partita pulita).
//
// Filiera: Ore+Minuti → Che ore sono? → Ascolta l'ora
//          Giorni del mese → Ascolta la data
//          Ascolta la data + Ascolta l'ora → Data e ora
//          Data e ora + Dì la data → Prendi appuntamento
//          Misto: quando tutti gli altri della sezione sono sbloccati.

import { beltProgress, conquered } from '$lib/core/gameBelts';

// Trucco nascosto: toccare 7 volte veloci una card bloccata la sblocca subito,
// scavalcando il requisito (come i "7 tap" per gli sviluppatori Android).
// Nessun testo lo spiega in UI — chi lo trova, lo trova.
const FORCE_KEY = 'renkei_game_force_unlock';

function readForced(): string[] {
	if (typeof localStorage === 'undefined') return [];
	try {
		return JSON.parse(localStorage.getItem(FORCE_KEY) ?? '[]') as string[];
	} catch {
		return [];
	}
}

export function forceUnlock(gameId: string): void {
	if (typeof localStorage === 'undefined') return;
	const all = readForced();
	if (!all.includes(gameId)) localStorage.setItem(FORCE_KEY, JSON.stringify([...all, gameId]));
}

// gioco → prerequisiti (id di BELT_GAMES dove serve almeno l'arancione)
export const GAME_UNLOCKS: Record<string, string[]> = {
	'read-clock': ['read-時', 'read-分'],
	'listen-date': ['read-日'],
	'listen-time': ['read-clock'],
	'listen-appt': ['listen-date', 'listen-time'],
	appuntamento: ['listen-appt', 'di-la-data']
};

// Il Misto si apre quando il resto della filiera è sbloccato.
const MIX_ID = 'read-mix';
const MIX_SECTION = ['read-clock', 'listen-date', 'listen-time', 'listen-appt'];

export function isUnlocked(gameId: string): boolean {
	if (readForced().includes(gameId)) return true;
	if (gameId === MIX_ID) return MIX_SECTION.every((id) => isUnlocked(id));
	const reqs = GAME_UNLOCKS[gameId];
	if (!reqs) return true;
	return reqs.every((id) => conquered(beltProgress(id)));
}

