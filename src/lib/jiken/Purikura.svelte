<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import FotoPuri from './FotoPuri.svelte';
	import FuriganaText from '$lib/components/FuriganaText.svelte';
	import { TARDI } from './motore';
	import { pagaPuri, puoiPuri, salvaFoto, turnoPuri, PURIKURA, type TurnoPuri } from './giochi';
	import { UI } from './ui';
	import * as suono from './suoni';
	import type { Lingua, Stato, Testo } from './tipi';

	// プリクラ con あや: la macchina dice la posa (ascolto: il testo si vede dopo),
	// tu scegli la foto giusta; poi la scritta (i kanji giusti). La striscia va nell'album.
	const {
		stato, L, lingua, suoni, aggiorna, menu, parla, avvisa
	}: {
		stato: Stato;
		L: (t: Testo) => string;
		lingua: Lingua;
		suoni: boolean;
		aggiorna: (s: Stato) => void;
		menu: () => void;
		parla: (t: string, chi: 'F' | 'M', lento?: boolean) => Promise<void>;
		avvisa: (t: string) => void;
	} = $props();

	let fase = $state<'intro' | 'posa' | 'scatto' | 'scritta' | 'foto'>('intro');
	let turno = $state<TurnoPuri | null>(null);
	let i = $state(0);
	let scelta = $state<string | null>(null);
	let giuste = $state(0);
	const cur = $derived(turno?.pose[i] ?? null);
	const AYA = (posa?: string): string => `${base}/giorno/ritratti/studentessa_rossa${posa ? `_${posa}` : ''}-chiusa.png`;

	onMount(() => void parla('いっしょに プリクラ、とろう！ きかいの 声を よく 聞いてね。', 'F'));

	function inizia(): void {
		if (stato.minuti >= TARDI) return avvisa(L(UI.chiuso));
		const s = pagaPuri(stato);
		if (!s) return avvisa(L(UI.sgPuriSoldi));
		aggiorna(s);
		turno = turnoPuri();
		i = 0;
		giuste = 0;
		posa();
	}
	function posa(): void {
		scelta = null;
		fase = 'posa';
		if (cur) void parla(cur.giusta.ja, 'F');
	}
	function scegli(id: string): void {
		if (!cur || scelta) return;
		scelta = id;
		const ok = id === cur.giusta.id;
		if (ok) giuste += 1;
		if (suoni) (ok ? suono.giusto : suono.sbagliato)();
		setTimeout(() => {
			fase = 'scatto';
			if (suoni) suono.scatto();
		}, 700);
	}
	function avanti(): void {
		if (!turno) return;
		if (i < turno.pose.length - 1) {
			i += 1;
			posa();
		} else {
			scelta = null;
			fase = 'scritta';
		}
	}
	function scrivi(t: string): void {
		if (!turno || scelta) return;
		scelta = t;
		const ok = t === turno.scritta.s.giusta;
		if (ok) giuste += 1;
		if (suoni) (ok ? suono.giusto : suono.sbagliato)();
	}
	function finisci(): void {
		if (!turno) return;
		aggiorna(salvaFoto(stato, turno.pose.map((p) => p.giusta.id), turno.scritta.s.giusta));
		fase = 'foto';
		avvisa(L(UI.sgPuriFatta));
		void parla(giuste === PURIKURA.scatti + 1 ? 'かんぺき！ いい 思い出に なったね。' : 'たのしかった！ また とろうね。', 'F');
	}
</script>

