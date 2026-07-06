// Riclassificazione di numeri e contatori nel catalogo.
//
// La fonte marca 一/二/三…, 一つ/二つ…, ついたち/ふつか… come 名詞 (o a volte
// 副詞/形容詞) e, peggio, l'euristica EN li lega come "sinonimi" fra loro
// (「day of the month」 in comune) — ma 三日 non è sinonimo di 四日.
// Qui li ricategorizziamo:
//   - numerali puri (一, 二, 一つ, 百, 万, ゼロ…)        → 数詞[すうし]
//   - date/giorni del mese (ついたち, ふつか, はつか…)   → 助数詞 legato al contatore 日
//   - persone (一人, 二人)                               → 助数詞 legato al contatore 人
// e azzeriamo i sinonimi fasulli (tenendo solo ゼロ↔零).

export const NUMERO = "数詞[すうし]";
export const CONTATORE = "助数詞[じょすうし]";

// Numerali puri: sino-giapponesi + serie nativa in つ + zero.
const NUMERI = new Set([
  "一", "二", "三", "四", "五", "六", "七", "八",
  "九::きゅう", "九::く",
  "十::じゅう", "十::(〜を)",
  "百", "千", "万", "億", "ゼロ", "零",
  "一つ", "二つ", "三つ", "四つ", "五つ", "六つ", "七つ", "八つ", "九つ"
]);

// Date / giorni del mese: letture native irregolari del contatore 日.
const GIORNI = new Set([
  "一日::ついたち", "一日::いちにち", "二日", "三日", "四日", "五日",
  "六日", "七日", "八日", "九日", "十日", "二十日"
]);

// Persone: contatore 人.
const PERSONE = new Set(["一人", "二人"]);

// Eccezioni: restano 名詞, ma vanno ripuliti i sinonimi errati.
const RIPULISCI_SOLO = new Set(["一月"]);

const ZERO = new Set(["ゼロ", "零"]);

function stripInflectionFields(word) {
  delete word.tipo_aggettivo_jp;
  delete word.classe_verbo_jp;
  delete word.transitivita_jp;
}

// Muta l'array in place. Ritorna un piccolo report.
export function classifyNumbersAndCounters(words) {
  let numeri = 0;
  let contatori = 0;
  for (const w of words) {
    if (NUMERI.has(w.id)) {
      w.tipo_jp = NUMERO;
      // solo ゼロ↔零 sono davvero sinonimi; il resto era rumore euristico.
      w.sinonimi = (w.sinonimi ?? []).filter((s) => ZERO.has(w.id) && ZERO.has(s));
      stripInflectionFields(w);
      numeri += 1;
    } else if (GIORNI.has(w.id)) {
      w.tipo_jp = CONTATORE;
      w.id_contatore_suggerito = "日";
      w.sinonimi = [];
      stripInflectionFields(w);
      contatori += 1;
    } else if (PERSONE.has(w.id)) {
      w.tipo_jp = CONTATORE;
      w.id_contatore_suggerito = "人";
      w.sinonimi = [];
      stripInflectionFields(w);
      contatori += 1;
    } else if (RIPULISCI_SOLO.has(w.id)) {
      w.sinonimi = [];
    }
  }
  return { numeri, contatori };
}
