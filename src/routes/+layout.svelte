<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import { dev } from '$app/environment';
	import '../lib/app.css';
	import { db } from '$lib/db/schema';
	import { importDatabaseFromJson } from '$lib/db/import';
	import {
		ensureDefaultObjectives,
		ensureDefaultSettings,
		ensureDefaultStudyGoal
	} from '$lib/db/objectives';
	import { appState } from '$lib/stores.svelte';
	import type { DatabaseSeed } from '$lib/types/models';

	const { children } = $props();

	const SEED_DATA_REVISION = '2026-07-05-choukai-v6';

	const isHome = $derived($page.url.pathname === `${base}/` || $page.url.pathname === `${base}`);
	const hideHeader = $derived(
		$page.url.pathname.startsWith(`${base}/quiz`) && appState.sessionState !== null
	);

	async function ensureSeedLoaded(): Promise<void> {
		const seedUrl = `${base}/seed-n5n4.json?v=${encodeURIComponent(SEED_DATA_REVISION)}`;
		const response = await fetch(seedUrl, { cache: 'no-store' });
		if (!response.ok) throw new Error('Seed non trovato.');
		const payload = await response.text();

		const counters = await db.counters.count();
		if (counters > 0) {
			const parsed = JSON.parse(payload) as DatabaseSeed;
			await db.words.bulkPut(parsed.words);
			await db.kanji.bulkPut(parsed.kanji);
			await db.grammar.bulkPut(parsed.grammar);
			await db.counters.bulkPut(parsed.counters);
			if (parsed.dialogues?.length) await db.dialogues.bulkPut(parsed.dialogues);
		} else {
			await importDatabaseFromJson(payload);
		}
	}

	async function setupServiceWorker(): Promise<void> {
		if (!('serviceWorker' in navigator)) return;
		if (dev) {
			// In dev il SW servirebbe la cache anche a server spento:
			// rimuoviamo eventuali registrazioni residue e le loro cache.
			const registrations = await navigator.serviceWorker.getRegistrations();
			await Promise.all(registrations.map((r) => r.unregister()));
			const keys = await caches.keys();
			await Promise.all(keys.filter((k) => k.startsWith('renkei-')).map((k) => caches.delete(k)));
			return;
		}
		await navigator.serviceWorker.register(`${base}/service-worker.js`);
	}

	onMount(async () => {
		setupServiceWorker().catch((e) => console.error('Errore service worker:', e));
		if (appState.initialized) return;
		try {
			await ensureSeedLoaded();
			await ensureDefaultObjectives();
			await ensureDefaultSettings();
			await ensureDefaultStudyGoal();

			const [settings, goal, profile] = await Promise.all([
				db.app_settings.get('default'),
				db.study_goals.get('default'),
				db.user_profile.get('default')
			]);

			if (settings) appState.settings = settings;
			if (goal) appState.studyGoal = goal;
			if (profile) appState.userProfile = profile;

			appState.initialized = true;
		} catch (e) {
			console.error('Errore inizializzazione:', e);
		}
	});
</script>

<div class="app-shell">
	{#if !hideHeader && !isHome}
		<header class="app-header">
			<a class="brand" href="{base}/">
				<img class="brand-logo" src="{base}/renkei-logo.svg" alt="" />
				<span class="brand-name">Renkei</span>
			</a>
			<span class="brand-hint">← torna alla home</span>
		</header>
	{/if}
	{@render children()}
</div>

<style>
	.app-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 8px;
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		text-decoration: none;
		color: var(--ink);
		font-weight: 800;
		font-size: 1.05rem;
	}

	.brand-logo {
		width: 26px;
		height: 26px;
	}

	.brand-hint {
		font-size: 0.72rem;
		color: var(--muted);
	}
</style>
