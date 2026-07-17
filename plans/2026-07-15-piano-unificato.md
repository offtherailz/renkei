# Piano unificato Renkei (15 luglio 2026)

Fonde i tre piani esistenti in un unico filo coerente. Ogni item si consegna da solo
(feature → check → build → test → **staging** → verifica → **prod**), una cosa alla volta.

## Regola di consegna (staging PRIMA di prod)

Per OGNI item, prima del rilascio:
1. `npm run check` + `npm run build` puliti (0 errori/warning); test vitest se tocca engine/dati.
2. `npm run deploy:staging` → verifica su `/renkei/staging/` (DB isolato, nessun rischio per lo stabile).
3. Solo dopo l'OK: `npm run release` (prod) → `gh run list` conclusion `success`
   (se Pages fallisce in modo transitorio: `npm run deploy`).
4. Commit SOLO a nome utente (`--author="Lorenzo Natali <offtherailz@gmail.com>"`), mai Co-Authored.

---

## Stato attuale (17/07/2026 — handoff di sessione)

**FATTO (commit locali su main, staging deployato con tutto, PROD MAI deployata):**
- Blocco A completo: A1-A3 (punteggio per classe `conj:*`/`particella:*`/`counter:*`),
  A4 (sfaccettature Nation: campi facet, radar Kiviat in scheda, selezione guidata, pagina
  /sfaccettature con tooltip), A5 (drill consolida classe/particella + 💪 con % su
  /forme /particelle /forme-composte), A6 (spoken-production 🎤).
- `gram:*` per costruzioni (potenziale/passiva/causativa/…): credito da conjugation e
  verb-form-cloze via `formKey`+`CONSTRUCTION_BY_FORM_KEY`, drill `/consolida/gram:<slug>`.
- C1 (verb-form-cloze), C3 (usage-cloze), C4 (composition — anche in Consolida col banco token).
- F1 (ripasso deboli = `/quiz?deboli=1` dentro il quiz vero), F2/F3 (La so già/Rimanda/
  Seppellisci nella card Memorizzazione; `buried` esclude da tutto; conferma+annulla).
- Giochi/avventure → `recordPractice(entità, esito, cella)`: keigo 🧩, iikae 🎯, shadowing 🎤
  (+2 solo positivo), avventure (successi oltre ai miss). `recordPracticeMiss` = wrapper compat.
- Punti deboli: solo `lapses>0`, link alle pagine/schede, `pctFor` practice-only per
  conj/particella/gram/phrase; countDueCards esclude solo-pratica e buried.
- Dati: seed **v57** — curatela 1 (70 parole: keigo↔piano, tipi, sin/contrari), curatela 2
  (rinomine 下がる/落ちる/落とす/楽しむ + merge うかがう→伺う via WORD_RENAMES/WORD_MERGES in
  scripts/lib/word-splits.mjs), split 回る/回す (B4), interiezioni 感動詞, 53 frasi propedeutiche,
  coppie かかる↔掛ける e 止む↔止める collegate.
- **63 domande curate** in `src/lib/data/propedeutiche-n5n4.json` (+ modulo `propedeutiche.ts`):
  già consumate dal drill particelle (curate prima, poi generate), campo `explanation` su
  usage-cloze mostrato dopo la risposta (consolida+quiz).
- Fix generatori da audit insegnante (plans/2026-07-17-audit-domande-report.md): transitivity a
  frase intera, distrattori grammatica da strutture, particelle ambigue escluse (を/で percorso,
  へ/に/まで moto, から/より), label senza desinenze, varianti "A;B" prima grafia, omofoni MAI
  distrattori nella reading-recognition, occorrenza del buco pesata (pickOccurrenceIndex — bug
  かれ/か e ちょっと), glosse «fare:» a distrattori omogenei.
- UI/UX: pagina 🧮 /punteggi (referenza calcolo punteggi, MANTENERLA), guida aggiornata ovunque,
  contatore ripassi/carte-nuove nel piano di oggi + «🔁 ripassali», badge 漢 condiviso, emoji VS16,
  controlli sessione colorati, guardia Indietro nel quiz, scroll robusto alle àncore, kanji nel
  vocabolario (chip 漢), spiegazioni post-risposta in Consolida.
