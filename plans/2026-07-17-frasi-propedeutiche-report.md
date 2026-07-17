# Frasi propedeutiche — report di curatela (17/07/2026)

Audit del campo `words` di `static/seed-n5n4.json` (1448 voci) con occhio da insegnante:
copertura delle frasi d'esempio, coppie transitivo/intransitivo, parole JLPT assenti.
Analisi fatta con script node usa-e-getta (sola lettura); le frasi proposte sono in blocchi
JSON pronti da fondere negli overrides. Nessun dato è stato modificato.

---

## 1. Buchi di copertura

### 1.1 Parole senza frasi_esempio: NESSUNA ✅

Tutte le 1448 voci hanno almeno una frase d'esempio. Ottimo stato di salute del catalogo:
la sezione 3 di questo report è quindi riconvertita alla seconda priorità indicata,
cioè le parole con **una sola frase**.

### 1.2 Parole con UNA sola frase: 45 (22 N5, 23 N4)

Distribuzione per tipo: 2 verbi (出国する, 入国する — entrambi N4), 11 nomi, 32 espressioni
idiomatiche (慣用表現). Sono in gran parte le carte del lessico "aeroporto/viaggio" e i
saluti fissi, aggiunti di recente con un solo esempio.

Elenco id (livello — id):

- N4 verbi: 出国する, 入国する
- N4 nomi: 航空券, 手荷物, 手荷物受取所, 出国, 税関, 搭乗券, 搭乗口, 入国
- N4 espressioni: 〜さんによろしくお伝えください, お先に失礼します, かしこまりました, これはどこで受け取りますか, これは機内持ち込みできますか, これを預けたいです, すみません、搭乗口はどこですか, 観光です, 間に合う, 気に入る, 仕方がない, 申告するものはありません, 宅急便はどこですか
- N5 nomi: チケット, パスポート, フライト
- N5 espressioni: Wi-Fiルーターのレンタルはどこですか, いただきます, おかえりなさい, おじゃまします, おめでとうございます, お久しぶりです, お大事に, お疲れさまです, お腹が空いた, ごちそうさまでした, これは私のパスポートです, ただいま, チェックインカウンターはどこですか, トイレはどこですか, どういたしまして, よろしくお願いします, 頑張って, 気をつけて, 喉が渇いた

Per tutte e 45 propongo una seconda frase nella sezione 3. Nota: 間に合う e 気に入る
sono classificate 慣用表現 ma si comportano da verbi ad altissima frequenza JLPT —
la seconda frase per loro è particolarmente preziosa.

### 1.3 Osservazioni sulle coppie 自/他 (emerse dallo script)

- **29 coppie collegate** via `id_verbo_corrispondente`, nessun link rotto. Quasi tutte
  hanno già frasi che mostrano il contrasto が/を; le eccezioni sono nella sezione 2.
- **Coppie presenti in catalogo ma NON collegate** (candidate a ricevere il link):
  - `かかる` (自, N5) ↔ `掛ける` (他, N5) — la coppia classica 絵が掛かる／絵を掛ける.
    Attenzione: esiste anche la voce `かける` (N5) che duplica in parte 掛ける e condivide
    con essa la frase 「コックさんは少しもかけていない。」, che oltre a essere duplicata è
    poco chiara fuori contesto: da rivedere in una curatela successiva.
  - `止む` (自, N4) ↔ `止める::やめる` (他, N4) — coppia 自/他 tradizionale (雨が止む／
    タバコを止める); le frasi esistenti sono buone, manca solo il collegamento.
  - `空く::あく` (自, N4) resta senza partner: 空ける non è in catalogo (accettabile,
    è oltre N4).
- **Partner 自/他 assenti dal catalogo** mentre l'altro membro c'è: 汚す (per 汚れる),
  割る (割れる), 乾かす (乾く), 動かす (動く), 鳴らす (鳴る), 倒す (倒れる), 通す (通る),
  曲げる (曲る), 終える (終る), 増やす (増える), 冷やす (冷える), 届く (届ける), 減る
  (contrario di 増える). Sono quasi tutti ufficialmente N3, quindi la loro assenza è
  difendibile; li segnalo perché quando si studia la transitività il partner mancante
  si fa sentire. I più utili da aggiungere per primi: **届く, 減る, 割る, 汚す, 冷やす**.

