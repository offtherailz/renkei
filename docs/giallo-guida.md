# 事件 — guida per continuare il lavoro

Questo documento serve a riprendere il gioco in un'altra sessione senza rileggere
tutta la storia della chat. Gli altri documenti:

- `docs/giallo-piano.md` — idea iniziale e lista dei casi (bozza dei capitoli futuri)
- `docs/giallo-mondo.md` — città, luoghi, motore, trama delle missioni 1-3
- `docs/prompt-immagini.md` — tutti i prompt delle immagini (Gemini, stile PC-98)

## 1. Dove sta cosa

| file | cosa |
|---|---|
| `src/lib/jiken/tipi.ts` | tipi: `Luogo`, `Personaggio`, `Condizione`, `Passo`, `Scena`, `Missione`, `Stato` |
| `src/lib/jiken/motore.ts` | logica pura: date, orari, `verifica`, `scenaPer`, `avanza`, `viaggia`, `dormi`, soldi, `migra`, `prossimaMissione` |
| `src/lib/jiken/mondo.ts` | luoghi (con punti sulla mappa, orari, scene «di ambiente»), personaggi, oggetti |
| `src/lib/jiken/missioni/m1.ts`, `m2.ts` | le missioni (solo dati) |
| `src/lib/jiken/giochi.ts`, `SalaGiochi.svelte` | sala giochi: parole dei giochi, UFOキャッチャー, クイズ, collezione, classifica |
| `src/lib/jiken/ui.ts` | testi dell'interfaccia giapponese/italiano |
| `src/lib/jiken/voce.ts` | impostazioni del giocatore, voce, nome in katakana, risposte dette a voce |
| `src/lib/jiken/suoni.ts` | suoni sintetizzati (telefono, campanello, stazione, uccellini, grilli) |
| `src/lib/jiken/Frase.svelte` | frase intera, divisa in parole solo a richiesta (✂️) |
| `src/routes/jiken/+page.svelte` | la pagina di gioco (fasi, scena, mappa, taccuino, impostazioni, salvataggi) |
| `src/lib/jiken/jiken.test.ts` | test: kanji, asset, personaggi, motore, salvataggi, giocatore automatico per M1 e M2 |
| `src/lib/core/wordLookup.ts` | `segmentaGruppo` / `analyzeSpaced`: divisione in parole dei testi con gli spazi |
| `static/giorno/` | sfondi, ritratti (`<sprite>[_<faccia>]-chiusa/parla.png`), oggetti, mappa giorno/notte |
| `scripts/immagini/` | `elabora.cjs` + `proc.html`: scarica, ritaglia, scontorna, trapianta la bocca |

## 2. Come funziona il motore

- **Stato** (`Stato`): giorno della storia (0 = lunedì 6 aprile 2026), minuti, luogo,
  soldi, `flag`, `oggetti`, `fatte` (scene già giocate), obiettivi, taccuino,
  percorso, punteggio domande, `finita`.
- **Scena** = luogo + condizione (`quando`) + elenco di passi. Entrando in un luogo
  aperto parte la **prima** scena della missione, nell'ordine del file, la cui
  condizione è vera e che non è già in `fatte` (salvo `ripeti: true`). Se non ce
  n'è nessuna parte l'`ambiente` del luogo. Finita una scena, se nello stesso
  luogo ce n'è subito un'altra (es. dopo la notte) parte quella.
- **Condizione**: `giorno` (numero o lista), `dalle`/`alle` (minuti, `alle`
  escluso), `flag`/`nonFlag`, `oggetti`/`nonOggetti`. Tutte in AND (per un OR si
  scrivono due scene).
- **Passi visibili** (aspettano il giocatore): `dice` (con `faccia`, `taccuino`,
  `suono`), `io` (tua battuta), `pensa` (pensiero), `narra` (didascalia),
  `nota` (💡 spiegazione), `scelta`, `domanda` (d'esame; `giusta: 'soldi'` = opzioni
  generate dai soldi veri; `ascolto` = 聴解: la voce legge l'annuncio, testo nascosto
  fino alla risposta), `avviso` (foglio da leggere, 情報検索/読解: `titolo`, `righe`,
  righe «voce｜valore» = tabella, `tipo` volantino/cartello/biglietto/lettera),
  `prova` (mostrare un oggetto), `fine`.
