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

	const SEED_DATA_REVISION = '2026-06-07-catalog-v2';

	const navLinks = [
		{ href: `${base}/`, label: 'Home', icon: '🏠', section: '' },
		{ href: `${base}/quiz`, label: 'Quiz', icon: '⚡', section: 'quiz' },
		{ href: `${base}/courses`, label: 'Corsi', icon: '📚', section: 'courses' },
		{ href: `${base}/stats`, label: 'Stats', icon: '📊', section: 'stats' },
		{ href: `${base}/settings`, label: 'Impostazioni', icon: '⚙️', section: 'settings' }
	];

	function isActive(href: string): boolean {
		const path = $page.url.pathname;
		if (href === `${base}/`) return path === `${base}/` || path === `${base}`;
		return path.startsWith(href);
	}

	const hideNav = $derived(
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
	{@render children()}
</div>

{#if !hideNav}
	<nav class="bottom-nav">
		{#each navLinks as link}
			<a
				href={link.href}
				class="nav-item"
				class:nav-active={isActive(link.href)}
				aria-label={link.label}
			>
				<span class="nav-icon">{link.icon}</span>
				<span class="nav-label">{link.label}</span>
			</a>
		{/each}
	</nav>
{/if}

<style>
	.bottom-nav {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		background: rgba(255, 255, 255, 0.97);
		border-top: 1px solid var(--line);
		padding: 6px 0 max(6px, env(safe-area-inset-bottom));
		z-index: 50;
		box-shadow: 0 -4px 20px rgba(14, 29, 51, 0.08);
	}

	.nav-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: 4px 0;
		text-decoration: none;
		color: var(--muted);
		font-size: 0.7rem;
		font-weight: 500;
		transition: color 150ms;
	}

	.nav-item.nav-active {
		color: var(--brand);
	}

	.nav-icon {
		font-size: 1.3rem;
		line-height: 1;
	}

	.nav-label {
		font-size: 0.65rem;
		letter-spacing: 0.01em;
	}
</style>
