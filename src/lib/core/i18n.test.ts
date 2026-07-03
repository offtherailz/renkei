import { describe, expect, it } from "vitest";
import { pickLocalizedArray, pickLocalizedText } from "./i18n";

describe("pickLocalizedText", () => {
  it("sceglie la lingua richiesta se presente", () => {
    expect(pickLocalizedText({ it: "cane", en: "dog" }, "it")).toBe("cane");
    expect(pickLocalizedText({ it: "cane", en: "dog" }, "en")).toBe("dog");
  });

  it("ricade su en e poi su it se la lingua manca", () => {
    expect(pickLocalizedText({ it: "", en: "dog" }, "it")).toBe("dog");
    expect(pickLocalizedText({ it: "cane", en: "" }, "en")).toBe("cane");
  });
});

describe("pickLocalizedArray", () => {
  it("sceglie l'array della lingua richiesta se non vuoto", () => {
    expect(pickLocalizedArray({ it: ["cane"], en: ["dog"] }, "it")).toEqual(["cane"]);
  });

  it("ricade su en se la lingua richiesta è vuota", () => {
    expect(pickLocalizedArray({ it: [], en: ["dog"] }, "it")).toEqual(["dog"]);
  });
});
