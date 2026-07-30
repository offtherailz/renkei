const FURIGANA_REGEX = /([^\[\]\s]+)\[([^\[\]]+)\]/g;

function escapeHtml(raw: string): string {
  return raw
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export const FIRST_KANJI_REGEX = /[一-龯々〆]/;

export function renderFuriganaToHtml(input: string): string {
  const escaped = escapeHtml(input);
  return escaped.replace(FURIGANA_REGEX, (_m, base: string, reading: string) => {
    // Il match greedy può inglobare i kana che precedono la parola
    // (es. "と猫[ねこ]"): il ruby parte dal primo kanji, il prefisso resta fuori.
    const kanjiIndex = base.search(FIRST_KANJI_REGEX);
    if (kanjiIndex > 0) {
      return `${base.slice(0, kanjiIndex)}<ruby>${base.slice(kanjiIndex)}<rt>${reading}</rt></ruby>`;
    }
    return `<ruby>${base}<rt>${reading}</rt></ruby>`;
  });
}

export function stripFuriganaNotation(input: string): string {
  return input.replace(FURIGANA_REGEX, (_m, base) => base);
}

// Opposto di stripFuriganaNotation: tiene la LETTURA al posto del kanji
// (bug segnalato: il confronto vocale "Ho sentito" marcava 時々 tutto rosso
// quando l'utente diceva correttamente ときどき, perché diffChars confronta
// caratteri e kana/kanji della stessa parola non condividono nessun
// carattere). Usata come candidato IN PIÙ per il diff, non al posto del
// kanji: la frase può avere solo alcune parole annotate, il resto resta
// com'è (meglio un confronto parziale che nessuno).
export function readingOnlyNotation(input: string): string {
  return input.replace(FURIGANA_REGEX, (_m, base: string, reading: string) => {
    // Stesso caso di renderFuriganaToHtml: il match greedy può inglobare i
    // kana prima del kanji (es. "と猫[ねこ]") — quel prefisso non è parte
    // della lettura e va tenuto com'è, solo il kanji va sostituito.
    const kanjiIndex = base.search(FIRST_KANJI_REGEX);
    if (kanjiIndex > 0) {
      return `${base.slice(0, kanjiIndex)}${reading}`;
    }
    return reading;
  });
}
