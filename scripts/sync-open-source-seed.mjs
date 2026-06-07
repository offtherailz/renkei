import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SEED_PATH = path.join(ROOT, "public", "seed-n5n4.json");
const OPEN_SOURCE = {
  name: "allenlu2009/japanese-learning-datasets",
  license: "MIT",
  repo: "https://github.com/allenlu2009/japanese-learning-datasets",
  urls: {
    vocabN5: "https://raw.githubusercontent.com/allenlu2009/japanese-learning-datasets/master/vocabulary/n5.json",
    vocabN4: "https://raw.githubusercontent.com/allenlu2009/japanese-learning-datasets/master/vocabulary/n4.json",
    kanjiN5: "https://raw.githubusercontent.com/allenlu2009/japanese-learning-datasets/master/kanji/n5.json",
    kanjiN4: "https://raw.githubusercontent.com/allenlu2009/japanese-learning-datasets/master/kanji/n4.json"
  }
};

const GRAMMAR_SOURCE = {
  name: "Sigmabond01/jlpt-grammar-api",
  license: "MIT",
  repo: "https://github.com/Sigmabond01/jlpt-grammar-api",
  urls: {
    grammarN5: "https://jlpt-grammar-api.vercel.app/api/grammar/N5",
    grammarN4: "https://jlpt-grammar-api.vercel.app/api/grammar/N4"
  }
};

function isKanjiChar(char) {
  return /[一-龯々]/u.test(char);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function splitMeanings(text) {
  return unique(
    String(text)
      .split(/;|\//g)
      .flatMap((chunk) => chunk.split(","))
      .map((chunk) => chunk.trim())
      .filter(Boolean)
  );
}

function isNoisyExamEntry(text) {
  return /[～~()（）]/u.test(text);
}

function normalizeText(text) {
  return String(text).replace(/\s+/g, " ").trim();
}

function normalizeReading(text) {
  return normalizeText(text)
    .replace(/\((?:する|〜を|~を)\)/gu, "")
    .replace(/[()（）]/gu, "")
    .replace(/[～~]/gu, "")
    .trim();
}

function parseGrammarExample(example) {
  const raw = normalizeText(example);
  const match = raw.match(/^(.*?)\s*\((.*?)\)\s*-\s*(.*)$/u);
  if (match) {
    return {
      japanese: normalizeText(match[1]),
      english: normalizeText(match[3])
    };
  }

  return {
    japanese: raw,
    english: raw
  };
}

function inferWordType(kana, writing) {
  if (kana.endsWith("する")) {
    return "動詞[どうし]";
  }
  if (kana.endsWith("い") && writing !== kana) {
    return "形容詞[けいようし]";
  }
  return "その他[そのた]";
}

function buildExistingWordLookup(words) {
  return new Map(words.map((word) => [`${normalizeText(word.scrittura)}::${normalizeReading(word.lettura)}`, word]));
}

function buildImportedWordCounts(rows) {
  const counts = new Map();
  for (const row of rows) {
    const normalizedWord = normalizeText(row.word);
    counts.set(normalizedWord, (counts.get(normalizedWord) ?? 0) + 1);
  }
  return counts;
}

function makeImportedWordId(row, duplicateCounts, existingWords) {
  const normalizedWord = normalizeText(row.word);
  const normalizedReading = normalizeReading(row.kana);
  const existing = existingWords.get(`${normalizedWord}::${normalizedReading}`);
  if (existing) {
    return existing.id;
  }
  return (duplicateCounts.get(normalizedWord) ?? 0) > 1 ? `${normalizedWord}::${normalizedReading}` : normalizedWord;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }
  return response.json();
}

function normalizeWords(importedRows, existingSeedWords) {
  const existingLookup = buildExistingWordLookup(existingSeedWords);
  const duplicateCounts = buildImportedWordCounts(importedRows);
  const imported = importedRows
    .filter((row) => !isNoisyExamEntry(row.word))
    .map((row) => {
      const normalizedWord = normalizeText(row.word);
      const normalizedReading = normalizeReading(row.kana);
      const id = makeImportedWordId(row, duplicateCounts, existingLookup);
      const meanings = splitMeanings(row.meaning);
      const kanjiUsed = unique([...normalizedWord].filter(isKanjiChar));
      return {
        id,
        scrittura: normalizedWord,
        lettura: normalizedReading,
        significato: {
          it: meanings.length > 0 ? meanings : [String(row.meaning)],
          en: meanings.length > 0 ? meanings : [String(row.meaning)]
        },
        study_tags: [String(row.jlptLevel).toLowerCase(), kanjiUsed.length > 0 ? "contains-kanji" : "kana-only"],
        source_name: OPEN_SOURCE.name,
        source_license: OPEN_SOURCE.license,
        source_url: OPEN_SOURCE.repo,
        livello_jlpt: row.jlptLevel,
        tipo_jp: inferWordType(row.kana, row.word),
        kanji_usati: kanjiUsed,
        sinonimi: [],
        contrari: [],
        omofoni: [],
        updated_at: Date.now()
      };
    });

  const byId = new Map(imported.map((word) => [word.id, word]));
  for (const word of existingSeedWords) {
    if (word.source_name === OPEN_SOURCE.name) {
      continue;
    }
    if (isNoisyExamEntry(word.scrittura) || isNoisyExamEntry(word.lettura)) {
      continue;
    }
    byId.set(word.id, { ...byId.get(word.id), ...word });
  }

  return [...byId.values()].sort((a, b) => a.livello_jlpt.localeCompare(b.livello_jlpt) || a.scrittura.localeCompare(b.scrittura, "ja"));
}

function normalizeKanji(importedRows, words, existingSeedKanji) {
  const relatedWordsByKanji = new Map();
  for (const word of words) {
    for (const char of word.kanji_usati ?? []) {
      const current = relatedWordsByKanji.get(char) ?? [];
      current.push(word.id);
      relatedWordsByKanji.set(char, current);
    }
  }

  const imported = importedRows.map((row) => ({
    id: row.character,
    significato: {
      it: row.meanings.join(" / "),
      en: row.meanings.join(" / ")
    },
    study_tags: [String(row.jlptLevel).toLowerCase()],
    source_name: OPEN_SOURCE.name,
    source_license: OPEN_SOURCE.license,
    source_url: OPEN_SOURCE.repo,
    letture_on: row.onyomi ?? [],
    letture_kun: row.kunyomi ?? [],
    link_jisho: `https://jisho.org/search/${encodeURIComponent(row.character)}%20%23kanji`,
    link_koohii: `https://kanji.koohii.com/study/kanji/${encodeURIComponent(row.character)}`,
    parole_correlate: unique(relatedWordsByKanji.get(row.character) ?? []),
    updated_at: Date.now()
  }));

  const byId = new Map(imported.map((kanji) => [kanji.id, kanji]));
  for (const kanji of existingSeedKanji) {
    byId.set(kanji.id, { ...byId.get(kanji.id), ...kanji, parole_correlate: unique(relatedWordsByKanji.get(kanji.id) ?? kanji.parole_correlate ?? []) });
  }

  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id, "ja"));
}

