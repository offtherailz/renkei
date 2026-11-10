// 事件 — suoni del gioco, sintetizzati con Web Audio (niente file audio).
// Melodie originali: niente jingle di catene o stazioni reali (sono protetti).

let ac: AudioContext | null = null;
let master: GainNode | null = null;

function audio(): { ac: AudioContext; out: GainNode } | null {
	if (typeof window === 'undefined') return null;
	if (!ac) {
		const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
		if (!Ctor) return null;
		ac = new Ctor();
		master = ac.createGain();
		master.gain.value = 0.7;
		master.connect(ac.destination);
	}
	// i browser tengono l'audio sospeso finché non si tocca lo schermo
	if (ac.state === 'suspended') void ac.resume();
	return { ac, out: master! };
}

// una nota: frequenza, inizio, durata, volume, forma d'onda
function nota(f: number, at: number, dur: number, vol = 0.12, tipo: OscillatorType = 'sine', glide?: number): void {
	const a = audio();
	if (!a) return;
	const t = a.ac.currentTime + at;
	const o = a.ac.createOscillator();
	const g = a.ac.createGain();
	o.type = tipo;
	o.frequency.setValueAtTime(f, t);
	if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
	g.gain.setValueAtTime(0.0001, t);
	g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur / 4));
	g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
	o.connect(g);
	g.connect(a.out);
	o.start(t);
	o.stop(t + dur + 0.02);
}

// telefono di casa/ufficio: due serie di trilli
export function telefono(): void {
	for (const s of [0, 1.1]) for (let i = 0; i < 8; i++) nota(i % 2 ? 1320 : 1100, s + i * 0.05, 0.05, 0.09, 'square');
}

// campanello della porta di un negozio: tre note morbide (motivo originale)
export function campanello(): void {
	[659.3, 523.3, 784, 1046.5].forEach((f, i) => nota(f, i * 0.16, 0.5, 0.1, 'sine'));
}

// jingle di partenza in stazione (motivo originale, stile «発車メロディ»)
export function stazione(): void {
	const m = [523.3, 659.3, 784, 880, 784, 659.3, 698.5, 784, 1046.5];
	m.forEach((f, i) => {
		nota(f, i * 0.2, 0.32, 0.07, 'triangle');
		nota(f * 2, i * 0.2, 0.18, 0.025, 'sine');
	});
	// «ピンポーン»
	nota(1318.5, m.length * 0.2 + 0.2, 0.5, 0.08);
	nota(1046.5, m.length * 0.2 + 0.55, 0.8, 0.08);
}

// uccellini: cinguettii veloci (glissando acuto)
export function uccellini(volte = 3): void {
	let t = 0;
	for (let k = 0; k < volte; k++) {
		const n = 2 + Math.floor(Math.random() * 3);
		for (let i = 0; i < n; i++) {
			const f = 3200 + Math.random() * 1800;
			nota(f, t, 0.07, 0.05, 'sine', f * (Math.random() < 0.5 ? 1.35 : 0.75));
			t += 0.09 + Math.random() * 0.05;
		}
		t += 0.35 + Math.random() * 0.5;
	}
}

// grilli d'estate/sera (鈴虫): trilli brevi e ripetuti
export function grilli(): void {
	let t = 0;
	for (let k = 0; k < 3; k++) {
		for (let i = 0; i < 6; i++) nota(4400 + (k % 2) * 120, t + i * 0.045, 0.03, 0.02, 'sine');
		t += 0.6 + Math.random() * 0.4;
	}
}

// piccolo «din» quando ricevi un oggetto o un obiettivo
export function din(): void {
	nota(1046.5, 0, 0.18, 0.06);
	nota(1568, 0.09, 0.3, 0.05);
}

// risposta giusta: arpeggio che sale, con un luccichio
export function giusto(): void {
	[784, 987.8, 1318.5].forEach((f, i) => nota(f, i * 0.08, 0.22, 0.07, 'triangle'));
	nota(2637, 0.24, 0.35, 0.025);
}

// risposta sbagliata: due note morbide che scendono («あれ?»), non una punizione
export function sbagliato(): void {
	nota(392, 0, 0.2, 0.07, 'triangle');
	nota(311.1, 0.18, 0.38, 0.07, 'triangle', 293.7);
}

// un timbro sul quaderno: colpo sordo «ぽん» e un piccolo din
export function timbro(): void {
	nota(140, 0, 0.12, 0.2, 'sine', 60);
	nota(1318.5, 0.18, 0.25, 0.05);
	nota(1760, 0.28, 0.4, 0.05);
}

// ── ambiente: uccellini di giorno, grilli di notte, ogni tanto
let timer: ReturnType<typeof setTimeout> | null = null;
// pioggia: rumore filtrato continuo, che entra e sfuma piano
let pioggia: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
function pioggiaOn(): void {
	if (pioggia) return;
	const a = audio();
	if (!a) return;
	const len = a.ac.sampleRate * 2;
	const buf = a.ac.createBuffer(1, len, a.ac.sampleRate);
	const d = buf.getChannelData(0);
	let last = 0;
	for (let i = 0; i < len; i++) {
		last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04; // rumore «marrone»: più cupo del bianco
		d[i] = last * 3;
	}
	const src = a.ac.createBufferSource();
	src.buffer = buf;
	src.loop = true;
	const filtro = a.ac.createBiquadFilter();
	filtro.type = 'bandpass';
	filtro.frequency.value = 1400;
	filtro.Q.value = 0.6;
	const gain = a.ac.createGain();
	gain.gain.value = 0;
	gain.gain.linearRampToValueAtTime(0.35, a.ac.currentTime + 1.5);
	src.connect(filtro).connect(gain).connect(a.out);
	src.start();
	pioggia = { src, gain };
}
function pioggiaOff(): void {
	if (!pioggia || !ac) return;
	const p = pioggia;
	pioggia = null;
	p.gain.gain.linearRampToValueAtTime(0, ac.currentTime + 1);
	setTimeout(() => p.src.stop(), 1100);
}

export function ambiente(quale: 'giorno' | 'notte' | 'pioggia' | null): void {
	if (timer) clearTimeout(timer);
	timer = null;
	if (quale === 'pioggia') {
		pioggiaOn();
		return;
	}
	pioggiaOff();
	if (!quale) return;
	const giro = (): void => {
		if (quale === 'giorno') uccellini(1 + Math.floor(Math.random() * 2));
		else grilli();
		timer = setTimeout(giro, (quale === 'giorno' ? 9000 : 6000) + Math.random() * 7000);
	};
	timer = setTimeout(giro, 1500);
}
