<script lang="ts">
	import { onMount } from 'svelte';
	import { db } from '$lib/db/schema';
	import { listCorrections } from '$lib/db/corrections';
	import { base } from '$app/paths';
	import { appState } from '$lib/stores.svelte';
	import { DRILL_FORMS, DEFAULT_KNOWN_FORMS } from '$lib/core/conjugation';
	import { LOCALE_OVERRIDE_KEY } from '$lib/core/i18n';
	import { SEED_REVISION, SEED_LOADED_KEY } from '$lib/version';
	import { BUILD_ID } from '$lib/buildInfo';
	import { DEFAULT_NEW_CARDS_PER_DAY } from '$lib/core/dailyNewCards';

	let saving = $state(false);
	let saved = $state(false);
	const loadedSeed = typeof localStorage !== 'undefined' ? localStorage.getItem(SEED_LOADED_KEY) : null;

	const verbForms = DRILL_FORMS.filter((f) => f.category === 'verb');
	const adjectiveForms = DRILL_FORMS.filter((f) => f.category === 'adjective');

	function knownForms(): string[] {
		return appState.settings.forme_note ?? DEFAULT_KNOWN_FORMS;
	}

	function isKnown(key: string): boolean {
		return knownForms().includes(key);
	}

	function toggleForm(key: string): void {
		const current = knownForms();
		appState.settings.forme_note = current.includes(key)
			? current.filter((k) => k !== key)
			: [...current, key];
	}

	async function changeLanguage(e: Event): Promise<void> {
		const value = (e.target as HTMLSelectElement).value as 'auto' | 'it' | 'en';
		appState.settings.lingua_contenuti = value;
		if (value === 'auto') localStorage.removeItem(LOCALE_OVERRIDE_KEY);
		else localStorage.setItem(LOCALE_OVERRIDE_KEY, value);
		await save();
		// la lingua è letta all'avvio da molti componenti: ricarica per applicarla
		location.reload();
	}

	const settings = $derived(appState.settings);

	async function save(): Promise<void> {
		saving = true;
		try {
			// $state.snapshot: Dexie non sa clonare i proxy di Svelte 5
			// (forme_note è un array reattivo) — serve la copia piatta.
			const updated = { ...$state.snapshot(appState.settings), updated_at: Date.now() };
			await db.app_settings.put(updated);
			appState.settings = updated;
			saved = true;
			setTimeout(() => (saved = false), 2000);
		} catch (e) {
			console.error('Salvataggio impostazioni fallito:', e);
			alert('Salvataggio fallito: ' + e);
		} finally {
			saving = false;
		}
	}

	async function resetProgress(): Promise<void> {
		if (!confirm('Eliminare TUTTI i progressi SRS? Questa azione è irreversibile.')) return;
		await db.srs_progress.clear();
		alert('Progressi SRS eliminati.');
	}

	async function exportBundle(): Promise<void> {
		const [words, kanji, grammar, srsProgress, courses, lessons] = await Promise.all([
			db.words.toArray(),
			db.kanji.toArray(),
			db.grammar.toArray(),
			db.srs_progress.toArray(),
			db.course_datasets.toArray(),
			db.course_lessons.toArray()
		]);

		const bundle = { versione: '1.0', esportato_il: Date.now(), words, kanji, grammar, srsProgress, courses, lessons };
		const blob = new Blob([JSON.stringify(bundle)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `renkei-bundle-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	// contatore per il link alla pagina Correzioni
	let correctionsCount = $state(0);
	onMount(async () => {
		correctionsCount = (await listCorrections()).length;
	});
</script>

<h1 class="page-title">Impostazioni</h1>

<section class="section-card">
	<p class="card-title">Sessione quiz</p>

	<label class="setting-row">
		<span>Durata sessione (minuti)</span>
		<input
			type="number"
			min="1"
			max="60"
			class="num-input"
			bind:value={appState.settings.session_duration_minutes}
		/>
	</label>

	<label class="setting-row">
		<span>Auto-avanza dopo risposta (ms)</span>
		<input
			type="number"
			min="500"
			max="10000"
			step="500"
			class="num-input"
			bind:value={appState.settings.auto_next_delay_ms}
		/>
	</label>

	<label class="setting-row">
		<span>Timeout risposta (ms)</span>
		<input
			type="number"
			min="5000"
			max="60000"
			step="1000"
			class="num-input"
			bind:value={appState.settings.max_answer_time_ms}
		/>
	</label>

	<label class="setting-row">
		<span>Il timer di sessione continua in "Approfondisci"</span>
		<input type="checkbox" bind:checked={appState.settings.session_timer_runs_in_detail} />
	</label>

	<label class="setting-row">
		<span>La tua voce (nei giochi)<br /><small class="hint-text">L'interlocutore parla con la voce dell'altro sesso.</small></span>
		<select class="num-input" bind:value={appState.settings.voce_utente}>
			<option value="femminile">Femminile</option>
			<option value="maschile">Maschile</option>
		</select>
	</label>

	<label class="setting-row">
		<span>Furigana per kanji avanzati<br /><small class="hint-text">Nel quiz "produci la parola", se la parola contiene un kanji di livello più alto del suo, mostra la lettura in aiuto.</small></span>
		<input type="checkbox" bind:checked={appState.settings.furigana_kanji_avanzati} />
	</label>

	<label class="setting-row">
		<span>Carte nuove al giorno<br /><small class="hint-text">Quante parole/kanji/grammatica MAI viste entrano in circolo ogni giorno. I ripassi già dovuti restano sempre illimitati — questo limite serve solo a far scendere il contatore invece di farlo crescere sempre.</small></span>
		<input
			type="number"
			min="5"
			max="100"
			step="5"
			class="num-input"
			value={appState.settings.nuove_carte_al_giorno ?? DEFAULT_NEW_CARDS_PER_DAY}
			oninput={(e) => (appState.settings.nuove_carte_al_giorno = Number((e.target as HTMLInputElement).value))}
		/>
	</label>

	<button class="btn-primary" onclick={save} disabled={saving}>
		{saving ? 'Salvataggio…' : saved ? '✅ Salvato!' : 'Salva impostazioni'}
	</button>
</section>

<section class="section-card">
	<p class="card-title">Lingua dei contenuti</p>
	<label class="setting-row">
		<span>Significati e spiegazioni</span>
		<select class="num-input" value={appState.settings.lingua_contenuti ?? 'auto'} onchange={changeLanguage}>
			<option value="auto">Automatica (browser)</option>
			<option value="it">Italiano (sperimentale)</option>
			<option value="en">English</option>
		</select>
	</label>
	<p class="hint-text">La traduzione italiana dei contenuti è in lavorazione (dal giapponese). Se qualcosa non convince, torna a English. Il cambio ricarica l'app.</p>
</section>

<section class="section-card">
	<p class="card-title">Coniugazioni che conosco</p>
	<p class="hint-text">Il drill "Mettimi alla prova" chiede solo le forme spuntate. Spunta quelle che hai già studiato.</p>

	<p class="forms-group-title">Verbi</p>
	<div class="forms-grid">
		{#each verbForms as form (form.key)}
			<label class="form-check">
				<input type="checkbox" checked={isKnown(form.key)} onchange={() => toggleForm(form.key)} />
				<span>{form.label}</span>
			</label>
		{/each}
	</div>

	<p class="forms-group-title">Aggettivi</p>
	<div class="forms-grid">
		{#each adjectiveForms as form (form.key)}
			<label class="form-check">
				<input type="checkbox" checked={isKnown(form.key)} onchange={() => toggleForm(form.key)} />
				<span>{form.label}</span>
			</label>
		{/each}
	</div>

	<button class="btn-primary" onclick={save} disabled={saving}>
		{saving ? 'Salvataggio…' : saved ? '✅ Salvato!' : 'Salva impostazioni'}
	</button>
</section>

<section class="section-card">
	<p class="card-title">Dati</p>

	<div class="data-actions">
		<a class="btn-outline corr-link" href="{base}/correzioni">
			✏️ Le mie correzioni ({correctionsCount})
		</a>
		<p class="hint-text">Le modifiche fatte dalle schede: pagina dedicata per vederle, esportarle e rimuoverle.</p>
		<button class="btn-outline" onclick={exportBundle}>
			📦 Esporta bundle completo
		</button>
		<p class="hint-text">Esporta parole, kanji, grammatica, corsi e progressi SRS in un file JSON. Puoi reimportarlo su un altro dispositivo.</p>
	</div>

	<div class="danger-zone">
		<p class="card-title danger-title">Zona pericolosa</p>
		<button class="btn-danger" onclick={resetProgress}>
			🗑 Azzera progressi SRS
		</button>
		<p class="hint-text">Elimina tutto il progresso di memorizzazione. Il vocabolario rimane.</p>
	</div>
</section>

<section class="section-card">
	<p class="card-title">Informazioni</p>
	<p class="info-text">連携 Renkei — Studio giapponese JLPT</p>
	<div class="setting-row"><span>Build app</span><strong>{BUILD_ID}</strong></div>
	<div class="setting-row"><span>Versione dati (attesi)</span><strong>{SEED_REVISION}</strong></div>
	<div class="setting-row">
		<span>Dati caricati</span>
		<strong class:stale={loadedSeed !== SEED_REVISION}>{loadedSeed ?? '—'}</strong>
	</div>
	{#if loadedSeed && loadedSeed !== SEED_REVISION}
		<p class="hint-text">⚠️ Dati non aggiornati: ricarica l'app (refresh) per importare la versione {SEED_REVISION}.</p>
	{/if}
	<p class="hint-text">Dati archiviati localmente nel browser (IndexedDB). Nessun account richiesto.</p>
</section>

<style>
	.page-title { margin: 0 0 4px; font-size: 1.2rem; font-weight: 700; }

	.forms-group-title {
		margin: 6px 0 0;
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.forms-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 6px;
	}

	.form-check {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.82rem;
		cursor: pointer;
	}

	.form-check input { accent-color: var(--brand); }

	.section-card {
		background: var(--surface);
		border-radius: 16px;
		padding: 18px;
		box-shadow: 0 2px 10px rgba(14,29,51,0.07);
		display: grid;
		gap: 14px;
	}

	.card-title {
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin: 0;
	}

	.setting-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.88rem;
		gap: 12px;
	}

	.num-input {
		width: 80px;
		padding: 6px 10px;
		border-radius: 8px;
		border: 1.5px solid var(--line);
		font-size: 0.9rem;
		text-align: center;
		color: var(--ink);
		background: var(--surface-2);
	}

	.num-input:focus { outline: none; border-color: var(--brand); }

	.btn-primary {
		padding: 10px 20px;
		border-radius: 10px;
		background: var(--brand);
		color: #fff;
		border: none;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
	}

	.btn-primary:disabled { opacity: 0.5; cursor: default; }
	.btn-primary:hover:not(:disabled) { opacity: 0.88; }

	.data-actions { display: grid; gap: 8px; }

	.btn-outline {
		padding: 10px 16px;
		border-radius: 10px;
		border: 1.5px solid var(--brand);
		background: #eef2ff;
		color: var(--brand);
		font-size: 0.88rem;
		font-weight: 600;
		cursor: pointer;
	}

	.btn-outline:hover { background: var(--brand); color: #fff; }

	.danger-zone {
		padding: 14px;
		border-radius: 10px;
		border: 1px solid #fecaca;
		background: #fff5f5;
		display: grid;
		gap: 8px;
	}

	.danger-title { color: var(--danger) !important; }

	.btn-danger {
		padding: 8px 16px;
		border-radius: 8px;
		border: 1.5px solid var(--danger);
		background: #fee2e2;
		color: var(--danger);
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
	}

	.btn-danger:hover { background: var(--danger); color: #fff; }

	.hint-text { font-size: 0.73rem; color: var(--muted); margin: 0; }
	.info-text { font-size: 0.9rem; font-weight: 600; margin: 0; }
	.stale { color: var(--danger); }
</style>
