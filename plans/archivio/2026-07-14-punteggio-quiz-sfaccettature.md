# Piano: punteggio del quiz più giusto (coniugazione, particelle, contatori) + sfaccettatura Nation + parlato

## Contesto

Oggi ogni parola ha UN SOLO numero di "mastery" (`srs_stage` 0-7 + `mastery_points` -100..100,
in `db.srs_progress`, chiave `word:食べる`). Nel quiz a tempo, **qualunque** tipo di domanda su
quella parola aggiorna sempre e solo quel numero — incluse `conjugation` (て-form ecc.),
`particle-cloze` (quale particella ci va) e `counter-quiz`/`counter-reading`/`time-reading`
(quanti se ne contano). Il problema segnalato: sbagliare la coniugazione di 食べる non significa
non sapere 食べる — significa essere deboli sui verbi ichidan in generale. Stesso discorso per
le particelle (proprietà della particella, non della parola) e per i contatori (che hanno già
una loro entità/punteggio separato, `counter:個`, semplicemente non ancora usata da queste
domande).

Conferma forte già nel codice: `buildDeepDives()` in quiz/+page.svelte tratta GIÀ coniugazione e
particelle come "di classe" per i link di approfondimento (`/forme#godan`, `/particelle#に`) —
solo il punteggio non segue ancora quella logica.

In parallelo, si è deciso di tracciare anche le "sfaccettature" della conoscenza di una parola
(modello di Paul Nation: Forma × Significato × Uso, ciascuno ricettivo/produttivo) — Significato-
ricettivo, Significato-produttivo, Forma-scritta, Ascolto, e un nuovo Parlato (a voce, nuova
modalità col microfono). Decisione esplicita presa in conversazione: **non** creare uno
scheduling indipendente per ogni sfaccettatura (troppo invasivo: `pickNextItem`,
`getActivePool`, `countDueCards`, `loadWeakItems`, `loadObjectiveSummaries`, `loadSkillMastery`
assumono tutte una riga sola per item) — le sfaccettature sono contatori leggeri, solo
informativi, sulla STESSA riga della parola.

Decisioni chiuse in conversazione:
- Coniugazione/particelle: contatori separati "solo pratica" (`conj:*`, `particella:*`), la
  parola tocca solo `next_review_date` (non stage/mastery), niente scheduling proprio.
- Contatori: stesso trattamento "solo pratica" di oggi (Consolida/avventure) — nessun calendario
  vero, resta un punteggio semplice.
- `time-reading`: nessuna entità propria naturale — tocca solo la data di ripasso della parola,
  nessun contatore alternativo.
- Sfaccettature parola: campi opzionali aggiuntivi sulla riga esistente, niente nuova tabella,
  niente bump di versione Dexie necessario (campi opzionali).
- Nuova modalità `spoken-production` (microfono): riusa esattamente il meccanismo già rodato
  nelle avventure (`speechAvailable`, `listenJapanese`, `speechMatches`, `phraseVariants`,
  `HeardDiff`), attiva solo se `speechAvailable() && !appState.quizMuted`.

Lavoro diviso in fasi indipendenti, consegnate una alla volta (feature → check → build → commit
→ deploy, poi la prossima), come da convenzione del progetto.

---

## Fase 0 — helper `touchReviewDate` (srs.ts)

Nuova funzione pura in `src/lib/core/srs.ts`, nessun chiamante ancora: sposta avanti
`next_review_date` usando lo stage ATTUALE (non lo muove), riusando `REVIEW_INTERVAL_MINUTES` e
la stessa formula di scaling già usata in `applySrsReview` — non tocca `srs_stage`,
`mastery_points`, `ease_factor`, `streak`.

```ts
export function touchReviewDate(progress: SrsProgress, nowTs = Date.now()): SrsProgress {
  const mins = REVIEW_INTERVAL_MINUTES[progress.srs_stage] ?? REVIEW_INTERVAL_MINUTES[REVIEW_INTERVAL_MINUTES.length - 1];
  const scaled = Math.round(mins * Math.max(1, progress.ease_factor * 0.9));
  return { ...progress, next_review_date: nowTs + scaled * 60_000, updated_at: nowTs };
}
```

Non tocca `applySrsReview`/`applyPracticeReview`/`normalizeMastery`/`normalizePracticeOnlyMastery`.

**Verifica:** test vitest (nuovo caso in `src/lib/core/srs.test.ts`, stesso stile degli esistenti)
+ `npm run check`. Nessun impatto UI (nessuno la chiama ancora).

