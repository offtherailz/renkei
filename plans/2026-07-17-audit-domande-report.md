# Audit domande generate — 2026-07-17

Fonte: `plans/question-audit-sample.md` (336 domande, 10 modalità). Revisione da insegnante madrelingua: segnalo solo le domande sbagliate o fuorvianti. Formato: `- [modalità] «frase» — problema — fix`.

## multiple-choice (significato)

- [multiple-choice] «浴びる» — distrattore "dov'è il banco del check-in?" è una frase intera tra glosse di una parola: si esclude a colpo d'occhio — nel pool distrattori escludere le entry-frase (o usarle solo quando il target è una frase).
- [multiple-choice] «美味しい» — stesso difetto: distrattore "dov'è il banco del check-in?" accanto a "buono (di sapore)" — filtrare i distrattori per lunghezza/tipo (parola vs frase fatta).
- [multiple-choice] «水道» — distrattore "salutamelo/salutala da parte mia" (frase) tra glosse di sostantivi/verbi — come sopra.
- [multiple-choice] «それほど» — glossa "così tanto" fuorviante: それほど si usa quasi solo con negazione ("non così tanto / non a tal punto") — correggere la glossa nel seed via overrides ("(non) così tanto, a tal punto").

Per il resto la modalità è pulita: prompt in kanji, corretta univoca, distrattori plausibili.

## flashcard-recognition (IT→JP)

- [flashcard-recognition] «ristorante», «volo», «bistecca», «bottone» — la corretta è l'unica opzione in katakana tra distrattori in kanji/kana: per i prestiti la risposta si indovina dallo script senza sapere la parola — quando il target è katakana, pescare almeno 1-2 distrattori katakana.
- [flashcard-recognition] «dov'è il noleggio del router Wi-Fi?» — la corretta è una frase lunghissima tra tre parole singole (靴下・色・砂糖): giveaway totale — per i target-frase usare distrattori-frase.
- [flashcard-recognition] «e allora» → すると — distrattore "高校; 高等学校" mostra il separatore interno "; " grezzo — renderizzare solo la prima variante nelle scelte.

## reading-recognition (lettura→scrittura)

- [reading-recognition] «おりる» — scelte con 下りる E 降りる: entrambe si leggono おりる, il quiz marca giusto solo 下りる — omofono come distrattore, domanda senza risposta univoca. [GIÀ FIXATO]
- [reading-recognition] «きる» — scelte con 着る (corretta) E 切る: entrambe leggono きる — stesso bug omofoni. [GIÀ FIXATO]
- [reading-recognition] «はな» — scelte con 鼻 (corretta) E 花: entrambe leggono はな — stesso bug omofoni. [GIÀ FIXATO]
- [reading-recognition] «おこなう» — distrattore 行なう: non è uno sbaglio ma una grafia con okurigana ammessa (許容) di 行う; chi la sceglie non sbaglia davvero — escludere le varianti okurigana lecite dal generatore di pseudo-errori (usare solo errori impossibili tipo 行こなう).
- [reading-recognition] «おばさん» — distrattore "伯母さん; 叔母ばさん" e corretta "伯母さん; 叔母さん": stringhe multi-variante con "; " incollate nelle scelte, illeggibili e con lo pseudo-errore applicato solo alla seconda variante — splittare le varianti prima di generare scelte/pseudo-errori.

## conjugation

- [conjugation] «Passato negativo (〜くなかった)» per 早い/大きい/正しい — l'etichetta contiene il suffisso letterale e UNA sola scelta finisce in 〜くなかった: si risponde leggendo l'etichetta, senza conoscere la coniugazione — o togliere il suffisso dall'etichetta per gli aggettivi, o usare distrattori che condividono la desinenza (早くなった, 早くなかった di altro aggettivo… meglio: 速くない/早かった con label neutra).
- [conjugation] «Negativa (〜くない)» e «Avverbiale (〜く)» — stesso difetto sistematico: 白くない, 古く, 寒く sono le uniche opzioni con la desinenza dichiarata nell'etichetta.
- [conjugation] «堅; 硬; 固くない» — le varianti kanji con "; " vengono coniugate come stringa unica producendo scelte-mostro ("堅; 硬; 固いだった") — coniugare una sola variante.

