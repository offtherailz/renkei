# 事件 — il mondo di gioco (città, motore, prime missioni)

Aggiorna `giallo-piano.md`: niente più casi «a giornate fisse» in fila, ma una
**città aperta** con l'ufficio come base. Le regole di scrittura (solo N5/N4,
nomi da esame, frasi dagli esempi del seed) restano quelle del piano.

Mappa di lavoro: `docs/giallo-mappa.svg`.

## La città: 山野市（やまのし）

Città di provincia inventata, sul modello di 秦野 (Hadano): montagne alle spalle,
un fiume, una linea di treno privata verso Tokyo da una parte e il mare / Hakone
dall'altra, quartieri piccoli con 商店街, un santuario in collina.

- **さくら町** — il nostro quartiere, aperto da subito (casa, ufficio, il minimo
  per vivere). Si sbloccano col tempo 神社, お寺, プール.
- **山野駅** (centro, in treno) — ホテル みどり, 病院, 銀行, 美術館, デパート,
  市役所. Si apre con la missione 3.
- **北山野** — fiume, campi, festa d'estate (お祭り, 花火).
- **Fuori città** col 新幹線 — 東京, 京都… solo quando una missione ci porta lì.

### さくら町: luoghi

| luogo | nome | cosa ci si fa | orari | sfondo / sprite |
|---|---|---|---|---|
| casa | 吉田さんの家 | dormire (fine giornata, salvataggio), colazione, commissioni dalla famiglia | sempre | casa / mamma, papa |
| ufficio | さくら会社 | lavoro, **bacheca missioni**, colleghi | 7-20 (lun-ven), lavoro 9-17:30 | ufficio, ufficio_capo, magazzino |
| コンビニ | ハッピーマート | spesa, fotocopie, pagare bollette, ritirare pacchi | 24 ore | konbini / commessa_konbini |
| 喫茶店 | 喫茶あおい | appuntamenti, voci di quartiere | 7-20, chiuso mer | cafe / cameriere (伊藤さん) |
| ristorante | ふじ食堂 | pranzo e cena (menù, prezzi, ordinare) | 11-15, 17-21 | ristorante / cameriere |
| posta | 郵便局 | spedire pacchi e lettere, francobolli | 9-17 lun-ven | posta / commesso |
| panetteria | パン屋 | colazione, regali piccoli | 7-19 | panetteria / panettiera |
| farmacia | 薬局 | medicine | 9-20 | farmacia / farmacista |
| fioraio | 花屋 | regali | 10-19 | fioraio / fioraia |
| posto di polizia | 交番 | oggetti smarriti, chiedere la strada | sempre | **manca** |
| parco | さくら公園 | passeggiare, incontri, indizi | sempre | parco |
| scuola serale | 日本語学校 | lezione di giapponese (リン, 高橋) | 18-21 lun, mer, ven | scuola / insegnante |
| condominio | 木村アパート | vicini, padrone di casa | sempre | condominio / padrone |
| stazione | さくら町駅 | treno verso gli altri quartieri | 5-24 | stazione |
| 🔒 santuario | 山の神社 | (missione 2) | sempre | **manca** |
| 🔒 tempio | 光明寺 | (più avanti) | 9-17 | **manca** |
| 🔒 piscina | 市民プール | (estate, feste) | 9-21 | **manca** |

Le parole che non sono nel vocabolario dell'app (コンビニ, お寺 come parola…)
compaiono solo come nomi di luogo, come da regola.

## Come si gioca

- **Giornata a fasce**: 朝, 昼, 午後, 夜. Ogni spostamento costa 15-30 minuti,
  ogni scena il suo tempo. L'orologio e il calendario sono sempre a vista.
- **Lavoro**: nei giorni feriali la fascia 9-18 è in ufficio. Si può uscire
  per commissioni di lavoro (posta, cliente) e lì avanzano le missioni.
- **Orari dei luoghi**: se arrivi a posta chiusa, la scena lo dice
  (「今日は もう 閉まって います。」) e si riprova domani. Così le domande
  d'esame sugli orari sono vere decisioni di gioco.
- **Commissioni del giorno** (facoltative): dalla famiglia o dall'ufficio.
  Riusano le attività già nell'app (spesa, ristorante, treno).
- **Missioni** dalla bacheca: passi con obiettivo scritto nel taccuino
  («chiedere a 伊藤さん», «andare al 郵便局 prima delle 5»). Una attiva per
  volta all'inizio.
- **Taccuino**: frasi chiave (con 見た / 聞いた per i testimoni), oggetti,
  linea del tempo della giornata (dove eri e a che ora, scritta in automatico).
- **Aiuto**: se resti fermo, un'icona di telefono: 中村刑事 o 鈴木さん dicono
  dove andare, in giapponese semplice.
