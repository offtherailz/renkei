<script lang="ts">
	import { base } from '$app/paths';
	import {
		generateReading,
		generateClockReading,
		generateNumberDictation,
		type GeneratedReading
	} from '$lib/core/counterGen';
	import { speakSentenceJapanese } from '$lib/core/tts';
	import { getHighscore, submitScore } from '$lib/core/gameScores';

	// Giochi a scelta multipla ("leggi come si pronuncia"). id = contatore o 'clock'/'mix'.
	const READ_GAMES = [
		{ id: '日', label: 'Giorni del mese', icon: '📅', hint: '1-31, native irregolari' },
		{ id: '時', label: 'Ore', icon: '🕐', hint: 'よじ, しちじ, くじ…' },
		{ id: '分', label: 'Minuti', icon: '⏱️', hint: 'rendaku ふん / ぷん' },
		{ id: '円', label: 'Prezzi (yen)', icon: '💴', hint: 'rendaku di 百 e 千' },
		{ id: 'clock', label: 'Che ore sono?', icon: '⏰', hint: 'ore + minuti (4:30)' },
		{ id: 'mix', label: 'Misto', icon: '🎲', hint: "un po' di tutto" }
	] as const;

	type ReadId = (typeof READ_GAMES)[number]['id'];
	type Game = { kind: 'read'; cat: ReadId } | { kind: 'listen' } | null;

	let game = $state<Game>(null);
	let streak = $state(0);
	let best = $state(0);
	let isRecord = $state(false);
	let gameOver = $state(false);

	// scelta multipla
	let question = $state<GeneratedReading | null>(null);
	let choices = $state<string[]>([]);
	let picked = $state<string | null>(null);

	// dettato
	let dictation = $state<{ n: number; reading: string } | null>(null);
	let answer = $state('');
	let checked = $state(false);

	function gameId(g: NonNullable<Game>): string {
		return g.kind === 'read' ? `read-${g.cat}` : 'listen-number';
	}

	function shuffle<T>(xs: T[]): T[] {
		const a = [...xs];
		for (let i = a.length - 1; i > 0; i -= 1) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j]!, a[i]!];
		}
		return a;
	}

	function newReadQuestion(cat: ReadId): void {
		let gen: GeneratedReading | null = null;
		for (let i = 0; i < 8 && !gen; i += 1) {
			let g: GeneratedReading | null;
			if (cat === 'clock') g = generateClockReading();
			else {
				const counterId = cat === 'mix' ? (['日', '時', '分', '円', 'clock'][Math.floor(Math.random() * 5)] as string) : cat;
				g = counterId === 'clock' ? generateClockReading() : generateReading(counterId);
			}
			if (g && g.distractors.length >= 1) gen = g;
		}
		if (!gen) return;
		question = gen;
		choices = shuffle([gen.correct, ...gen.distractors]);
		picked = null;
	}

	function newDictation(): void {
		dictation = generateNumberDictation();
		answer = '';
		checked = false;
		speakSentenceJapanese(dictation.reading);
	}

	function start(g: NonNullable<Game>): void {
		game = g;
		streak = 0;
		best = getHighscore(gameId(g));
		isRecord = false;
		gameOver = false;
		if (g.kind === 'read') newReadQuestion(g.cat);
		else newDictation();
	}

	function registerResult(correct: boolean): void {
		if (correct) {
			streak += 1;
			if (streak > best) { best = streak; isRecord = true; }
		} else {
			gameOver = true;
			if (game) submitScore(gameId(game), streak);
		}
	}

	function pick(choice: string): void {
		if (picked !== null || !question) return;
		picked = choice;
		speakSentenceJapanese(question.correct);
		registerResult(choice === question.correct);
	}

	function checkDictation(): void {
		if (checked || !dictation || answer.trim() === '') return;
		checked = true;
		registerResult(Number(answer.replace(/[^\d]/g, '')) === dictation.n);
	}

	function proceed(): void {
		if (!game) return;
		if (gameOver) { start(game); return; }
		if (game.kind === 'read') newReadQuestion(game.cat);
		else newDictation();
	}

	function quit(): void {
		if (game && !gameOver) submitScore(gameId(game), streak);
		game = null;
		question = null;
		dictation = null;
	}
</script>

