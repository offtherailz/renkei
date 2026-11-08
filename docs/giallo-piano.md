# 事件 — visual novel gialla (piano)

Avventure → 🎮 Visual novel. Un caso alla volta, giocato a **giornate**: in
ogni giornata si investiga e si fanno anche le attività di tutti i giorni
(lavoro, spesa, appuntamenti, treno), così il vocabolario coperto cresce.
Si vince **capendo le frasi con le forme**, non riconoscendo nomi semplici.

## Regole di scrittura

- Solo parole N5/N4 del vocabolario dell'app (`static/seed-n5n4.json`), kanji
  solo N5/N4 (gli altri in kana). Eccezioni: nomi di persona e di luogo.
- Le frasi partono dagli esempi N4 già presenti (ogni parola N4 ne ha 1-3, ogni
  forma N4 i suoi): si adattano alla storia, non si inventano costrutti fuori livello.
- Nomi di persona come all'esame: 田中、山田、鈴木、木村、森、林、中村、高橋、
  小林、吉田、伊藤、佐藤; stranieri リン、キム、リー、マリア.
- Ogni caso ha una **mappa di copertura**: parole N4 nuove, forme N4, parole
  ripassate, parole fuori livello (devono essere zero). La produce uno script.

## Personaggi (fissi in tutti i casi)

