<script lang="ts">
	import { appState } from '$lib/stores.svelte';
	import { base } from '$app/paths';

	const dive = $derived(appState.lastDeepDive);

	// icona tipo parola per le righe (come nei badge)
	function typeIcon(tipo?: string, kanji?: boolean): string {
		if (kanji) return '漢';
		if (!tipo) return '📖';
		if (tipo.startsWith('動詞')) return '🏃';
		if (tipo.startsWith('名詞')) return '📦';
		if (tipo.startsWith('形容詞')) return '🎨';
		if (tipo.startsWith('副詞')) return '🔀';
		if (tipo.startsWith('助詞')) return '🪝';
		if (tipo.startsWith('助数詞')) return '🔢';
		if (tipo.startsWith('慣用表現')) return '💬';
		return '📖';
	}
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

		{#if dive.question}
			<section class="block">
				<p class="block-title">La domanda</p>
				<p class="q-text">{dive.question}</p>
				{#if dive.correctReason}
					<p class="correct-note">✅ {dive.correctReason}</p>
				{/if}
				{#each dive.notes as note (note.choice)}
					<p class="wrong-note">❌ <span class="nc">{note.choice}</span> — {note.reason}</p>
				{/each}
			</section>
		{/if}

		<section class="block">
			<p class="block-title">Da approfondire</p>
			<div class="rows">
				{#each dive.dives as d (d.href)}
					<div class="row" class:primary={d.primary}>
						<a class="row-main" href={d.href}>
							{#if d.kanji}
								<span class="kanji-icon">漢</span>
							{:else}
								<span class="r-icon">{typeIcon(d.tipo, d.kanji)}</span>
							{/if}
							<span class="r-label">{d.label}</span>
							{#if d.level}<span class="r-level">{d.level}</span>{/if}
							{#if d.meaning}<span class="r-mean">{d.meaning}</span>{/if}
						</a>
						{#if d.consolidaHref}
							<a class="r-drill" href={d.consolidaHref} title="Consolida">💪</a>
						{/if}
					</div>
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
	.q-text { margin: 0; font-size: 1.05rem; font-weight: 600; }
	.correct-note { margin: 0; font-size: 0.9rem; color: var(--success); font-weight: 600; }
	.wrong-note { margin: 0; font-size: 0.85rem; color: var(--muted); }
	.nc { font-weight: 700; color: var(--ink); }

	.rows { display: grid; gap: 6px; }
	.row { display: flex; align-items: stretch; gap: 8px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface-2); overflow: hidden; }
	.row.primary { border-color: var(--brand); }
	.row-main { flex: 1; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 8px 12px; text-decoration: none; color: var(--ink); }
	.row-main:hover { background: rgba(107,160,242,0.1); }
	.r-icon { font-size: 1.1rem; }
	.kanji-icon {
		display: inline-flex; align-items: center; justify-content: center;
		width: 1.5em; height: 1.5em; border-radius: 8px;
		background: radial-gradient(circle at 30% 30%, #c084fc, #7c3aed);
		color: #fff; font-weight: 800; font-size: 0.95em; line-height: 1;
		text-shadow: 0 1px 1px rgba(0,0,0,0.25);
		box-shadow: inset 0 -2px 3px rgba(0,0,0,0.18), inset 0 2px 3px rgba(255,255,255,0.35);
	}
	.r-label { font-size: 1.15rem; font-weight: 700; }
	.r-level { font-size: 0.65rem; font-weight: 700; padding: 1px 6px; border-radius: 6px; background: var(--surface); border: 1px solid var(--line); color: var(--muted); }
	.r-mean { font-size: 0.8rem; color: var(--muted); flex: 1; min-width: 80px; }
	.r-drill { display: grid; place-items: center; padding: 0 12px; font-size: 1.1rem; text-decoration: none; border-left: 1px solid var(--line); }
	.r-drill:hover { background: rgba(107,160,242,0.14); }
	.resume { justify-self: start; padding: 8px 16px; border-radius: 8px; background: var(--brand); color: #fff; font-weight: 700; text-decoration: none; }
	.muted { color: var(--muted); }
</style>
