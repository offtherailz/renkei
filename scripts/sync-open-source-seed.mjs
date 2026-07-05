import fs from "node:fs/promises";
import path from "node:path";
import {
  buildJmdictIndex,
  deriveJmdictMetadata,
  ensureJmdictData,
  extractJmdictExamples,
  lookupJmdict
} from "./lib/jmdict.mjs";

const ROOT = process.cwd();
const SEED_PATH = path.join(ROOT, "static", "seed-n5n4.json");
const JMDICT_CACHE_DIR = path.join(ROOT, "scripts", ".cache");
const OVERRIDES_PATH = path.join(ROOT, "scripts", "data", "word-overrides.json");
const COUNTERS_PATH = path.join(ROOT, "scripts", "data", "counters-n5n4.json");
const CHOUKAI_PATH = path.join(ROOT, "scripts", "data", "choukai-n5n4.json");
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

function supportsLevel(level, target) {
  const rank = { N5: 1, N4: 2, N3: 3, N2: 4, N1: 5 };
  return (rank[level] ?? 99) <= (rank[target] ?? 99);
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

// Stemming naif per far combaciare "prepare"/"preparation", "arrange"/"arrangements"...
function stemToken(token) {
  const stemmed = token.replace(/(ations|ation|ments|ings|ing|ies|ied|ers|er|es|ed|s|e)$/, "");
  return stemmed.length >= 3 ? stemmed : token;
}

function tokenizeMeaning(text) {
  const stop = new Set([
    "to",
    "a",
    "an",
    "the",
    "of",
    "and",
    "or",
    "for",
    "in",
    "on",
    "at",
    "be",
    "with",
    "from",
    "by",
    "as",
    "is",
    "are",
    "was",
    "were"
  ]);

  return unique(
    splitMeanings(text)
      .flatMap((part) => String(part).toLowerCase().split(/[^a-z0-9]+/g))
      .map((token) => token.trim())
      .filter((token) => token.length >= 3)
      .filter((token) => !stop.has(token))
      .map(stemToken)
  );
}

function intersectionCount(a, b) {
  const small = a.size <= b.size ? a : b;
  const large = a.size <= b.size ? b : a;
  let score = 0;
  for (const value of small) {
    if (large.has(value)) {
      score += 1;
    }
  }
  return score;
}

function enrichWordRelations(words) {
  const byReading = new Map();
  for (const word of words) {
    const key = normalizeReading(word.lettura);
    if (!key) {
      continue;
    }
    const bucket = byReading.get(key) ?? [];
    bucket.push(word);
    byReading.set(key, bucket);
  }

  const signatures = new Map(
    words.map((word) => [
      word.id,
      new Set(word.significato.en.flatMap((text) => tokenizeMeaning(text)))
    ])
  );

  const byType = new Map();
  for (const word of words) {
    const key = word.tipo_jp;
    const bucket = byType.get(key) ?? [];
    bucket.push(word);
    byType.set(key, bucket);
  }

  const antonymPairs = [
    ["大きい", "小さい"],
    ["高い", "低い"],
    ["高い", "安い"],
    ["新しい", "古い"],
    ["多い", "少ない"],
    ["長い", "短い"],
    ["早い", "遅い"],
    ["暑い", "寒い"],
    ["熱い", "冷たい"],
    ["明るい", "暗い"],
    ["強い", "弱い"],
    ["重い", "軽い"],
    ["近い", "遠い"],
    ["好き", "嫌い"],
    ["開ける", "閉める"],
    ["始める", "終わる"],
    ["入る", "出る"],
    ["行く", "来る"],
    ["勝つ", "負ける"],
    ["上げる", "下げる"],
    ["増える", "減る"],
    ["買う", "売る"],
    ["借りる", "貸す"],
    ["覚える", "忘れる"]
  ];

  const byWriting = new Map(words.map((word) => [word.scrittura, word.id]));
  const antonymById = new Map();
  for (const [left, right] of antonymPairs) {
    const leftId = byWriting.get(left);
    const rightId = byWriting.get(right);
    if (!leftId || !rightId) {
      continue;
    }
    antonymById.set(leftId, unique([...(antonymById.get(leftId) ?? []), rightId]));
    antonymById.set(rightId, unique([...(antonymById.get(rightId) ?? []), leftId]));
  }

  return words.map((word) => {
    const readingKey = normalizeReading(word.lettura);
    const homophones = (byReading.get(readingKey) ?? [])
      .filter((candidate) => candidate.id !== word.id)
      .map((candidate) => candidate.id)
      .slice(0, 8);

    const sameBucket = byType.get(word.tipo_jp) ?? [];
    const currentSignature = signatures.get(word.id) ?? new Set();
    const synonyms = sameBucket
      .filter((candidate) => candidate.id !== word.id)
      .map((candidate) => {
        const candidateSignature = signatures.get(candidate.id) ?? new Set();
        const sameMainMeaning = (word.significato.en[0] ?? "").toLowerCase() === (candidate.significato.en[0] ?? "").toLowerCase();
        return {
          id: candidate.id,
          score: intersectionCount(currentSignature, candidateSignature) + (sameMainMeaning ? 1 : 0)
        };
      })
      .filter((entry) => entry.score >= 1)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.id)
      .slice(0, 8);

    return {
      ...word,
      sinonimi: word.sinonimi?.length ? word.sinonimi : unique(synonyms),
      contrari: word.contrari?.length ? word.contrari : unique(antonymById.get(word.id) ?? []),
      omofoni: word.omofoni?.length ? word.omofoni : unique(homophones)
    };
  });
}

