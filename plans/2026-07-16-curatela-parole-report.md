# Curatela parole N5/N4 — report insegnante (2026-07-16)

Giro completo sulle 1449 voci di `static/seed-n5n4.json` (campo `words`): id, scrittura, lettura, tipo_jp, transitivita_jp, significati IT/EN, sinonimi, contrari, livello. Report in sola lettura: nessun dato modificato.

## 1. Sinonimi mancanti

### 1a. Casi segnalati dall'utente

- **都合 ↔ 便利: NO, non collegarli.** 都合 è un nome ("le mie circostanze/disponibilità": 都合がいい = "mi va bene [come orario]"), 便利 è un aggettivo-na ("comodo, pratico", di oggetti/luoghi/servizi). Non sono mai interscambiabili: ×このアプリは都合です. La somiglianza nasce solo dall'inglese "convenient". Al più correlazione tematica, non sinonimia — da insegnante direi di NON collegarli, proprio per non far confondere le due parole.
- **出発**: come nome non ha un sinonimo vero nel catalogo (出国 è solo "lasciare il paese", correlato ma più specifico; 発つ/出発点 non ci sono). Come verbo propongo: `出発する ↔ 出かける` — parziale: 出かける = uscire di casa/andare in giro, 出発する = partire (viaggio, mezzo, orario). Entrambi 自動詞. Più utile ancora il **contrario** 出発する ↔ 着く (vedi sez. 2).
- **親切 ↔ 優しい: SÌ**, sinonimi parziali da collegare (oggi entrambi hanno `sinonimi: []`). 親切 = gentile nei fatti, premuroso verso gli altri; 優しい = dolce/gentile di carattere. Sovrapponibili in 親切な人 ≈ 優しい人; nota "parziale: 優しい anche di indole/tono, 親切 di comportamento". (優しい ha già C:厳しい, coerente.)
- **例**: la voce 例 (れい) **non esiste nel catalogo** — c'è solo 例えば. "Aikon" (dettatura incerta) non corrisponde a nessuna parola giapponese sinonimo di 例 che io riconosca (見本 "campione/modello" e サンプル sarebbero i candidati naturali, ma nessuno dei due è nel catalogo; アイコン non c'entra). Proposta: nessuna azione finché l'utente non chiarisce; eventualmente aggiungere la voce 例 con sinonimo interno 例えば solo come rimando di famiglia, non come sinonimo.

### 1b. Keigo → verbo piano (sistemico, il buco più grosso)

Oggi i verbi umili/onorifici sono collegati **fra loro** (es. いただく S:申す,おる,致す,差し上げる,参る), come se "ricevere umile" fosse sinonimo di "dire umile": didatticamente fuorviante. Il pattern giusto esiste già in catalogo (拝見する S:見る): ogni keigo va collegato al suo **equivalente piano**, con nota di registro. Transitività coerente verificata (eccezione: する è marcato 自動詞 per errore, vedi sez. 3).

- `いただく ↔ もらう` — umile di もらう (他/他)
- `差し上げる ↔ あげる` — umile di あげる (他/他)
- `くださる ↔ くれる` — onorifico di くれる (他/他); oggi くださる ha S vuoto
- `申す ↔ 言う` e `申し上げる ↔ 言う` — umile/umilissimo di 言う (他/他); 申し上げる oggi orfano
- `おっしゃる ↔ 言う` — onorifico di 言う (他/他)
- `致す ↔ する` e `なさる ↔ する` — umile/onorifico di する (他; する da correggere a 他動詞)
- `参る ↔ 行く` / `参る ↔ 来る` — umile (自/自)
- `いらっしゃる ↔ おいでになる` — sinonimi veri, entrambi onorifici (自/自); più `いらっしゃる ↔ 行く/来る/居る`
- `おる ↔ 居る` — umile (自/自; おる oggi marcato 他動詞 per errore)
- `召し上がる ↔ 食べる` / `召し上がる ↔ 飲む` — onorifico (他/他); oggi orfano
- `伺う ↔ 訪ねる` (visita, umile) e `伺う ↔ 尋ねる` (chiedere, umile) — 他/他; prima però fondere il duplicato うかがう/伺う (sez. 3)
- `ごらんになる ↔ 見る` — onorifico (dopo riclassificazione a 動詞)

### 1c. Altre coppie del catalogo da collegare

