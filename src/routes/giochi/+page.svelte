<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { base } from '$app/paths';
	import { db } from '$lib/db/schema';
	import type { Counter } from '$lib/types/models';
	import {
		generateReading,
		generateClockReading,
		generateNumberDictation,
		generateShopPrice,
		generateAppointment,
		YEN_DENOMINATIONS,
		type GeneratedReading,
		type Appointment
	} from '$lib/core/counterGen';
	import { generateCountObjects } from '$lib/quiz/engine';
	import { readCounterN } from '$lib/core/counterReadings';
	import { generateShoppingList, type ShopItem, type ShoppingRequest } from '$lib/core/shopItems';
	import { generateGreeting, type GreetingQuestion } from '$lib/core/greetings';
	import { speakSentenceJapanese, speakSentenceJapaneseAsync } from '$lib/core/tts';
	import { voiceParams, primeVoices, opposite, type Gender } from '$lib/core/voices';
	import { appState } from '$lib/stores.svelte';
	import { getHighscore, submitScore } from '$lib/core/gameScores';
	import { speechAvailable, listenJapanese, speechMatches, phraseVariants } from '$lib/core/speech';
	import { shuffle } from '$lib/core/gameKit';
	import HeardDiff from '$lib/components/HeardDiff.svelte';

	function userGender(): Gender {
		return appState.settings.voce_utente ?? 'femminile';
	}
	// Voce di un personaggio (per genere).
	function speakGender(text: string, g: Gender): void {
		speakSentenceJapanese(text, voiceParams(g));
	}
	function speakGenderAsync(text: string, g: Gender): Promise<void> {
		return speakSentenceJapaneseAsync(text, voiceParams(g));
	}
	// La tua voce (impostazioni).
	function speakUser(text: string): void {
		speakGender(text, userGender());
	}
	function speakUserAsync(text: string): Promise<void> {
		return speakGenderAsync(text, userGender());
	}

	// Giochi a scelta multipla ("leggi come si pronuncia"). id = contatore o 'clock'/'mix'/'count'.
	const READ_GAMES = [
		{ id: '日', label: 'Giorni del mese', icon: '📅', hint: '1-31, native irregolari' },
		{ id: '時', label: 'Ore', icon: '🕐', hint: 'よじ, しちじ, くじ…' },
		{ id: '分', label: 'Minuti', icon: '⏱️', hint: 'rendaku ふん / ぷん' },
		{ id: '円', label: 'Prezzi (yen)', icon: '💴', hint: 'rendaku di 百 e 千' },
		{ id: 'clock', label: 'Che ore sono?', icon: '⏰', hint: 'ore + minuti (4:30)' },
		{ id: 'count', label: 'Conta gli oggetti', icon: '🔢', hint: 'quanti? col contatore giusto' },
		{ id: 'mix', label: 'Misto', icon: '🎲', hint: "un po' di tutto" }
	] as const;

	type ReadId = (typeof READ_GAMES)[number]['id'];
	type Game = { kind: 'read'; cat: ReadId } | { kind: 'listen' } | { kind: 'shop' } | { kind: 'appt' } | { kind: 'shopping' } | { kind: 'greet' } | { kind: 'order' } | null;

	let counters = $state<Counter[]>([]);
	onMount(async () => { primeVoices(); canSpeak = speechAvailable(); counters = await db.counters.toArray(); });

	// ── Rispondi a voce nel gioco dei saluti ──
	let canSpeak = $state(false);
	let micState = $state<'idle' | 'listening'>('idle');
	let heard = $state('');
	async function speakGreetGame(): Promise<void> {
		if (micState !== 'idle' || picked !== null || !greet) return;
		micState = 'listening';
		heard = '';
		const alts = await listenJapanese();
		micState = 'idle';
		if (!greet || picked !== null) return;
		if (alts.length === 0) { heard = '（何も聞こえませんでした…riprova）'; return; }
		heard = alts[0]!;
		const hit = greet.choices.find((c) => speechMatches(alts, [phraseVariants(c)]));
		if (hit) pickGreet(hit, true);
	}

	// Il riconoscitore trascrive le letture come FORMA SCRITTA (ここのか → «9日»,
	// よじはん → «4時30分», さんぼん → «3本»): oltre alle varianti kana della lettura
	// attesa, accettiamo anche la forma scritta, derivata dal prompt (così vale
	// anche nel Misto). Senza questo, pronunce giuste risultavano sbagliate.
	function writtenVariants(q: GeneratedReading): string[] {
		const out: string[] = [];
		const p = q.prompt;
		if (/^[\d,]+(日|時|分|円)$/.test(p)) out.push(p);
		const clock = p.match(/^(\d+):(\d\d)$/);
		if (clock) {
			const h = Number(clock[1]);
			const m = Number(clock[2]);
			out.push(m === 0 ? `${h}時` : `${h}時${m}分`);
			if (m === 30) out.push(`${h}時半`);
		}
		const qc = q as GeneratedReading & { count?: number; counterId?: string };
		if (qc.count && qc.counterId) out.push(`${qc.count}${qc.counterId}`);
		return out;
	}

	// Rispondi a voce nei giochi «leggi come si pronuncia»: premendo il pulsante il
	// timer si ferma per lasciarti pronunciare; se la lettura combacia, conta come
	// risposta giusta (una pronuncia sbagliata non penalizza: puoi ritentare o toccare).
	async function speakReadGame(): Promise<void> {
		if (micState !== 'idle' || picked !== null || !question) return;
		stopCountdown();
		micState = 'listening';
		heard = '';
		const alts = await listenJapanese();
		micState = 'idle';
		if (!question || picked !== null) return;
		if (alts.length === 0) { heard = '（何も聞こえませんでした…riprova）'; return; }
		heard = alts[0]!;
		const varianti = [...phraseVariants(question.correct), question.correct, ...writtenVariants(question)];
		if (speechMatches(alts, [varianti])) pick(question.correct);
	}

	// Mette a fuoco l'input a ogni nuova domanda (il parametro cambia → update),
	// così in «scrivi il numero» digiti subito senza doverci cliccare.
	function focusOnChange(node: HTMLInputElement, _key: unknown) {
		node.focus();
		return { update() { node.focus(); } };
	}

	let game = $state<Game>(null);
	let streak = $state(0);
	let best = $state(0);
	let isRecord = $state(false);
	let gameOver = $state(false);

	// scelta multipla
	let question = $state<GeneratedReading | null>(null);
	let choices = $state<string[]>([]);
	let picked = $state<string | null>(null);

	// dettato
	let dictation = $state<{ n: number; reading: string } | null>(null);
	let answer = $state('');
	let checked = $state(false);

	// alla cassa
	let shop = $state<{ n: number; reading: string } | null>(null);
	let shopPhrase = $state('');
	let clerkReply = $state('');
	let tendered = $state(0);
	let stack = $state<number[]>([]);

	// appuntamento (data + ora)
	let appt = $state<Appointment | null>(null);
	let apptIn = $state({ month: '', day: '', hour: '', minute: '' });

	// lista della spesa (お使い)
	let shopList = $state<ShoppingRequest[]>([]);
	let grid = $state<ShopItem[]>([]);
	let cart = $state<Record<string, number>>({});
	let confirmText = $state('');
	let replyText = $state('');

	// saluti / convenevoli
	let greet = $state<GreetingQuestion | null>(null);

	// al konbini: ordina componendo numero+contatore
	let order = $state<{ list: ShoppingRequest[]; idx: number } | null>(null);
	let orderDisplay = $state<'kanji' | 'kana'>('kana');
	const KNUM = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
	const ALT_COUNTERS = ['個', '本', '枚', 'つ', '匹', '杯', '冊', '台'];
	function kanjiNum(n: number): string { return n <= 10 ? KNUM[n]! : n === 20 ? '二十' : String(n); }

	// ── Timer per la risposta ("pepe"). Parte dopo l'audio nei giochi d'ascolto. ──
	let timerOn = $state(true);
	let timeLeft = $state(0); // decimi di secondo rimasti
	let timerMax = $state(0);
	let timerId: ReturnType<typeof setInterval> | null = null;
	let qGen = 0; // invalida timer di domande vecchie (audio async)

	const TIMER_SECONDS: Record<string, number> = { read: 8, listen: 8, appt: 22, shop: 28, shopping: 40, greet: 7, order: 9 };
	function timerSeconds(g: NonNullable<Game>): number {
		return TIMER_SECONDS[g.kind] ?? 8;
	}

	function stopCountdown(): void {
		if (timerId !== null) { clearInterval(timerId); timerId = null; }
	}
	function startCountdown(seconds: number): void {
		stopCountdown();
		if (!timerOn) { timeLeft = 0; timerMax = 0; return; }
		timerMax = seconds * 10;
		timeLeft = timerMax;
		timerId = setInterval(() => {
			timeLeft -= 1;
			if (timeLeft <= 0) { stopCountdown(); onTimeout(); }
		}, 100);
	}
	// Arma il timer solo quando l'audio è finito e la domanda è ancora attuale.
	function armAfterAudio(promise: Promise<void>, seconds: number): void {
		const my = qGen;
		void promise.then(() => { if (my === qGen && game) startCountdown(seconds); });
	}
	function onTimeout(): void {
		if (!game || gameOver || checked || picked !== null) return;
		if (game.kind === 'read') { picked = ' '; }
		else if (game.kind === 'shop') { settleShop(null); return; }
		else if (game.kind === 'shopping') { deliver(); return; }
		else if (game.kind === 'greet') { picked = ' '; }
		else if (game.kind === 'order') { picked = ' '; }
		else { checked = true; }
		registerResult(false);
	}

	function gameId(g: NonNullable<Game>): string {
		if (g.kind === 'read') return `read-${g.cat}`;
		if (g.kind === 'shop') return 'shop-pay';
		if (g.kind === 'appt') return 'listen-appt';
		if (g.kind === 'shopping') return 'shopping-list';
		if (g.kind === 'greet') return 'greetings';
		if (g.kind === 'order') return 'konbini-order';
		return 'listen-number';
	}


	function genFor(cat: ReadId): GeneratedReading | null {
		if (cat === 'clock') return generateClockReading();
		if (cat === 'count') return generateCountObjects(counters);
		if (cat === 'mix') {
			const pool = ['日', '時', '分', '円', 'clock', 'count'];
			const id = pool[Math.floor(Math.random() * pool.length)]!;
			return id === 'clock' ? generateClockReading() : id === 'count' ? generateCountObjects(counters) : generateReading(id);
		}
		return generateReading(cat);
	}

	function newReadQuestion(cat: ReadId): void {
		qGen += 1;
		let gen: GeneratedReading | null = null;
		for (let i = 0; i < 10 && !gen; i += 1) {
			const g = genFor(cat);
			if (g && g.distractors.length >= 1) gen = g;
		}
		if (!gen) return;
		question = gen;
		choices = shuffle([gen.correct, ...gen.distractors]);
		picked = null;
		startCountdown(TIMER_SECONDS.read!); // nessun audio: parte subito
	}

	function newDictation(): void {
		qGen += 1;
		dictation = generateNumberDictation();
		answer = '';
		checked = false;
		armAfterAudio(speakSentenceJapaneseAsync(dictation.reading), TIMER_SECONDS.listen!);
	}

	// Frasi con cui il commesso annuncia il totale (variate).
	const SHOP_PHRASES = [
		(r: string) => `ぜんぶで${r}えんです`,
		(r: string) => `おかいけいは${r}えんになります`,
		(r: string) => `${r}えん、おねがいします`
	];
	const SHOP_OK_REPLIES = ['ちょうどいただきます。ありがとうございました！', 'ちょうどですね。ありがとうございます！'];

	function newShop(): void {
		qGen += 1;
		shop = generateShopPrice();
		shopPhrase = SHOP_PHRASES[Math.floor(Math.random() * SHOP_PHRASES.length)]!(shop.reading);
		clerkReply = '';
		tendered = 0;
		stack = [];
		checked = false;
		armAfterAudio(speakGenderAsync(shopPhrase, opposite(userGender())), TIMER_SECONDS.shop!);
	}

	function newAppt(): void {
		qGen += 1;
		appt = generateAppointment();
		apptIn = { month: '', day: '', hour: '', minute: '' };
		checked = false;
		armAfterAudio(speakSentenceJapaneseAsync(appt.reading), TIMER_SECONDS.appt!);
	}

	function start(g: NonNullable<Game>): void {
		// entry di history per intercettare il tasto «indietro» → chiude il gioco,
		// non esce da /giochi (una sola volta, i restart non impilano).
		if (!gamePushed && typeof history !== 'undefined') { history.pushState({ renkeiGame: true }, ''); gamePushed = true; }
		game = g;
		streak = 0;
		best = getHighscore(gameId(g));
		isRecord = false;
		gameOver = false;
		if (g.kind === 'read') newReadQuestion(g.cat);
		else if (g.kind === 'shop') newShop();
		else if (g.kind === 'appt') newAppt();
		else if (g.kind === 'shopping') newShopping();
		else if (g.kind === 'greet') newGreet();
		else if (g.kind === 'order') newOrder();
		else newDictation();
	}

	function checkAppt(): void {
		if (checked || !appt) return;
		const asNum = (s: string) => Number(s.replace(/[^\d]/g, ''));
		if ([apptIn.month, apptIn.day, apptIn.hour, apptIn.minute].some((v) => v.trim() === '')) return;
		stopCountdown();
		checked = true;
		const ok =
			asNum(apptIn.month) === appt.month &&
			asNum(apptIn.day) === appt.day &&
			asNum(apptIn.hour) === appt.hour &&
			asNum(apptIn.minute) === appt.minute;
		if (!ok) {
			const intro = ['ざんねん、', 'ちがうよ、', 'おしい！', 'ちがう、こたえは'];
			speakSentenceJapanese(intro[Math.floor(Math.random() * intro.length)] + appt.reading + 'だよ。');
		}
		registerResult(ok);
	}

	function addDenom(d: number): void {
		if (checked) return;
		stack = [...stack, d];
		tendered += d;
	}
	function undo(): void {
		if (checked || stack.length === 0) return;
		const last = stack[stack.length - 1]!;
		stack = stack.slice(0, -1);
		tendered -= last;
	}
	function resetTender(): void {
		if (checked) return;
		stack = [];
		tendered = 0;
	}
	// paid === null: tempo scaduto.
	function settleShop(paid: number | null): void {
		if (checked || !shop) return;
		stopCountdown();
		checked = true;
		const ok = paid !== null && paid === shop.n;
		clerkReply = ok
			? SHOP_OK_REPLIES[Math.floor(Math.random() * SHOP_OK_REPLIES.length)]!
			: `すみません、${shop.reading}えんちょうどおねがいします。`;
		speakGender(clerkReply, opposite(userGender()));
		registerResult(ok);
	}
	function payNow(): void {
		if (checked || !shop || tendered === 0) return;
		settleShop(tendered);
	}

