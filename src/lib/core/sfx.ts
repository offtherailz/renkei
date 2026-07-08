// Piccoli effetti sonori sintetizzati (Web Audio), senza file audio.

function ctx(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
	return Ctor ? new Ctor() : null;
}

// Squillo di telefono: due trilli (coppie di toni) tipo telefono giapponese.
export function playRing(): void {
	const ac = ctx();
	if (!ac) return;
	const now = ac.currentTime;
	// due trilli, ognuno = tono ~1100Hz ripetuto
	for (const start of [0, 0.9]) {
		for (const t of [0, 0.18]) {
			const at = now + start + t;
			const o = ac.createOscillator();
			const g = ac.createGain();
			o.type = 'sine';
			o.frequency.value = 1100;
			g.gain.setValueAtTime(0.0001, at);
			g.gain.exponentialRampToValueAtTime(0.15, at + 0.02);
			g.gain.setValueAtTime(0.15, at + 0.14);
			g.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
			o.connect(g);
			g.connect(ac.destination);
			o.start(at);
			o.stop(at + 0.18);
		}
	}
	setTimeout(() => ac.close(), 1400);
}

// Tintinnio di posate: due brevi "clink" acuti.
export function playClink(): void {
	const ac = ctx();
	if (!ac) return;
	const now = ac.currentTime;
	for (const t of [0, 0.13]) {
		const o = ac.createOscillator();
		const g = ac.createGain();
		o.type = 'triangle';
		o.frequency.value = 2300 + Math.random() * 500;
		g.gain.setValueAtTime(0.0001, now + t);
		g.gain.exponentialRampToValueAtTime(0.18, now + t + 0.005);
		g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.12);
		o.connect(g);
		g.connect(ac.destination);
		o.start(now + t);
		o.stop(now + t + 0.14);
	}
	setTimeout(() => ac.close(), 600);
}
