<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { base } from '$app/paths';
	import { db } from '$lib/db/schema';
	import { speakSentenceJapaneseAsync, speechStartCount } from '$lib/core/tts';
	import { speakExamChoices, speakExamListening, stopExamListening } from '$lib/core/examListening';
	import { voiceParams } from '$lib/core/voices';
	import { GRAMMAR_CURATED_ITEMS } from '$lib/data/propedeutiche';
	import { LISTENING_DIALOGUES } from '$lib/core/listeningDialogues';
	import { buildExamMix, buildMixQueue } from '$lib/core/listenExam';
	import { buildQueue, buildSentenceItems, buildWordItems, recallMs, type ListenDirection, type ListenItem, type ListenPause, type ListenStep } from '$lib/core/listenOnly';

	// 🎧 Solo ascolto: niente microfono né tocchi. La voce propone, pausa per il
	// richiamo, poi la risposta. Pensato per il telefono in tasca: una traccia silenziosa
	// e la Media Session fanno vedere la pagina al sistema come un lettore audio, così
	// può continuare a schermo bloccato. Non tutti i telefoni lasciano parlare la voce
	// di sistema in background: se tace ci si ferma senza segnare nulla come ascoltato.
	// A schermo acceso è nero e i comandi vanno tenuti premuti, contro i tocchi involontari.
	const HOLD_MS = 800;
	const SEEN_MAX_CHARS = 1_000_000;

	type Scene = 'intro' | 'play' | 'done';
	type Content = 'tutto' | 'frasi' | 'parole';
	let scene = $state<Scene>('intro');
	let content = $state<Content>('tutto');
	let direction = $state<ListenDirection>('jp-it');
	let pause = $state<ListenPause>('media');
	let livelli = $state<string[]>(['N4']);
	let loading = $state(false);

	let items = $state<ListenItem[]>([]);
	let current = $state<ListenItem | null>(null);
	let revealed = $state(false);
	let phase = $state<'ask' | 'recall' | 'answer'>('ask');
	let paused = $state(false);
	let stalled = $state(false); // il telefono ha sospeso la voce a schermo bloccato
	let skipCurrent = false;
	let listened = $state(0);
	let seenCount = $state(0);
	let running = false;
	let seen = new Set<string>();

	const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

	function toggleLivello(l: string): void {
		if (livelli.includes(l) && livelli.length === 1) return;
		livelli = livelli.includes(l) ? livelli.filter((x) => x !== l) : [...livelli, l];
	}

	const seenKey = () => (content === 'tutto' ? 'renkei-ascolto-visti-tutto' : `renkei-ascolto-visti-${content}-${direction}`);
	function loadSeen(): Set<string> {
		try {
			return new Set(JSON.parse(localStorage.getItem(seenKey()) ?? '[]') as string[]);
		} catch {
			return new Set();
		}
	}
	function saveSeen(): void {
		try {
			const json = JSON.stringify([...seen]);
			if (json.length <= SEEN_MAX_CHARS) localStorage.setItem(seenKey(), json);
		} catch {
			/* pazienza: si riascolta qualcosa */
		}
	}
	function clearSeen(): void {
		seen = new Set();
		seenCount = 0;
		try {
			localStorage.removeItem(seenKey());
		} catch {
			/* pazienza */
		}
	}

	const SETTINGS_KEY = 'renkei-ascolto-opzioni-v2';
	onMount(() => {
		try {
			const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as { content?: Content; direction?: ListenDirection; pause?: ListenPause; livelli?: string[] };
			if (s.content) content = s.content;
			if (s.direction) direction = s.direction;
			if (s.pause) pause = s.pause;
			if (s.livelli?.length) livelli = s.livelli;
		} catch {
			/* opzioni di default */
		}
	});
	function saveSettings(): void {
		try {
			localStorage.setItem(SETTINGS_KEY, JSON.stringify({ content, direction, pause, livelli }));
		} catch {
			/* pazienza */
		}
	}

	let wakeLock: { release: () => Promise<void> } | null = null;
	async function acquireWakeLock(): Promise<void> {
		try {
			const nav = navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } };
			if (nav.wakeLock) wakeLock = await nav.wakeLock.request('screen');
		} catch {
			/* non supportato: lo schermo potrebbe spegnersi */
		}
	}
	function releaseWakeLock(): void {
		void wakeLock?.release?.().catch(() => {});
		wakeLock = null;
	}
	function onVisibility(): void {
		if (document.visibilityState === 'visible') {
			stalled = false;
			if (running && !wakeLock) void acquireWakeLock();
		} else {
			wakeLock = null;
		}
	}

	// Un secondo di silenzio in loop, generato qui: niente file da scaricare.
	let keepAlive: HTMLAudioElement | null = null;
	function silentWavUrl(): string {
		const rate = 8000;
		const buf = new ArrayBuffer(44 + rate);
		const v = new DataView(buf);
		const tag = (at: number, t: string) => [...t].forEach((c, i) => v.setUint8(at + i, c.charCodeAt(0)));
		tag(0, 'RIFF'); v.setUint32(4, 36 + rate, true); tag(8, 'WAVEfmt '); v.setUint32(16, 16, true);
		v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate, true);
		v.setUint16(32, 1, true); v.setUint16(34, 8, true); tag(36, 'data'); v.setUint32(40, rate, true);
		new Uint8Array(buf, 44).fill(128); // 8 bit: 128 è il silenzio
		return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
	}
	function startKeepAlive(): void {
		try {
			if (!keepAlive) {
				keepAlive = new Audio(silentWavUrl());
				keepAlive.loop = true;
			}
			void keepAlive.play().catch(() => {});
			const ms = navigator.mediaSession;
			if (ms) {
				ms.metadata = new MediaMetadata({ title: 'Renkei — Solo ascolto', artist: 'Ripasso JLPT' });
				ms.playbackState = 'playing';
				ms.setActionHandler('play', () => { if (paused) togglePause(); });
				ms.setActionHandler('pause', () => { if (!paused) togglePause(); });
				ms.setActionHandler('nexttrack', () => { skipCurrent = true; stopVoice(); });
			}
		} catch {
			/* niente lettore: funziona comunque a schermo acceso */
		}
	}
	function stopKeepAlive(): void {
		try {
			keepAlive?.pause();
			const ms = navigator.mediaSession;
			if (ms) {
				ms.playbackState = 'none';
				for (const a of ['play', 'pause', 'nexttrack'] as const) ms.setActionHandler(a, null);
			}
		} catch {
			/* pazienza */
		}
	}

	const visible = () => typeof document === 'undefined' || document.visibilityState === 'visible';
	const alive = () => running && !paused && !stalled && !skipCurrent;
	const sleepRaw = (ms: number) => new Promise((r) => setTimeout(r, ms));
	// Attesa interrompibile: pausa o schermo spento la chiudono subito.
	async function wait(ms: number): Promise<void> {
		const end = Date.now() + ms;
		while (alive() && Date.now() < end) await sleepRaw(Math.min(150, end - Date.now()));
	}
	const sayJp = (t: string, rate?: number) => speakSentenceJapaneseAsync(t, { waitMs: 25000, ...(rate ? { rate } : {}) });
	const stopVoice = () => stopExamListening();
	const sayIt = (t: string) => speakSentenceJapaneseAsync(t, { lang: 'it-IT', waitMs: 25000 });

	function defaultSteps(item: ListenItem): ListenStep[] {
		const recall: ListenStep = { t: 'recall', ms: recallMs(item, direction, pause) };
		return direction === 'it-jp'
			? [{ t: 'it', text: item.it }, recall, { t: 'ja', text: item.jp }, { t: 'wait', ms: 500 }, { t: 'ja', text: item.jp, rate: 0.8 }]
			: [{ t: 'ja', text: item.jp }, recall, { t: 'it', text: item.it }, { t: 'wait', ms: 500 }, { t: 'ja', text: item.jp }];
	}
	function runStep(s: ListenStep): Promise<unknown> {
		switch (s.t) {
			case 'ja':
				if (s.voice) return speakSentenceJapaneseAsync(s.text, { ...voiceParams(s.voice === 'M' ? 'maschile' : 'femminile'), waitMs: 25000 });
				return sayJp(s.text, s.rate);
			case 'it':
				return sayIt(s.text);
			case 'wait':
			case 'recall':
				return wait(s.ms);
			case 'esame':
				return speakExamListening(s.prompt);
			case 'scelte':
				return speakExamChoices(s.prompt, s.options, 'sokuji');
		}
	}

	// true = arrivato in fondo; false = interrotto, da rifare alla ripresa.
	async function playItem(item: ListenItem): Promise<boolean> {
		const steps = item.steps ?? defaultSteps(item);
		const hasRecall = steps.some((s) => s.t === 'recall');
		phase = 'ask';
		revealed = !hasRecall;
		for (const step of steps) {
			if (!alive()) return false;
			if (step.t === 'recall') phase = 'recall';
			const startsBefore = speechStartCount();
			await runStep(step);
			// Bloccato e nessuna lettura partita: il telefono ha sospeso la voce.
			if (!visible() && alive() && step.t !== 'wait' && step.t !== 'recall' && speechStartCount() === startsBefore) {
				stalled = true;
				return false;
			}
			if (step.t === 'recall') {
				phase = 'answer';
				revealed = true;
			}
		}
		await wait(900);
		return alive();
	}

	async function loop(): Promise<void> {
		const nextQueue = () => (content === 'tutto' ? buildMixQueue(items, seen) : buildQueue(items, seen));
		let queue = nextQueue();
		let pos = 0;
		while (running) {
			if (pos >= queue.length) {
				if (items.every((i) => seen.has(i.key))) {
					clearSeen();
					await sayIt('Hai ascoltato tutto. Ricomincio da capo.');
				}
				queue = nextQueue();
				pos = 0;
			}
			const item = queue[pos]!;
			current = item;
			const done = await playItem(item);
			if (!running) return;
			if (skipCurrent) {
				skipCurrent = false;
				pos += 1;
				continue;
			}
			if (!done) {
				while (running && (paused || stalled)) await sleepRaw(300);
				continue;
			}
			seen.add(item.key);
			seenCount = items.filter((i) => seen.has(i.key)).length;
			listened += 1;
			saveSeen();
			pos += 1;
		}
	}

	async function start(): Promise<void> {
		loading = true;
		saveSettings();
		const [words, grammar] = await Promise.all([db.words.toArray(), db.grammar.toArray()]);
		items =
			content === 'tutto'
				? buildExamMix({ words, grammar, curated: GRAMMAR_CURATED_ITEMS, dialogues: LISTENING_DIALOGUES, levels: livelli, pause })
				: content === 'frasi'
					? buildSentenceItems(words, grammar, GRAMMAR_CURATED_ITEMS, livelli)
					: buildWordItems(words, livelli);
		loading = false;
		if (items.length === 0) return;
		seen = loadSeen();
		seenCount = items.filter((i) => seen.has(i.key)).length;
		listened = 0;
		paused = false;
		current = null;
		scene = 'play';
		running = true;
		stalled = false;
		skipCurrent = false;
		startKeepAlive(); // qui, sul tocco di avvio: dopo il browser lo rifiuterebbe
		await acquireWakeLock();
		document.addEventListener('visibilitychange', onVisibility);
		await loop();
	}

	function stop(): void {
		running = false;
		stopVoice();
		stopKeepAlive();
		releaseWakeLock();
		if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
		scene = 'done';
	}
	function togglePause(): void {
		paused = !paused;
		if (paused) {
			stopVoice();
			void keepAlive?.pause();
		} else {
			void keepAlive?.play().catch(() => {});
		}
		if (navigator.mediaSession) navigator.mediaSession.playbackState = paused ? 'paused' : 'playing';
	}
	onDestroy(() => {
		running = false;
		stopVoice();
		if (typeof navigator !== 'undefined') stopKeepAlive();
		releaseWakeLock();
		if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
	});

	// Comandi a pressione lunga: in tasca un tocco non deve fare niente.
	let holdTimer: ReturnType<typeof setTimeout> | null = null;
	let holding = $state<string | null>(null);
	function holdStart(id: string, action: () => void): void {
		holdEnd();
		holding = id;
		holdTimer = setTimeout(() => {
			holdEnd();
			action();
		}, HOLD_MS);
	}
	function holdEnd(): void {
		if (holdTimer) clearTimeout(holdTimer);
		holdTimer = null;
		holding = null;
	}
	function onKey(e: KeyboardEvent, action: () => void): void {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			action();
		}
	}
