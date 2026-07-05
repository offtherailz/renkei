<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { appState } from '$lib/stores.svelte';
	import { loadObjectiveSummaries, countDueCards, type ObjectiveSummary } from '$lib/db/queries';
	import JlptBadge from '$lib/components/JlptBadge.svelte';

	let summaries = $state<ObjectiveSummary[]>([]);
	let dueCount = $state(0);
	let loading = $state(true);

	async function loadData() {
		loading = true;
		[summaries, dueCount] = await Promise.all([loadObjectiveSummaries(), countDueCards()]);
		loading = false;
	}

	onMount(loadData);

	// Ricarica quando appState viene inizializzato
	$effect(() => {
		if (appState.initialized) loadData();
	});

	function progressColor(p: number): string {
		if (p >= 75) return 'var(--progress-good)';
		if (p >= 40) return 'var(--progress-mid)';
		return 'var(--progress-low)';
	}

	const userLevel = $derived(appState.userProfile?.livello ?? 1);
	const userXp = $derived(appState.userProfile?.xp_totali ?? 0);
	const streak = $derived(appState.userProfile?.streak_giorni ?? 0);
	const xpForNextLevel = $derived(userLevel * 220);
	const xpProgress = $derived(Math.min(100, Math.round((userXp % 220) / 220 * 100)));
</script>

<header class="topbar">
	<img src="{base}/renkei-logo.svg" alt="Renkei" class="logo" width="52" height="52" />
	<div class="topbar-info">
		<h1 class="topbar-title">連携 Renkei</h1>
		<p class="topbar-sub">Lv.{userLevel} • 🔥 {streak} giorni</p>
	</div>
	<div class="topbar-xp">
		<div class="xp-badge">XP {userXp}</div>
		<div class="xp-bar-wrap">
			<div class="xp-bar-fill" style="width:{xpProgress}%"></div>
		</div>
	</div>
</header>

