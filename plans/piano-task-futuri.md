# Piano unificato Renkei — stato e task futuri

Roadmap operativa. Per il design stabile delle sfaccettature (teoria, tassonomia, pattern)
vedi `architettura-sfaccettature.md` — non ripetuto qui. Piani storici assorbiti in `archivio/`.

Ogni item si consegna da solo (feature → check → build → test → **staging** → verifica →
**prod**), una cosa alla volta.

## Regola di consegna (staging PRIMA di prod)

Per OGNI item, prima del rilascio:
1. `npm run check` + `npm run build` puliti (0 errori/warning); test vitest se tocca engine/dati.
2. `npm run deploy:staging` → verifica su `/renkei/staging/` (DB isolato, nessun rischio per lo stabile).
3. Solo dopo l'OK: `npm run release` (prod) → `gh run list` conclusion `success`
   (se Pages fallisce in modo transitorio: `npm run deploy`).
4. Commit SOLO a nome utente (`--author="Lorenzo Natali <offtherailz@gmail.com>"`), mai Co-Authored.

---

## Stato attuale (17/07/2026 — handoff di sessione)

**FATTO (commit su main, staging deployato con tutto, PROD MAI deployata in questa sessione):**
- Blocco A completo (punteggio quiz per classe/particella/contatore, sfaccettature Nation,
  drill consolida, spoken-production) — dettaglio in `architettura-sfaccettature.md`.
- `gram:*` per costruzioni: credito da conjugation/verb-form-cloze/frasi curate, drill
  `/consolida/gram:<slug>` (funziona anche senza formKey, es. tsumori/hou-ga-ii).
- Blocco F: F1 (ripasso deboli nel quiz vero), F2/F3 (La so già/Rimanda/Seppellisci).
- Giochi/avventure → `recordPractice(entità, esito, cella)` generalizzato.
- **63 domande curate** (poi 81 con le 18 aggiunte forma-contesto) in
  `src/lib/data/propedeutiche-n5n4.json` + `propedeutiche.ts`: tutte agganciate a
  parola-carta/gram, consumate da quiz specials, consolida, gioco /keigo, drill gram.
- Relazioni: **`correlati`** (legati, non interscambiabili — 妻↔奥さん, keigo↔piano) e
  **`parafrasi`** (「significato simile」 言い換え, equivalenti di frase) distinte dai
  sinonimi veri. Curatela insegnante applicata: 229 voci N5+N4 vagliate (deittici, keigo,
  contrasti classici → correlati; nonsense rimossi).
- 20 parole nuove + partner 自/他 collegati bidirezionali; frasi-aeroporto tolte dal mazzo
  SRS (Frasi utili); `applySeedMigrations` per pulire i dispositivi da voci rinominate/rimosse.
- Pagine annidate `/forme/[slug]` (indice snello + scheda esaustiva, componente `FormCard`).
- RSVP lettura veloce pesato per kanji (2.2x); toggle furigana globale (fase 1); rename
  «Gioca e vivi» → «Attività».
- **Due nuove attività beta**: 📢 Leggi a voce (`/leggi-a-voce`), ✍️ Dettato (`/dettato`).
- Strumenti: `scripts/teacher-digest.mjs` (shortlist compatte per curatela senza rileggere
  il seed), simulatore SRS multi-giorno (`srsSimulation.test.ts`), avanza-giorno in-app
  (`?dev=1` in Impostazioni).
- Bug: B1 (くれる full-kana) verificato chiuso, B2 (formLabel rivelante) mitigato, B4
  (回る/回す split) fatto.