- Strumenti: **audit domande** `AUDIT=1 npx vitest run src/lib/quiz/questionAudit.test.ts` →
  plans/question-audit-sample.md; `scripts/fix-split-words.mjs` riapplica split/rinomine al seed.

**PROSSIMI (in ordine ragionevole):**
1. ✅ (17/07) 44 item curati consumati: tutti i 63 hanno `parola` (id carta) — 自/他 e keigo
   → specials del quiz + coda consolida della parola (`curatedByWord`); keigo → anche round
   'cloze' nel gioco /keigo; forma-contesto → drill `/consolida/gram:*` via campo `gram`
   (9 slug: ta-koto-ga-aru tsumori tai nagara nakereba te-iru hou-ga-ii kanou sugiru; il
   drill gram ora vive anche senza formKey). Fix collegati: frase-lista ば sostituita
   (seed v58), keigo suppletivi esclusi dalla coniugazione a secco.
2. ✅ (17/07) Relazione «correlati» ≠ sinonimi: campo `Word.correlati?`, card nella scheda,
   curatela famiglia umile/onorifico negli overrides (19 voci: 妻↔奥さん, 夫↔ご主人,
   父母/お父さん・お母さん, fratelli 兄弟, 娘↔お嬢さん, お宅↔家/うち) — le false sinonimie
   spostate in correlati, seed v59. I generatori NON usano i correlati come sinonimi.
3. ✅ (17/07) 20 parole nuove aggiunte (seed v60) + partner 自/他 collegati bidirezionali;
   mergeCuratedWords esteso (esempi multipli + campi verbo/relazioni). Poi (v61): frasi-aeroporto
   慣用表現 tolte dal mazzo SRS e ricollocate in Frasi utili; `applySeedMigrations` rimuove dai
   dispositivi le voci rinominate/fuse/rimosse (bulkPut non elimina) e migra il progresso SRS.
