// Selezione della voce TTS per genere. Il Web Speech API non espone il genere
// in modo standard: lo indoviniamo dal nome della voce (voci giapponesi note +
// parole chiave). Se non troviamo una voce del genere giusto, ripieghiamo sul
// pitch (più alto = femminile, più basso = maschile) così l'effetto resta.

import type { SpeakOptions } from './tts';

export type Gender = 'maschile' | 'femminile';
type Who = 'user' | 'other';

const FEMALE_HINTS = ['female', 'kyoko', 'haruka', 'ayumi', 'nanami', 'sayaka', 'mizuki', 'o-ren', 'women', 'josei', 'she'];
const MALE_HINTS = ['male', 'otoya', 'hattori', 'ichiro', 'daichi', 'naoki', 'ren', 'takeru', 'dansei', 'he '];

function jaVoices(): SpeechSynthesisVoice[] {
	if (typeof window === 'undefined' || !window.speechSynthesis) return [];
	return window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('ja'));
}

function guessGender(v: SpeechSynthesisVoice): Gender | null {
	const n = `${v.name} ${v.voiceURI}`.toLowerCase();
	if (FEMALE_HINTS.some((h) => n.includes(h))) return 'femminile';
	if (MALE_HINTS.some((h) => n.includes(h))) return 'maschile';
	return null;
}

function pickVoice(gender: Gender): SpeechSynthesisVoice | null {
	const voices = jaVoices();
	if (voices.length === 0) return null;
	const match = voices.find((v) => guessGender(v) === gender);
	if (match) return match;
	// Nessuna corrispondenza sul genere: se ci sono almeno due voci JP, dai la
	// seconda all'"altro" così suonano diverse; altrimenti la prima.
	return gender === 'maschile' ? voices[voices.length - 1]! : voices[0]!;
}

// Parametri di voce per chi parla ('user' = l'utente, 'other' = interlocutore
// di sesso opposto), dato il genere scelto dall'utente nelle impostazioni.
export function voiceParams(userGender: Gender, who: Who): SpeakOptions {
	const target: Gender = who === 'user'
		? userGender
		: userGender === 'maschile' ? 'femminile' : 'maschile';
	const voice = pickVoice(target);
	const matched = voice ? guessGender(voice) === target : false;
	// Se la voce trovata non è chiaramente del genere giusto, spingiamo il pitch.
	const pitch = target === 'femminile' ? (matched ? 1.05 : 1.35) : (matched ? 0.95 : 0.7);
	return { voice, pitch };
}

// Alcuni browser popolano le voci in modo asincrono: forza un caricamento.
export function primeVoices(): void {
	if (typeof window === 'undefined' || !window.speechSynthesis) return;
	window.speechSynthesis.getVoices();
}
