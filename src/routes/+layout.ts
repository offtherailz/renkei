// Disable SSR for the entire app — this is a client-only SPA using IndexedDB (Dexie)
export const ssr = false;
export const prerender = false;

import { loadPrivateMazzi } from '$lib/db/course-mazzi';

// I mazzi delle lezioni stanno nel database del dispositivo: caricati prima delle pagine.
export async function load(): Promise<Record<string, never>> {
	await loadPrivateMazzi();
	return {};
}
