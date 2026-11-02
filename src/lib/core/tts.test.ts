import { describe, expect, it } from "vitest";
import { speechTextFor } from "./tts";
import type { Word } from "../types/models";

const w = (scrittura: string, lettura: string) => ({ scrittura, lettura }) as Word;

describe("speechTextFor", () => {
  it("la parola in kanji si legge con la lettura del catalogo (下宿 ≠ shimajuku)", () => {
    expect(speechTextFor("下宿", w("下宿", "げしゅく"))).toBe("げしゅく");
  });
  it("forma coniugata: tema kanji letto, desinenza com'è", () => {
    expect(speechTextFor("食べなかった", w("食べる", "たべる"))).toBe("たべなかった");
    expect(speechTextFor("下宿した", w("下宿", "げしゅく"))).toBe("げしゅくした");
  });
  it("senza parola o testo estraneo: invariato", () => {
    expect(speechTextFor("下宿", null)).toBe("下宿");
    expect(speechTextFor("学校", w("下宿", "げしゅく"))).toBe("学校");
  });
});
