import { db } from '$lib/db/schema';
import type { SrsProgress } from '$lib/types/models';
import { applySrsReview, createInitialSrs, FACET_FIELDS, setBuried, snoozeReview } from './srs';

// Comandi carta (🔁 Non la ricordavo / 💤 Rimanda / ⚰️ Seppellisci), condivisi
// tra quiz e Approfondisci. Valgono per la carta del quiz E per qualunque
// altra parola/kanji della domanda (es. una parola della frase non capita).
export type CardAction = 'forgot' | 'snooze' | 'bury';

// «Non la ricordavo»: la carta riparte dallo stato di PRIMA della risposta
// (before, se la risposta l'ha già mossa) trattata come un errore (stage −1,
// ripasso tra pochi minuti). Le sfaccettature attuali restano. Senza SRS
// (parola mai studiata) entra nei ripassi da zero. Rimanda/Seppellisci
// richiedono una carta già in SRS: null altrimenti.
export function computeCardAction(
	action: CardAction,
	key: string,
	current: SrsProgress | undefined,
	before?: SrsProgress | null,
	nowTs = Date.now()
): SrsProgress | null {
	if (action === 'snooze') return current ? snoozeReview(current, 3, nowTs) : null;
	if (action === 'bury') return current ? setBuried(current, true, nowTs) : null;
	let updated = applySrsReview(before ?? current ?? createInitialSrs(key, nowTs), false, nowTs);
	if (current) {
		for (const f of FACET_FIELDS) {
			if (current[f] !== undefined) updated = { ...updated, [f]: current[f] };
		}
	}
	return { ...updated, buried: false };
}

export async function saveCardAction(
	action: CardAction,
	key: string,
	before?: SrsProgress | null
): Promise<SrsProgress | null> {
	const current = await db.srs_progress.get(key);
	const updated = computeCardAction(action, key, current, before);
	if (updated) await db.srs_progress.put(updated);
	return updated;
}

export const CARD_ACTION_DONE: Record<CardAction, string> = {
	forgot: '🔁 In ripasso: torna tra pochi minuti',
	snooze: '💤 Rimandata di 3 giorni',
	bury: '⚰️ Seppellita (la riesumi dalla scheda)'
};