Le domande sui verbi (て形, た形, ない形, ます形) sono ben costruite: i distrattori condividono la desinenza e testano davvero la classe del verbo.

## verb-form-cloze (forma nel contesto)

- [verb-form-cloze] «この漢字はよく＿＿。» — corretta 使います ma il distrattore 使われる dà una frase altrettanto (anzi più) naturale: 「この漢字はよく使われる」 — risposta non univoca; escludere il passivo dai distrattori quando il soggetto è inanimato+は.
- [verb-form-cloze] «三月に大学を＿＿。» — corretta 卒業します ma 卒業した è ugualmente grammaticale ("a marzo mi sono laureato") — senza contesto temporale il tempo non è determinabile; non offrire presente e passato dello stesso verbo se entrambi stanno in piedi.
- [verb-form-cloze] «１０時までに＿＿。» — corretta 来ます ma 来て (richiesta: 「１０時までに来て。」) e 来た sono frasi valide — stessa ambiguità presente/passato/richiesta su frase senza contesto.
- [verb-form-cloze] «すぐに＿＿方がいいですよ。» — corretta 出発した ma 出発する方がいい è grammaticale (consiglio più debole ma accettato) — non mettere la forma dizionario come distrattore di 〜た方がいい.
- [verb-form-cloze] «仕事はすらすらと運んだ。» — frase innaturale: すらすら si usa per parlare/scrivere/leggere, non con 運ぶ intransitivo (meglio 「仕事がスムーズに運んだ」 o cambiare esempio) — sostituire la frase d'esempio.
- [verb-form-cloze] «お前は恩を仇で返したな。» — registro rude + espressione idiomatica (恩を仇で返す) fuori livello N5/N4 — sostituire con un esempio piano di 返す.

## usage-cloze (parola nel contesto)

- [usage-cloze] «この本は＿＿円です。» — corretta 千 ma anche 十 e 三 riempiono il buco in modo perfettamente grammaticale (十円/三円): senza altro contesto ogni numerale va bene — non generare cloze su numerali con altri numerali come distrattori (o escludere i numeri dal pool distrattori di un target-numero).
- [usage-cloze] «＿＿話は 聞いた ことが ありません。» — corretta そんな ma こんな (e persino 小さな) danno frasi grammaticali e sensate — per i dimostrativi こんな/そんな/あんな non usarsi a vicenda come distrattori in frasi senza contesto deittico.
- [usage-cloze] «ケイトは中国語を＿＿話せない。» — corretta ほとんど ma il distrattore それほど è accettabile (「それほど話せない」 = non così bene) — coppia quasi sinonima in frase negativa, risposta non univoca.
- [usage-cloze] «＿＿の思う壷だぞ。» — espressione idiomatica (思う壺) e tono da manga, fuori livello e poco utile per testare 向こう — sostituire la frase d'esempio.
- [usage-cloze] «雨か。＿＿ね。» — distrattori "チェックインカウンターはどこですか" e "お先に失礼します": frasi intere che non possono stare davanti a ね, si escludono senza leggere — filtrare le entry-frase dai distrattori dei cloze.
- [usage-cloze] «あ！＿＿！ガソリンが切れてきた。» — la frase usa まずい nel senso colloquiale "accidenti/guai", ma la carta insegna まずい = cattivo di sapore: chi conosce la glossa non riconosce l'uso — scegliere una frase d'esempio allineata alla glossa insegnata.

## particle-cloze

