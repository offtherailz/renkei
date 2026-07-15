# Bozza: catalogo costruzioni + mappa `facetOf` (16 luglio 2026)

Riferimento operativo per A4 (sistema a sfaccettature). Vedi il modello in
`plans/2026-07-15-piano-unificato.md` § «Design sfaccettature».

Celle: 📖 Leggere · ✍️ Scrivere · 👂 Ascoltare · 🎤 Dire · 💡 Capire · 🎯 Recuperare ·
🔍 Riconoscere l'uso · 🧩 Usare in frase.

---

## 1. Catalogo costruzioni (entità `gram:<slug>`)

**Già presente**: `GRAMMAR_FORMS` (`src/lib/data/grammarForms.ts`) ha **32 voci `composed: true`** —
coincide col catalogo. Non serve "aggiungere 可能/使役/受身": ci sono già (`kanou`/`ukemi`/`shieki`).
Il lavoro è **classificarle** e assegnare le celle. Profilo base di ogni costruzione: **{💡 🔍 🧩}**;
**✍️** in più solo dove la morfologia dipende dalla **classe** (schema `conjugation`/`volitional`/`ba`).

### Voci / valenza — profilo {✍️ 💡 🔍 🧩} (✍️ agganciata alla classe)
| Entità | Titolo | Schema |
|---|---|---|
| `gram:kanou` | Potenziale (potere/riuscire a) | conjugation |
| `gram:ukemi` | Passivo (subire un'azione) | conjugation |
| `gram:shieki` | Causativo (far/lasciar fare) | conjugation |
| `gram:you-volitiva` | Volitiva 〜よう/〜おう | volitional |

### Condizionali — {💡 🔍 🧩} (+✍️ per `ba`)
| Entità | Titolo | Schema |
|---|---|---|
| `gram:ba` | Condizionale 〜ば | ba |
| `gram:tara` | Condizionale 〜たら | ta |
| `gram:to-cond` | Condizionale 〜と | dictionary |
| `gram:nara` | Condizionale 〜なら | plain |

### Composte in て — {💡 🔍 🧩}
`gram:juju` (授受 あげる/くれる/もらう), `gram:te-miru`, `gram:te-oku`, `gram:te-shimau`,
`gram:te-iru`, `gram:te-irai` (依頼).

### Aspettuali / desiderative / valutative — {💡 🔍 🧩}
`gram:tai` (desiderativo), `gram:sugiru` (eccesso), `gram:yasui-nikui` (facile/difficile),
`gram:nagara` (contemporaneità), `gram:sou-apparenza`, `gram:naru` (くなる/になる),
`gram:ta-koto-ga-aru` (esperienza), `gram:ni-iku` (andare a fare), `gram:nasai` (imperativo gentile).

### Modali / epistemiche / deontiche — {💡 🔍 🧩}
`gram:to-omou`, `gram:tsumori` (intenzione), `gram:hou-ga-ii` (consiglio),
`gram:nakereba` (obbligo), `gram:hazu`, `gram:deshou`, `gram:kamoshirenai`, `gram:kana`,
`gram:kotoninaru`.

> Nota: `contrazioni` e `juju` e le voci "classe" (godan/ichidan/名詞…) NON sono costruzioni-entità.
> `自動詞/他動詞` (transitivi/intransitivi) è un contrasto d'**uso** → domanda `transitivity-pair`
> (già esiste) taggata 🔍/🧩 sulla coppia di verbi, non una costruzione a sé.

---

## 2. Mappa `facetOf` (interazione → cella)

### 2a. Modi del quiz a tempo
| Modo | Cella | Entità | Stato |
|---|---|---|---|
| flashcard-recognition / multiple-choice | 💡 | word | ✓ |
| flashcard-production | 🎯 | word | ✓ |
| flashcard-reading-recognition / reading-choice | 📖 | word | ✓ |
| listening | 👂 | word | ✓ |
| sentence-ordering / cloze | 🧩 | word/phrase | ✓ |
| particle-cloze | 🧩 | particella | ✓ |
| conjugation | ✍️ | conj / gram | ✓ (oggi solo → conj) |
| transitivity-pair | 🔍/🧩 | word (coppia) | ✓ |
| counter-quiz / counter-reading | 📖/🧩 | counter | ✓ |
| time-reading | 📖 | word | ✓ |
| **composizione (C4)** | ✍️ | word | ❌ da fare |
| **spoken-production (A6)** | 🎤 | word | ❌ da fare |
| **cloze coniugato (C1)** | 🧩 | conj/gram | ❌ da fare |
| **cloze d'uso (C3)** | 🧩 | word | ❌ da fare |
| **variante a scelta Uso·R** | 🔍 | particella/gram | ❌ da fare |

### 2b. Giochi e avventure (aggancio incrementale)
Peso: **pieno** = delta quiz (+4/−6, Q&A discreta); **piccolo+** = solo positivo (orale fuzzy);
**—** = nessun controllo → non attribuire.

| Attività | Interazione controllata (già nel codice) | Entità | Cella | Peso |
|---|---|---|---|---|
| `/keigo` | scelta forma keigo (+ mic opz.) | `word:` | 🔍/🧩 (+🎤👂) | pieno |
| `/iikae` | scelta equivalente 言い換え | `word:` | 🎯 | pieno |
| `/particelle` | scelta particella | `particella:` | 🔍/🧩 | pieno |
| `/riordina` | riordino frase | `word:`/`phrase:` | 🧩 | pieno |
| `/ascolto` | comprensione all'ascolto | `word:`/`phrase:` | 👂 | pieno |
| `/choukai` | comprensione (solo ascolto) | `phrase:` | 👂 | pieno |
| `/lettura`, `/skimming` | lettura/comprensione | `word:`/`phrase:` | 📖 | pieno |
| `/ristorante`,`/treno`,`/kaimono` | dire prezzo/numero (`speechMatches`) | `counter:`/`word:` | 🧩+🎤 (👂 sullo step d'ascolto) | piccolo+ |
| `/shigoto`,`/presentati` | battuta a voce (`speechMatches`) | `phrase:` | 🎤+🧩 | piccolo+ |
| `/giornata` | battuta a voce (nessun miss registrato) | `phrase:` | 🎤👂 | piccolo+ |
| `/shadowing` | ripetizione al mic (`speechMatches`) | `phrase:`/parole chiave | 🎤+👂 | piccolo+ |
| `/consolida/<id>` | drill mirato sull'entità | l'entità stessa | cella del generatore usato | pieno |
| avventure — ascolto passivo / copione letto | (nessun controllo) | — | — | **—** |

---

## Decisioni sciolte (16/07)

### Soglie di sblocco (8 stage 0-7; agganciate alla scala già in `pickWordMode` righe 137-157)
| Cella | Sblocco | Note |
|---|---|---|
| 💡 Comprensione | stage 0 | come oggi |
| 📖 Lettura | stage 0 (se kanji) | come oggi (pesata) |
| 👂 Ascolto | stage 1 | come oggi (`stage >= 1`) |
| 🎯 Produzione (IT→JP) | stage 2 | come oggi |
| 🧩 Uso in frase | stage 2 | richiede frasi + minimo consolidamento |
| 🎤 Parlato | **stage 3** | nuovo |
| ✍️ Scrittura (comporre) | **stage 4** | nuovo, la più difficile |

Selezione: pesca la cella **applicabile + sbloccata meno sviluppata**, con casualità e **mai la
stessa due volte di fila**. Nessuna regressione: le celle attive restano ai loro stage.

### Peso — dipende dal SEGNALE, non dall'attività
- Scelta discreta (giusto/sbagliato) → **+4 / −6** (come `applyPracticeReview`).
- Match vocale `speechMatches` → **+2 / 0** (solo positivo: il mic sbaglia, non penalizzare).
- Ascolto passivo / copione → **niente**.

### `gram:*` (e `conj:*`, `particella:*`) = practice-only, come A5
- In `/punti-deboli` + `/consolida`, **non** nel pool di scheduling. `pctFor` → `practiceOnlyKinds`
  aggiunge `'gram'`; `loadWeakItems` etichetta col titolo `GRAMMAR_FORMS`; `KIND_META` con icona.
- Portano le sotto-celle {💡 🔍 🧩} (stesso meccanismo facet), mostrate come **barrette** (non radar —
  quello resta alle parole); l'**aggregato (media)** fa il ranking in punti-deboli.
