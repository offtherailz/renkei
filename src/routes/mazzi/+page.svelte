<script lang="ts">
	import { base } from '$app/paths';
	import { allMazzi, AUTO_MAZZI } from '$lib/data/mazzi';

	const curati = allMazzi();
	const autoParole = AUTO_MAZZI.filter((m) => m.kind === 'word');
	const autoGram = AUTO_MAZZI.filter((m) => m.kind === 'grammar');
</script>

<div class="mazzi">
	<a class="back" href="{base}/">← Home</a>
	<h1 class="page-title">🃏 Mazzi e mini-test</h1>
	<p class="sub">Studia il lessico per tema o categoria: <strong>flashcard</strong> (flip + pronuncia) e <strong>mini-test</strong> (quiz con tutti i tipi: lettura, ascolto, composizione, kanji… come l’SRS, alimenta i ripassi).</p>

	{#if curati.length}
		<h2 class="sec">Mazzi tematici</h2>
		<div class="grid">
			{#each curati as m (m.id)}
				<div class="card">
					<div class="c-top"><span class="c-emoji">{m.emoji}</span><span class="c-titolo">{m.titolo}</span></div>
					<p class="c-desc">{m.descrizione}</p>
					<div class="c-actions">
						<a class="btn flash" href="{base}/mazzo/{m.id}">🃏 Flashcard</a>
						<a class="btn test" href="{base}/quiz?collezione={m.id}">🎯 Mini-test</a>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<h2 class="sec">Parole per categoria / livello</h2>
	<p class="note">Mini-test automatici: domande randomizzate su un sottoinsieme (≈15 per sessione).</p>
	<div class="grid">
		{#each autoParole as m (m.id)}
			<a class="card auto" href="{base}/quiz?auto={m.id}">
				<div class="c-top"><span class="c-emoji">{m.emoji}</span><span class="c-titolo">{m.titolo}</span></div>
				<p class="c-desc">{m.descrizione}</p>
				<span class="c-go">🎯 Mini-test →</span>
			</a>
		{/each}
	</div>

	<h2 class="sec">Grammatica per funzione</h2>
	<p class="note">Ogni gruppo = un mini-test. Vuoi scoprire dove sei forte/debole? <a href="{base}/grammatica">📖 Giro diagnostico grammatica →</a></p>
	<div class="grid">
		{#each autoGram as m (m.id)}
			<a class="card auto" href="{base}/quiz?auto={m.id}">
				<div class="c-top"><span class="c-emoji">{m.emoji}</span><span class="c-titolo">{m.titolo}</span></div>
				<p class="c-desc">{m.descrizione}</p>
				<span class="c-go">🎯 Mini-test →</span>
			</a>
		{/each}
	</div>
</div>

<style>
	.mazzi { display: grid; gap: 14px; }
	.back { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
	.page-title { margin: 0; font-size: 1.3rem; }
	.sub { margin: 0; font-size: 0.85rem; color: var(--muted); }
	.sec { margin: 8px 0 0; font-size: 1.05rem; }
	.note { margin: 0; font-size: 0.78rem; color: var(--muted); }
	.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
	.card { display: grid; gap: 6px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); padding: 12px; text-decoration: none; color: var(--ink); }
	.card.auto:hover { border-color: var(--brand); }
	.c-top { display: flex; align-items: center; gap: 8px; }
	.c-emoji { font-size: 1.3rem; }
	.c-titolo { font-weight: 700; font-size: 0.95rem; }
	.c-desc { margin: 0; font-size: 0.75rem; color: var(--muted); }
	.c-actions { display: flex; gap: 6px; flex-wrap: wrap; }
	.btn { font-size: 0.8rem; font-weight: 700; text-decoration: none; border-radius: 999px; padding: 5px 12px; }
	.btn.flash { border: 1px solid var(--line); background: var(--bg); color: var(--ink); }
	.btn.test { background: var(--brand); color: #fff; }
	.c-go { font-size: 0.8rem; font-weight: 700; color: var(--brand); }
</style>
