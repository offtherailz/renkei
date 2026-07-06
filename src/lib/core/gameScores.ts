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

// Salva se il nuovo punteggio batte il record. Ritorna true se è record.
export function submitScore(gameId: string, score: number): boolean {
	const all = readAll();
	if (score <= (all[gameId] ?? 0)) return false;
	all[gameId] = score;
	if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(all));
	return true;
}
