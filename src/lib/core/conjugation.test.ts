import { describe, expect, it } from "vitest";
import { conjugateAdjective, conjugateVerb } from "./conjugation";

function formMap(forms: { key: string; value: string }[] | null): Record<string, string> {
  return Object.fromEntries((forms ?? []).map((f) => [f.key, f.value]));
}

describe("conjugateVerb", () => {
  it("ichidan: 食べる", () => {
    const f = formMap(conjugateVerb("食べる", "ichidan"));
    expect(f.masu).toBe("食べます");
    expect(f.nai).toBe("食べない");
    expect(f.ta).toBe("食べた");
    expect(f.te).toBe("食べて");
  });

  it("godan in -む: 飲む (euphonic んで)", () => {
    const f = formMap(conjugateVerb("飲む", "godan"));
    expect(f.masu).toBe("飲みます");
    expect(f.nai).toBe("飲まない");
    expect(f.te).toBe("飲んで");
    expect(f.ta).toBe("飲んだ");
  });

  it("godan in -う: 買う (ない → 買わない)", () => {
    const f = formMap(conjugateVerb("買う", "godan"));
    expect(f.masu).toBe("買います");
    expect(f.nai).toBe("買わない");
    expect(f.te).toBe("買って");
  });

  it("godan in -く: 書く vs eccezione 行く", () => {
    expect(formMap(conjugateVerb("書く", "godan")).te).toBe("書いて");
    expect(formMap(conjugateVerb("行く", "godan")).te).toBe("行って");
  });

  it("godan in -る: 帰る (falso ichidan)", () => {
    const f = formMap(conjugateVerb("帰る", "godan"));
    expect(f.masu).toBe("帰ります");
    expect(f.te).toBe("帰って");
  });

  it("irregolari: する e 来る", () => {
    expect(formMap(conjugateVerb("勉強する", "irregular")).masu).toBe("勉強します");
    expect(formMap(conjugateVerb("勉強する", "irregular")).te).toBe("勉強して");
    const kuru = formMap(conjugateVerb("来る", "irregular"));
    expect(kuru.masu).toBe("来ます");
    expect(kuru.nai).toBe("来ない");
  });
});

describe("conjugateAdjective", () => {
  it("aggettivo in -い: 高い", () => {
    const f = formMap(conjugateAdjective("高い", "i"));
    expect(f.neg).toBe("高くない");
    expect(f.past).toBe("高かった");
    expect(f.pastneg).toBe("高くなかった");
    expect(f.adv).toBe("高く");
  });

  it("いい è irregolare (radice よ)", () => {
    const f = formMap(conjugateAdjective("いい", "i"));
    expect(f.neg).toBe("よくない");
    expect(f.past).toBe("よかった");
  });

  it("aggettivo in -な: 静か", () => {
    const f = formMap(conjugateAdjective("静か", "na"));
    expect(f.neg).toBe("静かじゃない");
    expect(f.past).toBe("静かだった");
    expect(f.attr).toBe("静かな");
  });
});
