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
7. **Numeri e contatori** (`classifyNumbersAndCounters`, `scripts/lib/numbers-counters.mjs`): ricategorizza i numerali come `数詞[すうし]`, i giorni/persone come `助数詞` legati al contatore (`日`/`人`), e azzera i sinonimi euristici fasulli (三日 non è sinonimo di 四日). Gira **dopo** `enrichWordRelations` così sovrascrive i sinonimi generati.
8. **Scrittura `seed-n5n4.json`**.

> **Non modificare `seed-n5n4.json` a mano**: viene sovrascritto ad ogni sync.
> Eccezione: `node scripts/fix-numbers-counters.mjs` riapplica al seed committato solo la ricategorizzazione numeri/contatori (stessa logica del pipeline, senza fetch di rete) — utile dopo aver toccato `counters-n5n4.json`.

---

## Numeri e contatori

### Categorizzazione nel catalogo
- **`数詞[すうし]`** (numerali): 一, 二, 三…, la serie nativa 一つ/二つ…, 百/千/万/億, ゼロ/零. Badge 🔟.
- **`助数詞[じょすうし]`** (contatori): i simboli-contatore (`counters-n5n4.json`, entità separate in `db.counters`) **e** le parole che sono istanze numero+contatore: date del mese (ついたち…はつか → contatore `日`), persone (一人/二人 → `人`). Badge 🔢.
- I sinonimi euristici tra elementi della stessa serie di conteggio sono **errati** e vengono azzerati (si tiene solo ゼロ↔零). Le date sono "riferite" al loro contatore via `id_contatore_suggerito`, non come sinonimi.
- Eccezioni note: 一月 (ひとつき, resta 名詞), 一番 (いちばん, resta 副詞 — uso ordinale).

### Catalogo contatori (`/contatori`)
Card per contatore con simbolo, lettura, note, **letture irregolari** e parole tipiche. Ogni card ha un link **Consolida** → `/consolida/counter:<id>`.

### Consolida contatori (`createCounterDrillQuestion`, `src/lib/core/counterGen.ts`)
Drill sulle letture numero+contatore. Due strategie:
- **Lista fissa**: per contatori con set chiuso di irregolari (本, 匹, 分…) i distrattori sono le *altre* letture irregolari dello stesso contatore + varianti di voicing (rendaku sbagliato).
- **Generazione randomizzata** (`GENERATED_COUNTERS` = 日, 時, 分, 円): la lettura viene generata al volo per un numero casuale, così ogni ripetizione è diversa:
  - **日** (giorni): 1-31 — native irregolari (1-10, 14, 20, 24), regolari +にち altrove.
  - **時** (ore): 1-12 — trappole よじ/しちじ/くじ.
  - **分** (minuti): 1-59 — rendaku ふん/ぷん.
  - **円** (yen): prezzi tipici — rendaku di 百/千 (300 さんびゃく, 800 はっぴゃく, 3000 さんぜん, 8000 はっせん).

`readNumber(n)` (0–99999) è il lettore di numerali riusabile (con rendaku di centinaia/migliaia); testato in `counterGen.test.ts`.

## Modello dei punteggi

Tre livelli distinti, per non rendere l'XP gonfiabile:
1. **XP globale + livello + streak** (`user_profile`): **solo** dalle sessioni di quiz (con timer). È il punteggio "ufficiale".
2. **Consolidamento per item** (`srs_progress`): il quiz lo fa avanzare pienamente (`applySrsReview`: stage + intervallo + mastery). Il **Consolida** applica invece `applyPracticeReview`, che muove **solo i `mastery_points`** (peso 30% in `normalizeMastery`), senza toccare stage né data di ripasso e **senza XP**. Così la pratica libera e ripetibile "conta" verso il consolidamento (visibile in Stats, contatori inclusi) ma non falsa gli intervalli SRS né l'XP.
3. **Highscore dei giochi** (`gameScores.ts` → localStorage): punteggio **a parte**, separato da XP e SRS. Un record per gioco/categoria.

### Giochi sui numeri (`/giochi`)
Tutti a serie (un errore azzera), record per gioco via `submitScore`/`getHighscore`. Due gruppi:

