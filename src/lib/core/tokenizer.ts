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

type SegmentiFile = { frasi: Record<string, [string, ...unknown[]]> };

const compatta = (s: string): string => s.replace(/[\s\u3000\u200B]+/g, "");

export function parseSegmenti(file: SegmentiFile): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const [frase, [seg]] of Object.entries(file.frasi)) {
    map.set(compatta(frase), seg.replace(/·/g, "").split("|"));
  }
  return map;
}

let segmentiUrl: string | null = null;
let segmentiPromise: Promise<Map<string, string[]> | null> | null = null;

export function configureSegmenti(url: string | null): void {
  if (url === segmentiUrl) return;
  segmentiUrl = url;
  segmentiPromise = null;
}

function loadSegmenti(): Promise<Map<string, string[]> | null> {
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

export class SegmentedJapaneseTokenizer implements JapaneseTokenizer {
  constructor(
    private readonly segmenti: Map<string, string[]>,
    private readonly fallback: JapaneseTokenizer
  ) {}

  tokenize(text: string): string[] {
    const pezzi = this.segmenti.get(compatta(text));
    return pezzi ? [...pezzi] : this.fallback.tokenize(text);
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
