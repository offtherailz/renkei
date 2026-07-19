<script lang="ts">
	import ScriptLog from '$lib/components/ScriptLog.svelte';
	import RepeatBar from '$lib/components/RepeatBar.svelte';
	import HeardDiff from '$lib/components/HeardDiff.svelte';
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { recordPractice } from '$lib/core/practiceMiss';
	import { speechAvailable, listenJapanese, speechMatches, phraseVariants } from '$lib/core/speech';
	import { speakSentenceJapanese, speakSequence } from '$lib/core/tts';
	import { voiceParams, primeVoices, opposite, type Gender } from '$lib/core/voices';
	import { appState } from '$lib/stores.svelte';

	function userGender(): Gender {
		return appState.settings.voce_utente ?? 'femminile';
	}
	function them(): Gender {
		return opposite(userGender());
	}
	const rnd = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)]!;

	// Personaggi: 田中 sei tu (dallo script di 自己紹介), 佐藤 il capoufficio —
	// nomi diversi apposta, altrimenti il capo che chiede di te per telefono
	// chiamerebbe se stesso.
	type Who = 'me' | 'boss' | 'colleague' | 'client';
	type Line = { who: Who; text: string };
	let dialog = $state<Line[]>([]);
	function pushLine(who: Who, text: string): void {
		const last = dialog[dialog.length - 1];
		if (last && last.who === who && last.text === text) return; // no doppioni consecutivi
		dialog = [...dialog, { who, text }];
	}
	function genderOf(who: Who): Gender {
		return who === 'me' ? userGender() : them();
	}
	function say(who: Who, text: string): void {
		speakSentenceJapanese(text, voiceParams(genderOf(who)));
		pushLine(who, text);
	}
	function mySay(text: string): void {
		say('me', text);
	}
	// Più battute di fila (anche di voci diverse) senza annullarsi a vicenda.
	function sequence(lines: Line[]): void {
		speakSequence(lines.map((l) => ({ text: l.text, options: voiceParams(genderOf(l.who)) })));
		for (const l of lines) pushLine(l.who, l.text);
	}

	type Scene =
		| 'intro'
		| 'arrive'
		| 'introself'
		| 'compliment'
		| 'task'
		| 'taskslow'
		| 'ack'
		| 'form'
		| 'phone'
		| 'phonehold'
		| 'lunch'
		| 'leave'
		| 'done';

	let scene = $state<Scene>('intro');
	let errors = $state(0);
	let showScript = $state(false);

	// Stato generico per le scene a scelta multipla: una sola coppia "scelte
	// correnti / risposta giusta / scelta fatta", resettata a ogni scena.
	let npcLine = $state('');
	let choices = $state<string[]>([]);
	let correct = $state('');
	let picked = $state<string | null>(null);

	let nextViaVoce = false; // set da speakChoice: la scelta in arrivo è vocale
	function choose(choice: string, reply?: Line): void {
		if (picked !== null) return;
		const viaVoce = nextViaVoce;
		nextViaVoce = false;
		picked = choice;
		if (choice !== correct) errors += 1;
		// la voce non penalizza: il miss conta solo dai bottoni
		if (choice === correct) void recordPractice('phrase:' + correct, true);
		if (reply) sequence([{ who: 'me', text: choice }, reply]);
		else mySay(choice);
	}

	// ── Mic (dove il browser lo supporta) ──
	let canSpeak = $state(false);
	let micState = $state<'idle' | 'listening'>('idle');
	let heard = $state('');
	async function speakChoice(onMatch: (choice: string) => void): Promise<void> {
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
		const hit = choices.find((c) => speechMatches(alts, [phraseVariants(c)]));
		if (hit) { nextViaVoce = true; onMatch(hit); }
	}

	onMount(() => {
		primeVoices();
		canSpeak = speechAvailable();
	});

	function start(): void {
		errors = 0;
		dialog = [];
		showScript = false;
		picked = null;
		enterArrive();
	}

	function enterArrive(): void {
		scene = 'arrive';
		npcLine = rnd(['おはようございます！', 'おはよう、今日からよろしくね。']);
		choices = ['おはようございます。', 'こんにちは。', 'お疲れ様です。', 'よろしく！'];
		correct = 'おはようございます。';
		picked = null;
		heard = '';
		say('boss', npcLine);
	}
	function afterArrive(): void {
		enterIntroself();
	}

	function enterIntroself(): void {
		scene = 'introself';
		npcLine = 'それでは、自己紹介をお願いします。';
		choices = [
			'はじめまして、田中です。どうぞよろしくお願いします。',
			'田中だよ、よろしく！',
			'田中です。',
			'質問してもいいですか。'
		];
		correct = 'はじめまして、田中です。どうぞよろしくお願いします。';
		picked = null;
		heard = '';
		say('boss', npcLine);
	}
	function afterIntroself(): void {
		enterCompliment();
	}

	function enterCompliment(): void {
		scene = 'compliment';
		npcLine = '日本語、お上手ですね！';
		choices = ['いえいえ、まだまだです。', 'はい、とても上手です。', 'どうもありがとうございます、天才です。', 'そうですね、上手です。'];
		correct = 'いえいえ、まだまだです。';
		picked = null;
		heard = '';
		say('colleague', npcLine);
	}
	function afterCompliment(): void {
		enterTask();
	}

	const TASK_INSTRUCTION = 'この資料を明日の朝までにまとめて、コピーを十部お願いします。';
	function enterTask(): void {
		scene = 'task';
		npcLine = TASK_INSTRUCTION;
		choices = ['すみません、もう一度お願いします。', 'はい、分かりました。', 'いいですよ。', '結構です。'];
		correct = 'すみません、もう一度お願いします。';
		picked = null;
		heard = '';
		say('boss', npcLine);
	}
	function afterTask(): void {
		enterTaskSlow();
	}

	function enterTaskSlow(): void {
		scene = 'taskslow';
		say('boss', TASK_INSTRUCTION);
		choices = ['書いてもらえますか。', 'いいです、覚えました。', '写真を撮ってもいいですか。', '無理です。'];
		correct = '書いてもらえますか。';
		picked = null;
		heard = '';
	}
	function afterTaskSlow(): void {
		enterAck();
	}

	function enterAck(): void {
		scene = 'ack';
		npcLine = 'はい、どうぞ。よろしくね。';
		choices = ['かしこまりました。', 'オッケー。', 'はいはい。', 'いいすよ。'];
		correct = 'かしこまりました。';
		picked = null;
		heard = '';
		say('boss', npcLine);
	}
	function afterAck(): void {
		enterForm();
	}

	function enterForm(): void {
		scene = 'form';
		npcLine = 'こちらに名前と日付をご記入ください。';
		choices = ['Scrivere nome e data qui.', 'Cancellare la firma.', 'Fare delle fotocopie.', 'Comprare un timbro (hanko).'];
		correct = 'Scrivere nome e data qui.';
		picked = null;
		say('colleague', npcLine);
	}
	function afterForm(): void {
		mySay('はい、分かりました。');
		enterPhone();
	}

	function enterPhone(): void {
		scene = 'phone';
		npcLine = '（電話が鳴っている……📞）';
		choices = ['もしもし、さくら商事でございます。', 'もしもし？', 'はい、田中です。', '誰ですか。'];
		correct = 'もしもし、さくら商事でございます。';
		picked = null;
		heard = '';
	}
	function afterPhone(): void {
		enterPhoneHold();
	}

	function enterPhoneHold(): void {
		scene = 'phonehold';
		npcLine = '佐藤部長はいらっしゃいますか。';
		choices = ['少々お待ちください。', 'ちょっと待って。', 'いません。', '知りません。'];
		correct = '少々お待ちください。';
		picked = null;
		heard = '';
		say('client', npcLine);
	}
	function afterPhoneHold(): void {
		enterLunch();
	}

	function enterLunch(): void {
		scene = 'lunch';
		npcLine = '趣味は何？';
		choices = ['趣味は音楽を聞くことです。', '趣味はないです。', '仕事が趣味です。', '分かりません。'];
		correct = '趣味は音楽を聞くことです。';
		picked = null;
		heard = '';
		say('colleague', npcLine);
	}
	function afterLunch(): void {
		enterLeave();
	}

	function enterLeave(): void {
		scene = 'leave';
		npcLine = '';
		choices = ['お先に失礼します。', 'じゃあね、バイバイ！', 'さようなら。', 'もう帰りたいです。'];
		correct = 'お先に失礼します。';
		picked = null;
		heard = '';
	}
	function toDone(): void {
		say('colleague', 'お疲れ様でした！');
		scene = 'done';
	}
