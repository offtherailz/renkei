# Domande propedeutiche curate — report (17/07/2026)

Proposte di domande "chiuse dal contesto" per i generatori del quiz, al posto delle
frasi generiche. Fonti: `static/seed-n5n4.json` (words, grammar), `src/lib/core/keigo.ts`
(KEIGO_VERBS), `src/lib/data/particleGuide.ts`. Principio guida: in ogni item c'è UN
indizio (particella, soggetto onorato, struttura grammaticale) che rende la risposta
corretta l'unica possibile e i distrattori grammaticalmente impossibili — non solo strani.

Convenzioni: N5 kana-spaziato semplice, N4 con kanji; `perche` ≤ 15 parole e cita
l'indizio; verbi corretti e distrattori presi SOLO dal catalogo (verificati via script);
i nomi di contorno sono N5 di catalogo o già usati nelle frasi del seed (お湯, ろうそく…).

---

## 1. Scegli il verbo giusto (transitivo/intransitivo/keigo)

### 1a. Coppie 自/他 — la particella decide

```json
{"tipo":"verbo-contesto","frase_con_buco":"かぜで ドアが ＿＿。","corretta":"開きました","distrattori":["開けました","閉めました"],"perche":"が + evento spontaneo (il vento): serve l'intransitivo 開く; 開ける e 閉める vogliono を.","traduzione_it":"La porta si è aperta per il vento."}
```

```json
{"tipo":"verbo-contesto","frase_con_buco":"さむいので、まどを ＿＿ ください。","corretta":"閉めて","distrattori":["閉まって","開いて"],"perche":"を + richiesta a una persona: transitivo 閉める; 閉まる/開く sono intransitivi.","traduzione_it":"Fa freddo, chiudi la finestra per favore."}
```

```json
{"tipo":"verbo-contesto","frase_con_buco":"きゅうに へやの でんきが ＿＿。","corretta":"消えました","distrattori":["消しました","つけました"],"perche":"が senza agente: intransitivo 消える; 消す e つける chiedono を.","traduzione_it":"All'improvviso la luce della stanza si è spenta."}
```

```json
{"tipo":"verbo-contesto","frase_con_buco":"くらいですね。でんきを ＿＿ましょう。","corretta":"つけ","distrattori":["つき","消え"],"perche":"を → transitivo つける; 点く e 消える sono intransitivi, impossibili con を.","traduzione_it":"È buio, eh. Accendiamo la luce."}
```

```json
{"tipo":"verbo-contesto","frase_con_buco":"お湯が ＿＿ら、お茶を いれます。","corretta":"沸いた","distrattori":["沸かした","入れた"],"perche":"お湯が = soggetto spontaneo: 沸く; 沸かす/入れる transitivi vogliono を.","traduzione_it":"Quando l'acqua bolle, preparo il tè."}
```

```json
{"tipo":"verbo-contesto","frase_con_buco":"じゅぎょうは 九時に ＿＿。","corretta":"始まります","distrattori":["始めます","開けます"],"perche":"Soggetto は senza agente né を: intransitivo 始まる.","traduzione_it":"La lezione comincia alle nove."}
```

```json
{"tipo":"verbo-contesto","frase_con_buco":"会議を 三時に ＿＿ましょう。","corretta":"始め","distrattori":["始まり","決まり"],"perche":"会議を → transitivo 始める; 始まる/決まる sono intransitivi.","traduzione_it":"Cominciamo la riunione alle tre."}
```

```json
{"tipo":"verbo-contesto","frase_con_buco":"ポケットから さいふが ＿＿。","corretta":"落ちました","distrattori":["落としました","無くしました"],"perche":"さいふが = cade da solo: 落ちる; 落とす/無くす vogliono を.","traduzione_it":"Il portafoglio è caduto dalla tasca."}
```

```json
{"tipo":"verbo-contesto","frase_con_buco":"たいせつな かぎを ＿＿ しまいました。","corretta":"落として","distrattori":["落ちて","見つかって"],"perche":"を → transitivo 落とす; 落ちる/見つかる sono intransitivi.","traduzione_it":"Ho perso (fatto cadere) una chiave importante."}
```

```json
{"tipo":"verbo-contesto","frase_con_buco":"熱が ＿＿ら、学校に 行っても いいですよ。","corretta":"下がった","distrattori":["下げた","上げた"],"perche":"熱が = scende da sola: 下がる; 下げる/上げる transitivi vogliono を.","traduzione_it":"Quando la febbre sarà scesa, potrai andare a scuola."}
```

