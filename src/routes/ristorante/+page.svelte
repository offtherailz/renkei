<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { db } from '$lib/db/schema';
	import type { Counter } from '$lib/types/models';
	import { RESTAURANTS, type Restaurant, type Dish } from '$lib/core/restaurants';
	import { readCounterN } from '$lib/core/counterReadings';
	import { readNumber, YEN_DENOMINATIONS } from '$lib/core/counterGen';
	import { speakSentenceJapanese } from '$lib/core/tts';
	import { voiceParams, primeVoices, opposite, type Gender } from '$lib/core/voices';
	import { appState } from '$lib/stores.svelte';

	function userGender(): Gender {
		return appState.settings.voce_utente ?? 'femminile';
	}
	function say(text: string, g: Gender): void {
		speakSentenceJapanese(text, voiceParams(g));
	}
	function speakUser(text: string): void {
		say(text, userGender());
	}
	function staff(): Gender {
		return opposite(userGender());
	}

	type Scene = 'pick' | 'seats' | 'menu' | 'order' | 'pay' | 'done';

	let counters = $state<Counter[]>([]);
	let scene = $state<Scene>('pick');
	let rest = $state<Restaurant | null>(null);
	let errors = $state(0);

	// coperti
	let seats = $state(1);
	let seatsPicked = $state<string | null>(null);
	let seatsChoices = $state<string[]>([]);
	let seatsCorrect = $state('');

	// ordine (carrello libero dal menu)
	let cart = $state<Record<string, number>>({});
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

	const KNUM = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
	const ALT_COUNTERS = ['個', '本', '杯', 'つ', '枚'];
	function kanjiNum(n: number): string {
		return n <= 10 ? KNUM[n]! : n === 20 ? '二十' : String(n);
	}
	function shuffle<T>(xs: T[]): T[] {
		const a = [...xs];
		for (let i = a.length - 1; i > 0; i -= 1) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j]!, a[i]!];
		}
		return a;
	}
	function counterReading(counterId: string, q: number): string {
		const c = counters.find((x) => x.id === counterId);
		return (c && readCounterN(c, q)) || String(q);
	}
	function fmtQty(counterId: string, q: number, display: 'kanji' | 'kana'): string {
		return display === 'kanji' ? kanjiNum(q) + counterId : counterReading(counterId, q);
	}
	function cartTotal(): number {
		return queue.reduce((s, e) => s + e.dish.prezzo * e.qty, 0);
	}

	onMount(async () => {
		primeVoices();
		counters = await db.counters.toArray();
	});

	function start(): void {
		rest = null;
		errors = 0;
		cart = {};
		queue = [];
		orderIdx = 0;
		tendered = 0;
		stack = [];
		payChecked = false;
		picked = null;
		seatsPicked = null;
		scene = 'pick';
	}

	function pickRest(r: Restaurant): void {
		rest = r;
		say('いらっしゃいませ！', staff());
		// coperti: 1-4 persone
		seats = 1 + Math.floor(Math.random() * 4);
		seatsCorrect = counterReading('人', seats);
		const others = [1, 2, 3, 4].filter((n) => n !== seats).map((n) => counterReading('人', n));
		seatsChoices = shuffle([seatsCorrect, ...shuffle(others).slice(0, 3)]);
		seatsPicked = null;
		scene = 'seats';
	}

	function pickSeats(choice: string): void {
		if (seatsPicked !== null) return;
		seatsPicked = choice;
		if (choice !== seatsCorrect) { errors += 1; }
		else speakUser(choice + 'です');
	}
	function toMenu(): void {
		scene = 'menu';
	}

	// ── Menu: scegli liberamente cosa ordinare ──
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

	// ── Ordine: per ogni piatto scelto, componi numero+contatore ──
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
	function pickOrder(choice: string): void {
		if (picked !== null) return;
		picked = choice;
		const e = queue[orderIdx]!;
		if (choice === orderCorrect) speakUser(e.dish.nome + 'を' + counterReading(e.dish.counterId, e.qty) + 'ください');
		else errors += 1;
	}
	function nextOrder(): void {
		if (orderIdx < queue.length - 1) {
			orderIdx += 1;
			setOrderItem();
		} else {
			scene = 'pay';
			tendered = 0;
			stack = [];
			payChecked = false;
			say(`おあいそは${readNumber(cartTotal())}えんです`, staff());
		}
	}

	// ── Pagamento (esatto) ──
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
		if (tendered === cartTotal()) {
			payChecked = true;
			say('ありがとうございました！', staff());
		} else {
			say(`すみません、${readNumber(cartTotal())}えんです。`, staff());
			errors += 1;
			resetTender();
		}
	}
	function toDone(): void {
		speakUser('ごちそうさまでした！');
		scene = 'done';
	}