// ── Lista della spesa (お使い) ──
	const SHOP_OK = ['うん、おねがい！', 'せいかい！', 'ばっちり！', 'ありがとう！'];
	function itemReading(item: ShopItem, qty: number): string {
		const c = counters.find((x) => x.id === item.counterId);
		return (c && readCounterN(c, qty)) || String(qty);
	}
	function requestPhrase(): string {
		return shopList.map((r) => r.item.scrittura + 'を' + itemReading(r.item, r.qty)).join('、') + 'おねがいします';
	}
	function newShopping(): void {
		qGen += 1;
		const g = generateShoppingList(2 + Math.floor(Math.random() * 2), 3);
		shopList = g.list;
		grid = g.grid;
		cart = {};
		confirmText = '';
		replyText = '';
		checked = false;
		// L'interlocutore (voce opposta) detta la lista: all'inizio si ascolta e basta.
		armAfterAudio(speakGenderAsync(requestPhrase(), 'femminile'), TIMER_SECONDS.shopping);
	}
	function speakList(): void {
		speakGender(requestPhrase(), 'femminile');
	}
	function addToCart(id: string): void {
		if (checked) return;
		const qty = (cart[id] ?? 0) + 1;
		cart = { ...cart, [id]: qty };
		const it = grid.find((x) => x.id === id);
		if (it) speakUser(itemReading(it, qty)); // conti tu, ad alta voce
	}
	function removeFromCart(id: string): void {
		if (checked || !cart[id]) return;
		const n = cart[id] - 1;
		const next = { ...cart };
		if (n <= 0) delete next[id]; else next[id] = n;
		cart = next;
	}
	function resetCart(): void {
		if (checked) return;
		cart = {};
	}
	async function deliver(): Promise<void> {
		if (checked) return;
		stopCountdown();
		checked = true;
		const entries = Object.entries(cart).filter(([, n]) => n > 0);
		const parts = entries
			.map(([id, n]) => { const it = grid.find((x) => x.id === id); return it ? it.scrittura + 'を' + itemReading(it, n) : ''; })
			.filter(Boolean);
		confirmText = parts.length ? 'じゃあ、' + parts.join('、') + 'ですね？' : 'えっと…なにもとってない！';
		const ok = shopList.every((r) => (cart[r.item.id] ?? 0) === r.qty) &&
			entries.every(([id]) => shopList.some((r) => r.item.id === id));
		// tu riepiloghi (voce utente), poi l'interlocutore conferma o corregge
		await speakUserAsync(confirmText);
		replyText = ok
			? SHOP_OK[Math.floor(Math.random() * SHOP_OK.length)] + (Math.random() < 0.4 ? ' じょうずだね！' : '')
			: 'ちがうよ、よく聞いてね！';
		speakGender(replyText, 'femminile'); // la kanojo risponde
		registerResult(ok);
	}
	
	// ── Saluti / convenevoli ──
	function newGreet(): void {
		qGen += 1;
		heard = '';
		greet = generateGreeting();
		choices = greet.choices;
		picked = null;
		if (greet.ja) armAfterAudio(speakGenderAsync(greet.ja, opposite(userGender())), TIMER_SECONDS.greet);
		else startCountdown(TIMER_SECONDS.greet);
	}
	function pickGreet(choice: string, viaVoce = false): void {
		if (picked !== null || !greet) return;
		stopCountdown();
		picked = choice;
		// se l'hai detta tu a voce (e giusta), niente eco del sintetizzatore
		if (!(viaVoce && choice === greet.correct)) speakUser(greet.correct);
		registerResult(choice === greet.correct);
	}