function normalizeGrammar(importedGroups, existingSeedGrammar) {
  const imported = importedGroups.flatMap(({ level, rows }) => rows.map((row) => {
    const parsedExample = parseGrammarExample(row.example);
    return {
      id: `grammar-api-${level}-${row.id}`,
      struttura: normalizeText(row.grammar),
      spiegazione: {
        it: normalizeText(row.meaning),
        en: normalizeText(row.meaning)
      },
      chapter_tags: [level === "N5" ? "jlpt-n5-core" : "jlpt-n4-core"],
      study_tags: [level.toLowerCase(), "grammar", "exam-core"],
      source_name: GRAMMAR_SOURCE.name,
      source_license: GRAMMAR_SOURCE.license,
      source_url: GRAMMAR_SOURCE.repo,
      livello_jlpt: level,
      categoria_jp: "文法[ぶんぽう]",
      frasi_esempio: [
        {
          testo: parsedExample.japanese,
          traduzione: {
            it: parsedExample.english,
            en: parsedExample.english
          },
          parole_linkate: []
        }
      ],
      frasi_esempio_parole_linkate: [],
      updated_at: Date.now()
    };
  }));

  const byId = new Map(imported.map((item) => [item.id, item]));
  for (const item of existingSeedGrammar) {
    if (item.source_name === GRAMMAR_SOURCE.name) {
      continue;
    }
    byId.set(item.id, { ...byId.get(item.id), ...item });
  }

  return [...byId.values()].sort((a, b) => a.livello_jlpt.localeCompare(b.livello_jlpt) || a.struttura.localeCompare(b.struttura, "ja"));
}

async function main() {
  const existingSeed = JSON.parse(await fs.readFile(SEED_PATH, "utf8"));
  const [vocabN5, vocabN4, kanjiN5, kanjiN4, grammarN5, grammarN4] = await Promise.all([
    fetchJson(OPEN_SOURCE.urls.vocabN5),
    fetchJson(OPEN_SOURCE.urls.vocabN4),
    fetchJson(OPEN_SOURCE.urls.kanjiN5),
    fetchJson(OPEN_SOURCE.urls.kanjiN4),
    fetchJson(GRAMMAR_SOURCE.urls.grammarN5),
    fetchJson(GRAMMAR_SOURCE.urls.grammarN4)
  ]);

  const normalizedWords = normalizeWords([...vocabN5.words, ...vocabN4.words], existingSeed.words ?? []);
  const normalizedKanji = normalizeKanji([...kanjiN5.kanji, ...kanjiN4.kanji], normalizedWords, existingSeed.kanji ?? []);
  const normalizedGrammar = normalizeGrammar([
    { level: "N5", rows: grammarN5 },
    { level: "N4", rows: grammarN4 }
  ], existingSeed.grammar ?? []);

  const nextSeed = {
    words: normalizedWords,
    kanji: normalizedKanji,
    grammar: normalizedGrammar,
    counters: existingSeed.counters ?? [],
    srs_progress: existingSeed.srs_progress ?? [],
    user_personalization: existingSeed.user_personalization ?? [],
    user_profile: existingSeed.user_profile ?? []
  };

  await fs.writeFile(SEED_PATH, `${JSON.stringify(nextSeed, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ words: nextSeed.words.length, kanji: nextSeed.kanji.length, grammar: nextSeed.grammar.length, counters: nextSeed.counters.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});