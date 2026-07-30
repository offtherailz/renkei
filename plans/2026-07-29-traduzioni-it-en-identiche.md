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

## Stato: 340 frasi ancora da tradurre (lotti 1-3 fatti il 30/07)

- N4: 170
- N5: 168
- EXTRA: 2

## Come si sistema

Stesso flusso già in uso nel progetto (ciclo insegnante-agente, ARCHITECTURE.md): per
ognuna, tradurre `it` DAL GIAPPONESE (il testo è già corretto, serve solo la resa
italiana vera) e scrivere la correzione in `scripts/data/word-overrides.json` (mai
solo nel seed, o il prossimo sync la cancella) — se la parola non ha ancora un
override, serve l'INTERO array `frasi_esempio` corrente (gli array negli override
SOSTITUISCONO, non si fondono). Controllare anche, per ogni parola toccata, che la
frase contenga davvero la parola stessa (non un sinonimo/variante/cifra sbagliata).

## Lista completa (id — livello — giapponese — «traduzione da correggere»)

- `姉` (N5) — 姉は私のズボンにアイロンをかけてくれる。 — «My sister presses my trousers.»
- `子供` (N5) — あなたには何人子供がいますか。 — «How many children do you have?»
- `思い出す` (N4) — あなたを見るとお兄さんを思い出します。 — «You remind me of your brother.»
- `指` (N4) — ドアに指をはさみました。 — «I caught my finger in the door.»
- `支度` (N4) — すぐに旅の支度をしなさい。 — «Get ready for the trip at once.»
- `支度する` (N4) — すぐに旅の支度をしなさい。 — «Get ready for the trip at once.»
- `止まる` (N5) — そして、電車はキーッという音を立てて止まった。 — «Then, the train screeched to a halt.»
- `止む` (N4) — 雨がやみさえすればいいのになあ。 — «If only it would stop raining!»
- `死ぬ` (N5) — その少年は死んだものとしてあきらめられた。 — «The boy was given up for dead.»
- `試験` (N4) — とにかく、試験が終わってほっとしたよ。 — «Anyhow, I'm relieved the test is over.»
- `試験する` (N4) — とにかく、試験が終わってほっとしたよ。 — «Anyhow, I'm relieved the test is over.»
- `試合` (N4) — その試合は何時に始まりますか。 — «What time does the game start?»
- `試合する` (N4) — その試合は何時に始まりますか。 — «What time does the game start?»
- `歯` (N5) — その赤ちゃんは歯が生えはじめている。 — «The baby is cutting his teeth.»
- `歯医者` (N4) — 今日歯医者へ行きました。 — «Today I went to the dentist's.»
- `似る` (N4) — 私も似た話を聞いたことがある。 — «I also heard a similar story.»
- `似る` (N4) — ニュージーランドの気候は日本のと似ている。 — «The climate of New Zealand is similar to that of Japan.»
- `持つ` (N5) — コートを持ちましょうか。 — «Shall I carry your coat?»
- `時々` (N5) — ジェーンはときどき学校まで走っていく。 — «Jane sometimes runs to school.»
- `時間` (N5) — いつだって読書の時間は見つけられる。 — «We can always find time for reading.»
- `時計` (N5) — あなたの時計では何時ですか。 — «What time is it by your watch?»
- `次` (N5) — この次来るときは、花を持ってきてあげよう。 — «Next time I come, I'll bring you some flowers.»
- `叱る` (N4) — あなたは先生にしかられましたか。 — «Were you scolded by your teacher?»
- `叱る` (N4) — ママに叱られますよ。 — «You'll catch it from Mummy.»
- `失敗` (N4) — １度や２度の失敗はだれにでもある。 — «Everybody fails once or twice.»
- `失敗する` (N4) — １度や２度の失敗はだれにでもある。 — «Everybody fails once or twice.»
- `失礼` (N4) — それではそろそろ失礼します。 — «Well, I must be going.»
- `失礼` (N4) — 「失礼ですが」とアンが話に割って入った。 — «"Excuse me," Ann broke in.»
- `失礼する` (N4) — それではそろそろ失礼します。 — «Well, I must be going.»
- `失礼する` (N4) — 「失礼ですが」とアンが話に割って入った。 — «"Excuse me," Ann broke in.»
- `写す` (N4) — その写真は空から写されたものである。 — «The picture was taken from the air.»
- `写す` (N4) — このページをノートに写しておきなさい。 — «Copy this page in your notebook.»
- `邪魔` (N4) — お邪魔じゃないでしょうか。 — «I hope I'm not disturbing you.»
- `邪魔する` (N4) — お邪魔じゃないでしょうか。 — «I hope I'm not disturbing you.»
- `借りる` (N5) — この本をお借りしてもよろしいですか。 — «May I borrow this book?»
- `借りる` (N5) — ２部屋あるアパートを借りたいのですが。 — «I want to rent an apartment with two rooms.»
- `弱い` (N5) — それを言われると弱いなあ。 — «That sure puts me on the spot.»
- `取り替える` (N4) — これを青いのと取り替えてください。 — «Please change this for a blue one.»
- `取る` (N5) — 水分をたくさん取ってください。 — «You should drink a lot of liquid.»
- `取る` (N5) — そのお金はいざというときのために取っておくよ。 — «I'm going to lay aside that money for emergencies.»
- `手` (N5) — いい手を思いついた。 — «I hit upon a good idea.»
- `手紙` (N5) — ここにあなたあての手紙が何通かあります。 — «Here are some letters for you.»
- `手伝う` (N4) — いつでもお手伝いします。 — «I am always ready to help you.»
- `趣味` (N4) — 趣味については話しましたか？ — «Did you talk about your hobby?»
- `首` (N4) — あなたの首は風前のともし火だ。 — «Your job hangs by a thread.»
- `首` (N4) — 鳥は首をひょいと水に浸した。 — «The bird dipped its head into the water.»
- `授業` (N5) — それは授業の終わりだった。 — «That was the end of the class.»
- `授業する` (N5) — それは授業の終わりだった。 — «That was the end of the class.»
- `拾う` (N4) — ホテルの前で私を車で拾ってください。 — «Please pick me up by car in front of the hotel.»
- `拾う` (N4) — 日本では昼間でも夜でもタクシーを拾うことができる。 — «In Japan you can always catch a cab, day or night.»
- `習う` (N5) — 車の運転を習っています。 — «I've been learning to drive.»
- `習慣` (N4) — その習慣は中国で始まった。 — «The custom originated in China.»
- `習慣` (N4) — 彼はたばこを吸う習慣をやめた。 — «He got out of the habit of smoking.»
- `十::(〜を) とお` (N5) — その会は十時に終わった。 — «The party ended at ten o'clock.»
- `十::じゅう` (N5) — その会は十時に終わった。 — «The party ended at ten o'clock.»
- `十分` (N4) — 私はこの本を買うのに十分なお金を持っている。 — «I have enough money to buy this book.»
- `十分` (N4) — 「もっと召し上がりますか」「いいえ、じゅうぶんいただきました」 — «"Would you like any more?" "No, I've had enough."»
- `出かける` (N5) — １０分前に出かけました。 — «She left home ten minutes ago.»
- `出す` (N5) — ここではおいしい食べ物が出されます。 — «They serve excellent food here.»
- `出す` (N5) — この件では名前を出したくない。 — «I want to remain anonymous in this.»
- `出る` (N5) — 電話には出なかったからメールしておきました。 — «He didn't answer the phone, so I left him an email.»
- `出る` (N5) — 私の家におばけが出たのは本当だ。 — «It's true that a ghost appeared at my house.»
- `出国する` (EXTRA) — あなたが出国するまでお預かりします。 — «We will keep it for you until you leave.»
- `出発` (N4) — すぐに出発した方がいいですよ。 — «You had better depart at once.»
- `出発する` (N4) — すぐに出発した方がいいですよ。 — «You had better depart at once.»
- `準備` (N4) — 準備ができるまでちょっと待ってくれ。 — «Hang on a bit until I'm ready.»
- `準備する` (N4) — 準備ができるまでちょっと待ってくれ。 — «Hang on a bit until I'm ready.»
- `所` (N5) — おじを見送りに駅に行ってきたところだ。 — «I have been to the station to see my uncle off.»
- `所` (N5) — あっ、いけない！忘れるところだった！ — «Oh, no! I almost forgot!»
- `書く` (N5) — ここにあなたの名前をかいてくれませんか。 — «Would you please write your name here?»
- `女性` (N4) — その少女は大きくなってすらりとした女性になった。 — «The girl has grown into a slender woman.»
- `勝つ` (N4) — この病気に勝てる人は少ない。 — «Not many survive this disease.»
- `召し上がる` (N4) — ここで召し上がりますか、それともお持ち帰りですか。 — «Is this to eat here, or to go?»
- `小学校` (N4) — あなたは小学校に通っているの？ — «Do you go to an elementary school?»
- `小説` (N4) — トムは小説を読んでいる。 — «Tom is reading a novel.»
- `小説` (N4) — 事実は小説よりも奇なり。 — «Fact is stranger than fiction.»
- `小鳥` (N4) — 小鳥たちはたのしそうにさえずっています。 — «The birds are singing merrily.»
- `少し` (N5) — 少しテレビを見てもいいですか。 — «Do you mind if I watch TV for a while?»
- `床屋` (N4) — おや、床屋へ行ってきたのだね。 — «Oh, you've been to the barbershop.»
- `承知` (N4) — 人はすべて死すべきものと承知している。 — «We know that all men are mortal.»
- `承知` (N4) — よろしい。お申し出は承知しました。 — «All right. I'll accept your offer.»
- `承知する` (N4) — 人はすべて死すべきものと承知している。 — «We know that all men are mortal.»
- `承知する` (N4) — よろしい。お申し出は承知しました。 — «All right. I'll accept your offer.»
- `招待` (N4) — ご招待をありがとうございます。 — «Thank you for your invitation.»
- `招待する` (N4) — ご招待をありがとうございます。 — «Thank you for your invitation.»
- `消える` (N5) — その音楽の音はしだいに消えていった。 — «The music faded away.»
- `消える` (N5) — 流行は古くなって消えていく。 — «Fashions grow old and die.»
- `消しゴム` (N4) — ちょっと消しゴムをかしてくれませんか。 — «Can I borrow your eraser for a moment?»
- `焼く` (N4) — この夏はこんがり焼こうと思います。 — «I am going to try to get a good tan.»
- `焼く` (N4) — このお肉をもうすこし焼いてくださいませんか。 — «Could you cook this meat a little more?»
- `焼ける` (N4) — このトーストはよく焼けていません。 — «This toast is not done enough.»
- `上がる` (N4) — 明日それをいただきに上がります。 — «I will call for it tomorrow.»
- `上がる` (N4) — 来月タクシー料金があがります。 — «Taxi fares will go up next month.»
- `上手` (N5) — あなたは上手にバスケットボールができますか。 — «Do you play basketball well?»
- `心配` (N4) — その男の子は心配して病気になった。 — «The boy got sick from anxiety.»
- `心配` (N4) — 心配してくれる人がいて幸せだ。 — «I'm so lucky to have someone who cares.»
- `心配する` (N4) — その男の子は心配して病気になった。 — «The boy got sick from anxiety.»
- `心配する` (N4) — 心配してくれる人がいて幸せだ。 — «I'm so lucky to have someone who cares.»
- `新聞` (N5) — ジョンのことが新聞に出ていた。 — «John was mentioned in the paper.»
- `進む` (N4) — あの時計は１分進んでいます。 — «That clock is one minute fast.»
- `人` (N5) — この人は画家だ！ — «This fellow is an artist!»
- `人` (N5) — 人は意識のある生き物だ。 — «Man is a conscious being.»
- `人形` (N4) — メアリーは私にアメリカの人形をくれた。 — «Mary gave me an American doll.»
- `吹く` (N5) — あの日は強い風が吹いていました。 — «There was a strong wind that day.»
- `吹く` (N5) — ローズはしゃぼん玉を吹いていた。 — «Rose was blowing bubbles.»
- `水泳` (N4) — 水泳が私の楽しみの１つです。 — «Swimming is one thing I enjoy.»
- `水泳する` (N4) — 水泳が私の楽しみの１つです。 — «Swimming is one thing I enjoy.»
- `随分` (N4) — 私たちはもうずいぶん長くここにいます。 — «We've been here long enough.»
- `随分` (N4) — あなたはこの１年に英語が随分進歩した。 — «You've made remarkable progress in English in the past year.»
- `星` (N4) — ドアには大きな金色の星がついていました。 — «There was a big gold star on the door.»
- `星` (N4) — その星は必ずしも肉眼で見えるわけではない。 — «We cannot necessarily see the star with the naked eye.»
- `晴れる` (N5) — 明日は晴れるだろう。 — «It will be fine tomorrow.»
- `正月` (N4) — 正月はすぐそこまで来ている。 — «New Year's Day is close at hand.»
- `生産` (N4) — この工場はＣＤプレーヤーを生産している。 — «This factory produces CD players.»
- `生産する` (N4) — この工場はＣＤプレーヤーを生産している。 — «This factory produces CD players.»
- `声` (N5) — あなたの声が聞けてうれしいわ。 — «I am happy to hear your voice.»
- `声` (N5) — 日本人は鳥や虫の声を楽しむ。 — «The Japanese enjoy the songs of birds and insects.»
- `青い` (N5) — なぜ空が青いか知っているか。 — «Do you know why the sky is blue?»
- `青い` (N5) — お前はまだ「青い」な。 — «You're still green.»
- `席` (N4) — この席を見ていてくれませんか。 — «Can you save this seat for me?»
- `赤ん坊` (N4) — うちの赤ん坊は口をきくようになってきました。 — «Our baby is learning to speak.»
- `切る` (N5) — エアコンを切ってもかまいませんか。 — «Do you mind if I turn off the AC?»
- `切る` (N5) — トランプをよく切ってください。 — «Please shuffle the cards carefully.»
- `切符` (N5) — この切符で二人入れるよ。 — «The ticket admits two persons.»
- `折れる` (N4) — ついにバス会社が折れた。 — «At last, the bus company gave in.»
- `折れる` (N4) — 医者は彼の折れた足をついだ。 — «The doctor set his broken leg.»
- `先` (N5) — それから先の話を聞きたい。 — «I'd like to know the rest of the story.»
- `先` (N5) — 二人の男のうち、背の高い方が先に出ていった。 — «The taller of the two men went out first.»
- `浅い` (N4) — この川はあそこで浅くなっている。 — «This river becomes shallow at that point.»
- `前` (N5) — まっすぐ前を見てください。 — «Look forward, please.»
- `前` (N5) — 父は２年前に亡くなった。 — «My father passed away two years ago.»
- `全然` (N4) — あなたの作文は全然だめだというわけではない。 — «Your composition is not altogether bad.»
- `全然` (N4) — 「長い１日だったのでお疲れでしょう」「いいえ、全然」 — «"You must be tired after a long day." "No, not in the least."»
- `窓` (N5) — 窓を開けっぱなしにしておいたの？ — «Did you leave the window open?»
- `走る` (N5) — あの走ってる少年をごらんなさい。 — «Look at that boy running.»
- `走る` (N5) — 道はくねくねと畑の中を走っていた。 — «The road wound through the fields.»
- `送る` (N4) — この手紙を日本に送ってくれませんか。 — «Could you send this letter to Japan?»
- `送る` (N4) — お宅までお送りしましょうか？ — «May I escort you home?»
- `贈り物` (N4) — ジェニーは贈り物をありがとうと言った。 — «Jenny thanked me for the gift.»
- `息子` (N4) — 母親は息子にやかましく言って聞かせた。 — «The mother whipped sense into her boy.»
- `足す` (N4) — ６０にするためには１７に何を足せばよいの。 — «What do you have to add to 17 to get 60?»
- `足す` (N4) — もしコーヒーが濃すぎれば、いくらかお湯を足して下さい。 — «If the coffee is too strong, add some more water.»
- `続ける` (N4) — ケンはその歌を歌い続けた。 — «Ken kept on singing that song.»
- `村` (N5) — 町は村よりも大きい。 — «Towns are larger than villages.»
- `打つ` (N4) — ８時をちょうど打ちましたね。 — «It has just struck eight, hasn't it?»
- `打つ` (N4) — スロットを打っているうちに、あれよあれよと今の時間です。 — «I was hitting the slots, and before I knew it, it's this time already.»
- `待つ` (N5) — しばらく電話を切らずにお待ちください。 — «Please hold the line a moment.»
- `代わり` (N4) — 自分で行く代わりに手紙を送りました。 — «Instead of going myself, I sent a letter.»
- `大きい` (N5) — きみは何と大きい家を持っているんだろう。 — «What a big house you have!»
- `大きい` (N5) — もっと大きい声で言ってください。 — «Louder, please.»
- `大学生` (N4) — 私の兄は大学生です。 — «My brother is a college student.»
- `大丈夫` (N5) — いや、大丈夫だ。 — «No, no, that's okay.»
- `大丈夫` (N5) — 彼女は今のところ大丈夫です。 — «She is all right at the moment.»
- `大人` (N5) — 大人だけこの映画が見える。 — «Only adults can see this film.»
- `大勢` (N5) — そこには大勢の人がいた。 — «There was a large crowd there.»
- `大体` (N4) — だいたいどのくらいの時間がかかりますか。 — «About how long will it take?»
- `大体` (N4) — 仕事はだいたい終わった。 — «The work is mostly done.»
- `誰` (N5) — あそこに立ってる女の人はだれですか。 — «Who is the woman standing there?»
- `短い` (N5) — 日がだんだん短くなっている。 — «The days are becoming shorter.»
- `短い` (N5) — あの犬はしっぽが短い。 — «That dog has a short tail.»
- `誕生日` (N5) — 今日は、妹の誕生日です。 — «Today is my sister's birthday.»
- `暖かい` (N5) — だんだん暖かくなります。 — «It will get warmer and warmer.»
- `暖かい` (N5) — 彼女は心の温かい人なんです。 — «She has a kind heart.»
- `男の子` (N5) — あのハンサムな男の子を見て。 — «Look at that good-looking boy.»
- `値段` (N4) — このラジオの値段はいくらですか。 — «What is the price of this radio?»
- `地下鉄` (N5) — 地下鉄で行きたいのです。 — «I want to get there by subway.»
- `地図` (N5) — どこへ行けばヨーロッパの地図が手に入りますか。 — «Where can I obtain a map of Europe?»
- `池` (N5) — この前の夏にこの池は水がなくなりました。 — «The pond dried up last summer.»
- `置く` (N5) — あいにく私はカメラを家においてきた。 — «As it happens, I have left the camera at home.»
- `置く` (N5) — それをテーブルの上に置きなさい。 — «Lay it on the table.»
- `茶色` (N5) — その犬は茶色で小さくて、やせています。 — «The dog is brown, small and thin.»
- `中学校` (N4) — この歌を聞くと私の中学校時代を思い出します。 — «This song reminds me of my junior high school days.»
- `昼` (N5) — ケンは昼まで家にいるでしょう。 — «Ken will be at home until noon.»
- `昼` (N5) — 昼はホットドッグを食べたんだ。 — «I ate a hot dog for lunch.»
- `長い` (N5) — だんだん日が長くなっています。 — «The days are getting longer and longer.»
- `長い` (N5) — これは日本で２番目に長い川だ。 — «This is the second longest river in Japan.»
- `直す` (N4) — あなたの時計は明日までには直しておきますよ。 — «I will have repaired your watch by tomorrow.»
- `直す` (N4) — その本をなおしなさい。 — «Put the book back where you found it.»
- `直る` (N4) — いったい、いつになったらそのケチは直るの？ — «When will you ever loosen your purse strings?»
- `通る` (N4) — 私は毎日その教会の前を通る。 — «I go by that church every day.»
- `通る` (N4) — 彼女はベスという名で通っていた。 — «She went by the name of Bess.»
- `程` (N4) — 「小川さんはいつ来たか」「１０分ほど前だ」 — «"When did Mr Ogawa arrive?" "Ten minutes ago."»
- `程` (N4) — スージーほど上手にピアノをひけるとよいのだが。 — «I wish I could play the piano as well as Susie.»
- `天気` (N5) — 今日が天気ならいいのに。 — «I wish it were fine today.»
- `展覧会` (N4) — 私たちは毎年展覧会を開く。 — «We hold an exhibition every year.»
- `点` (N4) — どんな小さな点でも見ることができる。 — «I can see the tiniest spot.»
- `点` (N4) — 我々のチームが２点リードしている。 — «Our team is two points ahead.»
- `田舎` (N4) — 去年の夏、父の田舎に行きました。 — «I visited my father's hometown last summer.»
- `田舎` (N4) — １週間田舎にいてすっかり元気になったような気がする。 — «I feel completely restored after a week in the country.»
- `電車` (N5) — あなたは始発電車に間にあいましたか。 — «Did you catch the first train?»
- `電灯` (N4) — ルーシーは電灯のスイッチをつけた。 — «Lucy turned on the light switch.»
- `塗る` (N4) — ジョンがドアにペンキを塗っていた。 — «John has been painting the door.»
- `渡す` (N5) — 走者がリレーでバトンを渡さなければなりません。 — «A runner must pass the baton in a relay race.»
- `渡す` (N5) — それじゃあこのメモを渡してください。緊急です。 — «Then, please give him this note. This is urgent.»
- `登る` (N5) — あなたは、上れませんよ。 — «You cannot climb!»
- `登る` (N5) — そのとき太陽がのぼるところだった。 — «The sun was coming up then.»
- `途中` (N4) — 学校へ行く途中でトムに会った。 — «I met Tom on my way to school.»
- `途中` (N4) — 途中であきらめるな。 — «Don't give up halfway.»
- `都合` (N4) — 何時がご都合よいでしょうか。 — «What time will be right for you?»
- `土曜日` (N5) — 私は土曜日からここにいます。 — «I've been here since Saturday.»
- `冬` (N5) — まもなく冬だ。 — «It will be winter before long.»
- `答える` (N5) — 「はい、ありません」とジョーダンさんは答えた。 — «"No, I don't," said Mr Jordan.»
- `頭` (N5) — アリスは頭に花をさしています。 — «Alice has a flower in her hair.»
- `頭` (N5) — トムは先週の頭に車を盗まれた。 — «Tom had his car stolen early last week.»
- `働く` (N5) — スイッチは時間通りに働かなかった。 — «The switch didn't work on time.»
- `働く` (N5) — 彼は５時間以上もぶっ続けで働いた。 — «He worked more than five hours on end.»
- `動く` (N4) — まだ動くうちに売ってしまわなきゃ。 — «I should sell it while it still runs.»
- `動く` (N4) — 私は家の中で何かが動くのを感じた。 — «I felt something move in the house.»
- `動物` (N5) — 私はその動物の名前を知っている。 — «I know the name of this animal.»
- `特急` (N4) — 時計がおくれていたので、私は特急にのりそこねた。 — «As my watch was slow, I missed the special express.»
- `読む` (N5) — ミルトンの作品を読んだことがありますか。 — «Have you ever read Milton's works?»
- `読む` (N5) — 彼女の心の動きを読むことさえできなかった。 — «I could not even make a guess at the working of her mind.»
- `届ける` (N4) — 家に届けていただけますか。 — «Can you deliver it to my house?»
- `内` (N4) — 教会は私の家とあなたの家の中にあります。 — «The church is between my house and yours.»
- `内` (N4) — エイズが私が生きているうちに治ることを願っているよ。 — «I have a dream that AIDS will be cured in my lifetime.»
- `南` (N5) — フランスは英国の南にある。 — «France is to the south of England.»
- `二十日` (N5) — 私は二十日までに帰るつもりです。 — «I expect to be back by the 20th.»
- `二日` (N5) — それは１週間前、すなわち４月２日に行われた。 — «It was due a week ago, namely on April second.»
- `二日` (N5) — ２日で３つの州を走破した。 — «We covered three states in two days.»
- `匂い` (N4) — あの花はにおいが強いな。 — «That flower has a powerful smell.»
- `入れる` (N5) — あなたは、私にコーヒーをいれてもらいたいですか。 — «Do you want me to make coffee?»
- `入れる` (N5) — それは引き出しに入れておきました。 — «I put it in the drawer.»
- `入国する` (EXTRA) — 入国の目的は何ですか。 — «What's the purpose of your visit?»
- `熱` (N4) — １０２゜Ｆの熱があります。 — «I have a fever of 102 degrees.»
- `熱` (N4) — 彼は学生運動熱に浮かされている。 — «He is being carried away by a student movement.»
- `年` (N5) — お年をお聞きしてよろしいでしょうか。 — «Might I ask your age?»
- `年` (N5) — 一月は年の一番目の月です。 — «January is the first month of the year.»
- `拝見` (N4) — パスポートを拝見できますか。 — «May I see your passport, please?»
- `拝見する` (N4) — パスポートを拝見できますか。 — «May I see your passport, please?»
- `背広` (N5) — 私は新しい背広を買った。 — «I bought a new suit of clothes.»
- `倍` (N4) — あの山はこの山の５倍の高さである。 — «That mountain is five times as high as this one.»
- `倍` (N4) — 彼は私の倍食べた。 — «He ate twice as much as I did.»
- `買い物` (N5) — １日おきに買い物に行く。 — «I go shopping every other day.»
- `買い物する` (N5) — １日おきに買い物に行く。 — «I go shopping every other day.»
- `薄い` (N5) — 肉を薄く切りなさい。 — «Cut the meat into thin slices.»
- `薄い` (N5) — 彼はうすい青色のネクタイをしていた。 — «He wore a light blue tie.»
- `発音` (N4) — あなたのお名前はどのように発音するのですか。 — «How do you pronounce your name?»
- `発音する` (N4) — あなたのお名前はどのように発音するのですか。 — «How do you pronounce your name?»
- `番号` (N5) — ええ、じゃあ私の電話番号教えるね。 — «OK. Let me give you my number.»
- `悲しい` (N4) — そんな悲しい目で見ないで。 — «Don't give me such a sad look.»
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
