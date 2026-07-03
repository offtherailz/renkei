import { describe, expect, it } from "vitest";
import { renderFuriganaToHtml, stripFuriganaNotation } from "./furigana";

describe("renderFuriganaToHtml", () => {
  it("converte la notazione base[lettura] in ruby", () => {
    expect(renderFuriganaToHtml("犬[いぬ]")).toBe("<ruby>犬<rt>いぬ</rt></ruby>");
  });

  it("gestisce più segmenti nella stessa frase", () => {
    expect(renderFuriganaToHtml("犬[いぬ]と猫[ねこ]がいます。")).toBe(
      "<ruby>犬<rt>いぬ</rt></ruby>と<ruby>猫<rt>ねこ</rt></ruby>がいます。"
    );
  });

  it("non ingloba i kana che precedono la parola (match greedy)", () => {
    // caso reale dal seed: "ドア[どあ]が開いて[あいて]いる。"
    expect(renderFuriganaToHtml("ドア[どあ]が開いて[あいて]いる。")).toBe(
      "<ruby>ドア<rt>どあ</rt></ruby>が<ruby>開いて<rt>あいて</rt></ruby>いる。"
    );
  });

  it("lascia intatto il testo senza notazione", () => {
    expect(renderFuriganaToHtml("おいしいよ！")).toBe("おいしいよ！");
  });

  it("esegue l'escape dell'HTML nell'input", () => {
    expect(renderFuriganaToHtml("<b>犬</b>")).not.toContain("<b>");
    expect(renderFuriganaToHtml("<b>犬</b>")).toContain("&lt;b&gt;");
  });
});

describe("stripFuriganaNotation", () => {
  it("rimuove le letture mantenendo la scrittura", () => {
    expect(stripFuriganaNotation("犬[いぬ]と猫[ねこ]がいます。")).toBe("犬と猫がいます。");
  });

  it("non modifica il testo senza notazione", () => {
    expect(stripFuriganaNotation("おいしいよ！")).toBe("おいしいよ！");
  });
});
