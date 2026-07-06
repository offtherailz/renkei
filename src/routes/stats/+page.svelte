<script lang="ts">
	import { onMount } from 'svelte';
	import { appState } from '$lib/stores.svelte';
	import { db } from '$lib/db/schema';
	import { loadSkillMastery, type SkillMastery } from '$lib/db/queries';
	import type { StudySessionRecord } from '$lib/types/models';

	interface DailyAggregate {
		day: string;
		durationMs: number;
		answers: number;
		correct: number;
		wrong: number;
	}

	let history = $state<StudySessionRecord[]>([]);
	let week = $state<DailyAggregate[]>([]);
	let skills = $state<SkillMastery | null>(null);
	type Acc = { answers: number; correct: number };
	let skillAcc = $state<Record<'words' | 'kanji' | 'grammar', Acc>>({
		words: { answers: 0, correct: 0 },
		kanji: { answers: 0, correct: 0 },
		grammar: { answers: 0, correct: 0 }
	});

	const SKILL_META = [
		{ key: 'words', label: 'Parole', icon: '📦' },
		{ key: 'kanji', label: 'Kanji', icon: '漢' },
		{ key: 'grammar', label: 'Grammatica', icon: '📖' }
	] as const;

	function masteryColor(p: number): string {
		if (p >= 75) return 'var(--success, #16a34a)';
		if (p >= 40) return '#d97706';
		return '#dc2626';
	}

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

	async function loadStats(): Promise<void> {
		history = await db.study_sessions.orderBy('startedAt').toArray();

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
		skills = await loadSkillMastery();

		// Accuracy per skill: somma su tutte le sessioni che hanno il dettaglio.
		const acc: Record<'words' | 'kanji' | 'grammar', Acc> = {
			words: { answers: 0, correct: 0 },
			kanji: { answers: 0, correct: 0 },
			grammar: { answers: 0, correct: 0 }
		};
		for (const row of history) {
			if (!row.answersByType) continue;
			for (const k of ['words', 'kanji', 'grammar'] as const) {
				acc[k].answers += row.answersByType[k]?.answers ?? 0;
				acc[k].correct += row.answersByType[k]?.correct ?? 0;
			}
		}
		skillAcc = acc;
	}

	function accPct(k: 'words' | 'kanji' | 'grammar'): number | null {
		const a = skillAcc[k];
		return a.answers > 0 ? Math.round((a.correct / a.answers) * 100) : null;
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

<!-- Consolidamento per skill -->
{#if skills}
<section class="section-card">
	<p class="card-title">Consolidamento per skill</p>
	<div class="skill-list">
		{#each SKILL_META as meta}
			{@const s = skills[meta.key]}
			<div class="skill-row">
				<span class="skill-icon" class:kanji-icon={meta.icon === '漢'}>{meta.icon}</span>
				<div class="skill-body">
					<div class="skill-head">
						<span class="skill-label">{meta.label}</span>
						<span class="skill-meta">
							{s.total} in studio{#if s.due > 0} · <span class="skill-due">{s.due} da ripassare</span>{/if}{#if accPct(meta.key) !== null} · accuracy <span class="skill-acc">{accPct(meta.key)}%</span>{/if}
						</span>
					</div>
					<div class="skill-bar-wrap">
						<div class="skill-bar" style="width:{s.mastery}%; background:{masteryColor(s.mastery)}"></div>
					</div>
				</div>
				<span class="skill-pct">{s.mastery}%</span>
			</div>
		{/each}
	</div>
	<p class="muted-text skill-note">Consolidamento = foto dello stato SRS. Accuracy = risposte corrette su totale, cumulata dalle sessioni.</p>
</section>
{/if}

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

	.skill-list { display: grid; gap: 12px; }

	.skill-row { display: flex; align-items: center; gap: 10px; }

	.skill-icon {
		font-size: 1.3rem;
		width: 32px;
		text-align: center;
		flex-shrink: 0;
	}

	.skill-icon.kanji-icon {
		font-size: 1rem;
		font-weight: 700;
		color: #fff;
		background: var(--brand);
		border-radius: 6px;
		line-height: 32px;
		height: 32px;
	}

	.skill-body { flex: 1; min-width: 0; }

	.skill-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 8px;
		margin-bottom: 4px;
	}

	.skill-label { font-size: 0.85rem; font-weight: 600; }
	.skill-meta { font-size: 0.68rem; color: var(--muted); }
	.skill-due { color: var(--brand); font-weight: 600; }
	.skill-acc { color: var(--success, #16a34a); font-weight: 700; }

	.skill-bar-wrap {
		height: 6px;
		background: var(--line);
		border-radius: 4px;
		overflow: hidden;
	}

	.skill-bar { height: 100%; border-radius: 4px; transition: width 0.4s; }

	.skill-pct { font-size: 0.9rem; font-weight: 700; color: var(--ink); min-width: 38px; text-align: right; }

	.skill-note { margin-top: 10px; }

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
