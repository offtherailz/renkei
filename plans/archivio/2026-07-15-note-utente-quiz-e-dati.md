# Note utente — correzioni dati, bug, idee quiz (15 luglio 2026)

Raccolta grezza di note prese dall'utente durante l'uso dell'app. Non ancora triagate/implementate
— servono da backlog. Alcune verificate contro il codice/dati attuali (segnato "✅ verificato"),
altre restano da capire meglio (segnato "❓ da chiarire": trascrizione vocale poco chiara).

## Correzioni dati (sinonimi/keigo — vanno negli overrides, mai solo nel seed)

- **都合 (つごう) sinonimo di 便利 (べんり)** — ✅ verificato: nessuno dei due ha `sinonimi` in
  `scripts/data/word-overrides.json`. Da aggiungere il collegamento bidirezionale.
- **出発 (しゅっぱつ) avrebbe un sinonimo N4** — ❓ da chiarire quale (nota dettata, trascrizione
  incerta: "Shippatsu Auri"). Verificare a quale parola si riferisce l'utente prima di correggere.
- **親切 (しんせつ)** — ❓ nota isolata ("親切 pure"), non chiaro se collegata alla nota sopra
  (伴 sinonimo di qualcos'altro?) o un punto a sé. Chiedere.
- **Manca un sinonimo di 例 (れい)?** — ❓ nota "Aikon manca come sinonimo di rei", trascrizione
  vocale poco chiara ("Aikon" non è una parola giapponese riconoscibile). Chiedere di persona quale
  parola intendeva.
- **申し上げる non è segnato come keigo** — ✅ verificato: esiste in `word-overrides.json` ma NON
  è in `KEIGO_VERBS` (`src/lib/core/keigo.ts`) né taggato come 謙譲語 altrove. È la forma umile di
  言う/あげる (dire/offrire a un superiore) — da aggiungere a `KEIGO_VERBS` e/o badge keigo sulla
  parola.

## Bug segnalati

- **くれる — "scegli la lettura corretta" mostra già くれる come prompt.** Sospetto: una domanda
  reading-choice/flashcard-reading-recognition genera la parola già in kana quando scrittura==lettura
  (parole senza kanji), rendendo la domanda banale/rivelatrice. Da riprodurre e capire se capita solo
  con parole full-kana.
- **形容詞 causativo/passivo ambigui nel prompt.** Nota: "Fare: pensione, fare: causa sono ambigui,
  e tante volte il 'fare:' suggerisce già la risposta" — sospetto riguardi le etichette delle forme
  nel quiz di coniugazione (`formLabel` in ConjugationQuizQuestion), dove il testo del prompt
  potrebbe rivelare la categoria grammaticale attesa. Da guardare `createConjugationQuizQuestion` in
  `src/lib/quiz/engine.ts` e le label esatte usate.

## Idee per il quiz — nuove modalità/domande

1. **Consolida forme verbali** — un drill dedicato alla coniugazione in `/consolida`, per esercitarsi
   sulle forme di un verbo specifico. (Si incrocia con la Fase 5 del piano
   `2026-07-14-punteggio-quiz-sfaccettature.md`, che aggiunge `/consolida` per classe di
   coniugazione — verificare se questa nota chiede la stessa cosa o un drill per singolo verbo.)
2. **Domande di completamento (cloze) anche sui verbi coniugati**, non solo sulle particelle — nota:
   "le trovo quasi sempre con particelle". Il cloze oggi pesca quasi sempre `particle-cloze`; manca
   un cloze che chiede la forma verbale corretta in una frase.
3. **Più varianti nelle domande di coniugazione: kanji + lettura insieme**, per aumentare la
   flessibilità del riconoscimento (l'utente sta cercando di rendere le domande meno rigide/più
   naturali).
4. **Comporre la parola carattere per carattere** (invece di scegliere tra 4 opzioni) come modalità
   più difficile per le parole già molto consolidate — prima riconoscimento a colpo d'occhio (scelta
   multipla), poi produzione attiva (composizione). Un po' come i token di `sentence-ordering`, ma
   per i singoli kanji/kana di una parola.
5. **Le "prove d'uso" della scheda parola (riempi la frase con la parola) non compaiono mai nel
   quiz** — solo nella scheda di dettaglio. Da verificare se esiste già un tipo di domanda
   equivalente in rotazione o se manca del tutto un modo "cloze sull'uso della parola" nel quiz vero.
6. **Domande di grammatica specifiche per pattern (es. 自動詞/他動詞)** — esempio fornito:
   `___こわれた。` / `パソコンをこわしてしまった。`. Idea: le domande di grammatica potrebbero
   esercitare quel punto specifico pescando dalle frasi dei verbi transitivi/intransitivi
   corrispondenti, invece di essere generiche.

## Domanda aperta (nessuna decisione presa)

- **壁 (かべ, N5) contiene un kanji di livello N1.** L'utente lo incontra nei quiz e lo indovina
  sempre per esclusione, senza davvero saperlo leggere. Non è chiaro se sia un problema da
  correggere (rimandare il kanji, dare più aiuto) o se vada bene lasciarlo così (si impara "in
  background"). L'app oggi already mostra le domande sui kanji al loro livello reale e offre la
  furigana d'aiuto in Impostazioni (vedi CLAUDE.md) — l'utente non è sicuro se basti. Da
  ridiscutere, nessuna azione presa.

## Feature grande: caricamento lezioni da parte dell'insegnante

L'utente vorrebbe dare alla propria insegnante di giapponese un modo di caricare le lezioni fatte a
lezione (es. una lezione sul keigo: こちら, i verbi in -になる, -ください...) così che l'app possa
proporre ripetizioni intelligenti sui contenuti di quella lezione specifica — sostituendo l'uso
attuale di Quizlet. Chiede anche se questo richiede inserimento manuale volta per volta o se si può
costruire un sistema per cui l'insegnante carica un file e il resto è automatico.

**Nota di contesto**: l'app ha già un sistema di importazione corsi (`COURSE_FORMAT.md`,
`course-import.ts`, tabelle `course_datasets`/`course_lessons`) pensato esattamente per questo tipo
di condivisione senza backend (vedi anche il vecchio piano
`2026-06-28-refactoring-sveltekit-dialoghi.md`, Fase 4). Da valutare: la richiesta è "rendere questo
processo più semplice per una persona non tecnica" (l'insegnante non scriverebbe JSON a mano), o
serve qualcosa di nuovo? Da discutere prima di decidere l'approccio.
