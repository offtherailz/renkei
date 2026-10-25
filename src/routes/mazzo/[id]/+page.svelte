<script lang="ts">
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import FuriganaText from '$lib/components/FuriganaText.svelte';
	import { speakSentenceJapanese, stopSpeaking } from '$lib/core/tts';
	import { findMazzo, type MazzoCard } from '$lib/data/mazzi';
	import { speechMatches, listenJapanese, speechAvailable } from '$lib/core/speech';
	import { db } from '$lib/db/schema';
	import { recordPractice } from '$lib/core/practiceMiss';
	import { findMazzoCardWord } from '$lib/db/queries';
	import type { FacetField } from '$lib/core/srs';

	const mazzo = $derived(findMazzo($page.params.id ?? ''));

	type Dir = 'jp2it' | 'it2jp' | 'listen';
	let dir = $state<Dir>('jp2it'); // jp→ : leggi/traduci; it→ : produci; listen: riconosci a orecchio
	// Ogni direzione allena (e muove nel radar) una sfaccettatura diversa della parola.
	const FACET_BY_DIR: Record<Dir, FacetField> = {
		jp2it: 'facet_meaning_r', // vedo il JP, recupero il senso
		it2jp: 'facet_meaning_p', // dal senso produco il JP
		listen: 'facet_form_listen' // la riconosco a orecchio
	};
	const canTts = typeof window !== 'undefined' && 'speechSynthesis' in window;
	let order = $state<number[]>([]);
	let pos = $state(0);
	let flipped = $state(false);
	let rivedere = $state<number[]>([]); // indici segnati «da rivedere»
	let scene = $state<'setup' | 'play' | 'eserc' | 'prod' | 'done'>('setup');

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

	// Modalità produzione (consegna IT → produci la frase → verifica → soluzione).
	let pIdx = $state(0);
	let pShown = $state(false);
	let pInput = $state(''); // la frase che l'utente digita (o detta col 🎤)
	let pResult = $state<null | 'ok' | 'ko'>(null); // esito del confronto
	let pListening = $state(false);
	const canSpeak = speechAvailable();
	const produzione = $derived(mazzo?.produzione ?? []);
	// Dalla risposta con furigana (漢字[かな]) ricava: la forma scritta (kanji) e la
	// lettura (tutto in kana), per un confronto tollerante a spazi/furigana/kana.
	const prodWriting = (r: string) => r.replace(/\[[^\]]*\]/g, '').replace(/[【】]/g, '');
	const prodReading = (r: string) => r.replace(/[一-龯々〇〆]+\[([^\]]*)\]/g, '$1').replace(/[【】]/g, '');
	function startProd() {
		pIdx = 0;
		pShown = false;
		pInput = '';
		pResult = null;
		scene = 'prod';
	}
	// Confronta ciò che l'utente ha prodotto con la soluzione (scritta o lettura),
	// ignorando spazi, punteggiatura e differenze kana↔katakana (normalizeSpeech).
	function judgeProd(said: string[]): void {
		const r = produzione[pIdx]?.risposta;
		if (!r) return;
		const ok = speechMatches(said, [[prodWriting(r), prodReading(r)]]);
		pResult = ok ? 'ok' : 'ko';
		revealProd();
	}
	function checkProd() {
		if (!pInput.trim()) return;
		judgeProd([pInput]);
	}
	async function micProd() {
		if (!canSpeak || pListening) return;
		pListening = true;
		try {
			const alts = await listenJapanese();
			if (alts.length) { pInput = alts[0]!; judgeProd(alts); }
		} finally {
			pListening = false;
		}
	}
	function revealProd() {
		pShown = true;
		const r = produzione[pIdx]?.risposta;
		if (r) say(r.replace(/[【】]/g, ''));
	}
	function nextProd() {
		if (pIdx + 1 < produzione.length) {
			pIdx += 1;
			pShown = false;
			pInput = '';
			pResult = null;
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

	// Direzione «Ascolta»: la carta parte a faccia coperta e pronuncia da sola la
	// parola — devi riconoscerla a orecchio prima di girare.
	$effect(() => {
		if (scene === 'play' && dir === 'listen' && !flipped && card) say(card.yomi);
	});

	// I flashcard muovono il radar delle sfaccettature: «sapevo/da rivedere» dà
	// credito (positivo/negativo) alla cella allenata da questa direzione, sulla
	// parola di catalogo corrispondente (per scrittura). Se non è in catalogo si
	// salta (niente credito), senza bloccare lo studio.
	async function creditFacet(c: MazzoCard, known: boolean): Promise<void> {
		const w = await findMazzoCardWord(c);
		if (w) await recordPractice(`word:${w.id}`, known, FACET_BY_DIR[dir]);
	}

	// Andando alla scheda il componente si smonta: il giro in corso si salva
	// e si riprende al ritorno (stessa carta, girata).
	const RESUME_KEY = 'renkei-mazzo-resume';
	function saveResume(): void {
		try {
			sessionStorage.setItem(RESUME_KEY, JSON.stringify({ id: mazzo?.id, dir, order, pos, rivedere }));
		} catch {
			/* storage non disponibile: si riparte da capo */
		}
	}
	$effect(() => {
		const id = mazzo?.id;
		if (!id) return;
		try {
			const raw = sessionStorage.getItem(RESUME_KEY);
			sessionStorage.removeItem(RESUME_KEY);
			const r = raw ? JSON.parse(raw) : null;
			if (r?.id === id && Array.isArray(r.order) && r.order.length > 0) {
				dir = r.dir;
				order = r.order;
				pos = r.pos;
				rivedere = r.rivedere ?? [];
				scene = 'play';
				flipped = true;
			}
		} catch {
			/* niente da riprendere */
		}
	});

	// 📖 Scheda della parola sotto la carta girata: da lì Metti in studio, ecc.
	let cardWordId = $state<string | null>(null);
	$effect(() => {
		const c = card;
		cardWordId = null;
		if (!c) return;
		findMazzoCardWord(c)
			.then((w) => {
				if (card === c) cardWordId = w?.id ?? null;
			})
			.catch(() => {});
	});

	function next(known: boolean) {
		if (!card) return;
		void creditFacet(card, known);
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
			{#if canTts}
				<button class="dirbtn" onclick={() => start('listen')}>
					<span class="d-t">🔊 Ascolta → riconosci</span>
					<span class="d-d">Senti la parola (niente testo), prova a riconoscerla, poi gira per verificare</span>
				</button>
			{/if}
		</div>
		<p class="lbl">Oppure mettiti alla prova</p>
		{#if esercizi.length}
			<button class="dirbtn test" onclick={startEserc}>
				<span class="d-t">📝 Esercizi di grammatica ({esercizi.length})</span>
				<span class="d-d">Frasi del capitolo da completare: 〜てしまう (purtroppo), 調子が悪い, non funziona… con spiegazione.</span>
			</button>
		{/if}
		{#if produzione.length}
			<button class="dirbtn test" onclick={startProd}>
				<span class="d-t">✍️ Produzione ({produzione.length})</span>
				<span class="d-d">Ti dico cosa dire (in italiano) + il pattern; tu produci la frase, poi riveli la soluzione con spiegazione. Per imparare a costruirle da solo.</span>
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
			{#if dir === 'listen'}
				<!-- fronte: solo audio, niente testo — riconosci a orecchio -->
				{#if flipped}
					<div class="c-front">{card.jp}</div>
					<div class="c-reading"><FuriganaText text={card.yomi} force={true} /></div>
					<div class="c-it">{card.it}</div>
					{#if card.es}<div class="c-es"><FuriganaText text={card.es} force={true} /></div>{/if}
					{#if card.es_it}<div class="c-esit">{card.es_it}</div>{/if}
				{:else}
					<div class="c-front it">🔊</div>
					<div class="c-hint">ascolta e riconosci · tocca per girare</div>
				{/if}
			{:else if dir === 'jp2it'}
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
		{#if flipped && cardWordId}
			<a class="c-scheda" onclick={saveResume} href="{base}/detail/{encodeURIComponent(`word:${cardWordId}`)}">📖 Scheda della parola</a>
		{/if}
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
	{:else if scene === 'prod'}
		{@const p = produzione[pIdx]}
		<div class="hud"><span>{pIdx + 1} / {produzione.length}</span><span>✍️ Produzione</span></div>
		{#if pIdx === 0 && mazzo.produzioneNota}
			<p class="prod-nota">💡 {mazzo.produzioneNota}</p>
		{/if}
		<div class="prod-card">
			<p class="prod-consegna">{p.consegna}</p>
			<p class="prod-pattern">Usa: <strong>{p.pattern}</strong></p>
			{#if !pShown}
				<div class="prod-try">
					<input
						class="prod-input"
						bind:value={pInput}
						placeholder="Scrivi la frase in giapponese…"
						onkeydown={(e) => { if (e.key === 'Enter') checkProd(); }}
						autocomplete="off" autocapitalize="off" spellcheck="false"
					/>
					{#if canSpeak}
						<button class="prod-mic" class:live={pListening} title="Dillo a voce" aria-label="Dillo a voce" onclick={micProd}>🎤</button>
					{/if}
				</div>
			{/if}
			{#if pShown}
				{#if pResult}
					<p class="prod-esito" class:ok={pResult === 'ok'}>{pResult === 'ok' ? '✅ Giusto!' : '🔸 Quasi — confronta con la soluzione'}</p>
					{#if pInput}<p class="prod-mine">La tua: {pInput}</p>{/if}
				{/if}
				<div class="prod-sol">
					<div class="prod-jp"><FuriganaText text={p.risposta} force={true} /><button class="tts" title="Ascolta" aria-label="Ascolta" onclick={() => say(p.risposta.replace(/[【】]/g, ''))}>🔊</button></div>
					<p class="prod-spiega">{p.spiega}</p>
				</div>
			{/if}
		</div>
		{#if pShown}
			<button class="cta" onclick={nextProd}>{pIdx + 1 < produzione.length ? 'Prossima →' : 'Fine'}</button>
		{:else}
			<div class="prod-actions">
				<button class="cta" onclick={checkProd} disabled={!pInput.trim()}>Controlla</button>
				<button class="r-ok" onclick={revealProd}>Mostra la soluzione</button>
			</div>
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
	.c-scheda { justify-self: center; font-size: 0.85rem; font-weight: 600; color: var(--brand); text-decoration: none; }
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
	.prod-nota { font-size: 0.82rem; color: var(--info-ink); background: var(--info-bg); border-radius: 10px; padding: 10px 12px; margin: 0; line-height: 1.5; }
	.prod-card { display: grid; gap: 8px; border: 1px solid var(--line); border-radius: 14px; background: var(--surface); padding: 16px; }
	.prod-consegna { margin: 0; font-size: 1.1rem; font-weight: 700; }
	.prod-pattern { margin: 0; font-size: 0.9rem; color: var(--muted); }
	.prod-pattern strong { color: var(--brand); }
	.prod-sol { display: grid; gap: 6px; border-top: 1px solid var(--line); padding-top: 10px; }
	.prod-jp { display: flex; align-items: center; gap: 8px; font-size: 1.25rem; font-weight: 700; flex-wrap: wrap; }
	.prod-spiega { margin: 0; font-size: 0.85rem; color: var(--ink); }
	.prod-try { display: flex; gap: 8px; align-items: center; }
	.prod-input { flex: 1; min-width: 0; padding: 10px 12px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface-2); color: var(--ink); font-size: 1.05rem; }
	.prod-input:focus { outline: none; border-color: var(--brand); }
	.prod-mic { padding: 10px 12px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface-2); cursor: pointer; font-size: 1.1rem; }
	.prod-mic.live { border-color: var(--brand); background: var(--brand); }
	.prod-esito { margin: 4px 0 0; font-weight: 800; color: var(--warn-ink); }
	.prod-esito.ok { color: var(--success); }
	.prod-mine { margin: 0; font-size: 0.85rem; color: var(--muted); }
	.prod-actions { display: grid; grid-template-columns: 1fr auto; gap: 8px; }
	.prod-actions .r-ok { padding: 12px; border-radius: 12px; font-weight: 700; border: 1px solid var(--success); cursor: pointer; }
</style>
