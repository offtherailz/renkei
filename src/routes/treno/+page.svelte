<script lang="ts">
	import ScriptLog from '$lib/components/ScriptLog.svelte';
	import RepeatBar from '$lib/components/RepeatBar.svelte';
	import HeardDiff from '$lib/components/HeardDiff.svelte';
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { STATIONS, type Station } from '$lib/core/stations';
	import { readNumber, YEN_DENOMINATIONS } from '$lib/core/counterGen';
	import { recordPractice } from '$lib/core/practiceMiss';
	import { speechAvailable, listenJapanese, speechMatches } from '$lib/core/speech';
	import { speakSentenceJapanese, speakSentenceJapaneseAsync, speakSequence } from '$lib/core/tts';
	import { voiceParams, primeVoices, opposite, type Gender } from '$lib/core/voices';
	import { appState } from '$lib/stores.svelte';
	import { shuffle } from '$lib/core/gameKit';

	function userGender(): Gender {
		return appState.settings.voce_utente ?? 'femminile';
	}
	function friend(): Gender {
		return opposite(userGender());
	}
	// Gli annunci in stazione/treno in Giappone sono quasi sempre voce femminile.
	const ANNO: Gender = 'femminile';
	const rnd = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)]!;

	type Who = 'me' | 'friend' | 'anno';
	type Line = { who: Who; text: string };
	let dialog = $state<Line[]>([]);
	function pushLine(who: Who, text: string): void {
		const last = dialog[dialog.length - 1];
		if (last && last.who === who && last.text === text) return;
		dialog = [...dialog, { who, text }];
	}
	function genderOf(who: Who): Gender {
		return who === 'me' ? userGender() : who === 'friend' ? friend() : ANNO;
	}
	function say(who: Who, text: string): void {
		speakSentenceJapanese(text, voiceParams(genderOf(who)));
		pushLine(who, text);
	}
	function sequence(lines: Line[]): void {
		speakSequence(lines.map((l) => ({ text: l.text, options: voiceParams(genderOf(l.who)) })));
		for (const l of lines) pushLine(l.who, l.text);
	}


	// ── Frasi (varianti) ──
	const MISSION = (t: Station) => [
		`もしもし？今日は${t.nome}で会おうよ！電車で来てね。駅で待ってるから。`,
		`ねえ、${t.nome}駅まで電車で来てくれる？駅の前で待ち合わせね！`,
		`今日は${t.nome}に行こう！${t.nome}駅で待ってるね。電車で来てね。`
	];
	const FRIEND_HELLO = [
		'よく来たね！じゃあ、行こう！',
		'来てくれてありがとう！じゃあ、行こうか。',
		'お疲れさま！迷わなかった？じゃあ、行こう！'
	];
	const MANNER = [
		'車内では携帯電話をマナーモードに設定の上、通話はお控えください。ご協力をお願いいたします。',
		'この列車には優先席があります。優先席を必要とされるお客様がいらっしゃいましたら、席をお譲りください。',
		'駆け込み乗車は大変危険ですので、おやめください。'
	];
	const TRANSFER_LINES = ['中央線', '地下鉄銀座線', '京浜東北線', '湘南新宿ライン'];

	type Scene = 'intro' | 'mission' | 'ticket' | 'delay' | 'platform' | 'board' | 'ride' | 'exit' | 'done';
	let scene = $state<Scene>('intro');
	let errors = $state(0);
	let showScript = $state(false);

	// destinazione
	let target = $state<Station>(STATIONS[0]!);
	let missionLine = $state('');
	let missionChoices = $state<Station[]>([]);
	let missionPicked = $state<string | null>(null);

	// biglietto (macchinetta)
	let ticketLine = $state('');
	let tendered = $state(0);
	let stack = $state<number[]>([]);
	let ticketDone = $state(false);
	let ticketAttempts = $state(0);

	// imprevisto: servizio sospeso (運転見合わせ)
	const DELAY_REASONS = [
		{ jp: '人身事故', it: 'incidente a persone' },
		{ jp: '強風', it: 'vento forte' },
		{ jp: '安全確認', it: 'controlli di sicurezza' }
	];
	let delayReason = $state(DELAY_REASONS[0]!);
	let delayLine = $state('');
	let delayPicked = $state<string | null>(null);

	// binario
	let platformN = $state(1);
	let platLine = $state('');
	let platPicked = $state<number | null>(null);

	// treni in arrivo
	type Train = { display: string; announce: string; ok: boolean };
	let trains = $state<Train[]>([]);
	let trainIdx = $state(0);
	let trainPicked = $state<boolean | null>(null);
	let trainMsg = $state('');

	// viaggio
	type Stop = { st: Station; lines: string[]; side: '右側' | '左側' };
	let stops = $state<Stop[]>([]);
	let stopIdx = $state(0);
	let ridePicked = $state<boolean | null>(null);
	let rideMsg = $state('');
	let mannerLine = $state('');

	// uscita
	let exitPicked = $state<string | null>(null);

	onMount(() => {
		primeVoices();
		canSpeak = speechAvailable();
	});

	// ── Rispondi a voce: di' la stazione che hai capito ──
	let canSpeak = $state(false);
	let micState = $state<'idle' | 'listening'>('idle');
	let heard = $state('');
	async function speakMission(): Promise<void> {
		if (micState !== 'idle' || missionPicked === target.id) return;
		micState = 'listening';
		heard = '';
		const alts = await listenJapanese();
		micState = 'idle';
		if (alts.length === 0) {
			heard = '（何も聞こえませんでした…riprova）';
			return;
		}
		heard = alts[0]!;
		const hit = missionChoices.find((s) => speechMatches(alts, [[s.nome, s.lettura]]));
		if (hit) pickMission(hit, true);
	}

	function start(): void {
		errors = 0;
		dialog = [];
		showScript = false;
		target = rnd(STATIONS);
		missionLine = rnd(MISSION(target));
		missionChoices = shuffle([target, ...shuffle(STATIONS.filter((s) => s.id !== target.id)).slice(0, 3)]);
		missionPicked = null;
		scene = 'mission';
		say('friend', missionLine);
	}

	function pickMission(s: Station, viaVoce = false): void {
		if (missionPicked === target.id) return;
		missionPicked = s.id;
		if (s.id !== target.id) {
			errors += 1;
			return;
		}
		const frase = `わかった！${target.nome}だね。じゃあ、あとで！`;
		if (viaVoce) pushLine('me', frase);
		else say('me', frase);
	}

	// ── Biglietto ──
	function enterTicket(): void {
		scene = 'ticket';
		tendered = 0;
		stack = [];
		ticketDone = false;
		ticketAttempts = 0;
		ticketLine = `${target.nome}までは、${readNumber(target.prezzo)}えんです。`;
		say('anno', ticketLine);
	}
	function addDenom(d: number): void {
		if (ticketDone) return;
		stack = [...stack, d];
		tendered += d;
	}
	function undo(): void {
		if (ticketDone || stack.length === 0) return;
		tendered -= stack[stack.length - 1]!;
		stack = stack.slice(0, -1);
	}
	function resetTender(): void {
		if (ticketDone) return;
		stack = [];
		tendered = 0;
	}
	function buyTicket(): void {
		if (tendered === 0) return;
		if (tendered === target.prezzo) {
			ticketDone = true;
			say('anno', 'きっぷをお取りください。ありがとうございます。');
		} else {
			ticketAttempts += 1;
			errors += 1;
			/* giochi: niente penalità */
			say('anno', `${readNumber(target.prezzo)}えんです。`);
			resetTender();
		}
	}
	function giveUpTicket(): void {
		ticketDone = true;
		say('anno', 'きっぷをお取りください。');
	}

	// ── Imprevisto: 運転を見合わせています ──
	function afterTicket(): void {
		if (Math.random() < 0.3) enterDelay();
		else enterPlatform();
	}
	function enterDelay(): void {
		scene = 'delay';
		delayReason = rnd(DELAY_REASONS);
		delayPicked = null;
		delayLine = `${delayReason.jp}の影響で、山手線は運転を見合わせています。運転再開まで、しばらくお待ちください。`;
		say('anno', delayLine);
	}
	function pickDelay(jp: string): void {
		if (delayPicked === delayReason.jp) return;
		delayPicked = jp;
		if (jp !== delayReason.jp) errors += 1;
	}
	function resumeService(): void {
		say('anno', 'ご迷惑をおかけしました。まもなく、運転を再開いたします。');
		enterPlatform();
	}

	// ── Binario ──
	function enterPlatform(): void {
		scene = 'platform';
		platformN = 1 + Math.floor(Math.random() * 4);
		platPicked = null;
		platLine = `間もなく、${readNumber(platformN)}番線に電車が参ります。危ないですから、黄色い線の内側までお下がりください。`;
		say('anno', platLine);
	}
	function pickPlatform(n: number): void {
		if (platPicked === platformN) return;
		platPicked = n;
		if (n !== platformN) errors += 1;
		if (n === platformN) void recordPractice('counter:番', true);
	}

	// ── Salire sul treno giusto ──
	function makeCorrectTrain(): Train {
		const loop = rnd(['外回り', '内回り']);
		return {
			display: `山手線 ${target.nome}方面`,
			announce: `この電車は山手線${loop}・各駅停車、${target.nome}方面行きです。`,
			ok: true
		};
	}
	function enterBoard(): void {
		scene = 'board';
		const wrongDir = rnd(STATIONS.filter((s) => s.id !== target.id));
		const beyond = rnd(STATIONS.filter((s) => s.id !== target.id && s.id !== wrongDir.id));
		const wrongs: Train[] = shuffle([
			{ display: '回送', announce: 'この電車は回送です。ご乗車になれません。', ok: false },
			{
				display: `山手線 ${wrongDir.nome}方面`,
				announce: `この電車は山手線、${wrongDir.nome}方面行きです。`,
				ok: false
			},
			{
				display: `快速 ${beyond.nome}方面`,
				announce: `この電車は快速、${beyond.nome}方面行きです。${target.nome}には止まりません。ご注意ください。`,
				ok: false
			}
		]);
		const nWrong = Math.floor(Math.random() * 3); // 0, 1 o 2 treni sbagliati prima
		trains = [...wrongs.slice(0, nWrong), makeCorrectTrain()];
		trainIdx = 0;
		trainPicked = null;
		trainMsg = '';
		say('anno', trains[0]!.announce);
	}
	function nextTrain(appendCorrect: boolean): void {
		if (appendCorrect) trains = [...trains, makeCorrectTrain()];
		trainIdx += 1;
		trainPicked = null;
		trainMsg = '';
		say('anno', trains[trainIdx]!.announce);
	}
	function pickTrain(boardIt: boolean): void {
		if (trainPicked !== null) return;
		const t = trains[trainIdx]!;
		trainPicked = boardIt;
		if (boardIt === t.ok) {
			if (boardIt) {
				say('me', 'この電車だ！乗ろう。');
				trainMsg = 'ok-board';
			} else {
				trainMsg = 'ok-skip';
			}
		} else {
			errors += 1;
			if (boardIt) {
				say('me', 'あ、違う電車だ！降りよう。');
				trainMsg = 'wrong-board';
			} else {
				say('me', 'あ、あの電車だったのに！');
				trainMsg = 'wrong-skip';
			}
		}
	}
	function afterTrain(): void {
		const t = trains[trainIdx]!;
		if (trainPicked === t.ok && t.ok) {
			enterRide();
			return;
		}
		// treno lasciato passare (giusto o sbagliato): arriva il prossimo
		nextTrain(trainIdx === trains.length - 1);
	}

	// ── In viaggio ──
	function enterRide(): void {
		scene = 'ride';
		const others = shuffle(STATIONS.filter((s) => s.id !== target.id)).slice(0, 2 + Math.floor(Math.random() * 2));
		stops = [...others, target].map((st, i, arr) => {
			const side: '右側' | '左側' = Math.random() < 0.5 ? '右側' : '左側';
			const lines = [`次は${st.nome}、${st.nome}です。`];
			if (i === arr.length - 1 || Math.random() < 0.6) lines.push(`お出口は${side}です。`);
			if (Math.random() < 0.4) lines.push(`${rnd(TRANSFER_LINES)}はお乗り換えです。`);
			return { st, lines, side };
		});
		stopIdx = 0;
		ridePicked = null;
		rideMsg = '';
		mannerLine = rnd(MANNER);
		sequence([
			{ who: 'anno', text: mannerLine },
			{ who: 'anno', text: stops[0]!.lines.join('') }
		]);
	}
	function announceStop(): void {
		ridePicked = null;
		rideMsg = '';
		say('anno', stops[stopIdx]!.lines.join(''));
	}
	function pickRide(getOff: boolean): void {
		if (ridePicked !== null) return;
		const atTarget = stops[stopIdx]!.st.id === target.id;
		ridePicked = getOff;
		if (getOff === atTarget) {
			if (getOff) {
				say('me', 'すみません、降ります！');
				rideMsg = 'ok-off';
			} else {
				rideMsg = 'ok-stay';
			}
		} else {
			errors += 1;
			if (getOff) {
				say('me', 'あ、ここじゃない！次の電車に乗ろう。');
				rideMsg = 'wrong-off';
			} else {
				sequence([
					{ who: 'anno', text: `終点、${rnd(STATIONS.filter((s) => s.id !== target.id)).nome}です。ご乗車ありがとうございました。` },
					{ who: 'me', text: '乗り過ごした！戻ろう…' }
				]);
				rideMsg = 'wrong-stay';
			}
		}
	}
	function afterRide(): void {
		const atTarget = stops[stopIdx]!.st.id === target.id;
		if (ridePicked === true && atTarget) {
			exitPicked = null;
			scene = 'exit';
			return;
		}
		if (ridePicked === false && atTarget) {
			// tornati indietro: si riannuncia la fermata giusta
			announceStop();
			return;
		}
		stopIdx += 1;
		announceStop();
	}

	// ── Uscita ──
	function pickExit(side: string): void {
		if (exitPicked === stops[stopIdx]!.side) return;
		exitPicked = side;
		if (side !== stops[stopIdx]!.side) errors += 1;
	}
	function toDone(): void {
		scene = 'done';
		sequence([
			{ who: 'me', text: 'お待たせ！' },
			{ who: 'friend', text: rnd(FRIEND_HELLO) }
		]);
	}