</script>

{#if scene === 'play'}
	<div class="pocket" oncontextmenu={(e) => e.preventDefault()} role="presentation">
		<p class="count">{seenCount} / {items.length}{current?.cat ? ` · ${current.cat}` : ''}{paused ? ' · in pausa' : ''}</p>
		{#if stalled}
			<p class="it">Il telefono ha fermato la voce a schermo bloccato. Riparto da qui.</p>
		{/if}
		{#if current}
			<p class="status">{paused ? '⏸️' : phase === 'recall' ? '🧠' : '🔊'}</p>
			{#if revealed}
				<p class="jp" lang="ja">{current.scritto}</p>
				<p class="it">{current.it}</p>
			{/if}
		{/if}
		<div class="hold-row">
			<button class="hold" class:on={holding === 'pause'}
				onpointerdown={() => holdStart('pause', togglePause)} onpointerup={holdEnd} onpointerleave={holdEnd} onpointercancel={holdEnd}
				onkeydown={(e) => onKey(e, togglePause)}>{paused ? '▶️ Riprendi' : '⏸️ Pausa'}</button>
			<button class="hold" class:on={holding === 'stop'}
				onpointerdown={() => holdStart('stop', stop)} onpointerup={holdEnd} onpointerleave={holdEnd} onpointercancel={holdEnd}
				onkeydown={(e) => onKey(e, stop)}>⏹️ Ferma</button>
		</div>
		<p class="hold-hint">Tieni premuto per usare i comandi</p>
	</div>
{:else}
	<div class="wrap">
		<a class="back" href="{base}/mani-libere">← Mani libere</a>
		{#if scene === 'intro'}
			<article class="scene">
				<h1 class="page-title">🎧 Solo ascolto</h1>
				<p class="hint">La voce propone, c'è una pausa per ricordare, poi senti la risposta. Niente microfono e niente da toccare: va avanti da sola finché non la fermi, anche per ore.</p>
				{#if canSpeak}
					<p class="lab">Cosa ripassare</p>
					<div class="seg" role="group" aria-label="Cosa ripassare">
						<button class="opt wide" class:on={content === 'tutto'} onclick={() => (content = 'tutto')}>🎯 Tutto per l'esame</button>
						<button class="opt" class:on={content === 'frasi'} onclick={() => (content = 'frasi')}>💬 Frasi</button>
						<button class="opt" class:on={content === 'parole'} onclick={() => (content = 'parole')}>📚 Parole</button>
					</div>
					<p class="lab">Livelli</p>
					<div class="seg" role="group" aria-label="Livelli">
						{#each ['N5', 'N4'] as l (l)}
							<button class="opt" class:on={livelli.includes(l)} aria-pressed={livelli.includes(l)} onclick={() => toggleLivello(l)}>{l}</button>
						{/each}
					</div>
					{#if content === 'tutto'}
						<p class="hint small">Prove di ascolto, grammatica, letture, trucchi, forme, frasi e parole, a turno. Le prove d'esame e i trucchi sono sempre N4; i livelli valgono per il resto.</p>
					{:else}
						<p class="lab">Direzione</p>
						<div class="seg" role="group" aria-label="Direzione">
							<button class="opt" class:on={direction === 'jp-it'} onclick={() => (direction = 'jp-it')}>🇯🇵 → 🇮🇹 Capire</button>
							<button class="opt" class:on={direction === 'it-jp'} onclick={() => (direction = 'it-jp')}>🇮🇹 → 🇯🇵 Dire</button>
						</div>
					{/if}
					<p class="lab">Pausa per ricordare</p>
					<div class="seg three" role="group" aria-label="Pausa per ricordare">
						<button class="opt" class:on={pause === 'breve'} onclick={() => (pause = 'breve')}>Breve</button>
						<button class="opt" class:on={pause === 'media'} onclick={() => (pause = 'media')}>Media</button>
						<button class="opt" class:on={pause === 'lunga'} onclick={() => (pause = 'lunga')}>Lunga</button>
					</div>
					<button class="proceed" disabled={loading} onclick={start}>▶️ はじめる</button>
					<p class="hint small">Riparte da ciò che non hai ancora ascoltato. Dopo l'avvio puoi bloccare lo schermo e usare i comandi audio del telefono o delle cuffie. Se il tuo telefono ferma comunque la voce, tienilo sbloccato: lo schermo resta nero e i comandi si tengono premuti. Non conta come ripasso nei tuoi progressi, perché non c'è una risposta da verificare.</p>
				{:else}
					<p class="hint warn">Questo browser non ha la sintesi vocale.</p>
				{/if}
			</article>
		{:else}
			<article class="scene">
				<p class="who">🏁 Fermato</p>
				<p class="score-big">{listened}</p>
				<p class="hint">ascoltate in questa sessione · {seenCount} su {items.length} in totale</p>
				<button class="proceed" onclick={start}>▶️ Continua</button>
				<button class="reset" onclick={() => { clearSeen(); scene = 'intro'; }}>↺ Ricomincia da capo</button>
				<button class="reset" onclick={() => (scene = 'intro')}>⚙️ Cambia opzioni</button>
			</article>
		{/if}
	</div>
{/if}

<style>
	.wrap { display: grid; gap: 14px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.page-title { margin: 0; font-size: 1.25rem; text-align: center; }
	.scene { background: var(--surface); border-radius: 16px; padding: 20px; box-shadow: 0 2px 10px rgba(14,29,51,0.07); display: grid; gap: 10px; }
	.hint { margin: 0; text-align: center; font-size: 0.9rem; color: var(--muted); line-height: 1.5; }
	.hint.small { font-size: 0.8rem; }
	.hint.warn { color: var(--warn-ink); background: var(--warn-bg); border: 1px solid var(--warn-border); border-radius: 10px; padding: 10px; }
	.lab { margin: 6px 0 0; font-size: 0.8rem; font-weight: 800; color: var(--muted); }
	.seg { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
	.seg.three { grid-template-columns: repeat(3, 1fr); }
	.opt { padding: 12px 8px; border-radius: 12px; border: 1.5px solid var(--line); background: var(--surface-2); color: var(--ink); font-weight: 700; font-size: 0.9rem; cursor: pointer; }
	.opt.wide { grid-column: 1 / -1; }
	.opt.on { border-color: var(--brand); background: var(--brand); color: white; }
	.proceed { justify-self: center; margin-top: 6px; padding: 12px 26px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: white; font-weight: 700; font-size: 1.05rem; cursor: pointer; }
	.proceed:disabled { opacity: 0.5; }
	.reset { justify-self: center; padding: 8px 14px; border-radius: 8px; border: 1px solid var(--line); background: var(--surface-2); color: var(--ink); font-size: 0.85rem; cursor: pointer; }
	.who { margin: 0; text-align: center; font-weight: 700; }
	.score-big { margin: 0; text-align: center; font-size: 2.6rem; font-weight: 800; }
	/* nero pieno per la batteria, sopra tutto il resto dell'app */
	.pocket {
		position: fixed; inset: 0; z-index: 1000; background: black; color: gray;
		display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px;
		padding: 16px; text-align: center; user-select: none; -webkit-user-select: none; touch-action: none;
	}
	.count, .hold-hint { margin: 0; font-size: 0.8rem; }
	.status { margin: 0; font-size: 2rem; line-height: 1; opacity: 0.7; }
	.jp { margin: 0; font-size: clamp(1.2rem, 6vw, 1.7rem); font-weight: 700; overflow-wrap: anywhere; }
	.it { margin: 0; font-size: 1rem; overflow-wrap: anywhere; }
	.hold-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; max-width: 420px; margin-top: 20px; }
	.hold { padding: 22px 8px; border-radius: 14px; border: 1.5px solid dimgray; background: black; color: gray; font-size: 1rem; font-weight: 700; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
	.hold.on { border-color: white; color: white; }
</style>
