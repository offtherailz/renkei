// Streak e resoconto settimanale calcolati da study_sessions (nessun dato
// nuovo da mantenere). Regola streak: conta i giorni ATTIVI nella catena più
// recente, tollerando al massimo UN giorno saltato tra un giorno attivo e il
// successivo (loss aversion senza ansia: un giorno storto non azzera tutto).

export interface SessionLike {
	startedAt: number;
	answers: number;
	correct: number;
}

const DAY = 24 * 60 * 60 * 1000;

function dayKey(ts: number): string {
	const d = new Date(ts);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysAgo(n: number, now = Date.now()): string {
	return dayKey(now - n * DAY);
}

export interface Streak {
	giorni: number; // giorni attivi nella catena
	attivoOggi: boolean;
	aRischio: boolean; // ieri saltato: oggi è l'ultimo giorno utile per salvarla
}

export function computeStreak(sessions: SessionLike[], now = Date.now()): Streak {
	const active = new Set(sessions.filter((s) => s.answers > 0).map((s) => dayKey(s.startedAt)));
	const attivoOggi = active.has(daysAgo(0, now));
	// la catena può iniziare oggi o ieri; se entrambi vuoti ma l'altro ieri era
	// attivo, la streak è ancora salvabile oggi (tolleranza di un giorno)
	let start = -1;
	if (attivoOggi) start = 0;
	else if (active.has(daysAgo(1, now))) start = 1;
	else if (active.has(daysAgo(2, now))) return { giorni: 0, attivoOggi: false, aRischio: true };
	else return { giorni: 0, attivoOggi: false, aRischio: false };

	let giorni = 0;
	let salti = 0;
	for (let d = start; d < 3650; d += 1) {
		if (active.has(daysAgo(d, now))) {
			giorni += 1;
			salti = 0;
		} else {
			salti += 1;
			if (salti > 1) break; // due giorni di fila senza attività: catena chiusa
		}
	}
	const aRischio = !attivoOggi && start === 1;
	return { giorni, attivoOggi, aRischio };
}

// Traguardi di streak da festeggiare (una volta sola quando li raggiungi)
export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365];

export function isMilestone(giorni: number): boolean {
	return STREAK_MILESTONES.includes(giorni);
}

export interface WeekRecap {
	giorniAttivi: number; // su 7
	risposte: number;
	corrette: number;
	accuratezza: number; // 0-100
	rispostePrec: number; // settimana precedente, per il confronto
}

export function weeklyRecap(sessions: SessionLike[], now = Date.now()): WeekRecap {
	const inRange = (s: SessionLike, from: number, to: number) => s.startedAt >= from && s.startedAt < to;
	const week = sessions.filter((s) => inRange(s, now - 7 * DAY, now + 1));
	const prev = sessions.filter((s) => inRange(s, now - 14 * DAY, now - 7 * DAY));
	const risposte = week.reduce((a, s) => a + s.answers, 0);
	const corrette = week.reduce((a, s) => a + s.correct, 0);
	return {
		giorniAttivi: new Set(week.filter((s) => s.answers > 0).map((s) => dayKey(s.startedAt))).size,
		risposte,
		corrette,
		accuratezza: risposte > 0 ? Math.round((corrette / risposte) * 100) : 0,
		rispostePrec: prev.reduce((a, s) => a + s.answers, 0)
	};
}

// Completamento pack/lezione: confronta gli obiettivi completati con lo
// snapshot salvato e restituisce SOLO i nuovi (festa una volta sola). Al primo
// avvio lo snapshot non esiste: si semina in silenzio, niente feste retroattive.
export interface StorageLike {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
}

const PACKS_DONE_KEY = 'renkei_packs_done';

export function detectNewCompletions(
	completedIds: string[],
	storage: StorageLike | undefined = typeof localStorage === 'undefined' ? undefined : localStorage
): string[] {
	if (!storage) return [];
	const raw = storage.getItem(PACKS_DONE_KEY);
	if (raw === null) {
		storage.setItem(PACKS_DONE_KEY, JSON.stringify(completedIds));
		return [];
	}
	let known: string[] = [];
	try {
		known = JSON.parse(raw) as string[];
	} catch {
		known = [];
	}
	const knownSet = new Set(known);
	const fresh = completedIds.filter((id) => !knownSet.has(id));
	if (fresh.length > 0) {
		storage.setItem(PACKS_DONE_KEY, JSON.stringify([...new Set([...known, ...fresh])]));
	}
	return fresh;
}

// "una volta al giorno": ricorda in localStorage l'ultima celebrazione
export function celebrateOncePerDay(key: string, now = Date.now()): boolean {
	if (typeof localStorage === 'undefined') return false;
	const k = `renkei_celebrated_${key}`;
	const today = dayKey(now);
	if (localStorage.getItem(k) === today) return false;
	localStorage.setItem(k, today);
	return true;
}
