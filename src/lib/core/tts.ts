import type { Word } from "../types/models";
import { stripFuriganaNotation } from "./furigana";

export interface SpeakOptions {
  waitMs?: number; // tetto all'attesa della fine, per chi deve sapere quando la voce ha finito
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

// Testo da far leggere al TTS per una parola o una sua forma: i kanji letti da
// soli sbagliano (下宿 → «shimajuku»), la lettura del catalogo no. La forma
// coniugata (下宿した, 食べなかった) riusa la lettura del tema kanji.
export function speechTextFor(text: string, word: Word | null | undefined): string {
  if (!word || word.scrittura === word.lettura) return text;
  if (text === word.scrittura) return word.lettura;
  const tail = word.scrittura.match(/[ぁ-ん]*$/u)?.[0] ?? "";
  const stem = word.scrittura.slice(0, word.scrittura.length - tail.length);
  if (!stem || !word.lettura.endsWith(tail)) return text;
  const stemReading = word.lettura.slice(0, word.lettura.length - tail.length);
  return text.startsWith(stem) ? stemReading + text.slice(stem.length) : text;
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
// Quante letture sono partite davvero: a schermo bloccato il telefono può sospendere
// la voce, e il timer di riserva farebbe sembrare finita una frase mai detta.
let speechStarts = 0;
export const speechStartCount = (): number => speechStarts;

// generazione della voce: cambia a ogni nuova frase o stop, e ferma la coda
let speakGen = 0;

export function speakSentenceJapaneseAsync(sentenceWithFurigana: string, options?: SpeakOptions): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve();
  }
  const plainText = stripFuriganaNotation(sentenceWithFurigana);
  window.speechSynthesis.cancel();
  const gen = ++speakGen;
  // Testi lunghi frase per frase: un'unica battuta di 20-30 secondi veniva
  // troncata (Chrome su Android si ferma da solo, e il tetto waitMs scadeva
  // prima della fine facendo partire la battuta dopo).
  const chunks = plainText.length > 60 ? plainText.split(/(?<=[。！？!?])/).map((c) => c.trim()).filter(Boolean) : [plainText];
  return new Promise((resolve) => {
    let i = 0;
    const next = (): void => {
      if (i >= chunks.length || gen !== speakGen) { resolve(); return; }
      const text = chunks[i]!;
      i += 1;
      const utterance = buildUtterance(text, options);
      let done = false;
      const finish = (): void => { if (!done) { done = true; next(); } };
      utterance.onstart = () => { speechStarts += 1; };
      utterance.onend = finish;
      utterance.onerror = finish;
      // Fallback: alcune implementazioni non emettono onend in modo affidabile.
      // Per frase: mai meno del tempo di lettura (≈ 250 ms a carattere).
      const est = 1500 + text.length * 250;
      setTimeout(finish, chunks.length > 1 ? Math.max(est, Math.min(options?.waitMs ?? est, est * 2)) : options?.waitMs ?? Math.min(8000, 1200 + text.length * 180));
      window.speechSynthesis.speak(utterance);
    };
    next();
  });
}

// Parla più battute in sequenza SENZA che l'una annulli l'altra (utile quando
// due personaggi parlano uno dopo l'altro nella stessa azione). Cancella solo
// una volta all'inizio, poi concatena con onend.
export function speakSequence(items: { text: string; options?: SpeakOptions }[]): void {
  if (typeof window === "undefined" || !window.speechSynthesis || items.length === 0) {
    return;
  }
  window.speechSynthesis.cancel();
  let i = 0;
  const next = (): void => {
    if (i >= items.length) return;
    const it = items[i]!;
    i += 1;
    const utterance = buildUtterance(stripFuriganaNotation(it.text), it.options);
    utterance.onend = () => next();
    utterance.onerror = () => next();
    window.speechSynthesis.speak(utterance);
  };
  next();
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
        // Con una sola voce disponibile, alterna un pitch lievemente più basso
        // (mai più alto: uno shift verso l'alto tende a suonare distorto sui
        // motori TTS più scarni — segnalato dall'utente). Scarto contenuto,
        // come in voiceParams() (max ±18%, qui prima era +35%).
        utterance.pitch = speakerIndex % 2 === 0 ? 1 : 0.88;
      }
      utterance.onend = () => setTimeout(next, 350);
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    };
    next();
  });
}

export function stopSpeaking(): void {
  speakGen += 1; // ferma anche le frasi in coda di speakSentenceJapaneseAsync
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
