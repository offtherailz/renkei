<script lang="ts">
	import { base } from '$app/paths';

	// Avventure: mini-storie a scene che concatenano più abilità (numeri,
	// contatori, saluti, pagamento…). Per ora solo il konbini.
	const ADVENTURES = [
		{
			href: `${base}/kaimono`,
			icon: '🛒',
			title: '買い物',
			yomi: 'かいもの',
			desc: 'Ascolta la lista, esci di casa, ordina al konbini, paga e torna a casa.',
			ready: true
		},
		{
			href: `${base}/ristorante`,
			icon: '🍽️',
			title: 'お店',
			yomi: 'おみせ',
			desc: 'Scegli il locale, di\' in quanti siete, ordina dal menu, paga il conto.',
			ready: true
		},
		{
			href: `${base}/treno`,
			icon: '🚃',
			title: '電車',
			yomi: 'でんしゃ',
			desc: 'Compra il biglietto, trova il binario, sali sul treno giusto e scendi alla fermata giusta.',
			ready: true
		},
		{
			href: `${base}/shigoto`,
			icon: '💼',
			title: '仕事場で',
			yomi: 'しごとばで',
			desc: 'Primo giorno in ufficio: presentati, incassa un complimento con umiltà, capisci le istruzioni del capo e rispondi al telefono.',
			ready: true
		}
	];
</script>

<div class="adv-page">
	<h1 class="page-title">🗺️ Avventure</h1>
	<p class="page-sub">Piccole storie da vivere in giapponese, un passo alla volta.</p>

	<div class="adv-grid">
		{#each ADVENTURES as a (a.href)}
			<a class="adv-card" href={a.href}>
				<span class="adv-icon">{a.icon}</span>
				<span class="adv-body">
					<span class="adv-title">{a.title}<small>（{a.yomi}）</small></span>
					<span class="adv-desc">{a.desc}</span>
				</span>
			</a>
		{/each}
	</div>

	<a class="back-link" href="{base}/giochi">← Giochi</a>
</div>

<style>
	.adv-page { display: grid; gap: 14px; }
	.page-title { margin: 0; font-size: 1.3rem; }
	.page-sub { margin: 0; font-size: 0.85rem; color: var(--muted); }
	.adv-grid { display: grid; gap: 10px; }
	.adv-card {
		display: flex;
		align-items: center;
		gap: 14px;
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: 14px;
		padding: 16px;
		text-decoration: none;
		color: var(--ink);
	}
	.adv-card:hover { border-color: var(--brand); }
	.adv-icon { font-size: 2.4rem; }
	.adv-body { display: grid; gap: 3px; }
	.adv-title { font-weight: 700; font-size: 1.05rem; }
	.adv-title small { color: var(--muted); font-weight: 400; font-size: 0.72rem; }
	.adv-desc { font-size: 0.82rem; color: var(--muted); }
	.back-link { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
</style>
