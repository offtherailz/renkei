import { describe, expect, it } from "vitest";
import { naiveReading, parseIrregularReadings, voicingVariants } from "./counterReadings";
import type { Counter } from "../types/models";

const hon: Counter = {
  id: "本",
  simbolo: "本",
  lettura: "ほん",
  significato: { it: "", en: "" },
  livello_jlpt: "N5",
  letture_irregolari: "いっぽん (1)・さんぼん (3)・ろっぽん (6)・はっぽん (8)・じゅっぽん (10)",
  updated_at: 0
} as Counter;

describe("parseIrregularReadings", () => {
  it("estrae coppie numero/lettura", () => {
    const pairs = parseIrregularReadings(hon);
    expect(pairs).toContainEqual({ num: 3, reading: "さんぼん" });
    expect(pairs).toContainEqual({ num: 1, reading: "いっぽん" });
    expect(pairs).toHaveLength(5);
  });

  it("gestisce note extra tipo よにん (4, non ×よんにん)", () => {
    const nin = { ...hon, letture_irregolari: "ひとり (1)・ふたり (2)・よにん (4, non ×よんにん)" };
    expect(parseIrregularReadings(nin as Counter)).toContainEqual({ num: 4, reading: "よにん" });
  });
});

describe("voicingVariants", () => {
  it("さんぼん → さんほん e さんぽん", () => {
    const v = voicingVariants("さんぼん");
    expect(v).toContain("さんほん");
    expect(v).toContain("さんぽん");
  });

  it("いっぴき → いっひき e いっびき", () => {
    const v = voicingVariants("いっぴき");
    expect(v).toContain("いっひき");
    expect(v).toContain("いっびき");
  });
});

describe("naiveReading", () => {
  it("concatena numero e lettura base", () => {
    expect(naiveReading(3, hon)).toBe("さんほん");
  });
});
