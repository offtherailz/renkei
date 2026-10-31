<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { base } from '$app/paths';
	import { db } from '$lib/db/schema';
	import { speakSentenceJapaneseAsync, stopSpeaking } from '$lib/core/tts';
	import { GRAMMAR_CURATED_ITEMS } from '$lib/data/propedeutiche';
	import { buildQueue, buildSentenceItems, buildWordItems, recallMs, type ListenDirection, type ListenItem, type ListenPause } from '$lib/core/listenOnly';

	// 🎧 Solo ascolto: niente microfono né tocchi. La voce propone, pausa per il
	// richiamo, poi la risposta. Pensato per il telefono in tasca: lo schermo resta
	// acceso (voce del browser ferma a schermo spento), quindi è nero e i comandi
	// vanno tenuti premuti, così un tocco involontario non fa niente.
	const HOLD_MS = 800;
	const SEEN_MAX_CHARS = 1_000_000;

	type Scene = 'intro' | 'play' | 'done';
	type Content = 'frasi' | 'parole';
	let scene = $state<Scene>('intro');
	let content = $state<Content>('frasi');
	let direction = $state<ListenDirection>('jp-it');
	let pause = $state<ListenPause>('media');
	let livelli = $state<string[]>(['N5', 'N4']);
	let loading = $state(false);

	let items = $state<ListenItem[]>([]);
	let current = $state<ListenItem | null>(null);
	let revealed = $state(false);
	let phase = $state<'ask' | 'recall' | 'answer'>('ask');
	let paused = $state(false);
	let listened = $state(0);
	let seenCount = $state(0);
	let running = false;
	let seen = new Set<string>();

	const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

	function toggleLivello(l: string): void {
		if (livelli.includes(l) && livelli.length === 1) return;
		livelli = livelli.includes(l) ? livelli.filter((x) => x !== l) : [...livelli, l];
	}

	const seenKey = () => `renkei-ascolto-visti-${content}-${direction}`;
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

	const SETTINGS_KEY = 'renkei-ascolto-opzioni';
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
			if (running && !wakeLock) void acquireWakeLock();
		} else {
			stopSpeaking();
			wakeLock = null;
		}
	}

	const visible = () => typeof document === 'undefined' || document.visibilityState === 'visible';
	const alive = () => running && !paused && visible();
	const sleepRaw = (ms: number) => new Promise((r) => setTimeout(r, ms));
	// Attesa interrompibile: pausa o schermo spento la chiudono subito.
	async function wait(ms: number): Promise<void> {
		const end = Date.now() + ms;
		while (alive() && Date.now() < end) await sleepRaw(Math.min(150, end - Date.now()));
	}
	const sayJp = (t: string, rate?: number) => speakSentenceJapaneseAsync(t, { waitMs: 25000, ...(rate ? { rate } : {}) });
	const sayIt = (t: string) => speakSentenceJapaneseAsync(t, { lang: 'it-IT', waitMs: 25000 });

	// true = arrivato in fondo; false = interrotto, da rifare alla ripresa.
	async function playItem(item: ListenItem): Promise<boolean> {
		const toJp = direction === 'it-jp';
		const steps: (() => Promise<unknown>)[] = [
			() => { phase = 'ask'; revealed = false; return toJp ? sayIt(item.it) : sayJp(item.jp); },
			() => { phase = 'recall'; return wait(recallMs(item, direction, pause)); },
			() => { phase = 'answer'; revealed = true; return toJp ? sayJp(item.jp) : sayIt(item.it); },
			() => wait(500),
			// la frase giapponese torna sempre: è l'orecchio che va allenato
			() => sayJp(item.jp, toJp ? 0.8 : undefined),
			() => wait(900)
		];
		for (const step of steps) {
			if (!alive()) return false;
			await step();
		}
		return alive();
	}

	async function loop(): Promise<void> {
		let queue = buildQueue(items, seen);
		let pos = 0;
		while (running) {
			if (pos >= queue.length) {
				if (items.every((i) => seen.has(i.key))) {
					clearSeen();
					await sayIt('Hai ascoltato tutto. Ricomincio da capo.');
				}
				queue = buildQueue(items, seen);
				pos = 0;
			}
			const item = queue[pos]!;
			current = item;
			const done = await playItem(item);
			if (!running) return;
			if (!done) {
				while (running && (paused || !visible())) await sleepRaw(300);
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
		items = content === 'frasi' ? buildSentenceItems(words, grammar, GRAMMAR_CURATED_ITEMS, livelli) : buildWordItems(words, livelli);
		loading = false;
		if (items.length === 0) return;
		seen = loadSeen();
		seenCount = items.filter((i) => seen.has(i.key)).length;
		listened = 0;
		paused = false;
		current = null;
		scene = 'play';
		running = true;
		await acquireWakeLock();
		document.addEventListener('visibilitychange', onVisibility);
		await loop();
	}

	function stop(): void {
		running = false;
		stopSpeaking();
		releaseWakeLock();
		if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
		scene = 'done';
	}
	function togglePause(): void {
		paused = !paused;
		if (paused) stopSpeaking();
	}
	onDestroy(() => {
		running = false;
		stopSpeaking();
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
		<p class="count">{seenCount} / {items.length}{paused ? ' · in pausa' : ''}</p>
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
				<p class="hint">La voce propone, c'è una pausa per ricordare, poi senti la risposta. Niente microfono e niente da toccare: va avanti da sola finché non la fermi.</p>
				{#if canSpeak}
					<p class="lab">Cosa ripassare</p>
					<div class="seg" role="group" aria-label="Cosa ripassare">
						<button class="opt" class:on={content === 'frasi'} onclick={() => (content = 'frasi')}>💬 Frasi</button>
						<button class="opt" class:on={content === 'parole'} onclick={() => (content = 'parole')}>📚 Parole</button>
					</div>
					<p class="lab">Livelli</p>
					<div class="seg" role="group" aria-label="Livelli">
						{#each ['N5', 'N4'] as l (l)}
							<button class="opt" class:on={livelli.includes(l)} aria-pressed={livelli.includes(l)} onclick={() => toggleLivello(l)}>{l}</button>
						{/each}
					</div>
					<p class="lab">Direzione</p>
					<div class="seg" role="group" aria-label="Direzione">
						<button class="opt" class:on={direction === 'jp-it'} onclick={() => (direction = 'jp-it')}>🇯🇵 → 🇮🇹 Capire</button>
						<button class="opt" class:on={direction === 'it-jp'} onclick={() => (direction = 'it-jp')}>🇮🇹 → 🇯🇵 Dire</button>
					</div>
					<p class="lab">Pausa per ricordare</p>
					<div class="seg three" role="group" aria-label="Pausa per ricordare">
						<button class="opt" class:on={pause === 'breve'} onclick={() => (pause = 'breve')}>Breve</button>
						<button class="opt" class:on={pause === 'media'} onclick={() => (pause = 'media')}>Media</button>
						<button class="opt" class:on={pause === 'lunga'} onclick={() => (pause = 'lunga')}>Lunga</button>
					</div>
					<button class="proceed" disabled={loading} onclick={start}>▶️ はじめる</button>
					<p class="hint small">Riparte da ciò che non hai ancora ascoltato. Lo schermo resta acceso e nero: a schermo spento la voce del browser si ferma. Attiva il blocco tasca del telefono se c'è. Non conta come ripasso nei tuoi progressi, perché non c'è una risposta da verificare.</p>
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
