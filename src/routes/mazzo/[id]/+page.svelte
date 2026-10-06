<script lang="ts">
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import FuriganaText from '$lib/components/FuriganaText.svelte';
	import { speakSentenceJapanese, stopSpeaking } from '$lib/core/tts';
	import { findMazzo, type MazzoCard } from '$lib/data/mazzi';

	const mazzo = $derived(findMazzo($page.params.id ?? ''));

	type Dir = 'jp2it' | 'it2jp';
	let dir = $state<Dir>('jp2it'); // jp→ : leggi/traduci; it→ : produci la parola
	let order = $state<number[]>([]);
	let pos = $state(0);
	let flipped = $state(false);
	let rivedere = $state<number[]>([]); // indici segnati «da rivedere»
	let scene = $state<'setup' | 'play' | 'eserc' | 'done'>('setup');

	// Modalità esercizi (cloze/scelta): grammatica/funzioni del capitolo.
	let eIdx = $state(0);
	let ePicked = $state<number | null>(null);
	let eChoices = $state<string[]>([]);
	let eCorrect = $state(0);
	const esercizi = $derived(mazzo?.esercizi ?? []);
	function prepEserc() {
		const ex = esercizi[eIdx];
		if (!ex) return;
		const sh = shuffle(ex.choices.map((c, i) => ({ c, i })));
		eChoices = sh.map((x) => x.c);
		eCorrect = sh.findIndex((x) => x.i === 0); // la prima era la corretta
		ePicked = null;
	}
	function startEserc() {
		eIdx = 0;
		scene = 'eserc';
		prepEserc();
	}
	function nextEserc() {
		if (eIdx + 1 < esercizi.length) {
			eIdx += 1;
			prepEserc();
		} else {
			scene = 'done';
		}
	}

	function shuffle<T>(xs: T[]): T[] {
		const a = [...xs];
		for (let i = a.length - 1; i > 0; i -= 1) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j]!, a[i]!];
		}
		return a;
	}

	function start(d: Dir) {
		if (!mazzo) return;
		dir = d;
		order = shuffle(mazzo.carte.map((_, i) => i));
		pos = 0;
		flipped = false;
		rivedere = [];
		scene = 'play';
	}

	const card = $derived<MazzoCard | null>(mazzo && scene === 'play' ? mazzo.carte[order[pos] ?? 0] ?? null : null);

	function say(text: string, rate = 1) {
		stopSpeaking();
		speakSentenceJapanese(text, { rate });
	}
	function flip() {
		flipped = !flipped;
		if (flipped && card) say(card.yomi); // pronuncia alla scoperta
	}

	function next(known: boolean) {
		if (!card) return;
		if (!known) rivedere = [...rivedere, order[pos]!];
		if (pos + 1 < order.length) {
			pos += 1;
			flipped = false;
		} else if (rivedere.length > 0) {
			// secondo giro: solo le «da rivedere»
			order = shuffle(rivedere);
			rivedere = [];
			pos = 0;
			flipped = false;
		} else {
			scene = 'done';
			stopSpeaking();
		}
	}
</script>