- `準備 ↔ 用意` (+ `準備する ↔ 用意する`, 他/他) — 支度↔用意 sono già collegati, 準備 è rimasto orfano del triangolo 準備/用意/支度.
- `テスト ↔ 試験` — sinonimi d'uso quotidiano (テスト più scolastico/informale).
- `スーツ ↔ 背広` — stesso oggetto, 背広 parola più datata; entrambi orfani oggi.
- `警官 ↔ おまわりさん` — stesso referente, registro colloquiale/affettivo per おまわりさん.
- `亡くなる ↔ 死ぬ` — eufemismo cortese standard (自/自); coppia fondamentale N4.
- `うまい ↔ 上手` — parziale: solo nel senso "abile" (うまい ha già 美味しい per il senso "buono di sapore").
- `尋ねる ↔ 聞く` — parziale: solo senso "chiedere" di 聞く (他/他); eventualmente anche `質問する ↔ 尋ねる`.
- `写す ↔ 撮る` — parziale: senso "fotografare" (他/他); 写真を写す／撮る.
- `もうすぐ ↔ そろそろ` — parziale ("tra poco"); sostituisce l'attuale errato そろそろ↔段々 (sez. 3).
- `下りる ↔ 降りる` — stessa lettura おりる, di fatto la stessa parola con due grafie/sfumature (自/自); oggi due voci scollegate.
- `パソコン ↔ コンピュータ; コンピューター` — parziale (il PC è un tipo di computer, ma nell'uso quotidiano si sovrappongono).
- `オーバー ↔ コート` — parziale: solo nel senso "cappotto" di オーバー.
- `家庭 ↔ 家族` — parziale (famiglia-focolare vs famiglia-persone); più sensato dell'attuale 家庭 S:うち.
- `行う ↔ する` — parziale, registro formale/scritto (会議を行う); da fare dopo la correzione di transitività di する.
- `うん ↔ はい/ええ` e `よろしい ↔ いい; よい` — le vere righe di registro per sì/va bene (al posto degli attuali collegamenti sbagliati うん S:よろしい,大丈夫).

## 2. Contrari mancanti

Coppie del catalogo oggi non collegate in `contrari` (verbi: 自 con 自, 他 con 他, rispettato salvo nota).

**Coppie che oggi stanno per errore in `sinonimi` e vanno spostate in `contrari`:**
- `親 ↔ 子` — oggi 親 S:子 e 子 S:親 (!): sono contrari, non sinonimi.
- `右 ↔ 左` — oggi sinonimi reciproci: spostare.
- `男 ↔ 女` — oggi 女 S:男 e 男 S:女: spostare (e pulire 男 S:人, 人 S:男性,男).
- `出国する ↔ 入国する` — oggi sinonimi (!); i nomi 出国/入国 hanno 入国/出国 sia in sinonimi sia in contrari: togliere dai sinonimi, restano contrari.

**Coppie nuove:**
- `点く ↔ 消える` (自/自) — accendersi/spegnersi; entrambe le voci hanno C vuoto.
- `つける ↔ 消す` (他/他) — accendere/spegnere; coppia quotidiana fondamentale.
- `開く-あく ↔ 閉まる` (自/自) — oggi esiste solo 開ける↔閉める (他); manca la coppia intransitiva.
- `男性 ↔ 女性` — oggi nessun collegamento in contrari.
- `昼 ↔ 夜` — entrambi C vuoto.
- `朝 ↔ 晩` — parziale ma didatticamente utile (colazione/cena, 毎朝/毎晩).
- `春 ↔ 秋` — coppia di stagioni opposte, come il già presente 夏↔冬.
- `最初 ↔ 最後` — entrambi C vuoto (最初 ha S:初め; 始め, coerente).
- `初め; 始め ↔ 終わり` — inizio/fine, entrambi orfani.
- `暖かい ↔ 涼しい` — mite/fresco (le mezze stagioni), completa il quartetto con 暑い↔寒い.
- `速い ↔ 遅い` — oggi solo 早い C:遅い; 速い ha C vuoto (senso velocità).
- `上がる ↔ 下がる` — oggi asimmetrico: 下る(=さがる, vedi sez. 3) ha C:上がる ma 上がる ha C vuoto. Collegare anche come coppia 自 della coppia 他 上げる↔下げる già presente.
- `教える ↔ 習う` (他/他) — insegnare/imparare-da; coppia classica dei libri di testo.
- `始める ↔ 止める::やめる` (他/他) — parziale (cominciare/smettere); 始める oggi ha C vuoto.
- `出発する ↔ 着く` (自/自) — parziale (到着 non è in catalogo); risponde anche alla domanda su 出発.
- `中 ↔ 外::そと` — oggi 中 ha C vuoto; e correggere 外::そと C:うち → 内 (うち è la voce "casa propria", id sbagliato).
- `危ない ↔ 安全` — parziale; oggi 危ない ha C vuoto ma S:危険, e 危険 C:安全 esiste già: chiudere il triangolo.

**Correzione di id in contrari esistenti:**
- `続ける` C:止める::とめる → **止める::やめる** (仕事を続ける⇔やめる; とめる è "fermare fisicamente").

**Esclusa (regola transitività):** 質問する(他) ↔ 答える(自) — coppia domanda/risposta utile ma con transitività diversa; il collegamento esiste già a livello di nomi (質問 C:返事). Nota: anche gli esistenti 喜ぶ(他)↔怒る(自) e 捕まえる(他)↔逃げる(自) violano la regola — 喜ぶ va comunque corretto a 自動詞 (sez. 3), il che sana il primo.

## 3. Errori e incongruenze nei dati

### 3a. tipo_jp sbagliato

- `けれど; けれども` — 名詞 → **接続詞** (segnalato: confermo, è congiunzione).
- `そうして; そして` — 名詞 → **接続詞**.
- `やはり; やっぱり` — 形容詞 → **副詞**.
- `そう; そうです` — 動詞/自動詞 (!) → **感動詞** (risposta "sì, è così"); svuotare transitivita_jp. Nota: esiste anche la voce N4 `そう` marcata 助動詞 (per 〜そうだ), che può restare.
- `あ` — 名詞 → **感動詞** ("ah!").
- `うん` — 形容詞 → **感動詞** (sì informale).
- `はい` — 形容詞 → **感動詞**.
- `また` — 名詞 → **副詞** ("di nuovo"; anche 接続詞).
- `よく` — 名詞 → **副詞** ("spesso / bene").
- `どの` — 名詞 → **連体詞** (この/その/あの sono già 連体詞: incoerenza interna).
- `ゆっくりと` — 形容詞 → **副詞**.
- `以外` — 形容詞 → **名詞** (名詞/接尾的; non è aggettivo).
- `半分` — 副詞 → **名詞**.
- `毎月`, `毎年` — 副詞 → **名詞** (毎日/毎週/毎晩 sono 名詞: allineare).
- `女の子`, `男の子` — 慣用表現 → **名詞**.
- `ごらんになる` — 慣用表現 → **動詞** (他動詞), onorifico di 見る; oggi ha anche lettura vuota.
- `おいでになる` — 動詞 senza transitivita_jp → aggiungere **自動詞**.

### 3b. transitivita_jp incoerente

- `おる` — 他動詞 → **自動詞** ("esserci", umile di 居る che è 自動詞). Errore netto.
- `する` — 自動詞 → **他動詞** (宿題をする; oggi する(自) e やる(他) sono pure collegati come sinonimi con transitività discordante).
- `失敗する` — 他動詞 → **自動詞** (試験に失敗する).
- `会議する` — 他動詞 → **自動詞** (semmai 会議を開く).
- `競争する` — 他動詞 → **自動詞** (人と競争する).
- `急ぐ` — 他動詞 → **自動詞** (uso base intransitivo: 急いで行く).
- `触る` — 他動詞 → **自動詞** (〜に触る; classificazione standard).
- `謝る` — 他動詞 → **自動詞** (人に謝る; significato "scusarsi").
- `喜ぶ` — 他動詞 → **自動詞** (significato dato "rallegrarsi"; sana anche il contrario 怒る(自)).
- `差す` — 自動詞 → **他動詞** (i significati elencati sono 傘を差す, 手を差す: transitivi).

**Coppie 自/他 (id_verbo_corrispondente):** le 56 esistenti sono tutte reciproche ✓. Manca: `下る(=下がる) ↔ 下げる` (さがる/さげる) — unica coppia 自/他 completa in catalogo non collegata via id_verbo_corrispondente.

**Coppie 自/他 messe nei `sinonimi` (da rimuovere, sono già collegate via id_verbo_corrispondente):** 集まる↔集める, 沸く↔沸かす, 変わる↔変える, 渡る↔渡す, 閉まる↔閉める, più 空く::あく/開く-あく S:開く-ひらく (transitività diversa). Un verbo transitivo non è "sinonimo" del suo intransitivo: per lo studente è la distinzione da imparare, non un'equivalenza.

### 3c. Letture/scritture sospette

- `下る | さがる` — **errore**: 下る si legge くだる; さがる si scrive 下がる. Visti significato ("scendere/calare") e contrario (上がる), la voce è 下がる: correggere scrittura/id in **下がる**.
- `楽む | たのしむ` — okurigana mancante: **楽しむ**.
- `落る | おちる` → **落ちる**; `落す | おとす` → **落とす** (forme standard).
- `終る | おわる` → **終わる**; `曲る | まがる` → **曲がる** (grafie 許容 ma non standard per lo studio).
- `真中 | まんなか` → **真ん中**.
- `かまう` — **lettura vuota** → かまう.
- `ごらんになる` — **lettura vuota** → ごらんになる.
- `伯父; 叔父さん | おじさん` — la prima variante da sola si legge おじ: o scrittura 伯父さん; 叔父さん, o lettura doppia.
- `お金持ち | かねもち; おかねもち` — かねもち corrisponde a 金持ち, non a お金持ち: allineare scrittura e letture.
- `チケット | ちけっと`, `パスポート | ぱすぽーと`, `フライト | ふらいと` — letture in hiragana mentre le altre voci katakana usano katakana (incoerenza minore, tocca il TTS/quiz).
- `十::(〜を) とお` — id con residuo "(〜を)": da ripulire.

### 3d. Sinonimi/collegamenti assurdi o fuorvianti (da rimuovere o spostare)

Collegamenti palesemente rotti (probabile incidente di import):
- `味噌 S:見る` (!), `着物 S:そば` / `そば S:着物`, `ドア S:洋服` / `洋服 S:ドア`, `字 S:手紙` / `手紙 S:字`, `気に入る S:気をつけて` / `気をつけて S:気に入る`, `お久しぶりです S:間に合う`, `いくら S:沢山`, `初めて S:始める`.
- Collisione via inglese "match": `マッチ(fiammifero) S:試合` / `試合 S:マッチ`.
- Omofoni scambiati per sinonimi: `弾く S:引く` (ひく), `風 S:風邪` (かぜ) → spostare in `omofoni`.
- Cluster meteo senza senso: 寒い/暑い/涼しい/明るい tutti "sinonimi" a vicenda (寒い S:明るい,涼しい ecc.) — 明るい non c'entra nulla; ripulire e usare i contrari giusti (sez. 2).
- `ちっとも S:いつも` / `いつも S:ちっとも` — opposti d'uso, non sinonimi.
- `そろそろ S:段々` / `段々 S:そろそろ` — "tra poco" ≠ "gradualmente".
- `一生懸命 S:大変`, `大変 S:難しい`, `難しい S:大変`, `中々 S:大変` — 大変 avverbio "molto" mischiato con aggettivi.
- Nome↔verbo (tipo diverso): `仕事 S:働く`/`働く S:仕事`, `買う S:買い物`/`買い物 S:買う`, `返事 S:答える`/`答える S:返事`.
- Famiglia/persone (co-iponimi, non sinonimi): `兄 S:弟,姉,兄弟`, `姉 S:兄,妹,兄弟`, `妹 S:兄弟,姉`, `兄弟 S:兄,姉,妹`, `お兄さん S:お子さん,お宅,奥さん`, `お子さん S:お宅,お嬢さん,お兄さん,奥さん`, `お宅 S:お子さん,お嬢さん,…`, `おじいさん S:おばあさん`, `おばあさん S:おじいさん`, **`父 S:母` / `母 S:父`**, `彼 S:彼女` / `彼女 S:彼`. Tenere solo le righe di registro vere (兄↔お兄さん, 姉↔お姉さん, 祖父↔おじいさん, 祖母↔おばあさん, 女↔女性, 男↔男性).
- Tempo (unità diverse!): `再来月 S:再来週,さ来年`, `再来週 S:再来月,さ来年`, `さ来年 S:再来月,再来週`, `来月 S:再来月` ecc., `去年 S:おととし`/`おととし S:去年`, `今度 S:今,一度,これ,一日::いちにち,一日::ついたち,今日`, `今 S:今度`, `今日 S:今度`, `一度 S:今度`, `昼間 S:一日::いちにち`, `夕方 S:晩御飯,夕飯` (momento della giornata ≠ pasto).
- Famiglie di parole scambiate per sinonimi: `高校 S:高校生,中学校`, `高校生 S:高校,中学校`, `中学校 S:高校,高校生`, `大学 S:大学生`, `大学生 S:大学`.
- `居る S:在る` / `在る S:居る` / `有る S:居る` — animato vs inanimato: è LA distinzione da insegnare, non sinonimia. (在る↔有る invece sono la stessa parola, vedi 3e.)
- `薄い S:細い` / `細い S:薄い` — sottile-piatto vs sottile-lungo: trappola classica, da separare.
- `火 S:火事`/`火事 S:火`, `湯 S:水`/`水 S:湯` — correlati/contrapposti, non sinonimi.
- `急行する S:乗り換える` / `乗り換える S:急行する` — nessuna relazione.
- `是非 S:どうぞ` / `どうぞ S:是非` — "assolutamente" ≠ "prego".
- `あげる S:申し上げる` e `上げる S:申し上げる` — 申し上げる è l'umile di 言う, non di あげる (l'umile di あげる è 差し上げる); `あげる S:くれる` / `くれる S:あげる` — direzione opposta del dare: per lo studente è un contrasto, non una sinonimia.
- Formule 慣用表現 incrociate a caso: `よろしくお願いします S:それでは,では,下さい,お疲れさまです,…`, `お疲れさまです S:ごちそうさまでした,いただきます,頑張って,…`, `いただきます S:ごちそうさまでした,お疲れさまです`, `お大事に S:それでは,では,…`, `おかえりなさい S:どういたしまして,ただいま` (ただいま/おかえりなさい sono coppia botta-e-risposta, non sinonimi), `お先に失礼します S:おじゃまします`. Da svuotare.
- `壊す(他) S:割れる,折れる,倒れる(自)` — mischia transitività e concetti: al più `壊れる S:割れる,折れる` (parziale); `倒れる S:壊す` da rimuovere.
- Riferimenti rotti (unici 2 nel dataset): `明日::あす S:明日` e `明日::あした S:明日` — l'id 明日 non esiste; farli puntare l'uno all'altro.
- Dubbi da rivedere: `受ける C:送る`/`送る C:受ける` (受ける qui è "sostenere un esame"), `カップ S:コップ` (tazza ≠ bicchiere: meglio nota di distinzione), `安全 S:大丈夫`/`大丈夫 S:安全`, `りっぱ S:結構`/`結構 S:りっぱ`, `内 S:家`.

