# Piano unificato Renkei — stato e task futuri

Roadmap operativa. Per il design stabile delle sfaccettature (teoria, tassonomia, pattern)
vedi `architettura-sfaccettature.md` — non ripetuto qui. Piani storici assorbiti in `archivio/`.

Ogni item si consegna da solo (feature → check → build → test → **staging** → verifica →
**prod**), una cosa alla volta.

## Regola di consegna (staging PRIMA di prod)

Per OGNI item, prima del rilascio:
1. `npm run check` + `npm run build` puliti (0 errori/warning); test vitest se tocca engine/dati.
2. `npm run deploy:staging` → verifica su `/renkei/staging/` (DB isolato, nessun rischio per lo stabile).
3. Solo dopo l'OK: `npm run release` (prod) → `gh run list` conclusion `success`
   (se Pages fallisce in modo transitorio: `npm run deploy`).
4. Commit SOLO a nome utente (`--author="Lorenzo Natali <offtherailz@gmail.com>"`), mai Co-Authored.

---

## Stato attuale (17/07/2026 — handoff di sessione)

**FATTO (commit su main, staging deployato con tutto, PROD MAI deployata in questa sessione):**
- Blocco A completo (punteggio quiz per classe/particella/contatore, sfaccettature Nation,
  drill consolida, spoken-production) — dettaglio in `architettura-sfaccettature.md`.
- `gram:*` per costruzioni: credito da conjugation/verb-form-cloze/frasi curate, drill
  `/consolida/gram:<slug>` (funziona anche senza formKey, es. tsumori/hou-ga-ii).
- Blocco F: F1 (ripasso deboli nel quiz vero), F2/F3 (La so già/Rimanda/Seppellisci).
- Giochi/avventure → `recordPractice(entità, esito, cella)` generalizzato.
- **63 domande curate** (poi 81 con le 18 aggiunte forma-contesto) in
  `src/lib/data/propedeutiche-n5n4.json` + `propedeutiche.ts`: tutte agganciate a
  parola-carta/gram, consumate da quiz specials, consolida, gioco /keigo, drill gram.
- Relazioni: **`correlati`** (legati, non interscambiabili — 妻↔奥さん, keigo↔piano) e
  **`parafrasi`** (「significato simile」 言い換え, equivalenti di frase) distinte dai
  sinonimi veri. Curatela insegnante applicata: 229 voci N5+N4 vagliate (deittici, keigo,
  contrasti classici → correlati; nonsense rimossi).
- 20 parole nuove + partner 自/他 collegati bidirezionali; frasi-aeroporto tolte dal mazzo
  SRS (Frasi utili); `applySeedMigrations` per pulire i dispositivi da voci rinominate/rimosse.
- Pagine annidate `/forme/[slug]` (indice snello + scheda esaustiva, componente `FormCard`).
- RSVP lettura veloce pesato per kanji (2.2x); toggle furigana globale (fase 1); rename
  «Gioca e vivi» → «Attività».
- **Due nuove attività beta**: 📢 Leggi a voce (`/leggi-a-voce`), ✍️ Dettato (`/dettato`).
- Strumenti: `scripts/teacher-digest.mjs` (shortlist compatte per curatela senza rileggere
  il seed), simulatore SRS multi-giorno (`srsSimulation.test.ts`), avanza-giorno in-app
  (`?dev=1` in Impostazioni).
- Bug: B1 (くれる full-kana) verificato chiuso, B2 (formLabel rivelante) mitigato, B4
  (回る/回す split) fatto.

Seed a **v67** (nessun bump in questa sessione). Ultimo deploy staging: `15af809`.
**PROD MAI deployata.**

---

## Sessione 18/07 — 2° blocco (tutto su staging, PROD MAI)

**FATTO (commit su main):**
- 🎚️ **Avverbi** (`/avverbi`), 👂 **Choukai «perché»** + «▶️ Tutto il dialogo»,
  🧬 **Catena** frasi d'esempio + catene 使役/受身.
- ⚖️ **Comparazioni** (`/comparazioni`, beta): 4 round (どっち/一番/componi/ほど〜ない),
  dati curati `src/lib/data/comparazioni.json`, credito facet_use aggettivo, **mini-guida**
  linkata `/comparazioni/guida`.
- **`TokenCompose`** (`src/lib/components/TokenCompose.svelte`): banco↔risposta con tap +
  **drag&drop pointer-based** (touch ok). Usato da Comparazioni e dalla composizione di
  `/consolida`. **NON** ancora migrati `/dettato`, `/riordina`, quiz (era il task 2b).
- `/consolida`: composizione col riquadro TokenCompose; a fine domanda-**frase** mostra la
  frase (cliccabile) + 🔊 + significato e la **legge in automatico**; frase col buco visibile
  **prima** della risposta anche per usage/verb-form-cloze (fix `promptOf`); forma richiesta
  della coniugazione in **chip evidenziato**.
- **SRS «Studia una volta al giorno»** (default ON): dopo una risposta giusta il ripasso che
  cadrebbe oggi slitta a domani (`applySrsReview` clamp); sbagliate a +8 min. Toggle in
  Impostazioni + step onboarding «Come vuoi studiare?»; home coerente.
- Fix: audio delle **domande di ascolto parte subito** (defer 150ms, tutti i rami);
  conteggio ripassi home conta solo carte **generabili**; **Lessico extra** in pausa di default.

