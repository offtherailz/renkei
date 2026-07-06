<script lang="ts">
	import { base } from '$app/paths';

	// Avventure: mini-storie a scene che concatenano più abilità (numeri,
	// contatori, saluti, pagamento…). Per ora solo il konbini.
	const ADVENTURES = [
		{
			href: `${base}/kaimono`,
			icon: '🛒',
			title: 'Kaimono · fare la spesa',
			desc: 'Ascolta la lista, esci di casa, ordina al konbini, paga e torna a casa.',
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
					<span class="adv-title">{a.title}</span>
					<span class="adv-desc">{a.desc}</span>
				</span>
			</a>
		{/each}
	</div>

	<a class="back-link" href="{base}/giochi">← Giochi sui numeri</a>
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
	.adv-desc { font-size: 0.82rem; color: var(--muted); }
	.back-link { font-size: 0.85rem; color: var(--brand); text-decoration: none; font-weight: 600; }
</style>