const GODAN_RU_EXCEPTIONS = new Set([
  "入る",
  "はいる",
  "走る",
  "はしる",
  "要る",
  "帰る",
  "かえる",
  "切る",
  "きる",
  "知る",
  "しる",
  "滑る",
  "すべる",
  "減る",
  "へる",
  "焦る",
  "あせる",
  "喋る",
  "しゃべる",
  "交じる",
  "まじる",
  "混じる",
  "にぎる",
  "握る"
]);

const TRANSITIVE_INTRANSITIVE_PAIRS = [
  ["開ける", "開く"],
  ["あける", "あく"],
  ["閉める", "閉まる"],
  ["しめる", "しまる"],
  ["始める", "始まる"],
  ["はじめる", "はじまる"],
  ["止める", "止まる"],
  ["とめる", "とまる"],
  ["決める", "決まる"],
  ["きめる", "きまる"],
  ["見つける", "見つかる"],
  ["みつける", "みつかる"],
  ["付ける", "付く"],
  ["つける", "つく"],
  ["消す", "消える"],
  ["けす", "きえる"],
  ["落とす", "落ちる"],
  ["おとす", "おちる"],
  ["壊す", "壊れる"],
  ["こわす", "こわれる"],
  ["続ける", "続く"],
  ["つづける", "つづく"],
  ["出す", "出る"],
  ["だす", "でる"],
  ["入れる", "入る"],
  ["いれる", "はいる"],
  ["集める", "集まる"],
  ["あつめる", "あつまる"],
  ["上げる", "上がる"],
  ["あげる", "あがる"],
  ["下げる", "下がる"],
  ["さげる", "さがる"],
  ["増やす", "増える"],
  ["ふやす", "ふえる"],
  ["変える", "変わる"],
  ["かえる", "かわる"]
];

function inferVerbClassJP(kana, writing) {
  const normalizedKana = normalizeReading(kana);
  const normalizedWriting = normalizeText(writing);

  if (normalizedWriting.endsWith("する") || normalizedKana.endsWith("する") || normalizedWriting === "する") {
    return "不規則動詞[ふきそくどうし]";
  }

  if (
    normalizedWriting.endsWith("来る") ||
    normalizedWriting === "来る" ||
    normalizedKana.endsWith("くる") ||
    normalizedKana === "くる"
  ) {
    return "不規則動詞[ふきそくどうし]";
  }

  const looksIchidan = normalizedKana.endsWith("いる") || normalizedKana.endsWith("える");
  if (looksIchidan && !GODAN_RU_EXCEPTIONS.has(normalizedWriting) && !GODAN_RU_EXCEPTIONS.has(normalizedKana)) {
    return "一段動詞[いちだんどうし]";
  }

  return "五段動詞[ごだんどうし]";
}

