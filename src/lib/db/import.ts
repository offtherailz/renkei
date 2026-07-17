import { db } from "./schema";
import type { DatabaseSeed, Grammar, JLPTLevel, UserProfile } from "../types/models";

const JLPT_ORDER: Record<JLPTLevel, number> = {
  N5: 1,
  N4: 2,
  EXTRA: 2, // fuori liste JLPT: ordinata col lessico N4
  N3: 3,
  N2: 4,
  N1: 5
};

function flattenGrammarLinks(items: Grammar[]): Grammar[] {
  return items.map((g) => {
    const linked = new Set<string>();
    for (const ex of g.frasi_esempio) {
      for (const w of ex.parole_linkate) {
        linked.add(w);
      }
    }

    return {
      ...g,
      frasi_esempio_parole_linkate: [...linked],
      updated_at: g.updated_at ?? Date.now()
    };
  });
}

function assertSeedLevels(seed: DatabaseSeed, allowed: JLPTLevel[]): void {
  const allowedSet = new Set<JLPTLevel>(allowed);
  const badWords = seed.words.find((w) => !allowedSet.has(w.livello_jlpt));
  if (badWords) {
    throw new Error(`Seed contains unsupported JLPT level: ${badWords.livello_jlpt}`);
  }

  const badGrammar = seed.grammar.find((g) => !allowedSet.has(g.livello_jlpt));
  if (badGrammar) {
    throw new Error(`Grammar seed contains unsupported JLPT level: ${badGrammar.livello_jlpt}`);
  }

  const badCounters = seed.counters.find((c) => !allowedSet.has(c.livello_jlpt));
  if (badCounters) {
    throw new Error(`Counter seed contains unsupported JLPT level: ${badCounters.livello_jlpt}`);
  }
}

function assertGrammarSentenceWordLevels(seed: DatabaseSeed): void {
  const wordLevelById = new Map<string, JLPTLevel>(seed.words.map((w) => [w.id, w.livello_jlpt]));

  for (const grammar of seed.grammar) {
    const grammarOrder = JLPT_ORDER[grammar.livello_jlpt];
    for (const example of grammar.frasi_esempio) {
      for (const wordId of example.parole_linkate) {
        const wordLevel = wordLevelById.get(wordId);
        if (!wordLevel) {
          continue;
        }

        if (JLPT_ORDER[wordLevel] > grammarOrder) {
          throw new Error(
            `Grammar ${grammar.id} (${grammar.livello_jlpt}) references harder word ${wordId} (${wordLevel})`
          );
        }
      }
    }
  }
}

export async function importDatabaseFromJson(jsonData: string): Promise<void> {
  const parsed = JSON.parse(jsonData) as DatabaseSeed;

  // EXTRA = lessico utile fuori dalle liste JLPT (v64): livello legittimo.
  // Senza, l'import del seed fresco lanciava e i dispositivi NUOVI restavano
  // senza init (niente onboarding) — bug trovato dall'utente 18/07.
  assertSeedLevels(parsed, ["N5", "N4", "EXTRA"]);
  assertGrammarSentenceWordLevels(parsed);

  const now = Date.now();
  const grammar = flattenGrammarLinks(parsed.grammar);
  const userProfile: UserProfile[] =
    parsed.user_profile && parsed.user_profile.length > 0
      ? parsed.user_profile
      : [
          {
            id: "default",
            xp_totali: 0,
            livello: 1,
            streak_giorni: 0,
            badge_sbloccati: [],
            updated_at: now
          }
        ];

  await db.transaction(
    "rw",
    [db.words, db.kanji, db.grammar, db.counters, db.dialogues, db.srs_progress, db.user_personalization, db.user_profile],
    async () => {
      await db.words.bulkPut(parsed.words.map((w) => ({ ...w, updated_at: w.updated_at ?? now })));
      await db.kanji.bulkPut(parsed.kanji.map((k) => ({ ...k, updated_at: k.updated_at ?? now })));
      await db.grammar.bulkPut(grammar);
      await db.counters.bulkPut(parsed.counters.map((c) => ({ ...c, updated_at: c.updated_at ?? now })));
      if (parsed.dialogues?.length) {
        await db.dialogues.bulkPut(parsed.dialogues.map((d) => ({ ...d, updated_at: d.updated_at ?? now })));
      }

      if (parsed.srs_progress?.length) {
        await db.srs_progress.bulkPut(
          parsed.srs_progress.map((s) => ({
            ...s,
            mastery_points: s.mastery_points ?? 0,
            updated_at: s.updated_at ?? now
          }))
        );
      }

      if (parsed.user_personalization?.length) {
        await db.user_personalization.bulkPut(
          parsed.user_personalization.map((u) => ({
            ...u,
            updated_at: u.updated_at ?? now
          }))
        );
      }

      await db.user_profile.bulkPut(userProfile.map((u) => ({ ...u, updated_at: u.updated_at ?? now })));
    }
  );
}

export async function seedOnFirstLaunch(jsonData: string): Promise<boolean> {
  const existingWords = await db.words.count();
  if (existingWords > 0) {
    return false;
  }

  await importDatabaseFromJson(jsonData);
  return true;
}
