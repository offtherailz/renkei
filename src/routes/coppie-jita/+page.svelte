<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { db } from '$lib/db/schema';
	import { detectUserLocale, pickLocalizedArray } from '$lib/core/i18n';
	import FuriganaText from '$lib/components/FuriganaText.svelte';
	import { speakSentenceJapanese, stopSpeaking } from '$lib/core/tts';
	import type { Word } from '$lib/types/models';

	interface Pair { ji: Word; ta: Word }
	let pairs = $state<Pair[]>([]);
	let loading = $state(true);
	let locale: 'it' | 'en' = 'it';

	onMount(async () => {
		locale = detectUserLocale();
		const words = await db.words.toArray();
		const byId = new Map(words.map((w) => [w.id, w]));
		const seen = new Set<string>();
		const out: Pair[] = [];
		for (const w of words) {
			if (!w.id_verbo_corrispondente || !w.transitivita_jp) continue;
			const other = byId.get(w.id_verbo_corrispondente);
			if (!other) continue;
			const key = [w.id, other.id].sort().join('|');
			if (seen.has(key)) continue;
			seen.add(key);
			const wJi = w.transitivita_jp.startsWith('自');
			out.push({ ji: wJi ? w : other, ta: wJi ? other : w });
		}
		out.sort((a, b) => a.ji.lettura.localeCompare(b.ji.lettura, 'ja'));
		pairs = out;
		loading = false;
	});

	const sig = (w: Word) => pickLocalizedArray(w.significato, locale)[0] ?? '';
	function say(w: Word) {
		stopSpeaking();
		speakSentenceJapanese(w.lettura);
	}
</script>

<div class="jita">
	<a class="back" href="{base}/">← Home</a>
	<h1 class="page-title">↔️ Coppie 自動詞 / 他動詞</h1>
	<p class="sub">Verbi a coppie: <strong>自動詞</strong> (intransitivo, が — il cambiamento avviene da sé) ↔ <strong>他動詞</strong> (transitivo, を — qualcuno compie l’azione). Tocca una parola per la scheda.</p>
	<a class="cta" href="{base}/transitivi">🎯 Esercizio: transitivo o intransitivo?</a>

	{#if loading}
		<p class="muted">Caricamento…</p>
	{:else}
		<p class="count">{pairs.length} coppie</p>
		<div class="head"><span>自動詞 (が)</span><span></span><span>他動詞 (を)</span></div>
		<div class="list">
			{#each pairs as p (p.ji.id + p.ta.id)}
				<div class="row">
					<a class="w ji" href="{base}/detail/word:{encodeURIComponent(p.ji.id)}">
						<span class="w-jp"><FuriganaText text="{p.ji.scrittura}[{p.ji.lettura}]" force={true} /></span>
						<span class="w-it">{sig(p.ji)}</span>
					</a>
					<button class="arrow" title="Ascolta" aria-label="Ascolta" onclick={() => say(p.ji)}>🔊</button>
					<a class="w ta" href="{base}/detail/word:{encodeURIComponent(p.ta.id)}">
						<span class="w-jp"><FuriganaText text="{p.ta.scrittura}[{p.ta.lettura}]" force={true} /></span>
						<span class="w-it">{sig(p.ta)}</span>
					</a>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.jita { display: grid; gap: 12px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.page-title { margin: 0; font-size: 1.3rem; }
	.sub { margin: 0; font-size: 0.85rem; color: var(--muted); }
	.muted { color: var(--muted); }
	.cta { display: inline-block; justify-self: start; background: var(--brand); color: #fff; border-radius: 12px; padding: 8px 14px; font-weight: 700; text-decoration: none; font-size: 0.9rem; }
	.count { margin: 0; font-size: 0.8rem; color: var(--muted); }
	.head { display: grid; grid-template-columns: 1fr auto 1fr; gap: 8px; font-size: 0.75rem; font-weight: 700; color: var(--muted); }
	.list { display: grid; gap: 6px; }
	.row { display: grid; grid-template-columns: 1fr auto 1fr; gap: 8px; align-items: center; }
	.w { display: grid; gap: 2px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); padding: 8px 10px; text-decoration: none; color: var(--ink); }
	.w.ji { border-left: 3px solid var(--info-ink); }
	.w.ta { border-left: 3px solid var(--warn-ink); }
	.w:hover { border-color: var(--brand); }
	.w-jp { font-size: 1.05rem; font-weight: 700; }
	.w-it { font-size: 0.78rem; color: var(--muted); }
	.arrow { border: none; background: none; cursor: pointer; font-size: 1rem; }
</style>
