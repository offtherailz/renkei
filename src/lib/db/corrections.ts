// Correzioni utente alle voci del catalogo: patch che si applicano subito
// alla riga locale e si riapplicano dopo ogni re-import del seed. L'export
// produce JSON nel formato di scripts/data/word-overrides.json /
// grammar-overrides.json, pronto da fondere nel repo.

import { db } from './schema';
import type { UserCorrection } from '../types/models';

export async function saveCorrection(
	kind: 'word' | 'grammar',
	rawId: string,
	patch: Record<string, unknown>,
	motivo?: string
): Promise<void> {
	const id = `${kind}:${rawId}`;
	const existing = await db.user_corrections.get(id);
	// fotografa gli originali dei campi toccati (solo la prima volta per campo)
	const table = kind === 'word' ? db.words : db.grammar;
	const row = (await table.get(rawId)) as Record<string, unknown> | undefined;
	const original = { ...(existing?.original ?? {}) };
	for (const key of Object.keys(patch)) {
		if (!(key in original) && row) original[key] = row[key];
	}
	const merged: UserCorrection = {
		id,
		kind,
		patch: { ...(existing?.patch ?? {}), ...patch },
		original,
		motivo: motivo || existing?.motivo,
		updated_at: Date.now()
	};
	await db.user_corrections.put(merged);
	await applyCorrection(merged);
}

// Rimuove una correzione ripristinando i valori originali della voce.
export async function removeCorrection(id: string): Promise<void> {
	const c = await db.user_corrections.get(id);
	if (!c) return;
	const rawId = c.id.slice(c.kind.length + 1);
	const table = c.kind === 'word' ? db.words : db.grammar;
	const row = await table.get(rawId);
	if (row && c.original) {
		await table.put({ ...row, ...c.original, updated_at: Date.now() } as never);
	}
	await db.user_corrections.delete(id);
}

export async function listCorrections(): Promise<UserCorrection[]> {
	return db.user_corrections.orderBy('updated_at').reverse().toArray();
}

async function applyCorrection(c: UserCorrection): Promise<void> {
	const rawId = c.id.slice(c.kind.length + 1);
	const table = c.kind === 'word' ? db.words : db.grammar;
	const row = await table.get(rawId);
	if (!row) return;
	await table.put({ ...row, ...c.patch, updated_at: Date.now() } as never);
}

// Riapplica tutte le correzioni (dopo un re-import del seed). Se il seed
// nuovo ha cambiato un campo corretto, marca la correzione come "stale"
// (da riverificare) e aggiorna lo snapshot originale al valore nuovo.
export async function applyAllCorrections(): Promise<number> {
	const all = await db.user_corrections.toArray();
	for (const c of all) {
		const rawId = c.id.slice(c.kind.length + 1);
		const table = c.kind === 'word' ? db.words : db.grammar;
		const fresh = (await table.get(rawId)) as Record<string, unknown> | undefined;
		if (fresh && c.original) {
			let changed = false;
			const nextOriginal = { ...c.original };
			for (const key of Object.keys(c.patch)) {
				const freshVal = JSON.stringify(fresh[key]);
				if (freshVal !== JSON.stringify(c.original[key]) && freshVal !== JSON.stringify(c.patch[key])) {
					changed = true;
					nextOriginal[key] = fresh[key];
				}
			}
			if (changed) {
				await db.user_corrections.put({ ...c, original: nextOriginal, stale: true, updated_at: Date.now() });
			}
		}
		await applyCorrection(c);
	}
	return all.length;
}

// Export nel formato override della pipeline: { words: {...}, grammar: {...} }.
export async function exportCorrections(): Promise<string> {
	const all = await db.user_corrections.toArray();
	const words: Record<string, unknown> = {};
	const grammar: Record<string, unknown> = {};
	for (const c of all) {
		const rawId = c.id.slice(c.kind.length + 1);
		(c.kind === 'word' ? words : grammar)[rawId] = c.patch;
	}
	return JSON.stringify({ words, grammar }, null, 2);
}

export async function countCorrections(): Promise<number> {
	return db.user_corrections.count();
}
