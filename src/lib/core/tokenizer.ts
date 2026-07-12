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

export async function createDefaultTokenizer(): Promise<JapaneseTokenizer> {
  try {
    return await BudouxJapaneseTokenizer.create();
  } catch {
    return new FallbackJapaneseTokenizer();
  }
}
