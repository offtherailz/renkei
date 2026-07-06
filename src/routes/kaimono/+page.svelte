<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { db } from '$lib/db/schema';
	import type { Counter } from '$lib/types/models';
	import { SHOP_ITEMS, generateShoppingList, type ShopItem, type ShoppingRequest } from '$lib/core/shopItems';
	import { readCounterN } from '$lib/core/counterReadings';
	import { readNumber, YEN_DENOMINATIONS } from '$lib/core/counterGen';
	import { speakSentenceJapanese, speakSentenceJapaneseAsync, speakSequence } from '$lib/core/tts';
	import { voiceParams, primeVoices, opposite, type Gender } from '$lib/core/voices';
	import { appState } from '$lib/stores.svelte';

	const rnd = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)]!;
	const REPEAT_REQ = ['すみません、もう一度おねがいします。', 'もう一度いいですか？', 'すみません、もう一度よろしいですか？'];
	const SLOWER_REQ = ['すみません、もう少しゆっくりおねがいします。', 'もう少しゆっくり話していただけますか？', 'ゆっくりおねがいします。'];

	// ── Voci: kanojo = femminile, commesso = opposto a te, tu = voce impostazioni ──
	function userGender(): Gender {
		return appState.settings.voce_utente ?? 'femminile';
	}
	function say(text: string, g: Gender): void {
		speakSentenceJapanese(text, voiceParams(g));
	}
	function speakUser(text: string): void {
		say(text, userGender());
	}
	const KANOJO: Gender = 'femminile';
	function clerk(): Gender {
		return opposite(userGender());
	}
	// Più battute di fila senza annullarsi.
	function sequence(lines: { g: Gender; text: string }[]): void {
		speakSequence(lines.map((l) => ({ text: l.text, options: voiceParams(l.g) })));
	}
	// もう一度 / ゆっくり: dici la richiesta, poi risenti la frase (più piano se slow).
	async function askRepeat(slow: boolean, line: string, g: Gender): Promise<void> {
		await speakSentenceJapaneseAsync(slow ? rnd(SLOWER_REQ) : rnd(REPEAT_REQ), voiceParams(userGender()));
		speakSentenceJapanese(line, { ...voiceParams(g), rate: slow ? 0.6 : 1 });
	}

	type Scene = 'intro' | 'depart' | 'call' | 'order' | 'pay' | 'return' | 'done';

	let counters = $state<Counter[]>([]);
	let scene = $state<Scene>('intro');
	let list = $state<ShoppingRequest[]>([]);
	let errors = $state(0);
	let missed = $state<string[]>([]);

	// scena iniziale: mini お使い (ascolta e riempi il carrello)
	let gridItems = $state<ShopItem[]>([]);
	let cart = $state<Record<string, number>>({});
	let introDone = $state(false);

	// telefonata
	let callText = $state('');

	// ordine
	let orderIdx = $state(0);
	let orderChoices = $state<string[]>([]);
	let orderCorrect = $state('');
	let orderDisplay = $state<'kanji' | 'kana'>('kana');
	let picked = $state<string | null>(null);

	// pagamento
	let tendered = $state(0);
	let stack = $state<number[]>([]);
	let payChecked = $state(false);
	let payOk = $state(false);

	// saluti (scelta)
	let greetPicked = $state<string | null>(null);

	const KNUM = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
	const ALT_COUNTERS = ['個', '本', '枚', 'つ', '匹', '杯', '冊', '台'];
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
	function itemReading(item: ShopItem, qty: number): string {
		const c = counters.find((x) => x.id === item.counterId);
		return (c && readCounterN(c, qty)) || String(qty);
	}
	function fmtQty(counterId: string, q: number, display: 'kanji' | 'kana'): string {
		if (display === 'kanji') return kanjiNum(q) + counterId;
		const c = counters.find((x) => x.id === counterId);
		return (c && readCounterN(c, q)) || String(q);
	}
	function total(): number {
		return list.reduce((s, r) => s + r.item.prezzo * r.qty, 0);
	}
	function listPhrase(): string {
		return list.map((r) => r.item.scrittura + 'を' + itemReading(r.item, r.qty)).join('、');
	}

	onMount(async () => {
		primeVoices();
		counters = await db.counters.toArray();
		start();
	});

	function start(): void {
		const g = generateShoppingList(2 + Math.floor(Math.random() * 2), 3);
		list = g.list;
		gridItems = g.grid;
		cart = {};
		introDone = false;
		errors = 0;
		missed = [];
		callText = '';
		orderIdx = 0;
		tendered = 0;
		stack = [];
		payChecked = false;
		payOk = false;
		picked = null;
		greetPicked = null;
		scene = 'intro';
	}

	// ── Scena iniziale: お使い (ascolta la lista, riempi il carrello) ──
	function addToCart(id: string): void {
		if (introDone) return;
		const q = (cart[id] ?? 0) + 1;
		cart = { ...cart, [id]: q };
		const it = gridItems.find((x) => x.id === id);
		if (it) speakUser(itemReading(it, q));
	}
	function removeFromCart(id: string): void {
		if (introDone || !cart[id]) return;
		const n = cart[id]! - 1;
		const next = { ...cart };
		if (n <= 0) delete next[id]; else next[id] = n;
		cart = next;
	}
	function resetCart(): void {
		if (introDone) return;
		cart = {};
	}
	function deliverIntro(): void {
		if (introDone) return;
		introDone = true;
		const ok = list.every((r) => (cart[r.item.id] ?? 0) === r.qty) &&
			Object.entries(cart).every(([id, n]) => n === 0 || list.some((r) => r.item.id === id));
		if (!ok) { errors += 1; missed.push('spesa'); }
		say(ok ? 'ありがとう、じゃあおねがいね！' : 'えっと…まあいいや、おねがいね！', KANOJO);
	}

	// intro → esci di casa
	function toDepart(): void {
		scene = 'depart';
		greetPicked = null;
	}

	const DEPART_CHOICES = ['いってきます', 'ただいま', 'おかえり', 'おやすみ'];
	function pickDepart(choice: string): void {
		if (greetPicked !== null) return;
		greetPicked = choice;
		if (choice !== 'いってきます') { errors += 1; missed.push('partenza'); }
		sequence([{ g: userGender(), text: choice }, { g: KANOJO, text: 'いってらっしゃい！' }]);
	}
	function afterDepart(): void {
		// ~55% una telefonata a sorpresa modifica la lista
		if (Math.random() < 0.55) {
			makeCall();
			scene = 'call';
		} else {
			startOrder();
		}
	}

	function makeCall(): void {
		const roll = Math.random();
		if (roll < 0.4 && SHOP_ITEMS.some((x) => !list.find((r) => r.item.id === x.id))) {
			// aggiungi un prodotto
			const extra = shuffle(SHOP_ITEMS.filter((x) => !list.find((r) => r.item.id === x.id)))[0]!;
			const qty = 1 + Math.floor(Math.random() * 3);
			list = [...list, { item: extra, qty }];
			callText = `あ、ごめん！${extra.scrittura}も${itemReading(extra, qty)}おねがい！`;
		} else if (roll < 0.7 && list.length > 1) {
			// togli un prodotto
			const idx = Math.floor(Math.random() * list.length);
			const removed = list[idx]!;
			list = list.filter((_, i) => i !== idx);
			callText = `やっぱり${removed.item.scrittura}はいらないや、ごめんね！`;
		} else {
			// cambia quantità
			const idx = Math.floor(Math.random() * list.length);
			const r = list[idx]!;
			const nq = r.qty === 1 ? 2 : r.qty - 1;
			list = list.map((x, i) => (i === idx ? { ...x, qty: nq } : x));
			callText = `${r.item.scrittura}、やっぱり${itemReading(r.item, nq)}にして！`;
		}
		say(callText, KANOJO);
	}
	function afterCall(): void {
		startOrder();
	}

	// ── Ordine al konbini ──
	function startOrder(): void {
		orderIdx = 0;
		scene = 'order';
		setOrderItem();
	}
	function setOrderItem(): void {
		const r = list[orderIdx]!;
		const display: 'kanji' | 'kana' = Math.random() < 0.5 ? 'kanji' : 'kana';
		orderDisplay = display;
		const correct = fmtQty(r.item.counterId, r.qty, display);
		const seen = new Set([correct]);
		const distractors: string[] = [];
		for (const cid of shuffle(ALT_COUNTERS.filter((x) => x !== r.item.counterId))) {
			const d = fmtQty(cid, r.qty, display);
			if (!seen.has(d)) { seen.add(d); distractors.push(d); }
			if (distractors.length >= 2) break;
		}
		const q2 = r.qty > 1 ? r.qty - 1 : r.qty + 1;
		const dq = fmtQty(r.item.counterId, q2, display);
		if (!seen.has(dq)) distractors.push(dq);
		orderCorrect = correct;
		orderChoices = shuffle([correct, ...distractors.slice(0, 3)]);
		picked = null;
	}
	function pickOrder(choice: string): void {
		if (picked !== null) return;
		picked = choice;
		const r = list[orderIdx]!;
		if (choice === orderCorrect) {
			say(r.item.scrittura + 'を' + itemReading(r.item, r.qty) + 'ください', userGender());
		} else {
			errors += 1;
			missed.push(r.item.scrittura);
		}
	}
	function nextOrder(): void {
		if (orderIdx < list.length - 1) {
			orderIdx += 1;
			setOrderItem();
		} else {
			scene = 'pay';
			tendered = 0;
			stack = [];
			payChecked = false;
			say(`ぜんぶで${readNumber(total())}えんです`, clerk());
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
		payOk = tendered === total();
		if (payOk) {
			payChecked = true;
			say('ちょうどいただきます。ありがとうございました！', clerk());
		} else {
			// non blocca: fai riprovare
			say(`すみません、${readNumber(total())}えんちょうどおねがいします。`, clerk());
			errors += 1;
			resetTender();
		}
	}
	function toReturn(): void {
		scene = 'return';
		greetPicked = null;
	}

	// ── Rientro ──
	const RETURN_CHOICES = ['ただいま', 'いってきます', 'いってらっしゃい', 'おやすみ'];
	function pickReturn(choice: string): void {
		if (greetPicked !== null) return;
		greetPicked = choice;
		if (choice !== 'ただいま') { errors += 1; missed.push('rientro'); }
		const reply = errors === 0
			? 'おかえりなさい！ぜんぶあってるよ、ありがとう！'
			: 'おかえりなさい！んー、ちょっとちがうかも…';
		sequence([{ g: userGender(), text: choice }, { g: KANOJO, text: reply }]);
	}
	function toDone(): void {
		scene = 'done';
	}
</script>

{#snippet repeatBar(line: string, g: Gender)}
	<div class="repeat-bar">
		<button class="mini" onclick={() => askRepeat(false, line, g)}>🔁 もう一度</button>
		<button class="mini" onclick={() => askRepeat(true, line, g)}>🐢 ゆっくり</button>
	</div>
{/snippet}

<div class="konbini">
	<div class="nav"><a class="back" href="{base}/avventure">← Avventure</a></div>

	{#if scene === 'intro'}
		<article class="scene">
			<p class="who">🧑‍🦰 la kanojo</p>
			<p class="bubble">ねえ、お使いおねがい！よく聞いてね。</p>
			{@render repeatBar(listPhrase() + '、おねがいね！', KANOJO)}
			{#if !introDone}
				<div class="shelf">
					{#each gridItems as item (item.id)}
						{@const have = cart[item.id] ?? 0}
						<button class="product" class:in-cart={have > 0} onclick={() => addToCart(item.id)} oncontextmenu={(e) => { e.preventDefault(); removeFromCart(item.id); }}>
							<span class="prod-emoji">{item.emoji}</span>
							{#if have > 0}<span class="prod-badge">{have}</span>{/if}
						</button>
					{/each}
				</div>
				<p class="hint">Ascolta e riempi il carrello · tocca = +1, a lungo/click destro = −1</p>
				<div class="till-actions">
					<button class="mini" onclick={resetCart} disabled={Object.keys(cart).length === 0}>↺ Svuota</button>
					<button class="proceed" onclick={deliverIntro}>🧺 Ho preso tutto</button>
				</div>
			{:else}
				<ul class="shop-list">
					{#each list as r (r.item.id)}
						{@const have = cart[r.item.id] ?? 0}
						<li><span class="li-emoji">{r.item.emoji}</span> <span class="li-name">{r.item.scrittura}</span> <span class="li-qty">{r.qty}{r.item.counterId}</span> <span class="li-mark">{have === r.qty ? '✓' : '✗'}</span></li>
					{/each}
				</ul>
				<button class="proceed" onclick={toDepart}>Esci di casa →</button>
			{/if}
		</article>
	{:else if scene === 'depart'}
		<article class="scene">
			<p class="who">🚪 Stai uscendo di casa</p>
			<p class="hint">Cosa dici?</p>
			<div class="choices">
				{#each DEPART_CHOICES as c (c)}
					<button class="choice" class:right={greetPicked !== null && c === 'いってきます'} class:wrong={greetPicked === c && c !== 'いってきます'} disabled={greetPicked !== null} onclick={() => pickDepart(c)}>{c}</button>
				{/each}
			</div>
			{#if greetPicked !== null}
				<p class="bubble">🧑‍🦰「いってらっしゃい！」</p>
				<button class="proceed" onclick={afterDepart}>Vai al konbini →</button>
			{/if}
		</article>
	{:else if scene === 'call'}
		<article class="scene">
			<p class="who">📞 Ti chiama la kanojo!</p>
			{@render repeatBar(callText, KANOJO)}
			<p class="bubble big">{callText}</p>
			<p class="hint">Niente conferma: ricordatelo!</p>
			<button class="proceed" onclick={afterCall}>わかった！ →</button>
		</article>
	{:else if scene === 'order'}
		<article class="scene">
			<p class="who">🏪 Al konbini — ordina</p>
			<div class="order-ref">
				{#each list as r, i}
					<span class="ref-item" class:current={i === orderIdx}>{r.item.emoji}×{r.qty}</span>
				{/each}
			</div>
			<p class="prompt">{list[orderIdx].item.emoji} {list[orderIdx].item.scrittura}</p>
			<p class="hint">「{list[orderIdx].item.scrittura}を ___ ください」 · {orderDisplay === 'kanji' ? 'in kanji' : 'in lettura'}</p>
			<div class="choices">
				{#each orderChoices as c (c)}
					<button class="choice" class:right={picked !== null && c === orderCorrect} class:wrong={picked === c && c !== orderCorrect} disabled={picked !== null} onclick={() => pickOrder(c)}>{c}</button>
				{/each}
			</div>
			{#if picked !== null}
				<button class="proceed" onclick={nextOrder}>{orderIdx < list.length - 1 ? 'Prossimo →' : 'Alla cassa →'}</button>
			{/if}
		</article>
	{:else if scene === 'pay'}
		<article class="scene">
			<p class="who">💴 Alla cassa</p>
			{@render repeatBar(`ぜんぶで${readNumber(total())}えんです`, clerk())}
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
				<p class="bubble">🧑‍🍳「ちょうどいただきます。ありがとうございました！」</p>
				<button class="proceed" onclick={toReturn}>Torna a casa →</button>
			{/if}
		</article>
	{:else if scene === 'return'}
		<article class="scene">
			<p class="who">🏠 Sei tornato a casa</p>
			<p class="hint">Cosa dici entrando?</p>
			<div class="choices">
				{#each RETURN_CHOICES as c (c)}
					<button class="choice" class:right={greetPicked !== null && c === 'ただいま'} class:wrong={greetPicked === c && c !== 'ただいま'} disabled={greetPicked !== null} onclick={() => pickReturn(c)}>{c}</button>
				{/each}
			</div>
			{#if greetPicked !== null}
				<p class="bubble">🧑‍🦰「{errors === 0 ? 'おかえりなさい！ぜんぶあってるよ、ありがとう！' : 'おかえりなさい！んー、ちょっとちがうかも…'}」</p>
				<button class="proceed" onclick={toDone}>Vedi com'è andata →</button>
			{/if}
		</article>
	{:else if scene === 'done'}
		<article class="scene">
			<p class="who">{errors === 0 ? '🎉 Missione perfetta!' : '📝 Missione completata'}</p>
			<ul class="shop-list">
				{#each list as r (r.item.id)}
					<li><span class="li-emoji">{r.item.emoji}</span> <span class="li-name">{r.item.scrittura}</span> <span class="li-qty">{r.qty}{r.item.counterId}</span></li>
				{/each}
			</ul>
			<p class="hint">{errors === 0 ? 'Nessun errore. Sugoi!' : `Errori: ${errors}${missed.length ? ' (' + missed.join('、') + ')' : ''}`}</p>
			<button class="proceed" onclick={start}>🔁 Un'altra spesa</button>
		</article>
	{/if}
</div>

<style>
	.konbini { display: grid; gap: 14px; }
	.nav { margin-bottom: 2px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.scene { background: var(--surface); border-radius: 16px; padding: 20px; box-shadow: 0 2px 10px rgba(14,29,51,0.07); display: grid; gap: 14px; }
	.who { margin: 0; font-size: 0.9rem; font-weight: 700; }
	.hint { margin: 0; text-align: center; font-size: 0.82rem; color: var(--muted); }
	.bubble { margin: 0; text-align: center; font-size: 1.1rem; font-weight: 600; background: var(--surface-2); border-radius: 12px; padding: 12px; }
	.bubble.big { font-size: 1.25rem; }
	.prompt { margin: 0; text-align: center; font-size: 1.6rem; font-weight: 800; }
	.repeat-bar { display: flex; gap: 8px; justify-content: center; }

	.shop-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
	.shop-list li { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface-2); }
	.li-emoji { font-size: 1.4rem; }
	.li-name { flex: 1; font-weight: 600; }
	.li-qty { font-weight: 700; }
	.li-mark { font-weight: 800; }

	.shelf { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
	.product { position: relative; aspect-ratio: 1; display: grid; place-items: center; border: 1.5px solid var(--line); border-radius: 12px; background: var(--surface-2); cursor: pointer; }
	.product.in-cart { border-color: var(--brand); background: #eff6ff; }
	.prod-emoji { font-size: 2rem; }
	.prod-badge { position: absolute; top: -6px; right: -6px; min-width: 20px; height: 20px; padding: 0 5px; display: grid; place-items: center; border-radius: 999px; background: var(--brand); color: #fff; font-size: 0.75rem; font-weight: 700; }

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
