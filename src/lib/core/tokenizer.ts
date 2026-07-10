import { loadDefaultJapaneseParser } from "budoux";

export interface JapaneseTokenizer {
  tokenize(text: string): string[];
}

// BudouX a volte stacca una particella-kana a inizio frase da una parola che
// inizia con lo stesso kana (のどが → の|どが): una frase non può iniziare con
// una particella isolata, quindi la riattacchiamo al token seguente.
const LONE_PARTICLE_KANA = new Set(["の", "が", "を", "に", "は", "で", "と", "へ", "も", "や"]);

function fixLeadingParticleSplits(tokens: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i]!;
    const prev = out[out.length - 1];
    const atSentenceStart = prev === undefined || /[。！？]$/.test(prev);
    if (atSentenceStart && LONE_PARTICLE_KANA.has(t) && i + 1 < tokens.length) {
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

export async function createDefaultTokenizer(): Promise<JapaneseTokenizer> {
  try {
    return await BudouxJapaneseTokenizer.create();
  } catch {
    return new FallbackJapaneseTokenizer();
  }
}
