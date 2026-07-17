<script lang="ts">
	import { page } from '$app/stores';
	import { base } from '$app/paths';

	// Rete di sicurezza globale: qualunque errore di route finisce qui invece
	// che in uno schermo bianco. I dati (IndexedDB) non sono toccati.
	function reload(): void {
		location.href = `${base}/`;
	}
</script>

<div class="err">
	<p class="err-icon">🙇</p>
	<h1>Qualcosa è andato storto</h1>
	<p class="err-msg">
		{$page.error?.message ?? 'Errore inatteso.'}
		{#if $page.status}<span class="err-code">(codice {$page.status})</span>{/if}
	</p>
	<p class="err-hint">I tuoi dati e progressi sono al sicuro (restano sul dispositivo).</p>
	<div class="err-actions">
		<button class="err-btn" onclick={reload}>🏠 Torna alla home</button>
		<button class="err-btn ghost" onclick={() => location.reload()}>🔄 Ricarica la pagina</button>
	</div>
	<p class="err-report">
		Se succede di nuovo, scrivilo in
		<a href="{base}/settings">Impostazioni → 🐛 Segnala un problema</a>
	</p>
</div>

<style>
	.err {
		max-width: 420px; margin: 10vh auto 0; text-align: center;
		background: var(--surface); border-radius: 16px; padding: 28px 22px;
		box-shadow: 0 2px 10px rgba(14, 29, 51, 0.07); display: grid; gap: 12px;
	}
	.err-icon { margin: 0; font-size: 2.6rem; }
	h1 { margin: 0; font-size: 1.15rem; }
	.err-msg { margin: 0; font-size: 0.88rem; color: var(--ink); overflow-wrap: anywhere; }
	.err-code { color: var(--muted); font-size: 0.78rem; }
	.err-hint { margin: 0; font-size: 0.8rem; color: var(--muted); }
	.err-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
	.err-btn {
		padding: 9px 18px; border-radius: 8px; border: 1px solid var(--brand);
		background: var(--brand); color: #fff; font-weight: 600; cursor: pointer;
	}
	.err-btn.ghost { background: var(--surface); color: var(--brand); }
	.err-report { margin: 4px 0 0; font-size: 0.78rem; color: var(--muted); }
	.err-report a { color: var(--brand); font-weight: 600; }
</style>
