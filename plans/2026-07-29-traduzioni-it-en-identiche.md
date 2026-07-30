# Traduzioni IT identiche all'EN — audit 29/07, COMPLETATO 30/07

Trovate esplorando i 3 casi falliti di overrides.test.ts (変わる, 見る): erano il
sintomo visibile di un problema molto più grande — frasi d'esempio nel seed con
il campo `traduzione.it` identico byte-per-byte a `traduzione.en`: inglese copiato
come segnaposto, mai davvero tradotto in italiano (viola la regola in CLAUDE.md:
«traduzioni italiane sempre dal testo giapponese, mai dall'inglese intermedio»).

## Stato finale: 0 frasi rimaste (parole + grammatica), tutte tradotte il 30/07

Partite da **725 parole** + **154 grammatica** = 879 frasi totali con IT=EN.
Tradotte tutte, dal giapponese, in 9 lotti nell'arco della sessione del 30/07
(lotti 1-8 sulle parole + 1 lotto sulla grammatica). `npx vitest run` verde,
`npm run check`/`npm run build` puliti a ogni lotto. SEED_REVISION arrivata a v83.

## Causa radice (non ancora risolta nello script)

Non è solo dato vecchio: è un bug ATTIVO nella pipeline. In
`scripts/sync-open-source-seed.mjs`, `applyJmdictMetadata` (riga ~987) genera le
frasi d'esempio dai dati Tatoeba dentro JMdict così:

```js
frasi_esempio: examples.map((ex) => ({ testo: ex.jp, traduzione: { it: ex.en, en: ex.en } }))
```

JMdict/Tatoeba dà solo giapponese+inglese, mai italiano: lo script mette l'inglese
anche nel campo `it` come segnaposto — silenziosamente, senza flag. **Se in futuro
gira di nuovo `npm run sync:open-seed` su parole NUOVE non ancora overridate, il
problema si ripresenta per quelle.** Non risolto nello script stesso (richiede
decidere come segnalare "da tradurre" senza rompere i test sull'IT non vuoto) —
da tenere a mente se si aggiungono parole nuove al catalogo aperto.

## Bonus: altri bug scoperti sistemando i lotti (30/07)

- 3 coppie casual/formale delle dimostrative (あっち/あちら, こっち/こちら,
  そっち/そちら) condividevano la stessa frase scritta per la forma formale.
- ~14 frasi con IT=EN avevano in realtà l'ITALIANO copiato anche in EN (bug
  nella direzione opposta, da vecchie sessioni di curatela "ondata 1-4"): sistemate
  dando una vera traduzione inglese.
- Mismatch parola/esempio scoperti e corretti: あげる (挙げる invece di "dare"),
  登る (上る), 内 (中, parola diversa non solo variante), 暖かい (温かい, kanji
  diverso stessa lettura ma senso diverso: meteo vs persona).
- Forma numerica sbagliata (cifre piene invece del kanji del contatore testato):
  一人, 九日, 五日, 二日, 三日, 四日.
- Virgolette di fine frase che rompevano la punteggiatura richiesta dal test:
  どうぞ, 十分, 全然, 程, 好き, e alcuni esempi grammaticali.
- Frasi grammaticali "segnaposto" (descrizione della forma invece di una vera
  frase tradotta) sulle liste di forme verbali (volitiva, potenziale, causativa,
  causativa-passiva, passiva, imperativa: grammar-api-N4-{10,11,14,15,16,17}) e
  una frase rotta/duplicata (grammar-api-N4-34, sostituita con un esempio pulito).

## Come si è fatto (per la prossima volta)

Per ogni lotto: script Python che legge `static/seed-n5n4.json`, applica un
dizionario testo→traduzione SOLO dove `it === en` (per non toccare nulla già
sistemato), scrive sia il seed sia `scripts/data/word-overrides.json` /
`grammar-overrides.json` (per le parole/grammatiche senza ancora un override,
prende l'INTERO array `frasi_esempio` aggiornato — gli array negli override
SOSTITUISCONO, non si fondono). Poi `npx vitest run src/lib/data/overrides.test.ts`
per scoprire eventuali frasi con mismatch parola/esempio o punteggiatura rotta
(la copertura dei test si allarga automaticamente man mano che si aggiungono
override nuovi — è così che sono emersi quasi tutti i bonus qui sopra).
