import { Word } from "../types/models";
import { stripFuriganaNotation } from "./furigana";

export interface SpeakOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

function buildUtterance(text: string, options?: SpeakOptions): SpeechSynthesisUtterance {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = options?.lang ?? "ja-JP";
  utterance.rate = options?.rate ?? 1;
  utterance.pitch = options?.pitch ?? 1;
  utterance.volume = options?.volume ?? 1;
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
