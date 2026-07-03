<script lang="ts">
	import { onMount } from 'svelte';
	import { appState } from '$lib/stores.svelte';

	const STUDY_STATS_KEY = 'renkei_study_session_stats_v1';

	interface SessionStats {
		startedAt: number;
		endedAt: number;
		answers: number;
		correct: number;
		wrong: number;
		timeout: number;
	}

	interface DailyAggregate {
		day: string;
		durationMs: number;
		answers: number;
		correct: number;
		wrong: number;
	}

	let history = $state<SessionStats[]>([]);
	let week = $state<DailyAggregate[]>([]);

	const weekTotals = $derived(() => {
		return week.reduce(
			(acc, row) => {
				acc.durationMs += row.durationMs;
				acc.answers += row.answers;
				acc.correct += row.correct;
				return acc;
			},
			{ durationMs: 0, answers: 0, correct: 0 }
		);
	});

	const weeklyMins = $derived(() => Math.round(weekTotals().durationMs / 60_000));
	const weeklyAccuracy = $derived(() => {
		const t = weekTotals();
		return t.answers > 0 ? Math.round((t.correct / t.answers) * 100) : 0;
	});

	const activeSession = $derived(appState.sessionState);

	function toDayKey(ts: number): string {
		return new Date(ts).toISOString().slice(0, 10);
	}

	function loadStats(): void {
		const raw = localStorage.getItem(STUDY_STATS_KEY) ?? '[]';
		try {
			history = (JSON.parse(raw) as SessionStats[]).filter(
				(r) => typeof r.startedAt === 'number'
			);
		} catch {
			history = [];
		}

		const now = Date.now();
		const cutoff = now - 7 * 24 * 60 * 60 * 1000;
		const map = new Map<string, DailyAggregate>();
		for (const row of history) {
			if (row.endedAt < cutoff) continue;
			const day = toDayKey(row.endedAt);
			const cur = map.get(day) ?? { day, durationMs: 0, answers: 0, correct: 0, wrong: 0 };
			cur.durationMs += Math.max(0, row.endedAt - row.startedAt);
			cur.answers += row.answers;
			cur.correct += row.correct;
			cur.wrong += row.wrong;
			map.set(day, cur);
		}
		week = [...map.values()].sort((a, b) => a.day.localeCompare(b.day));
	}

	onMount(loadStats);

	function formatDuration(ms: number): string {
		const mins = Math.floor(ms / 60_000);
		if (mins < 60) return `${mins} min`;
		return `${Math.floor(mins / 60)}h ${mins % 60}m`;
	}

	function maxAnswers(): number {
		return Math.max(...week.map((d) => d.answers), 1);
	}
</script>

<h1 class="page-title">Statistiche</h1>

