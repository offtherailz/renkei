import { describe, expect, it } from "vitest";
import type { Word } from "$lib/types/models";
import { kanaSearchKey } from "./romaji";
import { makeWordMatcher, rankWords } from "./wordSearch";

const w = (id: string, scrittura: string, lettura: string, it: string[]): Word =>
  ({ id, scrittura, lettura, significato: { it, en: [] } }) as unknown as Word;

const WORDS = [
  w("setsumeisho", "説明書", "せつめいしょ", ["manuale di istruzioni"]),
  w("setsumei", "説明", "せつめい", ["spiegazione"]),
  w("benkyou", "勉強", "べんきょう", ["studio"]),
  w("koohii", "コーヒー", "コーヒー", ["caffè"]),
];
const KEYS = new Map(WORDS.map((x) => [x.id, kanaSearchKey(x.lettura)]));
const search = (q: string) => rankWords(WORDS.filter((x) => makeWordMatcher(q, "it")(x, KEYS.get(x.id)!)), q, "it", KEYS).map((x) => x.id);

describe("ricerca parole", () => {
  it("romaji, con il match esatto in cima", () => {
    expect(search("setsumei")).toEqual(["setsumei", "setsumeisho"]);
  });
  it("vocali lunghe tolleranti e katakana", () => {
    expect(search("benkyoo")).toEqual(["benkyou"]);
    expect(search("koohii")).toEqual(["koohii"]);
  });
  it("kanji, kana e significato", () => {
    expect(search("説明")).toEqual(["setsumei", "setsumeisho"]);
    expect(search("べんきょ")).toEqual(["benkyou"]);
    expect(search("caffè")).toEqual(["koohii"]);
  });
  it("query vuota: tutto", () => {
    expect(WORDS.filter((x) => makeWordMatcher("", "it")(x, "")).length).toBe(4);
  });
});
