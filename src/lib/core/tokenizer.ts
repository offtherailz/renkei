import { loadDefaultJapaneseParser } from "budoux";

export interface JapaneseTokenizer {
  tokenize(text: string): string[];
}

export class BudouxJapaneseTokenizer implements JapaneseTokenizer {
  private constructor(private readonly parser: { parse: (text: string) => string[] }) {}

  static async create(): Promise<BudouxJapaneseTokenizer> {
    const parser = await loadDefaultJapaneseParser();
    return new BudouxJapaneseTokenizer(parser);
  }

  tokenize(text: string): string[] {
    return this.parser.parse(text).map((t) => t.trim()).filter(Boolean);
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
