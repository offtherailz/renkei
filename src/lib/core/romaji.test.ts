import { describe, expect, it } from "vitest";
import { kanaSearchKey, looksLikeRomaji, romajiQueryKey, romajiToHiragana } from "./romaji";

describe("romajiToHiragana", () => {
  it.each([
    ["setsumei", "せつめい"],
    ["benkyou", "べんきょう"],
    ["kitte", "きって"],
    ["matcha", "まっちゃ"],
    ["zasshi", "ざっし"],
    ["konnichiwa", "こんにちわ"],
    ["kanji", "かんじ"],
    ["hon'ya", "ほんや"],
    ["honya", "ほにゃ"],
    ["shinbun", "しんぶん"],
    ["jisho", "じしょ"],
    ["zyugyou", "じゅぎょう"],
    ["ryokou", "りょこう"],
    ["Tōkyō", "とうきょう"],
    ["tsukue", "つくえ"],
    ["tukue", "つくえ"],
    ["chichi", "ちち"],
    ["onna no ko", "おんなのこ"],
  ])("%s → %s", (input, kana) => {
    expect(romajiToHiragana(input)).toBe(kana);
  });

  it("null se non convertibile", () => {
    expect(romajiToHiragana("xyz")).toBeNull();
    expect(romajiToHiragana("ql")).toBeNull();
  });
});

describe("kanaSearchKey", () => {
  it("vocali lunghe e katakana tolleranti", () => {
    expect(kanaSearchKey("べんきょう")).toBe(kanaSearchKey("べんきょお"));
    expect(kanaSearchKey("べんきょう")).toBe(kanaSearchKey("べんきょ"));
    expect(kanaSearchKey("せんせい")).toBe("せんせ");
    expect(kanaSearchKey("コーヒー")).toBe("こひ");
    expect(kanaSearchKey("すうがく")).toBe("すがく");
  });
});

describe("romajiQueryKey", () => {
  it("setsumei trova せつめい, benkyoo trova べんきょう", () => {
    expect(kanaSearchKey("せつめい").includes(romajiQueryKey("setsumei")!)).toBe(true);
    expect(kanaSearchKey("べんきょう").includes(romajiQueryKey("benkyoo")!)).toBe(true);
    expect(kanaSearchKey("べんきょう").includes(romajiQueryKey("benkyō")!)).toBe(true);
    expect(kanaSearchKey("コーヒー").includes(romajiQueryKey("koohii")!)).toBe(true);
  });

  it("niente chiave per testo non romaji", () => {
    expect(looksLikeRomaji("説明")).toBe(false);
    expect(romajiQueryKey("せつめい")).toBeNull();
    expect(romajiQueryKey("")).toBeNull();
  });
});
