// Sblocchi dei giochi: SOLO la filiera numeri/tempo, con requisiti espliciti
// e leggibili sulla card. Tutto il resto è sempre libero. Lo sblocco è
// morbido: la card velata resta giocabile in anteprima.
//
// Regola (insegnante + gamification, «fattibile»): un prerequisito è
// soddisfatto quando quel gioco è DOMATO — cintura gialla (3 partite)
// o arancione (1 partita pulita). Costanza o bravura, mai frustrante.
//
// Filiera: Ore+Minuti → Che ore sono? → Ascolta l'ora
//          Giorni del mese → Ascolta la data
//          Ascolta la data + Ascolta l'ora → Data e ora
//          Data e ora + Dì la data → Prendi appuntamento
//          Misto: quando tutti gli altri della sezione sono sbloccati.

import { beltProgress, conquered, BELT_GAMES } from '$lib/core/gameBelts';

// gioco → prerequisiti (id di BELT_GAMES da «domare»)
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
	if (gameId === MIX_ID) return MIX_SECTION.every((id) => isUnlocked(id));
	const reqs = GAME_UNLOCKS[gameId];
	if (!reqs) return true;
	return reqs.every((id) => conquered(beltProgress(id)));
}

function gameName(id: string): string {
	const g = BELT_GAMES.find((x) => x.id === id);
	return g ? `${g.icon} ${g.label}` : id;
}

// Testo del requisito per la card velata: solo ciò che manca, col progresso.
// Es.: «doma ⏰ Ore (2/3 partite, o 1 pulita) e ⏱ Minuti».
export function unlockHint(gameId: string): string | null {
	if (gameId === MIX_ID) {
		return MIX_SECTION.some((id) => !isUnlocked(id)) ? 'apri prima tutti gli altri giochi della sezione' : null;
	}
	const reqs = GAME_UNLOCKS[gameId];
	if (!reqs) return null;
	const missing = reqs.filter((id) => !conquered(beltProgress(id)));
	if (missing.length === 0) return null;
	const parts = missing.map((id) => {
		const p = beltProgress(id);
		return `${gameName(id)} (${p.played}/3 partite, o 1 pulita)`;
	});
	return `doma ${parts.join(' e ')}`;
}
