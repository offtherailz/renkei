<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { db } from '$lib/db/schema';
	import { detectUserLocale, pickLocalizedText } from '$lib/core/i18n';
	import { speakDialogue, stopSpeaking } from '$lib/core/tts';
	import { shuffle } from '$lib/quiz/engine';
	import JlptBadge from '$lib/components/JlptBadge.svelte';
	import type { Dialogue } from '$lib/types/models';

	const locale = detectUserLocale();
	const MAX_LISTENS = 2; // come all'esame: primo ascolto + un solo replay

	let pool = $state<Dialogue[]>([]);
	let current = $state<Dialogue | null>(null);
	let choices = $state<string[]>([]);
	let listens = $state(0);
	let playing = $state(false);
	let picked = $state<string | null>(null);
	let rate = $state(0.9);
	let done = $state<{ total: number; correct: number }>({ total: 0, correct: 0 });
	let loading = $state(true);

	const question = $derived(current?.domande?.[0] ?? null);

	async function loadPool(): Promise<void> {
		const rows = await db.dialogues.toArray();
		pool = rows.filter((d) => d.domande?.length);
		loading = false;
		if (pool.length > 0) nextDialogue();
	}

	function nextDialogue(): void {
		stopSpeaking();
		const candidates = pool.filter((d) => d.id !== current?.id);
		current = (candidates.length > 0 ? shuffle(candidates) : pool)[0] ?? null;
		choices = current?.domande?.[0] ? shuffle(current.domande[0].opzioni) : [];
		listens = 0;
		picked = null;
		playing = false;
	}

	async function play(): Promise<void> {
		if (!current || playing || listens >= MAX_LISTENS) return;
		playing = true;
		listens += 1;
		await speakDialogue(current.righe, rate);
		playing = false;
	}

	function answer(choice: string): void {
		if (!question || picked !== null) return;
		picked = choice;
		stopSpeaking();
		done = {
			total: done.total + 1,
			correct: done.correct + (choice === question.corretta ? 1 : 0)
		};
	}

	onMount(loadPool);
	onDestroy(stopSpeaking);
</script>

