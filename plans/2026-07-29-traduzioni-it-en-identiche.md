# Traduzioni IT identiche all'EN (non tradotte) — audit 29/07, aggiornato 30/07

Trovate esplorando i 3 casi falliti di overrides.test.ts (変わる, 見る): erano il
sintomo visibile di un problema molto più grande — frasi d'esempio nel seed con
il campo `traduzione.it` identico byte-per-byte a `traduzione.en`: inglese copiato
come segnaposto, mai davvero tradotto in italiano (viola la regola in CLAUDE.md:
«traduzioni italiane sempre dal testo giapponese, mai dall'inglese intermedio»).

## Causa radice trovata il 30/07

Non è solo dato vecchio: è un bug ATTIVO nella pipeline. In
`scripts/sync-open-source-seed.mjs`, `applyJmdictMetadata` (riga ~987) genera le
frasi d'esempio dai dati Tatoeba dentro JMdict così:

```js
frasi_esempio: examples.map((ex) => ({ testo: ex.jp, traduzione: { it: ex.en, en: ex.en } }))
```

JMdict/Tatoeba dà solo giapponese+inglese, mai italiano: lo script mette l'inglese
anche nel campo `it` come segnaposto — silenziosamente, senza flag. Non ancora
sistemato nello script (richiede decidere come segnalare «da tradurre» senza
rompere i test sull'IT non vuoto).

## Bonus: altri bug scoperti sistemando i lotti (30/07)

- 3 coppie casual/formale delle dimostrative (あっち/あちら, こっち/こちら,
  そっち/そちら) condividevano la stessa frase scritta per la forma formale.
- Alcune frasi con IT=EN avevano in realtà l'ITALIANO copiato anche in EN (bug
  nella direzione opposta, da vecchie sessioni di curatela): 8+3 casi sistemati
  dando una vera traduzione inglese.
- 2 casi di mismatch parola/esempio (あげる testato con 挙げる invece del senso
  "dare"; どうぞ con virgolette a fine frase che rompevano la punteggiatura).
- 3 casi di forma numerica sbagliata (１人/９日/５日 in cifre invece che nel kanji
  del contatore testato: 一人/九日/五日).

## Stato: 100 frasi ancora da tradurre (lotti 1-8 fatti il 30/07)

- N5: 59
- N4: 41

## Come si sistema

Stesso flusso già in uso nel progetto (ciclo insegnante-agente, ARCHITECTURE.md): per
ognuna, tradurre `it` DAL GIAPPONESE (il testo è già corretto, serve solo la resa
italiana vera) e scrivere la correzione in `scripts/data/word-overrides.json` (mai
solo nel seed, o il prossimo sync la cancella) — se la parola non ha ancora un
override, serve l'INTERO array `frasi_esempio` corrente (gli array negli override
SOSTITUISCONO, non si fondono). Controllare anche, per ogni parola toccata, che la
frase contenga davvero la parola stessa (non un sinonimo/variante/cifra sbagliata).

## Lista completa (id — livello — giapponese — «traduzione da correggere»)