// ── Al konbini: ordina componendo numero + contatore ──
	function orderReading(r: ShoppingRequest): string {
		const c = counters.find((x) => x.id === r.item.counterId);
		return (c && readCounterN(c, r.qty)) || String(r.qty);
	}
	function fmtQty(counterId: string, q: number, display: 'kanji' | 'kana'): string {
		if (display === 'kanji') return kanjiNum(q) + counterId;
		const c = counters.find((x) => x.id === counterId);
		return (c && readCounterN(c, q)) || String(q);
	}
	function setOrderQuestion(): void {
		if (!order) return;
		qGen += 1;
		const r = order.list[order.idx]!;
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
		question = { prompt: '', correct, distractors: distractors.slice(0, 3) };
		choices = shuffle([correct, ...distractors.slice(0, 3)]);
		picked = null;
		startCountdown(TIMER_SECONDS.order!);
	}
	function newOrder(): void {
		order = { list: generateShoppingList(2 + Math.floor(Math.random() * 2), 0).list, idx: 0 };
		setOrderQuestion();
	}
	function advanceOrder(): void {
		if (!order) return;
		if (order.idx < order.list.length - 1) { order.idx += 1; setOrderQuestion(); }
		else {
			const phrase = order.list.map((r) => r.item.scrittura + 'を' + orderReading(r)).join('、') + 'ください';
			speakUser(phrase);
			newOrder();
		}
	}

	function registerResult(correct: boolean): void {
		stopCountdown();
		if (correct) {
			streak += 1;
			if (streak > best) { best = streak; isRecord = true; }
		} else {
			gameOver = true;
			if (game) submitScore(gameId(game), streak);
		}
	}

	function pick(choice: string): void {
		if (picked !== null || !question) return;
		stopCountdown();
		picked = choice;
		speakSentenceJapanese(question.correct);
		registerResult(choice === question.correct);
	}

	function checkDictation(): void {
		if (checked || !dictation || answer.trim() === '') return;
		stopCountdown();
		checked = true;
		registerResult(Number(answer.replace(/[^\d]/g, '')) === dictation.n);
	}

	function proceed(): void {
		if (!game) return;
		if (gameOver) { start(game); return; }
		if (game.kind === 'order') { advanceOrder(); return; }
		if (game.kind === 'read') newReadQuestion(game.cat);
		else if (game.kind === 'shop') newShop();
		else if (game.kind === 'appt') newAppt();
		else if (game.kind === 'shopping') newShopping();
		else if (game.kind === 'greet') newGreet();
		else newDictation();
	}

	// Chiude il gioco tornando al MENU dei giochi (non alla home). Il tasto
	// «indietro» del browser è gestito con un entry di history: back → chiude il
	// gioco invece di uscire da /giochi.
	let gamePushed = false;
	function quitInternal(): void {
		stopCountdown();
		qGen += 1;
		if (game && !gameOver) submitScore(gameId(game), streak);
		game = null;
		question = null;
		dictation = null;
		shop = null;
		appt = null;
		shopList = [];
		cart = {};
		greet = null;
		order = null;
		micState = 'idle';
		heard = '';
	}
	function quit(): void {
		const pushed = gamePushed;
		quitInternal();
		if (pushed && typeof history !== 'undefined') { gamePushed = false; history.back(); }
	}

	function onPopState(): void {
		if (game) { gamePushed = false; quitInternal(); }
	}
	onMount(() => {
		if (typeof window !== 'undefined') window.addEventListener('popstate', onPopState);
	});
	onDestroy(() => {
		stopCountdown();
		if (typeof window !== 'undefined') window.removeEventListener('popstate', onPopState);
	});
