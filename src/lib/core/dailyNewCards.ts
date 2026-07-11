// Limite giornaliero di carte MAI VISTE introdotte nel quiz. I ripassi dovuti
// (già introdotti, con next_review_date <= adesso) restano SEMPRE illimitati:
// il limite riguarda solo quante parole/kanji/grammatica del tutto nuovi
// entrano in circolo oggi — altrimenti, con gli intervalli iniziali corti
// (10-60 min), il conto dei ripassi non scende mai perché cresce più in
// fretta di quanto si riesca a smaltirlo in giornata.

export const DEFAULT_NEW_CARDS_PER_DAY = 20;

export interface NewCardBudget {
	nuove_oggi?: number;
	nuove_oggi_data?: string;
}

function dayKey(ts: number): string {
	const d = new Date(ts);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function newCardsUsedToday(budget: NewCardBudget, now = Date.now()): number {
	if (budget.nuove_oggi_data !== dayKey(now)) return 0;
	return budget.nuove_oggi ?? 0;
}

export function canIntroduceNewCard(budget: NewCardBudget, cap: number, now = Date.now()): boolean {
	return newCardsUsedToday(budget, now) < cap;
}

// Da applicare (spread) sul profilo quando si introduce davvero una carta
// nuova: azzera il contatore se è cambiato il giorno.
export function recordNewCardIntroduced(budget: NewCardBudget, now = Date.now()): Required<NewCardBudget> {
	return { nuove_oggi: newCardsUsedToday(budget, now) + 1, nuove_oggi_data: dayKey(now) };
}