function inferVerbTransitivityJP(word, transitiveById, intransitiveById) {
  if (transitiveById.has(word.id)) {
    return "他動詞[たどうし]";
  }
  if (intransitiveById.has(word.id)) {
    return "自動詞[じどうし]";
  }

  const meaning = word.significato.en.join(" ; ").toLowerCase();
  if (/(to become|to go|to come|to arrive|to exist|to be|to remain|to happen|to fall|to rise|to sit|to stand|to sleep|to stay|to leave|to move|to return|to wake up|to melt|to stop)/.test(meaning)) {
    return "自動詞[じどうし]";
  }
  if (/(to make|to put|to open|to close|to start|to finish|to change|to use|to show|to teach|to tell|to call|to prepare|to decide|to bring|to leave something|to raise|to lower|to increase|to reduce|to cut|to turn on|to turn off|to drop)/.test(meaning)) {
    return "他動詞[たどうし]";
  }

  const reading = normalizeReading(word.lettura);
  const writing = normalizeText(word.scrittura);

  if (/(える|ける|げる|せる|てる|める|ねる|れる)$/.test(reading)) {
    return "他動詞[たどうし]";
  }

  if (/(ある|う|く|ぐ|す|つ|ぬ|ぶ|む|る)$/.test(reading)) {
    return "自動詞[じどうし]";
  }

  if (writing.endsWith("する") || reading.endsWith("する")) {
    return "他動詞[たどうし]";
  }

  return undefined;
}

function enrichVerbMetadata(words) {
  const byWriting = new Map(words.map((word) => [word.scrittura, word.id]));
  const byReading = new Map(words.map((word) => [normalizeReading(word.lettura), word.id]));
  const transitiveById = new Set();
  const intransitiveById = new Set();

  for (const [transitiveWriting, intransitiveWriting] of TRANSITIVE_INTRANSITIVE_PAIRS) {
    const transitiveId = byWriting.get(transitiveWriting) ?? byReading.get(normalizeReading(transitiveWriting));
    const intransitiveId = byWriting.get(intransitiveWriting) ?? byReading.get(normalizeReading(intransitiveWriting));
    if (transitiveId) {
      transitiveById.add(transitiveId);
    }
    if (intransitiveId) {
      intransitiveById.add(intransitiveId);
    }
  }

  return words.map((word) => {
    if (word.tipo_jp !== "動詞[どうし]") {
      return word;
    }

    const verbClass = word.classe_verbo_jp ?? inferVerbClassJP(word.lettura, word.scrittura);
    const transitivity = word.transitivita_jp ?? inferVerbTransitivityJP(word, transitiveById, intransitiveById);

    return {
      ...word,
      classe_verbo_jp: verbClass,
      transitivita_jp: transitivity
    };
  });
}

