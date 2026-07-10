# Renkei — regole di lavoro

App di studio giapponese N5/N4 (SvelteKit 2 + Svelte 5 runes, Dexie, adapter-static su GitHub Pages). Local-first, niente backend. Architettura in ARCHITECTURE.md, guida utente in `/guida` (in-app).

## Checklist per OGNI modifica (in ordine)

1. **Una cosa alla volta**: feature/fix → check → build → commit → deploy, poi la prossima.
2. `npm run check` e `npm run build` devono essere puliti (0 errori/warning). Engine nuovi o logica dati → test vitest (`npx vitest run`).
3. **Commit SOLO a nome utente**: `--author="Lorenzo Natali <offtherailz@gmail.com>"`, MAI Co-Authored-By o attribuzioni a Claude.
4. Deploy: `npm run release`, poi verificare `gh run list` → conclusion `success`. Se Pages fallisce in modo transitorio: `npm run deploy` di nuovo.

## Non dimenticare quando aggiungi una FEATURE

- [ ] **Link di ingresso**: home (gruppo giusto: Studia / Gioca e vivi / Cataloghi / Altro) e/o `/giochi` (gruppo giusto) e/o `/avventure`.
- [ ] **Aggiorna `/guida`** (src/routes/guida): è la guida utente ufficiale, va tenuta allineata.
- [ ] Se tocca l'architettura o i dati: nota in ARCHITECTURE.md.
- [ ] Aggiorna task list e memoria di sessione.

## Regole dati (seed e correzioni)

- Se `static/seed-n5n4.json` cambia → **bump `SEED_REVISION`** in `src/lib/version.ts` (vN+1), altrimenti i dispositivi non si aggiornano.
- Correzioni/contenuti curati: **SEMPRE negli overrides** (`scripts/data/word-overrides.json`, `grammar-overrides.json`) e poi applicati al seed — mai solo nel seed, o il prossimo sync li cancella.
- Le correzioni dell'utente arrivano da `/correzioni` (export JSON nello stesso formato): si fondono negli overrides.
- Frasi d'esempio nuove: livello della carta (N5 kana-spaziato semplice; N4 con kanji), traduzioni it+en vere.
- Traduzioni italiane: **sempre dal testo giapponese**, mai dall'inglese intermedio (l'EN serve solo come chiave di lookup, es. `scripts/data/usi-it.json`). Altri dizionari en→it: `kanji-it.json` (significati kanji).

## Convenzioni UX consolidate (giochi/avventure)

- Ascolto: soluzione MAI visibile prima della risposta; sempre **もう一度** e **🐢 ゆっくり** (le ripetizioni non finiscono nel copione).
- Voci: utente = impostazione, interlocutore = sesso opposto, annunci = femminile. Battute multiple con `speakSequence` (mai due `speak` consecutivi: si cancellano).
- Copione 📜 con battute cliccabili (`InteractiveSentence`).
- Errori nelle avventure → `recordPracticeMiss('counter:X' | ...)` così alimentano il consolidamento.
- Microfono: `speech.ts` (listenJapanese/speechMatches/phraseVariants), fallback a bottoni dove non supportato.
- Prezzi/valori parlati: **kana** (えん, non 円 dopo kana: il TTS sbaglia).
- **MAI colori esadecimali nei componenti**: usare i token del tema (--warn-*, --info-*, --ok-*, --gold-*, --danger, --success) — i cablati diventano chiaro-su-chiaro in dark mode.

## Sicurezza

- Nessuna API key/credenziale nel repo o nel codice. Traduzioni e contenuti: generati in sessione (Fable), non via servizi esterni.