```json
{"tipo":"verbo-contesto","frase_con_buco":"テレビの おとを ＿＿ ください。","corretta":"下げて","distrattori":["下がって","上がって"],"perche":"を + richiesta: transitivo 下げる; 下がる/上がる sono intransitivi.","traduzione_it":"Abbassa il volume della TV, per favore."}
```

```json
{"tipo":"verbo-contesto","frase_con_buco":"なくした かさが ＿＿。","corretta":"見つかりました","distrattori":["見つけました","探しました"],"perche":"かさが = ritrovato da sé: 見つかる; 見つける/探す vogliono を.","traduzione_it":"L'ombrello che avevo perso è saltato fuori."}
```

```json
{"tipo":"verbo-contesto","frase_con_buco":"駅前で 安くて いい 店を ＿＿。","corretta":"見つけました","distrattori":["見つかりました","できました"],"perche":"店を → transitivo 見つける; 見つかる/できる non reggono を.","traduzione_it":"Davanti alla stazione ho trovato un buon negozio economico."}
```

```json
{"tipo":"verbo-contesto","frase_con_buco":"バスが ＿＿ います。はやく のって ください。","corretta":"止まって","distrattori":["止めて","開けて"],"perche":"バスが fermo da sé: 止まる; 止める/開ける transitivi vogliono を.","traduzione_it":"L'autobus è fermo. Sali, presto!"}
```

```json
{"tipo":"verbo-contesto","frase_con_buco":"ここに 車を ＿＿も いいですか。","corretta":"止めて","distrattori":["止まって","並んで"],"perche":"車を → transitivo 止める; 止まる/並ぶ sono intransitivi.","traduzione_it":"Posso parcheggiare qui la macchina?"}
```

```json
{"tipo":"verbo-contesto","frase_con_buco":"かべに 絵が ＿＿ います。","corretta":"かかって","distrattori":["掛けて","貼って"],"perche":"絵が = stato risultante: intransitivo かかる; 掛ける/貼る vogliono を.","traduzione_it":"Alla parete è appeso un quadro."}
```

```json
{"tipo":"verbo-contesto","frase_con_buco":"エレベーターが ＿＿ いるので、階段で 行きます。","corretta":"壊れて","distrattori":["壊して","直して"],"perche":"エレベーターが + stato: 壊れる; 壊す/直す transitivi vogliono を.","traduzione_it":"L'ascensore è guasto, quindi vado per le scale."}
```

```json
{"tipo":"verbo-contesto","frase_con_buco":"弟が たいせつな コップを ＿＿ しまいました。","corretta":"壊して","distrattori":["壊れて","割れて"],"perche":"コップを → transitivo 壊す; 壊れる/割れる sono intransitivi.","traduzione_it":"Mio fratello minore ha rotto una tazza importante."}
```

### 1b. Piano vs keigo — il registro e il soggetto decidono

```json
{"tipo":"verbo-contesto","frase_con_buco":"社長は 何時ごろ 会社に ＿＿ますか。","corretta":"いらっしゃい","distrattori":["参り","おり"],"perche":"Soggetto onorato (社長) → 尊敬語 いらっしゃる; 参る/おる sono umili, per sé.","traduzione_it":"A che ora arriva in azienda il presidente?"}
```

```json
{"tipo":"verbo-contesto","frase_con_buco":"わたしは 来週、大阪の 本社に ＿＿ます。","corretta":"参り","distrattori":["いらっしゃい","なさい"],"perche":"Parlo di me → 謙譲語 参る; いらっしゃる/なさる onorano il soggetto, impossibili su di sé.","traduzione_it":"La settimana prossima andrò io alla sede centrale di Osaka."}
```

```json
{"tipo":"verbo-contesto","frase_con_buco":"先生は もう 昼ご飯を ＿＿ましたか。","corretta":"召し上がり","distrattori":["いただき","拝見し"],"perche":"Soggetto onorato (先生) → 尊敬語 召し上がる; いただく è umile, 拝見する è \"guardare\".","traduzione_it":"Professore, ha già pranzato?"}
```

