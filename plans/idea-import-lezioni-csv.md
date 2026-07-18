# Idea — Import lezioni insegnante da CSV/Quizlet (Fase 1)

> ⚠️ **IDEA PARCHEGGIATA (non attiva).** Non si costruisce ora. Traccia per quando
> servirà: la maestra usa Quizlet/Genki + Google Sheet e vuole creare lezioni
> collegate al catalogo esistente.

## Contesto

Il sistema corsi/lezioni **esiste già**: `importCourseDataset`, tabelle
`course_datasets`/`course_lessons`, `/courses` importa JSON/URL, `studyOnlyCourse`.
Le lezioni possono **referenziare id del catalogo esistente** («seed words resolved
at import time» in `src/lib/db/course-import.ts`); gli id del catalogo = la scrittura
(es. `あいさつする`). Manca solo il ponte per un non-tecnico: **CSV → dataset**,
**aggancio automatico al catalogo** e **frasi per le parole nuove**.

## Approccio (Fase 1)

1. **`CourseWordInput` + frasi** (`src/lib/types/models.ts`): aggiungere
   `frasi_esempio?: { testo: string; traduzione_it: string; traduzione_en?: string }[]`;
   in `src/lib/db/course-import.ts` mapparle nei `newWords`
   (`frasi_esempio: [{ testo, traduzione: { it, en } }]`).
2. **Convertitore `src/lib/core/csvCourse.ts`** (puro): `parseCsv(text, delimiter)` +
   `csvToCourseDataset(rows, opts, matcher) → { dataset, summary }`, con
   `matcher(scrittura, lettura?) => id | null`.
   - **structured**: intestazioni `lezione, scrittura, lettura, significato`
     (+ opz `tipo`, `frase`, `frase_it`); righe raggruppate per `lezione`.
   - **quizlet**: `termine, definizione`; serie = 1 lezione; lettura da parentesi
     (`食べる（たべる）`/`[たべる]`); significato = definizione (split `/` `;`).
   - Per ogni parola: se `matcher` trova un id → la lezione lo referenzia (riusa le
     frasi curate); altrimenti → `parole_nuove` (`${corsoId}-w<N>`, `tipo_jp` default
     `その他[そのた]`, `livello_jlpt = livelloDefault`, frase inclusa).
   - `summary` = { agganciate, nuove, lezioni, scartate[] } per l'anteprima.
   - `corsoId` = slug(nome)+'-'+base36(ts).
3. **UI `/courses`** — card «📄 Importa da CSV / Quizlet»: incolla o upload
   `.csv/.tsv`; campi nome corso, livello default, formato, delimitatore, «header».
   Anteprima (agganciate vs nuove, lezioni, warning) → conferma: `matcher` da
   `db.words.toArray()`, `csvToCourseDataset`, poi
   `importCourseDataset(JSON.stringify(dataset))`. Link «Scarica template CSV».
4. **Test** `src/lib/core/csvCourse.test.ts` (puro): il dataset passa `validateDataset`;
   mix agganciate/nuove; frasi mappate; quizlet con lettura in parentesi; tipo default;
   righe malformate nel summary.

## Riuso
`importCourseDataset`/`validateDataset`/`studyOnlyCourse` e tabelle (nessuna
persistenza nuova); `/courses` e i suoi handler d'import; `db.words` per il match.

## Limiti Fase 1
Match per scrittura(+lettura) esatta, niente fuzzy; solo vocab + lezioni + frasi.
Kanji/grammatica custom, domande custom e lesson-builder in-app = fasi successive.

## Condivisione
Local-first: la maestra fa il file (CSV/JSON) e lo condivide via file o URL (import
da URL già c'è), oppure un Google Sheet «pubblicato come CSV» scaricato da URL.
