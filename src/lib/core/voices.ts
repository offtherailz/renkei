// Selezione della voce TTS per genere. Il Web Speech API non espone il genere
// in modo standard: lo indoviniamo dal nome della voce. Se non troviamo una
// voce chiaramente del genere giusto, ripieghiamo sulla voce di default
// regolando il pitch (femminile ≈ default, maschile più profondo).

import type { SpeakOptions } from './tts';

export type Gender = 'maschile' | 'femminile';

// Nomi standard delle voci giapponesi nei vari sistemi:
// Apple: Kyoko/O-ren (F), Otoya/Hattori (M). Microsoft: Haruka/Ayumi/Nanami (F),
// Ichiro/Keita (M). Google/Android usa il naming ...-A/-B (F) e ...-C/-D (M).
const FEMALE_HINTS = ['female', 'kyoko', 'o-ren', 'haruka', 'ayumi', 'nanami', 'sayaka', 'mizuki', 'women', 'josei', '女'];
const MALE_HINTS = ['male', 'otoya', 'hattori', 'ichiro', 'keita', 'daichi', 'naoki', 'takeru', 'takumi', 'kenji', 'dansei', '男'];

function jaVoices(): SpeechSynthesisVoice[] {
	if (typeof window === 'undefined' || !window.speechSynthesis) return [];
	return window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('ja'));
}

// Indovina il genere di una voce dal nome/URI. Copre i naming standard.
function classifyVoice(v: SpeechSynthesisVoice): Gender | null {
	const n = `${v.name} ${v.voiceURI}`.toLowerCase();
	// Google/Android: ja-JP-Standard/Wavenet/Neural2-A|B = femminili, -C|D = maschili.
	const m = n.match(/(?:standard|wavenet|neural2)-([a-d])/);
	if (m) return m[1] === 'a' || m[1] === 'b' ? 'femminile' : 'maschile';
	if (MALE_HINTS.some((h) => n.includes(h))) return 'maschile';
	if (FEMALE_HINTS.some((h) => n.includes(h))) return 'femminile';
	return null;
}

// Ritorna una voce del genere richiesto SOLO se identificabile con certezza,
// altrimenti null (meglio la default di sistema che una voce a caso).
function findGenderVoice(gender: Gender): SpeechSynthesisVoice | null {
	return jaVoices().find((v) => classifyVoice(v) === gender) ?? null;
}

export function opposite(g: Gender): Gender {
	return g === 'maschile' ? 'femminile' : 'maschile';
}

// Parametri di voce per un genere. Il pitch-shift del Web Speech distorce la
// voce (suono "robotico"), quindi lo usiamo il meno possibile: se troviamo una
// voce vera del genere giusto la lasciamo al naturale.
// - femminile: voce femminile al naturale; altrimenti la default (di solito già
//   femminile) con un ritocco minimo.
// - maschile: voce maschile al naturale se c'è; altrimenti, se ci sono più voci
//   giapponesi, ne prendiamo una diversa dalla default con un abbassamento lieve;
//   in ultima istanza abbassiamo di poco la default (naturale > profondo).
export function voiceParams(gender: Gender): SpeakOptions {
	const v = findGenderVoice(gender);
	if (gender === 'femminile') {
		return v ? { voice: v, pitch: 1.0, rate: 1 } : { voice: null, pitch: 1.06, rate: 1 };
	}
	if (v) return { voice: v, pitch: 1.0, rate: 0.98 };
	const voices = jaVoices();
	if (voices.length > 1) return { voice: voices[voices.length - 1]!, pitch: 0.92, rate: 0.97 };
	return { voice: null, pitch: 0.82, rate: 0.96 };
}

// Alcuni browser popolano le voci in modo asincrono: forza un caricamento.
export function primeVoices(): void {
	if (typeof window === 'undefined' || !window.speechSynthesis) return;
	window.speechSynthesis.getVoices();
}
