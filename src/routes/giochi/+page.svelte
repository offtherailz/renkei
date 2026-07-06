<script lang="ts">
	import { base } from '$app/paths';
	import { generateReading, type GeneratedReading } from '$lib/core/counterGen';
	import { speakSentenceJapanese } from '$lib/core/tts';
	import { getHighscore, submitScore } from '$lib/core/gameScores';

	// Categorie giocabili: ognuna tiene il proprio record.
	const CATEGORIES = [
		{ id: '日', label: 'Giorni del mese', icon: '📅', hint: '1-31, con le native irregolari' },
		{ id: '時', label: 'Ore', icon: '🕐', hint: 'よじ, しちじ, くじ…' },
		{ id: '分', label: 'Minuti', icon: '⏱️', hint: 'rendaku ふん / ぷん' },
		{ id: '円', label: 'Prezzi (yen)', icon: '💴', hint: 'rendaku di 百 e 千' },
		{ id: 'mix', label: 'Misto', icon: '🎲', hint: 'un po\' di tutto' }
	] as const;

	type CatId = (typeof CATEGORIES)[number]['id'];

	let category = $state<CatId | null>(null);
	let question = $state<GeneratedReading | null>(null);
	let choices = $state<string[]>([]);
	let picked = $state<string | null>(null);
	let streak = $state(0);
	let best = $state(0);
	let isRecord = $state(false);
	let gameOver = $state(false);

	function gameId(cat: CatId): string {
		return `read-${cat}`;
	}

	function shuffle<T>(xs: T[]): T[] {
		const a = [...xs];
		for (let i = a.length - 1; i > 0; i -= 1) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j]!, a[i]!];
		}
		return a;
	}

	function nextQuestion(): void {
		if (!category) return;
		const counterId = category === 'mix'
			? (['日', '時', '分', '円'][Math.floor(Math.random() * 4)] as string)
			: category;
		// generateReading può occasionalmente dare pochi distrattori: riprova.
		let gen: GeneratedReading | null = null;
		for (let i = 0; i < 8 && !gen; i += 1) {
			const g = generateReading(counterId);
			if (g && g.distractors.length >= 1) gen = g;
		}
		if (!gen) return;
		question = gen;
		choices = shuffle([gen.correct, ...gen.distractors]);
		picked = null;
	}

	function start(cat: CatId): void {
		category = cat;
		streak = 0;
		best = getHighscore(gameId(cat));
		isRecord = false;
		gameOver = false;
		nextQuestion();
	}

	function pick(choice: string): void {
		if (picked !== null || !question) return;
		picked = choice;
		speakSentenceJapanese(question.correct);
		if (choice === question.correct) {
			streak += 1;
			if (streak > best) {
				best = streak;
				isRecord = true;
			}
		} else {
			gameOver = true;
			if (category) submitScore(gameId(category), streak);
		}
	}

	function proceed(): void {
		if (gameOver) {
			if (category) start(category);
			return;
		}
		nextQuestion();
	}

	function quit(): void {
		if (category && !gameOver) submitScore(gameId(category), streak);
		category = null;
		question = null;
	}
</script>

<div class="games-page">
	{#if !category}
		<h1 class="page-title">🎮 Giochi sui numeri</h1>
		<p class="page-sub">
			Leggi numero + contatore il più a lungo possibile: un errore e la serie riparte.
			Il record è tuo, separato dall'XP di studio.
		</p>
		<div class="cat-grid">
			{#each CATEGORIES as cat}
				<button class="cat-card" onclick={() => start(cat.id)}>
					<span class="cat-icon">{cat.icon}</span>
					<span class="cat-label">{cat.label}</span>
					<span class="cat-hint">{cat.hint}</span>
					<span class="cat-best">🏆 record: {getHighscore(gameId(cat.id))}</span>
				</button>
			{/each}
		</div>
		<a class="back-link" href="{base}/contatori">← Ripassa i contatori</a>
	{:else}
		<div class="game-head">
			<button class="quit" onclick={quit}>← Esci</button>
			<span class="score">Serie: <strong>{streak}</strong> · 🏆 {best}</span>
		</div>

		{#if question}
			<article class="game-card">
				<p class="game-hint">Come si legge?</p>
				<p class="game-prompt">{question.prompt}</p>
				<div class="choices">
					{#each choices as choice (choice)}
						<button
							class="choice"
							class:right={picked !== null && choice === question.correct}
							class:wrong={picked === choice && choice !== question.correct}
							disabled={picked !== null}
							onclick={() => pick(choice)}
						>{choice}</button>
					{/each}
				</div>

				{#if picked !== null}
					{#if gameOver}
						<p class="verdict ko">Ahi! Era <strong>{question.correct}</strong>. Serie: {streak}{#if best > 0} · record {best}{/if}</p>
						<button class="proceed" onclick={proceed}>🔁 Rigioca</button>
					{:else}
						<p class="verdict ok">{isRecord ? '🏆 Nuovo record!' : '✓ Giusto!'}</p>
						<button class="proceed" onclick={proceed}>Avanti →</button>
					{/if}
				{/if}
			</article>
		{/if}
	{/if}
</div>

<style>
	.games-page { display: grid; gap: 14px; }
	.page-title { margin: 0; font-size: 1.3rem; }
	.page-sub { margin: 0; font-size: 0.85rem; color: var(--muted); }

	.cat-grid { display: grid; gap: 10px; }
	.cat-card {
		display: grid;
		grid-template-columns: auto 1fr;
		grid-template-rows: auto auto;
		column-gap: 12px;
		align-items: center;
		text-align: left;
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: 14px;
		padding: 12px 14px;
		cursor: pointer;
	}
	.cat-card:hover { border-color: var(--brand); }
	.cat-icon { grid-row: 1 / 3; font-size: 1.9rem; }
	.cat-label { font-weight: 700; font-size: 1rem; }
	.cat-hint { font-size: 0.78rem; color: var(--muted); }
	.cat-best { grid-column: 2; font-size: 0.75rem; color: var(--brand); font-weight: 600; margin-top: 2px; }

	.game-head { display: flex; align-items: center; justify-content: space-between; }
	.quit { background: none; border: 1px solid var(--line); border-radius: 8px; padding: 6px 12px; font-size: 0.82rem; cursor: pointer; color: var(--muted); }
	.score { font-size: 0.9rem; color: var(--ink); }

	.game-card { background: var(--surface); border-radius: 16px; padding: 20px; box-shadow: 0 2px 10px rgba(14,29,51,0.07); display: grid; gap: 14px; }
	.game-hint { margin: 0; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); text-align: center; }
	.game-prompt { margin: 0; font-size: 3rem; font-weight: 800; text-align: center; }
	.choices { display: grid; gap: 8px; }
	.choice { padding: 12px 14px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface-2); color: var(--ink); font-size: 1.25rem; text-align: center; cursor: pointer; }
	.choice:hover:not(:disabled) { border-color: var(--brand); }
	.choice:disabled { cursor: default; }
	.choice.right { border-color: var(--success); background: rgba(52,201,138,0.16); }
	.choice.wrong { border-color: var(--danger); background: rgba(239,107,107,0.16); }
	.verdict { margin: 0; text-align: center; font-size: 0.95rem; font-weight: 600; }
	.verdict.ok { color: var(--success, #16a34a); }
	.verdict.ko { color: var(--danger, #dc2626); }
	.proceed { justify-self: center; padding: 8px 20px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 600; cursor: pointer; }

	.back-link { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
</style>