{#if dueCount > 0}
<div class="due-banner">
	<span>📋 <strong>{dueCount}</strong> ripasso{dueCount === 1 ? '' : 'i'} in attesa</span>
	<a href="{base}/quiz" class="btn btn-primary btn-sm">Ripassare ora</a>
</div>
{/if}

<section class="section-card">
	<div class="section-header">
		<h2 class="section-title">Obiettivi di studio</h2>
		<a href="{base}/quiz" class="btn btn-primary">▶ Avvia sessione{dueCount > 0 ? ` · ${dueCount}` : ''}</a>
	</div>

	{#if loading}
		<p class="muted-text">Caricamento…</p>
	{:else if summaries.length === 0}
		<p class="muted-text">Nessun obiettivo trovato. Il database si sta inizializzando…</p>
	{:else}
		<div class="objective-list">
			{#each summaries as s}
				<article class="objective-card" class:disabled={!s.objective.study_enabled}>
					<div class="obj-top">
						<div>
							<strong class="obj-name">{s.objective.name}</strong>
							{#if s.objective.target_jlpt}
								<JlptBadge level={s.objective.target_jlpt} />
							{/if}
						</div>
						<span class="obj-status" class:enabled={s.objective.study_enabled}>
							{s.objective.study_enabled ? 'In studio' : 'Pausa'}
						</span>
					</div>
					<div class="obj-meta">
						{s.totalItems} item • {s.words} parole • {s.kanji} kanji • {s.grammar} grammatica
					</div>
					{#if s.dueCount > 0}
						<div class="obj-due">{s.dueCount} ripasso{s.dueCount === 1 ? '' : 'i'} pronti</div>
					{/if}
					<div class="bar-wrap">
						<div class="bar-fill" style="width:{s.progress}%; background:{progressColor(s.progress)}"></div>
					</div>
					<div class="obj-progress-label">Consolidamento: {s.progress}%</div>
				</article>
			{/each}
		</div>
	{/if}
</section>

<section class="section-card quick-links">
	<h2 class="section-title">Naviga</h2>
	<div class="quick-grid">
		<a href="{base}/courses" class="quick-card">
			<span class="quick-icon">📚</span>
			<span>Corsi</span>
		</a>
		<a href="{base}/stats" class="quick-card">
			<span class="quick-icon">📊</span>
			<span>Statistiche</span>
		</a>
		<a href="{base}/ascolto" class="quick-card">
			<span class="quick-icon">🎧</span>
			<span>Ascolto (聴解)</span>
		</a>
		<a href="{base}/consolida" class="quick-card">
			<span class="quick-icon">💪</span>
			<span>Vocabolario / Consolida</span>
		</a>
		<a href="{base}/forme" class="quick-card">
			<span class="quick-icon">📖</span>
			<span>Forme grammaticali</span>
		</a>
		<a href="{base}/particelle" class="quick-card">
			<span class="quick-icon">🪝</span>
			<span>Particelle</span>
		</a>
		<a href="{base}/contatori" class="quick-card">
			<span class="quick-icon">🔢</span>
			<span>Contatori</span>
		</a>
		<a href="{base}/settings" class="quick-card">
			<span class="quick-icon">⚙️</span>
			<span>Impostazioni</span>
		</a>
	</div>
</section>

<style>
	.topbar {
		background: linear-gradient(155deg, #0f2d64, #184ca7 55%, #2969d8);
		color: #fff;
		border-radius: 18px;
		padding: 16px;
		display: grid;
		grid-template-columns: 56px 1fr auto;
		gap: 12px;
		align-items: center;
		box-shadow: 0 14px 28px rgba(20, 52, 103, 0.28);
	}

	.logo { border-radius: 10px; }

	.topbar-title {
		margin: 0;
		font-size: 1.15rem;
		font-weight: 700;
		letter-spacing: -0.01em;
	}

	.topbar-sub {
		margin: 2px 0 0;
		font-size: 0.78rem;
		opacity: 0.85;
	}

	.topbar-xp {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 4px;
	}

	.xp-badge {
		font-size: 0.7rem;
		font-weight: 700;
		background: rgba(255,255,255,0.18);
		padding: 2px 8px;
		border-radius: 20px;
	}

	.xp-bar-wrap {
		width: 60px;
		height: 4px;
		background: rgba(255,255,255,0.25);
		border-radius: 4px;
		overflow: hidden;
	}

	.xp-bar-fill {
		height: 100%;
		background: #7dd3fc;
		border-radius: 4px;
		transition: width 0.4s;
	}

	.due-banner {
		background: #fffbeb;
		border: 1px solid #fbbf24;
		color: #92400e;
		border-radius: 12px;
		padding: 10px 16px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.9rem;
		gap: 8px;
	}

	.section-card {
		background: var(--surface);
		border-radius: 18px;
		padding: 18px;
		box-shadow: 0 2px 12px rgba(14, 29, 51, 0.07);
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 14px;
		gap: 8px;
	}

	.section-title {
		margin: 0 0 14px;
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--ink);
	}

	.section-header .section-title { margin: 0; }

	.objective-list {
		display: grid;
		gap: 10px;
	}

	.objective-card {
		border: 1px solid var(--line);
		border-radius: 12px;
		padding: 12px 14px;
		background: var(--surface-2);
	}

	.objective-card.disabled { opacity: 0.55; }

	.obj-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 8px;
		margin-bottom: 4px;
	}

	.obj-name { font-size: 0.9rem; }

	.obj-status {
		font-size: 0.7rem;
		font-weight: 600;
		padding: 2px 8px;
		border-radius: 8px;
		white-space: nowrap;
		background: #f1f5f9;
		color: #475569;
	}

	.obj-status.enabled {
		background: #dcfce7;
		color: #166534;
	}

	.obj-meta {
		font-size: 0.75rem;
		color: var(--muted);
		margin-bottom: 4px;
	}

	.obj-due {
		font-size: 0.73rem;
		color: var(--brand);
		font-weight: 600;
		margin-bottom: 4px;
	}

	.bar-wrap {
		height: 6px;
		background: var(--line);
		border-radius: 4px;
		overflow: hidden;
		margin: 6px 0 4px;
	}

	.bar-fill {
		height: 100%;
		border-radius: 4px;
		transition: width 0.4s;
	}

	.obj-progress-label {
		font-size: 0.7rem;
		color: var(--muted);
	}

	.quick-links .section-title { margin-bottom: 12px; }

	.quick-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
	}

	.quick-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 14px 8px;
		border-radius: 12px;
		background: var(--surface-2);
		border: 1px solid var(--line);
		text-decoration: none;
		color: var(--ink);
		font-size: 0.8rem;
		font-weight: 500;
		transition: background 150ms;
	}

	.quick-card:hover { background: #e8f0fe; }

	.quick-icon { font-size: 1.4rem; }

	.muted-text { color: var(--muted); font-size: 0.85rem; }

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 8px 16px;
		border-radius: 10px;
		font-weight: 600;
		font-size: 0.85rem;
		text-decoration: none;
		border: none;
		cursor: pointer;
		transition: opacity 150ms;
	}

	.btn:hover { opacity: 0.88; }

	.btn-primary {
		background: var(--brand);
		color: #fff;
	}

	.btn-sm { padding: 5px 12px; font-size: 0.78rem; }
</style>
