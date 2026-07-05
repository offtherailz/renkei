<script lang="ts">
	import { base } from '$app/paths';
	import { appState } from '$lib/stores.svelte';

	const dive = $derived(appState.lastDeepDive);
</script>

<div class="deep-page">
	<div class="nav"><button class="back" onclick={() => history.back()}>← Indietro</button></div>

	{#if !dive}
		<p class="muted">Niente da approfondire: apri un quiz e premi «🔍 Approfondisci» dopo una risposta.</p>
	{:else}
		<header class="head">
			<h1>🔍 Approfondisci</h1>
			{#if dive.title}
				<p class="focus">
					<span class="f-jp">{dive.title}</span>
					{#if dive.reading}<span class="f-read">{dive.reading}</span>{/if}
					{#if dive.meaning}<span class="f-mean">{dive.meaning}</span>{/if}
				</p>
			{/if}
		</header>

		{#if dive.notes.length > 0}
			<section class="block">
				<p class="block-title">Perché le altre erano sbagliate</p>
				{#each dive.notes as note (note.choice)}
					<div class="note"><span class="nc">{note.choice}</span> — {note.reason}</div>
				{/each}
			</section>
		{/if}

		<section class="block">
			<p class="block-title">Approfondimenti</p>
			<div class="chips">
				{#each dive.dives as d (d.href)}
					<a class="chip" class:primary={d.primary} href={d.href}>{d.label}</a>
				{/each}
			</div>
		</section>

		{#if appState.sessionState}
			<a class="resume" href="{base}/quiz">⏸ Torna al quiz</a>
		{/if}
	{/if}
</div>

<style>
	.deep-page { display: grid; gap: 12px; }
	.nav { margin-bottom: 4px; }
	.back { background: none; border: 1px solid var(--line); border-radius: 8px; padding: 6px 12px; font-size: 0.82rem; cursor: pointer; color: var(--muted); }
	.head h1 { margin: 0; font-size: 1.2rem; }
	.focus { margin: 4px 0 0; display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
	.f-jp { font-size: 1.6rem; font-weight: 700; }
	.f-read { color: var(--brand); font-weight: 600; }
	.f-mean { color: var(--muted); }
	.block { background: var(--surface); border-radius: 14px; padding: 14px; box-shadow: 0 2px 10px rgba(14,29,51,0.07); display: grid; gap: 8px; }
	.block-title { margin: 0; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); }
	.note { font-size: 0.9rem; color: var(--muted); }
	.nc { font-weight: 700; color: var(--ink); }
	.chips { display: flex; flex-wrap: wrap; gap: 8px; }
	.chip { padding: 8px 14px; border: 1px solid var(--line); border-radius: 999px; background: var(--surface-2); color: var(--ink); text-decoration: none; font-size: 1rem; }
	.chip:hover { border-color: var(--brand); }
	.chip.primary { border-color: var(--brand); background: rgba(107,160,242,0.14); color: var(--brand); font-weight: 700; }
	.resume { justify-self: start; padding: 8px 16px; border-radius: 8px; background: var(--brand); color: #fff; font-weight: 700; text-decoration: none; }
	.muted { color: var(--muted); }
</style>