function buildGrammarLinkedWords(sentence, level, words) {
  const cleanSentence = normalizeText(sentence);
  if (!cleanSentence) {
    return [];
  }

  const containsKanji = (value) => /[一-龯々]/u.test(value);
  const particleLike = new Set(["は", "が", "を", "に", "で", "と", "へ", "も", "の", "や", "か", "ね", "よ", "な", "ぞ", "さ"]);

  const hasDirectSurfaceMatch = (word) => {
    const writing = normalizeText(word.scrittura);
    if (!writing) {
      return false;
    }

    if (containsKanji(writing)) {
      return cleanSentence.includes(writing);
    }

    if (writing.length <= 1 || particleLike.has(writing)) {
      return false;
    }

    return cleanSentence.includes(writing);
  };

  const hasVerbConjugationMatch = (word) => {
    if (word.tipo_jp !== "動詞[どうし]") {
      return false;
    }

    const reading = normalizeReading(word.lettura);
    if (!reading || reading.length < 2) {
      return false;
    }

    const forms = new Set();
    const verbClass = inferVerbClassJP(word.lettura, word.scrittura);

    if (reading.endsWith("する")) {
      const stem = reading.slice(0, -2);
      forms.add(`${stem}します`);
      forms.add(`${stem}しません`);
      forms.add(`${stem}した`);
      forms.add(`${stem}して`);
    } else if (reading.endsWith("くる") || reading === "くる") {
      forms.add("きます");
      forms.add("きません");
      forms.add("きた");
      forms.add("きて");
    } else if (reading.endsWith("る") && verbClass === "一段動詞[いちだんどうし]") {
      const stem = reading.slice(0, -1);
      forms.add(`${stem}ます`);
      forms.add(`${stem}ません`);
      forms.add(`${stem}ました`);
      forms.add(`${stem}て`);
      forms.add(`${stem}ない`);
      forms.add(`${stem}た`);
    } else {
      const godanMasuMap = {
        "う": "い",
        "く": "き",
        "ぐ": "ぎ",
        "す": "し",
        "つ": "ち",
        "ぬ": "に",
        "ぶ": "び",
        "む": "み",
        "る": "り"
      };
      const ending = reading.slice(-1);
      const mapped = godanMasuMap[ending];
      if (mapped) {
        const stem = `${reading.slice(0, -1)}${mapped}`;
        forms.add(`${stem}ます`);
        forms.add(`${stem}ません`);
        forms.add(`${stem}ました`);
      }
    }

    for (const form of forms) {
      if (form.length > 1 && cleanSentence.includes(form)) {
        return true;
      }
    }
    return false;
  };

  const candidates = words
    .filter((word) => supportsLevel(word.livello_jlpt, level))
    .filter((word) => hasDirectSurfaceMatch(word) || hasVerbConjugationMatch(word))
    .sort((a, b) => b.scrittura.length - a.scrittura.length);

  return unique(candidates.map((word) => word.id)).slice(0, 16);
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

function isLikelyVerbMeaning(meaningText) {
  const meanings = splitMeanings(meaningText);
  return meanings.some((meaning) => /^to\b/i.test(meaning));
}

function isLikelyAdjectiveMeaning(meaningText) {
  const lower = splitMeanings(meaningText).join(" ; ").toLowerCase();
  return /(ous\b|ive\b|ful\b|less\b|able\b|al\b|ic\b|ary\b|y\b|strange|active|busy|famous|important|same|different|clean|dirty|kind|safe|dangerous|quiet|noisy|easy|hard|difficult)/.test(lower);
}

function isLikelyAdverbMeaning(meaningText) {
  const lower = splitMeanings(meaningText).join(" ; ").toLowerCase();
  return /(ly\b|soon|already|still|probably|maybe|perhaps|especially|slowly|quickly|carefully|often|sometimes|always|never)/.test(lower);
}

function isLikelyCounterMeaning(meaningText) {
  const lower = splitMeanings(meaningText).join(" ; ").toLowerCase();
  return /(counter|for counting|suffix for counting|number of)/.test(lower);
}

function isLikelyFunctionWord(meaningText) {
  const lower = splitMeanings(meaningText).join(" ; ").toLowerCase();
  return /(ah\b|oh\b|yes\b|no\b|well\b|uh\b|thanks\b|thank you\b|excuse me\b|interjection|such\b|that kind of\b)/.test(lower);
}

function isLikelyIdiomaticExpression(meaningText, writing, kana) {
  const lower = splitMeanings(meaningText).join(" ; ").toLowerCase();
  const normalizedWriting = normalizeText(writing);
  const normalizedKana = normalizeReading(kana);
  if (/(idiom|idiomatic|expression|phrase|set phrase|fixed expression)/.test(lower)) {
    return true;
  }
  if (/[～~]/u.test(normalizedWriting) || /[～~]/u.test(normalizedKana)) {
    return true;
  }
  return false;
}

function inferWordType(kana, writing, meaning) {
  const normalizedKana = normalizeReading(kana);
  const normalizedWriting = normalizeText(writing);

  if (normalizedWriting === "盛ん" || normalizedKana === "さかん") {
    return "形容詞[けいようし]";
  }

  if (isLikelyIdiomaticExpression(meaning, writing, kana)) {
    return "慣用表現[かんようひょうげん]";
  }

  if (normalizedWriting.endsWith("する") || normalizedKana.endsWith("する")) {
    return "動詞[どうし]";
  }
  if (isLikelyVerbMeaning(meaning)) {
    return "動詞[どうし]";
  }

  if (isLikelyCounterMeaning(meaning)) {
    return "助数詞[じょすうし]";
  }

  if (normalizedKana.endsWith("い") || isLikelyAdjectiveMeaning(meaning)) {
    return "形容詞[けいようし]";
  }

  if (isLikelyAdverbMeaning(meaning)) {
    return "副詞[ふくし]";
  }

  if (isLikelyFunctionWord(meaning)) {
    return "その他[そのた]";
  }

  return "名詞[めいし]";
}

function inferAdjectiveTypeJP(word) {
  if (word.tipo_jp !== "形容詞[けいようし]") {
    return undefined;
  }

  const reading = normalizeReading(word.lettura);
  const writing = normalizeText(word.scrittura);
  const naAdjectiveExceptions = new Set([
    "きれい",
    "有名",
    "便利",
    "親切",
    "静か",
    "盛ん",
    "嫌い",
    "好き"
  ]);

  if (naAdjectiveExceptions.has(reading) || naAdjectiveExceptions.has(writing)) {
    return "な形容詞[なけいようし]";
  }

  if (reading.endsWith("い")) {
    return "い形容詞[いけいようし]";
  }

  return "な形容詞[なけいようし]";
}

function enrichAdjectiveMetadata(words) {
  return words.map((word) => {
    if (word.tipo_jp !== "形容詞[けいようし]") {
      return word;
    }
    return {
      ...word,
      tipo_aggettivo_jp: word.tipo_aggettivo_jp ?? inferAdjectiveTypeJP(word)
    };
  });
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

// JMdict è la fonte autoritativa per tipo, classe verbale, transitività e
// tipo aggettivo: sovrascrive le euristiche. Aggiunge anche le frasi
// d'esempio Tatoeba. Le euristiche restano come fallback per le parole
// assenti da JMdict; gli override manuali vincono su tutto.
function applyJmdictMetadata(words, jmdictIndex, overrides) {
  let matched = 0;
  const result = words.map((word) => {
    const entry = lookupJmdict(jmdictIndex, word.scrittura, word.lettura);
    let next = word;
    if (entry) {
      matched += 1;
      const metadata = deriveJmdictMetadata(entry);
      const examples = extractJmdictExamples(entry);
      next = {
        ...word,
        ...metadata,
        frasi_esempio: examples.length
          ? examples.map((ex) => ({ testo: ex.jp, traduzione: { it: ex.en, en: ex.en } }))
          : word.frasi_esempio
      };
      if (metadata.tipo_jp && metadata.tipo_jp !== "動詞[どうし]") {
        delete next.classe_verbo_jp;
        delete next.transitivita_jp;
      }
      if (metadata.tipo_jp && metadata.tipo_jp !== "形容詞[けいようし]") {
        delete next.tipo_aggettivo_jp;
      }
    }
    const override = overrides[word.id];
    return override ? { ...next, ...override } : next;
  });
  console.log(`JMdict: ${matched}/${words.length} parole agganciate.`);
  return result;
}

// Dato sporco della fonte: alcune letture hanno する attaccato (準備 → じゅんびする).
// Se la lettura senza する combacia in JMdict, la ripuliamo.
function fixSuruReadings(words, jmdictIndex) {
  return words.map((word) => {
    if (word.lettura.endsWith("する") && !word.scrittura.endsWith("する")) {
      const stripped = word.lettura.slice(0, -2);
      if (lookupJmdict(jmdictIndex, word.scrittura, stripped)) {
        return { ...word, lettura: stripped };
      }
    }
    return word;
  });
}

// I nomi che JMdict marca "vs" generano la voce verbale in -する come entry
// separata (動詞/不規則), collegata al nome in entrambe le direzioni.
function buildSuruVerbs(words, jmdictIndex) {
  const byWriting = new Map(words.map((w) => [w.scrittura, w]));
  const generated = [];

  const updated = words.map((word) => {
    if (!word.tipo_jp.startsWith("名詞")) return word;
    const entry = lookupJmdict(jmdictIndex, word.scrittura, word.lettura);
    if (!entry) return word;
    // "vs" deve stare sul PRIMO senso (uso primario): sensi secondari rari
    // generavano verbi inesistenti (帽子する da 帽子 "cap (move)" gergale).
    const pos = new Set(entry.sense?.[0]?.partOfSpeech ?? []);
    if (!pos.has("vs")) return word;

    const verbWriting = `${word.scrittura}する`;
    const existing = byWriting.get(verbWriting);
    if (existing) {
      existing.id_nome_origine = word.id;
      return { ...word, id_verbo_suru: existing.id };
    }

    let transitivity;
    for (const sense of entry.sense ?? []) {
      const p = sense.partOfSpeech ?? [];
      if (p.includes("vt")) { transitivity = "他動詞[たどうし]"; break; }
      if (p.includes("vi")) { transitivity = "自動詞[じどうし]"; break; }
    }

    const verb = {
      id: verbWriting,
      scrittura: verbWriting,
      lettura: `${word.lettura}する`,
      significato: {
        it: word.significato.it.map((g, i) => (i === 0 ? `fare: ${g}` : g)),
        en: word.significato.en.map((g, i) => (i === 0 ? `to do: ${g}` : g))
      },
      study_tags: [...(word.study_tags ?? []), "suru-verb"],
      source_name: word.source_name,
      source_license: word.source_license,
      source_url: word.source_url,
      livello_jlpt: word.livello_jlpt,
      tipo_jp: "動詞[どうし]",
      classe_verbo_jp: "不規則動詞[ふきそくどうし]",
      ...(transitivity ? { transitivita_jp: transitivity } : {}),
      id_nome_origine: word.id,
      kanji_usati: word.kanji_usati,
      frasi_esempio: word.frasi_esempio,
      sinonimi: [],
      contrari: [],
      omofoni: [],
      updated_at: Date.now()
    };
    generated.push(verb);
    return { ...word, id_verbo_suru: verb.id };
  });

  console.log(`Verbi in -する generati: ${generated.length}`);
  return [...updated, ...generated];
}

async function loadOverrides() {
  try {
    return JSON.parse(await fs.readFile(OVERRIDES_PATH, "utf8"));
  } catch {
    return {};
  }
}

// Catalogo curato dei contatori (scripts/data/counters-n5n4.json): entità
// separate dalle parole/kanji. Collega anche le parole tipiche al loro
// contatore tramite id_contatore_suggerito.
async function buildCounters(words) {
  const curated = JSON.parse(await fs.readFile(COUNTERS_PATH, "utf8"));
  const now = Date.now();
  const wordsById = new Map(words.map((w) => [w.id, w]));

  for (const counter of curated) {
    counter.updated_at = now;
    for (const wordId of counter.parole_tipiche ?? []) {
      const word = wordsById.get(wordId);
      if (word && !word.id_contatore_suggerito) {
        word.id_contatore_suggerito = counter.id;
      }
    }
    // tieni nella lista solo le parole davvero presenti nel seed
    if (counter.parole_tipiche) {
      counter.parole_tipiche = counter.parole_tipiche.filter((id) => wordsById.has(id));
    }
  }
  return curated;
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
        tipo_jp: inferWordType(row.kana, row.word, row.meaning),
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

  const merged = [...byId.values()].sort((a, b) => a.livello_jlpt.localeCompare(b.livello_jlpt) || a.scrittura.localeCompare(b.scrittura, "ja"));
  const withVerbMetadata = enrichVerbMetadata(merged);
  return enrichAdjectiveMetadata(withVerbMetadata);
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
    link_jisho: `https://jisho.org/search/%23kanji%20${encodeURIComponent(row.character)}`,
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

function normalizeGrammar(importedGroups, existingSeedGrammar, words) {
  const imported = importedGroups.flatMap(({ level, rows }) => rows.map((row) => {
    const parsedExample = parseGrammarExample(row.example);
    const linkedWords = buildGrammarLinkedWords(parsedExample.japanese, level, words);
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
          parole_linkate: linkedWords
        }
      ],
      frasi_esempio_parole_linkate: linkedWords,
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
  const jmdictIndex = buildJmdictIndex(await ensureJmdictData(JMDICT_CACHE_DIR));
  const overrides = await loadOverrides();

  const heuristicWords = normalizeWords([...vocabN5.words, ...vocabN4.words], existingSeed.words ?? []);
  const cleanedWords = fixSuruReadings(heuristicWords, jmdictIndex);
  const enrichedWords = applyJmdictMetadata(cleanedWords, jmdictIndex, overrides);
  const withSuruVerbs = buildSuruVerbs(enrichedWords, jmdictIndex);
  // Le relazioni (sinonimi/contrari/omofoni) si calcolano alla fine,
  // su tipi corretti e catalogo completo dei verbi in -する.
  const normalizedWords = enrichWordRelations(withSuruVerbs).sort(
    (a, b) => a.livello_jlpt.localeCompare(b.livello_jlpt) || a.scrittura.localeCompare(b.scrittura, "ja")
  );
  const counters = await buildCounters(normalizedWords);
  const now = Date.now();
  const dialogues = JSON.parse(await fs.readFile(CHOUKAI_PATH, "utf8")).map((d) => ({
    ...d,
    updated_at: now
  }));
  const normalizedKanji = normalizeKanji([...kanjiN5.kanji, ...kanjiN4.kanji], normalizedWords, existingSeed.kanji ?? []);
  const normalizedGrammar = normalizeGrammar([
    { level: "N5", rows: grammarN5 },
    { level: "N4", rows: grammarN4 }
  ], existingSeed.grammar ?? [], normalizedWords);

  const nextSeed = {
    words: normalizedWords,
    kanji: normalizedKanji,
    grammar: normalizedGrammar,
    counters,
    dialogues,
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