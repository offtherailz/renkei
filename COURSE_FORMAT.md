# Formato Dataset Corso — Specifiche per la generazione automatica

Questo documento descrive il formato JSON per importare materiale didattico strutturato (corsi, lezioni, vocabolario) nell'app Renkei. Il formato è progettato per essere generato da un'IA a partire da materiale sorgente (libri di testo, dispense, ecc.).

---

## Struttura del file

Un dataset corso è un **singolo file JSON** con estensione `.renkei-course.json`.

```json
{
  "versione": "1.0",
  "corso": { ... },
  "lezioni": [ ... ],
  "parole_nuove": [ ... ],
  "parole_patch": [ ... ],
  "kanji_nuovi": [ ... ],
  "grammatica_nuova": [ ... ],
  "dialoghi_nuovi": [ ... ]
}
```

Tutte le sezioni tranne `versione`, `corso` e `lezioni` sono **opzionali**.

---

## Sezione `corso`

Metadati del corso. Obbligatorio.

```json
{
  "corso": {
    "id": "minna-no-nihongo-1",
    "nome": "Minna no Nihongo — Volume 1",
    "descrizione": "Corso base di giapponese per principianti. Lezioni 1-25.",
    "autore": "3A Corporation",
    "livello_jlpt": "N5",
    "lingua_origine": "it"
  }
}
```

| Campo | Tipo | Obbligatorio | Note |
|---|---|---|---|
| `id` | string | ✅ | Slug unico, minuscolo, trattini. Usato come prefisso per tutti gli ID generati. Esempio: `"minna-1"` |
| `nome` | string | ✅ | Nome visualizzato nell'app |
| `descrizione` | string | ❌ | Breve descrizione del corso |
| `autore` | string | ❌ | Autore/editore del materiale originale |
| `livello_jlpt` | `"N5"` \| `"N4"` \| `"N3"` \| `"N2"` \| `"N1"` | ❌ | Livello prevalente del corso |
| `lingua_origine` | `"it"` \| `"en"` | ❌ | Lingua delle spiegazioni nel sorgente |

---

## Sezione `lezioni`

Array ordinato delle lezioni del corso. Obbligatorio (almeno 1 elemento).

```json
{
  "lezioni": [
    {
      "id": "L01",
      "numero": 1,
      "titolo": "Lezione 1 — わたしはマイクミラーです",
      "descrizione": "Presentazioni formali, nazionalità, professioni.",
      "note": "## Struttura\n\nLa frase base giapponese è **Nome は Predicato です**.\n\nEsempio: 私はマイクミラーです。 = Io sono Mike Miller.",
      "parole": ["watashi", "anata", "あの人", "minna-1-かいしゃいん"],
      "kanji": ["人", "日", "本"],
      "grammatica": ["は (copula)", "minna-1-gram-desu"]
    }
  ]
}
```

| Campo | Tipo | Obbligatorio | Note |
|---|---|---|---|
| `id` | string | ✅ | ID univoco dentro il corso. Consigliato: `"L01"`, `"L02"`, … |
| `numero` | number | ✅ | Numero progressivo per l'ordinamento |
| `titolo` | string | ✅ | Titolo della lezione |
| `descrizione` | string | ❌ | Breve sommario del contenuto |
| `note` | string | ❌ | Testo esteso in **Markdown**. Può contenere spiegazioni grammaticali, tabelle, esempi. Viene mostrato come materiale di lettura della lezione. |
| `parole` | `string[]` | ❌ | Lista di ID parole. Possono essere ID del seed esistente o ID di `parole_nuove` (prefissati con `corso.id`). |
| `kanji` | `string[]` | ❌ | Lista di ID kanji (il singolo carattere, es. `"人"`) |
| `grammatica` | `string[]` | ❌ | Lista di ID forme grammaticali (seed o `grammatica_nuova`) |

### Come referenziare elementi esistenti

- **Parole del seed**: usare l'ID esatto, che coincide con la scrittura giapponese (es. `"食べる"`, `"私"`, `"学校"`). Se la parola ha più letture, usare `"scrittura-lettura"` (es. `"人-ひと"`).
- **Kanji**: usare il singolo carattere kanji (es. `"人"`, `"日"`, `"本"`).
- **Grammatica del seed**: usare la struttura grammaticale come ID (es. `"は"`, `"〜ます"`, `"て形"`).

Per verificare se un ID esiste nel seed, consultare `public/seed-n5n4.json`.

---

## Sezione `parole_nuove`

Parole che **non esistono nel seed** e devono essere aggiunte al vocabolario dell'app.