</script>

<div class="rist">
	<div class="nav"><a class="back" href="{base}/avventure">← Avventure</a></div>

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
			<p class="bubble">いらっしゃいませ！何名様ですか？</p>
			<div class="seats-people">{'🧑'.repeat(seats)}</div>
			<p class="hint">Siete in {seats}: come lo dici?</p>
			<div class="choices">
				{#each seatsChoices as c (c)}
					<button class="choice" class:right={seatsPicked !== null && c === seatsCorrect} class:wrong={seatsPicked === c && c !== seatsCorrect} disabled={seatsPicked !== null} onclick={() => pickSeats(c)}>{c}</button>
				{/each}
			</div>
			{#if seatsPicked !== null}
				<button class="proceed" onclick={toMenu}>Al tavolo → guarda il menu</button>
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
						<span class="d-price">¥{d.prezzo}</span>
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
			<div class="choices">
				{#each orderChoices as c (c)}
					<button class="choice" class:right={picked !== null && c === orderCorrect} class:wrong={picked === c && c !== orderCorrect} disabled={picked !== null} onclick={() => pickOrder(c)}>{c}</button>
				{/each}
			</div>
			{#if picked !== null}
				<button class="proceed" onclick={nextOrder}>{orderIdx < queue.length - 1 ? 'Prossimo →' : 'Il conto →'}</button>
			{/if}
		</article>
	{:else if scene === 'pay' && rest}
		<article class="scene">
			<p class="who">💴 Il conto</p>
			<button class="replay" onclick={() => say(`おあいそは${readNumber(cartTotal())}えんです`, staff())}>🔊 Riascolta il totale</button>
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
			{:else}
				<p class="bubble">🧑‍🍳「ありがとうございました！」</p>
				<button class="proceed" onclick={toDone}>ごちそうさま →</button>
			{/if}
		</article>
	{:else if scene === 'done' && rest}
		<article class="scene">
			<p class="who">{errors === 0 ? '🎉 Perfetto!' : '📝 Fine pasto'}</p>
			<ul class="menu">
				{#each queue as e (e.dish.id)}
					<li><span class="d-emoji">{e.dish.emoji}</span> <span class="d-name">{e.dish.nome}</span> <span class="d-price">×{e.qty}</span></li>
				{/each}
			</ul>
			<p class="hint">Totale: ¥{cartTotal()} · {errors === 0 ? 'nessun errore!' : `errori: ${errors}`}</p>
			<button class="proceed" onclick={start}>🔁 Un altro giro</button>
		</article>
	{/if}
</div>

<style>
	.rist { display: grid; gap: 14px; }
	.nav { margin-bottom: 2px; }
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
	.prompt { margin: 0; text-align: center; font-size: 1.6rem; font-weight: 800; }
	.replay { justify-self: center; background: var(--surface-2); border: 1px solid var(--line); border-radius: 999px; padding: 8px 18px; font-size: 1rem; cursor: pointer; color: var(--ink); }
	.seats-people { text-align: center; font-size: 2rem; }

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
	.choice { padding: 12px 14px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface-2); color: var(--ink); font-size: 1.2rem; text-align: center; cursor: pointer; }
	.choice:hover:not(:disabled) { border-color: var(--brand); }
	.choice:disabled { cursor: default; }
	.choice.right { border-color: var(--success, #16a34a); background: rgba(52,201,138,0.16); }
	.choice.wrong { border-color: var(--danger, #dc2626); background: rgba(239,107,107,0.16); }

	.till { display: grid; gap: 2px; justify-items: center; }
	.till-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
	.till-amount { font-size: 2.2rem; font-weight: 800; }
	.denoms { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
	.denom { padding: 12px 6px; border-radius: 10px; border: 1.5px solid #c6a15b; background: #fdf3d8; color: #6b4e12; font-weight: 700; font-size: 1rem; cursor: pointer; }
	.denom.coin { border-color: var(--line); background: var(--surface-2); color: var(--ink); }
	.denom:disabled { opacity: 0.5; cursor: default; }
	.till-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; align-items: center; }
	.mini { padding: 8px 12px; border-radius: 8px; border: 1px solid var(--line); background: var(--surface-2); color: var(--muted); font-size: 0.82rem; cursor: pointer; }
	.mini:disabled { opacity: 0.4; cursor: default; }

	.proceed { justify-self: center; padding: 10px 22px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 600; cursor: pointer; }
	.proceed:disabled { opacity: 0.5; cursor: default; }
</style>