**Leggi come si pronuncia** (scelta multipla):
- **日/時/分/円** — `generateReading`.
- **Che ore sono?** — `generateClockReading` (orario 時+分 combinato, es. 4:30 → よじさんじゅっぷん).
- **Conta gli oggetti** — `generateCountObjects(counters)` (in `engine.ts`): N emoji a schermo → lettura numero+contatore giusta; distrattori con lo stesso numero ma contatore sbagliato (さんびき/さんぼん/さんまい). Usa `readCounterN` (irregolare dal catalogo o concatenazione regolare).
- **Misto**.

**Ascolta e agisci** (TTS + azione):
- **Scrivi il numero** — `generateNumberDictation`: il TTS legge un numero, l'utente digita le cifre.
- **Alla cassa** — `generateShopPrice` + `YEN_DENOMINATIONS`: il commesso annuncia il totale (frase variata tra 2-3 tipi), l'utente compone l'importo esatto con banconote/monete; alla fine il commesso risponde (ちょうど… / すみません…).
- **Appuntamento** — `generateAppointment`: il TTS legge data + ora (「3月9日の4時半」), l'utente inserisce mese/giorno/ora/minuti (半 = 30).
- **Lista della spesa** (お使い) — `generateShoppingList` (`shopItems.ts`): **fase 1** l'interlocutore detta la lista e la lista **non è mostrata** (va ricordata); riempi il carrello cliccando le emoji (tocca = +1, click destro/lungo = −1) e a ogni tap **senti la quantità** (ひとつ、ふたつ…, voce utente). **Fase 2** (Ho finito): compare la lista, tu riepiloghi a voce (「じゃあ、りんごを…ですね？」) e l'interlocutore conferma/corregge, con errori evidenziati e complimenti occasionali.

**Conversazione:**
- **Saluti e convenevoli** (挨拶) — `generateGreeting` (`greetings.ts`): dato uno stimolo (una frase a cui rispondere, con audio, o una situazione in italiano) scegli la formula idiomatica giusta (いってきます→いってらっしゃい, ただいま→おかえり, いただきます…). Quiz a parte; l'avventura konbini ci si appoggerà per il saluto.