</script>

{#snippet repeatBar(line: string, who: Who)}
	<RepeatBar {line} gender={genderOf(who)} />
{/snippet}

<div class="shigoto">
	<div class="nav">
		<a class="back" href="{base}/avventure">← Avventure</a>
		{#if dialog.length > 0}
			<button class="script-toggle" onclick={() => (showScript = !showScript)}>📜 Copione ({dialog.length})</button>
		{/if}
	</div>
	{#if showScript}
		<ScriptLog lines={dialog} icons={{ boss: '👔', colleague: '🧑‍💼', client: '📞' }} />
	{/if}

	{#if scene === 'intro'}
		<article class="scene">
			<h1 class="page-title">💼 仕事場で（しごとばで）</h1>
			<p class="hint">Primo giorno in un ufficio giapponese: presentati, incassa un complimento con umiltà, capisci le istruzioni del capo, rispondi al telefono e chiudi la giornata come si deve.</p>
			<button class="proceed" onclick={start}>🚪 Entra in ufficio</button>
		</article>
	{:else if scene === 'arrive'}
		<article class="scene">
			<p class="who">👔 Il capo</p>
			<p class="bubble">{npcLine}</p>
			{@render repeatBar(npcLine, 'boss')}
			<p class="hint">Primo saluto della giornata: cosa dici?</p>
			{#if canSpeak && picked === null}
				<button class="mic" class:listening={micState === 'listening'} onclick={() => speakChoice((c) => choose(c, { who: 'boss', text: 'ようこそ、こちらへどうぞ。' }))}>
					{micState === 'listening' ? '🎙️ Ti ascolto… parla!' : '🎤 Dillo a voce'}
				</button>
				<HeardDiff {heard} candidates={choices} />
			{/if}
			<div class="choices">
				{#each choices as c (c)}
					<button class="choice" class:right={picked !== null && c === correct} class:wrong={picked === c && c !== correct} disabled={picked !== null} onclick={() => choose(c, { who: 'boss', text: 'ようこそ、こちらへどうぞ。' })}>{c}</button>
				{/each}
			</div>
			{#if picked !== null}
				<p class="bubble sm">👔「ようこそ、こちらへどうぞ。」</p>
				<button class="proceed" onclick={afterArrive}>→</button>
			{/if}
		</article>
	{:else if scene === 'introself'}
		<article class="scene">
			<p class="who">👔 Il capo</p>
			<p class="bubble">{npcLine}</p>
			{@render repeatBar(npcLine, 'boss')}
			<p class="hint">Presentati: nome e la formula di chiusura.</p>
			{#if canSpeak && picked === null}
				<button class="mic" class:listening={micState === 'listening'} onclick={() => speakChoice((c) => choose(c, { who: 'colleague', text: 'そちらこそ、よろしくお願いします。' }))}>
					{micState === 'listening' ? '🎙️ Ti ascolto… parla!' : '🎤 Dillo a voce'}
				</button>
				<HeardDiff {heard} candidates={choices} />
			{/if}
			<div class="choices">
				{#each choices as c (c)}
					<button class="choice" class:right={picked !== null && c === correct} class:wrong={picked === c && c !== correct} disabled={picked !== null} onclick={() => choose(c, { who: 'colleague', text: 'そちらこそ、よろしくお願いします。' })}>{c}</button>
				{/each}
			</div>
			{#if picked !== null}
				<p class="bubble sm">🧑‍💼「そちらこそ、よろしくお願いします。」</p>
				<button class="proceed" onclick={afterIntroself}>→</button>
			{/if}
		</article>
	{:else if scene === 'compliment'}
		<article class="scene">
			<p class="who">🧑‍💼 Un collega</p>
			<p class="bubble">{npcLine}</p>
			{@render repeatBar(npcLine, 'colleague')}
			<p class="hint">Come rispondi, con educazione giapponese?</p>
			{#if canSpeak && picked === null}
				<button class="mic" class:listening={micState === 'listening'} onclick={() => speakChoice((c) => choose(c))}>
					{micState === 'listening' ? '🎙️ Ti ascolto… parla!' : '🎤 Dillo a voce'}
				</button>
				<HeardDiff {heard} candidates={choices} />
			{/if}
			<div class="choices">
				{#each choices as c (c)}
					<button class="choice" class:right={picked !== null && c === correct} class:wrong={picked === c && c !== correct} disabled={picked !== null} onclick={() => choose(c)}>{c}</button>
				{/each}
			</div>
			{#if picked !== null}
				<button class="proceed" onclick={afterCompliment}>→</button>
			{/if}
		</article>
	{:else if scene === 'task'}
		<article class="scene">
			<p class="who">👔 Il capo</p>
			<p class="bubble big">{npcLine}</p>
			{@render repeatBar(npcLine, 'boss')}
			<p class="hint">Ha parlato veloce: non hai capito bene. Cosa dici?</p>
			{#if canSpeak && picked === null}
				<button class="mic" class:listening={micState === 'listening'} onclick={() => speakChoice((c) => choose(c))}>
					{micState === 'listening' ? '🎙️ Ti ascolto… parla!' : '🎤 Dillo a voce'}
				</button>
				<HeardDiff {heard} candidates={choices} />
			{/if}
			<div class="choices">
				{#each choices as c (c)}
					<button class="choice" class:right={picked !== null && c === correct} class:wrong={picked === c && c !== correct} disabled={picked !== null} onclick={() => choose(c)}>{c}</button>
				{/each}
			</div>
			{#if picked !== null}
				<button class="proceed" onclick={afterTask}>→</button>
			{/if}
		</article>
	{:else if scene === 'taskslow'}
		<article class="scene">
			<p class="who">👔 Il capo（ゆっくり）</p>
			<p class="bubble big">{TASK_INSTRUCTION}</p>
			<p class="hint">Ora hai capito, ma vuoi una traccia scritta della scadenza.</p>
			{#if canSpeak && picked === null}
				<button class="mic" class:listening={micState === 'listening'} onclick={() => speakChoice((c) => choose(c))}>
					{micState === 'listening' ? '🎙️ Ti ascolto… parla!' : '🎤 Dillo a voce'}
				</button>
				<HeardDiff {heard} candidates={choices} />
			{/if}
			<div class="choices">
				{#each choices as c (c)}
					<button class="choice" class:right={picked !== null && c === correct} class:wrong={picked === c && c !== correct} disabled={picked !== null} onclick={() => choose(c)}>{c}</button>
				{/each}
			</div>
			{#if picked !== null}
				<button class="proceed" onclick={afterTaskSlow}>→</button>
			{/if}
		</article>
	{:else if scene === 'ack'}
		<article class="scene">
			<p class="who">👔 Il capo</p>
			<p class="bubble">{npcLine}</p>
			{@render repeatBar(npcLine, 'boss')}
			<p class="hint">Accetta l'incarico con la formula giusta.</p>
			{#if canSpeak && picked === null}
				<button class="mic" class:listening={micState === 'listening'} onclick={() => speakChoice((c) => choose(c))}>
					{micState === 'listening' ? '🎙️ Ti ascolto… parla!' : '🎤 Dillo a voce'}
				</button>
				<HeardDiff {heard} candidates={choices} />
			{/if}
			<div class="choices">
				{#each choices as c (c)}
					<button class="choice" class:right={picked !== null && c === correct} class:wrong={picked === c && c !== correct} disabled={picked !== null} onclick={() => choose(c)}>{c}</button>
				{/each}
			</div>
			{#if picked !== null}
				<button class="proceed" onclick={afterAck}>→</button>
			{/if}
		</article>
	{:else if scene === 'form'}
		<article class="scene">
			<p class="who">🧑‍💼 Un collega</p>
			<p class="bubble">{npcLine}</p>
			{@render repeatBar(npcLine, 'colleague')}
			<p class="hint">Cosa ti stanno chiedendo di fare?</p>
			<div class="choices">
				{#each choices as c (c)}
					<button class="choice" class:right={picked !== null && c === correct} class:wrong={picked === c && c !== correct} disabled={picked !== null} onclick={() => choose(c)}>{c}</button>
				{/each}
			</div>
			{#if picked !== null}
				<button class="proceed" onclick={afterForm}>→</button>
			{/if}
		</article>
	{:else if scene === 'phone'}
		<article class="scene">
			<p class="who">📞 Il telefono squilla</p>
			<p class="bubble big">{npcLine}</p>
			<p class="hint">Rispondi al telefono dell'ufficio.</p>
			{#if canSpeak && picked === null}
				<button class="mic" class:listening={micState === 'listening'} onclick={() => speakChoice((c) => choose(c))}>
					{micState === 'listening' ? '🎙️ Ti ascolto… parla!' : '🎤 Dillo a voce'}
				</button>
				<HeardDiff {heard} candidates={choices} />
			{/if}
			<div class="choices">
				{#each choices as c (c)}
					<button class="choice" class:right={picked !== null && c === correct} class:wrong={picked === c && c !== correct} disabled={picked !== null} onclick={() => choose(c)}>{c}</button>
				{/each}
			</div>
			{#if picked !== null}
				<button class="proceed" onclick={afterPhone}>→</button>
			{/if}
		</article>
	{:else if scene === 'phonehold'}
		<article class="scene">
			<p class="who">📞 Il cliente</p>
			<p class="bubble">{npcLine}</p>
			{@render repeatBar(npcLine, 'client')}
			<p class="hint">Chiede del capo, che ora non c'è: cosa dici?</p>
			{#if canSpeak && picked === null}
				<button class="mic" class:listening={micState === 'listening'} onclick={() => speakChoice((c) => choose(c))}>
					{micState === 'listening' ? '🎙️ Ti ascolto… parla!' : '🎤 Dillo a voce'}
				</button>
				<HeardDiff {heard} candidates={choices} />
			{/if}
			<div class="choices">
				{#each choices as c (c)}
					<button class="choice" class:right={picked !== null && c === correct} class:wrong={picked === c && c !== correct} disabled={picked !== null} onclick={() => choose(c)}>{c}</button>
				{/each}
			</div>
			{#if picked !== null}
				<button class="proceed" onclick={afterPhoneHold}>→</button>
			{/if}
		</article>
	{:else if scene === 'lunch'}
		<article class="scene">
			<p class="who">🧑‍💼 A pranzo, tra colleghi</p>
			<p class="bubble">{npcLine}</p>
			{@render repeatBar(npcLine, 'colleague')}
			<p class="hint">Registro informale, in pausa pranzo: rispondi.</p>
			{#if canSpeak && picked === null}
				<button class="mic" class:listening={micState === 'listening'} onclick={() => speakChoice((c) => choose(c))}>
					{micState === 'listening' ? '🎙️ Ti ascolto… parla!' : '🎤 Dillo a voce'}
				</button>
				<HeardDiff {heard} candidates={choices} />
			{/if}
			<div class="choices">
				{#each choices as c (c)}
					<button class="choice" class:right={picked !== null && c === correct} class:wrong={picked === c && c !== correct} disabled={picked !== null} onclick={() => choose(c)}>{c}</button>
				{/each}
			</div>
			{#if picked !== null}
				<button class="proceed" onclick={afterLunch}>→</button>
			{/if}
		</article>
	{:else if scene === 'leave'}
		<article class="scene">
			<p class="who">🌆 Fine giornata</p>
			<p class="hint">Sei pronto per andare, ma i colleghi sono ancora al lavoro: cosa dici uscendo?</p>
			{#if canSpeak && picked === null}
				<button class="mic" class:listening={micState === 'listening'} onclick={() => speakChoice((c) => choose(c))}>
					{micState === 'listening' ? '🎙️ Ti ascolto… parla!' : '🎤 Dillo a voce'}
				</button>
				<HeardDiff {heard} candidates={choices} />
			{/if}
			<div class="choices">
				{#each choices as c (c)}
					<button class="choice" class:right={picked !== null && c === correct} class:wrong={picked === c && c !== correct} disabled={picked !== null} onclick={() => choose(c)}>{c}</button>
				{/each}
			</div>
			{#if picked !== null}
				<button class="proceed" onclick={toDone}>お先に →</button>
			{/if}
		</article>
	{:else if scene === 'done'}
		<article class="scene">
			<p class="who">{errors === 0 ? '🎉 Perfetto!' : '📝 Fine giornata'}</p>
			<p class="bubble">🙂「お疲れ様でした！」</p>
			<p class="hint">{errors === 0 ? 'Nessun errore: primo giorno impeccabile!' : `Errori: ${errors}`}</p>
			<ScriptLog lines={dialog} icons={{ boss: '👔', colleague: '🧑‍💼', client: '📞' }} title="📜 Il dialogo di oggi" />
			<button class="proceed" onclick={start}>🔁 Un altro giorno</button>
		</article>
	{/if}
</div>

<style>
	.shigoto { display: grid; gap: 14px; }
	.nav { margin-bottom: 2px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
	.script-toggle { background: var(--surface-2); border: 1px solid var(--line); border-radius: 999px; padding: 5px 12px; font-size: 0.8rem; cursor: pointer; color: var(--ink); }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.page-title { margin: 0; font-size: 1.3rem; text-align: center; }

	.scene { background: var(--surface); border-radius: 16px; padding: 20px; box-shadow: 0 2px 10px rgba(14,29,51,0.07); display: grid; gap: 14px; }
	.who { margin: 0; font-size: 0.9rem; font-weight: 700; text-align: center; }
	.hint { margin: 0; text-align: center; font-size: 0.82rem; color: var(--muted); }
	.bubble { margin: 0; text-align: center; font-size: 1.1rem; font-weight: 600; background: var(--surface-2); border-radius: 12px; padding: 12px; }
	.bubble.big { font-size: 1.05rem; }
	.bubble.sm { font-size: 0.95rem; }

	.mic { justify-self: center; padding: 10px 20px; border-radius: 999px; border: 1.5px solid var(--brand); background: var(--surface); color: var(--brand); font-weight: 700; font-size: 0.95rem; cursor: pointer; }
	.mic.listening { background: var(--danger-bg); border-color: var(--danger); color: var(--danger); animation: micpulse 1s ease-in-out infinite; }
	@keyframes micpulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }

	.choices { display: grid; gap: 8px; }
	.choice { padding: 12px 14px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface-2); color: var(--ink); font-size: 1.02rem; text-align: left; cursor: pointer; }
	.choice:hover:not(:disabled) { border-color: var(--brand); }
	.choice:disabled { cursor: default; }
	.choice.right { border-color: var(--success); background: var(--ok-bg); }
	.choice.wrong { border-color: var(--danger); background: var(--danger-bg); }

	.proceed { justify-self: center; padding: 10px 22px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 600; cursor: pointer; }
</style>
