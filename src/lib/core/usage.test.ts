import { describe, expect, it } from "vitest";
import { blankSentence, findConjugatedForm, USAGE_BLANK } from "./usage";
import { buildVerbTable } from "./conjugation";

describe("blankSentence", () => {
  it("oscura la prima occorrenza della parola", () => {
    expect(blankSentence("試験の準備をします。", "準備")).toBe(`試験の${USAGE_BLANK}をします。`);
  });

  it("restituisce null se la parola non è nella frase", () => {
    expect(blankSentence("犬がいます。", "猫")).toBeNull();
  });
});

describe("findConjugatedForm", () => {
  it("trova la forma coniugata nella frase, preferendo il match più lungo", () => {
    const forms = buildVerbTable("食べる", "ichidan")!;
    const hit = findConjugatedForm("毎日ケーキを食べている。", forms);
    expect(hit?.key).toBe("teiru");
    expect(hit?.value).toBe("食べている");
  });

  it("trova il passato", () => {
    const forms = buildVerbTable("飲む", "godan")!;
    expect(findConjugatedForm("ジュースを飲んだ。", forms)?.value).toBe("飲んだ");
  });

  it("null se nessuna forma compare", () => {
    const forms = buildVerbTable("走る", "godan")!;
    expect(findConjugatedForm("犬がいます。", forms)).toBeNull();
  });
});