<div class="puri">
	{#if fase === 'foto' && turno}
		<FotoPuri pose={turno.pose.map((p) => p.giusta.id)} scritta={turno.scritta.s.giusta} />
		<p class="esito">{giuste}/{PURIKURA.scatti + 1} ⭐</p>
		<div class="row">
			<button class="btn" disabled={!puoiPuri(stato)} onclick={inizia}>{L(UI.sgGioca)} <small>({L(UI.sgPuriPrezzo)})</small></button>
			<button class="btn ghost" onclick={menu}>{L(UI.sgMenu)}</button>
		</div>
	{:else}
		<div class="cabina" style="background-image: url({base}/giorno/sfondi/purikura.jpg)">
			{#if fase === 'scatto' && cur}
				<div class="flash"></div>
				<img class="aya" src={AYA(cur.giusta.id)} alt="" />
			{:else}
				<img class="aya" src={AYA()} alt="" />
			{/if}
			{#if fase === 'posa' || fase === 'scatto'}<span class="conta">{i + 1}/{PURIKURA.scatti}</span>{/if}
		</div>

		{#if fase === 'intro'}
			<p class="ja"><FuriganaText text="いっしょに プリクラ、とろう！ きかいの 声を よく 聞いてね。" /></p>
			<p class="small">{L(UI.sgPuriDesc)}</p>
			<div class="row"><button class="btn big" disabled={!puoiPuri(stato)} onclick={inizia}>{L(UI.sgGioca)} <small>({L(UI.sgPuriPrezzo)})</small></button></div>
			{#if !puoiPuri(stato)}<p class="small avviso">{L(UI.sgPuriSoldi)}</p>{/if}
		{:else if fase === 'posa' && cur}
			<div class="row"><button class="btn ghost small" onclick={() => void parla(cur.giusta.ja, 'F')}>{L(UI.sgPuriAscolta)}</button></div>
			<div class="pose">
				{#each cur.opzioni as p (p.id)}
					<button class="posa" class:ok={scelta !== null && p.id === cur.giusta.id} class:ko={scelta === p.id && p.id !== cur.giusta.id} disabled={scelta !== null} onclick={() => scegli(p.id)}>
						<img src={AYA(p.id)} alt="" />
					</button>
				{/each}
			</div>
		{:else if fase === 'scatto' && cur}
			<p class="ja">📢 <FuriganaText text={cur.giusta.ja} /> <b>{L(UI.sgPuriScatto)}</b></p>
			{#if lingua !== 'ja'}<p class="small">{cur.giusta.it}</p>{/if}
			<p class="esito" class:giusto={scelta === cur.giusta.id}>{scelta === cur.giusta.id ? L(UI.giusto) : L(UI.sbagliato)}</p>
			<div class="row"><button class="btn" onclick={avanti}>{L(UI.avanti)}</button></div>
		{:else if fase === 'scritta' && turno}
			<p class="ja">✏️ {L(UI.sgPuriScrivi).replace('{r}', turno.scritta.s.lettura)}</p>
			<div class="scelte">
				{#each turno.scritta.opzioni as t (t)}
					<button class="opzione" class:ok={scelta !== null && t === turno.scritta.s.giusta} class:ko={scelta === t && t !== turno.scritta.s.giusta} disabled={scelta !== null} onclick={() => scrivi(t)}>{t}</button>
				{/each}
			</div>
			{#if scelta}
				<p class="small">{turno.scritta.s.giusta}（{turno.scritta.s.lettura}）= {turno.scritta.s.it}</p>
				<div class="row"><button class="btn" onclick={finisci}>{L(UI.avanti)}</button></div>
			{/if}
		{/if}
	{/if}
</div>

<style>
	.puri { display: grid; gap: 8px; }
	.cabina { position: relative; aspect-ratio: 2 / 1; background-size: cover; background-position: center; border: 3px solid #0e0d1a; overflow: hidden; }
	.aya { position: absolute; left: 50%; bottom: 0; height: 96%; transform: translateX(-50%); image-rendering: pixelated; }
	.conta { position: absolute; top: 6px; left: 8px; background: rgba(255, 95, 162, 0.9); color: #fff; padding: 2px 8px; font-weight: 700; }
	.flash { position: absolute; inset: 0; background: #fff; animation: flash 0.6s ease-out 1.5s both; pointer-events: none; z-index: 2; }
	@keyframes flash { from { opacity: 0.95; } to { opacity: 0; } }
	.pose { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
	.posa { background: #fbe3ee; border: 3px solid var(--px-line); padding: 0; cursor: pointer; aspect-ratio: 3 / 4; overflow: hidden; display: grid; place-items: end center; }
	.posa img { width: 100%; height: 100%; object-fit: cover; object-position: top; image-rendering: pixelated; }
	.posa.ok { border-color: #99e550; box-shadow: 0 0 0 3px #99e550; }
	.posa.ko { border-color: #d95763; opacity: 0.7; }
	.scelte { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
	.opzione { font-family: inherit; font-size: 1.4rem; background: #353360; color: #f4f4f4; border: 3px solid var(--px-line); padding: 8px; cursor: pointer; }
	.opzione.ok { background: #2f5a24; border-color: #99e550; }
	.opzione.ko { background: #5e2430; border-color: #d95763; }
	.ja { font-size: 1.1rem; margin: 0; }
	.small { font-size: 0.85rem; margin: 0; }
	.avviso { color: #f2a7b0; }
	.esito { color: var(--px-ko); margin: 0; }
	.esito.giusto { color: var(--px-ok); }
	.row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
	.btn { font-family: inherit; background: #5b6ee1; color: #fff; border: 3px solid var(--px-line); box-shadow: inset -3px -3px 0 #3f3f74, inset 3px 3px 0 #8fa0ff; padding: 8px 14px; font-size: 0.95rem; cursor: pointer; }
	.btn:disabled { opacity: 0.5; cursor: default; }
	.btn.big { font-size: 1.05rem; padding: 12px 16px; }
	.btn.ghost { background: #45283c; box-shadow: inset -3px -3px 0 #2a1824, inset 3px 3px 0 #6e3f5f; }
	.btn.small { padding: 5px 9px; font-size: 0.8rem; }
</style>