```json
{
  "parole_nuove": [
    {
      "id": "minna-1-かいしゃいん",
      "scrittura": "会社員",
      "lettura": "かいしゃいん",
      "significato_it": ["impiegato", "lavoratore d'azienda"],
      "significato_en": ["company employee", "office worker"],
      "livello_jlpt": "N4",
      "tipo_jp": "名詞[めいし]",
      "kanji_usati": ["会", "社", "員"],
      "sinonimi": [],
      "contrari": [],
      "omofoni": []
    }
  ]
}
```

### Regola obbligatoria sugli ID

L'`id` di ogni nuova parola **deve** iniziare con `corso.id` seguito da trattino: `"minna-1-会社員"` oppure `"minna-1-かいしゃいん"`. Questo evita collisioni con il seed.

| Campo | Tipo | Obbligatorio | Valori ammessi |
|---|---|---|---|
| `id` | string | ✅ | Deve iniziare con `{corso.id}-` |
| `scrittura` | string | ✅ | Forma scritta giapponese (kanji + kana) |
| `lettura` | string | ✅ | Lettura in hiragana |
| `significato_it` | `string[]` | ✅ | Almeno 1 significato in italiano |
| `significato_en` | `string[]` | ❌ | Significati in inglese |
| `livello_jlpt` | `"N5"` \| `"N4"` \| `"N3"` \| `"N2"` \| `"N1"` | ✅ | |
| `tipo_jp` | string | ✅ | Vedi tabella tipi sotto |
| `kanji_usati` | `string[]` | ❌ | Kanji usati nella scrittura (caratteri singoli) |
| `classe_verbo_jp` | string | ❌ | Solo per verbi. Vedi tabella sotto. |
| `transitivita_jp` | string | ❌ | Solo per verbi. |
| `tipo_aggettivo_jp` | string | ❌ | Solo per aggettivi. |
| `sinonimi` | `string[]` | ❌ | ID di parole sinonime |
| `contrari` | `string[]` | ❌ | ID di parole contrarie |
| `omofoni` | `string[]` | ❌ | ID di parole con stessa lettura |
| `note` | string | ❌ | Nota libera sulla parola (non mostrata nel quiz) |

### Valori ammessi per `tipo_jp`

| Valore | Significato |
|---|---|
| `"名詞[めいし]"` | Nome / sostantivo |
| `"動詞[どうし]"` | Verbo |
| `"形容詞[けいようし]"` | Aggettivo |
| `"副詞[ふくし]"` | Avverbio |
| `"助数詞[じょすうし]"` | Contatore numerico |
| `"慣用表現[かんようひょうげん]"` | Espressione idiomatica |
| `"その他[そのた]"` | Altro (usare solo se nessuna categoria si adatta) |

### Valori ammessi per `classe_verbo_jp` (solo verbi)

| Valore | Significato |
|---|---|
| `"五段動詞[ごだんどうし]"` | Verbo godan (gruppo 1) |
| `"一段動詞[いちだんどうし]"` | Verbo ichidan (gruppo 2) |
| `"不規則動詞[ふきそくどうし]"` | Verbo irregolare (する, くる) |

### Valori ammessi per `transitivita_jp` (solo verbi)

| Valore | Significato |
|---|---|
| `"自動詞[じどうし]"` | Verbo intransitivo |
| `"他動詞[たどうし]"` | Verbo transitivo |

### Valori ammessi per `tipo_aggettivo_jp` (solo aggettivi)

| Valore | Significato |
|---|---|
| `"い形容詞[いけいようし]"` | Aggettivo in -い |
| `"な形容詞[なけいようし]"` | Aggettivo in -な |

---

## Sezione `parole_patch`

Correzioni o estensioni a parole **già esistenti nel seed**. Non aggiunge nuove parole, modifica quelle esistenti.

```json
{
  "parole_patch": [
    {
      "id": "食べる",
      "significato_it": ["mangiare", "consumare (un pasto)"],
      "note_aggiuntive": "Verbo ichidan. Forma base del verbo mangiare. Molto comune."
    }
  ]
}
```

| Campo | Tipo | Note |
|---|---|---|
| `id` | string | ✅ ID esatto della parola esistente nel seed |
| `significato_it` | `string[]` | ❌ Sovrascrive i significati italiani |
| `significato_en` | `string[]` | ❌ Sovrascrive i significati inglesi |
| `sinonimi` | `string[]` | ❌ Sovrascrive la lista sinonimi |
| `contrari` | `string[]` | ❌ Sovrascrive la lista contrari |
| `omofoni` | `string[]` | ❌ Sovrascrive la lista omofoni |
| `classe_verbo_jp` | string | ❌ Sovrascrive la classe verbale |
| `transitivita_jp` | string | ❌ Sovrascrive la transitività |
| `tipo_aggettivo_jp` | string | ❌ Sovrascrive il tipo di aggettivo |
| `note_aggiuntive` | string | ❌ Aggiunge una nota libera alla parola |

