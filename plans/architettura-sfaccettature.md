# Architettura: sfaccettature (modello Nation)

Design stabile, non cambia da un giorno all'altro. Per lo stato dei lavori e i prossimi
task vedi `2026-07-15-piano-unificato.md`. Per la teoria/dettaglio soglie/gram vedi
`archivio/2026-07-16-catalogo-costruzioni-e-facetof.md` e `archivio/2026-07-14-punteggio-quiz-sfaccettature.md`.

## Teoria

Modello di **Paul Nation** — *conoscere una parola* su 3 dimensioni (Forma, Significato,
Uso), ciascuna ricettiva/produttiva.

## Pattern unico (architetturale)

Una sola tassonomia di sfaccettature = **(dimensione × R/P)**, usata come **tag trasversale**
su ogni `mode` di domanda. Ogni **entità** accumula un punteggio per sfaccettatura, ma **solo
sulle celle che la riguardano**. In software:
`record(entityKey, facetOf(mode), correct)` + `applicableFacets(entity)` + un render che disegna
solo le celle applicabili. Niente logica su misura per tipo di carta.

## Tassonomia (8 celle)

| # | Cella (dim·R/P) | Icona | Label | Modi di domanda |
|---|---|---|---|---|
| 1 | Forma scritta·R | 📖 | Leggere | flashcard-reading-recognition |
| 2 | Forma scritta·P | ✍️ | Scrivere | composizione (C4), coniugare (`conjugation`) |
| 3 | Forma orale·R | 👂 | Ascoltare | listening |
| 4 | Forma orale·P | 🎤 | Dire | spoken-production |
| 5 | Significato·R | 💡 | Capire | flashcard-recognition, multiple-choice |
| 6 | Significato·P | 🎯 | Recuperare | flashcard-production |
| 7 | Uso·R | 🔍 | Riconoscere l'uso | scelta pattern/particella (variante a scelta) |
| 8 | Uso·P | 🧩 | Usare in frase | particle-cloze, cloze coniugato, cloze d'uso |

## Entità × celle applicabili

- **Parola** → tutte. Radar/Kiviat in fondo a `/detail/word:…` (celle 7+8 mostrate unite come
  1 asse «Uso» → **7 assi visibili**). Scala 0–100%; celle N.A. tratteggiate (≠ non praticato).
- **Classe verbale** `conj:*` → **{✍️ Coniugare, 🧩 Usare in frase}** — solo forme del **quadro
  base** (ます/て/た/ない/volitivo).
- **Particella** `particella:*` → **{🔍 Riconoscere quale, 🧩 Usarla in frase}**.
- **Costruzione** (`可能`/`使役`/`受身`/condizionali/composte てしまう・ておく・ている…) → entità
  propria **{💡 Significato, 🔍 Quando si usa, 🧩 Usare}**, con **✍️ agganciata alla classe** (la
  morfologia dipende da godan/ichidan). Confine: **quadro base = classe; tutto il resto =
  costruzioni.**
- **Kanji** → fuori dal sistema, punteggio proprio. **Frasi/contatori** → invariati.

**`applicableFacets` dipende dalla CLASSE (`tipo_jp`), non solo word-vs-kanji:**

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

- **Keigo** = **Uso·registro** (Nation: constraints on use). Suppletivi = entità `word:` con
  relazione (`correlati`); produttivo (お+masu+になる/する) = costruzione.
- **Catalogo costruzioni**: in `GRAMMAR_FORMS` (`src/lib/data/grammarForms.ts`) — voci
  `composed: true`, incluse 可能/受身/使役 (`kanou`/`ukemi`/`shieki`) e i condizionali. Entità
  = `gram:<slug>`.

## Selezione guidata dalle sfaccettature

Le sfaccettature guidano QUALE MODO di domanda esce, **non** lo scheduling della parola. La
parola resta scelta dalla sua unica riga SRS (`pickNextItem`/`getActivePool` invariati); cambia
solo `pickWordMode`, che pesca a caso tra le celle **applicabili + sbloccate** allo stage
attuale quella **meno sviluppata**, mai la stessa due volte di fila.

**Soglie di sblocco** (agganciate alla scala SRS): 💡📖 st.0, 👂 st.1, 🎯🧩 st.2, 🎤 st.3, ✍️ st.4
→ il difficile arriva quando la parola è consolidata.

- **Incremento doppio naturale**: una domanda 🧩 di uso su 食べる aggiorna sia `conj:ichidan`
  (classe) sia `facet_use` della parola — stesso tag, due entità, senza codice speciale. Lo
  stesso pattern vale per le frasi curate forma-contesto (accreditano parola SRS + `gram:*`
  pratica, vedi commit 17/07).

## Attribuzione (generalizzazione a tutta l'app)

Sistema a sfaccettature = lente su TUTTA l'app, rollout incrementale.
- `recordPractice(entity, facet, correct)` è il `record(entità, cella, esito)` del pattern,
  riusato da quiz E giochi/avventure/shadowing/consolida.
- **Unità di attribuzione**: la **singola interazione controllata**, non l'attività.
  `facetOf(interazione)` = mappa fissa; l'entità è già nota (i giochi la passano già).
- **Regole**: attribuire **solo dove c'è un vero controllo** di correttezza (ascolto
  passivo/copione → niente); orale fuzzy (shadowing) → credito **piccolo, solo positivo** (il
  mic sbaglia, non penalizzare); Q&A discreta (keigo/iikae/particelle/riordina) → stesso delta
  del quiz (+4/−6).

## Problemi algoritmici gestiti

- `applicableFacets(word)` esclude celle impossibili: full-kana → niente 📖/✍️ (verificato
  chiuso, vedi piano); 🧩 richiede frasi/particella/classe; 👂/🎤 richiedono TTS/mic.
- Radar: N.A. (impossibile, tratteggiato) ≠ 0 (da fare).
- Selezione: mai la stessa cella due volte di fila (implementato in `pickWordMode`).
