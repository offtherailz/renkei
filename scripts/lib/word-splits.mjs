// Voci del dataset sorgente che fondono DUE parole diverse in una riga sola
// (coppie 自/他 come 回る、回す — non varianti grafiche della stessa parola,
// che invece restano una carta unica, es. "川; 河"). Vanno spezzate in carte
// separate, con transitività corretta e cross-link id_verbo_corrispondente.
// Usato dal sync (subito dopo la costruzione delle parole sorgente, così
// arricchimento e overrides si applicano alle carte già separate) e da
// scripts/fix-split-words.mjs sul seed committato (senza rete).

export const WORD_SPLITS = {
  "回る、回す": [
    {
      id: "回る",
      scrittura: "回る",
      lettura: "まわる",
      significato: { it: ["girare", "ruotare", "fare il giro"], en: ["to go around", "to revolve", "to turn (intransitive)"] },
      tipo_jp: "動詞[どうし]",
      classe_verbo_jp: "五段動詞[ごだんどうし]",
      transitivita_jp: "自動詞[じどうし]",
      id_verbo_corrispondente: "回す",
      frasi_esempio: [
        {
          testo: "地球は 太陽の まわりを 回って います。",
          traduzione: { it: "La Terra gira intorno al Sole.", en: "The earth goes around the sun." }
        },
        {
          testo: "タイヤが ゆっくり 回って います。",
          traduzione: { it: "La ruota sta girando lentamente.", en: "The tire is turning slowly." }
        }
      ]
    },
    {
      id: "回す",
      scrittura: "回す",
      lettura: "まわす",
      significato: { it: ["far girare", "girare (qualcosa)"], en: ["to turn (something)", "to rotate (something)", "to pass around"] },
      tipo_jp: "動詞[どうし]",
      classe_verbo_jp: "五段動詞[ごだんどうし]",
      transitivita_jp: "他動詞[たどうし]",
      id_verbo_corrispondente: "回る",
      frasi_esempio: [
        {
          testo: "ハンドルを 右に 回して ください。",
          traduzione: { it: "Gira la manopola verso destra.", en: "Please turn the handle to the right." }
        },
        {
          testo: "かぎを 回して、ドアを 開けました。",
          traduzione: { it: "Ho girato la chiave e ho aperto la porta.", en: "I turned the key and opened the door." }
        }
      ]
    }
  ]
};

// Spezza le voci combinate: le nuove carte ereditano dal genitore i metadati
// comuni (livello, tag, fonte…) e sovrascrivono i campi propri. Relazioni
// euristiche (sinonimi/contrari/omofoni) azzerate: le ricalcola il pipeline.
export function applyWordSplits(words) {
  const out = [];
  for (const w of words) {
    const split = WORD_SPLITS[w.id];
    if (!split) {
      out.push(w);
      continue;
    }
    for (const part of split) {
      out.push({ ...w, sinonimi: [], contrari: [], omofoni: [], ...part });
    }
  }
  return out;
}

// Aggiorna i riferimenti all'id combinato nelle parole correlate dei kanji.
export function fixKanjiRelatedWords(kanjiRows) {
  const splitIds = Object.fromEntries(
    Object.entries(WORD_SPLITS).map(([id, parts]) => [id, parts.map((p) => p.id)])
  );
  for (const k of kanjiRows) {
    if (!Array.isArray(k.parole_correlate)) continue;
    k.parole_correlate = k.parole_correlate.flatMap((id) => splitIds[id] ?? [id]);
  }
  return kanjiRows;
}

// ── Rinomine (grafie sbagliate nella fonte) e fusioni di duplicati ───────────
// Rinomina: vecchio id → patch con nuovo id/scrittura (+ campi corretti).
// La curatela del 2026-07-16 ha trovato okurigana mancanti (下る=さがる→下がる,
// 落る→落ちる, 落す→落とす, 楽む→楽しむ) e il duplicato うかがう/伺う.
export const WORD_RENAMES = {
  "下る": {
    id: "下がる",
    scrittura: "下がる",
    lettura: "さがる",
    id_verbo_corrispondente: "下げる",
    sinonimi: [],
    frasi_esempio: [
      {
        testo: "熱が やっと 下がりました。",
        traduzione: { it: "La febbre è finalmente scesa.", en: "The fever finally went down." }
      },
      {
        testo: "冬に なって、気温が 下がりました。",
        traduzione: { it: "È arrivato l'inverno e la temperatura è scesa.", en: "Winter came and the temperature dropped." }
      }
    ]
  },
  "落る": { id: "落ちる", scrittura: "落ちる", lettura: "おちる", sinonimi: [] },
  "落す": { id: "落とす", scrittura: "落とす", lettura: "おとす" },
  "楽む": { id: "楽しむ", scrittura: "楽しむ", lettura: "たのしむ" }
};

// Fusione: id da eliminare → id che resta (duplicato kana/kanji della stessa parola).
export const WORD_MERGES = {
  "うかがう": "伺う"
};

function renameRef(id) {
  if (WORD_RENAMES[id]) return WORD_RENAMES[id].id;
  if (WORD_MERGES[id]) return WORD_MERGES[id];
  return id;
}

// Applica rinomine+fusioni alle parole E a tutti i riferimenti incrociati
// (sinonimi, contrari, omofoni, id_verbo_corrispondente). Da usare DOPO
// applyWordSplits, sia nel sync sia sul seed committato.
export function applyWordRenames(words) {
  const out = [];
  for (const w of words) {
    if (WORD_MERGES[w.id]) continue; // il duplicato sparisce, resta l'altro
    const patch = WORD_RENAMES[w.id];
    const next = patch ? { ...w, ...patch } : { ...w };
    for (const field of ["sinonimi", "contrari", "omofoni"]) {
      if (Array.isArray(next[field])) {
        next[field] = [...new Set(next[field].map(renameRef).filter((id) => id !== next.id))];
      }
    }
    if (next.id_verbo_corrispondente) next.id_verbo_corrispondente = renameRef(next.id_verbo_corrispondente);
    out.push(next);
  }
  // cross-link reciproco delle coppie 自/他 introdotte dalle rinomine
  const byId = new Map(out.map((w) => [w.id, w]));
  for (const w of out) {
    const pair = w.id_verbo_corrispondente ? byId.get(w.id_verbo_corrispondente) : null;
    if (pair && !pair.id_verbo_corrispondente) pair.id_verbo_corrispondente = w.id;
  }
  return out;
}

// Kanji: parole_correlate riscritte con gli id nuovi (dedup).
export function fixKanjiRenamedWords(kanjiRows) {
  for (const k of kanjiRows) {
    if (!Array.isArray(k.parole_correlate)) continue;
    k.parole_correlate = [...new Set(k.parole_correlate.map(renameRef))];
  }
  return kanjiRows;
}