```json
{"tipo":"verbo-contesto","frase_con_buco":"きのう、部長に お菓子を ＿＿ました。","corretta":"いただき","distrattori":["くださり","召し上がり"],"perche":"Ricevo io da un superiore → 謙譲語 いただく; くださる vorrebbe 部長が come soggetto.","traduzione_it":"Ieri ho ricevuto dei dolci dal capoufficio."}
```

```json
{"tipo":"verbo-contesto","frase_con_buco":"部長が 私に お土産を ＿＿ました。","corretta":"ください","distrattori":["いただき","差し上げ"],"perche":"Soggetto が è il superiore che dà a me → くださる; いただく/差し上げる hanno soggetto umile.","traduzione_it":"Il capoufficio mi ha dato un souvenir."}
```

```json
{"tipo":"verbo-contesto","frase_con_buco":"はじめまして。田中と ＿＿ます。","corretta":"申し","distrattori":["おっしゃい","なさい"],"perche":"Mi presento (parlo di me) → 謙譲語 申す; おっしゃる onora il soggetto.","traduzione_it":"Piacere, mi chiamo Tanaka."}
```

```json
{"tipo":"verbo-contesto","frase_con_buco":"お客様が そう ＿＿ました。","corretta":"おっしゃい","distrattori":["申し","致し"],"perche":"Soggetto onorato (お客様) → 尊敬語 おっしゃる; 申す/致す sono umili.","traduzione_it":"Il cliente ha detto così."}
```

```json
{"tipo":"verbo-contesto","frase_con_buco":"お手紙を ＿＿ました。ありがとうございました。","corretta":"拝見し","distrattori":["ご覧になり","召し上がり"],"perche":"Guardo io una cosa del cliente → 謙譲語 拝見する; ご覧になる onora il soggetto.","traduzione_it":"Ho letto la sua lettera, grazie."}
```

```json
{"tipo":"verbo-contesto","frase_con_buco":"社長は 今、新聞を ＿＿ います。","corretta":"ご覧になって","distrattori":["拝見して","申して"],"perche":"Soggetto onorato (社長) → 尊敬語 ご覧になる; 拝見する/申す sono umili.","traduzione_it":"Il presidente sta leggendo il giornale."}
```

```json
{"tipo":"verbo-contesto","frase_con_buco":"あした 三時に お宅に ＿＿ます。","corretta":"伺い","distrattori":["いらっしゃい","ご覧になり"],"perche":"Vado io dal cliente → 謙譲語 伺う; いらっしゃる onorerebbe me stesso.","traduzione_it":"Domani alle tre verrò io a casa sua."}
```

```json
{"tipo":"verbo-contesto","frase_con_buco":"（al telefono, a un cliente）田中は ただいま 外に 出て ＿＿ます。","corretta":"おり","distrattori":["いらっしゃい","なさい"],"perche":"Con un cliente, del proprio collega si parla in forma umile → おる.","traduzione_it":"Tanaka al momento è fuori (le rispondo io)."}
```

**Totale sezione 1: 29 item** (18 coppie 自/他, 11 keigo). Il campo `corretta` è la parte
coniugata che riempie il buco; per il consolidamento, la parola-carta da linkare è il
dizionario del verbo (開く-あく, 閉める, 消える, つける, 沸く, 始まる, 始める, 落ちる, 落とす,
下がる, 下げる, 見つかる, 見つける, 止まる, 止める::とめる, かかる, 壊れる, 壊す,
いらっしゃる, 参る, 召し上がる, いただく, くださる, 申す, おっしゃる, 拝見する,
ごらんになる, 伺う, おる) — tutti presenti nel seed.

---

## 2. Particelle con usi mirati

