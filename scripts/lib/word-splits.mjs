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