- **Sera a casa**: 3-4 domande d'esame sulla giornata, poi si dorme (salva).
- **Nome del protagonista**: si scrive all'inizio (in katakana o in romaji,
  convertito con `romaji.ts`), default **ルカ**. Nei dialoghi è `{nome}`,
  così la voce lo legge.

## Motore (dati, non codice per ogni scena)

```ts
type Luogo = {
  id: string; nome: string; quartiere: string;
  sfondo: string; orari?: Fascia[];          // quando è aperto
  sbloccato?: Condizione;                     // es. flag 'm2.inizio'
};
type Scena = {
  id: string; luogo: string;
  quando: Condizione;                         // flag, giorno, ora, oggetti
  priorita?: number;                          // la storia prima del contorno
  passi: Passo[];
};
type Passo =
  | { dice: Personaggio; testo: string; taccuino?: true }
  | { scelta: { testo: string; vai: string }[] }
  | { domanda: DomandaEsame }
  | { oggetto: string }                       // lo ricevi
  | { flag: string } | { tempo: number }      // minuti
  | { obiezione: { frase: string; prova: string; ok: string; no: string } };
```

Entrando in un luogo il motore prende la scena con priorità più alta la cui
condizione è vera. Se non c'è niente, usa una scena «di contorno»
(fare la spesa, ordinare al ristorante). Mappa, commissioni e missioni usano
tutte lo stesso meccanismo. Nuovi luoghi e quartieri = nuove righe di dati.

La mappa è un SVG cliccabile: ogni luogo è un gruppo con il suo `id`, i luoghi
bloccati sono in grigio. Più avanti si può mettere sotto un'immagine disegnata
in stile mappa giapponese.

Salvataggio: giorno, ora, luogo, flag, oggetti, taccuino, missioni (locale).

## Missione 1 — はじめての 一週間 (rodaggio)

Obiettivo didattico: imparare mappa, orologio, orari, oggetti, taccuino; un
mini-giallo facile (il portafoglio). Forme: 〜て から / 〜あとで / 〜までに,
〜て おく, 〜て くれる / もらう, 〜た ほうが いい.

**4月6日（月）**
- 吉田さんの家, mattina. お母さん: 「はじめまして。{nome}さんですね。今日から
  ここが あなたの 家ですよ。」 Ti dà la piantina del quartiere (sblocca la mappa)
  e una commissione: 「会社の 帰りに 牛乳を 買って きて くれない？」
- さくら会社. 森部長 presenta l'ufficio e la bacheca. 鈴木さん:
  「この 書類を 郵便局から 送って おいて ください。5時までに お願いします。」
- 昼: ふじ食堂 con 田中さん (menù, prezzi, «io prendo…»). 田中さん paga con
  la carta, tu col portafoglio: il portafoglio diventa un oggetto del taccuino.
