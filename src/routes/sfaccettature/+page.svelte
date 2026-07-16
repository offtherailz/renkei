<script lang="ts">
	import { base } from '$app/paths';
	import { FACET_META, FACET_UNLOCK_STAGE } from '$lib/core/facets';

	const STAGE_LABEL: Record<number, string> = {
		0: 'da subito',
		1: 'dallo stage 1 (~10 min dopo il primo incontro)',
		2: 'dallo stage 2 (~1 ora)',
		3: 'dallo stage 3 (~1 giorno)',
		4: 'dallo stage 4 (~3 giorni)'
	};
</script>

<div class="facets-page">
	<a class="back" href="{base}/guida">← Guida</a>
	<h1 class="page-title">🕸️ Le sfaccettature di una parola</h1>
	<p class="page-sub">
		«Conoscere una parola» non è una cosa sola: puoi capirla al volo ma non saperla dire, saperla
		leggere ma non usarla in una frase. Il radar nella scheda di ogni parola scompone la tua
		conoscenza in <strong>7 abilità</strong> (dal modello Forma × Significato × Uso di Paul Nation,
		ciascuna nel verso ricettivo — riconoscere — e produttivo — produrre).
	</p>

	<div class="facet-list">
		{#each FACET_META as m (m.field)}
			<article class="facet-card">
				<div class="facet-head">
					<span class="facet-icon">{m.icon}</span>
					<h2 class="facet-name">{m.label}</h2>
					<span class="facet-unlock">{STAGE_LABEL[FACET_UNLOCK_STAGE[m.field]] ?? ''}</span>
				</div>
				<p class="facet-desc">{m.desc}</p>
				<p class="facet-train"><strong>Come si rafforza:</strong> {m.train}</p>
			</article>
		{/each}
	</div>

	<article class="facet-card note">
		<h2 class="facet-name">Come leggere il radar</h2>
		<ul>
			<li>Ogni asse va da 0 al 100%: si riempie rispondendo bene a domande di quel tipo (e cala sugli errori) — in qualunque parte dell'app, non solo nel quiz.</li>
			<li>Le abilità <strong>facili sbloccano prima</strong>: Capire e Leggere da subito, Dire e Scrivere solo quando la parola è già consolidata — il radar si riempie «a ondate», ed è normale che le punte difficili restino indietro.</li>
			<li>Un asse <strong>tratteggiato con «—»</strong> non è un buco: quella abilità non ha senso per quella parola (es. «Scrivere» per una parola tutta in kana, che non ha kanji da comporre).</li>
			<li>Il quiz usa il radar per <strong>scegliere le domande</strong>: insiste sull'abilità più debole tra quelle sbloccate, così le punte si pareggiano da sole.</li>
		</ul>
	</article>
</div>

<style>
	.facets-page { display: grid; gap: 12px; }
	.back { font-size: 0.85rem; color: var(--muted); text-decoration: none; }
	.page-title { margin: 0; font-size: 1.3rem; }
	.page-sub { margin: 0; font-size: 0.9rem; color: var(--muted); line-height: 1.5; }
	.facet-list { display: grid; gap: 8px; }
	.facet-card {
		display: grid; gap: 6px; padding: 12px 14px;
		border: 1px solid var(--line); border-radius: 12px; background: var(--surface);
	}
	.facet-head { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
	.facet-icon { font-size: 1.2rem; }
	.facet-name { margin: 0; font-size: 1rem; }
	.facet-unlock { font-size: 0.72rem; color: var(--muted); margin-left: auto; }
	.facet-desc { margin: 0; font-size: 0.88rem; }
	.facet-train { margin: 0; font-size: 0.82rem; color: var(--muted); }
	.note ul { margin: 0; padding-left: 18px; display: grid; gap: 6px; font-size: 0.85rem; }
</style>