---

## Fase 1 — contatore di coniugazione per classe (`conj:*`)

**Chiavi:** `conj:godan`, `conj:ichidan`, `conj:irregular` (da `detectVerbClass` in
`src/lib/core/conjugation.ts`), `conj:i-keiyoushi`, `conj:na-keiyoushi` (da
`detectAdjectiveType`, mappando `'i'→'i-keiyoushi'`, `'na'→'na-keiyoushi'`).

Nuovo helper in `conjugation.ts` (fonte unica della chiave, riusato anche in Fase 5):
```ts
export function conjClassKey(word: Word): string | null {
  const verbClass = detectVerbClass(word);
  if (verbClass) return `conj:${verbClass}`;
  const adjType = detectAdjectiveType(word);
  if (adjType) return `conj:${adjType === 'na' ? 'na-keiyoushi' : 'i-keiyoushi'}`;
  return null;
}
```

**In `src/routes/quiz/+page.svelte`**, dentro `handleAnswer` (dove oggi c'è
`await upsertSrs(quiz.itemRef.key, correct);` incondizionato), due nuovi helper locali:
```ts
async function upsertPracticeOnly(key: string, correct: boolean): Promise<SrsProgress> {
  const current = getSrs(key) ?? createInitialSrs(key);
  const updated = applyPracticeReview(current, correct);
  await db.srs_progress.put(updated);
  srsMap.set(key, updated);
  return updated;
}
async function touchWordReviewDate(key: string): Promise<void> {
  const current = getSrs(key);
  if (!current) return;
  await db.srs_progress.put(touchReviewDate(current));
  srsMap.set(key, touchReviewDate(current));
}
```
poi dispatch per modo (scritto pensando già alle fasi 2-3 che lo estendono):
```ts
if (q.mode === 'conjugation' && quiz.itemRef.kind === 'word') {
  const word = context?.wordsById.get(quiz.itemRef.key.replace('word:', ''));
  const classKey = word ? conjClassKey(word) : null;
  if (classKey) await upsertPracticeOnly(classKey, correct);
  await touchWordReviewDate(quiz.itemRef.key);
} else {
  await upsertSrs(quiz.itemRef.key, correct);
}
```
`before` per il calcolo XP resta `getSrs(quiz.itemRef.key)` come oggi (XP non cambia).
`buildDeepDives()` non si tocca (già corretto).

**Non toccare:** `pickNextItem`, `getActivePool`, `countDueCards`, `loadWeakItems`,
`loadObjectiveSummaries`, `loadSkillMastery` — la riga della parola resta identica nella forma,
solo una riga NUOVA e separata (`conj:*`) inizia ad accumulare.

**Verifica:** `npm run check`, `npm run build`, test vitest per `conjClassKey` (5 classi +
parola non verbo/aggettivo → null). Verifica runtime: sessione /quiz forzando una domanda
`conjugation` (es. abbassando temporaneamente in una copia locale la soglia random, o via script
Playwright usa-e-getta che legge IndexedDB dopo la risposta) — controlla che `conj:<classe>` si
crei/muova e che la riga della parola muova SOLO `next_review_date`, non stage/mastery. Cancella
lo script dopo la verifica.

---

## Fase 2 — contatore per particella (`particella:*`)

**Chiavi:** `` `particella:${q.correctChoice}` `` — l'insieme enumerabile è `PARTICLES` (in
`src/lib/core/particles.ts`) ∪ `{'な'}` (branch な-aggettivi in `createParticleClozeQuestion`),
quindi 13 chiavi possibili. Nessuna nuova tabella: `q.correctChoice` della domanda già generata
è la chiave.

Estende lo stesso dispatch della Fase 1:
```ts
} else if (q.mode === 'particle-cloze') {
  await upsertPracticeOnly(`particella:${q.correctChoice}`, correct);
  await touchWordReviewDate(quiz.itemRef.key);
}
```

**Non toccare:** `src/lib/core/particles.ts` (resta dati puri, ignaro di SRS).

**Verifica:** stesso schema della Fase 1, mirata a una parola con `frasi_esempio` che genera
`particle-cloze`; controlla anche il caso な (deve dare `particella:な`, non `particella:undefined`).

---

## Fase 3 — contatori/orario rediretti a `counter:*` (solo pratica)

