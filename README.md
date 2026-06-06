# Renkei - Japanese Study PWA (Local-First)

Architettura TypeScript per un'app reale di studio JLPT, offline-first con Dexie.js + IndexedDB.

## Struttura

- src/types/models.ts
  Modelli del knowledge graph con supporto i18n (it/en), metadati giapponesi e timestamp.
- src/db/schema.ts
  Schema Dexie, indici relazionali e indice composto SRS [srs_stage+next_review_date].
- src/db/import.ts
  Seeding iniziale automatico da JSON (N5/N4) al primo avvio.
- src/quiz/
  Motore quiz (flashcard, scelta multipla, sentence ordering, cloze), distrattori in RAM e XP.
- src/core/
  i18n browser-aware, TTS su lettura hiragana, furigana renderer, tokenizzazione giapponese.
- src/components/InteractiveWord.ts
  Componente riutilizzabile hover/touch con popup di traduzione/lettura.
- src/sync/sync.ts
  Merge locale-cloud Last Write Wins basato su updated_at.
- src/main.ts
  App shell reale: onboarding obiettivo JLPT, task giornalieri persistenti, quiz session e credits.
- vite.config.ts
  Base path dinamico per deploy su GitHub Pages.
- .github/workflows/deploy-gh-pages.yml
  Pipeline CI/CD per build e pubblicazione su github.io.

## Note tecniche

- Le frasi supportano formato furigana tipo: 漢字[かんじ]
- Il TTS per parole isolate usa sempre il campo lettura.
- Distrattori quiz caricati con indice leggero in memoria per ridurre query su IndexedDB.
- Tutte le entita principali includono updated_at per sync e merge.
- Il bootstrap manuale non e richiesto: il seed viene caricato automaticamente al primo avvio.

## Avvio rapido

1. Installa dipendenze
  npm install
2. Avvia sviluppo locale
  npm run dev
3. Apri URL mostrato da Vite (es. http://localhost:5173)
4. Seleziona obiettivo JLPT (N5 o N4), genera il piano e inizia la sessione quiz.

## Build PWA

- Build produzione: npm run build
- Preview build: npm run preview

## Deploy su GitHub Pages

1. Pusha su branch main.
2. In GitHub: Settings > Pages > Build and deployment > Source = GitHub Actions.
3. Il workflow .github/workflows/deploy-gh-pages.yml pubblichera automaticamente la cartella dist.
4. URL finale: https://<tuo-username>.github.io/<nome-repository>/

## Logo

- Logo app usato in UI: public/renkei-logo.svg
- Se vuoi usare il tuo PNG ufficiale, aggiungilo in public/renkei-logo.png e aggiorna src/main.ts per usare quel file.