### 1.4 Parole frequenti N5/N4 assenti dal catalogo (proposte, max 20)

Verificate una a una su id/scrittura/lettura (incluse varianti con お〜: お皿, お弁当,
お祭り, 風邪, うそ, 入口 ci sono già — non li propongo). Divise per grado di certezza:

**Sicure (liste standard 旧3級/旧4級 e libri di testo):**
1. 信号 (しんごう, N4) — semaforo; onnipresente nelle indicazioni stradali JLPT.
2. 屋根 (やね, N4) — tetto; lista 旧3級.
3. 咳 (せき, N4) — かぜをひいて、せきが出ます (Minna no Nihongo I, L17); in catalogo c'è solo 席 (posto).
4. スリッパ (N5) — lessico casa/げんかん dei primissimi capitoli dei testi.

**Molto utili come partner di parole già in catalogo (al confine N4/N3):**
5. 届く (とどく) — partner 自 di 届ける (presente).
6. 減る (へる) — contrario di 増える (presente); coppia 増える／減る da esame.
7. 増やす (ふやす) — partner 他 di 増える.
8. 冷やす (ひやす) — partner 他 di 冷える.
9. 割る (わる) — partner 他 di 割れる.
10. 汚す (よごす) — partner 他 di 汚れる.
11. 乾かす (かわかす) — partner 他 di 乾く.
12. 動かす (うごかす) — partner 他 di 動く.
13. 鳴らす (ならす) — partner 他 di 鳴る.
14. 倒す (たおす) — partner 他 di 倒れる.
15. 通す (とおす) — partner 他 di 通る.

**Vita quotidiana moderna (compaiono nei test N5/N4 recenti e nei testi aggiornati):**
16. 携帯電話／スマホ — impensabile un N5 moderno senza.
17. 電子レンジ (でんしレンジ, N4)
18. 洗濯機 (せんたくき, N4) — in catalogo c'è 洗濯する ma non l'elettrodomestico.
19. タオル (N5)
20. 電池 (でんち, N4)