**Voce (TTS)** — impostazione `voce_utente` (maschile/femminile) in Settings; `voices.ts` `voiceParams(gender)` sceglie una voce giapponese per genere (euristica sul nome; femminile = voce di default naturale, maschile abbassato di pitch se non c'è una voce maschile). Nella pagina: `speakUser(text)` (tua voce) e `speakGender(text, gender)`. La **kanojo** (chi manda a fare la spesa) ha voce femminile fissa; il commesso ha voce del sesso opposto alla tua. *Futuro:* più personaggi (kanojo/shachou/…) con registri e voci diversi, e risposta al livello opportuno.

**Catalogo prodotti** (`src/lib/core/shopItems.ts`): ~24 voci `emoji · scrittura · lettura · it · reparto/repartoJp · prezzo · counterId`. È il mattone riusabile per i giochi situazionali; le quantità si leggono con `readCounterN(counter, n)` (serve che il contatore abbia letture numerate, es. つ → `ひとつ (1)…`).

**Timer** (opzionale, toggle in home): countdown per la risposta che, se scade, azzera la serie. Nei giochi d'ascolto parte **dopo** l'audio (`speakSentenceJapaneseAsync` → Promise su `onend`), coordinato con un `qGen` per non armare timer di domande superate.

Base tecnica riusabile in `counterGen.ts`: `readNumber`, `dayReading/hourReading/minuteReading/monthReading/yenReading/clockReading`; `readCounterN` in `counterReadings.ts`; catalogo prodotti in `shopItems.ts`.

Idee future che spremono lo stesso catalogo: **trova il prodotto** (find-it), **trova il reparto**, **cassa col resto** (おつり).

### Avventura al konbini (semplificata) — roadmap incrementale
Da costruire e deployare **un pezzo per volta**, riusando i micro-giochi esistenti:
1. **Lista della spesa** (お使い) — *fatto*.
2. **Saluto in partenza**: scegli la frase idiomatica giusta (いってきます) e senti la risposta (いってらっしゃい).
3. **Chiamata a sorpresa** (mentre vai): l'interlocutore aggiunge o toglie un prodotto — **niente conferma**, va ricordato al volo.
4. **Al konbini — ordina**: chiedi al commesso componendo nella frase i numeri+contatori giusti (presentati a volte in kanji, a volte in lettura), con le icone della lista come riferimento; alla fine senti la frase completa.
5. **Paga** (riusa la cassa, poi con resto/おつり).
6. **Rientro**: ただいま → l'interlocutore conta le cose e verifica se hai preso giusto (tenendo conto della chiamata).

Regole UX condivise: nei giochi d'ascolto la soluzione **non si mostra prima** (si ascolta e basta); il timer parte dopo l'audio; l'interlocutore ha voce del sesso opposto a `voce_utente`.

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
3. **Localizzazione italiana dei contenuti, partendo dal giapponese** — piano
   (aggiornato 2026-07-05):
   1. ✅ **Selettore lingua nelle Impostazioni** (fatto): Automatica/Italiano/
      English; override in localStorage (`renkei_locale_override`) letto da
      `detectUserLocale`, persistito anche in `app_settings.lingua_contenuti`.
      Il cambio ricarica l'app. `pickLocalizedText/Array` fanno già fallback
      it→en, quindi si può tradurre in modo incrementale.
   2. **Pipeline `scripts/translate-it.mjs`** (da fare): per ogni voce passa al
      traduttore scrittura+lettura+tipo (le glosse EN solo come
      disambiguazione), chiedendo glosse brevi da dizionario **dal giapponese**.
      Cache incrementale in `scripts/.cache/translations-it.json` per non
      ritradurre l'invariato. Campi: `words.significato.it`,
      `grammar.spiegazione.it`, `frasi_esempio.traduzione.it`.
   3. **Revisione**: report `[jp, en, it]` per controllo a campione; le
      correzioni manuali entrano in `word-overrides.json`.
   4. **Motore di traduzione — deciso (2026-07-05)**: Claude API nello script
      locale (mai nel client). Non serve un modello top: per glosse brevi di
      dizionario basta **Claude Haiku 4.5** (`claude-haiku-4-5`, $1/$5 per
      milione di token in/out); per le 167 spiegazioni grammaticali, che
      richiedono più sfumatura, eventualmente **Claude Sonnet 4.6**
      (`claude-sonnet-4-6`, $3/$15). Volume stimato (~1400 parole + 167
      grammatiche + ~2500 frasi ≈ 1M token input, ~0.3M output): con Haiku
      ~2–3 $, dimezzabili usando la **Batch API** (−50%, va benissimo perché
      non è latency-sensitive). Costo una tantum irrisorio; la cache
      incrementale evita di ripagarlo ai re-sync.

## In coda (2026-07-05) — parole multi-uso (たくさん & co.)

**Problema (segnalato dall'utente).** たくさん in JMdict è
`[adj-no, adj-na, n, adv]` su un unico senso, ma nell'app risulta solo
な形容詞. Causa verificata: `deriveJmdictMetadata` appiattisce l'unione dei
POS in **una sola** `tipo_jp` con priorità fissa (verbo > adj-i > adj-na >
ctr > adv > n), quindi adj-na vince su nome e avverbio. È sistematico:
**154 parole del seed** hanno più categorie POS in JMdict (安心, 安全,
一生懸命, 一度, 皆, この間...).

**Direzione proposta: una scheda sola, sezione "Usi" multipla** (non schede
separate). A differenza dei verbi in -する — dove la forma scritta cambia e
la coniugazione pure, quindi le schede separate hanno senso — qui la parola
è identica: schede multiple romperebbero l'identità SRS e produrrebbero
scelte duplicate nei quiz di riconoscimento. Design:

1. **Modello**: `Word.usi?: { tipi_jp: WordTypeJP[]; significati; esempio? }[]`
   — un elemento per senso JMdict (i sensi portano già POS, glosse e frase
   Tatoeba propria: mappano 1:1 su "uso + esempio per sfumatura").
2. **Primario**: `tipo_jp` resta il campo primario ma va derivato dal
   **primo POS del primo senso** (l'ordine JMdict riflette l'importanza),
   con `adj-no → 名詞`; たくさん diventerebbe 名詞 con usi な形容詞 e 副詞.
3. **Badge**: un badge per categoria distinta (primario per primo).
4. **Dettaglio**: sezione "Usi" — per ogni uso: badge, glosse, frase
   d'esempio di quel senso con TTS.
5. **Quiz/drill**: invariati sul primario; il drill aggettivi si attiva se
   tra gli usi c'è adj-na/adj-i.

## In coda (2026-07-05) — quiz avanzati e allenamento ascolto JLPT

1. **Espressioni idiomatiche (慣用表現) con distrattori pedagogici**
   - Cloze dell'espressione nella sua frase Tatoeba, distrattori = altre
     idiomatiche dello stesso livello.
   - Distrattore principe: il **significato letterale** (お腹が空いた →
     "la pancia si è svuotata") — da generare una tantum in pipeline nello
     stesso batch LLM della traduzione (`significato_letterale` sul Word).

2. **Keigo, al livello opportuno**
   - N5/N4: forme fisse (いらっしゃいませ, いただきます, ください) e です/ます
     vs forma piana → quiz "che registro serve qui?".
   - N3+: coppie 尊敬語/謙譲語 (言う→おっしゃる/申す, 見る→ご覧になる/拝見する...)
     in un modulo dati; quiz di trasformazione con distrattori incrociati —
     l'errore classico è usare l'umile per il soggetto da rispettare.
   - Nuova scheda in /forme; gating sul target JLPT dello study goal.

3. **Domande in stile JLPT (mai item ufficiali: copyright)**
   - Generazione in pipeline (LLM batch, stesso meccanismo della traduzione)
     sul formato ufficiale: 語彙 (kanji-lettura, parafrasi, uso), 文法
     (riempimento, ordinamento con ★), 読解 breve.
   - Seed dedicato `jlpt-items.json` con revisione; modalità "Simulazione"
     con timer d'esame e punteggio per sezione.

4. **Ascolto JLPT (聴解) — il punto debole dichiarato**
   Il choukai ufficiale depista di proposito: menziona tutte le opzioni,
   cambia idea a metà (やっぱり…), nega tardi, dice per prima la risposta
   sbagliata. Piano per allenarlo:
   a. **Generatore di dialoghi-trappola in pipeline**: prompt LLM che
      replica i pattern ufficiali per tipo di prova — 課題理解 (cosa deve
      fare la persona DOPO il dialogo), ポイント理解 (dettaglio chiave),
      即時応答 (risposta immediata) — con i trucchi codificati nel prompt.
      Output: dialogo a battute con personaggi + domanda + 4 opzioni +
      spiegazione del tranello. Formato: estensione di `dialoghi_nuovi`
      (COURSE_FORMAT) con campo `domande[]`. ~100 dialoghi con Haiku/Sonnet
      in batch = pochi €.
   b. **Riproduzione**: Web Speech TTS con voce diversa per personaggio e
      velocità regolabile (0.8x → 1x → 1.25x come progressione); testo
      NASCOSTO fino alla risposta; replay limitato come all'esame.
   c. **Progressione**: liv.1 trascrizione visibile dopo il primo ascolto →
      liv.2 solo audio, 2 ascolti → liv.3 regole d'esame (1 ascolto; per
      即時応答 anche le opzioni sono solo audio).
   d. **Statistiche per skill** (ascolto/lettura/grammatica separate) per
      vedere dove si è deboli.

## Forme grammaticali collegate (fatto 2026-07-06)

Schede curate in `src/lib/data/grammarForms.ts`, renderizzate in /forme:
- 授受 (あげる/くれる/もらう) e 縮約形 (contrazioni).
- La scheda 縮約形 ora ha un campo strutturato `contractions[]` (short/full/note)
  reso come mappa **contratta → "contrazione di" → intera** con badge, invece
  del solo testo. Ogni forma intera è a sua volta una scheda navigabile.
- Aggiunte le forme composte come schede /forme collegate ai verbi:
  〜と思う, 〜てみる, 〜ておく, 〜てしまう, 〜ている, 〜そう (apparenza),
  意向形 〜よう. Ognuna ha esempi N5/N4 con furigana e `related` incrociati
  (le composte contraibili rimandano a 縮約形 e viceversa).
- Nuovo campo `consolidaId` sulla scheda: link "Esercitati con questa forma"
  che apre un micro-drill Consolida sulla voce grammar del seed corrispondente
  (id `grammar-api-N4-56/65/20/21`, `grammar-api-N5-66`, `grammar-api-N4-54/14`).

Rifiniture (2026-07-06, v12):
- Drill più ricco: file curato `scripts/data/grammar-examples-n5n4.json`
  + `mergeGrammarExamples()` nello script aggiungono 2 frasi extra alle 7
  voci grammar collegate (l'API ne dava 1 sola). Il seed committato è già
  patchato con le stesse frasi (SEED_REVISION → `…-grammar-examples-v12`).
- Scoperta dal verbo: la scheda dettaglio dei 動詞 mostra "Forme composte
  utili" con chip verso /forme#slug.
- Test di integrità `src/lib/data/grammarForms.test.ts`: slug unici, `related`
  e `consolidaId` esistenti (+ frasi_esempio presenti), coerenza di
  `FORM_SLUG_BY_LABEL`.

Possibile evoluzione futura (non urgente): campo `forma_base_id` sulle voci
`grammar` del seed per collegare le contrazioni a livello dati, e generazione
in batch di altre forme composte.

## Pagina /forme-composte (2026-07-06)

Le forme composte/costruzioni sono state separate dalle parti del discorso:
`GrammarForm.composed === true` → pagina dedicata `/forme-composte`, il resto
resta in `/forme`. Helper `formPage(slug)` + `COMPOSED_SLUGS` per i link
incrociati. In grammarForms.ts:
- Schema di attacco (`attachment[]` = base+connessione, `schemaId`, `exceptions`)
  con legenda `ATTACHMENT_SCHEMAS` in cima alla pagina + dettaglio inline in
  ogni scheda; le forme con lo stesso `schemaId` si linkano ("stesso schema di").
- Nuove forme N5/N4: 〜たい, 〜すぎる, 〜やすい/〜にくい, 〜ながら, condizionali
  〜ば/〜たら/〜と/〜なら, 可能形/受身形/使役形, 〜ほうがいい, 〜つもり,
  〜たことがある, 〜なければならない (tutte con consolidaId dove esiste nel seed).
- Contrazioni: la scheda 縮約形 ora linka la forma intera navigabile (`fullSlug`).

## Statistiche per skill (2026-07-06)

Pannello "Consolidamento per skill" in /stats:
- **Consolidamento** (`loadSkillMastery`): % media SRS + ripassi per
  parole/kanji/grammatica, da `srs_progress` per prefisso `id_item`. Foto dello
  stato attuale.
- **Accuracy** per skill: ora `StudySessionState`/`StudySessionRecord` hanno
  `answersByType` (words/kanji/grammar), popolato in `handleAnswer` da
  `itemRef.kind` e salvato in `endSession`. La stats somma su tutte le sessioni
  che hanno il campo (le vecchie non ce l'hanno → semplicemente non contano).

## Problemi noti / TODO tecnici

- Il matching nelle espressioni idiomatiche (`buildExpressionLinkedWords`) usa sottostringa semplice e può generare falsi positivi per espressioni molto corte.
- La funzione `alternativeReadings` include letture dai suffissi degli ID compositi (`word-id-lettura`) che potrebbero non essere sempre significativi.
- Il seed non include i dati pitch accent per la maggior parte delle voci N5/N4: la sezione viene nascosta correttamente ma non sarà mai mostrata finché il campo non viene arricchito.
- `src/routes/quiz/+page.svelte` è la route più grande (~1000 righe): candidata naturale all'estrazione di componenti (es. pannello domanda, riepilogo sessione).
- **Rimandati per scelta (2026-07-04)**: export/import dei progressi utente (si valuterà un approccio migliore, forse app dedicata); deploy automatico via GitHub Actions (nei "forse" per il futuro).