<div class="mazzo">
	<a class="back" href="{base}/">← Home</a>
	{#if !mazzo}
		<p class="muted">Mazzo non trovato.</p>
	{:else if scene === 'setup'}
		<h1 class="page-title">{mazzo.emoji} {mazzo.titolo}</h1>
		<p class="sub">{mazzo.descrizione}</p>
		<p class="sub">{mazzo.carte.length} carte · tocca la carta per girarla, poi segna «sapevo» o «da rivedere». Le «da rivedere» tornano.</p>
		<p class="lbl">Come vuoi studiarle?</p>
		<div class="dirs">
			<button class="dirbtn" onclick={() => start('jp2it')}>
				<span class="d-t">日本語 → 意味</span>
				<span class="d-d">Vedi la parola, indovina lettura + significato (allena la lettura)</span>
			</button>
			<button class="dirbtn" onclick={() => start('it2jp')}>
				<span class="d-t">Italiano → 日本語</span>
				<span class="d-d">Vedi il significato, produci la parola giapponese</span>
			</button>
		</div>
		<p class="lbl">Oppure mettiti alla prova</p>
		{#if esercizi.length}
			<button class="dirbtn test" onclick={startEserc}>
				<span class="d-t">📝 Esercizi di grammatica ({esercizi.length})</span>
				<span class="d-d">Frasi del capitolo da completare: 〜てしまう (purtroppo), 調子が悪い, non funziona… con spiegazione.</span>
			</button>
		{/if}
		<a class="dirbtn test" href="{base}/quiz?collezione={mazzo.id}">
			<span class="d-t">🎯 Mini-test (quiz)</span>
			<span class="d-d">Domande vere su queste parole: lettura, ascolto, composizione, kanji… (come l’SRS, randomizzato). Alimenta i ripassi.</span>
		</a>
	{:else if scene === 'eserc'}
		{@const ex = esercizi[eIdx]}
		<div class="hud"><span>{eIdx + 1} / {esercizi.length}</span><span>📝 Esercizi</span></div>
		<div class="eq-prompt"><FuriganaText text={ex.prompt} force={true} /></div>
		<div class="eopts">
			{#each eChoices as c, i (i)}
				<button class="opt" class:right={ePicked !== null && i === eCorrect} class:wrong={ePicked === i && i !== eCorrect}
					disabled={ePicked !== null} onclick={() => (ePicked = i)}>
					<FuriganaText text={c} force={true} />
				</button>
			{/each}
		</div>
		{#if ePicked !== null}
			<div class="efb" class:ok={ePicked === eCorrect}>
				<p class="efb-t"><strong>{ePicked === eCorrect ? '✅ Giusto!' : '❌ Non proprio.'}</strong>
					<button class="tts" title="Ascolta" aria-label="Ascolta" onclick={() => say(ex.prompt.replace('＿＿', eChoices[eCorrect] ?? ''))}>🔊</button></p>
				<p class="efb-why">{ex.spiega}</p>
				<p class="efb-it">💬 {ex.traduzione}</p>
			</div>
			<button class="cta" onclick={nextEserc}>{eIdx + 1 < esercizi.length ? 'Prossima →' : 'Fine'}</button>
		{/if}
	{:else if scene === 'play' && card}
		<div class="hud"><span>{pos + 1} / {order.length}</span><span class="hud-r">{rivedere.length ? `🔁 ${rivedere.length} da rivedere` : ''}</span></div>
		<button class="card" onclick={flip} aria-label="Gira la carta">
			{#if dir === 'jp2it'}
				<!-- fronte: parola senza furigana (allena la lettura) -->
				<div class="c-front">{card.jp}</div>
				{#if flipped}
					<div class="c-reading"><FuriganaText text={card.yomi} force={true} /></div>
					<div class="c-it">{card.it}</div>
					{#if card.es}<div class="c-es"><FuriganaText text={card.es} force={true} /></div>{/if}
					{#if card.es_it}<div class="c-esit">{card.es_it}</div>{/if}
				{:else}
					<div class="c-hint">tocca per girare</div>
				{/if}
			{:else}
				<div class="c-front it">{card.it}</div>
				{#if flipped}
					<div class="c-jp">{card.jp}</div>
					<div class="c-reading"><FuriganaText text={card.yomi} force={true} /></div>
					{#if card.es}<div class="c-es"><FuriganaText text={card.es} force={true} /></div>{/if}
					{#if card.es_it}<div class="c-esit">{card.es_it}</div>{/if}
				{:else}
					<div class="c-hint">tocca per girare</div>
				{/if}
			{/if}
		</button>
		<div class="tts-row">
			<button class="lbtn" onclick={() => say(card!.yomi)}>🔊 Pronuncia</button>
			<button class="lbtn" onclick={() => say(card!.yomi, 0.6)}>🐢 ゆっくり</button>
		</div>
		{#if flipped}
			<div class="rate">
				<button class="r-no" onclick={() => next(false)}>🔁 Da rivedere</button>
				<button class="r-ok" onclick={() => next(true)}>✅ Sapevo</button>
			</div>
		{:else}
			<button class="cta" onclick={flip}>Gira ↻</button>
		{/if}
	{:else if scene === 'done'}
		<h1 class="page-title">🎉 Mazzo finito!</h1>
		<p class="sub">Hai ripassato tutte le carte di «{mazzo.titolo}».</p>
		<div class="rate">
			<button class="cta" onclick={() => start(dir)}>🔁 Rifai (mescolate)</button>
			<button class="r-ok" onclick={() => (scene = 'setup')}>Cambia modo</button>
		</div>
	{/if}
</div>

<style>
	.mazzo { display: grid; gap: 14px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.page-title { margin: 0; font-size: 1.3rem; }
	.sub { margin: 0; font-size: 0.85rem; color: var(--muted); }
	.muted { color: var(--muted); }
	.lbl { margin: 4px 0 0; font-size: 0.8rem; font-weight: 700; color: var(--muted); }
	.dirs { display: grid; gap: 8px; }
	.dirbtn { display: grid; gap: 2px; text-align: left; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); padding: 12px; cursor: pointer; color: var(--ink); }
	.dirbtn:hover { border-color: var(--brand); }
	.dirbtn.test { text-decoration: none; border-color: var(--brand); }
	.d-t { font-weight: 700; font-size: 1rem; }
	.d-d { font-size: 0.78rem; color: var(--muted); }

	.hud { display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--muted); }
	.card { display: grid; gap: 10px; place-items: center; min-height: 220px; border: 2px solid var(--line); border-radius: 16px; background: var(--surface); padding: 20px; cursor: pointer; width: 100%; }
	.c-front { font-size: 2rem; font-weight: 800; }
	.c-front.it { font-size: 1.3rem; font-weight: 700; color: var(--ink); }
	.c-reading { font-size: 1.3rem; color: var(--brand); font-weight: 700; }
	.c-jp { font-size: 1.8rem; font-weight: 800; }
	.c-it { font-size: 1rem; color: var(--ink); }
	.c-es { font-size: 1rem; border-top: 1px solid var(--line); padding-top: 8px; margin-top: 4px; }
	.c-esit { font-size: 0.8rem; color: var(--muted); }
	.c-hint { font-size: 0.78rem; color: var(--muted); }

	.tts-row { display: flex; gap: 8px; justify-content: center; }
	.lbtn { border: 1px solid var(--line); background: var(--bg); color: var(--ink); border-radius: 999px; padding: 6px 14px; font-size: 0.85rem; cursor: pointer; }
	.lbtn:hover { border-color: var(--brand); }
	.rate { display: flex; gap: 8px; }
	.rate button { flex: 1; padding: 12px; border-radius: 12px; font-weight: 700; font-size: 0.95rem; cursor: pointer; border: 1px solid var(--line); }
	.r-ok { background: var(--ok-bg); color: var(--ok-ink); border-color: var(--success); }
	.r-no { background: var(--warn-bg); color: var(--warn-ink); border-color: var(--warn-border); }
	.cta { width: 100%; padding: 12px; border-radius: 12px; font-weight: 700; background: var(--brand); color: #fff; border: none; cursor: pointer; }
	.eq-prompt { font-size: 1.3rem; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); padding: 16px; text-align: center; }
	.eopts { display: grid; gap: 8px; }
	.opt { text-align: center; border: 1px solid var(--line); border-radius: 10px; background: var(--bg); color: var(--ink); padding: 12px; font-size: 1.1rem; cursor: pointer; }
	.opt:disabled { cursor: default; }
	.opt.right { border-color: var(--success); background: var(--ok-bg); }
	.opt.wrong { border-color: var(--danger); background: var(--danger-bg); }
	.efb { display: grid; gap: 4px; border-left: 3px solid var(--line); padding-left: 10px; }
	.efb.ok { border-left-color: var(--success); }
	.efb-t { margin: 0; display: flex; align-items: center; gap: 8px; }
	.efb-why { margin: 0; font-size: 0.9rem; }
	.efb-it { margin: 0; font-size: 0.85rem; color: var(--muted); }
	.tts { border: none; background: none; cursor: pointer; font-size: 1rem; }
</style>
