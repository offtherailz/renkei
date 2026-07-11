// Attrezzi condivisi dei giochi: mescolare, agganciare una parola alla sua
// scheda, registrare gli errori nei punti deboli. Ogni gioco li importa da qui
// invece di duplicarli (un fix vale per tutti).
import { base } from '$app/paths';
import { db } from '$lib/db/schema';
import { recordPracticeMiss } from './practiceMiss';
import { speakSentenceJapanese, speakSentenceJapaneseAsync } from './tts';
import { voiceParams, opposite, type Gender } from './voices';
import { appState } from '$lib/stores.svelte';

export function shuffle<T>(xs: readonly T[]): T[] {
	const a = [...xs];
	for (let i = a.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j]!, a[i]!];
	}
	return a;
}

export function pickRandom<T>(xs: readonly T[]): T {
	return xs[Math.floor(Math.random() * xs.length)]!;
}

// Cerca la parola per scrittura o lettura e restituisce id + link alla scheda.
export async function findWord(testo: string): Promise<{ id: string; detailHref: string } | null> {
	const w =
		(await db.words.where('scrittura').equals(testo).first()) ??
		(await db.words.where('lettura').equals(testo).first());
	if (!w) return null;
	return { id: w.id, detailHref: `${base}/detail/${encodeURIComponent(`word:${w.id}`)}` };
}

// Errore su una parola indicata col testo giapponese: alimenta i punti deboli
// (se la parola esiste nel vocabolario) e restituisce il link alla scheda.
export async function missWordByText(testo: string): Promise<string | null> {
	const hit = await findWord(testo);
	if (hit) await recordPracticeMiss('word:' + hit.id);
	return hit?.detailHref ?? null;
}

// Voce dell'utente dalle impostazioni e voce dell'interlocutore (sesso opposto).
export function userGender(): Gender {
	return appState.settings.voce_utente ?? 'femminile';
}
export function otherGender(): Gender {
	return opposite(userGender());
}

// もう一度 / ゆっくり: dici la richiesta (voce tua), poi risenti la battuta con
// la voce di chi l'ha detta (più piano se slow). Non finisce nel copione.
const REPEAT_REQ = ['すみません、もう一度おねがいします。', 'もう一度いいですか？', 'すみません、もう一度よろしいですか？'];
const SLOWER_REQ = ['すみません、もう少しゆっくりおねがいします。', 'もう少しゆっくり話していただけますか？', 'ゆっくりおねがいします。'];
export async function askRepeat(line: string, speaker: Gender, slow: boolean): Promise<void> {
	await speakSentenceJapaneseAsync(pickRandom(slow ? SLOWER_REQ : REPEAT_REQ), voiceParams(userGender()));
	speakSentenceJapanese(line, { ...voiceParams(speaker), rate: slow ? 0.6 : 1 });
}

// Snapshot SvelteKit per i giochi: conserva lo stato quando navighi via
// (📖 Scheda, popup) e torni con Indietro — senza, il gioco si rimonterebbe
// da zero con round nuovi. Uso nel +page.svelte del gioco:
//   export const snapshot = gameSnapshot(() => ({ scene, rounds, idx, ... }),
//                                        (s) => { scene = s.scene; ... });
export interface GameSnapshot<T> {
	capture: () => T;
	restore: (value: T) => void;
}
export function gameSnapshot<T>(capture: () => T, restore: (value: T) => void): GameSnapshot<T> {
	return { capture, restore };
}
