import { describe, expect, it } from "vitest";
import { calculateQuizXp } from "./engine";
import type { XpInput } from "./types";

function makeInput(overrides: Partial<XpInput> = {}): XpInput {
  return {
    quizMode: "multiple-choice",
    jlptLevel: "N5",
    srsStage: 0,
    responseTimeMs: 10_000,
    isCorrect: true,
    completedCustomGroup: false,
    ...overrides
  };
}

describe("calculateQuizXp", () => {
  it("risposta sbagliata: zero XP", () => {
    const xp = calculateQuizXp(makeInput({ isCorrect: false }));
    expect(xp.total).toBe(0);
  });

  it("N5 stage 0: solo base + eventuale speed bonus", () => {
    const xp = calculateQuizXp(makeInput({ responseTimeMs: 15_000 }));
    expect(xp.base).toBe(12);
    expect(xp.difficultyBonus).toBe(0);
    expect(xp.speedBonus).toBe(0);
    expect(xp.total).toBe(12);
  });

  it("il bonus velocità scala con il tempo di risposta", () => {
    expect(calculateQuizXp(makeInput({ responseTimeMs: 5_000 })).speedBonus).toBe(3);
    expect(calculateQuizXp(makeInput({ responseTimeMs: 10_000 })).speedBonus).toBe(1);
    expect(calculateQuizXp(makeInput({ responseTimeMs: 15_000 })).speedBonus).toBe(0);
  });

  it("livelli JLPT più alti e stage SRS più alti danno più XP", () => {
    const n5 = calculateQuizXp(makeInput());
    const n1 = calculateQuizXp(makeInput({ jlptLevel: "N1" }));
    expect(n1.total).toBeGreaterThan(n5.total);

    const stage7 = calculateQuizXp(makeInput({ srsStage: 7 }));
    expect(stage7.total).toBeGreaterThan(n5.total);
  });

  it("completare un gruppo personalizzato dà +20", () => {
    const xp = calculateQuizXp(makeInput({ completedCustomGroup: true }));
    expect(xp.groupCompletionBonus).toBe(20);
  });

  it("il totale è la somma delle componenti", () => {
    const xp = calculateQuizXp(makeInput({ jlptLevel: "N3", srsStage: 4, responseTimeMs: 3_000 }));
    expect(xp.total).toBe(xp.base + xp.difficultyBonus + xp.speedBonus + xp.groupCompletionBonus);
  });
});
