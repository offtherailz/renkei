# Renkei — Note tecniche e decisioni architetturali

## Stack

| Layer | Tecnologia |
|---|---|
| Linguaggio | TypeScript (strict) |
| Framework UI | SvelteKit 2 + Svelte 5 (runes) |
| Bundler | Vite |
| Deploy | `@sveltejs/adapter-static` (SPA fallback) → GitHub Pages |
| Persistenza locale | Dexie/IndexedDB |
| Seed dati | Script Node ESM (`scripts/sync-open-source-seed.mjs`) → `static/seed-n5n4.json` |
| PWA | Service Worker + Web App Manifest |
| Test | Vitest (moduli puri in `src/lib/core` e `src/lib/quiz`) |

La prima versione era vanilla DOM (UI imperativa via `innerHTML` in un unico `main.ts`). Il progetto è stato migrato a SvelteKit: la logica di dominio (SRS, quiz engine, furigana, i18n, DB) vive in moduli puri sotto `src/lib`, la UI nelle route Svelte. Lo stato globale reattivo è in `src/lib/stores.svelte.ts` (runes `$state`).

---

## Struttura del progetto

```
src/
  app.html              # Template HTML SvelteKit
  service-worker.ts     # Service worker (offline, registrato da SvelteKit)
  routes/
    +layout.svelte      # Shell app, nav, bootstrap DB/seed
    +page.svelte        # Home (obiettivi, riepilogo studio)
    quiz/+page.svelte   # Sessione quiz (timer, SRS, XP)
    detail/[id]/        # Dettaglio parola/kanji/grammatica
    courses/+page.svelte  # Import/gestione corsi
    stats/+page.svelte  # Statistiche
    settings/+page.svelte # Impostazioni
  lib/
    app.css             # Tutti gli stili
    stores.svelte.ts    # Stato globale reattivo (runes $state)
    components/
      FuriganaText.svelte
      DialogueViewer.svelte
    core/
      furigana.ts       # Parsing furigana[lettura] → HTML ruby
      i18n.ts           # Scelta testo localizzato it/en
      srs.ts            # Algoritmo SRS (stage 0-7, mastery points)
      tokenizer.ts      # Tokenizer giapponese (BudouX)
      tts.ts            # Text-to-speech Web API
    db/
      schema.ts         # Definizioni Dexie e migrazioni
      import.ts         # Import/merge seed → IndexedDB
      course-import.ts  # Import dataset corso (.renkei-course.json)
      objectives.ts     # Obiettivi di studio
      queries.ts        # Query condivise
    quiz/
      engine.ts         # Generatori di domande per ogni modalità
      types.ts          # Tipi TypeScript delle domande
      distractorIndex.ts # Indice distrattori per multiple choice
    types/
      models.ts         # Tutti i modelli dati condivisi
scripts/
  sync-open-source-seed.mjs  # Pipeline di arricchimento seed dati
static/
  seed-n5n4.json        # Seed generato (NON modificare a mano)
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

## Proposte in discussione (2026-07-03)

> Sezione di lavoro: raccoglie le proposte da discutere prima dell'implementazione.
> Contesto: l'app gira su GitHub Pages (hosting statico, nessun backend).

### 1. Transitività e classe verbale: da euristiche hardcoded a dati — ✅ IMPLEMENTATO (2026-07-04)

> Implementato in `scripts/lib/jmdict.mjs` + `applyJmdictMetadata` nel sync.
> JMdict (variante jmdict-examples-eng) è la fonte autoritativa per tipo,
> classe verbale, transitività e tipo aggettivo; le euristiche restano solo
> come fallback per le ~30 parole non trovate. Override manuali in
> `scripts/data/word-overrides.json`. Validazione: `npm run validate:seed`
> (report in `scripts/validation-report.json`). Bonus: 1260 parole hanno ora
> frasi d'esempio Tatoeba (`frasi_esempio`), mostrate nel dettaglio.
> Il testo originale della proposta segue per riferimento storico.

**Problema.** Oggi `scripts/sync-open-source-seed.mjs` determina 自動詞/他動詞 e la classe verbale con dati e regole cablate nel codice:

- `TRANSITIVE_INTRANSITIVE_PAIRS`: ~18 coppie scritte a mano.
- `GODAN_RU_EXCEPTIONS`: lista manuale di verbi godan in -る.
- Regex sui **significati inglesi** ("to become…" → 自動詞) e sui **suffissi kana** (`-す` → 自動詞, che è spesso sbagliato: 話す e 消す sono transitivi).

Le euristiche producono errori sistematici e ogni correzione richiede di toccare il codice.

**Proposta.** Usare **JMdict** come fonte autoritativa, come già avviene per gli altri dati:

- JMdict tagga ogni senso con `vt`/`vi` (transitività) e con la classe verbale (`v1` = ichidan, `v5u/v5k/…` = godan, `vs` = suru, `vk` = kuru). Il progetto [scriptin/jmdict-simplified](https://github.com/scriptin/jmdict-simplified) pubblica release JSON pronte all'uso (licenza CC BY-SA 4.0, serve attribuzione EDRDG in OPEN_SOURCE_DATA.md).
- La pipeline scarica il file una volta, costruisce un indice `scrittura+lettura → {classe, transitività}` e lo usa in `enrichVerbMetadata`. Le liste `GODAN_RU_EXCEPTIONS`, `TRANSITIVE_INTRANSITIVE_PAIRS` e tutte le regex euristiche **vengono eliminate**.
- Resta un piccolo file dati `scripts/data/verb-overrides.json` per i casi residui (voci ambigue o assenti da JMdict), così le eccezioni sono dati versionati e non codice.

### 2. Correzione degli errori: editing in-app + rientro facile nel seed — PROPOSTA DA DISCUTERE (rivista 2026-07-04)

**Direzione scelta** (2026-07-04): niente segnalazioni via GitHub Issues; si vuole
**correggere direttamente dall'app** e avere un modo semplice per **riportare le
correzioni nell'app pubblicata** (rigenerando il seed). Versione di sviluppo:
il ciclo può assumere che l'utente sia anche lo sviluppatore.

**Proposta di design** (da discutere prima di implementare):

1. **Pulsante "✏️ Correggi" nel pannello dettaglio** — apre un form con i campi
   correggibili della voce (tipo, classe verbale, transitività, tipo aggettivo,
   lettura, significati, frasi d'esempio). Il salvataggio produce una **patch**,
   non una copia della voce: `{ id, campi_patch, motivo?, creato_il }`.
2. **Tabella Dexie `user_corrections`** — le patch si applicano subito alla voce
   locale (effetto immediato nei quiz) e vengono **ri-applicate dopo ogni
   re-import del seed**, così una nuova versione dell'app non cancella le
   correzioni locali.
3. **Formato unico con gli override della pipeline** — "Esporta correzioni"
   (in Impostazioni) genera un JSON nello **stesso formato di
   `scripts/data/word-overrides.json`**: per aggiornare l'app basta copiare il
   file nel repo e rigenerare (`npm run sync:open-seed` → `npm run release`).
   Un formato solo, zero backend, correzioni versionate nel diff del repo.
4. (futuro, opzionale) automazione del passo 3: bottone che apre una PR
   precompilata o script che fa merge del file esportato.

**Punti aperti da discutere**: quali campi sono editabili; conflitti
JMdict vs correzione (proposta: l'override vince sempre, già così in pipeline);
UI modale vs pagina dedicata; se le patch valgono anche per kanji/grammatica
oltre che per le parole.

### 3. Cataloghi grammaticali dei corsi famosi (Genki, ecc.) come riferimento — ✅ APPROVATA (2026-07-04), da pianificare

**Idea.** Esistono cataloghi online che mappano i punti grammaticali per libro/lezione. Usarli come riferimento per: (a) validare/correggere la grammatica del seed, (b) generare file `.renkei-course.json` per i corsi famosi, riusando l'infrastruttura corsi già esistente.

Candidati da valutare (licenze da verificare voce per voce):

| Fonte | Cosa offre | Licenza |
|---|---|---|
| [sethclydesdale/genki-study-resources](https://github.com/sethclydesdale/genki-study-resources) | Esercizi e indice grammatica per lezione di Genki I/II | Open source (verificare) |
| Tanos (tanos.co.uk) | Liste grammatica/vocaboli/kanji per livello JLPT | Gratuito con attribuzione |
| Tae Kim's Guide | Grammatica organizzata per argomento con esempi | CC BY-NC-SA (no uso commerciale) |
| Indici community del Dictionary of Japanese Grammar | Mappatura punto grammaticale → riferimento DoJG | Solo indici (il contenuto è copyright) |
| Bunpro (elenco pubblico punti grammaticali) | Mappa grammatica → lezione di Genki/Minna no Nihongo/Tobira | Contenuto proprietario: usabile solo come riferimento di *ordinamento*, non di contenuto |

**Percorso pragmatico**: non copiare contenuti, ma usare i cataloghi come **spina dorsale di ordinamento** (quale punto grammaticale in quale lezione). Il contenuto (spiegazioni, esempi) viene generato come già previsto da COURSE_FORMAT.md ("formato progettato per essere generato da un'IA a partire da materiale sorgente") e agganciato alla grammatica del seed tramite id. Un file corso "Genki I" diventerebbe quindi: ordinamento dal catalogo + spiegazioni generate + link alle voci seed esistenti.

---

## Da vedere insieme (segnalazioni del 2026-07-03 — stato al 2026-07-04)

1. ✅ **捨てる classificato come aggettivo** — risolto con JMdict come fonte
   (ora 動詞/一段/他動詞). La verifica di massa esiste: `npm run validate:seed`
   → 0 discrepanze residue, 30 parole non trovate in JMdict elencate nel report.
2. ✅ **Badge/label cliccabili → spiegazione della forma** — i badge linkano
   alle schede della nuova pagina `/forme` (ancora per categoria).
3. ✅ **Regole d'uso legate alla categoria** (な dopo l'aggettivo, の tra nomi,
   を/が nelle coppie transitivo/intransitivo) — integrate nelle schede di
   `/forme` (`src/lib/data/grammarForms.ts`) con esempi e link incrociati.
4. 🔄 **Navigabilità totale** — avanzata: badge → schede forme, "vedi anche" tra
   forme, errori del riepilogo → dettaglio, frasi d'esempio con TTS. Restano da
   collegare: token delle frasi d'esempio → dettaglio parola, categorie
   grammaticali del seed → schede forme.

---

## In coda (2026-07-05)

1. **Icone aggettivi い/な** — sostituire 🔴/🧩 nei badge con i kana い e な
   stilizzati via CSS (cerchietto colorato, stile emoticon), così l'icona È la
   desinenza da ricordare.
2. **Coniugazioni complete nel drill** — oggi il drill testa 4 forme (ます/ない/
   た/て per i verbi; negativo/passato/passato neg./avverbiale per gli
   aggettivi). Vanno coperte **tutte** le forme: volitiva, potenziale,
   condizionale (ば/たら), imperativa, passiva, causativa, たい, ecc.
   Nelle **Impostazioni** una checklist "forme che conosco": quelle non
   ancora studiate vengono escluse dal drill (default: solo le base N5).
3. **Localizzazione italiana dei contenuti, partendo dal giapponese** — oggi i
   significati inglesi riempiono sia `it` che `en`. La traduzione va fatta
   **dal giapponese** (non dall'inglese, altrimenti si accumulano errori di
   doppia traduzione), presumibilmente con un passo di generazione nella
   pipeline seed. Siccome è sperimentale: **prima** aggiungere nelle
   Impostazioni la scelta della lingua contenuti (it/en, oggi è auto da
   `navigator.language`), così se la traduzione fa schifo si torna all'inglese
   con un tap. Ordine: setting lingua → pipeline traduzione it → revisione.

## Problemi noti / TODO tecnici

- Il matching nelle espressioni idiomatiche (`buildExpressionLinkedWords`) usa sottostringa semplice e può generare falsi positivi per espressioni molto corte.
- La funzione `alternativeReadings` include letture dai suffissi degli ID compositi (`word-id-lettura`) che potrebbero non essere sempre significativi.
- Il seed non include i dati pitch accent per la maggior parte delle voci N5/N4: la sezione viene nascosta correttamente ma non sarà mai mostrata finché il campo non viene arricchito.
- `src/routes/quiz/+page.svelte` è la route più grande (~1000 righe): candidata naturale all'estrazione di componenti (es. pannello domanda, riepilogo sessione).
- **Rimandati per scelta (2026-07-04)**: export/import dei progressi utente (si valuterà un approccio migliore, forse app dedicata); deploy automatico via GitHub Actions (nei "forse" per il futuro).
