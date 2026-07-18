<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { db } from '$lib/db/schema';
	import { shuffle, gameSnapshot } from '$lib/core/gameKit';
	import { recordPractice } from '$lib/core/practiceMiss';
	import { speakSentenceJapanese } from '$lib/core/tts';
	import { buildConjugationTable, conjClassKey, detectVerbClass } from '$lib/core/conjugation';
	import { detectUserLocale, pickLocalizedArray } from '$lib/core/i18n';
	import type { Word } from '$lib/types/models';

	// 🧬 Catena di forme (beta, idea utente 17/07): dalla forma dizionario si
	// costruiscono le forme composte UN PASSO ALLA VOLTA (食べる → 食べられる →
	// 食べられない) per capire come nascono le frasi complesse. Le derivate del
	// primo passo si coniugano con regole fisse: il potenziale è sempre ichidan,
	// たい si coniuga da aggettivo in -い, て si concatena.
	const ROUNDS_PER_GAME = 6;
	const locale = detectUserLocale();

	interface ChainDef {
		id: string;
		gram: string | null; // slug gram:* per il credito pratica
		step1Key: string; // chiave nella tabella di coniugazione
		step1Ask: string;
		step2Ask: string;
		derive: (step1: string) => { corretta: string; distrattori: string[] };
		senso: (glossa: string) => string;
		// solo per certe classi (es. il passivo godan, così られる non si confonde
		// col potenziale degli ichidan che è identico)
		onlyClass?: 'godan' | 'ichidan';
		// frase d'esempio curata (verbo rappresentativo, giapponese vero) che
		// mostra la forma finale «come nella frase». Non legata al verbo pescato.
		esempio: { jp: string; it: string };
	}

	const CHAINS: ChainDef[] = [
		{
			id: 'pot-nai',
			gram: 'kanou',
			step1Key: 'potential',
			step1Ask: 'il potenziale (可能形)',
			step2Ask: 'la sua negativa',
			derive: (p) => ({ corretta: p.slice(0, -1) + 'ない', distrattori: [p + 'ない', p.slice(0, -1) + 'なかった'] }),
			senso: (g) => `non riuscire a ${g}`,
			esempio: { jp: '今日は忙しくて、昼ご飯が食べられない。', it: 'Oggi sono occupato e non riesco a mangiare a pranzo.' }
		},
		{
			id: 'pot-ta',
			gram: 'kanou',
			step1Key: 'potential',
			step1Ask: 'il potenziale (可能形)',
			step2Ask: 'il suo passato',
			derive: (p) => ({ corretta: p.slice(0, -1) + 'た', distrattori: [p + 'た', p.slice(0, -1) + 'ない'] }),
			senso: (g) => `essere riuscito a ${g}`,
			esempio: { jp: 'やっと国に電話ができた。', it: 'Finalmente sono riuscito a telefonare al mio Paese.' }
		},
		{
			id: 'tai-neg',
			gram: 'tai',
			step1Key: 'tai',
			step1Ask: 'la desiderativa (たい形)',
			step2Ask: 'la sua negativa',
			derive: (t) => ({ corretta: t.slice(0, -1) + 'くない', distrattori: [t + 'ない', t.slice(0, -1) + 'じゃない'] }),
			senso: (g) => `non aver voglia di ${g}`,
			esempio: { jp: '雨だから、今日はどこにも行きたくない。', it: 'Piove, quindi oggi non ho voglia di andare da nessuna parte.' }
		},
		{
			id: 'tai-past',
			gram: 'tai',
			step1Key: 'tai',
			step1Ask: 'la desiderativa (たい形)',
			step2Ask: 'il suo passato',
			derive: (t) => ({ corretta: t.slice(0, -1) + 'かった', distrattori: [t + 'だった', t.slice(0, -1) + 'くなかった'] }),
			senso: (g) => `volevo ${g}`,
			esempio: { jp: 'あの映画がずっと見たかった。', it: 'Volevo vedere quel film da tanto tempo.' }
		},
		{
			id: 'te-iru',
			gram: 'te-iru',
			step1Key: 'te',
			step1Ask: 'la forma て',
			step2Ask: 'l\'azione in corso (〜ている)',
			derive: (te) => ({ corretta: te + 'いる', distrattori: [te + 'ある', te.slice(0, -1) + 'いる'] }),
			senso: (g) => `stare ${g} (azione in corso)`,
			esempio: { jp: '今、部屋で音楽を聞いている。', it: 'Adesso sto ascoltando musica in camera.' }
		},
		{
			id: 'saseru-nai',
			gram: null,
			step1Key: 'causative',
			step1Ask: 'la causativa (使役形)',
			step2Ask: 'la sua negativa',
			derive: (c) => ({ corretta: c.slice(0, -1) + 'ない', distrattori: [c + 'ない', c.slice(0, -1) + 'なかった'] }),
			senso: (g) => `non far/lasciar ${g}`,
			esempio: { jp: '子供を夜遅くまで遊ばせない。', it: 'Non lascio giocare i bambini fino a tardi.' }
		},
		{
			id: 'ukemi-ta',
			gram: null,
			step1Key: 'passive',
			step1Ask: 'la passiva (受身形)',
			step2Ask: 'il suo passato',
			onlyClass: 'godan',
			derive: (p) => ({ corretta: p.slice(0, -1) + 'た', distrattori: [p + 'た', p.slice(0, -1) + 'ない'] }),
			senso: (g) => `${g}: subìto (mi è stato fatto)`,
			esempio: { jp: '会議で先生に名前を呼ばれた。', it: 'Alla riunione sono stato chiamato per nome dall\'insegnante.' }
		}
	];

	interface Round {
		word: Word;
		chain: ChainDef;
		dict: string;
		glossa: string;
		step1Corretta: string;
		step1Scelte: string[];
		step2Corretta: string;
		step2Scelte: string[];
	}

	type Scene = 'intro' | 'play' | 'done';
	let scene = $state<Scene>('intro');
	let rounds = $state<Round[]>([]);
	let idx = $state(0);
	let score = $state(0);
	let step = $state<1 | 2>(1);
	let picked1 = $state<string | null>(null);
	let picked2 = $state<string | null>(null);
	let loading = $state(true);
	let verbs: Word[] = [];

	export const snapshot = gameSnapshot(
		() => ({ scene, rounds, idx, score, step, picked1, picked2 }),
		(s) => ({ scene, rounds, idx, score, step, picked1, picked2 } = s)
	);

	onMount(async () => {
		const words = (await db.words.toArray()) as Word[];
		verbs = words.filter((w) => w.tipo_jp.startsWith('動詞') && w.classe_verbo_jp);
		loading = false;
	});

	function buildRound(w: Word, chain: ChainDef): Round | null {
		if (chain.onlyClass && detectVerbClass(w) !== chain.onlyClass) return null;
		const table = buildConjugationTable(w);
		const byKey = new Map(table.map((f) => [f.key, f.value]));
		const step1 = byKey.get(chain.step1Key);
		if (!step1) return null;
		// distrattori del passo 1: altre forme vere dello stesso verbo
		const others = table
			.filter((f) => f.key !== chain.step1Key && f.key !== 'dict' && f.value !== step1)
			.map((f) => f.value);
		if (others.length < 2) return null;
		const d2 = chain.derive(step1);
		return {
			word: w,
			chain,
			dict: w.scrittura,
			glossa: pickLocalizedArray(w.significato, locale)[0] ?? '',
			step1Corretta: step1,
			step1Scelte: shuffle([step1, ...shuffle(others).slice(0, 2)]),
			step2Corretta: d2.corretta,
			step2Scelte: shuffle([d2.corretta, ...d2.distrattori])
		};
	}

	function start(): void {
		const qs: Round[] = [];
		const pool = shuffle(verbs);
		let ci = 0;
		for (const w of pool) {
			if (qs.length >= ROUNDS_PER_GAME) break;
			const r = buildRound(w, CHAINS[ci % CHAINS.length]!);
			if (r) {
				qs.push(r);
				ci += 1;
			}
		}
		rounds = qs;
		idx = 0;
		score = 0;
		setupRound();
		scene = 'play';
	}

	function cur(): Round {
		return rounds[idx]!;
	}

	function setupRound(): void {
		step = 1;
		picked1 = null;
		picked2 = null;
	}

	async function pick1(choice: string): Promise<void> {
		if (picked1 !== null) return;
		picked1 = choice;
		const r = cur();
		const ok = choice === r.step1Corretta;
		// il passo di morfologia accredita la CLASSE (✍️) e la costruzione
		const classKey1 = conjClassKey(r.word);
		if (classKey1) await recordPractice(classKey1, ok);
		if (r.chain.gram) await recordPractice(`gram:${r.chain.gram}`, ok);
		speakSentenceJapanese(r.step1Corretta);
		setTimeout(() => {
			if (ok) step = 2;
		}, 700);
	}

	async function pick2(choice: string): Promise<void> {
		if (picked2 !== null) return;
		picked2 = choice;
		const r = cur();
		const ok = choice === r.step2Corretta;
		if (ok && picked1 === r.step1Corretta) score += 1;
		const classKey2 = conjClassKey(r.word);
		if (classKey2) await recordPractice(classKey2, ok);
		if (r.chain.gram) await recordPractice(`gram:${r.chain.gram}`, ok);
		speakSentenceJapanese(r.step2Corretta);
	}

	function roundOver(): boolean {
		const r = cur();
		return (picked1 !== null && picked1 !== r.step1Corretta) || picked2 !== null;
	}

	function next(): void {
		if (idx < rounds.length - 1) {
			idx += 1;
			setupRound();
		} else {
			scene = 'done';
		}
	}