Non propongo (verificati ma incerti o fuori livello): 馬・牛・豚 (N3; 牛肉/豚肉 ci sono),
歯ブラシ, ぬいぐるみ, 平和, 道路, 歩道, 都会, 貧乏, 窓口, 袋 (手袋 c'è), クリスマス.

---

## 2. Frasi proposte — coppie transitivo/intransitivo

Le 29 coppie collegate sono state riviste una a una, frase per frase. La maggior parte
mostra già bene il contrasto (お湯を沸かす／お湯が沸く, 音楽を聞く／音楽が聞こえる,
財布を落とす／…, ドアが開く／まどを開ける, ecc.): per quelle non propongo nulla.
Qui sotto i soli membri le cui frasi attuali NON mostrano il senso base del contrasto
が/を, con una frase speculare in stile JLPT (stesso nome, particella diversa).

### 上がる／上げる — a 上げる manca il senso "alzare qualcosa"

Le due frasi attuali di 上げる mostrano あげる "dare" e 挙げる "alzare la mano", mai
「〜を上げる」 in contrasto con 「〜が上がる」 (che ha già 料金があがります). Carta N5.

```json
{ "id": "上げる", "frase": { "testo": "エアコンの おんどを 上げて ください。", "traduzione": { "it": "Alza la temperatura del condizionatore, per favore.", "en": "Please turn up the air conditioner temperature." } } }
```

### 折る／折れる — a 折れる manca il senso fisico "spezzarsi"

折れる oggi ha solo l'uso idiomatico (バス会社が折れた, "cedere") e un participio
attributivo; manca 「〜が折れる」 da contrapporre a 「うでを折る」. Carta N4.

```json
{ "id": "折れる", "frase": { "testo": "台風で、木の えだが 折れました。", "traduzione": { "it": "Per il tifone si è spezzato un ramo dell'albero.", "en": "A tree branch broke because of the typhoon." } } }
```

### 落とす／落ちる — a 落ちる manca il senso fisico "cadere"

落ちる ha solo "essere bocciato" e "andare giù (server)": manca la caduta fisica che
rispecchia 「駅で財布を落としました」. Carta N4.

```json
{ "id": "落ちる", "frase": { "testo": "かばんから 財布が 落ちました。", "traduzione": { "it": "Il portafoglio mi è caduto dalla borsa.", "en": "My wallet fell out of my bag." } } }
```

### 出す／出る — a entrambi manca il senso base

出す ha oggi solo un passivo (出されます) e un uso figurato (名前を出したくない);
出る ha "rispondere al telefono" e "apparire (fantasmi)". Nessuna frase mostra la
coppia base insegnata a lezione. Carte N5.

```json
{ "id": "出す", "frase": { "testo": "ゆうびんきょくで てがみを 出しました。", "traduzione": { "it": "Ho spedito una lettera all'ufficio postale.", "en": "I mailed a letter at the post office." } } }
```

```json
{ "id": "出る", "frase": { "testo": "よるに なって、月が 出ました。", "traduzione": { "it": "Si è fatta notte ed è spuntata la luna.", "en": "Night fell and the moon came out." } } }
```

### 消す／消える — a 消える manca 「電気が消える」

消す ha il classico 「電気を消します」, ma 消える ha solo usi figurati (il suono che
svanisce, la moda che passa): manca lo speculare con la luce. Carta N5.

```json
{ "id": "消える", "frase": { "testo": "きゅうに へやの でんきが 消えました。", "traduzione": { "it": "All'improvviso la luce della stanza si è spenta.", "en": "Suddenly the light in the room went out." } } }
```

### かかる／掛ける — coppia da collegare, con frasi speculari

Non sono collegate via `id_verbo_corrispondente` (vedi §1.3) e le frasi attuali di
entrambe non mostrano il contrasto (かかる ha "essere quasi finito" e "avviarsi il
motore"; 掛ける ha l'appendere ma condivide con かける una frase poco chiara).
Propongo la coppia classica da libro di testo, stesso nome, が/を. Carte N5.

```json
{ "id": "かかる", "frase": { "testo": "かべに えが かかって います。", "traduzione": { "it": "Alla parete è appeso un quadro.", "en": "A picture is hanging on the wall." } } }
```

```json
{ "id": "掛ける", "frase": { "testo": "かべに えを 掛けました。", "traduzione": { "it": "Ho appeso un quadro alla parete.", "en": "I hung a picture on the wall." } } }
```

Le altre 24 coppie collegate (下げる/下がる, 回る/回す, 壊す/壊れる, 起こす/起きる,
決まる/決める, 見える/見る, 見つかる/見つける, 始める/始まる, 止める/止まる,
集まる/集める, 焼く/焼ける, 続く/続ける, 直す/直る, 点く/つける, 沸かす/沸く,
聞こえる/聞く, 変える/変わる, 無くなる/無くす, 立てる/立つ, 開く/開ける,
渡す/渡る, 入る/入れる, 並ぶ/並べる, 閉まる/閉める) hanno già frasi adeguate al
contrasto: meglio non toccarle. Unica nota minore: la seconda frase di 変わる
(「最近変わった海洋生物…」, 変わった = "strano") è sopra il livello N4 e usa un senso
lessicalizzato; se in futuro si vuole rinforzare il contrasto, 「信号が 赤に 変わりました。」
sarebbe più propedeutica.

---

## 3. Frasi proposte — parole con copertura minima

Non esistono parole senza frasi_esempio (§1.1), quindi questa sezione copre le 45 parole
con **una sola frase**, in ordine di priorità: prima i verbi, poi i nomi, poi le
espressioni; N5 in stile kana-spaziato, N4 con kanji. Ogni frase è pensata per mostrare
un contesto DIVERSO da quello dell'unica frase esistente (verificata una a una), così la
seconda occorrenza consolida invece di ripetere.

### Verbi (N4)

```json
{ "id": "出国する", "frase": { "testo": "来週の 月曜日に 日本を 出国します。", "traduzione": { "it": "Lunedì prossimo lascio il Giappone.", "en": "I will leave Japan next Monday." } } }
```

```json
{ "id": "入国する", "frase": { "testo": "初めて 日本に 入国しました。", "traduzione": { "it": "Sono entrato in Giappone per la prima volta.", "en": "I entered Japan for the first time." } } }
```

### Verbi classificati come espressioni (N4, alta frequenza JLPT)

```json
{ "id": "間に合う", "frase": { "testo": "タクシーで 行けば、飛行機に 間に合いますよ。", "traduzione": { "it": "Se andiamo in taxi facciamo in tempo per l'aereo.", "en": "If we go by taxi, we will make the plane in time." } } }
```

```json
{ "id": "気に入る", "frase": { "testo": "この ホテルが とても 気に入りました。", "traduzione": { "it": "Questo hotel mi è piaciuto moltissimo.", "en": "I really liked this hotel." } } }
```

### Nomi N5

```json
{ "id": "チケット", "frase": { "testo": "コンサートの チケットを ２まい かいました。", "traduzione": { "it": "Ho comprato due biglietti per il concerto.", "en": "I bought two concert tickets." } } }
```

```json
{ "id": "パスポート", "frase": { "testo": "パスポートを かばんに いれました。", "traduzione": { "it": "Ho messo il passaporto nella borsa.", "en": "I put my passport in my bag." } } }
```

```json
{ "id": "フライト", "frase": { "testo": "フライトは ３じかんぐらいです。", "traduzione": { "it": "Il volo dura circa tre ore.", "en": "The flight is about three hours." } } }
```

### Nomi N4 (lessico aeroporto)

```json
{ "id": "航空券", "frase": { "testo": "インターネットで 航空券を 買いました。", "traduzione": { "it": "Ho comprato il biglietto aereo su internet.", "en": "I bought my plane ticket on the internet." } } }
```

```json
{ "id": "手荷物", "frase": { "testo": "手荷物は 一つだけです。", "traduzione": { "it": "Ho solo un bagaglio a mano.", "en": "I have only one piece of hand luggage." } } }
```

```json
{ "id": "手荷物受取所", "frase": { "testo": "手荷物受取所で スーツケースを 待って います。", "traduzione": { "it": "Sto aspettando la valigia al ritiro bagagli.", "en": "I am waiting for my suitcase at the baggage claim." } } }
```

```json
{ "id": "出国", "frase": { "testo": "出国の 前に、おみやげを 買いました。", "traduzione": { "it": "Prima di lasciare il paese ho comprato dei souvenir.", "en": "I bought souvenirs before leaving the country." } } }
```

```json
{ "id": "税関", "frase": { "testo": "税関で かばんを 開けました。", "traduzione": { "it": "Alla dogana ho aperto la borsa.", "en": "I opened my bag at customs." } } }
```

```json
{ "id": "搭乗券", "frase": { "testo": "搭乗券を なくさないで ください。", "traduzione": { "it": "Non perda la carta d'imbarco.", "en": "Please do not lose your boarding pass." } } }
```

```json
{ "id": "搭乗口", "frase": { "testo": "搭乗口の 前で 待って いて ください。", "traduzione": { "it": "Aspetti davanti al gate d'imbarco.", "en": "Please wait in front of the boarding gate." } } }
```

```json
{ "id": "入国", "frase": { "testo": "入国の カードを 書いて ください。", "traduzione": { "it": "Compili la carta d'ingresso, per favore.", "en": "Please fill in the immigration card." } } }
```

### Espressioni N4

```json
{ "id": "〜さんによろしくお伝えください", "frase": { "testo": "奥さんによろしくお伝えください。", "traduzione": { "it": "Porti i miei saluti a sua moglie.", "en": "Please give my regards to your wife." } } }
```

```json
{ "id": "お先に失礼します", "frase": { "testo": "今日は 用事が あるので、お先に失礼します。", "traduzione": { "it": "Oggi ho un impegno, quindi vado via prima io.", "en": "I have something to do today, so I am leaving before you." } } }
```

```json
{ "id": "かしこまりました", "frase": { "testo": "チェックアウトを お願いします。— かしこまりました。", "traduzione": { "it": "Il check-out, per favore. — Certamente.", "en": "Check-out, please. — Certainly, sir." } } }
```

```json
{ "id": "これはどこで受け取りますか", "frase": { "testo": "すみません、これはどこで受け取りますか。— あちらの 窓口です。", "traduzione": { "it": "Scusi, dove lo ritiro questo? — A quello sportello.", "en": "Excuse me, where do I pick this up? — At that counter over there." } } }
```

```json
{ "id": "これは機内持ち込みできますか", "frase": { "testo": "かばんが 少し 大きいですが、これは機内持ち込みできますか。", "traduzione": { "it": "La borsa è un po' grande: posso portarla in cabina?", "en": "My bag is a bit big — can I take it on board?" } } }
```

```json
{ "id": "これを預けたいです", "frase": { "testo": "すみません、これを預けたいです。— はい、こちらに どうぞ。", "traduzione": { "it": "Scusi, vorrei imbarcare questo. — Sì, lo metta qui.", "en": "Excuse me, I would like to check this in. — Sure, put it here, please." } } }
```

```json
{ "id": "すみません、搭乗口はどこですか", "frase": { "testo": "すみません、搭乗口はどこですか。— まっすぐ 行って、右です。", "traduzione": { "it": "Scusi, dov'è il gate d'imbarco? — Dritto e poi a destra.", "en": "Excuse me, where is the boarding gate? — Go straight, then turn right." } } }
```

```json
{ "id": "観光です", "frase": { "testo": "お仕事ですか。— いいえ、観光です。", "traduzione": { "it": "È qui per lavoro? — No, per turismo.", "en": "Are you here on business? — No, for sightseeing." } } }
```

```json
{ "id": "仕方がない", "frase": { "testo": "電車が 止まって いるから、仕方がないですね。歩きましょう。", "traduzione": { "it": "I treni sono fermi, non c'è niente da fare: andiamo a piedi.", "en": "The trains have stopped, so it cannot be helped — let us walk." } } }
```

```json
{ "id": "申告するものはありません", "frase": { "testo": "税関で「申告するものはありません」と 言いました。", "traduzione": { "it": "Alla dogana ho detto: «Non ho nulla da dichiarare».", "en": "At customs I said, \"I have nothing to declare.\"" } } }
```

```json
{ "id": "宅急便はどこですか", "frase": { "testo": "荷物が 重いですね。すみません、宅急便はどこですか。", "traduzione": { "it": "Che bagagli pesanti... Scusi, dov'è il servizio di spedizione?", "en": "This luggage is heavy... Excuse me, where is the luggage delivery service?" } } }
```

### Espressioni N5

```json
{ "id": "Wi-Fiルーターのレンタルはどこですか", "frase": { "testo": "Wi-Fiルーターのレンタルはどこですか。— ２かいに ありますよ。", "traduzione": { "it": "Dov'è il noleggio del router Wi-Fi? — È al primo piano.", "en": "Where is the Wi-Fi router rental? — It is on the second floor." } } }
```

```json
{ "id": "いただきます", "frase": { "testo": "いい におい！いただきます。", "traduzione": { "it": "Che buon profumo! Buon appetito.", "en": "It smells so good! Let's eat." } } }
```

```json
{ "id": "おかえりなさい", "frase": { "testo": "おかえりなさい。きょうは はやかったですね。", "traduzione": { "it": "Bentornato! Oggi sei tornato presto, eh.", "en": "Welcome back! You are home early today." } } }
```

```json
{ "id": "おじゃまします", "frase": { "testo": "おじゃまします。わあ、きれいな へやですね。", "traduzione": { "it": "Permesso... Wow, che bella stanza!", "en": "Excuse me for coming in... Wow, what a nice room!" } } }
```

```json
{ "id": "おめでとうございます", "frase": { "testo": "ごけっこん、おめでとうございます。", "traduzione": { "it": "Congratulazioni per il matrimonio!", "en": "Congratulations on your wedding!" } } }
```

```json
{ "id": "お久しぶりです", "frase": { "testo": "田中さん、お久しぶりです。", "traduzione": { "it": "Signor Tanaka, quanto tempo!", "en": "Mr. Tanaka, it has been a long time!" } } }
```

```json
{ "id": "お大事に", "frase": { "testo": "くすりを のんで、ゆっくり やすんで ください。お大事に。", "traduzione": { "it": "Prenda la medicina e riposi bene. Si rimetta presto!", "en": "Take your medicine and get plenty of rest. Get well soon!" } } }
```

```json
{ "id": "お疲れさまです", "frase": { "testo": "あ、ぶちょう。お疲れさまです。", "traduzione": { "it": "Ah, direttore! Buon lavoro.", "en": "Ah, boss! Thank you for your hard work." } } }
```

```json
{ "id": "お腹が空いた", "frase": { "testo": "たくさん あるいたから、お腹が空いた。", "traduzione": { "it": "Ho camminato tanto e mi è venuta fame.", "en": "I walked a lot, so I am hungry." } } }
```

```json
{ "id": "ごちそうさまでした", "frase": { "testo": "ごちそうさまでした。また きます。", "traduzione": { "it": "Grazie per il pasto! Tornerò.", "en": "Thank you for the meal. I will come again." } } }
```

```json
{ "id": "これは私のパスポートです", "frase": { "testo": "これは私のパスポートです。どうぞ。", "traduzione": { "it": "Questo è il mio passaporto. Prego.", "en": "This is my passport. Here you are." } } }
```

```json
{ "id": "ただいま", "frase": { "testo": "ただいま。きょうは つかれたよ。", "traduzione": { "it": "Sono a casa! Oggi sono proprio stanco.", "en": "I'm home! I'm really tired today." } } }
```

```json
{ "id": "チェックインカウンターはどこですか", "frase": { "testo": "チェックインカウンターはどこですか。— ２ばんの カウンターです。", "traduzione": { "it": "Dov'è il banco del check-in? — È il banco numero 2.", "en": "Where is the check-in counter? — It is counter number 2." } } }
```

```json
{ "id": "トイレはどこですか", "frase": { "testo": "トイレはどこですか。— あの エレベーターの よこです。", "traduzione": { "it": "Dov'è il bagno? — Accanto a quell'ascensore.", "en": "Where is the restroom? — Next to that elevator." } } }
```

```json
{ "id": "どういたしまして", "frase": { "testo": "てつだって くれて、ありがとう。— どういたしまして。", "traduzione": { "it": "Grazie per l'aiuto. — Di niente.", "en": "Thanks for helping me. — You're welcome." } } }
```

```json
{ "id": "よろしくお願いします", "frase": { "testo": "きょうから ここで はたらきます。よろしくお願いします。", "traduzione": { "it": "Da oggi lavoro qui. Conto sul vostro aiuto!", "en": "I start working here today. I look forward to working with you." } } }
```

```json
{ "id": "頑張って", "frase": { "testo": "あしたは しあいですね。頑張って！", "traduzione": { "it": "Domani hai la partita, no? Forza!", "en": "You have a match tomorrow, right? Good luck!" } } }
```

```json
{ "id": "気をつけて", "frase": { "testo": "くるまが おおいから、気をつけて ね。", "traduzione": { "it": "Ci sono tante macchine: stai attento!", "en": "There are a lot of cars, so be careful." } } }
```

```json
{ "id": "喉が渇いた", "frase": { "testo": "ああ、あつい。喉が渇いたなあ。", "traduzione": { "it": "Ah, che caldo... ho proprio sete.", "en": "Ah, it's hot... I'm so thirsty." } } }
```

---

## Note di verifica

- Tutti gli id citati nel report esistono nel seed: sono stati estratti verbatim dagli
  output degli script di analisi eseguiti sul seed stesso (8 proposte in sezione 2 +
  45 in sezione 3, nessun id inventato). Uno script di doppia verifica è pronto in
  scratchpad (`verifica.js`: parse dei blocchi JSON, lookup id, match scrittura/stem);
  da rilanciare al primo giro utile prima della fusione negli overrides.
- Ogni frase proposta contiene la scrittura della carta (o lo stem coniugato: 出国し,
  間に合い, 気に入り, 上げて, 折れま, 落ちま, 出しま, かかって…), come richiesto dal test
  automatico sulle frasi.
- Stile: N5 kana-spaziato con la parola-carta in kanji dov'è la scrittura della carta;
  N4 con kanji normali e spaziatura leggera come le frasi già in catalogo.
- Traduzioni it/en fatte entrambe dal giapponese.
- Prossimi passi suggeriti (fuori scope di questo report): fondere le frasi negli
  overrides (`scripts/data/word-overrides.json`), collegare かかる↔掛ける e
  止む↔止める::やめる, valutare l'aggiunta delle 20 parole di §1.4, ripulire la frase
  duplicata di かける/掛ける.