</script>

{#snippet repeatBar(line: string, who: Who)}
	<RepeatBar {line} gender={genderOf(who)} />
{/snippet}

<div class="treno">
	<div class="nav">
		<a class="back" href="{base}/avventure">← Avventure</a>
		{#if dialog.length > 0}
			<button class="script-toggle" onclick={() => (showScript = !showScript)}>📜 Copione ({dialog.length})</button>
		{/if}
	</div>
	{#if showScript}
		<ScriptLog lines={dialog} icons={{ anno: '📢', friend: '🧑' }} accents={{ friend: 'var(--warn-border)' }} />
	{/if}

	{#if scene === 'intro'}
		<article class="scene">
			<h1 class="page-title">🚃 電車（でんしゃ）</h1>
			<p class="hint">Un amico ti chiama: dove dovete vedervi? Compra il biglietto, trova il binario, sali sul treno giusto e scendi alla fermata giusta.</p>
			<button class="proceed" onclick={start}>📞 Rispondi al telefono</button>
		</article>
	{:else if scene === 'mission'}
		<article class="scene">
			<p class="who">🧑 Al telefono</p>
			<p class="bubble">{missionLine}</p>
			{@render repeatBar(missionLine, 'friend')}
			<p class="hint">Dove ti aspetta? Scegli la stazione — o dillo a voce.</p>
			{#if canSpeak && missionPicked !== target.id}
				<button class="mic" class:listening={micState === 'listening'} onclick={speakMission}>
					{micState === 'listening' ? '🎙️ Ti ascolto… parla!' : '🎤 Dillo a voce'}
				</button>
				<HeardDiff {heard} candidates={missionChoices.flatMap((s) => [s.nome, s.lettura])} />
			{/if}
			<div class="choices">
				{#each missionChoices as s (s.id)}
					<button
						class="choice"
						class:right={missionPicked !== null && s.id === target.id && missionPicked === target.id}
						class:wrong={missionPicked === s.id && s.id !== target.id}
						onclick={() => pickMission(s)}
					>{s.nome}<small>（{s.lettura}）</small></button>
				{/each}
			</div>
			{#if missionPicked !== null && missionPicked !== target.id}
				<p class="hint">Non era quella: riascolta e riprova.</p>
			{/if}
			{#if missionPicked === target.id}
				<button class="proceed" onclick={enterTicket}>🚉 Vai in stazione →</button>
			{/if}
		</article>
	{:else if scene === 'ticket'}
		<article class="scene">
			<p class="who">🎫 La macchinetta dei biglietti</p>
			<p class="bubble">{ticketLine}</p>
			{@render repeatBar(ticketLine, 'anno')}
			{#if !ticketDone}
				<div class="till"><span class="till-label">Stai inserendo</span><span class="till-amount">¥{tendered.toLocaleString('en-US')}</span></div>
				<div class="denoms">
					{#each YEN_DENOMINATIONS as d}
						<button class="denom" class:coin={d < 1000} onclick={() => addDenom(d)}>¥{d.toLocaleString('en-US')}</button>
					{/each}
				</div>
				<div class="till-actions">
					<button class="mini" onclick={undo} disabled={stack.length === 0}>↩︎ Annulla</button>
					<button class="mini" onclick={resetTender} disabled={tendered === 0}>↺ Svuota</button>
					<button class="proceed" onclick={buyTicket} disabled={tendered === 0}>🎫 Compra</button>
				</div>
				{#if ticketAttempts >= 3}
					<button class="giveup" onclick={giveUpTicket}>🏳️ Mi arrendo (metto i soldi giusti)</button>
				{/if}
			{:else}
				<p class="bubble sm">🎫 Biglietto per {target.nome} comprato!</p>
				<button class="proceed" onclick={afterTicket}>Ai binari →</button>
			{/if}
		</article>
	{:else if scene === 'delay'}
		<article class="scene">
			<p class="who">⚠️ Annuncio in stazione — qualcosa non va</p>
			<p class="bubble">{delayLine}</p>
			{@render repeatBar(delayLine, 'anno')}
			<p class="hint">Perché i treni sono fermi?</p>
			<div class="choices">
				{#each DELAY_REASONS as r (r.jp)}
					<button
						class="choice"
						class:right={delayPicked !== null && r.jp === delayReason.jp && delayPicked === delayReason.jp}
						class:wrong={delayPicked === r.jp && r.jp !== delayReason.jp}
						onclick={() => pickDelay(r.jp)}
					>{r.jp}<small>（{r.it}）</small></button>
				{/each}
			</div>
			{#if delayPicked !== null && delayPicked !== delayReason.jp}
				<p class="hint">No, riascolta l'annuncio.</p>
			{/if}
			{#if delayPicked === delayReason.jp}
				<button class="proceed" onclick={resumeService}>Il servizio riprende →</button>
			{/if}
		</article>
	{:else if scene === 'platform'}
		<article class="scene">
			<p class="who">📢 Annuncio in stazione</p>
			<p class="bubble">{platLine}</p>
			{@render repeatBar(platLine, 'anno')}
			<p class="hint">A che binario arriva il treno?</p>
			<div class="choices plat">
				{#each [1, 2, 3, 4] as n (n)}
					<button
						class="choice"
						class:right={platPicked !== null && n === platformN && platPicked === platformN}
						class:wrong={platPicked === n && n !== platformN}
						onclick={() => pickPlatform(n)}
					>{n}番線</button>
				{/each}
			</div>
			{#if platPicked !== null && platPicked !== platformN}
				<p class="hint">No, riascolta l'annuncio.</p>
			{/if}
			{#if platPicked === platformN}
				<button class="proceed" onclick={enterBoard}>Al binario {platformN} →</button>
			{/if}
		</article>
	{:else if scene === 'board'}
		{@const t = trains[trainIdx]}
		<article class="scene">
			<p class="who">🚉 Binario {platformN} — arriva un treno</p>
			<p class="train-display">🚃 <span>{t.display}</span></p>
			<p class="bubble">{t.announce}</p>
			{@render repeatBar(t.announce, 'anno')}
			<p class="hint">Devi andare a {target.nome}. Sali?</p>
			{#if trainPicked === null}
				<div class="choices">
					<button class="choice" onclick={() => pickTrain(true)}>🚃 乗ります</button>
					<button class="choice" onclick={() => pickTrain(false)}>🙅 見送ります</button>
				</div>
			{:else}
				{#if trainMsg === 'ok-board'}
					<p class="bubble sm">✅ È quello giusto: si parte!</p>
				{:else if trainMsg === 'ok-skip'}
					<p class="bubble sm">✅ Ben fatto: quello non era il tuo treno.</p>
				{:else if trainMsg === 'wrong-board'}
					<p class="bubble sm">❌ Treno sbagliato! Scendi e aspetta il prossimo.</p>
				{:else}
					<p class="bubble sm">❌ Era proprio il tuo! Aspetta il prossimo.</p>
				{/if}
				<button class="proceed" onclick={afterTrain}>{trainMsg === 'ok-board' ? '出発！ →' : 'Prossimo treno →'}</button>
			{/if}
		</article>
	{:else if scene === 'ride'}
		{@const s = stops[stopIdx]}
		<article class="scene">
			<p class="who">🚃 In viaggio — fermata {stopIdx + 1}</p>
			<p class="bubble">{s.lines.join('')}</p>
			{@render repeatBar(s.lines.join(''), 'anno')}
			<p class="hint">Devi scendere a {target.nome}. Che fai?</p>
			{#if ridePicked === null}
				<div class="choices">
					<button class="choice" onclick={() => pickRide(true)}>🚪 降ります</button>
					<button class="choice" onclick={() => pickRide(false)}>🪑 そのまま</button>
				</div>
			{:else}
				{#if rideMsg === 'ok-off'}
					<p class="bubble sm">✅ È la tua fermata!</p>
				{:else if rideMsg === 'ok-stay'}
					<p class="bubble sm">✅ Giusto, non è ancora la tua.</p>
				{:else if rideMsg === 'wrong-off'}
					<p class="bubble sm">❌ Sei sceso troppo presto! Riprendi il treno.</p>
				{:else}
					<p class="bubble sm">❌ L'hai passata! Torna indietro di una fermata.</p>
				{/if}
				<button class="proceed" onclick={afterRide}>{rideMsg === 'ok-off' ? 'Scendi →' : '→'}</button>
			{/if}
		</article>
	{:else if scene === 'exit'}
		{@const s = stops[stopIdx]}
		<article class="scene">
			<p class="who">🚪 Le porte si aprono…</p>
			<p class="hint">Da che lato era l'uscita? (l'ha detto l'annuncio)</p>
			{@render repeatBar(s.lines.join(''), 'anno')}
			<div class="choices plat">
				<button class="choice" class:right={exitPicked !== null && s.side === '左側' && exitPicked === s.side} class:wrong={exitPicked === '左側' && s.side !== '左側'} onclick={() => pickExit('左側')}>⬅️ 左側</button>
				<button class="choice" class:right={exitPicked !== null && s.side === '右側' && exitPicked === s.side} class:wrong={exitPicked === '右側' && s.side !== '右側'} onclick={() => pickExit('右側')}>➡️ 右側</button>
			</div>
			{#if exitPicked !== null && exitPicked !== s.side}
				<p class="hint">No, riascolta l'annuncio.</p>
			{/if}
			{#if exitPicked === s.side}
				<button class="proceed" onclick={toDone}>Esci dalla stazione →</button>
			{/if}
		</article>
	{:else if scene === 'done'}
		<article class="scene">
			<p class="who">{errors === 0 ? '🎉 Perfetto!' : '📝 Arrivato!'}</p>
			<p class="bubble">🧑「{dialog[dialog.length - 1]?.text}」</p>
			<p class="hint">Sei arrivato a {target.nome} · {errors === 0 ? 'nessun errore!' : `errori: ${errors}`}</p>
			<ScriptLog lines={dialog} icons={{ anno: '📢', friend: '🧑' }} accents={{ friend: 'var(--warn-border)' }} title="📜 Il viaggio di oggi" />
			<button class="proceed" onclick={start}>🔁 Un altro viaggio</button>
		</article>
	{/if}
</div>

<style>
	.treno { display: grid; gap: 14px; }
	.nav { margin-bottom: 2px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
	.script-toggle { background: var(--surface-2); border: 1px solid var(--line); border-radius: 999px; padding: 5px 12px; font-size: 0.8rem; cursor: pointer; color: var(--ink); }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.page-title { margin: 0; font-size: 1.3rem; text-align: center; }

	.scene { background: var(--surface); border-radius: 16px; padding: 20px; box-shadow: 0 2px 10px rgba(14,29,51,0.07); display: grid; gap: 14px; }
	.who { margin: 0; font-size: 0.9rem; font-weight: 700; }
	.hint { margin: 0; text-align: center; font-size: 0.82rem; color: var(--muted); }
	.bubble { margin: 0; text-align: center; font-size: 1.1rem; font-weight: 600; background: var(--surface-2); border-radius: 12px; padding: 12px; }
	.bubble.sm { font-size: 0.95rem; }
	.mic { justify-self: center; padding: 10px 20px; border-radius: 999px; border: 1.5px solid var(--brand); background: var(--surface); color: var(--brand); font-weight: 700; font-size: 0.95rem; cursor: pointer; }
	.mic.listening { background: rgba(239,107,107,0.12); border-color: var(--danger); color: var(--danger); animation: micpulse 1s ease-in-out infinite; }
	@keyframes micpulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }

	.train-display { margin: 0; text-align: center; font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 10px; }
	.train-display span { background: #0f172a; color: var(--warn-border); border-radius: 8px; padding: 6px 14px; font-size: 1.1rem; letter-spacing: 0.04em; }

	.choices { display: grid; gap: 8px; }
	.choices.plat { grid-template-columns: repeat(2, 1fr); }
	.choice { padding: 12px 14px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface-2); color: var(--ink); font-size: 1.2rem; text-align: center; cursor: pointer; display: flex; flex-direction: column; gap: 2px; align-items: center; }
	.choice small { color: var(--muted); font-size: 0.72rem; }
	.choice:hover { border-color: var(--brand); }
	.choice.right { border-color: var(--success); background: rgba(52,201,138,0.16); }
	.choice.wrong { border-color: var(--danger); background: rgba(239,107,107,0.16); }

	.till { display: grid; gap: 2px; justify-items: center; }
	.till-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
	.till-amount { font-size: 2.2rem; font-weight: 800; }
	.denoms { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
	.denom { padding: 12px 6px; border-radius: 10px; border: 1.5px solid var(--gold-border); background: var(--gold-bg); color: var(--gold-ink); font-weight: 700; font-size: 1rem; cursor: pointer; }
	.denom.coin { border-color: var(--line); background: var(--surface-2); color: var(--ink); }
	.till-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; align-items: center; }
	.mini { padding: 8px 12px; border-radius: 8px; border: 1px solid var(--line); background: var(--surface-2); color: var(--muted); font-size: 0.82rem; cursor: pointer; }
	.mini:disabled { opacity: 0.4; cursor: default; }


	.proceed { justify-self: center; padding: 10px 22px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 600; cursor: pointer; }
	.proceed:disabled { opacity: 0.5; cursor: default; }
	.giveup { justify-self: center; padding: 8px 16px; border-radius: 8px; border: 1px solid var(--line); background: transparent; color: var(--muted); font-size: 0.85rem; cursor: pointer; }
</style>