</script>

<div class="catena">
	<a class="back" href="{base}/giochi">← Giochi</a>

	{#if scene === 'intro'}
		<article class="scene">
			<h1 class="page-title">🧬 Catena di forme <span class="beta-chip">beta</span></h1>
			<p class="hint">
				Le forme complesse nascono UN PASSO ALLA VOLTA: 食べる → 食べられる →
				食べられない («non riesco a mangiare»). Costruisci la catena scegliendo la
				forma giusta a ogni passo — così le frasi lunghe smettono di far paura.
			</p>
			{#if loading}
				<p class="hint">Carico i verbi…</p>
			{:else}
				<button class="proceed" onclick={start}>はじめる</button>
			{/if}
		</article>
	{:else if scene === 'play'}
		{#key idx}
		{@const r = cur()}
		<article class="scene">
			<p class="who">{idx + 1} / {rounds.length} — punti: {score}</p>
			<div class="chain-view">
				<span class="chain-node base">{r.dict}<small>{r.glossa}</small></span>
				<span class="chain-arrow">→</span>
				<span class="chain-node" class:filled={picked1 !== null} class:wrong={picked1 !== null && picked1 !== r.step1Corretta}>
					{picked1 !== null ? (picked1 === r.step1Corretta ? r.step1Corretta : picked1) : '？'}
				</span>
				<span class="chain-arrow">→</span>
				<span class="chain-node" class:filled={picked2 !== null} class:wrong={picked2 !== null && picked2 !== r.step2Corretta}>
					{picked2 !== null ? (picked2 === r.step2Corretta ? r.step2Corretta : picked2) : '？'}
				</span>
			</div>

			{#if step === 1 && (picked1 === null || picked1 === r.step1Corretta)}
				<p class="hint">Passo 1: qual è <strong>{r.chain.step1Ask}</strong> di {r.dict}?</p>
				<div class="choices">
					{#each r.step1Scelte as c, i (i)}
						<button
							class="choice"
							class:right={picked1 !== null && c === r.step1Corretta}
							class:wrong={picked1 === c && c !== r.step1Corretta}
							class:answered={picked1 !== null}
							onclick={() => pick1(c)}
						>{c}</button>
					{/each}
				</div>
			{:else if step === 2 && picked1 === r.step1Corretta}
				<p class="hint">Passo 2: ora <strong>{r.chain.step2Ask}</strong>:</p>
				<div class="choices">
					{#each r.step2Scelte as c, i (i)}
						<button
							class="choice"
							class:right={picked2 !== null && c === r.step2Corretta}
							class:wrong={picked2 === c && c !== r.step2Corretta}
							class:answered={picked2 !== null}
							onclick={() => pick2(c)}
						>{c}</button>
					{/each}
				</div>
			{/if}

			{#if roundOver()}
				<div class="result">
					<p class="chain-final">{r.dict} → {r.step1Corretta} → <strong>{r.step2Corretta}</strong></p>
					<p class="hint">💬 {r.chain.senso(r.glossa)}</p>
					<button class="listen" onclick={() => speakSentenceJapanese(r.step2Corretta)}>🔊 もう一度</button>
					<div class="esempio">
						<p class="es-label">Come nella frase</p>
						<p class="es-jp">{r.chain.esempio.jp}</p>
						<p class="es-it">{r.chain.esempio.it}</p>
						<button class="listen" onclick={() => speakSentenceJapanese(r.chain.esempio.jp)}>🔊 la frase</button>
					</div>
				</div>
				<button class="proceed" onclick={next}>{idx < rounds.length - 1 ? 'Avanti →' : 'Risultato →'}</button>
			{/if}
		</article>
		{/key}
	{:else}
		<article class="scene">
			<p class="who">{score === rounds.length ? '🎉 Perfetto!' : '🏁 Finito'}</p>
			<p class="score-big">{score} / {rounds.length}</p>
			<p class="hint">Gli errori alimentano la classe verbale e la costruzione nei punti deboli.</p>
			<button class="proceed" onclick={start}>🔁 Un'altra serie</button>
		</article>
	{/if}
</div>

<style>
	.catena { display: grid; gap: 14px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.page-title { margin: 0; font-size: 1.25rem; text-align: center; }
	.beta-chip {
		font-size: 0.6rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
		color: var(--warn-ink); background: var(--warn-bg); border: 1px solid var(--warn-border);
		border-radius: 999px; padding: 2px 8px; vertical-align: middle;
	}
	.scene { background: var(--surface); border-radius: 16px; padding: 20px; box-shadow: 0 2px 10px rgba(14,29,51,0.07); display: grid; gap: 14px; }
	.who { margin: 0; font-size: 0.85rem; font-weight: 700; color: var(--muted); }
	.hint { margin: 0; text-align: center; font-size: 0.88rem; color: var(--muted); }
	.chain-view { display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; }
	.chain-node {
		display: inline-flex; flex-direction: column; align-items: center; gap: 2px;
		min-width: 72px; padding: 10px 14px; border-radius: 12px; text-align: center;
		border: 1.5px dashed var(--line); background: var(--surface-2);
		font-size: 1.15rem; font-weight: 700;
	}
	.chain-node small { font-size: 0.68rem; font-weight: 400; color: var(--muted); }
	.chain-node.base { border-style: solid; border-color: var(--brand); }
	.chain-node.filled { border-style: solid; border-color: var(--success); background: var(--ok-bg); }
	.chain-node.filled.wrong { border-color: var(--danger); background: var(--danger-bg); }
	.chain-arrow { color: var(--muted); font-weight: 700; }
	.choices { display: grid; gap: 8px; }
	.choice { padding: 12px 14px; border-radius: 10px; border: 1.5px solid var(--line); background: var(--surface-2); color: var(--ink); font-size: 1.05rem; text-align: center; cursor: pointer; }
	.choice:hover:not(.answered) { border-color: var(--brand); }
	.choice.answered { cursor: default; }
	.choice.right { border-color: var(--success); background: var(--ok-bg); }
	.choice.wrong { border-color: var(--danger); background: var(--danger-bg); }
	.result { display: grid; gap: 8px; justify-items: center; }
	.esempio { display: grid; gap: 4px; justify-items: center; text-align: center; margin-top: 6px; padding: 10px 14px; border-radius: 12px; background: var(--surface-2); border: 1px solid var(--line); width: 100%; }
	.es-label { margin: 0; font-size: 0.68rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
	.es-jp { margin: 0; font-size: 1.05rem; font-weight: 600; }
	.es-it { margin: 0; font-size: 0.85rem; color: var(--muted); }
	.chain-final { margin: 0; font-size: 1.1rem; text-align: center; }
	.listen { padding: 7px 14px; border-radius: 999px; border: 1.5px solid var(--brand); background: var(--surface); color: var(--brand); font-weight: 700; font-size: 0.85rem; cursor: pointer; }
	.score-big { margin: 0; text-align: center; font-size: 2.4rem; font-weight: 800; }
	.proceed { justify-self: center; padding: 10px 22px; border-radius: 8px; border: 1px solid var(--brand); background: var(--brand); color: #fff; font-weight: 600; cursor: pointer; }
</style>
