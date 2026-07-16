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
    lapses: (progress.lapses ?? 0) + (isCorrect ? 0 : 1),
    updated_at: nowTs
  };
}

// Ripasso "pratica" (Consolida, allenamento libero, ripetibile all'infinito):
// muove solo i mastery_points (peso 30% nel consolidamento), NON lo stage SRS né
// la data di ripasso. Così la pratica "conta" davvero verso il consolidamento
// senza gonfiare gli intervalli SRS ufficiali (guidati solo dalle sessioni quiz)
// e senza dare XP.
export function applyPracticeReview(progress: SrsProgress, isCorrect: boolean, nowTs = Date.now()): SrsProgress {
  const delta = isCorrect ? 4 : -6;
  return {
    ...progress,
    mastery_points: clamp(progress.mastery_points + delta, -100, 100),
    lapses: (progress.lapses ?? 0) + (isCorrect ? 0 : 1),
    updated_at: nowTs
  };
}

export function normalizeMastery(stage: number, masteryPoints: number): number {
  const stageWeight = (stage / 7) * 70;
  const masteryWeight = ((masteryPoints + 100) / 200) * 30;
  return clamp(Math.round(stageWeight + masteryWeight), 0, 100);
}

// Per gli item che non entrano MAI nel quiz a tempo (oggi solo 'phrase:...',
// dalle avventure/giochi a voce: shadowing, keigo, presentati, shigoto…):
// srs_stage resta 0 per sempre, quindi normalizeMastery li tiene bloccati
// sotto il 30% a vita, permanentemente "punto debole" anche esercitandosi
// perfettamente in Consolida. Per questi, la mastery è tutta e sola nei
// mastery_points, scalata su 0-100.
export function normalizePracticeOnlyMastery(masteryPoints: number): number {
  return clamp(Math.round(((masteryPoints + 100) / 200) * 100), 0, 100);
}

// La domanda testava una skill CONDIVISA (classe di coniugazione, particella,
// contatore) e non la parola in sé: la parola non deve guadagnare/perdere
// stage o mastery_points, ma la sua next_review_date va comunque spostata
// avanti — altrimenti ricompare identica alla prossima estrazione (stesso
// stage, "dovuta" di nuovo subito). Riusa la stessa formula di scaling di
// applySrsReview, ma sullo stage ATTUALE (non lo muove).
export function touchReviewDate(progress: SrsProgress, nowTs = Date.now()): SrsProgress {
  const mins = REVIEW_INTERVAL_MINUTES[progress.srs_stage] ?? REVIEW_INTERVAL_MINUTES[REVIEW_INTERVAL_MINUTES.length - 1];
  const scaled = Math.round(mins * Math.max(1, progress.ease_factor * 0.9));
  return {
    ...progress,
    next_review_date: nowTs + scaled * 60_000,
    updated_at: nowTs
  };
}