<!-- Sessione attiva -->
{#if activeSession}
<section class="section-card session-live">
	<p class="card-title">Sessione in corso 🔴</p>
	<div class="stat-row">
		<div class="stat-box">
			<span class="stat-num">{activeSession.answers}</span>
			<span class="stat-label">Risposte</span>
		</div>
		<div class="stat-box">
			<span class="stat-num">{activeSession.correct}</span>
			<span class="stat-label">Corrette</span>
		</div>
		<div class="stat-box">
			<span class="stat-num">{activeSession.wrong}</span>
			<span class="stat-label">Errate</span>
		</div>
	</div>
</section>
{/if}

<!-- Settimana -->
<section class="section-card">
	<p class="card-title">Ultimi 7 giorni</p>
	<div class="stat-row">
		<div class="stat-box">
			<span class="stat-num">{weeklyMins()}</span>
			<span class="stat-label">Minuti totali</span>
		</div>
		<div class="stat-box">
			<span class="stat-num">{weekTotals().answers}</span>
			<span class="stat-label">Risposte</span>
		</div>
		<div class="stat-box">
			<span class="stat-num">{weeklyAccuracy()}%</span>
			<span class="stat-label">Accuracy</span>
		</div>
	</div>

	{#if week.length > 0}
	<div class="bar-chart">
		{#each week as day}
			<div class="chart-col">
				<div
					class="chart-bar"
					style="height:{Math.round((day.answers / maxAnswers()) * 80)}px"
					title="{day.day}: {day.answers} risposte"
				></div>
				<span class="chart-label">{day.day.slice(5)}</span>
			</div>
		{/each}
	</div>
	{:else}
	<p class="muted-text">Nessuna sessione questa settimana.</p>
	{/if}
</section>

<!-- Obiettivi giornalieri -->
<section class="section-card">
	<p class="card-title">Obiettivo giornaliero</p>
	<div class="goal-row">
		<span>Target JLPT:</span>
		<strong>{appState.studyGoal?.target_jlpt ?? 'N4'}</strong>
	</div>
	<div class="goal-row">
		<span>Parole nuove al giorno:</span>
		<strong>{appState.studyGoal?.daily_new_words ?? 10}</strong>
	</div>
	<div class="goal-row">
		<span>Revisioni al giorno:</span>
		<strong>{appState.studyGoal?.daily_reviews ?? 20}</strong>
	</div>
</section>

<!-- Sessioni recenti -->
<section class="section-card">
	<p class="card-title">Sessioni recenti ({history.length} totali)</p>
	{#if history.length === 0}
		<p class="muted-text">Nessuna sessione registrata.</p>
	{:else}
		<div class="session-list">
			{#each [...history].reverse().slice(0, 10) as s}
				<div class="session-row">
					<span class="session-date">{new Date(s.startedAt).toLocaleDateString()} {new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
					<span class="session-stat">{formatDuration(s.endedAt - s.startedAt)}</span>
					<span class="session-stat">{s.answers} risp.</span>
					<span class="session-stat acc">
						{s.answers > 0 ? Math.round((s.correct / s.answers) * 100) : 0}%
					</span>
				</div>
			{/each}
		</div>
	{/if}
</section>

<style>
	.page-title { margin: 0 0 4px; font-size: 1.2rem; font-weight: 700; }

	.section-card {
		background: var(--surface);
		border-radius: 16px;
		padding: 18px;
		box-shadow: 0 2px 10px rgba(14,29,51,0.07);
		display: grid;
		gap: 12px;
	}

	.session-live { border: 1.5px solid #fbbf24; background: #fffbeb; }

	.card-title {
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin: 0;
	}

	.stat-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }

	.stat-box {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 12px 8px;
		background: var(--surface-2);
		border: 1px solid var(--line);
		border-radius: 10px;
		gap: 2px;
	}

	.stat-num { font-size: 1.5rem; font-weight: 700; color: var(--brand); }
	.stat-label { font-size: 0.68rem; color: var(--muted); text-align: center; }

	.bar-chart {
		display: flex;
		align-items: flex-end;
		gap: 6px;
		height: 100px;
		padding: 8px 0 0;
	}

	.chart-col {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		height: 100%;
		justify-content: flex-end;
	}

	.chart-bar {
		width: 100%;
		max-width: 32px;
		background: var(--brand);
		border-radius: 4px 4px 0 0;
		min-height: 4px;
		transition: height 0.3s;
	}

	.chart-label { font-size: 0.6rem; color: var(--muted); }

	.goal-row {
		display: flex;
		justify-content: space-between;
		font-size: 0.85rem;
		padding: 6px 0;
		border-bottom: 1px solid var(--line);
	}

	.goal-row:last-child { border-bottom: none; }

	.session-list { display: grid; gap: 6px; }

	.session-row {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 8px;
		border-radius: 8px;
		background: var(--surface-2);
		font-size: 0.78rem;
		flex-wrap: wrap;
	}

	.session-date { color: var(--muted); flex: 1; min-width: 120px; }
	.session-stat { color: var(--ink); font-weight: 500; }
	.session-stat.acc { color: var(--success); font-weight: 700; }

	.muted-text { color: var(--muted); font-size: 0.85rem; margin: 0; }
</style>
