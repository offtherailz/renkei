import { db } from '$lib/db/schema';
import { applyPracticeReview, createInitialSrs } from './srs';

// Un errore in un'avventura butta l'item nel consolidamento: se non era mai
// stato studiato diventa subito "dovuto" (createInitialSrs → next_review=now),
// altrimenti gli scala i mastery_points (pratica: niente XP, niente stage).
export async function recordPracticeMiss(itemId: string): Promise<void> {
	try {
		const existing = await db.srs_progress.get(itemId);
		await db.srs_progress.put(applyPracticeReview(existing ?? createInitialSrs(itemId), false));
	} catch {
		/* db non pronto: l'avventura continua comunque */
	}
}
