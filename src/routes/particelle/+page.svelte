<script lang="ts">
	import { page } from '$app/stores';
	import { afterNavigate } from '$app/navigation';
	import { PARTICLE_GUIDE } from '$lib/data/particleGuide';
	import FuriganaText from '$lib/components/FuriganaText.svelte';
	import { speakSentenceJapanese } from '$lib/core/tts';
	import { stripFuriganaNotation } from '$lib/core/furigana';
	import { scrollToAnchor } from '$lib/core/scroll';

	function scrollToHash(): void {
		const target = decodeURIComponent($page.url.hash.replace('#', ''));
		if (target) scrollToAnchor(`p-${target}`);
	}

	// afterNavigate copre l'arrivo da un'altra pagina (es. dai punti deboli) e il
	// mount iniziale; $effect copre i click sui chip dell'indice (cambio hash).
	afterNavigate(scrollToHash);
	$effect(() => { void $page.url.hash; scrollToHash(); });
</script>

<div class="particles-page">
	<h1 class="page-title">Particelle (助詞)</h1>
	<p class="page-sub">Ogni particella con i suoi usi, un esempio per uso e le confusioni tipiche.</p>

	<nav class="toc">
		{#each PARTICLE_GUIDE as p}
			<a class="toc-chip" href="#{p.particella}">{p.particella}</a>
		{/each}
	</nav>

	{#each PARTICLE_GUIDE as p (p.particella)}
		<article class="particle-card" id="p-{p.particella}">
			<div class="particle-head">
				<span class="particle-symbol">{p.particella}</span>
				<strong class="particle-name">{p.nome}</strong>
			</div>
			{#each p.usi as uso}
				<div class="use-block">
					<p class="use-title">{uso.titolo}</p>
					<p class="use-text">{uso.spiegazione}</p>
					<div class="use-example">
						<span class="example-jp">
							<FuriganaText text={uso.esempio.jp} />
							<button class="tts-mini" onclick={() => speakSentenceJapanese(stripFuriganaNotation(uso.esempio.jp))} title="Ascolta">🔊</button>
						</span>
						<span class="example-it">{uso.esempio.it}</span>
					</div>
				</div>
			{/each}
			{#if p.confusioni}
				<p class="confusion">⚠️ {p.confusioni}</p>
			{/if}
		</article>
	{/each}
</div>

<style>
	.particles-page { display: grid; gap: 12px; }
	.page-title { margin: 0; font-size: 1.3rem; }
	.page-sub { margin: 0; font-size: 0.82rem; color: var(--muted); }

	.toc { display: flex; flex-wrap: wrap; gap: 6px; }
	.toc-chip {
		min-width: 42px;
		height: 42px;
		padding: 0 10px;
		display: grid;
		place-items: center;
		border: 1.5px solid var(--line);
		border-radius: 10px;
		background: var(--surface);
		color: var(--ink);
		font-size: 1.25rem;
		font-weight: 700;
		text-decoration: none;
		white-space: nowrap;
	}
	.toc-chip:hover { border-color: var(--brand); }

	.particle-card {
		background: var(--surface);
		border-radius: 16px;
		padding: 16px;
		box-shadow: 0 2px 10px rgba(14, 29, 51, 0.07);
		display: grid;
		gap: 12px;
		scroll-margin-top: 12px;
	}

	.particle-head { display: flex; align-items: center; gap: 12px; }
	.particle-symbol {
		min-width: 52px;
		height: 52px;
		padding: 0 12px;
		display: grid;
		place-items: center;
		border-radius: 12px;
		background: rgba(107, 160, 242, 0.14);
		border: 1.5px solid var(--brand);
		color: var(--brand);
		font-size: 1.7rem;
		font-weight: 800;
		white-space: nowrap;
	}
	.particle-name { font-size: 0.95rem; }

	.use-block { display: grid; gap: 4px; }
	.use-title { margin: 0; font-size: 0.82rem; font-weight: 700; color: var(--brand); }
	.use-text { margin: 0; font-size: 0.84rem; color: var(--ink); }

	.use-example {
		display: grid;
		gap: 2px;
		padding: 8px 10px;
		background: var(--surface-2);
		border: 1px solid var(--line);
		border-radius: 8px;
	}
	.example-jp { font-size: 1.15rem; line-height: 1.8; }
	.example-it { font-size: 0.76rem; color: var(--muted); }
	.tts-mini { border: none; background: none; cursor: pointer; font-size: 0.9rem; padding: 0 4px; }

	.confusion {
		margin: 0;
		font-size: 0.8rem;
		padding: 8px 10px;
		border-radius: 8px;
		background: var(--warn-bg);
		border: 1px solid var(--warn-border);
		color: var(--warn-ink);
	}
</style>
