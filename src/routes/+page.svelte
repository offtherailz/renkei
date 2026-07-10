<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { appState } from '$lib/stores.svelte';
	import { loadObjectiveSummaries, countDueCards, type ObjectiveSummary } from '$lib/db/queries';
	import { db } from '$lib/db/schema';
	import { normalizeMastery } from '$lib/core/srs';
	import JlptBadge from '$lib/components/JlptBadge.svelte';

	let summaries = $state<ObjectiveSummary[]>([]);
	let dueCount = $state(0);
	let loading = $state(true);

	// ── Piano di oggi ──
	type WeakItem = { label: string; consolida: string; pct: number };
	let weakest = $state<WeakItem[]>([]);
	// attività a rotazione giornaliera (varietà senza dover scegliere)
	const ACTIVITIES = [
		{ href: 'avventure', icon: '🗺️', label: "Un'avventura", hint: 'kaimono, ristorante o treno' },
		{ href: 'lettura', icon: '⚡', label: 'Lettura veloce', hint: 'un testo a tempo' },
		{ href: 'choukai', icon: '👂', label: '聴解 trappola', hint: 'un dialogo solo audio' },
		{ href: 'skimming', icon: '🔎', label: 'Skimming', hint: "trova l'informazione" },
		{ href: 'riordina', icon: '🧩', label: 'Riordina la frase', hint: 'sintassi a tocchi' }
	];
	const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
	const activity = ACTIVITIES[dayOfYear % ACTIVITIES.length]!;

	async function loadWeakest(): Promise<void> {
		const rows = await db.srs_progress.toArray();
		const scored = rows
			.map((r) => ({ r, pct: normalizeMastery(r.srs_stage, r.mastery_points) }))
			.filter((x) => x.pct < 60)
			.sort((a, b) => a.pct - b.pct)
			.slice(0, 3);
		const out: WeakItem[] = [];
		for (const { r, pct } of scored) {
			const [kind, ...rest] = r.id_item.includes(':') ? r.id_item.split(':') : ['word', r.id_item];
			const raw = rest.join(':') || r.id_item;
			let label = raw;
			let consolida = r.id_item;
			if (kind === 'word') {
				label = (await db.words.get(raw))?.scrittura ?? raw;
				consolida = raw;
			} else if (kind === 'grammar') {
				label = (await db.grammar.get(raw))?.struttura ?? raw;
			} else if (kind === 'counter') {
				label = (await db.counters.get(raw))?.simbolo ?? raw;
			} else if (kind === 'kanji') {
				consolida = raw;
			}
			out.push({ label, consolida, pct });
		}
		weakest = out;
	}

	async function loadData() {
		loading = true;
		[summaries, dueCount] = await Promise.all([loadObjectiveSummaries(), countDueCards()]);
		void loadWeakest();
		loading = false;
	}

	// Attiva/pausa un obiettivo: il quiz pesca solo da quelli "in studio".
	async function toggleObjective(id: string, enabled: boolean): Promise<void> {
		await db.study_objectives.update(id, { study_enabled: enabled, updated_at: Date.now() });
		summaries = await loadObjectiveSummaries();
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
	<span>📋 <strong>{dueCount}</strong> ripass{dueCount === 1 ? 'o' : 'i'} in attesa</span>
	<a href="{base}/quiz" class="btn btn-primary btn-sm">Ripassare ora</a>
</div>
{/if}

<section class="section-card">
	<h2 class="section-title">☀️ Il piano di oggi</h2>
	<div class="plan-list">
		<a class="plan-row" href="{base}/quiz">
			<span class="plan-icon">{dueCount > 0 ? '📋' : '✅'}</span>
			<span class="plan-body">
				<span class="plan-label">Ripassi SRS</span>
				<span class="plan-hint">{dueCount > 0 ? `${dueCount} in attesa: prima questi!` : 'tutto fatto — torna più tardi'}</span>
			</span>
			<span class="plan-go">→</span>
		</a>
		{#if weakest.length > 0}
			<div class="plan-row static">
				<span class="plan-icon">💪</span>
				<span class="plan-body">
					<span class="plan-label">I tuoi punti deboli</span>
					<span class="plan-chips">
						{#each weakest as w (w.consolida)}
							<a class="weak-chip" href="{base}/consolida/{encodeURIComponent(w.consolida)}">{w.label} <small>{w.pct}%</small></a>
						{/each}
					</span>
				</span>
			</div>
		{/if}
		<a class="plan-row" href="{base}/{activity.href}">
			<span class="plan-icon">{activity.icon}</span>
			<span class="plan-body">
				<span class="plan-label">Attività del giorno: {activity.label}</span>
				<span class="plan-hint">{activity.hint} — domani cambia</span>
			</span>
			<span class="plan-go">→</span>
		</a>
	</div>
</section>

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
						<button
							class="obj-status"
							class:enabled={s.objective.study_enabled}
							title={s.objective.study_enabled ? 'Tocca per mettere in pausa' : 'Tocca per mettere in studio'}
							onclick={() => toggleObjective(s.objective.id, !s.objective.study_enabled)}
						>
							{s.objective.study_enabled ? '✓ In studio' : '⏸ Pausa'}
						</button>
					</div>
					<div class="obj-meta">
						{s.totalItems} item • {s.words} parole • {s.kanji} kanji • {s.grammar} grammatica
					</div>
					{#if s.dueCount > 0}
						<div class="obj-due">{s.dueCount} ripass{s.dueCount === 1 ? 'o' : 'i'} pront{s.dueCount === 1 ? 'o' : 'i'}</div>
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
	<h2 class="section-title">🧠 Studia</h2>
	<div class="quick-grid">
		<a href="{base}/quiz" class="quick-card">
			<span class="quick-icon">📋</span>
			<span>Sessione quiz</span>
		</a>
		<a href="{base}/courses" class="quick-card">
			<span class="quick-icon">📚</span>
			<span>Corsi</span>
		</a>
		<a href="{base}/ascolto" class="quick-card">
			<span class="quick-icon">🎧</span>
			<span>Ascolto dialoghi</span>
		</a>
	</div>

	<h2 class="section-title group">🎮 Gioca e vivi</h2>
	<div class="quick-grid">
		<a href="{base}/giochi" class="quick-card">
			<span class="quick-icon">🎮</span>
			<span>Giochi</span>
		</a>
		<a href="{base}/avventure" class="quick-card">
			<span class="quick-icon">🗺️</span>
			<span>Avventure</span>
		</a>
		<a href="{base}/lettura" class="quick-card">
			<span class="quick-icon">⚡</span>
			<span>Lettura veloce</span>
		</a>
	</div>

	<h2 class="section-title group">📖 Cataloghi</h2>
	<div class="quick-grid">
		<a href="{base}/consolida" class="quick-card">
			<span class="quick-icon">💪</span>
			<span>Vocabolario</span>
		</a>
		<a href="{base}/forme" class="quick-card">
			<span class="quick-icon">📖</span>
			<span>Forme grammaticali</span>
		</a>
		<a href="{base}/forme-composte" class="quick-card">
			<span class="quick-icon">🧩</span>
			<span>Forme composte</span>
		</a>
		<a href="{base}/particelle" class="quick-card">
			<span class="quick-icon">🪝</span>
			<span>Particelle</span>
		</a>
		<a href="{base}/contatori" class="quick-card">
			<span class="quick-icon">🔢</span>
			<span>Contatori</span>
		</a>
	</div>

	<h2 class="section-title group">⚙️ Altro</h2>
	<div class="quick-grid">
		<a href="{base}/stats" class="quick-card">
			<span class="quick-icon">📊</span>
			<span>Statistiche</span>
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

	.logo { border-radius: 10px; width: 52px; height: 52px; display: block; }

	.topbar-info { min-width: 0; }

	.topbar-title {
		margin: 0;
		font-size: 1.15rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
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
		border: 1px solid transparent;
		cursor: pointer;
	}
	.obj-status:hover { border-color: var(--brand); }

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

	.plan-list { display: grid; gap: 8px; }
	.plan-row { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface-2); text-decoration: none; color: var(--ink); }
	.plan-row:not(.static):hover { border-color: var(--brand); }
	.plan-icon { font-size: 1.4rem; }
	.plan-body { flex: 1; min-width: 0; display: grid; gap: 2px; }
	.plan-label { font-size: 0.88rem; font-weight: 700; }
	.plan-hint { font-size: 0.75rem; color: var(--muted); }
	.plan-go { color: var(--brand); font-weight: 700; }
	.plan-chips { display: flex; flex-wrap: wrap; gap: 6px; }
	.weak-chip { padding: 3px 10px; border: 1px solid var(--line); border-radius: 999px; background: var(--surface); text-decoration: none; color: var(--ink); font-size: 0.85rem; }
	.weak-chip small { color: var(--muted); font-size: 0.7rem; }
	.weak-chip:hover { border-color: var(--brand); }

	.quick-links .section-title { margin-bottom: 12px; }
	.quick-links .section-title.group { margin-top: 18px; }

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
