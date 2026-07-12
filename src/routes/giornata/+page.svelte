<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { speakSentenceJapanese, speakSequence } from '$lib/core/tts';
	import { voiceParams, primeVoices, opposite, type Gender } from '$lib/core/voices';
	import { speechAvailable, listenJapanese, speechMatches, phraseVariants } from '$lib/core/speech';
	import { appState } from '$lib/stores.svelte';
	import { shuffle, gameSnapshot } from '$lib/core/gameKit';
	import ScriptLog from '$lib/components/ScriptLog.svelte';
	import HeardDiff from '$lib/components/HeardDiff.svelte';

	function userGender(): Gender {
		return appState.settings.voce_utente ?? 'femminile';
	}
	function altro(): Gender {
		return opposite(userGender());
	}

	// Un momento della giornata: contesto, eventuale battuta altrui, la frase
	// giusta da dire e le esche. chance = probabilità che il momento capiti.
	interface Moment {
		ora: string;
		emoji: string;
		contesto: string;
		altrui?: string; // detto dall'interlocutore prima della tua battuta
		risposta?: string; // detto dall'interlocutore dopo la tua battuta
		corretta: string;
		esche: string[];
		chance?: number;
	}

	const MOMENTS: Moment[] = [
		{ ora: '7:00', emoji: '🛏️', contesto: 'Ti svegli. In cucina c\'è la famiglia.', altrui: 'おはよう！', corretta: 'おはようございます', esche: ['こんばんは', 'おやすみなさい', 'ただいま'] },
		{ ora: '7:20', emoji: '🍚', contesto: 'La colazione è pronta. Cosa dici prima di mangiare?', corretta: 'いただきます', esche: ['ごちそうさまでした', 'いらっしゃいませ', 'おかえりなさい'] },
		{ ora: '7:40', emoji: '🥢', contesto: 'Hai finito di mangiare.', corretta: 'ごちそうさまでした', esche: ['いただきます', 'おじゃまします', 'お先に失礼します'] },
		{ ora: '8:00', emoji: '🚪', contesto: 'Esci di casa.', risposta: 'いってらっしゃい！', corretta: 'いってきます', esche: ['ただいま', 'おかえり', 'いってらっしゃい'] },
		{ ora: '9:00', emoji: '🏢', contesto: 'Arrivi al lavoro. Un collega ti saluta.', altrui: 'おはようございます！', corretta: 'おはようございます', esche: ['こんばんは', 'はじめまして', 'お先に失礼します'] },
		{ ora: '10:30', emoji: '🎂', contesto: 'Oggi è il compleanno di un collega!', chance: 0.4, risposta: 'ありがとうございます！', corretta: 'お誕生日おめでとうございます', esche: ['お疲れさまです', 'お大事に', 'よろしくお願いします'] },
		{ ora: '11:00', emoji: '🤧', contesto: 'Un collega sta male e va a casa.', chance: 0.35, risposta: 'ありがとうございます…', corretta: 'お大事に', esche: ['おめでとうございます', 'おかまいなく', 'ごちそうさま'] },
		{ ora: '12:30', emoji: '🍱', contesto: 'Pausa pranzo coi colleghi. Il bentō è davanti a te.', corretta: 'いただきます', esche: ['お先に失礼します', 'ごめんください', 'おやすみなさい'] },
		{ ora: '15:00', emoji: '📞', contesto: 'Rispondi al telefono dell\'ufficio: è un cliente.', corretta: 'はい、もしもし', esche: ['おい！', 'じゃあね', 'ただいま'] , chance: 0.5 },
		{ ora: '17:30', emoji: '🏃', contesto: 'Oggi esci prima dei colleghi.', risposta: 'お疲れさまでした！', corretta: 'お先に失礼します', esche: ['いらっしゃいませ', 'ただいま', 'おじゃまします'], chance: 0.5 },
		{ ora: '18:00', emoji: '🌇', contesto: 'Fine della giornata: saluti i colleghi che escono con te.', corretta: 'お疲れさまでした', esche: ['おはようございます', 'いただきます', 'ごめんなさい'] },
		{ ora: '19:00', emoji: '🏠', contesto: 'Rientri a casa.', risposta: 'おかえりなさい！', corretta: 'ただいま', esche: ['いってきます', 'おじゃまします', 'いらっしゃいませ'] },
		{ ora: '19:30', emoji: '🍛', contesto: 'La cena è in tavola.', corretta: 'いただきます', esche: ['ごちそうさまでした', 'かんぱい', 'お先に失礼します'], chance: 0.6 },
		{ ora: '23:00', emoji: '🌙', contesto: 'Si va a dormire.', risposta: 'おやすみ！', corretta: 'おやすみなさい', esche: ['おはようございます', 'さようなら', 'ごちそうさまでした'] }
	];

	type Scene = 'intro' | 'play' | 'done';
	let scene = $state<Scene>('intro');
	let day = $state<Moment[]>([]);
	let idx = $state(0);
	let errors = $state(0);
	let picked = $state<string | null>(null);
	let choices = $state<string[]>([]);
	let canSpeak = $state(false);
	let micState = $state<'idle' | 'listening'>('idle');
	let heard = $state('');
	type Line = { who: 'me' | 'other'; text: string };
	let dialog = $state<Line[]>([]);
	let showScript = $state(false);

	// Conserva la giornata quando navighi via (popup → scheda) e torni indietro.
	export const snapshot = gameSnapshot(
		() => ({ scene, day, idx, errors, picked, choices, dialog, showScript }),
		(s) => ({ scene, day, idx, errors, picked, choices, dialog, showScript } = s)
	);

	onMount(() => {
		primeVoices();
		canSpeak = speechAvailable();
	});

	function start(): void {
		day = MOMENTS.filter((m) => m.chance === undefined || Math.random() < m.chance);
		idx = 0;
		errors = 0;
		dialog = [];
		showScript = false;
		scene = 'play';
		enterMoment();
	}

	function cur(): Moment {
		return day[idx]!;
	}
	function enterMoment(): void {
		picked = null;
		heard = '';
		const m = cur();
		choices = shuffle([m.corretta, ...m.esche]);
		if (m.altrui) {
			speakSentenceJapanese(m.altrui, voiceParams(altro()));
			dialog = [...dialog, { who: 'other', text: m.altrui }];
		}
	}

	function pick(choice: string, viaVoce = false): void {
		if (picked !== null) return;
		picked = choice;
		const m = cur();
		const ok = choice === m.corretta;
		if (!ok) errors += 1;
		dialog = [...dialog, { who: 'me', text: m.corretta }];
		const after: { text: string; options?: object }[] = [];
		// la frase giusta si sente sempre — ma non se l'hai appena detta tu
		if (!(viaVoce && ok)) after.push({ text: m.corretta, options: voiceParams(userGender()) });
		if (m.risposta) {
			after.push({ text: m.risposta, options: voiceParams(altro()) });
			dialog = [...dialog, { who: 'other', text: m.risposta }];
		}
		if (after.length > 0) speakSequence(after as never);
	}

	async function speakIt(): Promise<void> {
		if (micState !== 'idle' || picked !== null) return;
		micState = 'listening';
		heard = '';
		const alts = await listenJapanese();
		micState = 'idle';
		if (alts.length === 0) {
			heard = '（何も聞こえませんでした…riprova）';
			return;
		}
		heard = alts[0]!;
		const m = cur();
		const hit = [m.corretta, ...m.esche].find((c) => speechMatches(alts, [phraseVariants(c)]));
		if (hit) pick(hit, true);
	}

	function next(): void {
		if (idx < day.length - 1) {
			idx += 1;
			enterMoment();
		} else {
			scene = 'done';
		}
	}