### 3e. Voci combinate/duplicate (parole diverse fuse, o stessa parola sdoppiata)

- **`うかがう` e `伺う` sono la stessa parola due volte** (stessa lettura, stesso significato umile, entrambe N4 他動詞): fondere in una voce 伺う con nota kana.
- **`在る` e `有る` sono la stessa parola due volte** (ある "esserci (cose)", entrambe N5): fondere in `有る; 在る`.
- `そう; そうです` — fonde l'avverbio そう e la risposta そうです; con la voce N4 そう(助動詞) fa tre voci sovrapposte: riclassificare 感動詞 (vedi 3a) e chiarire i confini.
- `オーバー` — fonde "cappotto" (nome) e "esagerato" (aggettivo-na): significati d'uso e tipo diversi.
- `ソフト` — 形容詞 ma il significato include "software" (nome): fonde due parole.
- `伯父; 叔父さん` — le due varianti non hanno la stessa lettura (おじ vs おじさん), vedi 3c.
- Le altre voci con `;` controllate (いい;よい, けれど;けれども, 高校;高等学校, キロ già sdoppiato in due voci, コンピュータ;コンピューター, レポート;リポート, 丸い;円い, 足;脚, 川;河, 堅;硬;固い, やはり;やっぱり, じゃ;じゃあ) sono varianti legittime della stessa parola ✓.