- [particle-cloze] «昼休みに 公園＿＿ 散歩します。» — corretta を ma で è pienamente grammaticale (「公園で散歩します」) — coppia を/で del moto in luogo: non offrirle insieme, o usare un verbo che disambigua (通る, 渡る).
- [particle-cloze] «週末に映画館＿＿行きます。» — corretta へ ma まで è tra le scelte ed è grammaticale (「映画館まで行きます」) — con 行く non offrire へ/に/まで nello stesso set.
- [particle-cloze] «よく図書館＿＿行きます。» — stesso caso: へ corretta ma まで accettabile — idem.
- [particle-cloze] «グランド・セントラル駅＿＿やってください。» — corretta まで ma へ (e に) sono difendibili col taxi-やる — set へ/まで/に/から troppo sovrapposto per questa frase.
- [particle-cloze] «ここ＿＿海の音が聞こえる。» — corretta から, ma より (ablativo formale/scritto) è tra le scelte ed è grammaticale anche se ricercato — segnalato come minore; meglio sostituire より con の.
- [particle-cloze] set a 3 scelte («映画館へ», «小学校に», «図書館へ») accanto a set a 4 — incoerenza minore di UI; se è il fallback quando mancano distrattori sicuri, ok, ma verificare che non sia un bug del pool.

I cloze su の attributivo (雨の日, 出国の手続き, 図書館の利用…) sono tutti univoci e ben fatti.

## transitivity-pair

- [transitivity-pair] «りの部屋から音楽が＿＿» — cloze mal piazzato in testa: la frase mostrata parte da 「りの部屋」 perché il taglio ha mangiato 「とな」 di となり (full: 「となりの部屋から…」) — stesso bug di troncamento del caso 「___れが」: il ritaglio della frase deve rispettare i confini di parola.
- [transitivity-pair] «はしを＿＿» (full: 「はしを渡ると、公園です。」) — il troncamento della coda (ると、公園です) rende la domanda ambigua: senza contesto はし può essere 箸/橋 e 「はしを渡す」 (passare le bacchette) è grammaticale, quindi il distrattore 渡す è difendibile — mostrare la frase intera con il buco, non tagliarla al buco.
- [transitivity-pair] «店の前に人が＿＿» — corretta 並んで ma la frase mostrata finisce lì: 「人が並んで」 è un frammento; l'ausiliare います che giustifica la forma in て è nascosto dal taglio — idem: mantenere la coda della frase (「人が＿＿います」).
- [transitivity-pair] «まどを＿＿» (full: 「まどを開けてください。」) — con la coda ください tagliata resta 「まどを＿＿」; il distrattore 開いて non è impossibile (窓を開く transitivo è attestato, es. 本を開く) e senza ください la forma richiesta non è deducibile — mostrare 「まどを＿＿ください」.
- [transitivity-pair] «ここに車を＿＿», «いつゴルフを＿＿», «ラジオの音を＿＿» — stesso difetto sistematico: la parte dopo il buco (てもいいですか/たのですか/くれませんか) è tagliata, quindi le opzioni coniugate restano frammenti sospesi e il contesto che fissa la forma sparisce — il generatore deve emettere sentenceWithBlank = frase completa con ＿＿ al posto del solo verbo.
- [transitivity-pair] «ついにバス会社が折れた。» — 折れる in senso figurato "cedere nella trattativa": fuori livello e non testa la coppia 折る/折れる in senso fisico — sostituire con un esempio concreto (枝が折れた).

## composition

- [composition] «ちっとも» — banco ク・エ・ン・も・っ・と・ち: gli intrusi sono katakana in una parola hiragana, si scartano dallo script senza pensare — intrusi dello stesso script del target.
- [composition] «まず» — intruso オ (katakana tra hiragana): stesso difetto.
- [composition] «アパート» — intrusi あ・っ hiragana in parola katakana: stesso difetto (e あ è la versione hiragana di ア: quasi un suggerimento).
- [composition] «ガソリンスタンド» — intrusi じ・ち hiragana tra katakana: stesso difetto.
- [composition] «パーティー» e «スプーン» — intruso し hiragana tra katakana: stesso difetto.
- [composition] nessun caso trovato di intrusi che compongono un'altra parola valida con lo stesso significato; le parole bersaglio con reading fornito sono univoche.

## grammatica (cloze/reading/ordering)

