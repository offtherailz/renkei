<script lang="ts">
	import { db } from '$lib/db/schema';
	import type { SrsProgress } from '$lib/types/models';
	import { CARD_ACTION_DONE, computeCardAction, type CardAction } from '$lib/core/cardActions';
	import { noteSessionCardAction } from '$lib/stores.svelte';

	// Comandi carta (🔁/💤/⚰️ + ↩️ Annulla) per UNA carta SRS. quizCard: è la
	// carta della domanda (label nel bottone, before = SRS prima della risposta,
	// forgot = mostra «Non la ricordavo», cioè solo se la risposta era giusta).
	// Altrimenti è un'altra parola/kanji della domanda: «Metti in studio» se
	// mai studiata, «Non la ricordavo» se già in SRS. name: come appare nel
	// riepilogo di fine sessione (default label).
	const {
		itemKey,
		label = '',
		name = '',
		quizCard = false,
		before = null,
		forgot = true,
		onchange
	}: {
		itemKey: string;
		label?: string;
		name?: string;
		quizCard?: boolean;
		before?: SrsProgress | null;
		forgot?: boolean;
		onchange?: (action: CardAction | null, srs: SrsProgress | null) => void;
	} = $props();

	let current = $state<SrsProgress | undefined>(undefined);
	let done = $state<CardAction | null>(null);
	let busy = $state(false);
	let undoTo: SrsProgress | undefined;

	$effect(() => {
		const key = itemKey;
		done = null;
		current = undefined;
		db.srs_progress
			.get(key)
			.then((s) => {
				if (key === itemKey) current = s;
			})
			.catch(() => {});
	});

	const inSrs = $derived(quizCard || current !== undefined);

	async function apply(action: CardAction): Promise<void> {
		if (busy || done) return;
		busy = true;
		try {
			// riletta al clic: il quiz potrebbe aver appena salvato la risposta
			const fresh = await db.srs_progress.get(itemKey);
			const updated = computeCardAction(action, itemKey, fresh, before);
			if (!updated) return;
			await db.srs_progress.put(updated);
			undoTo = fresh;
			current = updated;
			done = action;
			noteSessionCardAction(itemKey, name || label || itemKey, action);
			onchange?.(action, updated);
		} finally {
			busy = false;
		}
	}

	async function undo(): Promise<void> {
		if (busy || !done) return;
		busy = true;
		try {
			if (undoTo) await db.srs_progress.put(undoTo);
			else await db.srs_progress.delete(itemKey);
			current = undoTo;
			done = null;
			noteSessionCardAction(itemKey, name || label || itemKey, null);
			onchange?.(null, undoTo ?? null);
		} finally {
			busy = false;
		}
	}
</script>

<span class="card-actions">
	{#if done}
		<span class="done">{CARD_ACTION_DONE[done]}</span>
		<button class="btn" onclick={undo} disabled={busy}>↩️ Annulla</button>
	{:else}
		{#if forgot}
			{#if inSrs}
				<button class="btn" onclick={() => apply('forgot')} disabled={busy} title="Non te la ricordi davvero: conta come sbagliata e torna tra pochi minuti">
					🔁 Non la ricordavo{#if label}<span class="lbl">{label}</span>{/if}
				</button>
			{:else}
				<button class="btn" onclick={() => apply('forgot')} disabled={busy} title="Entra subito nei tuoi ripassi">
					📚 Metti in studio{#if label}<span class="lbl">{label}</span>{/if}
				</button>
			{/if}
		{/if}
		{#if inSrs && !current?.buried}
			<button class="btn" onclick={() => apply('snooze')} disabled={busy} title="Sposta il prossimo ripasso di 3 giorni">💤 Rimanda</button>
			<button class="btn" onclick={() => apply('bury')} disabled={busy} title="Fuori dalla rotazione finché non la riesumi dalla scheda">⚰️ Seppellisci</button>
		{/if}
	{/if}
</span>

<style>
	.card-actions { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 6px; }
	.btn {
		padding: 4px 10px;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: var(--surface-2);
		color: var(--muted);
		font-size: 0.78rem;
		cursor: pointer;
	}
	.btn:hover:not(:disabled) { border-color: var(--brand); color: var(--ink); }
	.btn:disabled { opacity: 0.6; cursor: default; }
	.lbl { margin-left: 6px; font-weight: 700; color: var(--ink); }
	.done { font-size: 0.8rem; color: var(--muted); }
</style>
