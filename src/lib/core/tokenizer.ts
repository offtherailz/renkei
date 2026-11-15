import { loadDefaultJapaneseParser } from "budoux";

export interface JapaneseTokenizer {
  tokenize(text: string): string[];
}

// BudouX a volte stacca un kana isolato a inizio frase da una parola che
// inizia con quel kana (のどが → の|どが, うそを → う|そを, くすりの → く|すりの):
// una frase non può iniziare con un singolo kana isolato (a parte rarissime
// interiezioni, mai viste nel nostro corpus), quindi lo riattacchiamo sempre
// al token seguente — non solo per le particelle come prima.
const LONE_KANA = /^[ぁ-んァ-ヶ]$/;

function fixLeadingParticleSplits(tokens: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i]!;
    const prev = out[out.length - 1];
    const atSentenceStart = prev === undefined || /[。！？]$/.test(prev);
    if (atSentenceStart && LONE_KANA.test(t) && i + 1 < tokens.length) {
      out.push(t + tokens[i + 1]!);
      i += 1;
      continue;
    }
    out.push(t);
  }
  return out;
}

export class BudouxJapaneseTokenizer implements JapaneseTokenizer {
  private constructor(private readonly parser: { parse: (text: string) => string[] }) {}

  static async create(): Promise<BudouxJapaneseTokenizer> {
    const parser = await loadDefaultJapaneseParser();
    return new BudouxJapaneseTokenizer(parser);
  }

  tokenize(text: string): string[] {
    return fixLeadingParticleSplits(this.parser.parse(text).map((t) => t.trim()).filter(Boolean));
  }
}

export class FallbackJapaneseTokenizer implements JapaneseTokenizer {
  tokenize(text: string): string[] {
    return text
      .replace(/[、。！？]/g, (m) => ` ${m} `)
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean);
  }
}

// ── Segmenti precalcolati ──
// Le frasi del catalogo sono già divise in pezzi da scripts/segmenta-frasi.mjs
// (kuromoji + correzioni a mano → static/segmenti-n5n4.json): molto più
// affidabile di BudouX, che resta per il testo non a catalogo.
// L'URL lo imposta il layout (qui niente $app/paths: il modulo resta puro);
// senza URL, o se il file non si carica, si usa solo BudouX.

type SegmentiFile = {
  etichette?: Record<string, string>;
  frasi: Record<string, [string, Record<string, string[]>?]>;
};

// pezzi di una frase a catalogo e, pezzo per pezzo, i codici delle forme
// grammaticali riconosciute (te-iru, masen, passivo… vedi core/formeLink.ts)
export interface FraseSegmentata {
  pezzi: string[];
  forme: string[][];
}
export interface Segmenti {
  frasi: Map<string, FraseSegmentata>;
  etichette: Record<string, string>;
}

const compatta = (s: string): string => s.replace(/[\s\u3000\u200B]+/g, "");

export function parseSegmenti(file: SegmentiFile): Segmenti {
  const frasi = new Map<string, FraseSegmentata>();
  for (const [frase, [seg, forme]] of Object.entries(file.frasi)) {
    const pezzi = seg.replace(/·/g, "").split("|");
    frasi.set(compatta(frase), { pezzi, forme: pezzi.map((_p, i) => forme?.[i] ?? []) });
  }
  return { frasi, etichette: file.etichette ?? {} };
}

let segmentiUrl: string | null = null;
let segmentiPromise: Promise<Segmenti | null> | null = null;

export function configureSegmenti(url: string | null): void {
  if (url === segmentiUrl) return;
  segmentiUrl = url;
  segmentiPromise = null;
}

export function loadSegmenti(): Promise<Segmenti | null> {
  if (!segmentiUrl) return Promise.resolve(null);
  const url = segmentiUrl;
  segmentiPromise ??= fetch(url)
    .then((r) => (r.ok ? (r.json() as Promise<SegmentiFile>) : Promise.reject(new Error(String(r.status)))))
    .then(parseSegmenti)
    .catch(() => {
      // rete assente al primo avvio: si riprova alla prossima richiesta
      segmentiPromise = null;
      return null;
    });
  return segmentiPromise;
}

// La frase segmentata (pezzi + forme) se è a catalogo, con le etichette delle forme.
export async function segmentiDellaFrase(text: string): Promise<{ frase: FraseSegmentata | null; etichette: Record<string, string> }> {
  const segmenti = await loadSegmenti();
  return { frase: segmenti?.frasi.get(compatta(text)) ?? null, etichette: segmenti?.etichette ?? {} };
}

export class SegmentedJapaneseTokenizer implements JapaneseTokenizer {
  constructor(
    private readonly segmenti: Segmenti,
    private readonly fallback: JapaneseTokenizer
  ) {}

  tokenize(text: string): string[] {
    const frase = this.segmenti.frasi.get(compatta(text));
    return frase ? [...frase.pezzi] : this.fallback.tokenize(text);
  }

  // forme grammaticali della frase, se è a catalogo
  frase(text: string): FraseSegmentata | null {
    return this.segmenti.frasi.get(compatta(text)) ?? null;
  }

  get etichette(): Record<string, string> {
    return this.segmenti.etichette;
  }
}

async function createFallbackTokenizer(): Promise<JapaneseTokenizer> {
  try {
    return await BudouxJapaneseTokenizer.create();
  } catch {
    return new FallbackJapaneseTokenizer();
  }
}

export async function createDefaultTokenizer(): Promise<JapaneseTokenizer> {
  const [segmenti, fallback] = await Promise.all([loadSegmenti(), createFallbackTokenizer()]);
  return segmenti ? new SegmentedJapaneseTokenizer(segmenti, fallback) : fallback;
}
