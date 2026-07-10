<script lang="ts">
	import InteractiveSentence from '$lib/components/InteractiveSentence.svelte';
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { db } from '$lib/db/schema';
	import type { Counter } from '$lib/types/models';
	import { SHOP_ITEMS, generateShoppingList, type ShopItem, type ShoppingRequest } from '$lib/core/shopItems';
	import { readCounterN } from '$lib/core/counterReadings';
	import { readNumber, YEN_DENOMINATIONS } from '$lib/core/counterGen';
	import { recordPracticeMiss } from '$lib/core/practiceMiss';
	import { speakSentenceJapanese, speakSentenceJapaneseAsync, speakSequence } from '$lib/core/tts';
	import { playRing } from '$lib/core/sfx';
	import { voiceParams, primeVoices, opposite, type Gender } from '$lib/core/voices';
	import { appState } from '$lib/stores.svelte';

	const rnd = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)]!;
	const REPEAT_REQ = ['すみません、もう一度おねがいします。', 'もう一度いいですか？', 'すみません、もう一度よろしいですか？'];
	const SLOWER_REQ = ['すみません、もう少しゆっくりおねがいします。', 'もう少しゆっくり話していただけますか？', 'ゆっくりおねがいします。'];

	// ── Voci: interlocutrice = femminile, commesso = opposto a te, tu = voce impostazioni ──
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

	// Copione: log delle battute di dialogo (non i feedback né le ripetizioni).
	type Line = { who: 'me' | 'other'; text: string };
	let dialog = $state<Line[]>([]);
	function pushLine(who: 'me' | 'other', text: string): void {
		const last = dialog[dialog.length - 1];
		if (last && last.who === who && last.text === text) return;
		dialog = [...dialog, { who, text }];
	}
	// Più battute di fila senza annullarsi; con role finiscono nel copione.
	function sequence(lines: { g: Gender; text: string; role?: 'me' | 'other' }[]): void {
		speakSequence(lines.map((l) => ({ text: l.text, options: voiceParams(l.g) })));
		for (const l of lines) if (l.role) pushLine(l.role, l.text);
	}
	// Battuta singola di storia (parla + copione).
	function line(g: Gender, text: string, role: 'me' | 'other'): void {
		sequence([{ g, text, role }]);
	}
	// もう一度 / ゆっくり: dici la richiesta, poi risenti la frase (più piano se slow).
	async function askRepeat(slow: boolean, line: string, g: Gender): Promise<void> {
		await speakSentenceJapaneseAsync(slow ? rnd(SLOWER_REQ) : rnd(REPEAT_REQ), voiceParams(userGender()));
		speakSentenceJapanese(line, { ...voiceParams(g), rate: slow ? 0.6 : 1 });
	}

	type Scene = 'intro' | 'depart' | 'call' | 'order' | 'orderdone' | 'pay' | 'return' | 'done';
	const NOT_UNDERSTOOD_K = ['すみません、もう一度よろしいですか？', '恐れ入ります、もう一度おねがいします。', 'えっと、もう一度いいですか？'];
	// L'interlocutrice chiede di fare la spesa (varianti).
	const INTRO_REQUESTS = [
		'ねえ、ちょっとコンビニで買い物おねがいできる？',
		'悪いんだけど、コンビニでいくつか買ってきてくれる？',
		'今ちょっと手が離せなくて…コンビニでお使いたのめる？',
		'ごめん、コンビニで買ってきてほしいものがあるんだけど、いい？'
	];
	const CLERK_OK = ['かしこまりました。', 'はい、少々お待ちください。', 'ありがとうございます。'];
	// Benvenuto del commesso (varianti tipiche konbini).
	const CLERK_GREET = [
		'いらっしゃいませ！ご注文をどうぞ。',
		'いらっしゃいませ、こんにちは！何になさいますか？',
		'いらっしゃいませ！お決まりですか？'
	];

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
	let introRequest = $state('');
	let callStep = $state<'ring' | 'request' | 'branch'>('ring');
	let targetList = $state<ShoppingRequest[]>([]);
	let callConfirm = $state(false); // true = fa il riepilogo e lei conferma/corregge
	let callReply = $state('');
	let callGrid = $state<ShopItem[]>([]);

	// ordine
	let orderIdx = $state(0);
	let orderChoices = $state<string[]>([]);
	let orderCorrect = $state('');
	let orderStaffLine = $state('');
	let clerkGreet = $state('');
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

	let showScript = $state(false);
	function start(): void {
		dialog = [];
		showScript = false;
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
		introRequest = rnd(INTRO_REQUESTS);
		// chiede di fare la spesa, poi detta la lista (risentibile con もう一度 / ゆっくり)
		sequence([
			{ g: KANOJO, text: introRequest, role: 'other' },
			{ g: KANOJO, text: listPhrase() + '、おねがいね！', role: 'other' }
		]);
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
		line(KANOJO, ok ? 'ありがとう、じゃあおねがいね！' : 'えっと…まあいいや、おねがいね！', 'other');
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
		sequence([{ g: userGender(), text: choice, role: 'me' }, { g: KANOJO, text: 'いってらっしゃい！', role: 'other' }]);
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

	// La telefonata chiede una modifica alla lista (NON la applica: la capisci
	// tu e modifichi la spesa a mano). targetList = lista corretta dopo la modifica.
	function makeCall(): void {
		const roll = Math.random();
		if (roll < 0.4 && SHOP_ITEMS.some((x) => !list.find((r) => r.item.id === x.id))) {
			const extra = shuffle(SHOP_ITEMS.filter((x) => !list.find((r) => r.item.id === x.id)))[0]!;
			const qty = 1 + Math.floor(Math.random() * 2);
			targetList = [...list.map((r) => ({ ...r })), { item: extra, qty }];
			callText = `あ、ごめん！${extra.scrittura}も${itemReading(extra, qty)}おねがい！`;
		} else if (roll < 0.7 && list.length > 1) {
			const idx = Math.floor(Math.random() * list.length);
			const removed = list[idx]!;
			targetList = list.filter((_, i) => i !== idx).map((r) => ({ ...r }));
			callText = `あ、${removed.item.scrittura}はやっぱりいらないや、ごめん！`;
		} else {
			const idx = Math.floor(Math.random() * list.length);
			const r = list[idx]!;
			const nq = r.qty === 1 ? 2 : r.qty - 1;
			targetList = list.map((x, i) => (i === idx ? { ...x, qty: nq } : { ...x }));
			callText = `あ、${r.item.scrittura}、やっぱり${itemReading(r.item, nq)}にして！`;
		}
		// griglia editabile: prodotti già in lista + eventuale nuovo prodotto
		const ids = new Set<string>();
		callGrid = [...list, ...targetList]
			.map((r) => r.item)
			.filter((it) => (ids.has(it.id) ? false : (ids.add(it.id), true)));
		callConfirm = Math.random() < 0.5;
		callReply = '';
		callStep = 'ring';
		playRing();
	}
	// L'utente modifica la lista secondo quanto ha capito.
	function callQty(id: string): number {
		return list.find((r) => r.item.id === id)?.qty ?? 0;
	}
	function callAdd(id: string): void {
		const found = list.find((r) => r.item.id === id);
		if (found) list = list.map((r) => (r.item.id === id ? { ...r, qty: r.qty + 1 } : r));
		else {
			const it = callGrid.find((x) => x.id === id);
			if (it) list = [...list, { item: it, qty: 1 }];
		}
	}
	function callRemove(id: string): void {
		const found = list.find((r) => r.item.id === id);
		if (!found) return;
		list = found.qty <= 1 ? list.filter((r) => r.item.id !== id) : list.map((r) => (r.item.id === id ? { ...r, qty: r.qty - 1 } : r));
	}
	function sameAsTarget(): boolean {
		if (list.length !== targetList.length) return false;
		return targetList.every((t) => callQty(t.item.id) === t.qty);
	}
	function targetPhrase(): string {
		return targetList.map((r) => r.item.scrittura + 'を' + itemReading(r.item, r.qty)).join('、');
	}
	// Rispondi al telefono.
	function answerPhone(): void {
		callStep = 'request';
		sequence([{ g: userGender(), text: 'もしもし？', role: 'me' }, { g: KANOJO, text: callText, role: 'other' }]);
	}
	// Ho finito di modificare la lista → bivio.
	function callDone(): void {
		callStep = 'branch';
		const ok = sameAsTarget();
		if (!callConfirm) {
			// taglia corto: nessuna conferma
			sequence([{ g: userGender(), text: 'えっと…', role: 'me' }, { g: KANOJO, text: 'ごめん、時間がないから、じゃあね！', role: 'other' }]);
			if (!ok) { errors += 1; missed.push('telefonata'); }
			callReply = '（うまく聞き取れたかな…）';
		} else {
			// riepiloghi e lei conferma o corregge
			const mine = list.map((r) => r.item.scrittura + 'を' + itemReading(r.item, r.qty)).join('、');
			if (ok) {
				callReply = 'うん、正解！じゃあね。';
				sequence([{ g: userGender(), text: `えっと、${mine}、ですね？`, role: 'me' }, { g: KANOJO, text: callReply, role: 'other' }]);
			} else {
				callReply = `ううん、${targetPhrase()}、だよ。`;
				list = targetList.map((r) => ({ ...r })); // lei ti corregge
				errors += 1;
				missed.push('telefonata');
				sequence([{ g: userGender(), text: `えっと、${mine}、ですね？`, role: 'me' }, { g: KANOJO, text: callReply, role: 'other' }]);
			}
		}
	}
	function afterCall(): void {
		startOrder();
	}

	// ── Ordine al konbini ──
	function startOrder(): void {
		orderIdx = 0;
		scene = 'order';
		clerkGreet = rnd(CLERK_GREET);
		setOrderItem();
		// il commesso ti dà il benvenuto, poi cominci tu a ordinare
		line(clerk(), clerkGreet, 'other');
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
			line(userGender(), r.item.scrittura + 'を' + itemReading(r.item, r.qty) + 'ください', 'me');
		} else {
			errors += 1;
			missed.push(r.item.scrittura);
			void recordPracticeMiss('counter:' + r.item.counterId);
			orderStaffLine = rnd(NOT_UNDERSTOOD_K);
			line(clerk(), orderStaffLine, 'other');
		}
	}
	function retryOrder(): void {
		setOrderItem(); // rigenera e riprova lo stesso prodotto
	}
	function nextOrder(): void {
		if (orderIdx < list.length - 1) {
			orderIdx += 1;
			setOrderItem();
		} else {
			// il commesso riassume l'ordine (registro konbini) e conferma
			scene = 'orderdone';
			sequence([{ g: clerk(), text: `はい、${listPhrase()}ですね。`, role: 'other' }, { g: clerk(), text: rnd(CLERK_OK), role: 'other' }]);
		}
	}
	function toPay(): void {
		scene = 'pay';
		tendered = 0;
		stack = [];
		payChecked = false;
		line(clerk(), `ぜんぶで${readNumber(total())}えんです`, 'other');
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
			line(clerk(), 'ちょうどいただきます。ありがとうございました！', 'other');
		} else {
			// non blocca: fai riprovare
			line(clerk(), `すみません、${readNumber(total())}えんちょうどおねがいします。`, 'other');
			errors += 1;
			void recordPracticeMiss('counter:円');
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
		sequence([{ g: userGender(), text: choice, role: 'me' }, { g: KANOJO, text: reply, role: 'other' }]);
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
	<div class="nav">
		<a class="back" href="{base}/avventure">← Avventure</a>
		{#if dialog.length > 0}
			<button class="script-toggle" onclick={() => (showScript = !showScript)}>📜 Copione ({dialog.length})</button>
		{/if}
	</div>
	{#if showScript}
		<div class="script">
			<p class="script-title">📜 Il dialogo finora</p>
			{#each dialog as l}
				<p class="line {l.who}"><span class="line-who">{l.who === 'me' ? '🙂' : '🗣️'}</span> <InteractiveSentence text={l.text} /></p>
			{/each}
		</div>
	{/if}

	{#if scene === 'intro'}
		<article class="scene">
			<p class="bubble">{introRequest}</p>
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
			{#if callStep === 'ring'}
				<p class="who">📞 Il telefono squilla</p>
				<p class="dishes">📱</p>
				<div class="eat-actions">
					<button class="replay" onclick={playRing}>🔔 …</button>
					<button class="proceed" onclick={answerPhone}>📞 Rispondi</button>
				</div>
			{:else if callStep === 'request'}
				<p class="who">📞 In chiamata</p>
				{@render repeatBar(callText, KANOJO)}
				<p class="bubble">{callText}</p>
				<p class="hint">Modifica la spesa secondo quello che senti</p>
				<ul class="shop-list">
					{#each callGrid as it (it.id)}
						{@const q = callQty(it.id)}
						<li class:done={q > 0}>
							<span class="li-emoji">{it.emoji}</span>
							<span class="li-name">{it.scrittura}</span>
							<span class="d-ctrl">
								<button class="step" onclick={() => callRemove(it.id)} disabled={q === 0}>−</button>
								<span class="d-have">{q}</span>
								<button class="step" onclick={() => callAdd(it.id)}>＋</button>
							</span>
						</li>
					{/each}
				</ul>
				<button class="proceed" onclick={callDone}>できた →</button>
			{:else}
				{#if callConfirm}
					<p class="bubble sm">🙂「えっと、{listPhrase()}、ですね？」</p>
				{/if}
				<p class="bubble">{callConfirm ? '🧑‍🦰' : '🙂'}「{callReply}」</p>
				<button class="proceed" onclick={afterCall}>お店へ →</button>
			{/if}
		</article>
	{:else if scene === 'order'}
		<article class="scene">
			<p class="who">🏪 Al konbini — ordina</p>
			<p class="bubble sm">🧑‍🍳「{clerkGreet}」</p>
			{@render repeatBar(clerkGreet, clerk())}
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
			{#if picked !== null && picked === orderCorrect}
				<button class="proceed" onclick={nextOrder}>{orderIdx < list.length - 1 ? 'Prossimo →' : 'Fatto →'}</button>
			{:else if picked !== null}
				<p class="bubble sm">🧑‍🍳「{orderStaffLine}」</p>
				<button class="proceed" onclick={retryOrder}>もう一度 →</button>
			{/if}
		</article>
	{:else if scene === 'orderdone'}
		<article class="scene">
			<p class="who">🧑‍🍳 Il commesso ripete l'ordine</p>
			<p class="bubble">はい、{listPhrase()}ですね。</p>
			<button class="proceed" onclick={toPay}>お会計 →</button>
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
	.prompt { margin: 0; text-align: center; font-size: 1.6rem; font-weight: 800; }
	.repeat-bar { display: flex; gap: 8px; justify-content: center; }
	.nav { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
	.script-toggle { background: var(--surface-2); border: 1px solid var(--line); border-radius: 999px; padding: 5px 12px; font-size: 0.8rem; cursor: pointer; color: var(--ink); }
	.script { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 12px; display: grid; gap: 4px; }
	.script-title { margin: 0 0 4px; font-size: 0.85rem; font-weight: 700; }
	.line { margin: 0; font-size: 0.95rem; padding: 5px 9px; border-radius: 8px; color: var(--ink); background: var(--surface-2); border-left: 3px solid var(--line); }
	.line.other { border-left-color: #94a3b8; }
	.line.me { border-left-color: var(--brand); text-align: right; }
	.line-who { font-size: 0.9rem; }

	.shop-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
	.shop-list li { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface-2); }
	.shop-list li.done { border-color: var(--brand); }
	.d-ctrl { display: inline-flex; align-items: center; gap: 8px; margin-left: auto; }
	.step { width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--line); background: var(--surface); font-size: 1.1rem; cursor: pointer; }
	.step:disabled { opacity: 0.4; cursor: default; }
	.d-have { min-width: 16px; text-align: center; font-weight: 700; }
	.dishes { margin: 0; text-align: center; font-size: 2.4rem; }
	.eat-actions { display: flex; gap: 8px; justify-content: center; align-items: center; }
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
