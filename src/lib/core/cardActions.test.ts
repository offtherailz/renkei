import { describe, expect, it, vi } from "vitest";

vi.mock("$lib/db/schema", () => ({ db: {} }));

import { computeCardAction } from "./cardActions";
import { applySrsReview, createInitialSrs } from "./srs";

const NOW = 1_700_000_000_000;

describe("computeCardAction", () => {
  it("forgot riparte dallo snapshot di prima della risposta, come un errore", () => {
    const before = { ...createInitialSrs("word:a", NOW), srs_stage: 4 as const };
    const after = applySrsReview(before, true, NOW);
    const res = computeCardAction("forgot", "word:a", after, before, NOW)!;
    expect(res.srs_stage).toBe(3);
    expect(res.next_review_date).toBe(NOW + 8 * 60_000);
  });

  it("forgot conserva le sfaccettature attuali", () => {
    const before = createInitialSrs("word:a", NOW);
    const current = { ...before, facet_meaning_r: 3 };
    const res = computeCardAction("forgot", "word:a", current, before, NOW)!;
    expect(res.facet_meaning_r).toBe(3);
  });

  it("forgot su parola mai studiata la mette nei ripassi", () => {
    const res = computeCardAction("forgot", "word:nuova", undefined, null, NOW)!;
    expect(res.id_item).toBe("word:nuova");
    expect(res.next_review_date).toBeLessThanOrEqual(NOW + 8 * 60_000);
  });

  it("forgot riesuma una carta sepolta", () => {
    const current = { ...createInitialSrs("word:a", NOW), buried: true };
    expect(computeCardAction("forgot", "word:a", current, null, NOW)!.buried).toBe(false);
  });

  it("snooze e bury richiedono una carta in SRS", () => {
    expect(computeCardAction("snooze", "word:a", undefined, null, NOW)).toBeNull();
    expect(computeCardAction("bury", "word:a", undefined, null, NOW)).toBeNull();
    const current = createInitialSrs("word:a", NOW);
    expect(computeCardAction("snooze", "word:a", current, null, NOW)!.next_review_date).toBe(NOW + 3 * 24 * 60 * 60_000);
    expect(computeCardAction("bury", "word:a", current, null, NOW)!.buried).toBe(true);
  });
});
