import { db } from "../db/schema";
import type { JLPTLevel } from "../types/models";
import { detectUserLocale, pickLocalizedArray } from "../core/i18n";
import type { DistractorEntry, DistractorIndex } from "./types";

const levels: JLPTLevel[] = ["N5", "N4", "N3", "N2", "N1"];

function randomPick<T>(list: T[], amount: number): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(amount, copy.length));
}

export async function preloadDistractorIndex(): Promise<DistractorIndex> {
  const locale = detectUserLocale();
  const rows = await db.words.toArray();

  const index: DistractorIndex = {
    N5: [],
    N4: [],
    N3: [],
    N2: [],
    N1: []
  };

  for (const row of rows) {
    const firstMeaning = pickLocalizedArray(row.significato, locale)[0] ?? "";
    index[row.livello_jlpt].push({ id: row.id, meaning: firstMeaning });
  }

  return index;
}

export function buildDistractors(
  level: JLPTLevel,
  index: DistractorIndex,
  avoidWordId: string,
  count = 3
): DistractorEntry[] {
  const sameLevel = index[level].filter((d) => d.id !== avoidWordId);
  if (sameLevel.length >= count) {
    return randomPick(sameLevel, count);
  }

  const fallback = levels
    .filter((l) => l !== level)
    .flatMap((l) => index[l])
    .filter((d) => d.id !== avoidWordId);

  return [...sameLevel, ...randomPick(fallback, count - sameLevel.length)].slice(0, count);
}
