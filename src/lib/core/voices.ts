// Selezione della voce TTS per genere. Il Web Speech API non espone il genere
// in modo standard: lo indoviniamo dal nome della voce. Se non troviamo una
// voce chiaramente del genere giusto, ripieghiamo sulla voce di default
// regolando il pitch (femminile ≈ default, maschile più profondo).

import type { SpeakOptions } from './tts';

export type Gender = 'maschile' | 'femminile';

const FEMALE_HINTS = ['female', 'kyoko', 'haruka', 'ayumi', 'nanami', 'sayaka', 'mizuki', 'o-ren', 'women', 'josei'];
const MALE_HINTS = ['male', 'otoya', 'hattori', 'ichiro', 'daichi', 'naoki', 'takeru', 'dansei'];

function jaVoices(): SpeechSynthesisVoice[] {
	if (typeof window === 'undefined' || !window.speechSynthesis) return [];
	return window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('ja'));
}

// Ritorna una voce del genere richiesto SOLO se il nome lo indica chiaramente,
// altrimenti null (meglio la default di sistema che una voce a caso).
function findGenderVoice(gender: Gender): SpeechSynthesisVoice | null {
	const hints = gender === 'femminile' ? FEMALE_HINTS : MALE_HINTS;
	const voices = jaVoices();
	return voices.find((v) => {
		const n = `${v.name} ${v.voiceURI}`.toLowerCase();
		return hints.some((h) => n.includes(h));
	}) ?? null;
}

export function opposite(g: Gender): Gender {
	return g === 'maschile' ? 'femminile' : 'maschile';
}

// Parametri di voce per un genere.
// - femminile: se c'è una voce femminile la usiamo a tono naturale; altrimenti
//   lasciamo la voce di default (di solito è già femminile e "bella").
// - maschile: voce maschile se c'è (tono leggermente basso); altrimenti la
//   default abbassata parecchio per renderla più profonda.
export function voiceParams(gender: Gender): SpeakOptions {
	const v = findGenderVoice(gender);
	if (gender === 'femminile') {
		return v ? { voice: v, pitch: 1.0, rate: 1 } : { voice: null, pitch: 1.1, rate: 1 };
	}
	return v ? { voice: v, pitch: 0.85, rate: 0.98 } : { voice: null, pitch: 0.6, rate: 0.94 };
}

// Alcuni browser popolano le voci in modo asincrono: forza un caricamento.
export function primeVoices(): void {
	if (typeof window === 'undefined' || !window.speechSynthesis) return;
	window.speechSynthesis.getVoices();
}
