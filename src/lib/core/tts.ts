import type { Word } from "../types/models";
import { stripFuriganaNotation } from "./furigana";

export interface SpeakOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice | null;
}

function buildUtterance(text: string, options?: SpeakOptions): SpeechSynthesisUtterance {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = options?.lang ?? "ja-JP";
  utterance.rate = options?.rate ?? 1;
  utterance.pitch = options?.pitch ?? 1;
  utterance.volume = options?.volume ?? 1;
  if (options?.voice) utterance.voice = options.voice;
  return utterance;
}

export function speakWordReading(word: Word, options?: SpeakOptions): void {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return;
  }

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(buildUtterance(word.lettura, options));
}

export function speakSentenceJapanese(sentenceWithFurigana: string, options?: SpeakOptions): void {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return;
  }

  const plainText = stripFuriganaNotation(sentenceWithFurigana);
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(buildUtterance(plainText, options));
}

// Come speakSentenceJapanese, ma ritorna una Promise che si risolve quando
// l'audio è finito (o subito, se il TTS non è disponibile): utile per far
// partire un timer solo dopo che la voce ha finito di parlare.
export function speakSentenceJapaneseAsync(sentenceWithFurigana: string, options?: SpeakOptions): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve();
  }
  const plainText = stripFuriganaNotation(sentenceWithFurigana);
  window.speechSynthesis.cancel();
  return new Promise((resolve) => {
    const utterance = buildUtterance(plainText, options);
    let done = false;
    const finish = (): void => { if (!done) { done = true; resolve(); } };
    utterance.onend = finish;
    utterance.onerror = finish;
    // Fallback: alcune implementazioni non emettono onend in modo affidabile.
    setTimeout(finish, Math.min(8000, 1200 + plainText.length * 180));
    window.speechSynthesis.speak(utterance);
  });
}

// ── Dialoghi (choukai): battute in sequenza, voce diversa per personaggio ──

function getJapaneseVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("ja"));
}

export interface DialogueSpeakLine {
  personaggio: string;
  testo: string;
}

// Se ci sono più voci giapponesi ogni personaggio ne riceve una; altrimenti
// si differenzia col pitch. Ritorna quando l'ultima battuta è finita.
export function speakDialogue(lines: DialogueSpeakLine[], rate = 1): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve();
  }

  window.speechSynthesis.cancel();
  const voices = getJapaneseVoices();
  const speakers = [...new Set(lines.map((l) => l.personaggio))];

  return new Promise((resolve) => {
    let index = 0;
    const next = (): void => {
      if (index >= lines.length) {
        resolve();
        return;
      }
      const line = lines[index]!;
      index += 1;
      const speakerIndex = speakers.indexOf(line.personaggio);
      const utterance = buildUtterance(stripFuriganaNotation(line.testo), { rate });
      if (voices.length > 1) {
        utterance.voice = voices[speakerIndex % voices.length]!;
      } else {
        utterance.pitch = 1 + (speakerIndex % 2) * 0.35;
      }
      utterance.onend = () => setTimeout(next, 350);
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    };
    next();
  });
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
