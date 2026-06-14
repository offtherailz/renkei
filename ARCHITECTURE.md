# Renkei — Note tecniche e decisioni architetturali

## Stack

| Layer | Tecnologia |
|---|---|
| Linguaggio | TypeScript (strict) |
| Bundler | Vite |
| UI | Vanilla DOM (no framework) |
| Persistenza locale | Dexie/IndexedDB |
| Seed dati | Script Node ESM (`scripts/sync-open-source-seed.mjs`) → `public/seed-n5n4.json` |
| PWA | Service Worker + Web App Manifest |

Non è stata usata nessuna libreria reattiva (React, Vue, ecc.): tutta la UI è imperativa, aggiornata via `innerHTML` e listener DOM. Questa scelta è stata mantenuta deliberatamente per semplicità e per non appesantire un'app offline-first.

---

## Struttura del progetto

```
src/
  main.ts               # Orchestrazione UI, sessioni, quiz, dettagli
  app.css               # Tutti gli stili
  index.ts              # Re-export centralizzato
  components/
    InteractiveWord.ts  # Widget frase interattiva (tap su token → glossario)
  core/
    furigana.ts         # Parsing furigana[lettura] → HTML ruby
    i18n.ts             # Scelta testo localizzato it/en
    srs.ts              # Algoritmo SRS (stage 0-7, mastery points)
    tokenizer.ts        # Tokenizer giapponese (BudouX)
    tts.ts              # Text-to-speech Web API
  db/
    schema.ts           # Definizioni Dexie e migrazioni
    import.ts           # Import/merge seed → IndexedDB
  quiz/
    engine.ts           # Generatori di domande per ogni modalità
    types.ts            # Tipi TypeScript delle domande
    distractorIndex.ts  # Indice distrattori per multiple choice
  sync/
    sync.ts             # Merge locale/cloud (struttura payload)
  types/
    models.ts           # Tutti i modelli dati condivisi
scripts/
  sync-open-source-seed.mjs  # Pipeline di arricchimento seed dati
public/
  seed-n5n4.json        # Seed generato (NON modificare a mano)
  sw.js                 # Service Worker
  manifest.webmanifest  # PWA manifest
```

---

## Modello SRS

- **Stage 0–7**: 8 livelli di memorizzazione spaced-repetition.
- **Mastery points**: punti aggiuntivi accumulati al superamento corretto. Normalizzati a 0–100% con `normalizeMastery(stage, points)`.
- **Next review**: calcolato dalla funzione esponenziale in `core/srs.ts` (`applySrsReview`). Stage basso = ripasso presto. Stage 7 = ripasso mensile.
- **Wrong answer**: il stage scende di 1 e i mastery points vengono dimezzati.

---

## Modalità quiz (QuizMode)

| Modalità | Descrizione |
|---|---|
| `flashcard-production` | Vedi la scrittura giapponese → dici significato e lettura (autovalutazione) |
| `flashcard-recognition` | Vedi il significato italiano → scegli la scrittura giapponese |
| `flashcard-reading-recognition` | Vedi la lettura (hiragana) → scegli la scrittura kanji/kana corretta |
| `multiple-choice` | Vedi la scrittura → scegli il significato tra 4 opzioni |
| `sentence-ordering` | Riordina i token di una frase d'esempio grammaticale |
| `cloze` | Completa la frase grammaticale con il termine mancante |
| `reading-choice` | Scegli la lettura corretta di un kanji evidenziato in frase |

### Selezione modalità per le parole (`pickWordMode`)

La modalità viene scelta in base allo **SRS stage** e alla presenza di **kanji** nella parola:

- Stage 0–1: prevalentemente `flashcard-reading-recognition` e `flashcard-recognition`, poche `multiple-choice`.
- Stage 2–3: più `multiple-choice`, aumenta `flashcard-reading-recognition` per parole con kanji.
- Stage 4–7: compare `flashcard-production` (autovalutazione avanzata), continuano le altre.

> **Rationale**: le prime sessioni privilegiano il riconoscimento prima della produzione. La lettura→scrittura è sempre presente per parole con kanji perché è la skill più difficile e spesso trascurata.

---

## Generazione domande grammaticali

### Cloze (fill-in-the-blank)

**Problema risolto**: il generatore originale sceglieva un token casuale da oscurare e poteva produrre frasi completamente vuote (es. `よ` nella frase `おいしいよ！` diventava la frase intera, lasciando `___`).

**Soluzione** (`engine.ts` › `pickGrammarStructureTarget`):
1. Si cerca prima nella struttura grammaticale stessa (`grammar.struttura`, es. `〜よ` → `よ`) un token presente nella frase.
2. Solo se non si trova nulla, si ricade sul token casuale.
3. Guardia finale: se il risultato dopo l'oscuramento è solo `___`, la frase viene mostrata integra senza blank (fallback sicuro).

### Sentence ordering

**Problema risolto**: alcune strutture grammaticali sono etichette di forme verbali (`ます形`, `て形`, ecc.) e non frasi ordinabili. Generavano domande prive di senso.

