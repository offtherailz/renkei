# Verifiche da fare sul lavoro del 17/07 (staging)

Lavoro consegnato su staging (`/renkei/staging/`, gh-pages 46f3569): 63 item curati consumati
(quiz specials, consolida parola, gioco /keigo, drill gram:*), fix frase-lista ば (seed v58),
keigo esclusi dalla coniugazione a secco. Test manuali che non ho potuto fare da questa
macchina (niente browser automatizzabile) + questioni aperte.

## Test funzionali (5-10 min)

1. **Consolida parola 自/他** — `/consolida/開ける` (o 閉める, 落とす…): in coda deve
   apparire una frasa curata «completa la frase» con spiegazione dopo la risposta.
   Domanda: la posizione in coda va bene o meglio mescolata?
2. **Quiz specials** — fare qualche quiz con carte tipo 食べる/開ける/来る attive: ogni tanto
   (bucket ~40%) deve uscire una frase curata al posto della domanda normale.
   Domanda: la frequenza percepita è giusta o dominano sulle altre specials?
3. **Gioco /keigo** — una partita intera: ~3 round su 10 sono «Completa: dal contesto capisci
   chi parla a chi» (frasi 社長は…/わたしは…). Dopo la risposta: frase intera cliccabile,
   traduzione, 💡 perché, TTS della frase intera. Mic: prova a dire la frase intera.
   Domanda: il mix 3 situazioni + 2 richieste + 3 completamenti + 2 verbi va bene?
4. **Drill costruzioni nuove** — `/consolida/gram:tsumori` e `/consolida/gram:hou-ga-ii`:
   prima non esistevano (nessun formKey), ora devono dare 1 domanda curata ciascuno.
   Domanda: drill da 1 sola domanda ha senso o va nascosto il link finché non ci sono ≥3?
   (Le altre: ta-koto-ga-aru, tai, nagara, nakereba, te-iru, kanou, sugiru.)
5. **Drill gram esistenti** — `/consolida/gram:tai` (o te-iru, kanou): la frase curata deve
   stare PRIMA delle coniugazioni generate, totale ≤6 domande.
6. **Keigo non più coniugato** — quiz/consolida con いただく/参る/召し上がる: non devono più
   uscire domande «passato di いただく?». Verificare che il gioco /keigo li usi ancora.
7. **Seed v58** — su un dispositivo già usato: le Impostazioni devono mostrare la revisione
   `2026-07-17-fix-frase-ba-v58` dopo il refresh; la voce grammar 条件形 (N4) non deve più
   avere la frase «飲めば、食べれば、すれば、来れば。» ma «この ボタンを 押せば…».

## Questioni aperte (da decidere, non bloccanti)

- **Doppio binario 自/他**: ora sulla stessa parola esistono sia `transitivity-pair` (generata)
  sia la curata. Tenerle entrambe o preferire la curata quando esiste?
- **Crediting classe**: le curate rispondono come `usage-cloze` sulla parola → alimenta
  `facet_use` della parola, NON `conj:*`/`gram:*` dal quiz. Va bene così (il gram:* si
  allena nel suo drill) o le forma-contesto dal quiz dovrebbero accreditare anche gram:*?
- **Item ください (item 23)**: corretta «ください» = scrittura della carta くださる in forma
  ます — nel quiz la scelta «ください» potrebbe confondersi con il ください richiesta.
  L'insegnante l'ha costruita bene (contesto 部長が 私に), ma da riguardare in uso.
- **止める::とめる**: l'id con `::` funziona nei link `/consolida/止める::とめる`? Testare
  la scheda e il drill dalla riga del vocabolario (encoding URL).

## Test correlati (aggiunti dopo, stessa sessione)

8. **Scheda 妻** — card «Correlati» con 奥さん (e viceversa); 兄 mostra correlati
   お兄さん/弟/姉/兄弟 e NESSUN sinonimo. お宅 → correlati 家/うち, niente più
   "sinonimi" お子さん/お嬢さん.