<div class="listen-page">
	<h1 class="page-title">Ascolto (聴解)</h1>
	<p class="page-sub">
		Come all'esame: ascolti il dialogo (massimo {MAX_LISTENS} volte), il testo resta nascosto,
		poi rispondi. I dialoghi depistano di proposito: qualcuno cambia idea, la prima
		opzione detta è quasi sempre sbagliata.
	</p>

	{#if loading}
		<p class="muted-text">Caricamento…</p>
	{:else if !current || !question}
		<p class="muted-text">Nessun dialogo disponibile: ricarica l'app per re-importare il seed.</p>
	{:else}
		<article class="listen-card">
			<div class="listen-head">
				<strong>{pickLocalizedText(current.titolo, locale)}</strong>
				{#if current.livello_jlpt}<JlptBadge level={current.livello_jlpt} />{/if}
			</div>
			{#if current.contesto}
				<p class="listen-context">{pickLocalizedText(current.contesto, locale)}</p>
			{/if}

			<div class="listen-controls">
				<button class="play-btn" onclick={play} disabled={playing || listens >= MAX_LISTENS}>
					{playing ? '🔊 In riproduzione…' : listens === 0 ? '▶️ Ascolta' : `🔁 Riascolta (${MAX_LISTENS - listens})`}
				</button>
				<label class="rate-label">
					Velocità
					<select class="rate-select" bind:value={rate} disabled={playing}>
						<option value={0.8}>0.8×</option>
						<option value={0.9}>0.9×</option>
						<option value={1}>1×</option>
						<option value={1.25}>1.25×</option>
					</select>
				</label>
			</div>

			{#if listens > 0}
				<p class="listen-question">{pickLocalizedText(question.testo, locale)}</p>
				<div class="listen-choices">
					{#each choices as choice}
						<button
							class="listen-choice"
							class:right={picked !== null && choice === question.corretta}
							class:wrong={picked === choice && choice !== question.corretta}
							disabled={picked !== null}
							onclick={() => answer(choice)}
						>{choice}</button>
					{/each}
				</div>
			{/if}

			{#if picked !== null}
				<div class="listen-result" class:ok={picked === question.corretta}>
					{picked === question.corretta ? '✅ Corretto!' : '❌ Sbagliato'}
				</div>
				<p class="listen-explain">💡 {pickLocalizedText(question.spiegazione, locale)}</p>
				<div class="transcript">
					<p class="transcript-title">Trascrizione</p>
					{#each current.righe as line}
						<div class="transcript-line">
							<span class="speaker">{line.personaggio}</span>
							<span class="line-jp">{line.testo}</span>
							<span class="line-it">{pickLocalizedText(line.traduzione, locale)}</span>
						</div>
					{/each}
				</div>
				<button class="next-dialogue" onclick={nextDialogue}>Prossimo dialogo →</button>
			{/if}
		</article>

		<p class="score-line">Sessione: {done.correct}/{done.total} corrette</p>
	{/if}
</div>

<style>
	.listen-page { display: grid; gap: 12px; }
	.page-title { margin: 0; font-size: 1.3rem; }
	.page-sub { margin: 0; font-size: 0.82rem; color: var(--muted); }

	.listen-card {
		background: var(--surface);
		border-radius: 16px;
		padding: 18px 16px;
		box-shadow: 0 2px 10px rgba(14, 29, 51, 0.07);
		display: grid;
		gap: 12px;
	}

	.listen-head { display: flex; align-items: center; gap: 8px; }
	.listen-context { margin: 0; font-size: 0.82rem; color: var(--muted); }

	.listen-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

	.play-btn {
		padding: 14px 26px;
		border-radius: 12px;
		border: 1.5px solid var(--brand);
		background: #eef2ff;
		color: var(--brand);
		font-size: 1.05rem;
		font-weight: 700;
		cursor: pointer;
	}
	.play-btn:disabled { opacity: 0.5; cursor: default; }

	.rate-label { font-size: 0.78rem; color: var(--muted); display: flex; align-items: center; gap: 6px; }
	.rate-select { padding: 4px 8px; border-radius: 8px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); }

	.listen-question { margin: 0; font-size: 0.95rem; font-weight: 700; }

	.listen-choices { display: grid; gap: 8px; }
	.listen-choice {
		padding: 12px 14px;
		border-radius: 10px;
		border: 1.5px solid var(--line);
		background: var(--surface-2);
		color: var(--ink);
		font-size: 1.15rem;
		text-align: left;
		cursor: pointer;
	}
	.listen-choice:hover:not(:disabled) { border-color: var(--brand); }
	.listen-choice:disabled { cursor: default; }
	.listen-choice.right { border-color: var(--success); background: rgba(52, 201, 138, 0.16); }
	.listen-choice.wrong { border-color: var(--danger); background: rgba(239, 107, 107, 0.16); }

	.listen-result { font-weight: 700; padding: 8px 12px; border-radius: 8px; background: rgba(239, 107, 107, 0.12); }
	.listen-result.ok { background: rgba(52, 201, 138, 0.14); }
	.listen-explain { margin: 0; font-size: 0.84rem; color: var(--muted); }

	.transcript { display: grid; gap: 6px; border-top: 1px dashed var(--line); padding-top: 10px; }
	.transcript-title { margin: 0; font-size: 0.72rem; font-weight: 700; color: var(--muted); text-transform: uppercase; }
	.transcript-line { display: grid; gap: 1px; }
	.speaker { font-size: 0.7rem; font-weight: 700; color: var(--brand); }
	.line-jp { font-size: 1.05rem; }
	.line-it { font-size: 0.76rem; color: var(--muted); }

	.next-dialogue {
		justify-self: end;
		padding: 8px 16px;
		border-radius: 8px;
		border: 1px solid var(--brand);
		background: transparent;
		color: var(--brand);
		font-weight: 600;
		cursor: pointer;
	}
	.next-dialogue:hover { background: var(--brand); color: #fff; }

	.score-line { margin: 0; font-size: 0.8rem; color: var(--muted); text-align: center; }
	.muted-text { color: var(--muted); }
</style>
