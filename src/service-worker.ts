/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

// Service worker SvelteKit: pre-cachea build e static (incluso il seed),
// così l'app funziona offline. `version` cambia a ogni build → cache nuova
// e pulizia della vecchia all'activate.
import { base, build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE_NAME = `renkei-${version}`;
// App SPA: `fallback: index.html`. La shell NON è in build/files, quindi va
// precachata a mano, altrimenti un reload offline su una rotta non visitata
// non trova nulla in cache. È la stessa HTML per ogni rotta (routing client).
const APP_SHELL = `${base}/index.html`;
const ASSETS = [...build, ...files, APP_SHELL];

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => cache.addAll(ASSETS))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
			.then(() => sw.clients.claim())
	);
});

sw.addEventListener('fetch', (event) => {
	const request = event.request;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.origin !== sw.location.origin) return;

	// Asset buildati e static: cache-first (sono immutabili per versione).
	if (ASSETS.includes(url.pathname)) {
		event.respondWith(
			caches.open(CACHE_NAME).then(async (cache) => {
				const cached = await cache.match(url.pathname);
				return cached ?? fetch(request);
			})
		);
		return;
	}

	// Navigazioni: network-first con fallback alla cache (offline).
	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request)
				.then((response) => {
					const clone = response.clone();
					caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
					return response;
				})
				.catch(async () => {
					// Offline: la rotta esatta potrebbe non essere mai stata visitata.
					// Fallback alla shell precachata (SPA: il router client fa il resto).
					const cache = await caches.open(CACHE_NAME);
					const cached = await cache.match(request);
					return cached ?? (await cache.match(APP_SHELL)) ?? Response.error();
				})
		);
	}
});
