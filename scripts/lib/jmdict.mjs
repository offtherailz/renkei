// Modulo JMdict (via scriptin/jmdict-simplified, variante "examples" che
// include le frasi Tatoeba). Fornisce download con cache, indice di lookup
// scrittura+lettura e derivazione dei metadati grammaticali dai tag POS.
//
// Licenze: JMdict © EDRDG (CC BY-SA 4.0), esempi Tatoeba (CC BY 2.0 FR).

import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { spawnSync } from "node:child_process";

const RELEASE_API = "https://api.github.com/repos/scriptin/jmdict-simplified/releases/latest";
const ASSET_PREFIX = "jmdict-examples-eng-";

export async function ensureJmdictData(cacheDir) {
  await fs.mkdir(cacheDir, { recursive: true });

  const cached = (await fs.readdir(cacheDir)).find(
    (name) => name.startsWith(ASSET_PREFIX) && name.endsWith(".json")
  );
  if (cached) {
    return JSON.parse(await fs.readFile(path.join(cacheDir, cached), "utf8"));
  }

  const release = await (await fetch(RELEASE_API)).json();
  const asset = (release.assets ?? []).find(
    (a) => a.name.startsWith(ASSET_PREFIX) && a.name.endsWith(".json.tgz")
  );
  if (!asset) {
    throw new Error("Asset jmdict-examples-eng non trovato nella release JMdict.");
  }

  const tgzPath = path.join(cacheDir, asset.name);
  console.log(`Scarico ${asset.name} (${Math.round(asset.size / 1e6)} MB)...`);
  const response = await fetch(asset.browser_download_url);
  if (!response.ok) {
    throw new Error(`Download JMdict fallito: ${response.status}`);
  }
  await pipeline(Readable.fromWeb(response.body), createWriteStream(tgzPath));

  const untar = spawnSync("tar", ["-xzf", tgzPath, "-C", cacheDir]);
  if (untar.status !== 0) {
    throw new Error(`Estrazione JMdict fallita: ${untar.stderr}`);
  }
  await fs.unlink(tgzPath);

  const extracted = (await fs.readdir(cacheDir)).find(
    (name) => name.startsWith(ASSET_PREFIX) && name.endsWith(".json")
  );
  if (!extracted) {
    throw new Error("File JSON JMdict non trovato dopo l'estrazione.");
  }
  return JSON.parse(await fs.readFile(path.join(cacheDir, extracted), "utf8"));
}

// Indice: "scrittura|lettura" → entry. Chiavi aggiuntive "|lettura" per parole
// scritte in kana e "scrittura|" come fallback. Le forme comuni vincono sulle rare.
export function buildJmdictIndex(jmdict) {
  const index = new Map();

  const put = (key, entry, isCommon) => {
    const current = index.get(key);
    if (!current || (isCommon && !current.isCommon)) {
      index.set(key, { entry, isCommon });
    }
  };

  for (const entry of jmdict.words) {
    const kanjiForms = entry.kanji ?? [];
    const kanaForms = entry.kana ?? [];
    for (const kana of kanaForms) {
      put(`|${kana.text}`, entry, Boolean(kana.common));
      for (const kanji of kanjiForms) {
        put(`${kanji.text}|${kana.text}`, entry, Boolean(kanji.common && kana.common));
        put(`${kanji.text}|`, entry, Boolean(kanji.common));
      }
    }
  }

  return index;
}

export function lookupJmdict(index, scrittura, lettura) {
  return (
    index.get(`${scrittura}|${lettura}`)?.entry ??
    (scrittura === lettura ? index.get(`|${lettura}`)?.entry : undefined) ??
    index.get(`${scrittura}|`)?.entry
  );
}

function collectPos(entry) {
  return new Set((entry.sense ?? []).flatMap((s) => s.partOfSpeech ?? []));
}

// Deriva i campi del seed dai tag POS di JMdict. Un tag "vs" da solo
// (nome che accetta する) resta sostantivo: il verbo è la forma in -する.
export function deriveJmdictMetadata(entry) {
  const pos = collectPos(entry);
  const result = {};

  const isGodan = [...pos].some((p) => p.startsWith("v5"));
  const isIchidan = pos.has("v1") || pos.has("v1-s");
  const isIrregular = pos.has("vk") || pos.has("vs-i") || pos.has("vs-s");
  const isVerb = isGodan || isIchidan || isIrregular;

  if (isVerb) {
    result.tipo_jp = "動詞[どうし]";
    result.classe_verbo_jp = isIrregular
      ? "不規則動詞[ふきそくどうし]"
      : isIchidan
        ? "一段動詞[いちだんどうし]"
        : "五段動詞[ごだんどうし]";

    for (const sense of entry.sense ?? []) {
      const p = sense.partOfSpeech ?? [];
      if (p.includes("vt")) {
        result.transitivita_jp = "他動詞[たどうし]";
        break;
      }
      if (p.includes("vi")) {
        result.transitivita_jp = "自動詞[じどうし]";
        break;
      }
    }
  } else if (pos.has("adj-i") || pos.has("adj-ix")) {
    result.tipo_jp = "形容詞[けいようし]";
    result.tipo_aggettivo_jp = "い形容詞[いけいようし]";
  } else if (pos.has("adj-na")) {
    result.tipo_jp = "形容詞[けいようし]";
    result.tipo_aggettivo_jp = "な形容詞[なけいようし]";
  } else if (pos.has("ctr")) {
    result.tipo_jp = "助数詞[じょすうし]";
  } else if (pos.has("adv") || pos.has("adv-to")) {
    result.tipo_jp = "副詞[ふくし]";
  } else if (pos.has("prt")) {
    result.tipo_jp = "助詞[じょし]";
  } else if (pos.has("exp") && !pos.has("n")) {
    result.tipo_jp = "慣用表現[かんようひょうげん]";
  } else if (pos.has("n") || pos.has("n-adv") || pos.has("n-t") || pos.has("pn")) {
    result.tipo_jp = "名詞[めいし]";
  }

  return result;
}

// Frasi d'esempio (Tatoeba) collegate all'entry: coppie giapponese/inglese.
export function extractJmdictExamples(entry, max = 2) {
  const results = [];
  for (const sense of entry.sense ?? []) {
    for (const example of sense.examples ?? []) {
      const jp = example.sentences?.find((s) => s.lang === "jpn")?.text;
      const en = example.sentences?.find((s) => s.lang === "eng")?.text;
      if (jp && en) {
        results.push({ jp, en });
        if (results.length >= max) return results;
      }
    }
  }
  return results;
}
