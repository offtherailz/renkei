# Frasi per livello: una frase, più scritture

Stato: **piano, nulla di implementato** (31/10/2026).

## Il problema

Oggi una frase ha il livello della carta che la contiene e un solo testo. Ma una parola N4 può usare un
kanji sopra N4 (`財布`, `払う`, `忘れる`): a quel livello si studia e si riconosce in kana, mentre la frase la
mostra in kanji. La frase è comprensibile, ma risulta troppo difficile per come è scritta.

Misura sul catalogo attuale (frasi distinte per livello della carta):

| Livello carta | Frasi | Con kanji sopra livello | Di queste, risolvibili in kana oggi | Con parole sopra livello (stima alta) | Pulite |
|---|---|---|---|---|---|
| N5 | 1595 | 1079 (68%) | 849 (79%) | 896 | 219 (14%) |
| N4 | 1683 | 1169 (69%) | 932 (80%) | 770 | 273 (16%) |
| N3 | 2274 | 1355 (60%) | 735 (54%) | 0 | 919 (40%) |

- Parole con kanji sopra il proprio livello: 415 N5, 444 N4, 1078 N3. Il caso è la norma, non l'eccezione.
- La colonna «parole sopra livello» è gonfiata: la ricerca a dizionario confonde omofoni in kana
  (`あげました`, `あいさつ`). Va rimisurata con un analizzatore vero (fase 1).
- Solo 9 frasi su 6157 hanno letture annotate.

## L'idea: due assi separati

1. **Comprensione**: parole e grammatica. Dice a chi serve la frase, e non cambia con la scrittura.
2. **Scrittura**: quali kanji mostrare. Dipende da chi legge, quindi si calcola.

Si salva **una sola frase master**, con kanji e letture (`財布[さいふ]を 忘[わす]れました。`), e la variante si
calcola al momento:

- N5: `さいふを わすれました。`
- N4: `さいふを わすれました。` (財, 布, 忘 stanno sopra N4 nel catalogo)
- N3: `財布を 忘れました。` secondo i livelli dei kanji

Stessa traduzione, stessa frase e nessuna copia da tenere allineata. Con 6157 frasi per 5 livelli, le copie
scritte a mano sarebbero ingestibili.

Le varianti **scritte a mano** restano solo per le frasi dove serve cambiare parole, non scrittura: campo
opzionale `varianti: [{ livello, testo, traduzione }]`.

## Regole di resa proposte

- Si tiene il kanji se tutti i kanji della **parola** sono entro il livello; altrimenti tutta la parola va in
  kana. Niente `友だち`/`友達` misti calcolati: un kanji su due confonde e si riconosce peggio.
- Livello usato: il maggiore tra quello dello studente e quello della carta.
- La prova d'esame **non cambia**: resta kanji + furigana sopra livello, come l'esame vero (`examStrip`).
- Gli spazi delle frasi N5 restano nel master. Non si toccano in questo lavoro.

## Fasi

### Fase 1: pilota sulle letture
Il punto a rischio è la qualità delle letture. `tokenFurigana` copre il 78% dei pezzi con kanji e non è
adatta come fonte definitiva.

- Script a build-time con analizzatore morfologico (kuromoji in `devDependencies`, non nel bundle).
- Prova su 200 frasi N4. Dove analizzatore e letture del catalogo non coincidono, finisce in una lista da
  rivedere (`今日`, `開く`, `方`, `何`, contatori).
- **Si va avanti solo se** gli errori residui sono rari: da misurare a mano sul campione.
- La stessa analisi dà il lemma di ogni parola, quindi una misura affidabile del livello di comprensione.

### Fase 2: annotare il catalogo
- Letture negli overrides, poi seed e bump di `SEED_REVISION` (regola del progetto).
- Da verificare: peso del seed (ora 4,3 MB) ed eventuale file separato per le letture.
- **Attenzione:** con le letture nel testo, tutte le schermate che usano `FuriganaText` mostrerebbero il ruby
  di colpo. Questa fase va rilasciata insieme alla fase 3.
- Audit dei 17 file che leggono `frasi_esempio`: chi non passa da `stripFuriganaNotation` mostrerebbe le parentesi.

### Fase 3: resa per livello
- `core/levelText.ts`, funzione pura `renderAtLevel(master, livello, modo)` con test.
- Dati dei livelli dei kanji già in `seed.kanji`, da caricare come mappa anche per N3-N1
  (`kanjiN4.ts` copre solo N5/N4).
- Kanji sopra livello: sempre hiragana.

### Fase 4: adozione per schermata
Una per volta, con deploy in mezzo: riordina, poi quiz e consolida, poi comparazioni e item curati, poi il
resto. Dentro una domanda, frase, opzioni e confronto della risposta devono usare la **stessa** variante.
Gli item curati oggi hanno parole in kana forzate per stare entro N4: tornano a master con letture.

### Fase 5: frasi da riscrivere
Con la misura di comprensione affidabile, le frasi con parole davvero sopra livello si filtrano via oppure
ricevono una variante a mano, a piccoli lotti col ciclo di curatela. N2 e N1 oggi non richiedono lavoro: il
catalogo parole arriva a N3, quindi lì significa solo «tutti i kanji».

## Decisioni da prendere

1. **Sopra livello: DECISO (31/10) hiragana**, come scelta dell'utente per fare come il JLPT. Niente impostazione
   furigana nella prima versione. Da controllare sui sample ufficiali di jlpt.jp: la prova d'esame in app oggi usa
   furigana sopra livello (`examStrip`), e una ricerca web non ha chiarito quale dei due sia fedele.
2. **Il livello dello studente da dove viene?** Proposta: dall'impostazione di livello già scelta all'avvio
   (da verificare in fase 3), non dalla carta sola, così uno studente N4 vede i kanji N4 anche nelle carte N5.
3. **I kanji già studiati valgono?** Se ho in ripasso un kanji sopra livello, lo mostro? Proposta: no nella
   prima versione, poi eventuale estensione: è personale ma cambierebbe la frase mentre si studia.

## Da riprendere più avanti: furigana come progressione

Annotato, non deciso. Al passaggio al livello successivo (per esempio verso N3) il furigana può fare da ponte:
hiragana per i kanji lontani, furigana per quelli del livello che si sta iniziando, poi kanji nudo. L'utente non ha
ancora un'idea di come regolare questa progressione: se ne riparla quando si avvicina il passaggio. Il master con
letture la rende possibile senza rifare i dati.

## Rischi

- Letture sbagliate insegnano errori: per questo il pilota viene prima e si ferma se la qualità non regge.
- Una stessa frase cambia aspetto al cambio di livello: va detto in `/guida`.
- Il TTS legge meglio dal master con letture: da verificare sui casi ambigui.