4. Pagine annidate /forme/[slug] e /particelle/[slug] (contenuto esaustivo, indice snello).
   ← PROSSIMO CANDIDATO se si vuole, ma valore marginale (l'indice ancorato attuale funziona).
5. Migliorie parcheggiate: completamento piano di oggi, ✅ furigana toggle fase 1, avverbi,
   copione choukai ricco, ✅ frasi-aeroporto ricollocate, sotto-celle riconoscere/usare,
   ✅ RSVP pesato per kanji, ✅ rename «Attività». NUOVE ATTIVITÀ da progettare (osservazioni
   17/07 in coda a questo file): lettura ad alta voce assistita (furigana→senza→mic; il toggle
   fase 1 c'è già), dettato da ascolto.
6. Blocchi B: ✅ B1 verificato chiuso, ✅ B2 mitigato, ✅ B4 fatto; B3 → collaudo insegnante.
   D1-D3, E ancora aperti.

**Stato deploy (17/07):** tutto su STAGING (gh-pages, ultimo `58a2c52`); **PROD MAI toccata**
in questa sessione — aspetta l'OK dopo le verifiche in plans/2026-07-17-verifiche-propedeutiche.md.
Seed a v61. Commit su main: 12 di questa sessione (propedeutiche 自他/keigo/forma, correlati,
20 parole, pulizia aeroporto+migrazioni, RSVP, rename, furigana toggle).

---

## Ordine unificato

> **Ordine di esecuzione concordato (16/07):** finire **Blocco A** (A1→A6) **+ D4** (badge `漢` +
> catalogo `/kanji`) → **Blocco F** (ripasso attivo + leech) → poi il resto (B/C/D/E).
> A1 ✅ fatto (con guardia minima punti-deboli). Prossimo: A2.

### Blocco A — Punteggio quiz più giusto  ← PARTENZA CONFERMATA
Dettaglio completo in `2026-07-14-punteggio-quiz-sfaccettature.md` (Fasi 1–6). Sintesi:
1. **A1** — contatore coniugazione per classe `conj:*` (Fase 1)
2. **A2** — contatore per particella `particella:*` (Fase 2)
3. **A3** — contatori/orario rediretti a `counter:*` solo pratica (Fase 3)
4. **A4** — sfaccettature Nation (vedi «Design sfaccettature» sotto) (Fase 4, ridefinita)
5. **A5** — visibili/praticabili `conj:`/`particella:` in punti-deboli + consolida (Fase 5)
6. **A6** — nuova modalità `spoken-production` (microfono) (Fase 6)

### Design sfaccettature (A4, deciso 15/07 in conversazione)

Teoria: modello di **Paul Nation** — *conoscere una parola* su 3 dimensioni (Forma, Significato,
Uso), ciascuna ricettiva/produttiva.

**Pattern unico (architetturale).** Una sola tassonomia di sfaccettature = **(dimensione × R/P)**,
usata come **tag trasversale** su ogni `mode` di domanda. Ogni **entità** accumula un punteggio per
sfaccettatura, ma **solo sulle celle che la riguardano**. In software:
`record(entityKey, facetOf(mode), correct)` + `applicableFacets(entity)` + un render che disegna
solo le celle applicabili. Niente logica su misura per tipo di carta.

**Tassonomia (8 celle):**

| # | Cella (dim·R/P) | Icona | Label | Modi di domanda |
|---|---|---|---|---|
| 1 | Forma scritta·R | 📖 | Leggere | flashcard-reading-recognition |
| 2 | Forma scritta·P | ✍️ | Scrivere | composizione (C4), coniugare (`conjugation`) |
| 3 | Forma orale·R | 👂 | Ascoltare | listening |
| 4 | Forma orale·P | 🎤 | Dire | spoken-production (A6) |
| 5 | Significato·R | 💡 | Capire | flashcard-recognition, multiple-choice |
| 6 | Significato·P | 🎯 | Recuperare | flashcard-production |
| 7 | Uso·R | 🔍 | Riconoscere l'uso | scelta pattern/particella (variante a scelta) |
| 8 | Uso·P | 🧩 | Usare in frase | particle-cloze, cloze coniugato (C1), cloze d'uso (C3) |

**Entità × celle applicabili:**
- **Parola** → tutte. Radar/Kiviat in fondo a `/detail/word:…` (celle 7+8 mostrate unite come 1 asse
  «Uso» → **7 assi visibili**, come approvato). Scala 0–100%; celle N.A. tratteggiate (≠ non praticato).
- **Classe verbale** `conj:*` → **{✍️ Coniugare, 🧩 Usare in frase}** — solo forme del **quadro base**
  (ます/て/た/ない/volitivo).
- **Particella** `particella:*` → **{🔍 Riconoscere quale, 🧩 Usarla in frase}**.
- **Costruzione** (`可能`/`使役`/`受身`/condizionali/composte てしまう・ておく・ている…) → entità propria
  **{💡 Significato, 🔍 Quando si usa, 🧩 Usare}**, con **✍️ agganciata alla classe** (la morfologia
  dipende da godan/ichidan). Confine deciso: **quadro base = classe; tutto il resto = costruzioni.**
  Sono lo stesso tipo «punto grammaticale» (ci rientra 自動詞/他動詞) → in scope ORA.
- **Kanji** → fuori dal sistema, punteggio attuale (deciso). **Frasi/contatori** → invariati.

**Selezione guidata dalle sfaccettature** (novità vs piano 14 lug): le sfaccettature guidano
QUALE MODO di domanda esce, **non** lo scheduling della parola. La parola resta scelta dalla sua
unica riga SRS (`pickNextItem`/`getActivePool` invariati); cambia solo `pickWordMode`, che pesca
a caso tra le celle **applicabili + sbloccate** allo stage attuale quella **meno sviluppata**, mai
la stessa due volte di fila. **Soglie di sblocco** (agganciate alla scala già esistente): 💡📖 st.0,
👂 st.1, 🎯🧩 st.2, **🎤 st.3, ✍️ st.4** → il difficile arriva quando la parola è consolidata.
Dettaglio soglie/peso/`gram:*` in `2026-07-16-catalogo-costruzioni-e-facetof.md`.

- **Incremento doppio naturale**: una domanda 🧩 di uso su 食べる aggiorna sia `conj:ichidan` (classe)
  sia `facet_use` della parola — stesso tag, due entità, senza codice speciale.
- **Generatori mancanti** (1 per cella non ancora coperta): ✍️ composizione (C4), 🎤 microfono (A6),
  🧩 cloze coniugato/d'uso (C1/C3), 🔍 variante a scelta per Uso·R. → C4/A6/C1/C3 rientrano in A4.
- **Serve** un piccolo **catalogo di costruzioni** (`可能`/`使役`/`受身`/`条件`/composte); alcune già
  emergono da `createConjugationQuizQuestion` (oggi solo come ✍️ Forma-P → `conj:*`).

**Problemi algoritmici da gestire (in fase di implementazione):**
- `applicableFacets(word)` deve escludere celle impossibili: parole **full-kana** → niente 📖/✍️
  (è il bug B1); 🧩 richiede frasi/particella/classe; 👂/🎤 richiedono TTS/mic; 🎯 ambigua con glosse
  IT condivise.
- Radar: distinguere **N.A.** (impossibile) da **0** (da fare).
- Selezione: evitare monotonia (no stessa cella due volte di fila) e **assi orfani** (parola che non
  sale mai di stage non vede mai le celle difficili → tarare le soglie).
- Il doppio incremento significa **due write per risposta** → testarlo.

**`applicableFacets` dipende dalla CLASSE (`tipo_jp`), non solo word-vs-kanji** (verificato sui dati):

| Classe | Celle applicabili | Note |
|---|---|---|
| 名詞 | 💡🎯📖✍️👂🎤🧩 | niente coniugazione |
| 動詞 | tutte | + `conj:*` (✍️🧩) + costruzioni |
| 形容詞 い/な | tutte | + conj い/な |
| 副詞/接続詞/連体詞 | 💡🎯📖👂🎤🧩 | ✍️ ridotto |
| 助詞 | 🔍🧩 | `particella:*` |
| 助動詞 (てしまう…) | = costruzioni | |
| 数詞/助数詞 | 📖🧩 | già `counter:*`; radar N.A. |
| 慣用表現 (idiom) | 💡🧩(forte) 📖👂🎤🎯 | **✍️ N.A.** (unità multi-morfema) |
| keigo suppletivo (召し上がる…) | word + 🔍🧩 registro | lessema a sé, relazione al verbo piano |

- **Keigo** = **Uso·registro** (Nation: constraints on use). Suppletivi = entità `word:` con relazione;
  produttivo (お+masu+になる/する) = costruzione. Gioco `/keigo` già esiste (oggi solo miss su `word:`).
- **Catalogo costruzioni**: **già presente** in `GRAMMAR_FORMS` (`src/lib/data/grammarForms.ts`) —
  32 voci `composed: true`, incluse 可能/受身/使役 (`kanou`/`ukemi`/`shieki`) e i condizionali. Entità
  = `gram:<slug>`. Classificazione + celle nella bozza `2026-07-16-catalogo-costruzioni-e-facetof.md`.

**Sistema a sfaccettature = lente su TUTTA l'app (deciso 15/07, rollout incrementale).**
- Generalizzare `recordPracticeMiss(entity)` → **`recordPractice(entity, facet, correct)`**. È il
  `record(entità, cella, esito)` del pattern, riusato da quiz E giochi/avventure/shadowing/consolida.
- **Attribuzione**: l'unità è la **singola interazione controllata**, non l'attività. `facetOf(interazione)`
  = mappa fissa (come `facetOf(mode)`); l'entità è già nota (i giochi la passano già a `recordPracticeMiss`).
- **Regole**: attribuire **solo dove c'è un vero controllo** di correttezza (ascolto passivo/copione →
  niente); orale fuzzy (shadowing) → credito **piccolo, solo positivo** (il mic sbaglia, non penalizzare),
  su `phrase:`/parole chiave; Q&A discreta (keigo/iikae/particelle/riordina) → stesso delta del quiz (+4/−6).
- Aggancio **incrementale**: ogni gioco/avventura una riga alla volta, partendo da quelli che hanno già
  il punto atomico + entità (keigo, particelle, iikae, riordina, decision-point avventure, shadowing).

### Blocco B — Bug e correzioni dati (intercalabili tra le fasi di A)
Da `2026-07-15-note-utente-quiz-e-dati.md`:
- **B1** — ✅ VERIFICATO CHIUSO (17/07): `applicableFacets` dà `facet_form_read` solo se
  `scrittura !== lettura`, doppia guardia in `pickWordMode` e in `buildWordQuestions` (consolida).
  I full-kana (くれる, それほど) non ricevono mai reading-recognition. Nessun call site scoperto.
- **B2** — ✅ mitigato: `createConjugationQuizQuestion` toglie le desinenze esplicite dal
  `formLabel` (`.replace` di 〜… tra parentesi). Le glosse «fare:» ambigue sono già gestite.
- **B3** — correzioni dati negli **overrides**: 都合↔便利 sinonimi, 申し上げる come keigo.
  ⚠️ Territorio insegnante (都合≠便利 come sinonimi è dubbio): lasciato al collaudo insegnante virtuale.
- **B4** — **spezzare 回る、回す** (16/07): voce unica dalla fonte (allenlu2009), in realtà due verbi
  (coppia 自/他!) con lettura doppia e transitività errata. Serve un passo di pipeline (split a prova
  di sync, gli overrides non aggiungono/rimuovono voci) + fix del seed committato + cross-link
  `id_verbo_corrispondente`. Unico caso rotto: le altre 19 voci combinate (con `;`) sono varianti
  legittime della stessa parola. Attenzione alla riga SRS orfana `word:回る、回す`.
- ❓ In sospeso (da chiarire con l'utente): 出発 sinonimo N4, 親切, sinonimo di 例, 壁 con kanji N1.

### Blocco C — Nuove modalità quiz (dopo A5/A6, riusano coniugazione/consolida)
- **C1** — cloze sui verbi coniugati (non solo particelle) (idea #2).
- **C2** — coniugazione kanji+lettura insieme / label meno rivelanti (idee #3, bug B2).
- **C3** — «prove d'uso» della parola nel quiz vero (idea #5).
- **C4** — composizione carattere-per-carattere per parole consolidate (idea #4).

### Blocco D — Completare i dialoghi (piano 28 giu, parti mancanti)
- **D1** — auto-link kanji (`extractKanji` all'import).
- **D2** — navigazione arricchita tra concetti in `detail`.
- **D3** — condivisione senza backend: export bundle + import da URL.
- **D4** — **kanji nel vocabolario** (16/07, deciso: NON pagina a parte): i kanji ora sono nel
  vocabolario `/consolida` con chip filtro `漢 Kanji` (riga → scheda `kanji:` + drill), riusando
  ricerca/livello/scroll. Fatto. Badge `漢` unificato (era `字` in punti-deboli). ✅
  - Correzione dati collegata: 5 interiezioni (ああ/いいえ/ええ/さあ/じゃあ) da `その他` catch-all a
    `感動詞`/`接続詞` (badge e filtro vocabolario); icone+tooltip per `感動詞`/`助動詞`. ✅

### Blocco E — Caricamento lezioni insegnante (feature grande)
Si appoggia su corsi + D3. **Da progettare prima**: flusso semplice per non-tecnici
(l'insegnante non scrive JSON a mano). Richiede discussione sull'approccio.

### Migliorie segnate (16/07, da fare poi)
- **Domande propedeutiche curate (17/07, mandato per l'insegnante-agente)**: vagliare quiz e
  parole per proporre FRASI e DOMANDE propedeutiche da inserire per forme, coppie 自/他,
  particelle, coniugazioni. Esempio tipico: completare una frase con un verbo dove DAL CONTESTO
  si capisce se ci va il transitivo, l'intransitivo, il keigo e di che tipo (礼儀: chi parla a
  chi). Output atteso: set curato di frasi/domande in formato pronto da fondere (overrides o
  dataset dedicato tipo iikae-n5n4.json), che i generatori possano pescare invece delle frasi
  generiche.
- **Correlati ≠ sinonimi (17/07)**: serve una relazione «correlati» distinta dai sinonimi, per le
  parole legate ma non interscambiabili — es. la coppia 妻 (mia moglie) ↔ 奥さん (moglie altrui),
  oggi NON collegate perché non sono sinonimi; idem 息子/息子さん ecc. Le correlazioni "sbagliate
  come sinonimi" della famiglia vanno preservate come correlati, non perse. Richiede: campo
  `correlati` su Word (opzionale), sezione nella scheda, curatela dell'insegnante per popolare.
- **Feedback test utente (17/07)**:
  - Particelle: domande **propedeutiche mirate agli usi** (frasi apposta per esercitare la
    sostituzione, non solo cloze da frasi generiche); casi ambigui (は/が/も…) da far vagliare
    all'insegnante-agente — il generatore audit c'è, gli agenti erano bloccati da 529/limite.
  - **Avverbi (副詞)**: anche loro vorrebbero una "conoscenza" allenabile (oggi nessun drill di
    classe per gli avverbi).
  - **Choukai/trappole: copione finale ricco** — ascoltare le singole frasi, vedere le risposte
    giuste e il perché.
  - ✅ (17/07) **Frasi d'aeroporto fuori dal vocabolario**: le 11 frasi-domanda 慣用表現
    rimosse da idioms/seed (v61), coperte dalla situazione «In aeroporto» di Frasi utili
    (aggiunte le 3 mancanti: 申告するものはありません, 機内持ち込み, 宅急便はどこですか).
    Nuovo `applySeedMigrations` al refresh del seed: elimina dai dispositivi le voci
    rinominate/fuse/rimosse (bulkPut non rimuove) e migra il progresso SRS al successore —
    copre anche gli orfani storici 下る/落る/落す/楽む/うかがう/回る、回す.
- **Piano di oggi: sistema di completamento** — le voci del piano (ripassi, punti deboli, attività
  del giorno) dovrebbero segnarsi come fatte/spuntabili durante la giornata, non restare link statici.
- **Gioco forme derivate/composte (17/07, idea utente)**: coniugare passivo, potenziale, たい,
  ている e forme composte in catena per capire come si costruiscono frasi complesse (es.
  食べる→食べられる→食べられたくない). Un gioco dedicato, non domande a secco nel quiz.
- **Osservazioni 17/07 (utente, da analizzare/applicare):**
  - ✅ (17/07) **RSVP: peso dei kanji** — tempo di esposizione pesato per carattere
    (kanji 2.2x, punteggiatura 0.4x), cpm nominale invariato; guida aggiornata.
  - ✅ (17/07) **Rinominato «Gioca e vivi» → «Attività»** (home + guida + CLAUDE.md).
  - **Nuova attività: lettura ad alta voce assistita** — testo con furigana attivabili, poi
    tolti; progressione con furigana → senza → mic. Si aggancia al toggle furigana pianificato.
  - **Nuova attività: dettato da ascolto** — ascolti un testo (tutto o una parte selezionata)
    e lo ricomponi/scrivi; allena Forma scritta·P + ascolto insieme (cella oggi scoperta),
    riusando il banco token della composizione.
  - **Insegnante virtuale di collaudo (per dopo)**: far testare l'app a un agente-insegnante
    madrelingua, SOLO su domande/contenuti/relazioni (niente UI, per risparmiare token);
    output = note e correzioni da applicare, come i report di curatela già fatti.
- **Microfono: permessi e degradazione (16/07)** — su http non-localhost (dev via IP LAN) l'API
  non esiste (serve secure context) e il tap sul mic in frasi utili «si chiude e dà errore».
  Da fare: 1) `navigator.permissions.query({name:'microphone'})` per distinguere prompt/negato/
  non-disponibile; 2) messaggio chiaro per caso (negato → come riabilitare nel browser; contesto
  non sicuro → usa https/localhost); 3) mai crash: try/catch attorno a `listenJapanese` con
  fallback ai bottoni (convenzione già prevista); 4) `speechAvailable()` deve controllare anche
  `window.isSecureContext`.
- **Furigana attivabili (toggle globale)** — ✅ fase 1 (17/07): setting «Mostra i furigana» in
  Impostazioni (default ON), `FuriganaText` rende ruby o testo piano (con escape `force` per i
  contesti dove la lettura è il contenuto). Copre dove la notazione 漢字[よみ] già esiste
  (dialoghi, /forme, /forme-composte, /particelle). Fase 2
  (dati): annotare le frasi d'esempio delle parole riusando il matcher frase→parole del pipeline
  (tokenizer + verifica coniugazione); mai furigana indovinata da letture ON/kun ambigue.

### Blocco F — Ripasso attivo dei punti deboli + leech (deciso 16/07, da progettare)
Nasce da: «consolida singolo non fa quasi nulla» + «serve un modo per rimandare ciò che non entra».
- **F1 — "Ripasso punti deboli"** ✅ (16/07): modalità del quiz vero, `/quiz?deboli=1` — stessa UI
  (risposte inline, audio, Approfondisci, timer), coda dai punti deboli (vive nella sessione),
  punteggio solo-pratica (mastery, no stage/XP). `conj:`/`particella:` via parole portatrici, il
  crediting torna alla classe dal dispatch A1/A2. CTA in `/punti-deboli`. Quando arriverà A4, la
  scelta del modo userà la **sfaccettatura debole** dell'item (già previsto dal design).
  In più (16/07): voci punti-deboli → pagina/scheda dell'elemento (non più drill); scroll robusto
  alle àncore di particelle/forme/contatori; guardia beforeNavigate sul quiz (Indietro chiede
  conferma, Approfondisci resta libero); controlli sessione con colori semantici + emoji VS16.
- **F2 — leech (seppellisci / rimanda).** Concetto SRS consolidato (Anki: suspend dopo N lapse;
  SuperMemo: leech = item mal formulato o interferenza → riformulare/aggiungere contesto).
  - **Rimanda** (snooze): spinge `next_review_date`, resta in rotazione più rado.
  - **Seppellisci** (suspend): fuori dalla rotazione attiva finché non rievocato (o auto-revival dopo
    molto / dopo aver imparato gli item che interferiscono).
  - **Twist facet**: seppellire la **singola sfaccettatura** leech (non sai *produrre* ma *riconosci*),
    non l'intera parola — abilitato dal tracciamento per-cella. Verificare i meccanismi pausa/suspend
    già esistenti (`isPlanKey`/attivi) prima di aggiungerne.
- **Sede UI decisa (16/07)**: i pulsanti «La so già» (F3), «Seppellisci» e «Rimanda» (F2) vanno
  nella card **Memorizzazione** della scheda parola (dove ora stanno barra SRS + radar).
- **F3 — «La so già»** (idea 16/07): l'altra faccia del leech — l'utente ha basi pregresse, oggi ogni
  carta parte da stage 0 (8 stage di ripassi anche per parole note da anni; post-reset 1400 carte
  "nuove"). Bottone «✓ La so già»: 1) nel quiz all'introduzione di una carta mai vista, 2) nella
  scheda dettaglio, 3) eventualmente riga vocabolario (triage di massa). Effetto: stage → 5 (~7g),
  mastery +60, niente XP, NON consuma il budget carte-nuove. Non stage 7: un ripasso ogni tanto
  verifica la pretesa; se poi sbagli scende normalmente (autocorrezione). Con A4: alza la base, le
  sfaccettature (parlato, scrittura…) restano da dimostrare.
