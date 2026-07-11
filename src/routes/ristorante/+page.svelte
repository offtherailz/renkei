<script lang="ts">
	import ScriptLog from '$lib/components/ScriptLog.svelte';
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { db } from '$lib/db/schema';
	import type { Counter } from '$lib/types/models';
	import { RESTAURANTS, type Restaurant, type Dish } from '$lib/core/restaurants';
	import { readCounterN } from '$lib/core/counterReadings';
	import { readNumber, YEN_DENOMINATIONS } from '$lib/core/counterGen';
	import { recordPracticeMiss } from '$lib/core/practiceMiss';
	import { speechAvailable, listenJapanese, speechMatches } from '$lib/core/speech';
	import { speakSentenceJapanese, speakSentenceJapaneseAsync, speakSequence } from '$lib/core/tts';
	import { playClink } from '$lib/core/sfx';
	import { voiceParams, primeVoices, opposite, type Gender } from '$lib/core/voices';
	import { appState } from '$lib/stores.svelte';
	import { shuffle } from '$lib/core/gameKit';

	function userGender(): Gender {
		return appState.settings.voce_utente ?? 'femminile';
	}
	function staff(): Gender {
		return opposite(userGender());
	}
	const rnd = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)]!;

	type Line = { who: 'staff' | 'me'; text: string };
	let dialog = $state<Line[]>([]);
	function pushLine(who: 'staff' | 'me', text: string): void {
		const last = dialog[dialog.length - 1];
		if (last && last.who === who && last.text === text) return; // no doppioni consecutivi
		dialog = [...dialog, { who, text }];
	}
	function staffSay(text: string): void {
		speakSentenceJapanese(text, voiceParams(staff()));
		pushLine('staff', text);
	}
	function mySay(text: string): void {
		speakSentenceJapanese(text, voiceParams(userGender()));
		pushLine('me', text);
	}
	// Più battute di fila (anche di voci diverse) senza annullarsi.
	function sequence(lines: { who: 'staff' | 'me'; text: string }[]): void {
		speakSequence(lines.map((l) => ({ text: l.text, options: voiceParams(l.who === 'staff' ? staff() : userGender()) })));
		for (const l of lines) pushLine(l.who, l.text);
	}

	// ── Frasi con varianti (dialogo più reale) ──
	const GREET = ['いらっしゃいませ！', 'いらっしゃいませ！ようこそ。'];
	const SEATS_Q = ['何名様ですか？', '何名様でしょうか？'];
	const SEATTYPE_Q = ['お席はカウンターとテーブル、どちらになさいますか？', 'カウンター席とテーブル席、どちらがよろしいですか？'];
	const OK = ['かしこまりました。', 'はい、承知しました。'];
	const SMOKE_Q = ['禁煙席と喫煙席、どちらがよろしいですか？', 'お煙草はお吸いになりますか？'];
	const WAIT = ['申し訳ございません、ただいま満席です。少々お待ちください。', 'ただいま混んでおります。少々お待ちください。'];
	const MENU_L = ['こちらメニューです。ごゆっくりどうぞ。', 'メニューをどうぞ。ごゆっくりご覧ください。'];
	const SERVE = ['お待たせしました！どうぞ。', 'お待たせいたしました。ごゆっくりどうぞ。'];
	const MORE_Q = ['ご注文は以上でよろしいですか？', '他にご注文はございますか？'];
	const THANKS = ['ありがとうございました！', 'ありがとうございました！またお越しくださいませ。'];
	const NOT_UNDERSTOOD = ['すみません、もう一度おねがいします。', 'えっと、聞き取れませんでした。もう一度お願いします。', 'すみません、もう一度よろしいですか？'];
	// Richieste di ripetizione (riusabili): l'utente le pronuncia, poi si riascolta.
	const REPEAT_REQ = ['すみません、もう一度おねがいします。', 'もう一度いいですか？', 'すみません、もう一度よろしいですか？'];
	const SLOWER_REQ = ['すみません、もう少しゆっくりおねがいします。', 'もう少しゆっくり話していただけますか？', 'ゆっくりおねがいします。'];

	// もう一度 / ゆっくり: dici la richiesta (tua voce) poi risenti la frase (più
	// piano se ゆっくり). Non finisce nel copione (è pratica, non storia).
	async function askRepeat(slow: boolean, line: string): Promise<void> {
		const req = slow ? rnd(SLOWER_REQ) : rnd(REPEAT_REQ);
		await speakSentenceJapaneseAsync(req, voiceParams(userGender()));
		speakSentenceJapanese(line, { ...voiceParams(staff()), rate: slow ? 0.6 : 1 });
	}

	type Scene = 'pick' | 'seats' | 'wait' | 'seat-type' | 'smoking' | 'menu' | 'order' | 'serve' | 'eat' | 'more' | 'pay' | 'done';

	let counters = $state<Counter[]>([]);
	let scene = $state<Scene>('pick');
	let rest = $state<Restaurant | null>(null);
	let errors = $state(0);
	let staffLine = $state('');
	let payLine = $state('');

	// coperti + preferenze
	let seats = $state(1);
	let seatsQuestion = $state('');
	let seatsPicked = $state<string | null>(null);
	let seatsChoices = $state<string[]>([]);
	let seatsCorrect = $state('');
	let wantWait = $state(false);
	let wantSmoking = $state(false);
	let seatType = $state<string | null>(null);
	let smokingPref = $state<string | null>(null);

	// ordine: cart = aggiunte del giro; ordered = tutto il confermato
	let cart = $state<Record<string, number>>({});
	let ordered = $state<{ dish: Dish; qty: number }[]>([]);
	let queue = $state<{ dish: Dish; qty: number }[]>([]);
	let orderIdx = $state(0);
	let orderChoices = $state<string[]>([]);
	let orderCorrect = $state('');
	let orderDisplay = $state<'kanji' | 'kana'>('kana');
	let picked = $state<string | null>(null);

	// pagamento
	let tendered = $state(0);
	let stack = $state<number[]>([]);
	let payChecked = $state(false);
	let payAttempts = $state(0);

	const KNUM = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
	const ALT_COUNTERS = ['個', '本', '杯', 'つ', '枚'];
	function kanjiNum(n: number): string {
		return n <= 10 ? KNUM[n]! : n === 20 ? '二十' : String(n);
	}
	function counterReading(counterId: string, q: number): string {
		const c = counters.find((x) => x.id === counterId);
		return (c && readCounterN(c, q)) || String(q);
	}
	function fmtQty(counterId: string, q: number, display: 'kanji' | 'kana'): string {
		return display === 'kanji' ? kanjiNum(q) + counterId : counterReading(counterId, q);
	}
	function orderedTotal(): number {
		return ordered.reduce((s, e) => s + e.dish.prezzo * e.qty, 0);
	}

	onMount(async () => {
		primeVoices();
		canSpeak = speechAvailable();
		counters = await db.counters.toArray();
	});

	// ── Ordina a voce (dove il browser lo supporta) ──
	let canSpeak = $state(false);
	let micState = $state<'idle' | 'listening'>('idle');
	let heard = $state('');
	async function speakOrder(): Promise<void> {
		if (micState !== 'idle' || picked !== null) return;
		micState = 'listening';
		heard = '';
		const alts = await listenJapanese();
		micState = 'idle';
		const e = queue[orderIdx]!;
		if (alts.length === 0) {
			heard = '（何も聞こえませんでした…riprova）';
			return;
		}
		heard = alts[0]!;
		// vale se dici il piatto (kanji o lettura) E la quantità (kanji/kana/cifre)
		const qtyVariants = [
			fmtQty(e.dish.counterId, e.qty, 'kanji'),
			counterReading(e.dish.counterId, e.qty),
			String(e.qty) + e.dish.counterId
		];
		if (speechMatches(alts, [[e.dish.nome, e.dish.lettura], qtyVariants])) {
			pickOrder(orderCorrect, true);
		} else {
			pickOrder('🎤');
		}
	}

	let showScript = $state(false);
	function start(): void {
		rest = null;
		errors = 0;
		dialog = [];
		showScript = false;
		cart = {};
		ordered = [];
		queue = [];
		orderIdx = 0;
		tendered = 0;
		stack = [];
		payChecked = false;
		payAttempts = 0;
		picked = null;
		seatsPicked = null;
		seatType = null;
		smokingPref = null;
		scene = 'pick';
	}

	function pickRest(r: Restaurant): void {
		rest = r;
		seatsQuestion = rnd(SEATS_Q);
		sequence([{ who: 'staff', text: rnd(GREET) }, { who: 'staff', text: seatsQuestion }]);
		seats = 1 + Math.floor(Math.random() * 4);
		seatsCorrect = counterReading('人', seats);
		const others = [1, 2, 3, 4].filter((n) => n !== seats).map((n) => counterReading('人', n));
		seatsChoices = shuffle([seatsCorrect, ...shuffle(others).slice(0, 3)]);
		seatsPicked = null;
		wantWait = Math.random() < 0.35;
		wantSmoking = Math.random() < 0.5;
		scene = 'seats';
	}

	function pickSeats(choice: string): void {
		if (seatsPicked !== null) return;
		seatsPicked = choice;
		if (choice !== seatsCorrect) {
			errors += 1;
			void recordPracticeMiss('counter:人');
		}
		staffLine = `${seatsCorrect}様ですね、` + rnd(OK);
		sequence([{ who: 'me', text: choice + 'です' }, { who: 'staff', text: staffLine }]);
	}
	function afterSeats(): void {
		if (wantWait) enterWait();
		else enterSeatType();
	}
	function enterWait(): void {
		scene = 'wait';
		staffLine = rnd(WAIT);
		staffSay(staffLine);
	}
	function enterSeatType(): void {
		scene = 'seat-type';
		staffLine = rnd(SEATTYPE_Q);
		staffSay(staffLine);
	}
	function pickSeatType(choice: string): void {
		if (seatType !== null) return;
		seatType = choice;
		sequence([{ who: 'me', text: choice + 'でおねがいします' }, { who: 'staff', text: rnd(OK) }]);
	}
	function afterSeatType(): void {
		if (wantSmoking) enterSmoking();
		else enterMenu();
	}
	function enterSmoking(): void {
		scene = 'smoking';
		staffLine = rnd(SMOKE_Q);
		staffSay(staffLine);
	}
	function pickSmoking(choice: string): void {
		if (smokingPref !== null) return;
		smokingPref = choice;
		sequence([{ who: 'me', text: choice + 'でおねがいします' }, { who: 'staff', text: 'こちらへどうぞ。' }]);
	}
	function enterMenu(): void {
		scene = 'menu';
		cart = {};
		staffSay(rnd(MENU_L));
	}

	// ── Menu ──
	function addDish(id: string): void {
		cart = { ...cart, [id]: (cart[id] ?? 0) + 1 };
	}
	function removeDish(id: string): void {
		if (!cart[id]) return;
		const n = cart[id]! - 1;
		const next = { ...cart };
		if (n <= 0) delete next[id]; else next[id] = n;
		cart = next;
	}
	function cartCount(): number {
		return Object.values(cart).reduce((a, b) => a + b, 0);
	}

	// ── Ordine ──
	function toOrder(): void {
		if (!rest || cartCount() === 0) return;
		queue = Object.entries(cart)
			.filter(([, n]) => n > 0)
			.map(([id, n]) => ({ dish: rest!.menu.find((d) => d.id === id)!, qty: n }));
		orderIdx = 0;
		scene = 'order';
		setOrderItem();
	}
	function setOrderItem(): void {
		const e = queue[orderIdx]!;
		const display: 'kanji' | 'kana' = Math.random() < 0.5 ? 'kanji' : 'kana';
		orderDisplay = display;
		const correct = fmtQty(e.dish.counterId, e.qty, display);
		const seen = new Set([correct]);
		const distractors: string[] = [];
		for (const cid of shuffle(ALT_COUNTERS.filter((x) => x !== e.dish.counterId))) {
			const d = fmtQty(cid, e.qty, display);
			if (!seen.has(d)) { seen.add(d); distractors.push(d); }
			if (distractors.length >= 2) break;
		}
		const q2 = e.qty > 1 ? e.qty - 1 : e.qty + 1;
		const dq = fmtQty(e.dish.counterId, q2, display);
		if (!seen.has(dq)) distractors.push(dq);
		orderCorrect = correct;
		orderChoices = shuffle([correct, ...distractors.slice(0, 3)]);
		picked = null;
	}
	function pickOrder(choice: string, viaVoce = false): void {
		if (picked !== null) return;
		picked = choice;
		const e = queue[orderIdx]!;
		if (choice === orderCorrect) {
			const frase = e.dish.nome + 'を' + counterReading(e.dish.counterId, e.qty) + 'ください';
			// l'hai già detta tu: niente eco del sintetizzatore, solo copione
			if (viaVoce) pushLine('me', frase);
			else mySay(frase);
		} else {
			errors += 1;
			void recordPracticeMiss('counter:' + e.dish.counterId);
			staffLine = rnd(NOT_UNDERSTOOD);
			staffSay(staffLine);
		}
	}
	function retryOrder(): void {
		heard = '';
		setOrderItem(); // rigenera le opzioni e riprova lo stesso piatto
	}
	function nextOrder(): void {
		if (orderIdx < queue.length - 1) {
			orderIdx += 1;
			setOrderItem();
			return;
		}
		// unisci il giro all'ordine confermato
		for (const e of queue) {
			const found = ordered.find((o) => o.dish.id === e.dish.id);
			if (found) found.qty += e.qty;
			else ordered = [...ordered, { dish: e.dish, qty: e.qty }];
		}
		enterServe();
	}

	function enterServe(): void {
		scene = 'serve';
		staffLine = rnd(SERVE);
		staffSay(staffLine);
	}
	function enterEat(): void {
		scene = 'eat';
		mySay('いただきます！');
		playClink();
	}
	function enterMore(): void {
		scene = 'more';
		staffLine = rnd(MORE_Q);
		staffSay(staffLine);
	}
	function pickMore(add: boolean): void {
		if (add) {
			cart = {};
			scene = 'menu';
			sequence([{ who: 'me', text: 'すみません、追加でおねがいします。' }, { who: 'staff', text: rnd(MENU_L) }]);
		} else {
			if (orderedTotal() === 0) { toDone(); return; }
			scene = 'pay';
			tendered = 0;
			stack = [];
			payChecked = false;
			payAttempts = 0;
			payLine = `お会計は${readNumber(orderedTotal())}えんです。`;
			sequence([{ who: 'me', text: 'これで大丈夫です。' }, { who: 'staff', text: payLine }]);
		}
	}

	// ── Pagamento ──
	function addDenom(d: number): void {
		if (payChecked) return;
		stack = [...stack, d];
		tendered += d;
	}
	function undo(): void {
		if (payChecked || stack.length === 0) return;
		tendered -= stack[stack.length - 1]!;
		stack = stack.slice(0, -1);
	}
	function resetTender(): void {
		if (payChecked) return;
		stack = [];
		tendered = 0;
	}
	function payNow(): void {
		if (tendered === 0) return;
		if (tendered === orderedTotal()) {
			payChecked = true;
			staffLine = rnd(THANKS);
			staffSay(staffLine);
		} else {
			payAttempts += 1;
			staffSay(`すみません、${readNumber(orderedTotal())}えんです。`);
			errors += 1;
			void recordPracticeMiss('counter:円');
			resetTender();
		}
	}
	function giveUp(): void {
		payChecked = true;
		staffLine = 'あ、お会計はこちらで大丈夫ですよ。ありがとうございました！';
		staffSay(staffLine);
	}
	function toDone(): void {
		mySay('ごちそうさまでした！');
		scene = 'done';
	}