- **Passi invisibili**: `prendi`, `togli`, `flag`, `obiettivo` (id + ja + it),
  `completa`, `minuti`, `ora` (porta l'orologio almeno lì), `soldi`, `vai`,
  `dormi`, e `se` (condizione → `allora`/`altrimenti`).
- **Tempo**: spostarsi costa 15 minuti. I luoghi hanno orari. Dalle 23:00 si torna
  a casa da soli (cena se manca, poi a letto); l'orologio si ferma alle 23:59. A
  casa, senza scene, si può riposare fino alle 18, dormire (dopo le 20) o uscire.
- **Testi**: giapponese con spazi tra i gruppi (わかち書き). Kanji solo N5/N4: gli
  altri in kana, o con lettura `漢字[かな]` per nomi di persona e di luogo. Il test
  dei kanji controlla mondo, missioni e interfaccia. `{nome}` = nome del
  giocatore; `{o}` nei testi italiani = o/a secondo uomo/donna.
- **Quaderno** (📓 / 📜 nella barra in alto): pagina a righe con segnalibri —
  📜 会話 (storico dei dialoghi per giorno: faccina, nome, 🔊, 🇮🇹; si apre sul
  giorno di oggi in fondo), 🎯 やる こと (+ punteggio domande), 🎒 持ち物 (+ peluche),
  💬 大切な ことば, 👥 会った 人 (schede dei personaggi incontrati: ritratto, nome,
  lettura `yomi`, 🔊, chi è `chi`; in `stato.incontrati`, ricostruito da storico e
  taccuino per le partite vecchie), 🕐 行った 所. Un personaggio nuovo vuole `yomi` e `chi`. Lo storico si salva a parte
  (`renkei_jiken[_rigioca]_storico`, ultime 2000 battute); riprendendo da una
  mattina si tengono solo i giorni prima.
- **Scena interrotta**: a ogni passo si salva in `stato.scena` il passo mostrato e
  quelli dopo; riaprendo la partita (`riparti`) si riprende da lì. Le riprese del
  mattino la tolgono; una domanda già risposta non si ripete.
- **Salvataggi** (`localStorage`): `renkei_jiken` (partita principale),
  `renkei_jiken_rigioca` (rigioco di una missione finita), `renkei_jiken_riprese`
  (copia a ogni risveglio), `renkei_jiken_imp` (impostazioni, missioni completate), `…_storico` (dialoghi).
  Tutto passa da `migra()`; esporta/importa in ⚙️.

## 3. Come si scrive una missione

1. Copiare la struttura di `m2.ts`: `id`, `titolo`, `it`, `epilogo`, `inizio`
   (giorno di partenza e flag che la missione precedente avrebbe lasciato), `scene`.
2. Registrarla in `ORDINE` in `src/routes/jiken/+page.svelte` e in `MISSIONI` in
   `jiken.test.ts`.
3. Ogni giornata: mattina a casa (`mN-dX-casa`, flag `mN.dX.casa`), ufficio la
   mattina (compiti con domande, poi `ora: 12:00`), ufficio il pomeriggio
   (`dalle: 12:30`, compiti, `ora: 17:30` o simile), la storia nei luoghi, sera a
   casa con `cena([...domande], [dopo])` che finisce con `dormi`. L'ultima sera
   ha `fine`.
4. Flag col prefisso della missione (`m3.…`). Obiettivi con id brevi,
   `completa` quando sono fatti.
5. Evitare i blocchi: niente scena indispensabile con una finestra d'orario
   impossibile; le scene «chiave» con più giorni possibili (`giorno: [9, 10, 11]`),
   e in fondo al file una scena di chiusura a casa nei giorni dopo la fine
   (come `m1-chiusura` / `m2-chiusura`), così la missione si chiude sempre.
6. Aggiungere al test un giro del giocatore automatico che finisce la missione
   (vedi `missione 2 si può finire`).
7. Aggiungere la missione all'**esploratore** (`src/lib/jiken/esploratore.test.ts`):
   gioca 1500 partite a caso (luoghi, attese, scelte, prove, treno) e controlla
   che la missione finisca sempre entro pochi giorni, senza soldi sotto zero, orologio
   oltre mezzanotte, scene infinite o domande senza risposta. Riproduce le regole
   della pagina (scene in catena, ritorno a casa dalle 23): se cambiano lì, vanno
   cambiate anche qui. Un seme fallito si rigioca uguale.
8. Tempi: ogni giorno feriale in ufficio comincia con `arrivo()` e ogni pomeriggio con
   `rientro()` (`missioni/comune.ts`); le scene fuori casa fanno passare minuti; un
   appuntamento con l'ora di fine ha `alle`. Lo controllano i test «tempi» in
   `jiken.test.ts` e `giornata.test.ts` (giocatore diligente; `TEMPI=1` stampa la
   giornata ora per ora). Le scene `ripeti` partono solo entrando nel luogo, mai in
   catena.
9. `npx vitest run src/lib/jiken` e `npx svelte-check`, poi provare nel browser;
   `npm run jiken:copertura` per vedere quante N4 nuove porta la missione.

Pubblicare su dev (solo quando l'utente lo chiede):
`npm run build:dev` e poi
`npx gh-pages -d build --dotfiles -b gh-pages -r git@github.com:offtherailz/renkei.git --dest dev --add`.
Controllo: `https://offtherailz.github.io/renkei/dev/_app/version.json`. A volte il
deploy di GitHub Pages va in timeout: si rifà la build e si ripubblica.

## 4. La storia finora

Ritratti: 木村さん usa `capo_uomo` (sui 55 anni; il vecchio `padrone` sembrava
coetaneo della madre). Un ritratto suo dedicato si può generare più avanti.

Personaggi fissi: famiglia 吉田 (mamma, papà), 森ぶちょう (capo), 鈴木 e 田中
(colleghi), 中村 (ispettore), 高橋くん (liceale, aiuta alla scuola serale),
木村さん e sua madre (condominio), 伊藤 (caffè あおい), 山田 della ABC (cliente).

### Missione 1 — はじめての 一週間 (giorni 0-2, 6-8 aprile)

**Lunedì 6** (`d0`)
- Casa: presentazione; obiettivi `ufficio` (entro le 9) e `latte` (コンビニ, al ritorno).
- Ufficio, mattina: se arrivi dopo le 9 → 森 ti rimprovera (flag `d0.tardi`).
  Presentazione (bivio: 「よろしく おねがいします」 o 「どうも」 → nota). 鈴木
  dà la busta da spedire entro le 17 (obiettivo `posta`). 田中 invita a pranzo
  (bivio: sì → flag `d0.pranzo_tanaka`). Piani dell'edificio (domanda), dati
  nel computer entro pranzo.
- ふじ食堂 (11:30-14): pranzo, paghi in contanti (flag `d0.pranzo`).
- Posta (con la busta e il portafoglio): bivio 「送りたい」 / 「買いたい」;
  ricevuta (`ricevuta_posta`), flag `posta.ok`. Senza portafoglio: scena di
  riserva, non si può pagare.
- Ufficio, pomeriggio: telefonata di 山田 della ABC (bivio su come si risponde;
  domanda sul biglietto: richiama lui verso le 15:30), 10 copie entro domani 9:30
  (domanda), poi alle 16:30 «può andare».
- コンビニ (dalle 16): latte; bivio scontrino sì/no (`scontrino`); **perdi il
  portafoglio** senza saperlo (`togli: portafoglio`).
- Casa (dalle 16:30): latte alla mamma o no; 3 domande; si dorme.

**Martedì 7** (`d1`)
- Casa: il portafoglio non c'è; obiettivo `portafoglio`.
- Ufficio: se la busta non è spedita → 鈴木 lo ricorda. 田中: l'avevi a pranzo?
  Calendario (il venerdì della settimana dopo = 17). Pausa alle 12.
- ふじ食堂 (solo se il portafoglio manca): non c'è, l'avevi pagando.
- コンビニ: la commessa ha visto uno studente raccogliere qualcosa; obiettivo `koban`.
- 交番 (giorni 1-2): primo incontro con 中村 (bivio なくす/ひろう); domanda
  sui soldi (opzioni generate dai soldi veri); prova (ricevuta o scontrino; se
  sbagli il portafoglio torna lo stesso). Lo ha portato 高橋, scuola lun-mer-ven
  dalle 18; obiettivo `grazie`. Flag `portafoglio.ok`.
- Ufficio, pomeriggio: priorità (まず email…), email del cliente di mercoledì
  prossimo alle 10, da aspettare alle 9:50 al piano terra (ripreso nella M2),
  accordo con 田中 sul giorno.
- Casa: 2 domande.

**Mercoledì 8** (`d2`)
- Casa: idea del regalo (obiettivo `regalo`); il caffè あおい è chiuso il mercoledì.
- Ufficio: materiale da leggere, ordine dei bento (bivio pesce/carne, domanda che
  dipende dalla scelta; senza portafoglio paga 鈴木), riunione alle 17:30
  preparata da te (domanda: le sedie a te, il tè a 鈴木), avviso «il mercoledì si
  chiude entro le 18».
- パン屋 o 花屋 (se `portafoglio.ok`): regalo (`sacchetto_pane` o `mazzo_fiori`).
- 日本語学校 (mercoledì sera): ringrazi 高橋 (bivio 〜てくれて / 〜てあげて →
  correzione); se hai il regalo glielo dai (flag `regalo.dato`); flag `grazie.ok`.
- Casa: telefonata di 中村 (vuole il tuo aiuto), 3 domande, `fine`.

**Rete di sicurezza** (`m1-chiusura`): se la sera di mercoledì è saltata, da giovedì
(giorni 3-6) tornando a casa la famiglia chiude la settimana, 中村 telefona e c'è `fine`.

### Missione 2 — いなくなった ミケ (giorni 7-9, 13-15 aprile)

Parte dalla fine della 1 (`prossimaMissione`) o da sola (`inizio`: giorno 7).

**Lunedì 13**
- Casa: la mamma riferisce (〜そうよ / 〜らしい); obiettivo `kimura`.
- Ufficio: programma della settimana, 山田 mercoledì alle 10, tu alle 9:50 al
  piano terra (domanda); prenotare la sala (bivio: giorno giusto o 鈴木 arrabbiata).
- Pomeriggio: 田中 «pare sia andato al santuario», ma l'ha solo sentito dire.
- 木村アパート (dalle 17): la madre preoccupata, foto di ミケ (`foto_gatto`),
  domanda «da quando manca» (おととい); obiettivo `poster`.
- コンビニ (dopo il condominio, qualunque giorno): volantini (bivio 20 o 50
  copie), la commessa *ha visto* un ragazzo comprare cibo per gatti alle 7;
  obiettivo `poster2`.
- Casa: 2 domande (visto o sentito dire).

**Martedì 14**
- Ufficio: 森 preoccupata per 山田, «aspettalo in anticipo».
- 喫茶あおい (giorni 8-10, chiuso il mercoledì): volantino appeso; 伊藤 riferisce
  quello che ha *sentito* (〜そうです, domanda); obiettivo `parco`.
- 公園 (dopo il condominio): collare **おいて ある** sulla panchina (`collare`),
  nota てある/ている, impronte → **sblocca il 神社** (`jinja.aperto`).
- 神社 (dopo il collare): ciotole d'acqua e cibo; domanda sull'ora (le 7 di
  sera); obiettivo `sera`.
- Pomeriggio: copie del materiale sul tavolo della sala (domanda).
- Casa: 2 domande.

**Mercoledì 15**
- Ufficio prima delle 9:51 → accogli 山田 (bivio: keigo 「お待ちして おりました」
  o troppo familiare → nota). Dopo le 9:51 → 鈴木 arrabbiata, 森 preoccupata, ti
  scusi (もうしわけ ありません).
- Pomeriggio: si esce alle 18 (è mercoledì).
- 神社 (giorni 9-11, 18:30-21, con `m2.ciotola`): arriva 高橋 (sorpreso,
  imbarazzato): ha trovato ミケ ferita, tolto il collare perché きつそう (domanda),
  la nutriva lì. Si va al condominio: signora sorpresa → felice, i dolcetti
  (くれる), 木村 ringrazia. Flag `mike.ok`.
- Casa: se `mike.ok` → telefonata di 中村 («la prossima volta riguarda la tua
  ditta»), 2 domande, `fine`. Altrimenti si riprova giovedì/venerdì sera
  (scena `m2-sera-dopo`).

**Rete di sicurezza** (`m2-chiusura`): se ミケ non si trova entro venerdì, sabato o
domenica (giorni 12-13) a casa la mamma racconta che l'ha riportata qualcuno che
ha visto il volantino; flag `mike.ok` e `fine`.

### Missione 3 — 消えた 資料 (giorni 14-16, 20-22 aprile)

Parte dalla fine della 2 o da sola (`inizio`: giorno 14).

**Lunedì 20**
- Ufficio: 森 lascia il documento per 山田 sulla sua scrivania fino a mercoledì;
  la fotocopiatrice è rotta (こわれて いる, domanda こわれる/こわす); 森 chiede a
  田中 10 copie entro domattina.
- Pomeriggio: 林 (reception) porta il fax di 山田 (riunione 10:00-11:30, domanda).

**Martedì 21**
- Ufficio: il documento è sparito (森 preoccupata), arriva 中村 (pensieroso) e ti
  chiede di sentire tutti; obiettivi `tanaka`, `suzuki`, `hayashi`.
- `m3-interroga` (ufficio, giorni 15-16, 7-18, ripetibile): scegli con chi parlare.
  田中 (nervoso): «le copie in ufficio alle 7, lasciate sulla scrivania»;
  鈴木 (arrabbiata): «alle 8 sulla scrivania non c'era niente» (〜て ありません);
  林 (sorpresa): «alle 7 田中 è uscito con una busta». Sentiti tutti →
  obiettivo `magazzino`.
- `m3-magazzino` (sta prima di `m3-interroga` nel file, apposta): nel cestino lo
  scontrino «Happy Mart, 10 copie, 19:30» (`scontrino_copie`).
- Di nuovo `m3-interroga`: con lo scontrino, **prova** contro 田中 → confessa
  (imbarazzato): le copie alla コンビニ, l'originale dimenticato lì
  (〜て しまう). Flag `m3.confessa`.
- コンビニ: la commessa l'aveva messo da parte (`cartellina`).
- Ogni interrogatorio e il magazzino costano 20 minuti, la confessione 15.
- Ufficio (entro le 20): consegni a 森; 山田 sposta la riunione alla **ホテル みどり**
  davanti a 山野駅, alle 10; serve la carta IC. Obiettivi `ic`, `hotel`. Poi si torna al lavoro (fino alle 12 se è
  presto); pomeriggio `m3-d15-pomeriggio`: programma di domani (domanda), 田中 si
  scusa (〜て おきます), fine alle 17:30.
- さくら町駅 (`m3-eki-ic`): carta IC a 2000 yen (500 di cauzione, 1500 di credito
  che tornano nei soldi) → flag **`treno.ok`**: da qui il treno è sbloccato.

**Mercoledì 22**
- Treno per 山野駅 (10 minuti, 160 yen), mappa del centro, **ホテル みどり**: puntuale
  (prima delle 10:01) o in ritardo (森 preoccupata, ti scusi); 山田 ringrazia
  (bivio: 「こちらこそ、よろしく おねがいいたします」 o 「どういたしまして」 → nota).
  Riunione fino alle 11:30, poi giornata libera in centro.
- Casa: telefonata di 中村, 2 domande, `fine`.
- Rete di sicurezza `m3-chiusura` (giorni 18-20): la riunione è andata con 森 da
  sola, `treno.ok` comunque.

### Quartieri e treno

- `Luogo.quartiere`: assente = さくら町 (`sakura`), oppure `ekimae` (山野駅前). La
  mappa mostra solo i luoghi del quartiere in cui sei
  (`static/giorno/mappa/<quartiere>-giorno/notte.jpg`).
- Stazioni: `eki` (さくら町駅) ↔ `eki2` (山野駅). Sfondi diversi: さくら町 `tornelli`, 山野 `stazione` (binario grande).
  Il viaggio (`ViaggioTreno.svelte`) mostra il vagone di «Un giorno» col paesaggio
  che scorre e 2 domande ★ 文の組み立て (`CURATED_ITEMS`, a rotazione,
  `renkei_jiken_kumitate`) che contano come domande d'esame; «⏩» le salta. Con il flag `treno.ok`, nella
  scheda di una stazione compare «🚃 …へ (10分・¥160)» (`prendiTreno`).
- Luoghi del centro: `eki2`, `hotel`, `gamecenter` (per ora solo ambiente:
  «giochi in arrivo»), `depa`, `banca`, `ospedale`, `museo` (bloccato, flag
  `museo.aperto`), `ramen`.
- Dalle 23 dal centro si torna a casa in treno da soli.

### Soldi

Si parte con ¥5000; ¥50.000 di stipendio il lunedì della missione 2. Gli acquisti
controllano i soldi (`soldiMin`) e senza abbastanza «お金が たりません».

### Missione 4 — 美術館の じけん (giorni 21-23, 27-29 aprile; il 29 è 昭和の日)

Nessun colpevole: due biglietti mai letti. Forme: passivo (ぬすまれた / はこばれた /
かくされて いた), 〜て しまう. Prove: 3 fogli + 1 lettera (情報検索/読解), 1 annuncio (聴解).
- **Lunedì 27**: la ditta sponsorizza la mostra di 青木; sei il referente (かかり).
  Volantino (prezzi: 800 + 500 = 1300; lunedì chiuso ma aperto se festivo → domanda
  di 鈴木 sul 4 maggio). Flag `m4.museo` (apre il museo, chiuso il lunedì, 9:30-17).
- **Martedì 28**: dalle 12 ti mandano al museo (`m4-museo-prep`): 小林 sommerso dalla
  posta («tre giorni senza leggere lettere»), 青木 preoccupata per gli occhi del
  gatto, regolamento (きそく, cosa si può fare), l'addetto: «domani alle 7 lavo i
  pavimenti». Poi, da solo, caffè あおい: 伊藤 riferisce (〜と 言って いました).
- **Mercoledì 29**: il quadro non c'è (「ぬすまれました！」), annuncio da ascoltare,
  中村 invitato. `m4-indaga` (ripetibile): guardia (arrivata alle 9), addetto (il
  cartello davanti alla parete), 小林 (posta). `m4-cartello`: dietro il cartello il
  biglietto di 青木 (`memo_aoki`); `m4-lettera`: la lettera chiusa sulla scrivania.
  `m4-ritorno` (basta il biglietto): 青木 torna col quadro, 「はこばれて いた」,
  `museo.aperto`. Sera: 中村 al telefono, `fine`.
- Rete di sicurezza `m4-chiusura` (giorni 24-27): il giornale racconta tutto.

## 5. Prossimi capitoli: cosa è già deciso

Solo quello che è già scritto nei documenti, niente di nuovo.

- **Missione 3**: scritta (vedi sopra). Trama originale in `giallo-mondo.md`: in ufficio sparisce il
  documento per il cliente. Sospettati 田中, 鈴木, 林 (receptionist). Verità: la
  fotocopiatrice dell'ufficio era rotta (壊れて いた / 壊した), 田中 ha portato
  il documento alla コンビニ per copiarlo e l'ha dimenticato lì, poi mente
  («机の 上に 置いて おきました»); 鈴木 alle 20 non ha visto niente sul tavolo;
  lo scontrino delle fotocopie (19:30) nel cestino del magazzino; la commessa
  l'ha messo tra gli oggetti dimenticati. Finale: la riunione col cliente si
  sposta alla **ホテル みどり** vicino a **山野駅** → si sblocca il treno e il
  secondo quartiere. Forme: 自動詞/他動詞, 〜ている/〜てある/〜ておく.
  Espressioni pronte: 田中 nervoso/imbarazzato, 鈴木 arrabbiata/preoccupata,
  森 preoccupata, 林 sorpresa, 中村 pensieroso. **Manca lo sfondo della hall
  dell'hotel** (prompt `hotel` in `prompt-immagini.md`).
- **Casi 5-10** (il caso 2 del piano è diventato M4): solo titoli, luoghi e forme nella tabella di `giallo-piano.md`
  (hotel, ospedale, scuola, matrimonio, viaggio in treno, festa, il segreto del
  presidente). Nessuna trama scritta: da inventare quando si arriva lì.
- Città: 山野駅 (centro: hotel, ospedale, banca, museo), 北山野, poi 東京/京都
  col 新幹線 (vedi `giallo-mondo.md`). La mappa di destra generata con Gemini non
  combaciava: rimandata.

## 5b. Sala giochi (fatta: UFOキャッチャー e クイズ)

- Entrando in `gamecenter` (山野駅前, 10-23) senza scene della storia si apre il
  menù (`fase = 'giochi'`, componente `SalaGiochi.svelte`); la commessa
  `commessa_sg` saluta. 「外に 出る」 torna alla mappa (o a casa se sono le 23).
- Ogni partita: `pagaPartita` → ¥100 e 15 minuti; serve il portafoglio.
- Parole: `paroleGioco` dal vocabolario (Dexie, o il seed se il DB è vuoto): nomi
  N5/N4 con kanji del livello, niente doppioni di scrittura/lettura/significato;
  si preferiscono quelle coi kanji.
- **UFOキャッチャー**: 5 peluche (`PREMI`) con cartellino; la voce dice la lettura
  (🔊 もう一度, 🐢 ゆっくり); ◀ ▶ ⬇ o frecce/spazio. Preso → `stato.collezione`
  (peluche + parola, visibile anche nel taccuino). Ogni presa registra la pratica
  (`recordPractice`, giusta o sbagliata) sull'asse 👂.
- **クイズ**: lettura (parole coi kanji) o significato, 4 opzioni, 10 secondi,
  tre vite; 10 punti + secondi rimasti. Ogni risposta registra la pratica
  (📖 lettura o 💡 significato). Classifica
  `stato.classifica` (5 migliori).
- `migra` aggiunge `collezione`/`classifica` ai salvataggi vecchi; l'esploratore
  fa qualche partita a caso quando entra in sala giochi.
- Da fare se piacciono: picchiaduro delle coniugazioni (て形, potenziale,
  passivo…), ritmo coi kana stile 太鼓, プリクラ (particella giusta → adesivo).
- Altre idee approvate in coda: lavoretto (アルバイト alla コンビニ/caffè per
  guadagnare servendo col keigo e dando il resto), parole deboli dell'utente nei
  dialoghi, bacheca degli indizi / interrogatori stile 異議あり.

## 6. Cose rimaste aperte

- Pagina «La so / Non la so» (punto 1 del piano): rimandata dall'utente.
- Idee approvate da fare: **sala giochi** (minigiochi a ¥100: UFOキャッチャー, リズム,
  picchiaduro delle coniugazioni, クイズ, プリクラ), **lavoretto** (アルバイト), **parole
  deboli nella storia**, **bacheca degli indizi** / interrogatori. Immagini pronte:
  sala giochi, commessa `commessa_sg`, 17 oggetti (peluche…), grande magazzino.
- Copertura del vocabolario: `npm run jiken:copertura` (report in
  `src/lib/jiken/copertura.report.test.ts`, salta nei test normali) scrive
  `docs/giallo-copertura.md`: N5/N4 coperte, N4 nuove per missione, forme
  coniugate, parole N3 usate, token non riconosciuti, elenco delle mancanti per
  tipo. Usarlo quando si scrive una missione nuova per scegliere le parole.
- Inglese: struttura pronta (`en` facoltativo nei testi), testi non scritti.
- Pubblicato su dev e su prod (2026-11-08, build prod 1794094229113).
- **Da verificare sul telefono dall'utente**: le risposte dette al microfono
  (🎤 声で 言う) sono testate solo con frasi di prova, non con un microfono vero.
- `src/lib/core/srs.test.ts` ha un test che fallisce per una modifica dell'utente:
  non toccarlo.

## 7. Immagini

`docs/prompt-immagini.md` ha tutti i prompt. Elaborazione:

```
node scripts/immagini/elabora.cjs scarica  <link o pagina> uscita.jpg
node scripts/immagini/elabora.cjs sfondo   ingresso uscita.jpg          # → static/giorno/sfondi
node scripts/immagini/elabora.cjs ritratto ingresso uscita-chiusa.png   # → static/giorno/ritratti
node scripts/immagini/elabora.cjs ritratto ingresso uscita.png bordi     # se capelli/vestiti hanno rosa o viola
node scripts/immagini/elabora.cjs affiancata img.jpg sx.png dx.png        # chiusa|aperta nella stessa immagine
node scripts/immagini/elabora.cjs bocca    x-chiusa.png aperta.jpg x-parla.png [0.4 0.68]  # fascia della bocca se inquadrato da vicino
node scripts/immagini/elabora.cjs pieno    ritratto.png [uscita.png]                 # vestiti viola/rosa rimasti semi-trasparenti → opachi
node scripts/immagini/elabora.cjs oggetti  griglia.jpg 4 4 static/giorno/oggetti id1 id2 …
```

Le espressioni sono `<sprite>_<faccia>-chiusa.png` / `-parla.png`; nella scena:
`{ dice: 'tanaka', faccia: 'nervoso', … }`. Il test controlla che esistano.
Per la bocca aperta l'utente apre una chat nuova, allega il PNG chiuso e usa il
prompt «Exactly the same character… the ONLY change: the mouth is clearly open»;
poi `elabora.cjs bocca` copia solo la bocca (allineata) sul ritratto chiuso.