**RESTA APERTO da questa sessione:**
- 🔲 **Bug conteggio ripassi**: l'utente vede ancora «1 in attesa + 1 in pausa» poi «tutto
  fatto». Il fix generabilità non basta. **Serve il bundle esportato** per diagnosi con
  `scratchpad/diag-due.mjs` (il bundle NON include obiettivi/contatori/settings).
- ✅ (24/07) **Task 2b**: `/dettato`, `/riordina` e il quiz (sentence-ordering + composition)
  migrati a `TokenCompose` (dedup + drag&drop ovunque, stili locali rimossi).
- ✅ (24/07) **Fix**: barra comandi quiz (🔊/⏹️) anche sulla scheda di presentazione
  carta nuova; timer di sessione congelato mentre la scheda è aperta (proceedFromIntro
  recupera la pausa).
- ✅ (24/07) **Modalità permesso/obbligo — strati 1+3**: catalogo `GRAMMAR_FORMS` +
  3 costruzioni (te-mo-ii 🆗, te-wa-ikenai 🚫, nakute-mo-ii 😌; schede, drill gram:*,
  correlati incrociati con nakereba, contrazione ちゃだめ) e **Relazioni**: tema
  `permission` in ogni scenario (registro × modalità: てもいいですか conoscente,
  返さなきゃだめだよ amico, てもよろしいでしょうか capo), campo `gram` su
  ThemeBank/Turn, credito `recordPractice('gram:'+slug, esito)`.
- 🔲 **Strato 2 (quando capita)**: catene /catena per modalità — て→てもいい,
  て→てはいけない, ない→なければならない→なきゃ (contrazione come passo).
- ✅ (25/07) **Cinture giochi** (richiesta utente «domare tutti i giochi»):
  `gameBelts.ts` (bianca→nera+dan su {partite, pulite}, criteri per-gioco da
  insegnante), `recordGameResult` in 15 giochi, toast globale (layout+appState),
  UI /giochi (banner X/15, chip cintura), guida+ARCHITECTURE.
- ✅ (25/07) **Sblocchi ridisegnati su feedback utente** (2 giri): via il percorso
  a catena → `gameUnlocks.ts`, solo filiera tempo, regola «domato» (gialla 3
  partite o arancione 1 pulita): Ore+Minuti→Che ore sono?→Ascolta l'ora;
  Giorni→Ascolta la data; entrambe→Data e ora (listen-appt RINOMINATO);
  +Dì la data→Prendi appuntamento; Misto con tutta la sezione. «Ascolta la
  data/l'ora» = giochi nuovi (generateAppointment(part)). Requisito esplicito
  col progresso sulla card velata, sempre provabile 👀.
- ✅ (25/07) **Cinture v2**: scala karate completa (+viola), dan fino a 十段 👑
  Gran Maestro, cinture DISEGNATE (BeltIcon.svelte + token --belt-* in app.css),
  cinture anche sui giochi in-page (registerResult → recordGameResult, 30 giochi).
  Sezioni /giochi riorganizzate: «Numeri e tempo» (con Scrivi il numero),
  «Parla» (Dì la data, Leggi a voce, Shadowing), «Grammatica e parole» +
  «Lettura» (split di «Lettura e frasi»), Dettato in «Ascolta e agisci».
- ✅ (25/07) **Fix leggi-a-voce**: ほうがいい trascritto 方がいい dal riconoscitore
  ora combacia; diff sul candidato giusto.
- ✅ (25/07) **Cinture v3 — dan seri e Gran Maestro rosso**: contatore `epic`
  (imprese: serie ≥12, 0 errori, choukai senza riascolti, accordo ≤3 turni,
  Relazioni scenario capo), dan con doppio requisito (三段 20+1 … 九段 50+8,
  十段 60+10 = 👑 Gran Maestro con CINTURA ROSSA, beltVisual/token --belt-rossa),
  toast ⚡, nextDanHint sulla card. Banner /giochi asciutto con link a
  /guida#cinture: sezione dedicata con disegni BeltIcon, scala completa,
  criteri pulita/impresa, filiera sblocchi.
- ✅ (30/07) **Vetrina cinture in /stats**: un chip per gioco (icona gioco +
  `BeltIcon` + dan) per ogni gioco con almeno l'arancione, ordinati dal più
  avanzato, con l'hint di cosa manca al prossimo traguardo (`nextDanHint` ??
  `nextBeltHint`) e link al gioco (route propria se ce l'ha, altrimenti
  /giochi). Riepilogo «N/32 giochi domati» (`conqueredCount()`).
- 🔲 **Cinture — seguiti ancora possibili**: badge nel profilo (`badge_sbloccati`)
  alla nera/sblocchi (persisterebbe nei backup; oggi tutto in localStorage);
  migrare i record locali di riordina/skimming a gameScores.
- ✅ (25/07) **Fix bug**: nei giochi in-page di /giochi, dopo aver giocato un
  gioco a scelta multipla (read/greet/order) e passare a listen/shop/appt/
  shopping, `picked` restava non-null e bloccava silenziosamente `onTimeout()`
  (il timer scadeva ma non succedeva nulla). Fix: `picked = null` in `start()`.
- ✅ (25/07) **Catalogo — sfumature d'incertezza**: 5 costruzioni nuove
  (らしい, みたい, っぽい, に違いない; かも come contrazione di かもしれない),
  related incrociati con でしょう/かもしれない/かな/はず/そう.