Seed a **v63**. Ultimo deploy staging: `82eec87` (18/07: task 5 Avverbi, task 6
Choukai «perché», task 7 catene 使役/受身 + frasi d'esempio — tutti su staging, PROD MAI).

---

## Task futuri (ordine ragionevole)

1. ✅ (17/07) **Triage di massa «La so già»** — `/consolida`: modalità selezione multipla,
   checkbox per riga (disabilitata se già a stage≥5), barra flottante di conferma, `bulkPut`
   su `srs_progress`. Fix collegato: `markKnown` non retrocede più una carta già oltre
   stage 5 (bug latente anche sul bottone singolo in scheda).
2. ✅ (17/07) **Completamento piano di oggi** — spunte giornaliere (ripassi auto quando
   «tutto fatto», punti deboli a sessione deboli completata, attività all'apertura),
   contatore X/N nel titolo. Flag in localStorage (`dailyPlan.ts`), reset a mezzanotte.
2b. **Riordina drag&drop** (plus richiesto): oltre a tocca-aggiungi/tocca-togli, trascinare
   i pezzi. E valutare l'estrazione di un componente TokenCompose condiviso
   (quiz composition + dettato + riordina usano lo stesso pattern, oggi triplicato).
2c. **Lista «in studio»** (richiesta utente): elenco gestibile della roba messa in studio
   (da «📚 Metti in studio»/triage) per aggiungere/togliere in massa. Da progettare:
   oggi le voci finiscono nei punti deboli (lapses>0); serve distinguere «scelte
   dall'utente» vs «sbagliate», forse un flag dedicato sulla riga SRS.
2d. **iikae mismatch** (segnalato, non riprodotto): frase di un item con opzioni di un
   altro. Aggiunto {#key idx} difensivo; se ricapita servono i passi esatti.
3. **Domanda sui correlati** (ok utente, dopo): «qual è la differenza tra 妻 e 奥さん?» —
   accredita ENTRAMBE le parole della coppia (doppio incremento). Distrattori = descrizioni
   della differenza. Da progettare.
4. **Pagine annidate /particelle/[slug]** — stesso schema di `/forme/[slug]`, non ancora fatto.
5. ✅ (18/07) **🎚️ Avverbi (副詞) allenabili** (/avverbi, beta) — cloze in frase:
   l'avverbio è cancellato dalla sua frase d'esempio, si sceglie fra 4 avverbi;
   dopo la risposta frase intera cliccabile (InteractiveSentence), traduzione, TTS.
   Credito su `word:<id>` facet_use (🧩). Link in /giochi + /guida.
6. ✅ (18/07) **Choukai: copione finale ricco** — ogni domanda nel recap spiega
   il «perché» (💡): ripensamento «やっぱり» (conta l'ultima decisione), esca stesso
   tipo, o diretta — calcolato in `instantiateListening` dalla struttura, cita
   sempre la risposta giusta. Aggiunto «▶️ Tutto il dialogo». Le singole frasi già
   riascoltabili (🔊) e cliccabili. Test esteso.
7. ✅ (18/07) **🧬 Catena di forme** (/catena, beta): 5 catene a 2 passi (可能→ない/た,
   たい→くない/かった, て→ている), catena visuale, senso it, credito conj:*+gram:*.
   ✅ (18/07) Estensioni: **frasi d'esempio curate** per ogni catena (giapponese vero
   + it + TTS, «come nella frase»); catene **使役形→negativa** e **受身形→passato**
   (passivo ristretto ai godan, così られる ≠ potenziale ichidan).
   Ancora possibile: catene a 3 passi (られたくない) — richiede uno step3 nel Round.
8. **Toggle kanji on/off** (idea utente) — grosso, tocca il rendering ovunque. Valutare
   se/quando; segnato, non urgente. I kanji N1 in parole N5 restano com'è per ora.
9. **Microfono: permessi e degradazione** — su http non-localhost l'API non c'è (serve
   secure context); serve `navigator.permissions.query`, messaggi chiari, try/catch attorno
   a `listenJapanese`, `speechAvailable()` deve controllare `window.isSecureContext`.
10. **Furigana fase 2** (dati) — annotare le frasi d'esempio delle parole riusando il
    matcher frase→parole del pipeline; mai furigana indovinata da letture ON/kun ambigue.
11. ✅ (17/07) **B3 chiuso** (giudizio insegnante inline): 都合≠便利 (nessuna relazione:
    都合がいい = circostanze, 便利 = comodo-strumento); 申し上げる già cor 言う/申す;
    出発(する) cor 出る; 親切 sin 優しい confermato; 例 non in catalogo (niente da fare);
    壁 kanji N1 coperto dalla policy kanji avanzati.
12. **Collaudo insegnante** — ✅ ciclo 17-18/07 completo INLINE (niente agente): relazioni
    N5+N4 vagliate (238 curate + 238 arricchite), unlinked-pairs sano, B3 chiuso, audit
    domande 2° giro (report `2026-07-18-audit-domande-2.md`: qualità ok, fix percorso
    applicato). Restano da fare quando capita: fix verb-form senza vincolo temporale
    (punto 2 del report), distrattori stessa-POS nel multiple-choice (punto 4),
    distrattori transitivity più puliti (punto 3).
13. **Doppio binario 自/他** — sulla stessa parola escono sia la domanda generata sia la
    curata. Deciso: tenere entrambe le fonti; se in futuro c'è doppione visibile in sessione,
    vince la curata.
14. **Blocco D2/D3/E** (dialoghi/corsi): navigazione arricchita in `detail`, condivisione
    bundle via URL, caricamento lezioni insegnante (grande, da progettare — non per
    non-tecnici allo stato attuale).

## Verifiche pendenti

Checklist completa in `2026-07-17-verifiche-propedeutiche.md` (22 punti + questioni aperte).
**Prod aspetta l'OK dell'utente dopo queste verifiche.**
