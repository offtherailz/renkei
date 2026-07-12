import { describe, expect, it } from "vitest";
import { blankParticleAt, findParticles } from "./particles";

describe("findParticles", () => {
  it("trova le particelle in coda ai segmenti", () => {
    // segmentazione stile BudouX di 犬が水を飲む。
    const segments = ["犬が", "水を", "飲む。"];
    const hits = findParticles(segments);
    expect(hits.map((h) => h.particle)).toEqual(["が", "を"]);
    expect(hits[0]).toEqual({ particle: "が", index: 1 });
    expect(hits[1]).toEqual({ particle: "を", index: 3 });
  });

  it("non segnala segmenti che sono solo la particella o falsi positivi", () => {
    expect(findParticles(["は"])).toEqual([]); // niente testo prima
    expect(findParticles(["こんにち", "は!"])).toEqual([]); // は non chiude un segmento con base
  });

  it("preferisce le particelle lunghe (から prima di か)", () => {
    const hits = findParticles(["学校から", "帰る。"]);
    expect(hits[0]?.particle).toBe("から");
  });

  it("non tratta il の di この/その/あの/どの come particella", () => {
    expect(findParticles(["この", "映画"])).toEqual([]);
    expect(findParticles(["その", "コンサート"])).toEqual([]);
    expect(findParticles(["私の"]).map((h) => h.particle)).toEqual(["の"]);
  });

  it("con la frase originale si riallinea quando BudouX scarta uno spazio tra i segmenti (bug reale: 語 oscurato invece di を)", () => {
    const sentence = "毎晩 二時間 日本語を 勉強します。";
    // segmentazione reale di BudouX per questa frase: il primo spazio (dopo
    // 毎晩) viene scartato, quindi i segmenti non sommano più alla lunghezza
    // della frase originale.
    const segments = ["毎晩", "二時間 日本語を", "勉強します。"];
    const hits = findParticles(segments, sentence);
    const hit = hits.find((h) => h.particle === "を")!;
    expect(hit).toBeDefined();
    expect(blankParticleAt(sentence, hit)).toBe("毎晩 二時間 日本語＿＿ 勉強します。");
  });
});

describe("blankParticleAt", () => {
  it("oscura la particella alla posizione giusta", () => {
    const sentence = "犬が水を飲む。";
    const hits = findParticles(["犬が", "水を", "飲む。"]);
    expect(blankParticleAt(sentence, hits[0]!)).toBe("犬＿＿水を飲む。");
    expect(blankParticleAt(sentence, hits[1]!)).toBe("犬が水＿＿飲む。");
  });
});
