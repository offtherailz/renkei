// Segnali per orientarsi senza guardare: due note = voce nuova, una nota grave =
// risposta, doppio bip = buco nella frase. Serve un tocco per sbloccare l'audio.
let audioCtx: AudioContext | null = null;

export function primeCues(): void {
	try {
		const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
		if (Ctor && !audioCtx) audioCtx = new Ctor();
		void audioCtx?.resume?.();
	} catch {
		/* niente segnali: la voce va comunque */
	}
}

async function cue(notes: { f: number; at: number }[], ms: number): Promise<void> {
	if (!audioCtx) return;
	try {
		void audioCtx.resume?.();
		const now = audioCtx.currentTime;
		for (const n of notes) {
			const o = audioCtx.createOscillator();
			const g = audioCtx.createGain();
			o.type = 'sine';
			o.frequency.value = n.f;
			const t = now + n.at;
			g.gain.setValueAtTime(0.0001, t);
			g.gain.exponentialRampToValueAtTime(0.18, t + 0.015);
			g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
			o.connect(g);
			g.connect(audioCtx.destination);
			o.start(t);
			o.stop(t + 0.25);
		}
	} catch {
		return;
	}
	await new Promise((r) => setTimeout(r, ms));
}

export const cueNewItem = (): Promise<void> => cue([{ f: 880, at: 0 }, { f: 1175, at: 0.14 }], 550);
export const cueAnswer = (): Promise<void> => cue([{ f: 440, at: 0 }], 350);
export const cueBlank = (): Promise<void> => cue([{ f: 1320, at: 0 }, { f: 1320, at: 0.12 }], 700);