| personaggio | sprite | ruolo |
|---|---|---|
| tu (nome scelto all'inizio) | — | straniero, lavora da poco alla さくら会社 e vive presso la famiglia 吉田 |
| 山本社長 | capo_uomo | presidente della ditta |
| 森部長 | capo_donna | il tuo capo diretto |
| 田中さん | collega_uomo | collega, simpatico ma distratto |
| 鈴木さん | collega_donna | collega precisa |
| 林さん | receptionist | receptionist (della ditta / dell'hotel nel caso 4) |
| 中村刑事 | ispettore | l'ispettore: ti chiede aiuto perché parli con tutti |
| 木村さん | padrone | padrone di casa del condominio |
| 小林さん | custode | custode del museo |
| 佐藤さん | amica | amica, ti invita fuori |
| リンさん / 高橋くん | studentessa / studente_uomo | studenti della scuola di giapponese serale |
| 吉田さん (お母さん / お父さん) | mamma / papa | famiglia che ti ospita |
| 伊藤さん | cameriere | 喫茶店 dove ci si incontra |
| 山田先生 | medico | medico |
| altri (commessi, farmacista…) | sprite dei luoghi | comparse |

## Struttura di un caso

3-4 giornate (lun-gio, con data). Una giornata:

1. **Mattina a casa** (famiglia 吉田) e **treno**: ripasso breve delle parole
   del caso (come i ripassi di «Un giorno»).
2. **Lavoro / attività**: 1-2 situazioni quotidiane legate al caso (riunione,
   telefonata, spesa, appuntamento al 喫茶店, posta, ospedale…).
3. **Indagine**: scene con sfondo e sospettato.
   - *Esplora*: tocchi gli oggetti (icone in `static/giorno/oggetti`).
   - *Interroga*: le frasi chiave vanno nel taccuino; tocchi una parola per
     lettura, significato e forma (dizionario dell'app).
   - *Obiezione*: presenti un indizio contro una dichiarazione.
4. **Sera**: il taccuino. Domande d'esame sulla giornata.

L'ultima giornata: **accusa** (chi, come, perché) scegliendo frasi.

## Date, giorni e orari (spesso, come all'esame)

Il caso stesso è una linea del tempo, quindi le domande vengono naturali:
- alibi: 「何時に どこに いましたか」, 「〜ている ところでした」, 「〜てから / 〜あとで」;
- appuntamenti spostati (come 課題理解): ora e luogo finali;
- calendario: 何曜日 / 何日 / 来週の〜, scadenze 〜までに;
- messaggi in segreteria, memo e email con orari da ricavare (読解 / 情報検索);
- turni, orari di apertura (museo, posta, ospedale) da incrociare con le dichiarazioni.

Almeno 3-4 domande di questo tipo per giornata.

## Il trucco del giallo: le contraddizioni sono forme

| forma | contraddizione tipo |
|---|---|
| 自動詞/他動詞, 〜ている / 〜てある / 〜ておく | «la porta era aperta» ≠ «qualcuno l'aveva aperta apposta» |
| 〜そう / 〜ようだ・みたいだ / 〜らしい / 〜そうだ (sentito dire) | il testimone ha visto o ha sentito dire? |
| 〜ている ところ / 〜ながら / 〜てから / 〜あとで / 〜までに / 〜間 | l'alibi non torna con l'orario |
| 受身形 / 使役形 / 使役受身形 / 〜てしまう | chi ha fatto cosa a chi |
| あげる / くれる / もらう e 〜てあげる… | chi ha dato l'oggetto a chi |
| 敬語 / 謙譲語 / お〜になる | con chi parlava davvero (registro) |
| 〜はず / 〜かもしれない / 〜でしょう / 〜のに / 〜ばよかった | deduzioni e rimpianti nella confessione |
| 〜たら / 〜ば / 〜なら / 〜と | «se fosse stato lì, avrebbe…» |

## I casi (bozza)

Copertura stimata: 85-90% delle 766 parole N4 e quasi tutte le 107 forme.

| # | caso | luoghi | forme principali | campi lessicali |
|---|---|---|---|---|
| 1 | 消えた 資料 (il documento sparito) | ufficio, ufficio_capo, magazzino | 自動詞/他動詞, ている/てある/ておく | lavoro, riunioni, posta, computer |
| 2 | 美術館の 事件 | museo, parco, cafe | 受身形, 〜てしまう | arte, storia, orari, biglietti |
| 3 | マンションの 音 | condominio, casa | そう/ようだ/らしい | casa, vicini, rifiuti, trasloco, guasti |
| 4 | ホテルの 忘れ物 | hotel (ufficio come sfondo), ristorante | 敬語・謙譲語・お〜になる | viaggi, prenotazioni, servizio |
| 5 | 病院の 薬 | ospedale, farmacia | 〜なければ, 〜ほうがいい, 〜てもいい | salute, corpo, medicine |
| 6 | 試験の 問題 | scuola, biblioteca | 〜かどうか, 〜ために, 〜ように | scuola, esami, studio |
| 7 | 結婚式の 指輪 | ristorante, fioraio, casa | あげる/くれる/もらう e 〜て〜 | feste, regali, famiglia |
| 8 | 旅行の 切符 | stazione, treno | 〜たら/ば/なら/と, orari | viaggi, trasporti, tempo atmosferico |
| 9 | お祭りの 夜 | parco, negozi | 使役 / 使役受身 | eventi, sport, comunità |
| 10 | 社長の 秘密 (finale) | ufficio_capo, tutti | ripasso: はず/かもしれない, のに/ばよかった | economia, decisioni, sentimenti |

Le parole difficili per te entrano per prime nei primi casi.

## Copertura: come si misura

Fatto: `npm run jiken:copertura` → `docs/giallo-copertura.md` (era previsto come `scripts/giallo-copertura.mjs`):
- legge i testi dei casi;
- trova le parole del vocabolario (stesso indice del dizionario dell'app) e le forme;
- per ogni caso: N4 nuove, N4 già viste, N5, fuori livello (errore), kanji fuori livello (errore);
- totale: N4 coperte / 766, forme coperte / 107, elenco delle mancanti.

## Tecnica

- Testi dei casi in `src/lib/jiken/casi/*.ts` (scritti da noi: possono stare nel repo).
- Motore in `src/routes/jiken/`: scene, dialoghi con voce, taccuino, indizi,
  obiezioni, domande d'esame; riusa sprite, sfondi, TTS, dizionario e il
  ripasso progressivo di «Un giorno».
- Salvataggio: a che giornata sei, indizi trovati, taccuino.

## Ordine di lavoro

1. Pagina «La so / Non la so» (parole e forme N4) → elenco delle tue parole difficili.
2. Script di copertura.
3. Motore + caso 1 completo (3 giornate) per provare le meccaniche.
4. Gli altri casi, uno alla volta, ognuno con la sua mappa.