**Soluzione** (`canCreateSentenceOrderingQuestion`): regex su struttura e frase; se match → skip, si usa cloze o reading-choice.

---

## Linking esempi grammaticali

### Problema

La funzione `buildGrammarLinkedWords` cercava token delle frasi d'esempio nelle parole del vocabolario per creare link contestuali (es. `犬と猫がいます。` → link a 犬, 猫, 居る). Il matching per sottostringa generava molti falsi positivi:

- `います` agganciava sia `居る` (corretto: ichidan, forma ます → `い+ます`) sia `要る` (sbagliato: godan, forma ます → `要り+ます`).
- Particelle singole come `と` agganciavano parole random che contenevano quel carattere.

### Soluzione

- **Verifica classe verbale** (`inferVerbClassJP`): prima di costruire le forme coniugate, si determina se il verbo è ichidan o godan.
  - Ichidan: stem = lettura senza `-る` → stem + `ます`.
  - Godan: mappatura suffisso finale (`う→い`, `く→き`, ecc.) → stem + `ます`.
- **Lista eccezioni godan-ru** (`GODAN_RU_EXCEPTIONS`): verbi che terminano in `-る` ma sono godan (es. `入る`, `走る`, `要る`). `居る` è deliberatamente escluso dalla lista (è ichidan, forma `います` corretta).
- **Risultato verificato**: `犬と猫がいます。` → link a `居る`, `犬`, `猫`. Niente `要る`.

---

## Seed pipeline (`scripts/sync-open-source-seed.mjs`)

Il seed viene rigenerato con `npm run sync:open-seed`. Le fasi principali:

1. **Download dati open source** (JMdict, kanjidic2, Tatoeba, ecc.)
2. **Filtro JLPT N5/N4**
3. **Inferenza tipo parola** (`inferWordType`): riduzione dell'uso di `その他` (altro). Le espressioni idiomatiche vengono identificate e assegnate al tipo `慣用表現[かんようひょうげん]`.
4. **Arricchimento verbi** (`enrichVerbMetadata`): classe (五段/一段/不規則) e transitività (自動詞/他動詞).
5. **Arricchimento aggettivi** (`enrichAdjectiveMetadata`): tipo い/な.
6. **Costruzione link grammaticali** (`buildGrammarLinkedWords`): matching frase→parole con verifica coniugazione.
7. **Scrittura `seed-n5n4.json`**.

> **Non modificare `seed-n5n4.json` a mano**: viene sovrascritto ad ogni sync.

---

## UI: sezione dettaglio parola

### Badge grammaticali

Nel pannello dettaglio di ogni parola appaiono badge colorati in alto a destra:

| Badge | Colore | Quando compare |
|---|---|---|
| Livello JLPT | vari | sempre |
| Tipo (名詞, 動詞, …) | blu scuro | sempre |
| Classe verbo (五段/一段/不規則) | viola | solo per verbi |
| Transitività (自動詞/他動詞) | verde-acqua | solo per verbi |
| Tipo aggettivo (い/な) | rosso-rosa | solo per aggettivi |

Hovering/tap su ogni badge mostra un tooltip con spiegazione in italiano.

### Sezione Memoria

Sostituisce la stringa piatta `Consolidamento X% • SRS Y/7 • Prossimo ripasso Z`.
Due progress bar colorate:
- **Consolidamento** (0–100%): colore variabile per soglia (rosso/giallo/verde).
- **SRS stage** (0–7, normalizzato a 0–100%).

### Sezioni condizionali

- **Letture alternative**: non mostrata se vuota.
- **Pitch accent**: non mostrato se il campo è vuoto o assente (dato raro nel seed N5/N4).

---

## Sessioni di studio

- Durata configurabile (default 5 min).
- Countdown in sovrimpressione nella barra quiz.
- Alla fine della sessione: schermata riepilogo con statistiche e lista errori.
- Gli errori sono cliccabili → pannello dettaglio con pulsante "Torna al riepilogo".
- Il timer può essere configurato per non fermarsi nella vista dettaglio.

---

## Comandi di sviluppo

```bash
npm run dev          # Avvia dev server Vite
npm run check        # Type-check TypeScript (senza build)
npm run build        # Build produzione
npm run sync:open-seed  # Rigenera public/seed-n5n4.json
npm run release      # Build + deploy (se configurato)
```

---

## Problemi noti / TODO tecnici

- Il matching nelle espressioni idiomatiche (`buildExpressionLinkedWords`) usa sottostringa semplice e può generare falsi positivi per espressioni molto corte.
- La funzione `alternativeReadings` include letture dai suffissi degli ID compositi (`word-id-lettura`) che potrebbero non essere sempre significativi.
- Il seed non include i dati pitch accent per la maggior parte delle voci N5/N4: la sezione viene nascosta correttamente ma non sarà mai mostrata finché il campo non viene arricchito.
- `renderCurrentQuiz` e `renderDetailPanel` sono funzioni molto lunghe: candidati naturali a una futura scomposizione in componenti più piccoli (se si decidesse di adottare un framework).
