import { db } from '$lib/db/schema';
import { applyPracticeReview, bumpFacet, createInitialSrs, type FacetField } from './srs';

// Pratica registrata da giochi/avventure/shadowing: aggiorna il mastery
// dell'item (niente XP, niente stage) e, se indicata, la sfaccettatura che
// l'interazione allena (modello Nation: 👂 ascolto, 🎤 parlato, 🧩 uso…).
// Regola: si registra SOLO dove c'è un vero controllo di correttezza.
// - Q&A discreta (scelte): delta pieno ±(4/6), successi E errori.
// - Orale fuzzy (microfono): recordSpokenPractice — credito piccolo e SOLO
//   positivo, il riconoscimento sbaglia e un fallimento ASR non è una lacuna.
export async function recordPractice(itemId: string, correct: boolean, facet?: FacetField): Promise<void> {
	try {
		const existing = (await db.srs_progress.get(itemId)) ?? createInitialSrs(itemId);
		let updated = applyPracticeReview(existing, correct);
		if (facet) updated = bumpFacet(updated, facet, correct);
		await db.srs_progress.put(updated);
	} catch {
		/* db non pronto: il gioco continua comunque */
	}
}

// Orale fuzzy: mezzo credito, mai penalità (+2/0), sfaccettatura 🎤 di default.
export async function recordSpokenPractice(itemId: string, correct: boolean, facet: FacetField = 'facet_form_speak'): Promise<void> {
	if (!correct) return;
	try {
		const existing = (await db.srs_progress.get(itemId)) ?? createInitialSrs(itemId);
		const bumped = bumpFacet(
			{ ...existing, mastery_points: Math.min(100, existing.mastery_points + 2), updated_at: Date.now() },
			facet,
			true
		);
		await db.srs_progress.put(bumped);
	} catch {
		/* db non pronto */
	}
}

// Compat: un errore butta l'item nel consolidamento (se mai studiato diventa
// subito "dovuto": createInitialSrs → next_review = adesso).
export async function recordPracticeMiss(itemId: string): Promise<void> {
	return recordPractice(itemId, false);
}