### 3f. Verbi suru dubbi (voci "fare: X" non naturali)

- **Non esistono in giapponese naturale** (da rimuovere): `いっぱいする`, `かっこうする`, `交通する`, `原因する`.
- Rari/innaturali per N4 (di norma 〜をする): `会議する`, `留守する` (si dice 留守にする; e 留守する è pure marcato 他動詞), `急行する`, `作文する`, `授業する`, `花見する` (senza transitivita_jp; si dice 花見をする).
- Glosse italiane "fare: X" poco curate su tutta la serie: es. `電話する` = "fare: telefono" → "telefonare", `散歩する` → "passeggiare", ecc. (cosmetico ma visibile nei quiz).

### 3g. Keigo: presenza e marcatura

- Presenti e a livello N4 ✓: 申し上げる, 申す, いらっしゃる, おっしゃる, 召し上がる, 参る, いただく, 伺う/うかがう (duplicato), くださる, なさる, おる, 致す, 差し上げる, 拝見(+する), ご存じ, おいでになる, ごらんになる.
- **Nessuna marcatura strutturata**: il keigo vive solo nella parentesi "(umile)/(onorifico)" del significato IT; `study_tags` non ha nulla (solo n4/kana-only/…). Proposta: tag dedicati `keigo-sonkeigo` (onorifici) e `keigo-kenjougo` (umili) così quiz e punti deboli possono trattarli come classe.
- Errori collegati già elencati: おる 他動詞 (3b), ごらんになる 慣用表現+lettura vuota (3a/3c), sinonimi keigo→keigo invece di keigo→verbo piano (1b).

