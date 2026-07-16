import { describe, expect, it } from "vitest";
import { applyPracticeReview, applySrsReview, createInitialSrs, normalizeMastery, normalizePracticeOnlyMastery, touchReviewDate } from "./srs";

const NOW = 1_700_000_000_000;

describe("createInitialSrs", () => {
  it("parte da stage 0 con ripasso immediato", () => {
    const srs = createInitialSrs("word:abc", NOW);
    expect(srs.srs_stage).toBe(0);
    expect(srs.next_review_date).toBe(NOW);
    expect(srs.mastery_points).toBe(0);
    expect(srs.streak).toBe(0);
  });
});

describe("applyPracticeReview", () => {
  it("muove solo il mastery, non stage né data di ripasso", () => {
    const srs = applySrsReview(createInitialSrs("counter:日", NOW), true, NOW); // stage 1
    const beforeStage = srs.srs_stage;
    const beforeDate = srs.next_review_date;
    const ok = applyPracticeReview(srs, true, NOW);
    expect(ok.srs_stage).toBe(beforeStage);
    expect(ok.next_review_date).toBe(beforeDate);
    expect(ok.mastery_points).toBe(srs.mastery_points + 4);
    const ko = applyPracticeReview(srs, false, NOW);
    expect(ko.srs_stage).toBe(beforeStage);
    expect(ko.mastery_points).toBe(srs.mastery_points - 6);
  });
});

describe("applySrsReview", () => {
  it("risposta corretta: stage +1, streak +1, ease aumenta", () => {
    const srs = createInitialSrs("word:abc", NOW);
    const next = applySrsReview(srs, true, NOW);
    expect(next.srs_stage).toBe(1);
    expect(next.streak).toBe(1);
    expect(next.ease_factor).toBeGreaterThan(srs.ease_factor);
    expect(next.next_review_date).toBeGreaterThan(NOW);
  });

  it("risposta sbagliata: stage -1, streak azzerato, ripasso tra 8 minuti", () => {
    const srs = { ...createInitialSrs("word:abc", NOW), srs_stage: 3 as const, streak: 5 };
    const next = applySrsReview(srs, false, NOW);
    expect(next.srs_stage).toBe(2);
    expect(next.streak).toBe(0);
    expect(next.next_review_date).toBe(NOW + 8 * 60_000);
  });

  it("lo stage resta nei limiti 0-7", () => {
    const atZero = applySrsReview(createInitialSrs("w", NOW), false, NOW);
    expect(atZero.srs_stage).toBe(0);

    const atSeven = { ...createInitialSrs("w", NOW), srs_stage: 7 as const };
    expect(applySrsReview(atSeven, true, NOW).srs_stage).toBe(7);
  });

  it("l'intervallo di ripasso cresce con lo stage", () => {
    let srs = createInitialSrs("w", NOW);
    let previousInterval = 0;
    for (let i = 0; i < 7; i += 1) {
      srs = applySrsReview(srs, true, NOW);
      const interval = srs.next_review_date - NOW;
      expect(interval).toBeGreaterThan(previousInterval);
      previousInterval = interval;
    }
  });

  it("i mastery points restano nei limiti -100/+100", () => {
    let srs = { ...createInitialSrs("w", NOW), mastery_points: 95 };
    srs = applySrsReview(srs, true, NOW);
    expect(srs.mastery_points).toBe(100);

    srs = { ...createInitialSrs("w", NOW), mastery_points: -95 };
    srs = applySrsReview(srs, false, NOW);
    expect(srs.mastery_points).toBe(-100);
  });
});

describe("normalizeMastery", () => {
  it("restituisce 0-100", () => {
    expect(normalizeMastery(0, -100)).toBe(0);
    expect(normalizeMastery(7, 100)).toBe(100);
  });

  it("pesa lo stage al 70% e i punti al 30%", () => {
    // stage 7, punti neutri (0) → 70 + 15 = 85
    expect(normalizeMastery(7, 0)).toBe(85);
    // stage 0, punti massimi → 0 + 30 = 30
    expect(normalizeMastery(0, 100)).toBe(30);
  });
});

describe("touchReviewDate", () => {
  it("sposta avanti next_review_date senza toccare stage/mastery/ease/streak", () => {
    const srs = { ...createInitialSrs("word:abc", NOW), srs_stage: 3 as const, mastery_points: 42, ease_factor: 2.1, streak: 5 };
    const touched = touchReviewDate(srs, NOW);
    expect(touched.srs_stage).toBe(3);
    expect(touched.mastery_points).toBe(42);
    expect(touched.ease_factor).toBe(2.1);
    expect(touched.streak).toBe(5);
    expect(touched.next_review_date).toBeGreaterThan(NOW);
  });

  it("usa l'intervallo dello stage attuale, non lo fa avanzare", () => {
    const stage0 = touchReviewDate(createInitialSrs("word:abc", NOW), NOW);
    const stage5 = touchReviewDate({ ...createInitialSrs("word:abc", NOW), srs_stage: 5 as const }, NOW);
    expect(stage5.next_review_date - NOW).toBeGreaterThan(stage0.next_review_date - NOW);
  });
});

describe("normalizePracticeOnlyMastery", () => {
  it("scala 0-100 senza il tetto del 30% (per 'phrase:...', che non ha mai stage)", () => {
    expect(normalizePracticeOnlyMastery(-100)).toBe(0);
    expect(normalizePracticeOnlyMastery(0)).toBe(50);
    expect(normalizePracticeOnlyMastery(100)).toBe(100);
    // a differenza di normalizeMastery(0, 100) === 30, qui può superare il 60%
    // che definisce "punto debole" — senza dover mai passare dal quiz.
    expect(normalizePracticeOnlyMastery(20)).toBe(60);
  });
});

describe("lapses (conteggio errori per i punti deboli)", () => {
	it("applySrsReview: incrementa solo sull'errore, parte da undefined", () => {
		const initial = createInitialSrs("word:test");
		expect(initial.lapses).toBeUndefined();
		const ok = applySrsReview(initial, true);
		expect(ok.lapses).toBe(0);
		const ko = applySrsReview(ok, false);
		expect(ko.lapses).toBe(1);
		expect(applySrsReview(ko, false).lapses).toBe(2);
	});

	it("applyPracticeReview: stesso conteggio anche in pratica", () => {
		const initial = createInitialSrs("particella:に");
		const ko = applyPracticeReview(initial, false);
		expect(ko.lapses).toBe(1);
		expect(applyPracticeReview(ko, true).lapses).toBe(1);
	});
});
