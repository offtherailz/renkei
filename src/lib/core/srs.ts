import type { SrsProgress } from "../types/models";

const REVIEW_INTERVAL_MINUTES = [10, 60, 8 * 60, 24 * 60, 3 * 24 * 60, 7 * 24 * 60, 14 * 24 * 60, 30 * 24 * 60];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function createInitialSrs(itemId: string, nowTs = Date.now()): SrsProgress {
  return {
    id_item: itemId,
    srs_stage: 0,
    next_review_date: nowTs,
    ease_factor: 2.3,
    streak: 0,
    mastery_points: 0,
    updated_at: nowTs
  };
}

export function applySrsReview(progress: SrsProgress, isCorrect: boolean, nowTs = Date.now()): SrsProgress {
  const nextStage = isCorrect ? clamp(progress.srs_stage + 1, 0, 7) : clamp(progress.srs_stage - 1, 0, 7);
  const nextEase = isCorrect ? clamp(progress.ease_factor + 0.05, 1.3, 2.8) : clamp(progress.ease_factor - 0.2, 1.3, 2.8);
  const nextStreak = isCorrect ? progress.streak + 1 : 0;

  let nextReviewDate = nowTs;
  if (isCorrect) {
    const mins = REVIEW_INTERVAL_MINUTES[nextStage] ?? REVIEW_INTERVAL_MINUTES[REVIEW_INTERVAL_MINUTES.length - 1];
    const scaled = Math.round(mins * Math.max(1, nextEase * 0.9));
    nextReviewDate = nowTs + scaled * 60_000;
  } else {
    nextReviewDate = nowTs + 8 * 60_000;
  }

  const masteryDelta = isCorrect ? 12 + nextStage : -14;

  return {
    ...progress,
    srs_stage: nextStage as SrsProgress["srs_stage"],
    ease_factor: nextEase,
    streak: nextStreak,
    next_review_date: nextReviewDate,
    mastery_points: clamp(progress.mastery_points + masteryDelta, -100, 100),
    updated_at: nowTs
  };
}

export function normalizeMastery(stage: number, masteryPoints: number): number {
  const stageWeight = (stage / 7) * 70;
  const masteryWeight = ((masteryPoints + 100) / 200) * 30;
  return clamp(Math.round(stageWeight + masteryWeight), 0, 100);
}