**Chiave:** riusa quella già esistente ovunque nel file: `` `counter:${word.id_contatore_suggerito}` ``
(stessa forma di `getActivePool()`'s `dueCounters` e del branch `ref.kind === 'counter'`).

Decisione presa: **solo pratica** (`applyPracticeReview`, non `applySrsReview`) — stessa logica
già usata ovunque i contatori vengono punteggiati oggi (Consolida, avventure). Nessun calendario
vero per i contatori, coerenza totale col comportamento esistente.

```ts
} else if (q.mode === 'counter-quiz' || q.mode === 'counter-reading') {
  const word = quiz.itemRef.kind === 'word' ? context?.wordsById.get(quiz.itemRef.key.replace('word:', '')) : undefined;
  const counterKey = word?.id_contatore_suggerito ? `counter:${word.id_contatore_suggerito}` : null;
  if (counterKey) await upsertPracticeOnly(counterKey, correct);
  await touchWordReviewDate(quiz.itemRef.key);
} else if (q.mode === 'time-reading') {
  await touchWordReviewDate(quiz.itemRef.key);
} else {
  await upsertSrs(quiz.itemRef.key, correct);
}
```
`time-reading` non ha un'entità propria naturale (non lega a un contatore): tocca solo la data
di ripasso della parola, nessun tracker alternativo — deciso, non serve altro.

**Non toccare:** i generatori delle domande in engine.ts, `createCounterDrillQuestion`
(Consolida, già corretto), la coda `dueCounters` in `getActivePool`.

**Verifica:** come le fasi precedenti, mirata a una parola con `id_contatore_suggerito`.

---

## Fase 4 — sfaccettature della parola (modello Nation)

**`src/lib/types/models.ts`** — 5 campi opzionali aggiuntivi su `SrsProgress` (opzionali = niente
bump di versione Dexie, non sono indicizzati):
```ts
facet_meaning_r?: number;      // Significato-ricettivo: flashcard-recognition, multiple-choice
facet_meaning_p?: number;      // Significato-produttivo: flashcard-production
facet_form_written?: number;   // Forma-scritta: flashcard-reading-recognition
facet_form_listening?: number; // Ascolto: listening
facet_form_spoken?: number;    // Parlato: spoken-production (Fase 6)
```

**`src/lib/core/srs.ts`** — helper che muove UN campo con lo stesso delta di
`applyPracticeReview` (+4/-6, stessa scala, niente nuova convenzione):
```ts
const FACET_FIELDS = ['facet_meaning_r', 'facet_meaning_p', 'facet_form_written', 'facet_form_listening', 'facet_form_spoken'] as const;
export type FacetField = typeof FACET_FIELDS[number];

export function bumpFacet(progress: SrsProgress, field: FacetField, isCorrect: boolean, nowTs = Date.now()): SrsProgress {
  const delta = isCorrect ? 4 : -6;
  const current = progress[field] ?? 0;
  return { ...progress, [field]: clamp(current + delta, -100, 100), updated_at: nowTs };
}
```
Per la visualizzazione riusa `normalizePracticeOnlyMastery` (già generica, scala -100..100 → 0-100%).

**`src/routes/quiz/+page.svelte`** — nel branch "else" (default, modi che riguardano davvero la
parola), dopo l'`upsertSrs` esistente, un SECONDO piccolo write per la sfaccettatura (più
semplice che duplicare la logica `wasNew` di `upsertSrs`):
```ts
const FACET_BY_MODE: Partial<Record<QuizQuestion['mode'], FacetField>> = {
  'flashcard-recognition': 'facet_meaning_r',
  'multiple-choice': 'facet_meaning_r',
  'flashcard-production': 'facet_meaning_p',
  'flashcard-reading-recognition': 'facet_form_written',
  listening: 'facet_form_listening',
  'spoken-production': 'facet_form_spoken' // Fase 6
};
...
} else {
  const updated = await upsertSrs(quiz.itemRef.key, correct);
  const facetField = FACET_BY_MODE[q.mode];
  if (facetField) {
    const withFacet = bumpFacet(updated, facetField, correct);
    await db.srs_progress.put(withFacet);
    srsMap.set(quiz.itemRef.key, withFacet);
  }
}
```

**Dove mostrarle:** `src/routes/detail/[id]/+page.svelte`, solo nel blocco di visualizzazione
mastery per le PAROLE (non kanji/grammatica). Riga testuale semplice (non grafico), solo per le
sfaccettature già toccate almeno una volta: "Significato: 82% · Lettura: 60% · Ascolto: 40% ·
Parlato: mai provato".

