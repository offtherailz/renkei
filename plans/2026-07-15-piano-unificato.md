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

## Stato attuale (verificato nel codice il 15/07/2026)

- **Migrazione SvelteKit**: FATTA (piano 28 giu, Fase 1).
- **Dialoghi**: FATTI in gran parte — modello `Dialogue`/`DialogueLine`, tabella Dexie `dialogues`,
  `DialogueViewer.svelte`, campo corso `dialoghi_nuovi`, `detail/[id]` esistono già.
- **Punteggio quiz** (piano 14 lug): fatta solo **Fase 0** (`touchReviewDate` in `srs.ts`).
  Fasi 1–6 tutte da fare.
- **Note utente** (15 lug): backlog non triagato.
- **Staging**: `npm run deploy:staging` già configurato.

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
- **B1** — bug くれる: lettura già svelata quando `scrittura==lettura` (full-kana).
- **B2** — bug `formLabel` che suggerisce la risposta (causativo/passivo, «fare:» ambiguo).
- **B3** — correzioni dati negli **overrides**: 都合↔便利 sinonimi, 申し上げる come keigo.
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
- **Feedback test utente (17/07)**:
  - Particelle: domande **propedeutiche mirate agli usi** (frasi apposta per esercitare la
    sostituzione, non solo cloze da frasi generiche); casi ambigui (は/が/も…) da far vagliare
    all'insegnante-agente — il generatore audit c'è, gli agenti erano bloccati da 529/limite.
  - **Avverbi (副詞)**: anche loro vorrebbero una "conoscenza" allenabile (oggi nessun drill di
    classe per gli avverbi).
  - **Choukai/trappole: copione finale ricco** — ascoltare le singole frasi, vedere le risposte
    giuste e il perché.
  - **Frasi d'aeroporto nel vocabolario** (Wi-Fiルーターのレンタルは…, すみません、搭乗口は…,
    これは機内持ち込みできますか): sono intere frasi classificate 慣用表現 tra le parole (vengono
    da idioms-n5n4/extra curati). Decidere: spostarle in frasi utili / tipo dedicato / tenerle.
    Da discutere.
- **Piano di oggi: sistema di completamento** — le voci del piano (ripassi, punti deboli, attività
  del giorno) dovrebbero segnarsi come fatte/spuntabili durante la giornata, non restare link statici.
- **Microfono: permessi e degradazione (16/07)** — su http non-localhost (dev via IP LAN) l'API
  non esiste (serve secure context) e il tap sul mic in frasi utili «si chiude e dà errore».
  Da fare: 1) `navigator.permissions.query({name:'microphone'})` per distinguere prompt/negato/
  non-disponibile; 2) messaggio chiaro per caso (negato → come riabilitare nel browser; contesto
  non sicuro → usa https/localhost); 3) mai crash: try/catch attorno a `listenJapanese` con
  fallback ai bottoni (convenzione già prevista); 4) `speechAvailable()` deve controllare anche
  `window.isSecureContext`.
- **Furigana attivabili (toggle globale)** — fase 1 (facile): setting in Impostazioni, `FuriganaText`
  rende ruby/testo piano dove la notazione 漢字[よみ] già esiste (dialoghi, forme, schede). Fase 2
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
