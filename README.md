# Renkei (連携) - JLPT Study PWA

App local-first per studio giapponese JLPT con quiz SRS, cataloghi di obiettivi, Dexie/IndexedDB e supporto i18n it/en.

## Setup locale

1. Installa dipendenze
   npm install
2. Avvia ambiente dev
   npm run dev
3. Controllo tipi
   npm run check
4. Build produzione
   npm run build

## Deploy su GitHub Pages (senza Actions)

Questo progetto usa deploy branch-based su `gh-pages` dal tuo computer.

Prerequisiti:

- repository GitHub già creato
- branch `main` già pushato

### Prima pubblicazione

1. Collega il remoto (una sola volta)
   git remote add origin https://github.com/<user>/<repo>.git

2. Pusha il codice sorgente
   git push -u origin main

3. Pubblica il sito su `gh-pages`
   npm run deploy

Alternativa (se non vuoi configurare subito `origin`):
PAGES_REPO_URL=https://github.com/<user>/<repo>.git npm run deploy

4. In GitHub configura Pages
   Settings -> Pages -> Source: Deploy from a branch
   Branch: `gh-pages` / Folder: `/ (root)`

URL finale:
https://<user>.github.io/<repo>/

### Deploy successivi

Usa comando unico:

npm run release

Questo esegue:

1. `git push origin main`
2. build con base path corretta per Pages
3. publish su branch `gh-pages`

## Errore comune

Se vedi:
`Failed to get remote.origin.url`

significa che non hai configurato il remote `origin`.

Soluzione A:
git remote add origin https://github.com/<user>/<repo>.git

Soluzione B:
PAGES_REPO_URL=https://github.com/<user>/<repo>.git npm run deploy

## Script principali

- `npm run dev` avvio locale Vite
- `npm run check` TypeScript check
- `npm run build` build produzione
- `npm run sync:open-seed` rigenera `public/seed-n5n4.json` da dataset open source MIT (vocabolario + kanji N5/N4)
- `npm run deploy` publish su `gh-pages`
- `npm run release` push main + deploy

## Dati open source

Per popolare il seed locale con contenuti piu ampi N5/N4, il progetto include uno script che scarica:

- vocabolario N5/N4
- kanji N5/N4
- grammatica N5/N4 con esempi

Sorgente attuale:

- `allenlu2009/japanese-learning-datasets`
- licenza MIT
- `Sigmabond01/jlpt-grammar-api`
- licenza MIT

Comando:

`npm run sync:open-seed`

Nota: al momento lo script importa significati inglesi nei campi `it` e `en` per i nuovi record open source. Inoltre scarta alcune voci rumorose non lessicali (placeholder con `～` o varianti tra parentesi) per mantenere il catalogo piu studiabile in ottica esame.

## Stack tecnico

- TypeScript + Vite
- Dexie + IndexedDB (offline/local-first)
- Quiz engine: flashcard, multiple-choice, sentence ordering, cloze
- TTS, furigana, popup hover/touch, relazioni lessicali
