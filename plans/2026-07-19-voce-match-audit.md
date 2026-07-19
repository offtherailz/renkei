# Audit match vocale — punti a rischio «trascrizione scritta ≠ variante attesa»

Classe di bug (fixata nei read-games, `bf396fc`): il riconoscitore trascrive ciò
che dici nella **forma scritta** (ここのか→«9日», わたし→«私», えきのまえ→«駅の前»),
ma il match confronta solo con la forma memorizzata nei dati. `normalizeSpeech`
converte kanji-numeri→cifre e katakana→hiragana, **non** kanji-parole↔kana (solo i
saluti hardcoded in `SET_PHRASE_KANJI`).

Regola: rischio ALTO dove la variante attesa è **solo kana** (il riconoscitore
scriverà kanji/cifre); OK dove i dati portano **entrambe** le forme (jp+yomi).

## 🔴 ALTO — probabilmente rotti, da testare subito

1. **🚗 Mani libere — round choukai** (`mani-libere`, varianti = solo la scelta corretta)
   - Le risposte choukai N5 sono kana: dire «さんじ» → trascritto «3時» → sbagliato.
   - Test: round choukai con domanda oraria; rispondi a voce l'ora giusta.
   - Idem con luoghi kana: «えきのまえ» → «駅の前» → sbagliato.

2. **📢 Leggi a voce** (`leggi-a-voce:113`, varianti = solo `plain`)
   - Frasi N5 kana-spaziate: attesa «わたしは がくせいです», trascritto «私は学生です» → sbagliato.
   - Le frasi N4 (kanji) dovrebbero invece funzionare.
   - Test: round con frase N5 tutta in kana, leggila bene → verifica esito.

3. **⏰ Che ore sono? / giochi numerici in ALTRI punti** — fixati SOLO in /giochi read.
   Il quiz «spoken-production» non tratta numeri (parole), ok; ma qualunque futuro
   uso vocale su orari/date deve riusare `writtenVariants`.

## 🟡 MEDIO — dipende dalla trascrizione, test mirato utile

4. **🙇 Keigo — round «verbo»** (`keigo:134`, `phraseVariants(corretta)`)
   - Opzioni in kanji (召し上がりましたか) → di solito il riconoscitore scrive lo
     stesso kanji → ok. Rischio su forme che trascrive diversamente (お目にかかります
     → «お目に掛かります», 伺います→«うかがいます»).
   - Test: round verbo con 伺います e con お目にかかります.

5. **�greet Presentati / Shigoto / Ristorante scelte** (`presentati:71`, `shigoto:98`,
   `ristorante:162`) — varianti = solo la frase com'è scritta nei dati.
   - Se la frase è mista kanji standard → ok; se contiene kana dove il riconoscitore
     preferisce kanji (よろしくおねがいします scritto senza kanji nei dati? coperto da
     SET_PHRASE) → per lo più ok, ma da provare 2-3 round a voce.

6. **🗓️ Appuntamento / dettato numeri** (input digitato, non vocale) → non affetti.

## 🟢 OK by design (dati con entrambe le forme)

- **Quiz spoken-production**: `expectedWriting` + `expectedReading` ✓
- **Consolida frase utile / Frasi utili / Shadowing**: `jp` + `yomi` + varianti ✓
- **Kaimono ordine**: scrittura + lettura + qty in kanji/cifre/kana ✓
- **Treno**: nome + lettura ✓
- **Giornata (saluti)**: coperti da `SET_PHRASE_KANJI` ✓
- **Mani libere — round frasi utili**: jp + yomi ✓ (solo il round choukai è a rischio)
- **Read-games /giochi**: fixati con `writtenVariants` (bf396fc) ✓

## Fix proposti (quando confermati dai test)

- **Mani libere choukai**: convertitore kana→scritto per orari/giorni (さんじ→3時,
  くじはん→9時半, ここのか→9日) da aggiungere alle varianti; per i luoghi kana
  servirebbe la forma kanji nei dati dei dialoghi (aggiungibile come campo).
- **Leggi a voce N5**: kana-izzare la trascrizione (tokenizer + indice
  scrittura→lettura di `wordLookup`) o generare la variante kanji dalla frase
  annotata quando esiste. In alternativa: per le frasi kana accettare
  l'autovalutazione come esito primario.
- **Generale**: estendere `normalizeSpeech` con numerali kana (いち/に/さん…+じ/にち/ふん)
  → cifre, così tutte le superfici numeriche convergono.
