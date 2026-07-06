// Piccoli effetti sonori sintetizzati (Web Audio), senza file audio.

function ctx(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
	return Ctor ? new Ctor() : null;
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