## 4. Priorità — da applicare subito

Le correzioni con più impatto sullo studio quotidiano (id → campo → valore proposto). Ricorda: vanno negli overrides + seed, con bump di `SEED_REVISION`.

1. `おる` → transitivita_jp → `自動詞[じどうし]`
2. `する` → transitivita_jp → `他動詞[たどうし]`
3. `けれど; けれども` → tipo_jp → `接続詞[せつぞくし]`
4. `そうして; そして` → tipo_jp → `接続詞[せつぞくし]`
5. `やはり; やっぱり` → tipo_jp → `副詞[ふくし]`
6. `そう; そうです` → tipo_jp → `感動詞[かんどうし]` (e transitivita_jp → vuoto)
7. `はい` e `うん` → tipo_jp → `感動詞[かんどうし]`
8. `下る` → scrittura/id → `下がる` (lettura さがる già corretta per 下がる) + id_verbo_corrispondente ↔ `下げる`
9. `楽む` → scrittura/id → `楽しむ`
10. `味噌` → sinonimi → `[]` (via 見る); stessa pulizia per 着物/そば, ドア/洋服, 字/手紙, マッチ/試合
11. `親`/`子` → spostare l'uno dall'altro da sinonimi a contrari
12. `右`/`左` → spostare da sinonimi a contrari
13. `男`/`女` → contrari reciproci (via da sinonimi); `男性`/`女性` → contrari reciproci; togliere `父 S:母`/`母 S:父`
14. `出国`/`入国` (+ forme する) → togliere il partner dai `sinonimi`, tenere solo `contrari`
15. `いただく` → sinonimi → `[もらう]`; `差し上げる` → `[あげる]`; `申す`/`申し上げる` → `[言う]`; `おっしゃる` → `[言う]`; `致す`/`なさる` → `[する]`; `参る` → `[行く,来る]`; `いらっしゃる` → `[おいでになる,行く,来る,居る]`; `おる` → `[居る]`; `召し上がる` → `[食べる,飲む]`; `くださる` → `[くれる]`
16. `伺う` ← fondere il duplicato `うかがう` (una voce sola)
17. `準備` → sinonimi → `[用意]` (+ `準備する` → `[用意する]`)
18. `親切` → sinonimi → `[優しい]` (reciproco)
19. `テスト` ↔ `試験` → sinonimi reciproci
20. `点く` ↔ `消える` e `つける` ↔ `消す` → contrari reciproci; `開く-あく` ↔ `閉まる` → contrari reciproci
21. `失敗する` → transitivita_jp → `自動詞[じどうし]`
22. `明日::あす`/`明日::あした` → sinonimi → puntarsi a vicenda (oggi ref rotta a id `明日`)

(Subito dietro, quando c'è tempo: pulizia cluster meteo 寒い/暑い/涼しい/明るい, cluster 慣用表現, famiglie 高校/大学, coppie 自/他 fuori dai sinonimi, e i suru-verbi inesistenti いっぱいする/かっこうする/交通する/原因する.)