Un item per ciascun uso importante di に/で/を/へ/から/まで/と (dal `particleGuide`),
costruito perché UNA SOLA particella sia possibile. Distrattori scelti tra particelle
grammaticalmente impossibili in quella frase: dove un'alternativa sarebbe difendibile
(に/へ per la destinazione, に per l'orario di 始まる…) NON è mai tra i distrattori.

### に

```json
{"tipo":"particella-uso","frase_con_buco":"つくえの 上＿ ねこが います。","corretta":"に","distrattori":["で","を"],"perche":"います = esistenza → に; で segna il luogo di un'AZIONE.","traduzione_it":"Sulla scrivania c'è un gatto."}
```

```json
{"tipo":"particella-uso","frase_con_buco":"ぎんこうは 駅の となり＿ あります。","corretta":"に","distrattori":["で","へ"],"perche":"あります = esistenza/posizione → に; で e へ sono impossibili qui.","traduzione_it":"La banca è accanto alla stazione."}
```

```json
{"tipo":"particella-uso","frase_con_buco":"毎朝 七時＿ 起きます。","corretta":"に","distrattori":["で","を"],"perche":"Orario preciso (七時) → に; で/を con l'ora qui sono impossibili.","traduzione_it":"Ogni mattina mi alzo alle sette."}
```

```json
{"tipo":"particella-uso","frase_con_buco":"友だち＿ 手紙を 書きます。","corretta":"に","distrattori":["を","で"],"perche":"Destinatario dell'azione → に; を è già preso dall'oggetto 手紙.","traduzione_it":"Scrivo una lettera a un amico."}
```

```json
{"tipo":"particella-uso","frase_con_buco":"駅で でんしゃ＿ 乗ります。","corretta":"に","distrattori":["を","で"],"perche":"乗る vuole に (ci si sale SOPRA); を si usa con 降りる.","traduzione_it":"Alla stazione salgo sul treno."}
```

### で

```json
{"tipo":"particella-uso","frase_con_buco":"としょかん＿ べんきょうします。","corretta":"で","distrattori":["に","を"],"perche":"Luogo dove si FA un'azione → で; に è per esistenza/arrivo.","traduzione_it":"Studio in biblioteca."}
```

```json
{"tipo":"particella-uso","frase_con_buco":"バス＿ 学校に 行きます。","corretta":"で","distrattori":["に","と"],"perche":"Mezzo di trasporto → で; バスに 行きます è impossibile.","traduzione_it":"Vado a scuola in autobus."}
```

```json
{"tipo":"particella-uso","frase_con_buco":"かぜ＿ 学校を 休みました。","corretta":"で","distrattori":["を","と"],"perche":"Causa (malattia) → で; を è già preso da 学校.","traduzione_it":"Sono stato a casa da scuola per il raffreddore."}
```

```json
{"tipo":"particella-uso","frase_con_buco":"あした、学校＿ パーティーが あります。","corretta":"で","distrattori":["に","を"],"perche":"ある di un EVENTO usa で; に è solo per l'esistenza di cose.","traduzione_it":"Domani a scuola c'è una festa."}
```

### を

```json
{"tipo":"particella-uso","frase_con_buco":"毎朝 コーヒー＿ 飲みます。","corretta":"を","distrattori":["が","に"],"perche":"Oggetto diretto di un transitivo (飲む) → を.","traduzione_it":"Ogni mattina bevo il caffè."}
```

```json
{"tipo":"particella-uso","frase_con_buco":"はし＿ わたって、みぎに まがって ください。","corretta":"を","distrattori":["に","まで"],"perche":"Luogo attraversato con verbo di movimento (渡る) → を.","traduzione_it":"Attraversa il ponte e gira a destra."}
```

```json
{"tipo":"particella-uso","frase_con_buco":"つぎの 駅で でんしゃ＿ 降ります。","corretta":"を","distrattori":["に","まで"],"perche":"降りる vuole を (luogo da cui si scende); に si usa con 乗る.","traduzione_it":"Scendo dal treno alla prossima stazione."}
```

### へ

```json
{"tipo":"particella-uso","frase_con_buco":"これは 日本の 友だち＿の プレゼントです。","corretta":"へ","distrattori":["に","で"],"perche":"Davanti a の solo へ marca il destinatario: にの non esiste.","traduzione_it":"Questo è un regalo per il mio amico in Giappone."}
```

### から / まで

```json
{"tipo":"particella-uso","frase_con_buco":"駅＿ うちまで 歩きました。","corretta":"から","distrattori":["に","で"],"perche":"Punto di partenza in coppia con まで → から.","traduzione_it":"Ho camminato dalla stazione fino a casa."}
```

```json
{"tipo":"particella-uso","frase_con_buco":"九時から 五時＿ はたらきます。","corretta":"まで","distrattori":["で","を"],"perche":"Limite finale in coppia con から → まで.","traduzione_it":"Lavoro dalle nove alle cinque."}
```

### と

```json
{"tipo":"particella-uso","frase_con_buco":"日曜日、母＿ 買い物に 行きました。","corretta":"と","distrattori":["を","で"],"perche":"Compagnia (insieme a) → と; 母を 行きました è impossibile.","traduzione_it":"Domenica sono andato a fare spese con mia madre."}
```

```json
{"tipo":"particella-uso","frase_con_buco":"先生は あした テストが ある＿ 言いました。","corretta":"と","distrattori":["を","は"],"perche":"Citazione prima di 言う → と; を/は dopo una frase sono impossibili.","traduzione_it":"Il professore ha detto che domani c'è un test."}
```

### が (usi di stato, dal contrasto con を)

```json
{"tipo":"particella-uso","frase_con_buco":"わたしは ねこ＿ 好きです。","corretta":"が","distrattori":["を","に"],"perche":"好き è aggettivo di stato: il suo oggetto prende が.","traduzione_it":"Mi piacciono i gatti."}
```

```json
{"tipo":"particella-uso","frase_con_buco":"リンさんは 日本語＿ わかります。","corretta":"が","distrattori":["を","で"],"perche":"わかる è di stato: ciò che si capisce prende が, non を.","traduzione_it":"Lin capisce il giapponese."}
```

**Totale sezione 2: 19 item.** Nota per il generatore: gli item に-esistenza,
で-luogo-azione, に-乗る/を-降りる e で-evento sono pensati in coppia — pescati insieme
insegnano il contrasto, pescati da soli restano comunque univoci.

---

## 3. Forme nel contesto

Il contesto forza UNA forma di coniugazione; i distrattori sono forme SBAGLIATE dello
stesso verbo in quel punto della frase (per lo più impossibili grammaticalmente, mai
solo "strane"). Copre: richiesta て+ください, divieto ないでください, permesso てもいい,
esperienza たことがある, intenzione つもり, たい, ながら, たり, たあとで, るまえに,
なければならない, ている, たほうがいい, ことができる, すぎる.

```json
{"tipo":"forma-contesto","frase_con_buco":"すみません、まどを ＿＿ ください。","corretta":"開けて","distrattori":["開ける","開けた","開けない"],"perche":"ください si aggancia solo alla forma て.","traduzione_it":"Scusi, apra la finestra per favore."}
```

```json
{"tipo":"forma-contesto","frase_con_buco":"あぶないですから、ここで ＿＿ ください。","corretta":"泳がないで","distrattori":["泳いで","泳がなくて","泳がない"],"perche":"Divieto (あぶない!) → ないでください; 泳いで chiederebbe di nuotare.","traduzione_it":"È pericoloso, quindi non nuoti qui."}
```

```json
{"tipo":"forma-contesto","frase_con_buco":"まどを ＿＿も いいですか。","corretta":"開けて","distrattori":["開ける","開けない"],"perche":"Permesso 〜てもいい: solo la forma て può stare davanti a も.","traduzione_it":"Posso aprire la finestra?"}
```

```json
{"tipo":"forma-contesto","frase_con_buco":"一度だけ、すしを ＿＿ことが あります。","corretta":"食べた","distrattori":["食べて","食べます"],"perche":"Esperienza (一度だけ) → たことがある; て/ます davanti a こと impossibili.","traduzione_it":"Ho mangiato sushi una sola volta (in vita mia)."}
```

```json
{"tipo":"forma-contesto","frase_con_buco":"来年、日本で ＿＿つもりです。","corretta":"はたらく","distrattori":["はたらいて","はたらきます"],"perche":"つもり vuole la forma dizionario; て/ます davanti a つもり impossibili.","traduzione_it":"L'anno prossimo ho intenzione di lavorare in Giappone."}
```

```json
{"tipo":"forma-contesto","frase_con_buco":"のどが かわきましたね。何か ＿＿たいです。","corretta":"飲み","distrattori":["飲む","飲んで"],"perche":"たい si attacca alla radice ます (飲み), mai a 飲む/飲んで.","traduzione_it":"Che sete, eh. Vorrei bere qualcosa."}
```

```json
{"tipo":"forma-contesto","frase_con_buco":"音楽を ＿＿ながら、勉強します。","corretta":"聞き","distrattori":["聞く","聞いて"],"perche":"ながら vuole la radice ます (聞き).","traduzione_it":"Studio ascoltando la musica."}
```

```json
{"tipo":"forma-contesto","frase_con_buco":"休みの 日は、本を ＿＿り、映画を 見たり します。","corretta":"読んだ","distrattori":["読んで","読む"],"perche":"Struttura たり…たりする: serve la forma た (読んだり).","traduzione_it":"Nei giorni liberi leggo, guardo film e così via."}
```

```json
{"tipo":"forma-contesto","frase_con_buco":"ばんごはんを ＿＿あとで、テレビを 見ます。","corretta":"食べた","distrattori":["食べる","食べて"],"perche":"あとで vuole la forma た; 食べるあとで non esiste.","traduzione_it":"Dopo aver cenato, guardo la TV."}
```

```json
{"tipo":"forma-contesto","frase_con_buco":"日本に ＿＿まえに、日本語を 勉強しました。","corretta":"来る","distrattori":["来た","来て"],"perche":"まえに vuole SEMPRE la forma dizionario, anche per il passato.","traduzione_it":"Prima di venire in Giappone, ho studiato giapponese."}
```

```json
{"tipo":"forma-contesto","frase_con_buco":"あした テストが あるので、今晩 ＿＿なければ なりません。","corretta":"勉強し","distrattori":["勉強する","勉強して"],"perche":"なければ si forma dalla negativa: 勉強し+なければ; する/して impossibili.","traduzione_it":"Domani c'è un test, quindi stasera devo studiare."}
```

```json
{"tipo":"forma-contesto","frase_con_buco":"今、雨が ＿＿います。","corretta":"降って","distrattori":["降り","降る"],"perche":"Azione in corso (今) → ている: solo la forma て.","traduzione_it":"Adesso sta piovendo."}
```

```json
{"tipo":"forma-contesto","frase_con_buco":"熱が ありますから、早く ＿＿ほうが いいですよ。","corretta":"寝た","distrattori":["寝て","寝ます"],"perche":"Consiglio 〜たほうがいい; て/ます davanti a ほう impossibili.","traduzione_it":"Hai la febbre, quindi è meglio che tu vada a letto presto."}
```

```json
{"tipo":"forma-contesto","frase_con_buco":"妹は ピアノを ＿＿ことが できます。","corretta":"ひく","distrattori":["ひいて","ひいた"],"perche":"ことができる vuole la forma dizionario (ひくことができる).","traduzione_it":"Mia sorella minore sa suonare il pianoforte."}
```

```json
{"tipo":"forma-contesto","frase_con_buco":"ゆうべ ＿＿すぎて、おなかが いたいです。","corretta":"食べ","distrattori":["食べる","食べて"],"perche":"すぎる si attacca alla radice ます (食べ+すぎる).","traduzione_it":"Ieri sera ho mangiato troppo e mi fa male la pancia."}
```

**Totale sezione 3: 15 item.** Verbi-carta per il consolidamento: 開ける, 泳ぐ, 食べる,
働く, 飲む, 聞く, 読む, 来る, 勉強する, 降る, 寝る, 弾く — tutti nel seed.

---

## Note per l'integrazione

- **Formato**: `frase_con_buco` usa ＿ (particelle: un carattere) o ＿＿ (verbi/forme);
  `corretta` è esattamente il testo che riempie il buco. I generatori possono mescolare
  corretta+distrattori a runtime come già fanno KEIGO_ITEMS.
- **Distrattori**: sempre grammaticalmente impossibili nel punto del buco (particella
  sbagliata per la valenza, keigo con direzione onorifica invertita, forma non
  agganciabile alla struttura). Nei pochi casi "impossibili per regola d'uso" più che
  di sintassi pura (電気が消える con soggetto proprio, uchi/soto di おる, イベント+で)
  il `perche` cita esplicitamente la regola.
- **Ambiguità evitate**: に/へ mai in competizione (へ compare solo nel contesto へ+の
  dove è unica); nessun item dove を-attraversamento e で-luogo siano entrambi
  difendibili; l'orario di 始まる non ha に tra i distrattori.
- **Livelli**: item in kana spaziato = N5; item con kanji (熱, 会議, 階段, keigo…) = N4.
  Il keigo è tutto N4.
- **Copertura**: sezione 1 usa 18 verbi delle coppie 自/他 collegate nel seed + 11 verbi
  keigo di KEIGO_VERBS; sezione 2 copre 19 usi distinti del particleGuide; sezione 3
  copre 15 strutture N5/N4 presenti nella sezione grammar del seed.
- Tutti i verbi (corrette e distrattori) sono voci del catalogo, verificati via script;
  i nomi di contorno sono N5/N4 di catalogo o parole già usate nelle frasi del seed.