- [cloze] tutti i cloze grammaticali («水___ください», «勉強した___、テストで0点», «行きたい___、お金がない»…) — distrattori pescati dal vocabolario (毎朝, 暗い, 切手, 妻, プレゼント…) invece che da altri chunk grammaticali: la corretta è l'unica opzione della categoria giusta, si risponde senza conoscere il punto di grammatica — pescare i distrattori dagli altri item grammaticali (だけ↔しか, のに↔ので, けど↔から…).
- [cloze] «___こわれた。 / パソコンをこわしてしまった。» — il prompt mostra la seconda frase che contiene パソコン: rivela la risposta パソコンが — mostrare solo la frase col buco, o oscurare la parola anche nella frase gemella.
- [cloze] «部長、ご飯を召し___» — buco dentro la parola 召し上がる (resta il moncone 召し): cloze mal piazzato; con distrattori casuali (いじめる, 約束する) l'unica opzione attaccabile a 召し è la corretta — fare il buco sull'intera forma 召し上がりましたか o testare altro.
- [cloze] «今、し___よ。» e «荷物を持ち___？» — buco che parte a metà parola (し+なくてもいい, 持ち+ましょうか): il moncone iniziale è legittimo come test dello stem, ma reso con ___ sembra un taglio sbagliato e con distrattori casuali non testa nulla — se si vuole testare stem+suffisso, i distrattori devono essere altri suffissi (〜たくない, 〜ませんか).
- [cloze] «ちょっと待っ___！» — il buco copre solo て di 待って: domanda "scegli て" con distrattori プレゼント/眠る/卒業する, priva di valore — accorpare il buco a un chunk sensato (待ってて, 待ってください) con distrattori di forma. (Nota: qui ちょっと è integro — il bug della particella mangiata dentro ちょっと/こと è [GIÀ FIXATO].)
- [sentence-ordering] «この服、着てみたいです。» e simili — la punteggiatura dei segmenti (virgola a fine 服、, punto finale nel segmento lungo) rivela quasi sempre l'ordine; con 3 segmenti il compito è banale — spezzare in segmenti più piccoli e/o senza punteggiatura-spia.

## Sintesi — difetti sistematici del generatore

1. **Troncamento della frase attorno al buco (transitivity-pair)**: `sentenceWithBlank` viene tagliata a metà parola in testa (「りの部屋…」) e amputata della coda dopo il buco (ください/てもいいですか/ると、…): produce cloze mal piazzati, frammenti sospesi e ambiguità (はしを＿＿). Fix: generare sempre la frase completa sostituendo solo il target con ＿＿, con confini di parola verificati.
2. **Distrattori fuori categoria (cloze grammaticali e multiple-choice)**: i distrattori pescati a caso dal vocabolario non competono mai con la corretta (parola vs chunk grammaticale, parola vs frase intera, kanji vs katakana): quasi ogni domanda si risolve per esclusione di forma. Fix: pool di distrattori omogenei per categoria (grammatica↔grammatica, frase↔frase, katakana↔katakana, numerale mai vs numerale).
3. **Risposte non univoche nei cloze di particelle e forme**: coppie entrambe grammaticali offerte insieme (を/で con 散歩, へ/まで con 行く, 〜た方がいい vs 〜る方がいい, ます/た senza contesto temporale, そんな/こんな, ほとんど/それほど). Fix: lista di esclusioni mutue per frase (o validare i distrattori contro la frase, scartando quelli accettabili).
4. **Etichetta di forma che rivela la risposta (conjugation, aggettivi)**: label tipo "Passato negativo (〜くなかった)" + una sola opzione con quella desinenza = domanda risolta dall'etichetta. Fix: per gli i-aggettivi togliere il suffisso dall'etichetta o forzare distrattori con la stessa desinenza.
5. **Gestione grezza delle varianti "A; B" del seed**: le stringhe multi-variante finiscono intere nelle scelte e nelle coniugazioni (堅; 硬; 固くない, 伯母さん; 叔母ばさん, 高校; 高等学校). Fix: splittare su "; " e usare una sola variante ovunque il testo venga trasformato o mostrato come opzione.

(Bug omofoni nella reading-recognition — 下りる/降りる, 切る/着る, 花/鼻 — presenti nel campione ma [GIÀ FIXATO] nel codice.)



