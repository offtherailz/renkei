# Brief per un'altra sessione (Fable) — lavori su Renkei

Da incollare all'inizio della sessione, scegliendo **uno** dei lavori qui sotto.
Prima di tutto leggere: `CLAUDE.md` (regole del progetto), `docs/giallo-guida.md`
(motore e regole del giallo 事件), e per la storia `docs/giallo-personaggi.md`.

## Regole comuni (da rispettare sempre)

- **Commit** solo con `--author="Lorenzo Natali <offtherailz@gmail.com>"`, senza
  Co-Authored-By né attribuzioni. **Deploy solo se Lorenzo lo chiede.**
- **Test**: `npx vitest run` è tutto verde; se qualcosa fallisce, è una regressione (vedi «Test» in `CLAUDE.md`).
- **Password delle prove d'esame**: mai scritta in file, commit o memoria. Si usa
  solo in una variabile d'ambiente nel comando che cifra (`CORSO_PASSWORD=… bash corsi/prepara-prove.sh`).
  I file in `corsi/` sono privati (gitignored): niente del loro contenuto nel repo.
- **Testi giapponesi del giallo**: kanji solo N5/N4; gli altri in kana o con
  furigana `漢字[かな]` (nomi di persona e di luogo). Le parole che all'esame sono in
  kanji del livello vanno in kanji (勉強, 仕事, 少し…). わかち書き (spazi tra i gruppi).
  `{nome}` = nome del giocatore; `{o}` nell'italiano = o/a secondo il sesso.
- **Prima di ogni commit**: `npx vitest run src/lib/jiken` (tutti verdi) e
  `npx svelte-check --threshold warning` (0 errori, 0 warning).
- Una cosa alla volta, commit piccoli, messaggi in italiano come quelli esistenti.

---

## A. Missione 5

**Obiettivo**: scrivere la M5 del giallo, dopo 「美術館の じけん」 (M4, giorni 21-23).
Le missioni durano tre giorni, una a settimana (M1 giorni 0-2, M2 7-9, M3 14-16, M4
21-23): la M5 cadrebbe nei giorni 28-30, cioè 4-6 maggio, tutti festivi (Golden Week:
`FESTIVI` in `src/lib/jiken/calendario.ts`). Si può usare (una gita, niente ufficio)
o spostarla alla settimana dopo (giorni 35-37): deciderlo con Lorenzo.

**Prima**: proporre a Lorenzo la trama (5-10 righe: il caso, chi è coinvolto, gli
indizi, la soluzione) e aspettare l'ok. Idee e vincoli in `docs/giallo-guida.md`,
sezione 5 «Prossimi capitoli».

**Come**:
- File nuovo `src/lib/jiken/missioni/m5.ts` sul modello di `m4.ts`; registrarla in
  `ORDINE` (`src/routes/jiken/+page.svelte`) e nelle liste dei test.
- Ogni `obiettivo` deve avere il suo `completa`; una sola scena `ripiego: true`
  (la rete di sicurezza: il caso si chiude senza il giocatore). I test lo controllano.
- Appuntamenti: `obiettivo` con `quando: { dopo, dalle, alle }` (compare nel calendario).
- Sere: `...serata()` in testa alla cena; mattine: `...mattino()` (in `missioni/comune.ts`;
  aggiungere le voci per i giorni nuovi: famiglia, meteo con domanda d'ascolto, TG).
- Usare i personaggi secondari **dove stanno** (tabella `DOVE` in `mondo.ts`) e far
  avanzare le loro sotto-trame (stato in `docs/giallo-personaggi.md`).
- Domande d'esame nel testo (`domanda`), con `spiega`; almeno un `avviso` (情報検索).
- **Copertura**: inserire parole N4 ancora mancanti (`npm run jiken:copertura`, poi
  `docs/giallo-copertura.md`, sezione «N4 mancanti»). Rigenerare il report alla fine.
- Ritratti nuovi: dare a Lorenzo i prompt (schema in `docs/prompt-immagini.md`); le
  immagini si elaborano con `scripts/immagini/elabora.cjs` (`scarica`, `ritratto`, `bocca`).
- L'esploratore (`esploratore.test.ts`) gioca migliaia di partite a caso: deve passare.

---

## B. Testi inglesi del giallo

**Obiettivo**: riempire il campo `en` dei testi italiani del giallo, così la lingua
«English» delle impostazioni funziona (oggi ricade sull'italiano: `tr()` in `motore.ts`).

**Come**:
- Tradurre **dal giapponese**, non dall'italiano (regola in `CLAUDE.md`); l'italiano
  serve solo come riscontro.
- Dove il tipo ha già `en?` (narra, nota, obiettivo, Testo dell'interfaccia in `ui.ts`)
  aggiungerlo; dove manca (`dice`, `io`, `pensa`, opzioni, domande) aggiungere `en?: string`
  in `tipi.ts` e farlo usare dalla pagina dove oggi si mostra `it` (cercare `.it` in
  `src/routes/jiken/+page.svelte`, `SalaGiochi.svelte`, `Purikura.svelte`, `Calendario.svelte`).
- `{o}` non esiste in inglese: testi neutri.
- Un file alla volta: `ui.ts` → `mondo.ts` → `chiacchiere.ts` → `missioni/comune.ts` →
  `m1.ts` … `m4.ts`. Un commit per file.
- Test da aggiungere: ogni testo con `it` ha anche `en` (sul modello del test dei kanji).

---

## C. Spiegazioni delle prove d'esame (serve la password)

**Obiettivo**: delle 928 domande in `corsi/prove-esame-n4.renkei-course.json` solo 298
hanno `spiega`. Aggiungerla alle altre (vocabolario, grammatica, lettura), in italiano:
perché la risposta è giusta e cosa vogliono dire le opzioni sbagliate.

**Come**: modificare i sorgenti `corsi/giorno-*.py` (parametro `spiega`), poi
`CORSO_PASSWORD=… bash corsi/prepara-prove.sh` rigenera e cifra
`static/prove-esame-n4.cifrato.json`. Cominciare dalle 15 domande `jlpt-12-v-20…34`
(Lorenzo ha una trascrizione con le spiegazioni di tutte le opzioni).

(Il lavoro «prove dei libri nella sezione JLPT» è già fatto: `src/lib/data/esame-n4-libri.ts`.)