</script>

<div class="gio">
	<div class="nav">
		<a class="back" href="{base}/giochi">← Giochi</a>
		{#if dialog.length > 0}
			<button class="script-toggle" onclick={() => (showScript = !showScript)}>📜 Copione ({dialog.length})</button>
		{/if}
	</div>
	{#if showScript}
		<ScriptLog lines={dialog} />
	{/if}

	{#if scene === 'intro'}
		<article class="scene">
			<h1 class="page-title">🌅 Una giornata</h1>
			<p class="hint">
				Dalla sveglia alla buonanotte: a ogni momento di' la frase giusta — a voce, se il
				browser lo permette. Ogni giornata è diversa: compleanni, telefonate, uscite anticipate…
			</p>
			<button class="proceed" onclick={start}>⏰ Suona la sveglia</button>
		</article>
	{:else if scene === 'play'}
		{@const m = cur()}
		<article class="scene">
			<p class="who">{m.emoji} {m.ora} — momento {idx + 1} di {day.length}</p>
			<p class="hint">{m.contesto}</p>
			{#if m.altrui}
				<p class="bubble">🗣️「{m.altrui}」</p>
			{/if}
			{#if canSpeak && picked === null}
				<button class="mic" class:listening={micState === 'listening'} onclick={speakIt}>
					{micState === 'listening' ? '🎙️ Ti ascolto… parla!' : '🎤 Dillo a voce'}
				</button>
				<HeardDiff {heard} candidates={choices} />
			{/if}
			<div class="choices">
				{#each choices as c (c)}
					<button
						class="choice"
						class:right={picked !== null && c === m.corretta}
						class:wrong={picked === c && c !== m.corretta}
						disabled={picked !== null}
						onclick={() => pick(c)}
					>{c}</button>
				{/each}
			</div>
			{#if picked !== null}
				{#if m.risposta}
					<p class="bubble sm">🗣️「{m.risposta}」</p>
				{/if}
				<button class="proceed" onclick={next}>{idx < day.length - 1 ? 'La giornata continua →' : 'Fine giornata →'}</button>
			{/if}
		</article>
	{:else if scene === 'done'}
		<article class="scene">
			<p class="who">{errors === 0 ? '🎉 Giornata perfetta!' : '🌙 Fine giornata'}</p>
			<p class="score-big">{day.length - errors} / {day.length}</p>
			<p class="hint">{errors === 0 ? 'Tutte le frasi al posto giusto!' : `frasi sbagliate: ${errors} — riguarda il copione 📜`}</p>
			<ScriptLog lines={dialog} title="📜 La giornata di oggi" />
			<button class="proceed" onclick={start}>🔁 Un altro giorno</button>
		</article>
	{/if}
</div>

<style>
	.gio { display: grid; gap: 14px; }
	.nav { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.script-toggle { background: var(--surface-2); border: 1px solid var(--line); border-radius: 999px; padding: 5px 12px; font-size: 0.8rem; cursor: pointer; color: var(--ink); }
	.page-title { margin: 0; font-size: 1.3rem; text-align: center; }

	.scene { background: var(--surface); border-radius: 16px; padding: 20px; box-shadow: 0 2px 10px rgba(14,29,51,0.07); display: grid; gap: 14px; }
	.who { margin: 0; font-size: 0.9rem; font-weight: 700; }
	.hint { margin: 0; text-align: center; font-size: 0.86rem; color: var(--muted); }
	.bubble { margin: 0; text-align: center; font-size: 1.1rem; font-weight: 600; background: var(--surface-2); border-radius: 12px; padding: 12px; }
	.bubble.sm { font-size: 0.95rem; }

	.choices { display: grid; gap: 8px; }
	.choice { padding: 12px 14px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface-2); color: var(--ink); font-size: 1.1rem; text-align: center; cursor: pointer; }
	.choice:hover:not(:disabled) { border-color: var(--brand); }
	.choice:disabled { cursor: default; }
	.choice.right { border-color: var(--success); background: var(--ok-bg); }
	.choice.wrong { border-color: var(--danger); background: rgba(239,107,107,0.16); }

	.mic { justify-self: center; padding: 10px 20px; border-radius: 999px; border: 1.5px solid var(--brand); background: var(--surface); color: var(--brand); font-weight: 700; font-size: 0.95rem; cursor: pointer; }
	.mic.listening { background: rgba(239,107,107,0.12); border-color: var(--danger); color: var(--danger); animation: micpulse 1s ease-in-out infinite; }
	@keyframes micpulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }

	.score-big { margin: 0; text-align: center; font-size: 2.4rem; font-weight: 800; }

	.proceed { justify-self: center; padding: 10px 22px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 600; cursor: pointer; }
</style>