</script>

{#snippet repeatBar(line: string)}
	<div class="repeat-bar">
		<button class="mini" onclick={() => askRepeat(false, line)}>🔁 もう一度</button>
		<button class="mini" onclick={() => askRepeat(true, line)}>🐢 ゆっくり</button>
	</div>
{/snippet}

<div class="rist">
	<div class="nav">
		<a class="back" href="{base}/avventure">← Avventure</a>
		{#if dialog.length > 0}
			<button class="script-toggle" onclick={() => (showScript = !showScript)}>📜 Copione ({dialog.length})</button>
		{/if}
	</div>
	{#if showScript}
		<ScriptLog lines={dialog} icons={{ staff: '🧑‍🍳' }} />
	{/if}

	{#if scene === 'pick'}
		<h1 class="page-title">🍽️ Dove mangiamo?</h1>
		<div class="rest-grid">
			{#each RESTAURANTS as r (r.id)}
				<button class="rest-card" onclick={() => pickRest(r)}>
					<span class="rest-icon">{r.emoji}</span>
					<span class="rest-name">{r.nome}<small>（{r.lettura}）</small></span>
					<span class="rest-it">{r.it}</span>
				</button>
			{/each}
		</div>
	{:else if scene === 'seats' && rest}
		<article class="scene">
			<p class="who">🧑‍🍳 {rest.nome}</p>
			<p class="bubble">いらっしゃいませ！{seatsQuestion}</p>
			{@render repeatBar(seatsQuestion)}
			<div class="people">{'🧑'.repeat(seats)}</div>
			<p class="hint">Siete in {seats}: come lo dici?</p>
			<div class="choices">
				{#each seatsChoices as c (c)}
					<button class="choice" class:right={seatsPicked !== null && c === seatsCorrect} class:wrong={seatsPicked === c && c !== seatsCorrect} disabled={seatsPicked !== null} onclick={() => pickSeats(c)}>{c}</button>
				{/each}
			</div>
			{#if seatsPicked !== null}
				<p class="bubble sm">🧑‍🍳「{staffLine}」</p>
				<button class="proceed" onclick={afterSeats}>→</button>
			{/if}
		</article>
	{:else if scene === 'wait'}
		<article class="scene">
			<p class="who">🧑‍🍳 Cameriere</p>
			{@render repeatBar(staffLine)}
			<p class="bubble big">{staffLine}</p>
			<p class="hint">È pieno: aspetta un attimo (満席)</p>
			<button class="proceed" onclick={enterSeatType}>待ちます →</button>
		</article>
	{:else if scene === 'seat-type'}
		<article class="scene">
			<p class="who">🧑‍🍳 Cameriere</p>
			{@render repeatBar(staffLine)}
			<p class="bubble">{staffLine}</p>
			<p class="hint">Quale posto preferisci?</p>
			<div class="choices">
				<button class="choice" class:right={seatType === 'カウンター席'} disabled={seatType !== null} onclick={() => pickSeatType('カウンター席')}>🍶 カウンター席</button>
				<button class="choice" class:right={seatType === 'テーブル席'} disabled={seatType !== null} onclick={() => pickSeatType('テーブル席')}>🪑 テーブル席</button>
			</div>
			{#if seatType !== null}
				<button class="proceed" onclick={afterSeatType}>→</button>
			{/if}
		</article>
	{:else if scene === 'smoking'}
		<article class="scene">
			<p class="who">🧑‍🍳 Cameriere</p>
			{@render repeatBar(staffLine)}
			<p class="bubble">{staffLine}</p>
			<p class="hint">Fumatori o no?</p>
			<div class="choices">
				<button class="choice" class:right={smokingPref === '禁煙席'} disabled={smokingPref !== null} onclick={() => pickSmoking('禁煙席')}>🚭 禁煙席</button>
				<button class="choice" class:right={smokingPref === '喫煙席'} disabled={smokingPref !== null} onclick={() => pickSmoking('喫煙席')}>🚬 喫煙席</button>
			</div>
			{#if smokingPref !== null}
				<button class="proceed" onclick={enterMenu}>→</button>
			{/if}
		</article>
	{:else if scene === 'menu' && rest}
		<article class="scene">
			<p class="who">📋 Menu — {rest.nome}</p>
			<ul class="menu">
				{#each rest.menu as d (d.id)}
					{@const have = cart[d.id] ?? 0}
					<li>
						<span class="d-emoji">{d.emoji}</span>
						<span class="d-name">{d.nome}<small>（{d.lettura}）</small></span>
						<span class="d-price">{d.prezzo === 0 ? '無料' : `¥${d.prezzo}`}</span>
						<span class="d-ctrl">
							<button class="step" onclick={() => removeDish(d.id)} disabled={have === 0}>−</button>
							<span class="d-have">{have}</span>
							<button class="step" onclick={() => addDish(d.id)}>+</button>
						</span>
					</li>
				{/each}
			</ul>
			<button class="proceed" onclick={toOrder} disabled={cartCount() === 0}>Ordina ({cartCount()}) →</button>
		</article>
	{:else if scene === 'order' && rest}
		<article class="scene">
			<p class="who">🧑‍🍳 Ordina al cameriere</p>
			<div class="order-ref">
				{#each queue as e, i}
					<span class="ref-item" class:current={i === orderIdx}>{e.dish.emoji}×{e.qty}</span>
				{/each}
			</div>
			<p class="prompt">{queue[orderIdx].dish.emoji} {queue[orderIdx].dish.nome}</p>
			<p class="hint">「{queue[orderIdx].dish.nome}を ___ ください」 · {orderDisplay === 'kanji' ? 'in kanji' : 'in lettura'}</p>
			{#if canSpeak}
				<button class="mic" class:listening={micState === 'listening'} disabled={picked !== null} onclick={speakOrder}>
					{micState === 'listening' ? '🎙️ Ti ascolto… parla!' : '🎤 Dillo a voce'}
				</button>
				{#if heard}
					<p class="heard">Ho sentito: 「{heard}」</p>
				{/if}
			{/if}
			<div class="choices">
				{#each orderChoices as c (c)}
					<button class="choice" class:right={picked !== null && c === orderCorrect} class:wrong={picked === c && c !== orderCorrect} disabled={picked !== null} onclick={() => pickOrder(c)}>{c}</button>
				{/each}
			</div>
			{#if picked !== null && picked === orderCorrect}
				<button class="proceed" onclick={nextOrder}>{orderIdx < queue.length - 1 ? 'Prossimo →' : 'OK, ordinato →'}</button>
			{:else if picked !== null}
				<p class="bubble sm">🧑‍🍳「{staffLine}」</p>
				<button class="proceed" onclick={retryOrder}>もう一度 →</button>
			{/if}
		</article>
	{:else if scene === 'serve'}
		<article class="scene">
			<p class="who">🧑‍🍳 Il cameriere porta i piatti</p>
			{@render repeatBar(staffLine)}
			<p class="bubble">{staffLine}</p>
			<p class="dishes">{ordered.map((e) => e.dish.emoji.repeat(e.qty)).join(' ')}</p>
			<button class="proceed" onclick={enterEat}>いただきます →</button>
		</article>
	{:else if scene === 'eat'}
		<article class="scene">
			<p class="who">🍚 Buon appetito!</p>
			<p class="prompt">いただきます</p>
			<p class="dishes eating">{ordered.map((e) => e.dish.emoji.repeat(e.qty)).join(' ')}</p>
			<div class="eat-actions">
				<button class="replay" onclick={playClink}>🍴 *tin tin*</button>
				<button class="proceed" onclick={enterMore}>Finito di mangiare →</button>
			</div>
		</article>
	{:else if scene === 'more'}
		<article class="scene">
			<p class="who">🧑‍🍳 Cameriere</p>
			{@render repeatBar(staffLine)}
			<p class="bubble">{staffLine}</p>
			<div class="choices">
				<button class="choice" onclick={() => pickMore(true)}>➕ 追加します</button>
				<button class="choice" onclick={() => pickMore(false)}>✅ これで大丈夫です</button>
			</div>
		</article>
	{:else if scene === 'pay'}
		<article class="scene">
			<p class="who">💴 Il conto</p>
			{@render repeatBar(payLine)}
			<div class="till"><span class="till-label">Stai porgendo</span><span class="till-amount">¥{tendered.toLocaleString('en-US')}</span></div>
			<div class="denoms">
				{#each YEN_DENOMINATIONS as d}
					<button class="denom" class:coin={d < 1000} disabled={payChecked} onclick={() => addDenom(d)}>¥{d.toLocaleString('en-US')}</button>
				{/each}
			</div>
			{#if !payChecked}
				<div class="till-actions">
					<button class="mini" onclick={undo} disabled={stack.length === 0}>↩︎ Annulla</button>
					<button class="mini" onclick={resetTender} disabled={tendered === 0}>↺ Svuota</button>
					<button class="proceed" onclick={payNow} disabled={tendered === 0}>💴 Paga</button>
				</div>
				{#if payAttempts >= 3}
					<button class="giveup" onclick={giveUp}>🏳️ Mi arrendo (pago e basta)</button>
				{/if}
			{:else}
				<p class="bubble">🧑‍🍳「{staffLine}」</p>
				<button class="proceed" onclick={toDone}>ごちそうさま →</button>
			{/if}
		</article>
	{:else if scene === 'done'}
		<article class="scene">
			<p class="who">{errors === 0 ? '🎉 Perfetto!' : '📝 Fine pasto'}</p>
			<p class="bubble">🙂「ごちそうさまでした！」</p>
			<p class="hint">Totale: ¥{orderedTotal()} · {errors === 0 ? 'nessun errore!' : `errori: ${errors}`}</p>
			<ScriptLog lines={dialog} icons={{ staff: '🧑‍🍳' }} title="📜 Il dialogo di oggi" />
			<button class="proceed" onclick={start}>🔁 Un altro giro</button>
		</article>
	{/if}
</div>

<style>
	.rist { display: grid; gap: 14px; }
	.nav { margin-bottom: 2px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
	.script-toggle { background: var(--surface-2); border: 1px solid var(--line); border-radius: 999px; padding: 5px 12px; font-size: 0.8rem; cursor: pointer; color: var(--ink); }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.page-title { margin: 0; font-size: 1.3rem; }

	.rest-grid { display: grid; gap: 10px; }
	.rest-card { display: grid; grid-template-columns: auto 1fr; grid-template-rows: auto auto; column-gap: 12px; align-items: center; text-align: left; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 14px; cursor: pointer; }
	.rest-card:hover { border-color: var(--brand); }
	.rest-icon { grid-row: 1 / 3; font-size: 2.4rem; }
	.rest-name { font-weight: 700; font-size: 1.05rem; }
	.rest-name small { color: var(--muted); font-weight: 400; font-size: 0.72rem; }
	.rest-it { grid-column: 2; font-size: 0.8rem; color: var(--muted); }

	.scene { background: var(--surface); border-radius: 16px; padding: 20px; box-shadow: 0 2px 10px rgba(14,29,51,0.07); display: grid; gap: 14px; }
	.who { margin: 0; font-size: 0.9rem; font-weight: 700; }
	.hint { margin: 0; text-align: center; font-size: 0.82rem; color: var(--muted); }
	.bubble { margin: 0; text-align: center; font-size: 1.1rem; font-weight: 600; background: var(--surface-2); border-radius: 12px; padding: 12px; }
	.bubble.big { font-size: 1.2rem; }
	.bubble.sm { font-size: 0.95rem; }
	.prompt { margin: 0; text-align: center; font-size: 1.6rem; font-weight: 800; }
	.dishes { margin: 0; text-align: center; font-size: 2rem; line-height: 1.4; overflow-wrap: anywhere; }
	.dishes.eating { animation: bob 0.8s ease-in-out infinite; }
	@keyframes bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
	.replay { justify-self: center; background: var(--surface-2); border: 1px solid var(--line); border-radius: 999px; padding: 8px 18px; font-size: 1rem; cursor: pointer; color: var(--ink); }
	.repeat-bar { display: flex; gap: 8px; justify-content: center; }
	.mic { justify-self: center; padding: 10px 20px; border-radius: 999px; border: 1.5px solid var(--brand); background: var(--surface); color: var(--brand); font-weight: 700; font-size: 0.95rem; cursor: pointer; }
	.mic.listening { background: rgba(239,107,107,0.12); border-color: var(--danger); color: var(--danger); animation: micpulse 1s ease-in-out infinite; }
	.mic:disabled { opacity: 0.5; cursor: default; }
	@keyframes micpulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
	.heard { margin: 0; text-align: center; font-size: 0.85rem; color: var(--muted); }
	.people { text-align: center; font-size: 2rem; }
	.eat-actions { display: flex; gap: 8px; justify-content: center; align-items: center; }

	.menu { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
	.menu li { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface-2); }
	.d-emoji { font-size: 1.4rem; }
	.d-name { flex: 1; font-weight: 600; }
	.d-name small { color: var(--muted); font-weight: 400; font-size: 0.72rem; }
	.d-price { font-weight: 700; }
	.d-ctrl { display: inline-flex; align-items: center; gap: 8px; }
	.step { width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--line); background: var(--surface); font-size: 1.1rem; cursor: pointer; }
	.step:disabled { opacity: 0.4; cursor: default; }
	.d-have { min-width: 16px; text-align: center; font-weight: 700; }

	.order-ref { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
	.ref-item { font-size: 1rem; padding: 4px 10px; border: 1px solid var(--line); border-radius: 999px; background: var(--surface-2); opacity: 0.55; }
	.ref-item.current { opacity: 1; border-color: var(--brand); font-weight: 700; }

	.choices { display: grid; gap: 8px; }
	.choice { padding: 12px 14px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface-2); color: var(--ink); font-size: 1.2rem; text-align: center; cursor: pointer; display: flex; flex-direction: column; gap: 2px; }
	.choice:hover:not(:disabled) { border-color: var(--brand); }
	.choice:disabled { cursor: default; }
	.choice.right { border-color: var(--success); background: rgba(52,201,138,0.16); }
	.choice.wrong { border-color: var(--danger); background: rgba(239,107,107,0.16); }

	.till { display: grid; gap: 2px; justify-items: center; }
	.till-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
	.till-amount { font-size: 2.2rem; font-weight: 800; }
	.denoms { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
	.denom { padding: 12px 6px; border-radius: 10px; border: 1.5px solid var(--gold-border); background: var(--gold-bg); color: var(--gold-ink); font-weight: 700; font-size: 1rem; cursor: pointer; }
	.denom.coin { border-color: var(--line); background: var(--surface-2); color: var(--ink); }
	.denom:disabled { opacity: 0.5; cursor: default; }
	.till-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; align-items: center; }
	.mini { padding: 8px 12px; border-radius: 8px; border: 1px solid var(--line); background: var(--surface-2); color: var(--muted); font-size: 0.82rem; cursor: pointer; }
	.mini:disabled { opacity: 0.4; cursor: default; }


	.proceed { justify-self: center; padding: 10px 22px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 600; cursor: pointer; }
	.proceed:disabled { opacity: 0.5; cursor: default; }
	.giveup { justify-self: center; padding: 8px 16px; border-radius: 8px; border: 1px solid var(--line); background: transparent; color: var(--muted); font-size: 0.85rem; cursor: pointer; }
</style>
