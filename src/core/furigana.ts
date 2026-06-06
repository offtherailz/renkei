const FURIGANA_REGEX = /([^\[\]\s]+)\[([^\[\]]+)\]/g;

function escapeHtml(raw: string): string {
  return raw
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderFuriganaToHtml(input: string): string {
  const escaped = escapeHtml(input);
  return escaped.replace(FURIGANA_REGEX, (_m, base, reading) => {
    return `<ruby>${base}<rt>${reading}</rt></ruby>`;
  });
}

export function stripFuriganaNotation(input: string): string {
  return input.replace(FURIGANA_REGEX, (_m, base) => base);
}