<div class="games-page">
	{#if !game}
		<h1 class="page-title">🎮 Giochi sui numeri</h1>
		<p class="page-sub">
			Vai avanti il più a lungo possibile: un errore e la serie riparte. Il record è tuo,
			separato dall'XP di studio.
		</p>

		<p class="group-title">Leggi come si pronuncia</p>
		<div class="cat-grid">
			{#each READ_GAMES as g}
				<button class="cat-card" onclick={() => start({ kind: 'read', cat: g.id })}>
					<span class="cat-icon">{g.icon}</span>
					<span class="cat-label">{g.label}</span>
					<span class="cat-hint">{g.hint}</span>
					<span class="cat-best">🏆 record: {getHighscore(`read-${g.id}`)}</span>
				</button>
			{/each}
		</div>

		<p class="group-title">Ascolta e scrivi</p>
		<div class="cat-grid">
			<button class="cat-card" onclick={() => start({ kind: 'listen' })}>
				<span class="cat-icon">👂</span>
				<span class="cat-label">Scrivi il numero</span>
				<span class="cat-hint">senti la lettura, digita le cifre</span>
				<span class="cat-best">🏆 record: {getHighscore('listen-number')}</span>
			</button>
		</div>

		<a class="back-link" href="{base}/contatori">← Ripassa i contatori</a>
	{:else}
		<div class="game-head">
			<button class="quit" onclick={quit}>← Esci</button>
			<span class="score">Serie: <strong>{streak}</strong> · 🏆 {best}</span>
		</div>

		{#if game.kind === 'read' && question}
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
						<p class="verdict ko">Ahi! Era <strong>{question.correct}</strong>. Serie: {streak}</p>
						<button class="proceed" onclick={proceed}>🔁 Rigioca</button>
					{:else}
						<p class="verdict ok">{isRecord ? '🏆 Nuovo record!' : '✓ Giusto!'}</p>
						<button class="proceed" onclick={proceed}>Avanti →</button>
					{/if}
				{/if}
			</article>
		{:else if game.kind === 'listen' && dictation}
			<article class="game-card">
				<p class="game-hint">Che numero senti?</p>
				<button class="replay" onclick={() => speakSentenceJapanese(dictation!.reading)}>🔊 Riascolta</button>
				<input
					class="num-input"
					type="text"
					inputmode="numeric"
					placeholder="cifre…"
					bind:value={answer}
					disabled={checked}
					onkeydown={(e) => { if (e.key === 'Enter') checkDictation(); }}
				/>
				{#if !checked}
					<button class="proceed" onclick={checkDictation} disabled={answer.trim() === ''}>Controlla</button>
				{:else}
					<p class="verdict" class:ok={!gameOver} class:ko={gameOver}>
						{#if gameOver}
							Era <strong>{dictation.n.toLocaleString('en-US')}</strong> ({dictation.reading}). Serie: {streak}
						{:else}
							{isRecord ? '🏆 Nuovo record!' : '✓ Giusto!'} — {dictation.reading}
						{/if}
					</p>
					<button class="proceed" onclick={proceed}>{gameOver ? '🔁 Rigioca' : 'Avanti →'}</button>
				{/if}
			</article>
		{/if}
	{/if}
</div>

<style>
	.games-page { display: grid; gap: 14px; }
	.page-title { margin: 0; font-size: 1.3rem; }
	.page-sub { margin: 0; font-size: 0.85rem; color: var(--muted); }
	.group-title { margin: 6px 0 0; font-size: 0.9rem; font-weight: 700; }

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

	.replay { justify-self: center; background: var(--surface-2); border: 1px solid var(--line); border-radius: 999px; padding: 8px 18px; font-size: 1rem; cursor: pointer; color: var(--ink); }
	.num-input { justify-self: center; width: 60%; text-align: center; font-size: 1.8rem; font-weight: 700; padding: 8px 10px; border: 1.5px solid var(--line); border-radius: 10px; background: var(--surface-2); color: var(--ink); }
	.num-input:focus { border-color: var(--brand); outline: none; }

	.verdict { margin: 0; text-align: center; font-size: 0.95rem; font-weight: 600; }
	.verdict.ok { color: var(--success, #16a34a); }
	.verdict.ko { color: var(--danger, #dc2626); }
	.proceed { justify-self: center; padding: 8px 20px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 600; cursor: pointer; }
	.proceed:disabled { opacity: 0.5; cursor: default; }

	.back-link { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
</style>