9. **Quiz sinonimi famiglia** — dopo seed v59 su dispositivo aggiornato: mai più domande
   «sinonimo di 兄» con risposta 弟/姉. (Le relationQuestion pescano da sinonimi ripuliti.)
   Domanda aperta: i correlati meritano una domanda propria «parola correlata ma diversa —
   qual è la differenza?» o restano solo navigazione?

## Test 20 parole nuove (seed v60)

10. **Vocabolario** — cercare 信号, スマホ, 電池, 届く: presenti col livello giusto
    (N5: スリッパ/スマホ/タオル; resto N4), 2 frasi d'esempio ciascuna.
11. **Coppie 自/他 nuove** — scheda 割れる: «Verbo correlato (transitivo)» → 割る e
    viceversa; idem 乾く↔乾かす, 動く↔動かす, 鳴る↔鳴らす, 倒れる↔倒す, 通る↔通す,
    冷える↔冷やす, 増える↔増やす, 届ける↔届く. 増える↔減る come CONTRARI. 咳 omofono 席.
12. **Quiz transitivity-pair** — con le nuove coppie attive devono uscire anche domande
    di transitività sulle nuove parole (hanno frasi + id_verbo_corrispondente).

## Test pulizia frasi aeroporto (seed v61)

13. **Vocabolario** — 宅急便はどこですか, 観光です, トイレはどこですか ecc. NON più tra
    le parole (né nei quiz SRS). In Frasi utili → «In aeroporto» ci sono anche le 3 nuove
    (申告するものはありません, これは機内持ち込みできますか, 宅急便はどこですか).
14. **Migrazione dispositivi** — su un dispositivo GIÀ usato (non fresh): dopo il refresh
    a v61 le 11 frasi spariscono dal vocabolario e dai ripassi dovuti; se avevi progresso
    su 下がる (ex 下る) o 伺う (ex うかがう) non devono esserci doppioni.
    Questione: il conteggio ripassi di oggi deve calare di conseguenza — verificare.

## Curatela relazioni N5 (seed v62) — questione aperta

15. **Scheda deittici** — ここ/そこ/あそこ/どこ ora CORRELATI (serie), non più «sinonimi»;
    sinonimi solo registro (あちら↔あっち). Keigo suppletivi → correlati del verbo piano
    (食べる cor 召し上がる/いただく). Contrasti classici → correlati (着る↔はく, 水↔湯,
    学生↔生徒, カップ↔コップ, ドア↔戸…). Nonsense rimossi (いくら sin 沢山, 弾く sin 引く,
    風 sin 風邪, お久しぶり sin 間に合う…). 女の子↔男の子 e 大きな↔小さな ora CONTRARI.
16. **⚠️ Da decidere (conflitto iikae)**: i gruppi 言い換え curati (大変≈難しい, 仕事≈働く,
    帰る≈戻る, 言う≈話す, 全部≈みんな…) vivono nel campo `sinonimi` (il gioco/test li
    richiede bidirezionali lì). Da insegnante molti sono parafrasi di FRASE più che sinonimi
    lessicali interscambiabili. Ho lasciato vincere il dataset curato (restano sinonimi).
    Se vuoi la distinzione fine: servirebbe collegare iikae ai `correlati` (cambio di
    contratto del gioco + test + guida). Decidere con calma.

## Curatela N4 + significato simile + drill (seed v63)

17. **Scheda 召し上がる/参る/おっしゃる** — il verbo piano è nei CORRELATI, non più
    «sinonimo». あげる/くれる/もらう: correlati fra loro (mai sinonimi). 彼↔彼女 contrari.
    集まる↔集める / 沸く↔沸かす / 変わる↔変える: niente più sinonimi (resta il link 自/他).
18. **Card «Significato simile (言い換え)»** — su 大変, 難しい, 帰る, 戻る, 全部…: i gruppi
    iikae stanno lì, non più tra i sinonimi. Il gioco 言い換え funziona come prima.
