const FURIGANA_REGEX = /([^\[\]\s]+)\[([^\[\]]+)\]/g;

function escapeHtml(raw: string): string {
  return raw
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const FIRST_KANJI_REGEX = /[一-龯々〆]/;

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
