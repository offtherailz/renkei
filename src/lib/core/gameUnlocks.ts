// Sblocchi dei giochi: SOLO la filiera numeri/tempo, con requisiti espliciti
// e leggibili sulla card («serie di 5 in ⏰ Ore — ora sei a 3»). Tutto il resto
// è sempre libero. Lo sblocco è morbido: la card velata resta giocabile in
// anteprima — si conquista la ricompensa, non l'accesso.
//
// Filiera: Ore+Minuti → Che ore sono? → (+Giorni del mese) → Data e ora →
// (+Dì la data pulita) → Prendi appuntamento.

import { getHighscore } from '$lib/core/gameScores';
import { beltProgress } from '$lib/core/gameBelts';

export interface Requirement {
	kind: 'series' | 'clean'; // serie (highscore gameScores) o partite pulite (gameBelts)
	id: string;
	min: number;
	label: string; // come appare sulla card («⏰ Ore»)
}

export const GAME_UNLOCKS: Record<string, Requirement[]> = {
	'read-clock': [
		{ kind: 'series', id: 'read-時', min: 5, label: '⏰ Ore' },
		{ kind: 'series', id: 'read-分', min: 5, label: '⏱ Minuti' }
	],
	'listen-appt': [
		{ kind: 'series', id: 'read-clock', min: 5, label: '🕒 Che ore sono?' },
		{ kind: 'series', id: 'read-日', min: 5, label: '📆 Giorni del mese' }
	],
	appuntamento: [
		{ kind: 'series', id: 'listen-appt', min: 5, label: '🗓️ Data e ora' },
		{ kind: 'clean', id: 'di-la-data', min: 1, label: '🗣️ Dì la data' }
	]
};

function progressOf(r: Requirement): number {
	return r.kind === 'series' ? getHighscore(r.id) : beltProgress(r.id).clean;
}

export function isUnlocked(gameId: string): boolean {
	const reqs = GAME_UNLOCKS[gameId];
	if (!reqs) return true;
	return reqs.every((r) => progressOf(r) >= r.min);
}

// Testo del requisito per la card velata: solo ciò che manca, col progresso.
// Es.: «serie di 5 in ⏰ Ore (sei a 3) e in ⏱ Minuti».
export function unlockHint(gameId: string): string | null {
	const reqs = GAME_UNLOCKS[gameId];
	if (!reqs) return null;
	const missing = reqs.filter((r) => progressOf(r) < r.min);
	if (missing.length === 0) return null;
	const parts = missing.map((r) => {
		const now = progressOf(r);
		const stato = now > 0 ? ` (sei a ${now})` : '';
		return r.kind === 'series' ? `serie di ${r.min} in ${r.label}${stato}` : `una partita pulita a ${r.label}`;
	});
	return parts.join(' e ');
}