19. **Drill costruzioni a 3 domande** — /consolida/gram:tsumori (e hou-ga-ii, kanou,
    sugiru…): ora 3 frasi curate ciascuno.
20. **Crediting pesato** — rispondendo a una frase curata forma-contesto nel quiz:
    la parola muove il suo SRS E la costruzione gram:* guadagna pratica (visibile
    in /forme-composte col 💪%).

## Nuove attività beta (da provare)

21. **📢 Leggi a voce** (/leggi-a-voce, da Giochi → Lettura e frasi): primi 3 round con
    furigana, poi senza; 👁 li riaccende; modello TTS solo DOPO il tentativo; mic con
    confronto, senza mic autovalutazione. Da giudicare: lunghezza frasi, severità del match.
22. **✍️ Dettato** (/dettato, stesso gruppo): ascolti (もう一度/🐢) e ricomponi coi pezzi;
    soluzione mai visibile prima; esito → cella 👂 della parola della frase.
    Da giudicare: dimensione dei pezzi (budoux), difficoltà giusta?

## Triage di massa «La so già» (17/07)

23. **`/consolida`** (vocabolario) → «✓ Segna più parole come già note»: entra in modalità
    selezione (checkbox per riga, disabilitato ✓ sulle già a stage≥5), barra flottante in
    fondo con conteggio e conferma. Dopo l'applicazione: le carte selezionate passano a
    stage 5 (~7g), le già-note restano invariate (fix: `markKnown` non retrocede più chi è
    già oltre stage 5 — prima una carta a stage 7 tornava a 5 se ri-cliccata).
    Domanda: velocità/UX ok su tante selezioni (es. 100+)? Bulk write con `bulkPut`.

## Fix dal test utente 17/07 (secondo giro, da riverificare)

24. **Consolida composizione** — i pezzi ora si compongono (era l'$effect che resettava);
    «Conferma parola» funziona. Da riprovare su una parola con composizione.
25. **Consolida usage/verb-form-cloze** — dopo la risposta si sente la frase INTERA.
26. **Approfondisci** — per cloze di forma/uso mostra la frase DELLA DOMANDA (non
    un'altra frase d'esempio) + note sulle risposte sbagliate.
27. **iikae/keigo popup** — dopo la risposta, toccare le parole delle opzioni apre il
    popup (prima il disabled lo bloccava). iikae: traduzione «significato di entrambe»
    dopo la risposta (100 item tradotti). Il mismatch frase/opzioni segnalato: aggiunto
    {#key} difensivo — se ricapita, annotare la sequenza esatta.
28. **Riordina** — niente più auto-verifica all'ultimo pezzo: «Conferma» esplicita,
    e i pezzi già messi si tolgono toccandoli (non solo l'ultimo con ↩︎).
29. **Leggi a voce** — diff «Ho sentito» anche dopo l'esito + «🔁 Riprova» (punto del
    primo tentativo); niente più frasi con frecce/simboli.
30. **«📚 Metti in studio»** (ex «Non la conoscevo») nei popup delle frasi.
31. **Livello EXTRA** — 搭乗券/税関/手荷物受取所… ora badge «EX» (fuori JLPT), nuovo
    obiettivo «Lessico extra (fuori JLPT)» in home (pausabile), chip EX nel vocabolario.
    Seed v64. Domanda: altre parole da riclassificare EXTRA? Segnalale.

## Collaudo insegnante virtuale (segnato per dopo)

Agente-insegnante madrelingua che vaglia SOLO domande/contenuti/relazioni (niente UI):
- campiona domande generate (audit `AUDIT=1 npx vitest run src/lib/quiz/questionAudit.test.ts`
  → plans/question-audit-sample.md, già pronto);
- vaglia relazioni (sinonimi/contrari/自他/keigo/correlati quando ci saranno);
- output: report di note/correzioni da applicare (formato dei report di curatela esistenti).
Token-frugale: usare il file di audit come input, non l'app.