- `飛ぶ` (N5) — ヒューズが飛んだ。 — «A fuse has blown.»
- `飛ぶ` (N5) — 彼の話はいろいろなところへ飛ぶ。 — «He frequently jumps from one topic to another while he is talking.»
- `飛行機` (N5) — あなたは飛行機で旅行したことがありますか。 — «Have you ever traveled by air?»
- `美術館` (N4) — このバスは美術館まで行きますか。 — «Does this bus go to the museum?»
- `美味しい` (N5) — おいしい食事をありがとう。 — «Thanks for the delicious meal.»
- `鼻` (N5) — 鼻が出ているよ。かみなさい。 — «Your nose is running. Blow it.»
- `必ず` (N4) — あの歌は必ずヒットするよ。 — «That song's bound to be a hit.»
- `表` (N4) — この紙はどちらが表だか見分けがつかない。 — «I cannot tell which is the right side of this paper.»
- `表` (N4) — 私はその問題がわかっていない。裏と表の区別もついていない。 — «I don't understand the problem; I could make neither head nor tail of it.»
- `病院` (N5) — この近くに病院はありますか。 — «Is there a hospital near here?»
- `普通` (N4) — 日曜日は私にとって普通の日ではない。 — «Sunday is not an ordinary day to me.»
- `普通` (N4) — 彼女は普通９時に寝る。 — «She usually goes to bed at nine.»
- `部屋` (N5) — マユコは部屋に入った。 — «Mayuko entered the room.»
- `部屋` (N5) — 私の部屋は４階にあります。 — «My apartment is on the fourth floor.»
- `風邪` (N5) — ただの風邪でしょう。 — «You probably just have a cold.»
- `払う` (N4) — 払えるかどうか分からないざます。 — «I'm not sure I can afford it.»
- `払う` (N4) — ジャックはブラシで上着のほこりを払った。 — «Jack brushed the dust off his coat.»
- `物` (N5) — あなたの妹さんに会いたいものです。 — «I'd like to see your sister.»
- `物` (N5) — 遠まわしに物を言うな。 — «Don't beat around the bush.»
- `並べる` (N5) — メイドはテーブルにナイフとフォークを並べた。 — «The maid arranged the knives and forks on the table.»
- `閉まる` (N5) — あいにく店は閉まっていた。 — «Unfortunately, the store was closed.»
- `閉まる` (N5) — ドアが閉まっていたので、入ることが出来なかった。 — «The door was locked, so I couldn't get in.»
- `閉める` (N5) — どうかドアを閉めてくれませんか。 — «Will you please shut the door?»
- `別` (N4) — また別のときにチェスをしましょう。 — «Let's play chess another time.»
- `別` (N4) — これらの本を主題別に分類してください。 — «Please classify these books by subject.»
- `変` (N4) — そのオレンジは後味が変だった。 — «The orange left a strange taste in my mouth.»
- `変わる` (N4) — 最近変わった海洋生物が発見された。 — «A strange marine creature was found recently.»
- `片付ける` (N4) — あすの朝まっさきにそれを片付けます。 — «I'll do that first thing in the morning.»
- `片付ける` (N4) — おもちゃを片づけなさい。 — «Put away your toys.»
- `返す` (N5) — お金は明日返すよ。 — «I'll give you back the money tomorrow.»
- `返す` (N5) — お前は恩を仇で返したな。 — «You bit the hand that fed you.»
- `返事` (N4) — すぐ返事をしてもらいたいと思っています。 — «I hope you will answer me soon.»
- `返事する` (N4) — すぐ返事をしてもらいたいと思っています。 — «I hope you will answer me soon.»
- `便利` (N5) — 電話は便利なものである。 — «The telephone is a convenience.»
- `捕まえる` (N4) — ここでタクシーをつかまえられますか。 — «Can I catch a taxi here?»
- `捕まえる` (N4) — その男は少年の手をつかまえた。 — «The man took the boy by the hand.»
- `歩く` (N5) — 歩いて行きますか？それともバスで行きますか？ — «Will you go on foot or by bus?»
- `暮れる` (N4) — 冬の日は速く暮れる。 — «The night falls fast in winter.»
- `放送` (N4) — ニュースは毎時放送しています。 — «We broadcast news on the hour.»
- `放送する` (N4) — ニュースは毎時放送しています。 — «We broadcast news on the hour.»
- `訪ねる` (N4) — いつでも私のオフィスを訪ねなさい。 — «Call at my office at any time.»
- `帽子` (N5) — この帽子は１０００円なら安い。 — «This hat is cheap at 1000 yen.»
- `忘れ物` (N4) — 今日忘れ物をした。 — «I left behind something today.»
- `忙しい` (N5) — あいつはのらりくらりの仕事にお忙しい事だ。 — «He is busy loafing on the job.»
- `本` (N5) — ウイスキーを１本持っています。 — «I have a bottle of whiskey.»
- `本` (N5) — 昨日はその本を８０ページまで読んだ。 — «I read the book up to page 80 yesterday.»
- `妹` (N5) — あのかわいい少女は私の妹です。 — «That pretty girl is my sister.»
- `毎朝` (N5) — 私は毎朝六時に起きます。 — «I get up at six every morning.»
- `毎日` (N5) — その犬に毎日食べ物をやって下さい。 — «Please feed the dog every day.»
- `毎晩` (N5) — 私は毎晩家にいます。 — «I am at home every evening.»
- `万年筆` (N5) — 新しい万年筆をなくしてしまった。 — «I have lost my new fountain pen.»
- `味` (N4) — このチーズはピリッとした味がする。 — «This cheese has a sharp taste.»
- `無くなる` (N4) — あなたの青いペンがなくなってしまいました。 — «I misplaced your blue pen.»
- `無くなる` (N4) — 残り時間があまりなくなってきた。 — «The sands are running out.»
- `無理` (N4) — それは無理な注文だ。 — «Your demands are unreasonable.»
- `名前` (N5) — あなたの名前はリストからはずされた。 — «Your name was dropped from the list.»
- `名前` (N5) — ああ、もしかして名前を呼ばれるのが恥ずかしいって？ — «Ah, could it be you're embarrassed to be called by your first name?»
- `明日::あした` (N5) — あしたは一日中ひまです。 — «I'll be free all day tomorrow.»
- `明日::あす` (N4) — あしたは一日中ひまです。 — «I'll be free all day tomorrow.»
- `鳴く` (N5) — カエルが鳴いたら帰ろう。 — «Let's return when the frog croaks.»
- `鳴く` (N5) — あのかわいい鳥は来る日も来る日も鳴いてばかりいた。 — «That pretty bird did nothing but sing day after day.»
- `面白い` (N5) — この本は面白い読み物です。 — «This book makes pleasant reading.»
- `面白い` (N5) — 新聞には何も面白いことは載っていない。 — «There is nothing interesting in the newspaper.»
- `戻る` (N4) — やってしまったことは元に戻らない。 — «What is done cannot be undone.»
- `野菜` (N5) — その店は野菜を売っている。 — «The store deals in vegetables.»
- `役に立つ` (N4) — それ以上はお役に立てません。 — «Beyond that I cannot help you.»
- `訳` (N4) — そういうわけで私はこんなに早く帰って来たのです。 — «That's why I came back so soon.»
- `遊び` (N4) — 今度の旅行は仕事じゃなくて遊びです。 — «Our next trip is for pleasure, not for work.»
- `郵便局` (N5) — あの〜郵便局はどちらでしょうか。 — «Uh..., where's the post office?»
- `夕方` (N5) — ひょっとすると夕方前に雨になるかもしれない。 — «It might rain before evening.»
- `余り` (N5) — この手の本はあまり読まない。 — «I don't read this kind of book much.»
- `余り` (N5) — １か月あまり名古屋に居たことがある。 — «I lived for more than a month in Nagoya.»
- `洋服` (N5) — お前に新しい洋服を作ってあげよう。 — «I will make a new suit for you.»
- `用` (N4) — 何の用でここに来たのですか。 — «What has brought you here?»
- `葉` (N4) — こちらには大きなハスの葉があります。 — «We have very big lotus leaves.»
- `要る` (N5) — 今のところお金はいらない。 — «I don't need money at present.»
- `踊り` (N4) — 私のガールフレンドは踊りがうまい。 — «My girlfriend is a good dancer.»
- `来る` (N5) — 私の父は私に、ぜひそこを見てくるようにといった。 — «My father insisted that I should go to see the place.»
- `来週` (N5) — 来週ヨーロッパへ行くつもりなんです。 — «I'm going to Europe next week.»
- `頼む` (N5) — あなたに頼んでもよろしいですか。 — «May I request a favour of you?»
- `頼む` (N5) — 田中さんのことを頼むよ。 — «Take care of Mr. Tanaka for me!»
- `落ちる` (N4) — 勉強しないと試験に落ちるよ。 — «If you don't study, you will fail the exam.»
- `落ちる` (N4) — サーバーが落ちていた。 — «The server was down.»
- `卵` (N5) — 卵は硬くゆでてください。 — «Boil the eggs hard.»
- `立てる` (N4) — バースデーケーキにろうそくを立ててください。 — «Please put some candles on the birthday cake.»
- `立てる` (N4) — 猫が私の手につめを立てた。 — «The cat dug its claws into my hand.»
- `料理` (N5) — これらのりんごは料理用にもってこいだ。 — «These apples are good cookers.»
- `料理する` (N5) — これらのりんごは料理用にもってこいだ。 — «These apples are good cookers.»
- `緑` (N5) — 東京ミッドタウンは緑がいっぱい！ — «There's a lot of greenery in Tokyo Midtown!»
- `緑` (N5) — あなたは緑と青を見分けることができますか。 — «Can you tell green from blue?»
- `冷える` (N4) — 冷えたビールがあればたまらないね。 — «A cold beer would hit the spot!»
- `冷たい` (N5) — もう手が冷たくって。 — «My hand's getting too cold.»
- `練習` (N5) — あなたはいつピアノの練習をしますか。 — «When do you practice the piano?»
- `練習する` (N5) — あなたはいつピアノの練習をしますか。 — «When do you practice the piano?»
- `連れる` (N4) — でもさ、母を連れて行かなくてはいけないんだ。 — «But, I have to take my mother.»
- `六` (N5) — 私は毎朝六時に起きます。 — «I get up at six every morning.»
- `話` (N5) — 話を聞かせてくれ。 — «I want a full report though.»
- `話` (N5) — 人の話に水を差さないでくれ。 — «Don't throw a wet blanket over our conversation.»
- `話す` (N5) — 英語はカナダで話されている。 — «English is spoken in Canada.»
- `話す` (N5) — あなたの趣味について話してください。 — «Please tell me about your hobbies.»