- ✅ (25/07) **都合↔便利 correlati** (falsi amici, non sinonimi): overrides +
  seed patchati direttamente (comportamento identico al merge shallow dello
  script sync), SEED_REVISION → v70.
- ✅ (25/07) **Nuovo gioco 🎲 Quanto sei sicuro?** (beta, `/certezza`):
  9 situazioni curate, stessa frase base con 4 costruzioni (でしょう/
  かもしれない/かな/はず/そう/らしい/みたい/っぽい/に違いない), il contesto
  fissa quale ci vuole; 💡 Aiuto a 3 costi, credito gram:<slug>. Sezione
  «Al konbini» assorbita dentro «Conversazione» (richiesta utente).
- ✅ (25/07) **Rifiniture /giochi** (feedback utente): 🎲 Misto spostato in
  fondo alla sezione «Numeri e tempo» (prima era in mezzo, dentro il loop
  READ_GAMES — ora card a parte dopo Ascolta data e ora, MIX_GAME costante);
  «Data e ora» rinominato **«Ascolta data e ora»** ovunque (è un ascolto,
  coerenza con Ascolta la data/l'ora).
- ✅ (25/07) **Fix Aiuto in /certezza**: `showReason` impostato ma mai letto
  da nessun blocco — il bottone non faceva nulla. Ora rivela il `summary`
  della costruzione giusta dal catalogo prima di rispondere (senza dire
  quale bottone è).
- ✅ (25/07) **Misto esteso a tutta la sezione** (era solo le 6 letture):
  `MIX_POOL`/`newMixRound()` pescano anche Scrivi il numero e i 3 ascolti
  data/ora; `mixSub` sceglie la UI del round mentre punteggio/cintura
  restano fissi su `read-mix`. `onTimeout`/`checkAppt`/i 3 blocchi template
  aggiornati per riconoscere il sub-round attivo.
- ✅ (25/07) **Fix reattività cinture** (bug segnalato: «ho guadagnato la
  cintura bianca anche se il gioco non era sbloccato» → in realtà i
  prerequisiti erano già soddisfatti da test precedenti, ma il badge 🔒
  restava stale non essendo agganciato a nessuno $state): aggiunto
  `appState.beltProgressVersion`, bump a ogni `recordGameResult`, letto da
  `unlockedNow`/`conqueredCountNow`/`beltChip` per forzare il ricalcolo
  live invece di aspettare un re-render casuale.
- ✅ (25/07) **Fix voce nei giochi a contatore** (bug segnalato: よんにち/ごにち
  accettati per i giorni del mese): `writtenVariants()` in /giochi accettava
  ciecamente la forma scritta del prompt (4日/4時/3分) come prova di pronuncia
  corretta — ma il riconoscitore normalizza QUALUNQUE lettura, giusta o
  regolarizzata-sbagliata (proprio il distrattore apposta generato da
  counterGen.ts per 日/時/分/円 e per generateClockReading), nella stessa
  forma scritta. Tolto il bypass per questi 5 casi (falso negativo innocuo,
  mai penalizzato, meglio di un falso positivo che convalida la lettura
  sbagliata); tenuto SOLO per «Conta gli oggetti» dove i distrattori sono
  contatori diversi (testo diverso, nessuna ambiguità).
- ✅ (25/07) **Fix race mic fra un giro e l'altro**: `speakReadGame`/
  `speakGreetGame` non controllavano `qGen` dopo l'attesa di `listenJapanese()`
  — se il round cambiava mentre il microfono ascoltava (nuova domanda,
  picked/question freschi), la valutazione tardiva poteva finire sul round
  sbagliato («segna come errore la frase precedente»). Aggiunta la stessa
  guardia `myGen !== qGen` già usata da `armAfterAudio` per l'audio TTS.
- ✅ (25/07) **Cinture v4 (feedback utente)**: sblocco da ALMENO l'arancione
  (non serve più la gialla); dan ricamato in oro sulla cintura nera/rossa
  (BeltIcon prop `dan`, font mincho/serif); testi «domare» sostituiti.
- ✅ (25/07) **Sblocchi giochi**: card velata scrive il requisito
  (`unlockHint`); il gioco resta SEMPRE giocabile (niente vero blocco).
  Easter egg «7 tap veloci» (`tapLocked` in /giochi): fa partire quella
  singola partita ma NON sblocca la card e NON fa guadagnare cintura per
  quella run (niente `forceUnlock`/persistenza — rimosso dopo il giro
  precedente che invece rendeva lo sblocco permanente: l'utente voleva
  "gioca comunque, senza cinture e senza sbloccarlo").
- ✅ (25/07) **Fix voce «6だい» per contatore 台** (bug segnalato: «rokudai» per
  6 macchine dava errore in Conta gli oggetti): 台 mancava da `KANA_UNIT` in
  speech.ts; aggiunta anche `digitKanaUnitToWritten()` per la forma ibrida
  cifra-araba+contatore-kana (es. «6だい»→«6台», comune nel riconoscitore),
  generale per tutti i contatori di `KANA_UNIT` non solo 台.
- ✅ (25/07) **Coppie difficili — 10 coppie 自動詞/他動詞 nuove** (idea utente):
  開く/開ける, 消える/消す, 閉まる/閉める, 入る/入れる, 落ちる/落とす,
  倒れる/倒す, 壊れる/壊す, 始まる/始める, 上がる/上げる, 決まる/決める
  (si aggiungono a 見つかる/見つける già presente). Test `coppie.test.ts`.
- ✅ (25/07) **Frasi parallele 自動詞/他動詞** (idea utente, "la duplicazione è
  inutile" → Opzione B): per le 41 coppie `id_verbo_corrispondente` del seed,
  UNA frase nuova a testa scritta apposta in coppia (stessa scena, lato
  spontaneo vs lato con agente), vive una sola volta in `frasi_esempio`
  (seed+overrides, 10 verbi senza override proprio creati da zero) e si
  riusa da sola su scheda (`/detail`) e quiz vero (`transitivity-pair` pesca
  già da `frasi_esempio`); in **Coppie difficili** il reveal mostra ora le
  frasi vere quando i due lati sono partner reciproci veri (controllo
  `id_verbo_corrispondente` esplicito, mai a caso) via `db.words.get(id)`
  diretto (non `findWord` per scrittura: ambiguo per id con disambiguatore,
  es. 開く-あく vs 開く-ひらく). SEED_REVISION → v71.
- ✅ (25/07) **Fix cinture — uscire con serie viva non assegnava nulla**
  (bug segnalato: serie da 12 su "giorni", uscito con indietro/Esci → nessuna
  cintura; tornato → solo bianca). `quitInternal()` chiamava `submitScore`
  ma MAI `recordGameResult`: la cintura si registrava solo alla prima
  risposta sbagliata (`registerResult`), mai per un'uscita volontaria.
  Ora `quitInternal()` accredita la cintura con la stessa serie raggiunta
  (pulita ≥5, impresa ≥12), rispettando anche il trucco 7-tap.
- ✅ (25/07) **Fix dati どうやって**: prima frase con traduzione IT copiata
  dall'inglese ("How do you get to the station?" invece di "Come si arriva
  alla stazione?") — corretta in overrides+seed. SEED_REVISION v72.
- ✅ (25/07) **Fix /lettura — velocità sempre variata**: «⚡ Rileggilo a +20%»
  ripeteva lo STESSO testo instanziato (stessi slot) solo più veloce —
  allenava a ricordare, non a leggere (segnalato dall'utente). Ora
  ri-istanzia il testo (`instantiate(run.text)`) come già fa «Stesso testo
  (varia)»: aumentare la velocità varia sempre il contenuto.
- ✅ (25/07) **Fix voce ore — bug più a fondo** (bug segnalato: «se pronuncio
  なな時 mi accetta anche nanaji»): il problema NON era in `writtenVariants`
  (già sistemato) ma dentro `kanaNumeralsToWritten` stessa — convertiva SIA
  しちじ (giusta) SIA ななじ (distrattore "regolare" apposta di counterGen.ts)
  nella stessa forma "7時", collassandole nel confronto normalizzato. Aggiunta
  `HOUR_WRONG_ATOMS`: よん/なな/きゅう non si convertono più quando l'unità è
  時 (じ), restano testo diverso e vengono respinte. Anche omofono segnalato
  くじ→工事 («lavori», stessa lettura): aggiunto come variante sicura in
  writtenVariants (non riapre il bug, 工事 non è lettura alternativa di
  nessun'altra ora).
- ✅ (25/07) **Fix voce minuti contratti** (bug segnalato: 8分/36分 pronunciati
  giusti — はっぷん/さんじゅうろっぷん — non riconosciuti): `KANA_DIGIT`/
  `KANA_NUM_ATOM` in speech.ts non avevano le forme con 促音 じゅっ/ろっ/はっ/
  いっ (10/6/8/1 davanti a ふん/ぷん) — restavano testo kana mai convertito
  in cifra, mai convergente con la trascrizione del riconoscitore.
- ✅ (25/07) **Fix voce distorta nei dialoghi** (bug segnalato in Mani libere):
  `speakDialogue` (tts.ts, condivisa da choukai/ascolto/mani-libere) alzava
  il pitch del +35% per differenziare i personaggi quando c'è una sola voce
  JP — troppo aggressivo, suonava robotico. Portato alla scala di
  `voiceParams()` (max ±18%): ora alterna 1 / 0.88, mai verso l'alto.
- ✅ (25/07) **Fix cinture — uscita anticipata da shadowing/leggi-a-voce**
  (bug segnalato): come /giochi, il link «← Giochi» era un semplice `<a>`
  senza handler — uscire a metà non registrava mai la cintura, solo a fine
  sessione. Aggiunto `onclick` che accredita la serie/punteggio raggiunto
  finora prima di navigare (shadowing: streak `best`; leggi-a-voce: score
  sui round DAVVERO tentati, non sul totale previsto).
- ✅ (25/07) **Test sistematici voce contatori** (richiesta utente, non a
  campione): `speechCounters.test.ts` itera OGNI valore 日(1-31)/時(1-12)/
  分(1-59) coi generatori veri di counterGen.ts, verificando che il
  distrattore "regolare" di ognuno non converga MAI con la lettura giusta.
  Ha scovato 2 bug nuovi (utente aveva ragione, "troppo permissivo"):
  (1) minuti — ふん/ぷん collassavano entrambi su 分 senza controllare quale
  rendaku è quello giusto per la cifra (24分=にじゅうよんぷん accettava anche
  にじゅうよんふん sbagliato) → `MINUTE_SUFFIX_BY_ONES`, stesso fix anche in
  `digitKanaUnitToWritten`; (2) giorni nativi — `NATIVE_DAYS` in speech.ts
  era disallineata da `IRREGULAR_DAYS` di counterGen.ts (mancavano 14/24) e
  Xにち non era bloccata per i 13 giorni a lettura nativa esclusiva →
  `DAY_NATIVE_ONLY` blocca la conversione regolare per questi.
- ✅ (25/07) **Audit uscite — tutti i 16 giochi con cintura propria**
  (richiesta utente «verifica che le vie di uscita siano sempre seguite
  dall'opportuna ricompensa»): stesso bug di shadowing/leggi-a-voce su
  avverbi, catena, contrazioni, coppie, dettato, di-la-data, iikae, keigo,
  comparazioni, certezza, choukai, riordina, appuntamento, relazioni —
  `leaveEarly()` per tipo (round fissi: valuta su round tentati finora;
  serie infinita: streak/best corrente; negoziazione aperta: solo partita,
  niente clean/epic parziale). Dettaglio in ARCHITECTURE.md.
- ✅ (25/07) **Imprese multiple da serie lunghissime** (idea utente: «se la
  sai avanzi più veloce», senza scavalcare la ripetibilità dei dan):
  `epicStepsForStreak()` in gameBelts.ts (0 sotto 12, 1 a 12, +1 ogni 13 in
  più); `recordGameResult` accetta `epic: boolean | number`. Solo su
  riordina/shadowing (serie infinita — gli altri hanno round troppo corti).
- ✅ (27/07) **Nuovo gioco «↔️ Transitivo o intransitivo?»** (`/transitivi`,
  idea utente): frase vera col buco al posto del verbo, gemello della coppia
  sempre tra le scelte (stessa forma coniugata), indizio が/を. Riusa
  `createTransitivityPairQuestion` del quiz principale ma pesca solo tra le
  coppie 自動詞/他動詞 curate; la funzione ora prova tutte le frasi
  d'esempio (non solo la prima), portando la copertura a 53 round su 35
  coppie. Round fissi (8), cintura anche su uscita anticipata. Card in
  /giochi (Grammatica e parole) + voce in /guida.
- ✅ (28/07) **Corsi: note in markdown + risorse + esercizi collegati** (idea
  esplorata con l'utente per un possibile uso scolastico — vedi
  `~/.claude/plans/virtual-crunching-piglet.md`): il campo `note` di ogni
  lezione (già salvato all'import ma mai mostrato) ora si vede in
  `/courses`, sempre visibile in ogni lezione (markdown minimale scritto
  ad-hoc in `courseMarkdown.ts`, nessuna dipendenza nuova). Nuovo campo
  opzionale `risorse` per lezione (immagini/documenti/link, validato contro
  `javascript:`). Nuovo bottone «🎯 Esercitati su questa lezione» (attiva
  l'obiettivo e apre `/quiz`); nota onesta che i giochi pescano già da tutto
  il vocabolario, non serve attivare la lezione per giocarci. Corso demo
  (`corso-esempio.json`, tema Kyoto) creato per provare il formato, poi
  RIMOSSO lo stesso giorno: l'utente ha notato che le parole aggiunte via
  corso non hanno l'arricchimento relazionale del catalogo curato, e che le
  frasi d'esempio del catalogo (calibrate su livello JLPT, non su sequenza
  didattica) possono rompere la progressione di un corso vero — confermato
  che serve un'app dedicata (Ramo C) con contenuto scritto apposta per
  lezione, non il riuso diretto del catalogo N5/N4 di Renkei.
- ✅ (29/07) **Fix 3 test falliti (pre-esistenti, trovati inizio sessione)**:
  変わる aveva "E-mail" in latino nella frase + IT=EN non tradotto (fix:
  メール, traduzione italiana vera); 見る usava 観る invece di 見る/みる
  nell'esempio, e un'altra sua frase aveva traduzione IT sbagliata (parlava
  d'altro); iikae.test.ts falliva per un bug nel TEST stesso (内/うち sono
  omofoni, la lettura di 内 sovrascriveva nella mappa di lookup la voce
  scrittura=うち — corretto dando priorità a scrittura su lettura) più una
  voce dati (`['あした','明日']`, un gruppo iikae che accoppiava un'unica
  parola con sé stessa — rimossa, zero item quiz la referenziavano).
- ✅ (30/07) **879 traduzioni IT completate** (725 parole + 154 grammatica,
  audit 29/07) — tutte tradotte dal giapponese in 9 lotti nella sessione del
  30/07, verificate a ogni lotto con `npx vitest run src/lib/data/
  overrides.test.ts` (588 test totali verdi). Trovati e sistemati una decina
  di bug collegati (mismatch parola/esempio, numeri in cifre invece che nel
  kanji del contatore, punteggiatura rotta, frasi segnaposto sulle forme
  verbali). Causa radice RISOLTA lo stesso giorno: `sync-open-source-seed.mjs`
  aveva due punti (parole da JMdict, grammatica da jlpt-grammar-api) che
  copiavano l'inglese anche in `it` — ora mettono `it: ""`, con fallback su
  `en` in UI (`pickLocalizedText`) ma distinguibile per una prossima
  curatela. Dettaglio in ARCHITECTURE.md e
  `plans/2026-07-29-traduzioni-it-en-identiche.md`. SEED_REVISION v83.
- ✅ (29/07) **Mani libere: fix comando che ruba la risposta + comando 「わかりません」**
  (bug + idea utente): `classifyUtterance` ora ignora, per il round corrente,
  i trigger di comando contenuti nella frase corretta (es. もう一度 in «può
  ripetere?» non fa più scattare il comando "ripeti" invece di essere
  giudicata risposta). Nuovo comando 「わかりません」/「わからない」: legge la
  spiegazione (`quando`, registro/uso) della frase, poi ripete il prompt.
  Dettaglio in ARCHITECTURE.md.
- ✅ (29/07) **Aeroporto: tolte 4 frasi di nicchia** (feedback utente: «troppo
  difficili, non ci sono agganci con le altre cose») — Wi-Fi router, dogana,
  spedizione bagagli: vocabolario isolato, non riusato altrove nel catalogo.
  Restano le 7 frasi essenziali (gate, check-in, ritiro bagagli, turismo,
  passaporto, imbarcare, portare in cabina).
- ✅ (29/07) **Cap carte nuove/giorno: 20 → 10 default** (feedback utente: i
  ripassi si accumulano) — `DEFAULT_NEW_CARDS_PER_DAY` in `dailyNewCards.ts`,
  configurabile in Impostazioni. I ripassi già dovuti restano sempre
  illimitati (non è questo il lever, ma introdurre meno carte nuove al
  giorno rallenta la crescita del debito).
- ✅ (30/07) **Uscita anticipata: pulita gratis con 1 solo round** (bug
  trovato indagando un'impresa "troppo facile" in Dì la data): `score >=
  attempted - 1` con `attempted=1` è sempre vero. Fix condiviso in
  gameBelts.ts (`cleanOnEarlyExit`/`epicOnEarlyExit`, minimo 3 round
  tentati), applicato a 12 giochi. Dì la data: aggiunto record mancante
  (getHighscore/submitScore) e impresa ora richiede anche il primo tentativo
  giusto su ogni round (coi ritenti illimitati, "tutto giusto" da solo era
  banale). Dettaglio in ARCHITECTURE.md.
- ✅ (30/07) **Diff vocale "Ho sentito": kana↔kanji non riconosciuti** (bug
  segnalato: 時々/ときどき marcato tutto sbagliato pur detto giusto) —
  `readingOnlyNotation()` nuova in furigana.ts, `HeardDiff.svelte` accetta
  `annotatedText` e aggiunge da solo la lettura come candidato — fix
  centralizzato nel componente condiviso (17 pagine lo usano), applicato
  finora a /leggi-a-voce. Dettaglio in ARCHITECTURE.md.
- ✅ (30/07) **Grammatica N4-12: virgolette di citazione mancanti** (bug
  segnalato) — 「ここで泳ぐな」と書いてあります al posto degli spazi senza
  virgolette; sistemata anche una traduzione-segnaposto nello stesso
  costrutto.
- ✅ (30/07) **倒す: gloss IT sovrapposto a 落とす** (domanda utente: è
  sinonimo di 落ちる/落とす?) — no, sono azioni diverse (ribaltarsi/abbattere
  vs cadere/far cadere da un'altezza); il gloss IT "far cadere" era però
  identico a quello di 落とす, fonte di confusione — cambiato in
  "abbattere, rovesciare".
- ✅ (30/07) **Mani libere: fix timer di silenzio** (bug segnalato: si fermava
  spesso con l'utente attivo) — `lastActivity` si azzerava solo sui
  riconoscimenti riusciti, mai sulle domande poste dall'app: con STT che a
  volte non riconosce nulla per un giro (normale), il tempo dall'ultimo
  successo cresceva tra round finché non superava la soglia. Ora si azzera
  a ogni domanda (round + ripeti/lento/spiegami/pausa); soglia 30s → 2 min;
  allo scadere METTE IN PAUSA (Riprendi/Ferma) invece di terminare la
  sessione (si perdeva il progresso). Ridefinito anche 「わかりません」: ora
  spiega E dà la risposta parlata, poi passa al round dopo (prima ripeteva
  solo la domanda). Ridotta anche l'icona grande di stato (3.4rem → 2.2rem)
  per stare tutto in verticale con 6 comandi. Dettaglio in ARCHITECTURE.md.
- 🔲 **Catena a 3 passi** (受身→たい→くない, es. 言われたくない): serve step3 nel Round.
  Piano in `~/.claude/plans/noble-juggling-popcorn.md` (versione precedente).
- 🔲 **Consolida composizione**: sotto, i **box significato dei kanji** usati nella parola.
- 🔲 **Home**: offrire il **+5 carte nuove** già dalla card «Piano di oggi».

---

## Task futuri (ordine ragionevole)

1. ✅ (17/07) **Triage di massa «La so già»** — `/consolida`: modalità selezione multipla,
   checkbox per riga (disabilitata se già a stage≥5), barra flottante di conferma, `bulkPut`
   su `srs_progress`. Fix collegato: `markKnown` non retrocede più una carta già oltre
   stage 5 (bug latente anche sul bottone singolo in scheda).
2. ✅ (17/07) **Completamento piano di oggi** — spunte giornaliere (ripassi auto quando
   «tutto fatto», punti deboli a sessione deboli completata, attività all'apertura),
   contatore X/N nel titolo. Flag in localStorage (`dailyPlan.ts`), reset a mezzanotte.
2b. ✅ (24/07) **Riordina drag&drop**: TokenCompose condiviso ovunque (quiz
   sentence-ordering + composition, /dettato, /riordina) — tap e trascinamento.
2c. **Lista «in studio»** (richiesta utente): elenco gestibile della roba messa in studio
   (da «📚 Metti in studio»/triage) per aggiungere/togliere in massa. Da progettare:
   oggi le voci finiscono nei punti deboli (lapses>0); serve distinguere «scelte
   dall'utente» vs «sbagliate», forse un flag dedicato sulla riga SRS.
2d. **iikae mismatch** (segnalato, non riprodotto): frase di un item con opzioni di un
   altro. Aggiunto {#key idx} difensivo; se ricapita servono i passi esatti.
3. **Domanda sui correlati** (ok utente, dopo): «qual è la differenza tra 妻 e 奥さん?» —
   accredita ENTRAMBE le parole della coppia (doppio incremento). Distrattori = descrizioni
   della differenza. Da progettare.
4. **Pagine annidate /particelle/[slug]** — stesso schema di `/forme/[slug]`, non ancora fatto.
5. ✅ (18/07) **🎚️ Avverbi (副詞) allenabili** (/avverbi, beta) — cloze in frase:
   l'avverbio è cancellato dalla sua frase d'esempio, si sceglie fra 4 avverbi;
   dopo la risposta frase intera cliccabile (InteractiveSentence), traduzione, TTS.
   Credito su `word:<id>` facet_use (🧩). Link in /giochi + /guida.
6. ✅ (18/07) **Choukai: copione finale ricco** — ogni domanda nel recap spiega
   il «perché» (💡): ripensamento «やっぱり» (conta l'ultima decisione), esca stesso
   tipo, o diretta — calcolato in `instantiateListening` dalla struttura, cita
   sempre la risposta giusta. Aggiunto «▶️ Tutto il dialogo». Le singole frasi già
   riascoltabili (🔊) e cliccabili. Test esteso.
7. ✅ (18/07) **🧬 Catena di forme** (/catena, beta): 5 catene a 2 passi (可能→ない/た,
   たい→くない/かった, て→ている), catena visuale, senso it, credito conj:*+gram:*.
   ✅ (18/07) Estensioni: **frasi d'esempio curate** per ogni catena (giapponese vero
   + it + TTS, «come nella frase»); catene **使役形→negativa** e **受身形→passato**
   (passivo ristretto ai godan, così られる ≠ potenziale ichidan).
   Ancora possibile: catene a 3 passi (られたくない) — richiede uno step3 nel Round.
8. **Toggle kanji on/off** (idea utente) — grosso, tocca il rendering ovunque. Valutare
   se/quando; segnato, non urgente. I kanji N1 in parole N5 restano com'è per ora.
9. **Microfono: permessi e degradazione** — su http non-localhost l'API non c'è (serve
   secure context); serve `navigator.permissions.query`, messaggi chiari, try/catch attorno
   a `listenJapanese`, `speechAvailable()` deve controllare `window.isSecureContext`.
10. **Furigana fase 2** (dati) — annotare le frasi d'esempio delle parole riusando il
    matcher frase→parole del pipeline; mai furigana indovinata da letture ON/kun ambigue.
11. ✅ (17/07) **B3 chiuso** (giudizio insegnante inline): 都合≠便利 (nessuna relazione:
    都合がいい = circostanze, 便利 = comodo-strumento); 申し上げる già cor 言う/申す;
    出発(する) cor 出る; 親切 sin 優しい confermato; 例 non in catalogo (niente da fare);
    壁 kanji N1 coperto dalla policy kanji avanzati.
12. **Collaudo insegnante** — ✅ ciclo 17-18/07 completo INLINE (niente agente): relazioni
    N5+N4 vagliate (238 curate + 238 arricchite), unlinked-pairs sano, B3 chiuso, audit
    domande 2° giro (report `2026-07-18-audit-domande-2.md`: qualità ok, fix percorso
    applicato). Restano da fare quando capita: fix verb-form senza vincolo temporale
    (punto 2 del report), distrattori stessa-POS nel multiple-choice (punto 4),
    distrattori transitivity più puliti (punto 3).
13. **Doppio binario 自/他** — sulla stessa parola escono sia la domanda generata sia la
    curata. Deciso: tenere entrambe le fonti; se in futuro c'è doppione visibile in sessione,
    vince la curata.
14. **Blocco D2/D3/E** (dialoghi/corsi): navigazione arricchita in `detail`, condivisione
    bundle via URL, caricamento lezioni insegnante (grande, da progettare — non per
    non-tecnici allo stato attuale).

## Sessione 31/07 — branch `release` + inizio catalogo N3

Creato branch `release` (da questa macchina, push via SSH) per congelare lo stato N5/N4
completo (879 traduzioni, cinture in stats, sync script pulito). Da qui in avanti: **sviluppo
N3 solo su `main`**, ogni bugfix va applicato a **entrambi i branch** (cherry-pick).

Bug pipeline trovato e risolto su entrambi i branch (`main` faa3e93e, `release` 52a7d335):
gli override in `word-overrides.json` si applicavano a metà pipeline (dentro
`applyJmdictMetadata`) e potevano essere silenziosamente cancellati da `mergeIdioms`/
`mergeExtraWords` dopo (successo a 倒す, ご存じ) — aggiunto `applyWordOverridesFinal` come vero
ultimo passo, come già faceva `applyGrammarOverrides` per la grammatica. Trovato anche un terzo
punto (dopo i due di v83) che duplicava EN in IT come segnaposto: `deriveJmdictUsi` in
`scripts/lib/jmdict.mjs` (campi `usi`, sensi multipli JMdict) — stesso fix, `it: ""`.

Catalogo N3: vocabolario disponibile alla stessa fonte di N5/N4 (allenlu2009/japanese-learning-
datasets, 2139 parole, verificato raggiungibile), kanji N3 già in cache locale
(`scripts/data/kanji-n3.json`) ma non ancora incluso nell'output finale, grammatica N3 **senza
fonte automatica** (jlpt-grammar-api risponde 404 per N3 — richiede voci curate a mano, come già
fatto per le forme composte custom).

**Wired e sincronizzato (31/07)**: vocabolario + kanji N3 dentro `sync-open-source-seed.mjs`
(commit `a5f2221b`). Bug scoperti aumentando la scala (2139 parole in più fanno emergere
collisioni prima invisibili): `applyIikaeGroups` cercava le parole dei gruppi 言い換え solo per
scrittura, non per id — con più livelli possono esistere due parole con la stessa scrittura ma
letture diverse (訳 N4 わけ "motivo" vs N3 やく "traduzione"); ora cerca prima per id. 下がる
(rimosso dalla fonte N4 upstream) e 運転 (lettura anomala 'うんてんする' in N4 che confondeva la
dedup con 'うんてん' di N3) spostati in `extra-words-n5n4.json` (curati a mano, sopravvivono a
futuri cambiamenti upstream). Seed: 3950 parole (2492 N3, 736 N4, 713 N5, 9 EXTRA), 874 kanji,
173 grammatica (invariata, nessuna fonte N3).

**Curatela traduzioni IT parole — COMPLETATA (31/07)**: stesso metodo del lotto N4/N5 (879
frasi, v83) — dizionario testo-per-testo dal giapponese (mai dall'inglese intermedio), scritto
sia nel seed sia in `word-overrides.json`, verificato con
`npx vitest run src/lib/data/overrides.test.ts` a ogni lotto, commit a ogni lotto (SEED_REVISION
v86→v100). **Tutte le 2119 parole N3 tradotte** in 19 lotti (alcuni loanword katakana come
album/jeans/hotel/Buddha restano "uguali" per coincidenza lecita — l'italiano È il prestito
inglese, non un segnaposto dimenticato). check/build/vitest puliti a fine lavoro (588 test).

**Frasi_esempio N3 — IN CORSO (checkpoint 31/07 notte): 1869/2832 tradotte (66%), 22 lotti fatti.**
Stesso schema di batch delle parole: query sul seed per testo unico non tradotto (molte frasi
sono condivise fra un nome e il suo verbo in -する — tradurre una volta, applicare a tutte le
parole che la condividono), dizionario testo giapponese→traduzione, scrittura su seed +
word-overrides.json (array `frasi_esempio` intero per parola, sostituisce non fonde), verifica
con `npx vitest run src/lib/data/overrides.test.ts`, commit a lotti (SEED_REVISION v101→v106+).

**Script diagnostico riusabile** (in scratchpad di sessione, non nel repo — da ricreare se serve):
replica le 4 verifiche di `overrides.test.ts` su TUTTI gli id in un colpo solo (Node, non
vitest), per trovare tutti i problemi di un lotto in una volta invece di scoprirli uno alla volta
rilanciando i test. Ogni lotto di ~90 frasi nuove ne fa emergere 9-24 di pre-esistenti (stessa
scala del problema, proporzionale al numero di omografi/coppie-kanji nel lotto), sempre della
stessa classe già vista nell'audit di giugno-luglio:
- **kanji sbagliato per la stessa lettura**: coppie come 温かい/暖かい, 越える/超える, 下す/降ろす,
  河/川, 街/町, 羽/羽根, 押える/押さえる — JMdict lega l'esempio al kanji sbagliato del gruppo.
- **frase troppo lunga** (>34 caratteri, limite pensato per UI/voce).
- **punteggiatura finale strana** (frasi di dialogo con virgolette invece di 。！？).
- **caratteri latini vietati** (frasi con parole inglesi tipo "that" dentro, non ammesse salvo
  quando è la parola stessa a contenerli).
- **traduzione mancante su una seconda frase della stessa parola** (un lotto traduce SOLO le
  frasi il cui testo matcha il dizionario di quel giro; se la parola ne ha un'altra non ancora
  tradotta, l'override scritto con l'intero array fa fallire il test finché non si completa
  anche quella).
Ogni volta la correzione è: sostituire la frase con una scritta a mano, pertinente e con la
lunghezza giusta — mai provare a "salvare" la frase JMdict originale.

**Dopo le frasi**: curatela di sinonimi/contrari/omofoni/correlati per le 2119 parole N3
(l'euristica automatica di `enrichWordRelations` gira già in sync e produce risultati plausibili
ma NON verificati da madrelingua — vedi [[sinonimi-contrari-strategia]]: va fatta "da insegnante"
non euristicamente, com'è stato per N5/N4).

## Verifiche pendenti

Checklist completa in `2026-07-17-verifiche-propedeutiche.md` (22 punti + questioni aperte).
**Prod aspetta l'OK dell'utente dopo queste verifiche.**