> **Importante**: i patch sovrascrivono solo i campi presenti. I campi non inclusi nel patch restano invariati.

---

## Sezione `kanji_nuovi`

Kanji che non esistono nel seed. Struttura analoga a `parole_nuove`.

```json
{
  "kanji_nuovi": [
    {
      "id": "会",
      "significato_it": "riunione, incontrare, compagnia",
      "significato_en": "meeting, association, company",
      "letture_on": ["カイ", "エ"],
      "letture_kun": ["あ.う", "あ.わせる"],
      "parole_correlate": ["会社", "会話", "minna-1-かいしゃいん"]
    }
  ]
}
```

| Campo | Tipo | Obbligatorio |
|---|---|---|
| `id` | string | ✅ Singolo carattere kanji |
| `significato_it` | string | ✅ Significato in italiano |
| `significato_en` | string | ❌ Significato in inglese |
| `letture_on` | `string[]` | ✅ Letture on'yomi in katakana |
| `letture_kun` | `string[]` | ✅ Letture kun'yomi in hiragana (con `.` per okurigana) |
| `parole_correlate` | `string[]` | ❌ ID parole che usano questo kanji |

---

## Sezione `grammatica_nuova`

Forme grammaticali nuove (non nel seed).

```json
{
  "grammatica_nuova": [
    {
      "id": "minna-1-gram-desu",
      "struttura": "〜です",
      "spiegazione_it": "Copula formale. Usata alla fine delle frasi dichiarative per indicare stato o identità in stile formale.",
      "spiegazione_en": "Formal copula. Used at the end of declarative sentences to indicate state or identity in polite speech.",
      "livello_jlpt": "N5",
      "categoria_jp": "文法[ぶんぽう]",
      "frasi_esempio": [
        {
          "testo": "私[わたし]はマイクです。",
          "traduzione_it": "Io sono Mike.",
          "traduzione_en": "I am Mike.",
          "parole_linkate": ["私"]
        }
      ]
    }
  ]
}
```

| Campo | Tipo | Obbligatorio |
|---|---|---|
| `id` | string | ✅ Deve iniziare con `{corso.id}-gram-` |
| `struttura` | string | ✅ Forma grammaticale es. `"〜です"`, `"〜ている"` |
| `spiegazione_it` | string | ✅ Spiegazione in italiano |
| `spiegazione_en` | string | ❌ Spiegazione in inglese |
| `livello_jlpt` | JLPTLevel | ✅ |
| `categoria_jp` | string | ❌ Categoria grammaticale con furigana, es. `"文法[ぶんぽう]"` |
| `frasi_esempio` | array | ❌ |

### Formato furigana nelle frasi esempio

Usare la notazione `Kanji[lettura]` per il testo delle frasi:

```
山田[やまだ]さんはどこですか。
```

Il campo `parole_linkate` deve contenere gli ID delle parole del vocabolario presenti nella frase (solo quelle già nel seed o in `parole_nuove`).

---

## Sezione `dialoghi_nuovi`

Dialoghi (conversazioni) che arricchiscono le lezioni con frasi d'uso reale, collegate al vocabolario e alla grammatica.

```json
{
  "dialoghi_nuovi": [
    {
      "id": "corso-esempio-dl-01",
      "titolo_it": "Al ristorante",
      "titolo_en": "At the restaurant",
      "livello_jlpt": "N4",
      "contesto_it": "Due amici decidono cosa ordinare al ristorante.",
      "contesto_en": "Two friends decide what to order at the restaurant.",
      "righe": [
        {
          "personaggio": "田中",
          "testo": "窓[まど]を開[あ]けてもいいですか。",
          "traduzione_it": "Posso aprire la finestra?",
          "traduzione_en": "May I open the window?",
          "parole_linkate": ["課題-開ける", "窓"]
        },
        {
          "personaggio": "鈴木",
          "testo": "はい、どうぞ。",
          "traduzione_it": "Sì, prego.",
          "parole_linkate": []
        }
      ],
      "grammatica_linkata": ["corso-esempio-gram-te-mo-ii"]
    }
  ]
}
```

### Campi del dialogo

| Campo | Tipo | Obbligatorio | Note |
|---|---|---|---|
| `id` | string | ✅ | Deve iniziare con `{corso.id}-`. Convenzionale: `dl-01`, `dl-02`, … |
| `titolo_it` | string | ✅ | Titolo in italiano |
| `titolo_en` | string | ❌ | Titolo in inglese |
| `livello_jlpt` | JLPTLevel | ❌ | Livello di difficoltà del dialogo |
| `contesto_it` | string | ❌ | Breve descrizione della situazione (italiano) |
| `contesto_en` | string | ❌ | Breve descrizione della situazione (inglese) |
| `righe` | array | ✅ | Almeno 2 battute |
| `grammatica_linkata` | `string[]` | ❌ | ID di forme grammaticali usate nel dialogo |

