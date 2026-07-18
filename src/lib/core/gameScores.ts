// Highscore dei mini-giochi: punteggio a parte, separato dall'XP di studio.
// Salvato in localStorage (dato puramente locale, nessuna migrazione DB).

const KEY = 'renkei_game_highscores';

type Scores = Record<string, number>;

function readAll(): Scores {
	if (typeof localStorage === 'undefined') return {};
	try {
		return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Scores;
	} catch {
		return {};
	}
}

export function getHighscore(gameId: string): number {
	return readAll()[gameId] ?? 0;
}

// Tutti i record salvati (per la pagina statistiche).
export function allHighscores(): Scores {
	return readAll();
}

// Anagrafica gameId → nome leggibile (i giochi "in-pagina" di /giochi).
export const GAME_LABELS: Record<string, string> = {
	'read-日': 'Giorni del mese',
	'read-時': 'Ore',
	'read-分': 'Minuti',
	'read-円': 'Prezzi (yen)',
	'read-clock': 'Che ore sono?',
	'read-count': 'Conta gli oggetti',
	'read-mix': 'Letture miste',
	'listen-number': 'Scrivi il numero',
	'shop-pay': 'Alla cassa',
	'listen-appt': 'Appuntamento',
	'shopping-list': 'Lista della spesa',
	greetings: 'Saluti',
	'konbini-order': 'Al konbini'
};
export function gameLabel(id: string): string {
	return GAME_LABELS[id] ?? id;
}

// Salva se il nuovo punteggio batte il record. Ritorna true se è record.
export function submitScore(gameId: string, score: number): boolean {
	const all = readAll();
	if (score <= (all[gameId] ?? 0)) return false;
	all[gameId] = score;
	if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(all));
	return true;
}