- 午後: 郵便局 prima delle 17 (dopo le 17 è chiuso: si riprova domani, 鈴木さん
  un po' delusa). Ricevuta della posta → oggetto.
- 夜: ハッピーマート, latte (scontrino con l'ora → oggetto). Casa, domande.

**4月7日（火）**
- Mattina: 「あれ？財布が ない！」 Si apre la linea del tempo di ieri.
- Indagine: ristorante (「財布は ありませんでしたよ。でも カードで 払いましたか。」
  → no, hai pagato in contanti: c'era ancora), コンビニ (lo scontrino dice 18:40;
  la commessa: 「お店の 前で 学生が 何か 拾って いましたよ。」).
- 交番: c'è 中村刑事 (primo incontro). 「この 財布は あなたのですか。中に 何が
  入って いますか。」 Prima **obiezione** facile: scegli dal taccuino la ricevuta
  della posta che è dentro il portafoglio.
- Chi l'ha portato: 「高橋さんと いう 学生が 届けて くれました。」

**4月8日（水）**
- Ringraziare 高橋くん: è al 学校 serale (si sblocca). Prima compri un regalo
  (パン屋 o 花屋; 喫茶あおい è chiuso il mercoledì: piccola trappola sugli orari).
- 高橋くん: 「お礼は いいですよ。」 / tu: 「これ、どうぞ。」 (あげる/もらう).
- Sera: 中村刑事 telefona: 「{nome}さんは よく 見て いますね。また 手伝って
  くれませんか。」 → bacheca: missione 2.

## Missione 2 — いなくなった ミケ (il gattino)

Piccolo giallo senza colpevoli. Forme: 〜そうだ (sentito dire) / 〜ようだ /
〜らしい, 自動詞/他動詞 + 〜て ある, 〜て あげる / くれる.

Cliente: la madre di 木村さん (sprite signora_anziana) al 木村アパート. Il suo
三毛猫 ミケ, collare rosso col campanello, manca 「おとといの 夜から」.

**4月13日（月）**
- 木村のおばあさん racconta. Oggetto: foto di ミケ. Commissione: fare dei
  fogli «cercasi» alla コンビニ (fotocopie, prezzo per copia).
- Testimoni (il taccuino li segna come 見た / 聞いた):
  - commessa コンビニ: 「きのうの 夜、若い 男の 人が 猫の えさを 買って
    いきました。」 (visto);
  - 伊藤さん al 喫茶あおい: 「公園で 子猫が 鳴いて いた そうです。」
    (sentito dire da un cliente);
  - 田中さん: 「神社の 方へ 行った らしいよ。」 (voce, poco sicura).
- Domanda d'esame: chi l'ha visto davvero?

**4月14日（火）**
- さくら公園: sulla panchina c'è il collare **messo lì** con cura:
  「首輪が いすの 上に 置いて ありました。」 Non 「落ちて いました」:
  qualcuno l'ha tolto apposta. (Obiezione contro 田中さん, che dice che si è
  sfilato da solo.)
- Si sblocca 山の神社. Dietro il santuario una ciotola d'acqua e del cibo
  「置いて あります」: qualcuno viene a dargli da mangiare.

**4月15日（水）**
- Sera al 神社 (bisogna arrivare dopo le 19: orario dal taccuino della
  commessa). Arriva 高橋くん con la busta della コンビニ.
- Accusa leggera (chi / perché): ミケ aveva una zampa ferita; il collare
  「きつそうだったので、取って あげました。」 Nel suo appartamento gli animali
  non sono permessi, e il suo foglio l'ha appeso alla scuola, dove la signora
  non va.
- Fine: ミケ torna a casa. La signora ti dà dei dolci (くれる); 高橋くん potrà
  venire a trovarlo. Il 神社 resta aperto sulla mappa.

## Missione 3 — 消えた 資料 (il primo vero giallo)

Il «caso 1» del piano, ora inserito nella città. Forme: 自動詞/他動詞,
〜て いる / 〜て ある / 〜て おく.

Idea: il giorno prima della presentazione a un cliente, il documento sparisce
dalla scrivania di 森部長. Sospettati: 田中さん (distratto), 鈴木さん
(precisa), 林さん (receptionist).

Verità (bozza): la fotocopiatrice dell'ufficio era rotta
(「コピー機が 壊れて いた」 vs 「誰かが 壊した」). 田中さん ha portato il
documento alla ハッピーマート per copiarlo la sera e l'ha dimenticato lì.
Si vergogna e dice 「机の 上に 置いて おきました」. 鈴木さん però alle 20
「机の 上には 何も 置いて ありませんでした」. Lo scontrino delle fotocopie
(19:30) sta nel cestino del magazzino; la commessa lo ha messo tra i
忘れ物.

Finale: la riunione col cliente viene spostata alla ホテル みどり vicino a
山野駅 → **si sblocca il treno** e il secondo quartiere.

## Asset da fare (dopo)

- Sfondi: 交番, 神社, お寺, プール, hotel (hall), ingresso della scuola di sera.
- Oggetti: collare rosso col campanello, ciotola, fogli «cercasi», foto di ミケ,
  fotocopie, documento.
- ミケ (sprite).
- Più avanti: la mappa disegnata (stile mappa turistica giapponese) da mettere
  sotto l'SVG.

## Stato (2026-11-06)

Fatto: motore v0 (`src/lib/jiken/`: tipi, motore, mondo, missioni/m1) e pagina
`/jiken`; missione 1 completa e giocabile; test in `src/lib/jiken/jiken.test.ts`
(kanji fuori livello, asset presenti, giocatore automatico che finisce la
missione). Punti cliccabili posati sulla mappa disegnata (giorno/notte).

Differenze dal piano: la scuola serale è lun-mer-ven (serve il mercoledì);
l'ufficio è aperto 7-20; nella missione 1 il portafoglio si dimostra tuo
dicendo quanti soldi c'erano dentro (domanda sui conti della giornata) e
mostrando una ricevuta.

Missione 2 scritta (2026-11-07, `src/lib/jiken/missioni/m2.ts`): parte lunedì
13 aprile (giorno 7) continuando la partita della 1; si può anche rigiocare da
sola (`inizio`). Oltre al gatto: il cliente 山田 mercoledì alle 9:50 (ripreso
dall'email della missione 1), keigo con i clienti, espressioni dei personaggi.

## Ordine di lavoro aggiornato

1. Motore v0: mappa SVG cliccabile, orologio e fasce, lettore delle scene,
   flag/oggetti, taccuino, nome del protagonista, salvataggio.
2. Missione 1 completa sopra il motore (prova delle meccaniche).
3. Missione 2, poi la 3; script di copertura quando i testi sono più di uno.
4. Pagina «La so / Non la so»: rimandata.