**Non toccare:** `pickNextItem`/`getActivePool`/`countDueCards`/`loadWeakItems`/
`loadObjectiveSummaries`/`loadSkillMastery` — le sfaccettature sono metadati di sola lettura,
mai usate per scheduling o selezione.

**Verifica:** `npm run check` (il tipo `SrsProgress` esteso deve propagare senza errori), test
vitest per `bumpFacet` (clamp, delta corretto/sbagliato, campo giusto), `npm run build`.
Runtime: rispondi a una `multiple-choice`, verifica che `facet_meaning_r` si muova E che
`mastery_points`/`srs_stage` si muovano ANCHE loro (qui, a differenza delle fasi 1-3, succedono
insieme) — poi controlla che `/detail/word:<id>` mostri la nuova riga.

---

## Fase 5 — rendere visibili/praticabili `conj:*` e `particella:*`

**`src/lib/db/queries.ts`** — `pctFor(r)`: estende il set `practiceOnlyKinds` già esistente
(oggi solo `'phrase'`) per includere `'conj'` e `'particella'` (stesso motivo: mai uno stage
vero, il peso 70/30 li terrebbe bloccati sotto soglia):
```ts
const practiceOnlyKinds = new Set(['phrase', 'conj', 'particella']);
```
`loadWeakItems`'s ciclo di etichette: nuovi branch per `kind === 'conj'`/`'particella'`. Nessuna
lookup DB necessaria (il suffisso grezzo è già l'etichetta) — riusa le stesse etichette italiane
già presenti in `buildDeepDives()` (es. "Aggettivi in -な") per coerenza di testo. Esporta una
piccola mappa condivisa `CONJ_CLASS_LABELS` da `conjugation.ts`, importata sia da queries.ts sia
dalla pagina Consolida, per non duplicare le stringhe in tre posti.

**`src/routes/punti-deboli/+page.svelte`** — `KIND_META`: aggiunge `conj` e `particella` (icona +
etichetta, stile coerente con le voci esistenti).

**`src/routes/consolida/[id]/+page.svelte`** — `build()`: due nuovi branch `kind`, sullo stesso
modello di `phrase`/`counter` (righe ~93-117):
- `kind === 'conj'`: filtra `words` per classe (riusa `detectVerbClass`/`detectAdjectiveType`),
  costruisce una coda di `createConjugationQuizQuestion` su più parole di quella classe (stesso
  generatore già usato nel branch parola di questo file, solo su parole diverse invece che una
  fissa). `srsTarget = 'conj:${rawId}'`.
- `kind === 'particella'`: filtra/ritenta su `createParticleClozeQuestion` finché
  `q.correctChoice === rawId` (stesso pattern "ritenta N volte, coda anche parziale" già usato
  da `buildCounterQuestions` in questo file).
- Entrambi riusano `recordPractice(correct)` **senza modifiche** (già fa esattamente "leggi o
  crea `srsTarget`, `applyPracticeReview`, scrivi").

**Non toccare:** nessun impatto su scheduling/pool — Consolida non vi ha mai partecipato.

**Verifica:** `npm run check`, `npm run build`. Runtime: dopo aver generato qualche riga
`conj:`/`particella:` (anche seminandole direttamente per velocità in uno script usa-e-getta),
visita `/punti-deboli`, controlla chip+etichette, apri `/consolida/conj%3Agodan`, controlla che
la coda si costruisca e che rispondere aggiorni la riga.

---

## Fase 6 — nuova modalità `spoken-production` (microfono, sfaccettatura Parlato)

Testa davvero l'identità della parola (produzione a voce) — punteggio pieno come le altre 4
modalità "proprie" (non un redirect di classe): passa dal branch "else" della Fase 4, con
`facet_form_spoken` già mappato lì.

**`src/lib/quiz/types.ts`** — aggiunge `"spoken-production"` a `QuizMode`, nuova interfaccia
modellata su `FlashcardQuestion`:
```ts
export interface SpokenProductionQuestion {
  mode: "spoken-production";
  wordId: string;
  prompt: string;           // significato IT/EN
  promptLanguage: LocaleCode;
  expectedReading: string;  // word.lettura
  expectedWriting: string;  // word.scrittura
  warningMultipleDefinitions: boolean;
}
```

**`src/lib/quiz/engine.ts`** — nuovo generatore accanto a `createFlashcardProductionQuestion`:
```ts
export function createSpokenProductionQuestion(word: Word, locale: "it" | "en"): SpokenProductionQuestion {
  const meanings = pickLocalizedArray(word.significato, locale);
  return {
    mode: "spoken-production", wordId: word.id, prompt: meanings.join(" / "), promptLanguage: locale,
    expectedReading: word.lettura, expectedWriting: word.scrittura,
    warningMultipleDefinitions: meanings.length > 1
  };
}
```
`MODE_BASE_XP`: aggiunge `"spoken-production": 14`.

**`src/routes/quiz/+page.svelte`**:
- Stato mic riusato pari pari dal pattern delle avventure (es. `ristorante/+page.svelte`):
  `canSpeak` (via `speechAvailable()` in onMount), `micState`, `heard`.
- Import `speechAvailable, listenJapanese, speechMatches, phraseVariants` da `$lib/core/speech`,
  più `HeardDiff` (non ancora importato in questo file).
- `pickWordMode()`: stesso schema di gating già usato per `listening`:
  ```ts
  if (canSpeak && !appState.quizMuted && stage >= 2 && Math.random() < 0.12) return 'spoken-production';
  ```
- `generateQuestion()`: nuovo branch `if (mode === 'spoken-production') return createSpokenProductionQuestion(word, locale);`
- Nuova funzione di risposta a voce:
  ```ts
  async function recordSpokenAnswer(): Promise<void> {
    if (!quiz || quiz.answered || micState !== 'idle') return;
    const q = quiz.question as SpokenProductionQuestion;
    micState = 'listening'; heard = '';
    const alts = await listenJapanese();
    micState = 'idle';
    if (alts.length === 0) { heard = '（niente capito, riprova）'; return; }
    heard = alts[0]!;
    // UN SOLO gruppo che unisce scrittura e lettura (dire l'una O l'altra basta) —
    // NON due gruppi separati (richiederebbe erroneamente entrambe nella stessa frase).
    const ok = speechMatches(alts, [[...phraseVariants(q.expectedWriting), ...phraseVariants(q.expectedReading)]]);
    handleAnswer(ok, heard);
  }
  ```
- Template: nuovo blocco `{#if quiz.question.mode === 'spoken-production'}` vicino a
  `flashcard-production`, con prompt, bottone microfono (stesso stile pulsante/pulsing delle
  avventure), `<HeardDiff heard={heard} candidates={[q.expectedWriting, q.expectedReading]} />`.
  Il gating in `pickWordMode` (`canSpeak && !quizMuted`) impedisce che il modo venga MAI scelto
  senza microfono: nessun fallback "senza voce" da costruire.
- TTS di fine risposta: nessuna esclusione necessaria, ricade naturalmente nel branch
  `quiz.itemRef.kind === 'word'` già esistente.

**Non toccare:** pool/scheduling — è solo un nuovo valore di `mode` su `ItemRef.kind === 'word'`,
stessa riga, stesso modello di oggi.

**Verifica:** `npm run check`, `npm run build`, test vitest per `createSpokenProductionQuestion`
(funzione pura). Playwright: verifica che il modo non venga MAI offerto con `speechAvailable()`
stubbato a false (inietta rimuovendo `SpeechRecognition`/`webkitSpeechRecognition` via
`page.addInitScript`); il riconoscimento vocale vero va verificato a mano in un browser reale con
permesso microfono (non automatizzabile in CI).

---

## File critici

- `src/lib/core/srs.ts` — `touchReviewDate`, `bumpFacet`, `FacetField`
- `src/lib/core/conjugation.ts` — `conjClassKey`, `CONJ_CLASS_LABELS`
- `src/lib/types/models.ts` — campi facet su `SrsProgress`
- `src/routes/quiz/+page.svelte` — dispatch in `handleAnswer`, nuova modalità mic, `pickWordMode`
- `src/lib/quiz/types.ts` / `src/lib/quiz/engine.ts` — `SpokenProductionQuestion` + generatore + XP
- `src/lib/db/queries.ts` — `pctFor`, etichette `conj:`/`particella:` in `loadWeakItems`
- `src/routes/punti-deboli/+page.svelte` — `KIND_META`
- `src/routes/consolida/[id]/+page.svelte` — nuovi branch `build()`
- `src/routes/detail/[id]/+page.svelte` — riga sfaccettature (solo parola)

## Ordine di consegna

Fase 0 → 1 → 2 → 3 → 4 → 5 → 6, ciascuna: check → build → test vitest → verifica runtime
mirata (script Playwright usa-e-getta, cancellato dopo) → commit → deploy → fase successiva.