</script>

<div class="games-page">
	{#if !game}
		<h1 class="page-title">🎮 Giochi</h1>
		<p class="page-sub">
			Vai avanti il più a lungo possibile: un errore e la serie riparte. Il record è tuo,
			separato dall'XP di studio.
		</p>
		<label class="timer-toggle">
			<input type="checkbox" bind:checked={timerOn} />
			⏱️ Timer per la risposta <span class="timer-note">(parte dopo l'audio)</span>
		</label>

		<p class="group-title">Leggi come si pronuncia</p>
		<div class="cat-grid">
			{#each READ_GAMES as g}
				<button class="cat-card" onclick={() => start({ kind: 'read', cat: g.id })}>
					<span class="cat-icon">{g.icon}</span>
					<span class="cat-label">{g.label}</span>
					<span class="cat-hint">{g.hint}</span>
					<span class="cat-best">🏆 record: {getHighscore(`read-${g.id}`)}</span>
				</button>
			{/each}
		</div>

		<p class="group-title">Ascolta e agisci</p>
		<div class="cat-grid">
			<button class="cat-card" onclick={() => start({ kind: 'listen' })}>
				<span class="cat-icon">👂</span>
				<span class="cat-label">Scrivi il numero</span>
				<span class="cat-hint">senti la lettura, digita le cifre</span>
				<span class="cat-best">🏆 record: {getHighscore('listen-number')}</span>
			</button>
			<button class="cat-card" onclick={() => start({ kind: 'shop' })}>
				<span class="cat-icon">🛒</span>
				<span class="cat-label">Alla cassa</span>
				<span class="cat-hint">il commesso dice il totale: paga esatto</span>
				<span class="cat-best">🏆 record: {getHighscore('shop-pay')}</span>
			</button>
			<button class="cat-card" onclick={() => start({ kind: 'appt' })}>
				<span class="cat-icon">📅</span>
				<span class="cat-label">Appuntamento</span>
				<span class="cat-hint">senti data e ora, segnala sull'agenda</span>
				<span class="cat-best">🏆 record: {getHighscore('listen-appt')}</span>
			</button>
			<button class="cat-card" onclick={() => start({ kind: 'shopping' })}>
				<span class="cat-icon">🛍️</span>
				<span class="cat-label">Lista della spesa</span>
				<span class="cat-hint">senti cosa prendere e riempi il carrello</span>
				<span class="cat-best">🏆 record: {getHighscore('shopping-list')}</span>
			</button>
			<a class="cat-card" href="{base}/choukai">
				<span class="cat-icon">👂</span>
				<span class="cat-label">聴解 — Ascolto trappola</span>
				<span class="cat-hint">dialoghi stile JLPT: cambiano idea, tu non cascarci</span>
			</a>
		</div>

		<p class="group-title">Conversazione</p>
			<div class="cat-grid">
				<a class="cat-card" href="{base}/mani-libere">
					<span class="cat-icon">🚗</span>
					<span class="cat-label">Mani libere <span class="cat-beta">beta</span></span>
					<span class="cat-hint">solo voce: l'app dice cosa dire, tu rispondi. In auto o senza mani</span>
				</a>
				<a class="cat-card" href="{base}/keigo">
					<span class="cat-icon">🙇</span>
					<span class="cat-label">敬語 — Linguaggio cortese</span>
					<span class="cat-hint">尊敬語 o 謙譲語? La forma giusta per capo e clienti</span>
				</a>
				<a class="cat-card" href="{base}/presentati">
					<span class="cat-icon">🙋</span>
					<span class="cat-label">Presentati — Primo incontro</span>
					<span class="cat-hint">ti presenti, sminuisci il complimento, e se non capisci?</span>
				</a>
				<a class="cat-card" href="{base}/giornata">
					<span class="cat-icon">🌅</span>
					<span class="cat-label">Una giornata</span>
					<span class="cat-hint">dalla sveglia alla buonanotte: la frase giusta al momento giusto</span>
				</a>
				<button class="cat-card" onclick={() => start({ kind: 'greet' })}>
					<span class="cat-icon">🗣️</span>
					<span class="cat-label">Saluti e convenevoli</span>
					<span class="cat-hint">rispondi con la formula giusta</span>
					<span class="cat-best">🏆 record: {getHighscore('greetings')}</span>
				</button>
				<a class="cat-card" href="{base}/shadowing">
					<span class="cat-icon">🗣️</span>
					<span class="cat-label">Shadowing — Ripeti subito</span>
					<span class="cat-hint">ascolta e ripeti ad alta voce, il microfono ti verifica</span>
					<span class="cat-best">🏆 record: {getHighscore('shadowing')}</span>
				</a>
			</div>

			<p class="group-title">Al konbini</p>
			<div class="cat-grid">
				<button class="cat-card" onclick={() => start({ kind: 'order' })}>
					<span class="cat-icon">🏪</span>
					<span class="cat-label">Ordina al konbini</span>
					<span class="cat-hint">chiedi con numero + contatore giusto</span>
					<span class="cat-best">🏆 record: {getHighscore('konbini-order')}</span>
				</button>
			</div>

			<p class="group-title">Lettura e frasi</p>
			<div class="cat-grid">
				<a class="cat-card" href="{base}/riordina">
					<span class="cat-icon">🧩</span>
					<span class="cat-label">Riordina la frase</span>
					<span class="cat-hint">i pezzi sono in disordine: ricomponila</span>
				</a>
				<a class="cat-card" href="{base}/iikae">
					<span class="cat-icon">🔁</span>
					<span class="cat-label">言い換え — Dillo in un altro modo</span>
					<span class="cat-hint">stile JLPT: scegli frase o parola con lo stesso significato</span>
				</a>
				<a class="cat-card" href="{base}/lettura">
					<span class="cat-icon">⚡</span>
					<span class="cat-label">Lettura veloce</span>
					<span class="cat-hint">il testo scorre da solo, poi domande a tempo</span>
				</a>
				<a class="cat-card" href="{base}/skimming">
					<span class="cat-icon">🔎</span>
					<span class="cat-label">Skimming</span>
					<span class="cat-hint">prima la domanda, poi trova l'informazione nel testo</span>
				</a>
				<a class="cat-card" href="{base}/leggi-a-voce">
					<span class="cat-icon">📢</span>
					<span class="cat-label">Leggi a voce <span class="cat-beta">beta</span></span>
					<span class="cat-hint">leggi tu la frase: prima coi furigana, poi senza</span>
				</a>
				<a class="cat-card" href="{base}/dettato">
					<span class="cat-icon">✍️</span>
					<span class="cat-label">Dettato <span class="cat-beta">beta</span></span>
					<span class="cat-hint">ascolta e ricomponi la frase, pezzo per pezzo</span>
				</a>
				<a class="cat-card" href="{base}/catena">
					<span class="cat-icon">🧬</span>
					<span class="cat-label">Catena di forme <span class="cat-beta">beta</span></span>
					<span class="cat-hint">食べる→食べられる→食べられない: le forme, un passo alla volta</span>
				</a>
				<a class="cat-card" href="{base}/coppie">
					<span class="cat-icon">🔀</span>
					<span class="cat-label">Coppie difficili <span class="cat-beta">beta</span></span>
					<span class="cat-hint">妻 o 奥さん? 切符 o 切手? il contesto ne forza una sola</span>
				</a>
				<a class="cat-card" href="{base}/avverbi">
					<span class="cat-icon">🎚️</span>
					<span class="cat-label">Avverbi <span class="cat-beta">beta</span></span>
					<span class="cat-hint">そろそろ, きっと, なかなか…: scegli l'avverbio giusto dal contesto</span>
				</a>
				<a class="cat-card" href="{base}/comparazioni">
					<span class="cat-icon">⚖️</span>
					<span class="cat-label">Comparazioni <span class="cat-beta">beta</span></span>
					<span class="cat-hint">より・のほうが・いちばん・ほど〜ない: chi è più… ? componi il confronto</span>
				</a>
			</div>

			<a class="back-link" href="{base}/contatori">← Ripassa i contatori</a>
	{:else}
		<div class="game-head">
			<button class="quit" onclick={quit}>← Esci</button>
			<span class="score">Serie: <strong>{streak}</strong> · 🏆 {best}</span>
		</div>

		{#if timerOn && timerMax > 0}
			<div class="timer-track" aria-hidden="true">
				<div
					class="timer-fill"
					class:low={timeLeft <= timerMax * 0.3}
					style="width:{Math.max(0, (timeLeft / timerMax) * 100)}%"
				></div>
			</div>
		{/if}

		{#if game.kind === 'read' && question}
			<article class="game-card">
				<p class="game-hint">{game.cat === 'count' ? 'Quanti sono? Scegli la lettura giusta' : 'Come si legge?'}</p>
				<p class="game-prompt" class:count-prompt={game.cat === 'count'}>{question.prompt}</p>
				<div class="choices">
					{#each choices as choice (choice)}
						<button
							class="choice"
							class:right={picked !== null && choice === question.correct}
							class:wrong={picked === choice && choice !== question.correct}
							disabled={picked !== null}
							onclick={() => pick(choice)}
						>{choice}</button>
					{/each}
				</div>

				{#if canSpeak && picked === null}
					<button class="mic" class:listening={micState === 'listening'} onclick={speakReadGame}>
						{micState === 'listening' ? '🎙️ Ti ascolto…' : '🎤 Pronuncia'}
					</button>
					<HeardDiff {heard} candidates={[question.correct]} />
				{/if}

				{#if picked !== null}
					{#if gameOver}
						<p class="verdict ko">Ahi! Era <strong>{question.correct}</strong>. Serie: {streak}</p>
						<button class="proceed" onclick={proceed}>🔁 Rigioca</button>
					{:else}
						<p class="verdict ok">{isRecord ? '🏆 Nuovo record!' : '✓ Giusto!'}</p>
						<button class="proceed" onclick={proceed}>Avanti →</button>
					{/if}
				{/if}
			</article>
		{:else if game.kind === 'listen' && dictation}
			<article class="game-card">
				<p class="game-hint">Che numero senti?</p>
				<button class="replay" onclick={() => speakSentenceJapanese(dictation!.reading)}>🔊 Riascolta</button>
				<input
					class="num-input"
					type="text"
					inputmode="numeric"
					placeholder="cifre…"
					bind:value={answer}
					disabled={checked}
					use:focusOnChange={dictation}
					onkeydown={(e) => { if (e.key === 'Enter') checkDictation(); }}
				/>
				{#if !checked}
					<button class="proceed" onclick={checkDictation} disabled={answer.trim() === ''}>Controlla</button>
				{:else}
					<p class="verdict" class:ok={!gameOver} class:ko={gameOver}>
						{#if gameOver}
							Era <strong>{dictation.n.toLocaleString('en-US')}</strong> ({dictation.reading}). Serie: {streak}
						{:else}
							{isRecord ? '🏆 Nuovo record!' : '✓ Giusto!'} — {dictation.reading}
						{/if}
					</p>
					<button class="proceed" onclick={proceed}>{gameOver ? '🔁 Rigioca' : 'Avanti →'}</button>
				{/if}
			</article>
		{:else if game.kind === 'shop' && shop}
			<article class="game-card">
				<p class="game-hint">🛒 Il commesso dice il totale — paga esatto</p>
				<button class="replay" onclick={() => speakSentenceJapanese(shopPhrase)}>🔊 Riascolta</button>
				<div class="till">
					<span class="till-label">Stai porgendo</span>
					<span class="till-amount">¥{tendered.toLocaleString('en-US')}</span>
				</div>
				<div class="denoms">
					{#each YEN_DENOMINATIONS as d}
						<button class="denom" class:coin={d < 1000} disabled={checked} onclick={() => addDenom(d)}>
							¥{d.toLocaleString('en-US')}
						</button>
					{/each}
				</div>
				{#if !checked}
					<div class="till-actions">
						<button class="mini" onclick={undo} disabled={stack.length === 0}>↩︎ Annulla</button>
						<button class="mini" onclick={resetTender} disabled={tendered === 0}>↺ Svuota</button>
						<button class="proceed" onclick={payNow} disabled={tendered === 0}>💴 Paga</button>
					</div>
				{:else}
					<p class="clerk">🧑‍💼「{clerkReply}」</p>
					<p class="verdict" class:ok={!gameOver} class:ko={gameOver}>
						{#if gameOver}
							Era <strong>¥{shop.n.toLocaleString('en-US')}</strong> ({shop.reading}えん). Hai dato ¥{tendered.toLocaleString('en-US')}. Serie: {streak}
						{:else}
							{isRecord ? '🏆 Nuovo record!' : '✓ Pagato giusto!'} — {shop.reading}えん
						{/if}
					</p>
					<button class="proceed" onclick={proceed}>{gameOver ? '🔁 Rigioca' : 'Avanti →'}</button>
				{/if}
			</article>
		{:else if game.kind === 'appt' && appt}
			<article class="game-card">
				<p class="game-hint">📅 Quando è l'appuntamento?</p>
				<button class="replay" onclick={() => speakSentenceJapanese(appt!.reading)}>🔊 Riascolta</button>
				<div class="appt-grid">
					<label class="appt-field"><span>Mese</span><input type="text" inputmode="numeric" bind:value={apptIn.month} disabled={checked} /></label>
					<label class="appt-field"><span>Giorno</span><input type="text" inputmode="numeric" bind:value={apptIn.day} disabled={checked} /></label>
					<label class="appt-field"><span>Ora</span><input type="text" inputmode="numeric" bind:value={apptIn.hour} disabled={checked} /></label>
					<label class="appt-field"><span>Minuti</span><input type="text" inputmode="numeric" bind:value={apptIn.minute} disabled={checked} onkeydown={(e) => { if (e.key === 'Enter') checkAppt(); }} /></label>
				</div>
				{#if !checked}
					<button class="proceed" onclick={checkAppt}>Controlla</button>
				{:else}
					<p class="verdict" class:ok={!gameOver} class:ko={gameOver}>
						{#if gameOver}
							Era <strong>{appt.month}/{appt.day} · {appt.hour}:{String(appt.minute).padStart(2, '0')}</strong> ({appt.reading}). Serie: {streak}
						{:else}
							{isRecord ? '🏆 Nuovo record!' : '✓ Giusto!'} — {appt.reading}
						{/if}
					</p>
					<button class="proceed" onclick={proceed}>{gameOver ? '🔁 Rigioca' : 'Avanti →'}</button>
				{/if}
			</article>
		{:else if game.kind === 'order' && order}
			<article class="game-card">
				<p class="game-hint">🏪 Ordina al commesso: di' la quantità giusta</p>
				<div class="order-ref">
					{#each order.list as r, i}
						<span class="ref-item" class:current={i === order.idx}>{r.item.emoji}×{r.qty}</span>
					{/each}
				</div>
				<p class="game-prompt small">{order.list[order.idx].item.emoji} {order.list[order.idx].item.scrittura}</p>
				<p class="prompt-it">「{order.list[order.idx].item.scrittura}を ___ ください」 · {orderDisplay === 'kanji' ? 'in kanji' : 'in lettura'}</p>
				<div class="choices">
					{#each choices as choice (choice)}
						<button class="choice" class:right={picked !== null && !!question && choice === question.correct} class:wrong={picked === choice && !!question && choice !== question.correct} disabled={picked !== null} onclick={() => pick(choice)}>{choice}</button>
					{/each}
				</div>
				{#if picked !== null && question}
					{#if gameOver}
						<p class="verdict ko">Era <strong>{question.correct}</strong>. Serie: {streak}</p>
						<button class="proceed" onclick={proceed}>🔁 Rigioca</button>
					{:else}
						<p class="verdict ok">{isRecord ? '🏆 Nuovo record!' : order.idx < order.list.length - 1 ? '✓ Bene!' : '✓ Ordine completo!'}</p>
						<button class="proceed" onclick={proceed}>{order.idx < order.list.length - 1 ? 'Prossimo →' : 'Ordine completo →'}</button>
					{/if}
				{/if}
			</article>
		{:else if game.kind === 'greet' && greet}
			<article class="game-card">
				{#if greet.ja}
					<p class="game-hint">Cosa rispondi?</p>
					<button class="replay" onclick={() => speakGender(greet!.ja!, opposite(userGender()))}>🔊 Riascolta</button>
					<p class="game-prompt small">{greet.ja}</p>
					<p class="prompt-it">{greet.it}</p>
				{:else}
					<p class="game-hint">Cosa dici in questa situazione?</p>
					<p class="prompt-it big">{greet.it}</p>
				{/if}
				{#if canSpeak && picked === null}
					<button class="mic" class:listening={micState === 'listening'} onclick={speakGreetGame}>
						{micState === 'listening' ? '🎙️ Ti ascolto… parla!' : '🎤 Dillo a voce'}
					</button>
					<HeardDiff {heard} candidates={greet.choices} />
				{/if}
				<div class="choices">
					{#each choices as choice (choice)}
						<button class="choice" class:right={picked !== null && choice === greet.correct} class:wrong={picked === choice && choice !== greet.correct} disabled={picked !== null} onclick={() => pickGreet(choice)}>{choice}</button>
					{/each}
				</div>
				{#if picked !== null}
					{#if gameOver}
						<p class="verdict ko">Era <strong>{greet.correct}</strong>. Serie: {streak}</p>
						<button class="proceed" onclick={proceed}>🔁 Rigioca</button>
					{:else}
						<p class="verdict ok">{isRecord ? '🏆 Nuovo record!' : '✓ Giusto!'}</p>
						<button class="proceed" onclick={proceed}>Avanti →</button>
					{/if}
				{/if}
			</article>
		{:else if game.kind === 'shopping'}
			<article class="game-card">
				{#if !checked}
					<!-- Fase 1: si ascolta e si prende. La lista NON è mostrata: va ricordata. -->
					<p class="game-hint">🛍️ Ascolta cosa ti serve e riempi il carrello</p>
					<button class="replay" onclick={speakList}>🔊 Riascolta la richiesta</button>
					<div class="shelf">
						{#each grid as item (item.id)}
							{@const have = cart[item.id] ?? 0}
							<button class="product" class:in-cart={have > 0} onclick={() => addToCart(item.id)} oncontextmenu={(e) => { e.preventDefault(); removeFromCart(item.id); }}>
								<span class="prod-emoji">{item.emoji}</span>
								{#if have > 0}<span class="prod-badge">{have}</span>{/if}
							</button>
						{/each}
					</div>
					<p class="shop-tip">Tocca per aggiungere · tocca a lungo / click destro per togliere</p>
					<div class="shop-actions"><button class="mini" onclick={resetCart} disabled={Object.keys(cart).length === 0}>↺ Svuota</button> <button class="proceed" onclick={deliver}>🧺 Ho finito</button></div>
				{:else}
					<!-- Fase 2: si vede la lista, si sente il riepilogo e la risposta. -->
					<p class="game-hint">📋 La lista era:</p>
					<ul class="shop-list">
						{#each shopList as r (r.item.id)}
							{@const have = cart[r.item.id] ?? 0}
							<li class:done={have === r.qty} class:over={have > r.qty} class:manca={have < r.qty}>
								<span class="li-emoji">{r.item.emoji}</span>
								<span class="li-name">{r.item.scrittura}<small>（{r.item.lettura}）</small></span>
								<span class="li-qty">{r.qty}{r.item.counterId}</span>
								<span class="li-have">{have === r.qty ? '✓' : `${have}/${r.qty}`}</span>
							</li>
						{/each}
					</ul>
					{#if confirmText}<p class="you">🙂「{confirmText}」</p>{/if}
					{#if replyText}<p class="clerk">🧑‍🍳「{replyText}」</p>{/if}
					<p class="verdict" class:ok={!gameOver} class:ko={gameOver}>
						{#if gameOver}Serie: {streak}{:else}{isRecord ? '🏆 Nuovo record!' : '✓ Spesa perfetta!'}{/if}
					</p>
					<button class="proceed" onclick={proceed}>{gameOver ? '🔁 Rigioca' : 'Avanti →'}</button>
				{/if}
			</article>
		{/if}
	{/if}
</div>

<style>
	.games-page { display: grid; gap: 14px; }
	.page-title { margin: 0; font-size: 1.3rem; }
	.page-sub { margin: 0; font-size: 0.85rem; color: var(--muted); }
	.group-title { margin: 6px 0 0; font-size: 0.9rem; font-weight: 700; }

	.cat-grid { display: grid; gap: 10px; }
	.cat-card {
		display: grid;
		grid-template-columns: auto 1fr;
		grid-template-rows: auto auto;
		column-gap: 12px;
		align-items: center;
		text-align: left;
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: 14px;
		padding: 12px 14px;
		cursor: pointer;
	}
	.cat-card:hover { border-color: var(--brand); }
	a.cat-card { text-decoration: none; color: var(--ink); }
	.cat-icon { grid-row: 1 / 3; font-size: 1.9rem; }
	.cat-label { font-weight: 700; font-size: 1rem; }
	.cat-hint { font-size: 0.78rem; color: var(--muted); }
	.cat-beta {
		font-size: 0.58rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
		color: var(--warn-ink); background: var(--warn-bg); border: 1px solid var(--warn-border);
		border-radius: 999px; padding: 1px 7px; vertical-align: middle;
	}
	.cat-best { grid-column: 2; font-size: 0.75rem; color: var(--brand); font-weight: 600; margin-top: 2px; }

	.timer-toggle { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; color: var(--ink); cursor: pointer; }
	.timer-note { color: var(--muted); font-size: 0.78rem; }

	.timer-track { height: 8px; border-radius: 999px; background: var(--surface-2); border: 1px solid var(--line); overflow: hidden; }
	.timer-fill { height: 100%; background: var(--brand); transition: width 100ms linear; }
	.timer-fill.low { background: var(--danger); }

	.game-head { display: flex; align-items: center; justify-content: space-between; }
	.quit { background: none; border: 1px solid var(--line); border-radius: 8px; padding: 6px 12px; font-size: 0.82rem; cursor: pointer; color: var(--muted); }
	.score { font-size: 0.9rem; color: var(--ink); }

	.game-card { background: var(--surface); border-radius: 16px; padding: 20px; box-shadow: 0 2px 10px rgba(14,29,51,0.07); display: grid; gap: 14px; }
	.game-hint { margin: 0; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); text-align: center; }
	.game-prompt { margin: 0; font-size: 3rem; font-weight: 800; text-align: center; }
	.count-prompt { font-size: 2rem; line-height: 1.3; overflow-wrap: anywhere; }
	.game-prompt.small { font-size: 2rem; }
	.prompt-it { margin: 0; text-align: center; font-size: 0.9rem; color: var(--muted); }
	.prompt-it.big { font-size: 1.2rem; font-weight: 600; color: var(--ink); }
	.order-ref { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
	.ref-item { font-size: 1rem; padding: 4px 10px; border: 1px solid var(--line); border-radius: 999px; background: var(--surface-2); opacity: 0.55; }
	.ref-item.current { opacity: 1; border-color: var(--brand); font-weight: 700; }
	.choices { display: grid; gap: 8px; }
	.choice { padding: 12px 14px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface-2); color: var(--ink); font-size: 1.25rem; text-align: center; cursor: pointer; }
	.choice:hover:not(:disabled) { border-color: var(--brand); }
	.choice:disabled { cursor: default; }
	.choice.right { border-color: var(--success); background: rgba(52,201,138,0.16); }
	.choice.wrong { border-color: var(--danger); background: rgba(239,107,107,0.16); }

	.replay { justify-self: center; background: var(--surface-2); border: 1px solid var(--line); border-radius: 999px; padding: 8px 18px; font-size: 1rem; cursor: pointer; color: var(--ink); }
	.mic { justify-self: center; padding: 10px 20px; border-radius: 999px; border: 1.5px solid var(--brand); background: var(--surface); color: var(--brand); font-weight: 700; font-size: 0.95rem; cursor: pointer; }
	.mic.listening { background: rgba(239,107,107,0.12); border-color: var(--danger); color: var(--danger); animation: micpulse 1s ease-in-out infinite; }
	@keyframes micpulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
	.num-input { justify-self: center; width: 60%; text-align: center; font-size: 1.8rem; font-weight: 700; padding: 8px 10px; border: 1.5px solid var(--line); border-radius: 10px; background: var(--surface-2); color: var(--ink); }
	.num-input:focus { border-color: var(--brand); outline: none; }

	.till { display: grid; gap: 2px; justify-items: center; }
	.till-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
	.till-amount { font-size: 2.2rem; font-weight: 800; }
	.denoms { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
	.denom { padding: 12px 6px; border-radius: 10px; border: 1.5px solid var(--gold-border); background: var(--gold-bg); color: var(--gold-ink); font-weight: 700; font-size: 1rem; cursor: pointer; }
	.denom.coin { border-color: var(--line); background: var(--surface-2); color: var(--ink); }
	.denom:hover:not(:disabled) { filter: brightness(0.96); }
	.denom:disabled { opacity: 0.5; cursor: default; }
	.till-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; align-items: center; }
	.mini { padding: 8px 12px; border-radius: 8px; border: 1px solid var(--line); background: var(--surface-2); color: var(--muted); font-size: 0.82rem; cursor: pointer; }
	.mini:disabled { opacity: 0.4; cursor: default; }

	.appt-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
	.appt-field { display: grid; gap: 4px; justify-items: center; }
	.appt-field span { font-size: 0.72rem; color: var(--muted); font-weight: 600; }
	.appt-field input { width: 100%; text-align: center; font-size: 1.4rem; font-weight: 700; padding: 6px 4px; border: 1.5px solid var(--line); border-radius: 8px; background: var(--surface-2); color: var(--ink); }
	.appt-field input:focus { border-color: var(--brand); outline: none; }

	.shop-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
	.shop-list li { display: grid; grid-template-columns: auto 1fr auto auto; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface-2); }
	.shop-list li.done { border-color: var(--success); background: rgba(52,201,138,0.12); }
	.shop-list li.over { border-color: var(--danger); background: rgba(239,107,107,0.12); }
	.shop-list li.manca { border-color: #d97706; background: rgba(217,119,6,0.12); }
	.li-emoji { font-size: 1.4rem; }
	.li-name { font-size: 0.95rem; font-weight: 600; }
	.li-name small { color: var(--muted); font-weight: 400; font-size: 0.75rem; }
	.li-qty { font-size: 1rem; font-weight: 700; }
	.li-have { font-size: 0.8rem; color: var(--muted); min-width: 34px; text-align: right; }

	.shelf { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
	.product { position: relative; aspect-ratio: 1; display: grid; place-items: center; border: 1.5px solid var(--line); border-radius: 12px; background: var(--surface-2); cursor: pointer; }
	.product:hover:not(:disabled) { border-color: var(--brand); }
	.product.in-cart { border-color: var(--brand); background: var(--info-bg); }
	.product:disabled { cursor: default; }
	.prod-emoji { font-size: 2rem; }
	.prod-badge { position: absolute; top: -6px; right: -6px; min-width: 20px; height: 20px; padding: 0 5px; display: grid; place-items: center; border-radius: 999px; background: var(--brand); color: #fff; font-size: 0.75rem; font-weight: 700; }
	.shop-tip { margin: 0; text-align: center; font-size: 0.72rem; color: var(--muted); }
	.shop-actions { display: flex; gap: 8px; justify-content: center; align-items: center; }

	.clerk { margin: 0; text-align: center; font-size: 1rem; font-weight: 600; color: var(--ink); }
	.you { margin: 0; text-align: center; font-size: 1rem; font-weight: 600; color: var(--brand); }

	.verdict { margin: 0; text-align: center; font-size: 0.95rem; font-weight: 600; }
	.verdict.ok { color: var(--success); }
	.verdict.ko { color: var(--danger); }
	.proceed { justify-self: center; padding: 8px 20px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 600; cursor: pointer; }
	.proceed:disabled { opacity: 0.5; cursor: default; }

	.back-link { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
</style>