### Campi di ogni riga (`righe[]`)

| Campo | Tipo | Obbligatorio | Note |
|---|---|---|---|
| `personaggio` | string | ✅ | Nome del personaggio (es. `"田中"`, `"Cliente"`, `"A"`) |
| `testo` | string | ✅ | Testo giapponese con notazione furigana `Kanji[lettura]` |
| `traduzione_it` | string | ✅ | Traduzione in italiano |
| `traduzione_en` | string | ❌ | Traduzione in inglese |
| `parole_linkate` | `string[]` | ❌ | ID delle parole del vocabolario presenti nella riga |

### Note per la generazione

- Il campo `parole_linkate` a livello di dialogo viene calcolato automaticamente come unione di tutti i `parole_linkate` delle righe — non è necessario specificarlo.
- Usare nomi brevi per i personaggi: kanji (`田中`, `山田`), ruoli (`店員`, `客`), o lettere (`A`, `B`).
- Mantenere i dialoghi brevi (4-10 righe) e contestualmente coerenti.
- Le frasi del dialogo possono avere furigana parziale: mettere il furigana solo sui kanji meno comuni.

---

## Esempio completo minimale

```json
{
  "versione": "1.0",
  "corso": {
    "id": "corso-esempio",
    "nome": "Corso Esempio",
    "descrizione": "Dataset dimostrativo.",
    "livello_jlpt": "N5"
  },
  "lezioni": [
    {
      "id": "L01",
      "numero": 1,
      "titolo": "Presentazioni",
      "note": "## Presentarsi\n\nIn giapponese formale si usa **〜です** dopo il nome.\n\n| Italiano | Giapponese |\n|---|---|\n| Io sono... | 私は〜です |\n| Piacere | よろしくお願いします |",
      "parole": ["私", "あなた", "corso-esempio-かいしゃいん"],
      "grammatica": ["は", "corso-esempio-gram-desu"]
    }
  ],
  "parole_nuove": [
    {
      "id": "corso-esempio-かいしゃいん",
      "scrittura": "会社員",
      "lettura": "かいしゃいん",
      "significato_it": ["impiegato"],
      "livello_jlpt": "N4",
      "tipo_jp": "名詞[めいし]",
      "kanji_usati": ["会", "社", "員"]
    }
  ],
  "grammatica_nuova": [
    {
      "id": "corso-esempio-gram-desu",
      "struttura": "〜です",
      "spiegazione_it": "Copula formale. Pone fine a frasi dichiarative in stile formale.",
      "livello_jlpt": "N5",
      "frasi_esempio": [
        {
          "testo": "私[わたし]はマリアです。",
          "traduzione_it": "Io sono Maria.",
          "parole_linkate": ["私"]
        }
      ]
    }
  ]
}
```

---

## Istruzioni per la generazione automatica (IA)

Quando generi un dataset corso da materiale sorgente:

1. **Analizza il materiale** e identifica: lezioni/capitoli, vocabolario nuovo, strutture grammaticali nuove.
2. **Per ogni parola**: verifica prima se esiste già nel seed (controlla `scrittura` e `lettura`). Se esiste, mettila solo in `lezioni[].parole` come riferimento. Se non esiste, aggiungila a `parole_nuove`.
3. **Per le correzioni** al seed: usa `parole_patch`. Non duplicare parole esistenti in `parole_nuove`.
4. **Per la grammatica**: strutture come `〜です`, `〜ます`, `〜て` sono già nel seed — non ricrearle. Crea `grammatica_nuova` solo per strutture assenti.
5. **ID univoci**: prefissa sempre gli ID di nuovi elementi con `{corso.id}-`.
6. **Note lezione** (`lezioni[].note`): usa Markdown. Includi tabelle di vocabolario, spiegazioni grammaticali, esempi d'uso. Queste note vengono mostrate all'utente nella schermata della lezione.
7. **Frasi esempio**: usa la notazione `Kanji[lettura]` per il furigana. Mantieni le frasi brevi (sotto i 20 caratteri) e grammaticalmente corrette.
8. **Non inventare** campi non documentati qui sopra — verranno ignorati.

---

## Validazione

Prima di importare, il file viene validato automaticamente dall'app. Gli errori comuni sono:

- `id` di `parole_nuove` o `grammatica_nuova` che non inizia con `{corso.id}-`
- `parole` nelle lezioni che referenziano ID non esistenti né nel seed né in `parole_nuove`
- Campi obbligatori mancanti (es. `scrittura`, `lettura`, `significato_it`)
- `tipo_jp` con valore non ammesso

In caso di errore, l'import viene annullato e viene mostrato il messaggio d'errore specifico.
