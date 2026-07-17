# Audit domande — secondo giro (18/07, delta dopo i fix del 17/07)

Campione rigenerato (`AUDIT=1 npx vitest run src/lib/quiz/questionAudit.test.ts`,
~330 domande) e vagliato inline. **Complessivo: molto meglio del primo giro** — i fix
del 17/07 (omofoni, occorrenza pesata, particelle ambigue, label) reggono.

## Trovate residue (nessuna critica)

1. **particle-cloze 雨の中を/で** — «この雨の中＿＿外出することは…» corretta を
   (attraversamento), ma で è difendibile («nel mezzo della pioggia»). L'esclusione
   を/で-percorso non copre 外出する (non riconosciuto come verbo di moto).
   *Fix possibile*: aggiungere 外出/出かける/散歩 alla lista dei verbi di moto del
   filtro CONFUSABLE. Frequenza: 1 su 27 nel campione.

2. **verb-form-cloze senza vincolo temporale** — quando il contesto non fissa il
   tempo, più forme sono difendibili: «四月に大学に＿＿» (します/した entrambe ok
   senza anno), «新宿で山手線に＿＿» (乗り換えます/乗り換えなかった). Le frasi con
   marcatore (らいねん, もう, 〜てください) sono invece univoche.
   *Fix possibile*: il generatore accetta la frase solo se contiene un marcatore
   vincolante (らいねん/きのう/今/もう/まだ/〜てください/〜ないでください…), o
   esclude dai distrattori la stessa forma in polarità/tempo alternativo quando
   il contesto non li vieta. Frequenza: ~3 su 28.

3. **transitivity-pair: distrattori "inventati"** — forme agrammaticali costruite
   (倒れられる, 聞こえられる, 沸かれる, 増やさせる) accanto al gemello semplice.
   Non ingannano (sono palesemente sbagliate) ma sporcano: meglio 3 scelte con
   gemello + forma flessa vera. Cosmetico.

4. **multiple-choice: distrattori di POS mista** — «知る: sapere / quanti / scuola /
   padre (mio)»: un verbo con distrattori avverbio/nome si scarta a colpo d'occhio.
   Il buildDistractors pesca per livello, non per POS. *Miglioria*: preferire
   distrattori della stessa parte del discorso quando il bucket ne ha abbastanza
   (fallback all'attuale). Impatto: domande troppo facili, non sbagliate.

5. **Frasi d'esempio oscure dalla fonte** — «仕事はすらすらと運んだ» (uso raro di
   運ぶ = procedere): legittima ma fuori livello. Da segnare per la curatela frasi
   (sostituzione mirata negli overrides quando capita).

## Non riprodotti

- I bug storici del primo audit (omofoni come distrattori nella reading-recognition,
  buco sull'occorrenza sbagliata かれ/か, label rivelanti) NON compaiono più nel
  campione: fix confermati.
