# Prompt delle immagini (visual novel e «Un giorno in Giappone»)

Le immagini sono generate con Gemini, una chat per immagine, in stile PC-98
(anni '90). Qui ci sono i prompt usati, per rifarle o aggiungerne di nuove con
lo stesso aspetto.

## Come si caricano e come si elaborano

- Si caricano nella cartella `ritratti` del workspace, meglio come file immagine
  (i link di condivisione di Gemini a volte scadono).
- Se il file caricato è in realtà la pagina di condivisione di Gemini (inizia con
  `<!doctype html>`), l'immagine si scarica dal suo link
  `https://lh3.googleusercontent.com/gg/…`: si toglie il suffisso `=s1024-rj` e si
  mette `=s0` per avere la dimensione originale.
- Non ci sono programmi per le immagini installati: scontorno e tagli si fanno con
  Chromium (canvas) via Playwright, avviato con `--allow-file-access-from-files`.
- **Personaggi**: fondo magenta pieno. Lo scontorno toglie il fondo, allinea le
  due versioni (bocca chiusa / aperta) e copia solo la zona della bocca, così il
  resto del viso resta identico. Escono in `static/giorno/ritratti/<id>-chiusa.png`
  e `<id>-parla.png`, alti 360 px.
- **Sfondi**: tagliati a 2:1 (640×320) dal centro, in `static/giorno/sfondi/`.
  Le cose importanti vanno nella fascia centrale.
- **Oggetti**: griglia 4×4 su magenta, tagliati uno per uno con fondo
  trasparente in `static/giorno/oggetti/`.
- Il treno è un PNG con i finestrini trasparenti; dietro scorre il panorama.

## Personaggi

Formato che funziona meglio: **due immagini separate** nella stessa chat (prima
bocca chiusa, poi bocca aperta). Con due pannelli affiancati Gemini tagliava le
spalle. Nomi dei file: `<nome>_chiusa.jpg` e `<nome>_aperta.jpg`.

Prompt (cambia solo la riga della descrizione):

```
PC-98 style anime portrait, 1990s Japanese visual novel character sprite, 16-color dithered pixel art, crisp pixels, cel shading, retro anime face.
<DESCRIZIONE DEL PERSONAGGIO>
ONE single image, landscape 16:9. The character is centered and occupies only the central third of the image width: upper body from the waist up, both shoulders and both arms completely inside the image, arms relaxed down at the sides, wide empty magenta space on the left, on the right and above the head.
The body continues down to the bottom edge of the image (cut at the waist by the bottom border), no empty space below.
Mouth closed. Facing the viewer, eye level.
Plain flat solid magenta background (#B4318F), no gradient, no pattern. Do not use pink, purple or magenta in the clothes or hair.
No text, no labels, no frame, no border, no UI.
```

Seconda richiesta, nella stessa chat:

```
Exactly the same image, identical in every pixel, but with the mouth clearly open as if talking. Do not move, zoom or change anything else.
```

Descrizioni usate:

| id | descrizione |
|---|---|
| ispettore | 1man, Japanese police detective, about 45 years old, short black hair slightly messy, sharp observant eyes, light stubble, beige trench coat over a white shirt and loose dark tie. |
| receptionist | 1woman, Japanese hotel receptionist, about 28 years old, black hair in a neat low bun, polite professional smile, dark navy uniform jacket with a small gold name badge and a light blue scarf. |
| padrone | 1man, Japanese apartment landlord, about 65 years old, bald on top with short gray hair on the sides, round glasses, grumpy suspicious expression, brown knitted vest over a checked shirt. |
| custode | 1woman, Japanese museum guard, about 40 years old, short dark brown bob haircut, serious tired expression, dark green security uniform, small radio clipped on the shoulder, no hat. |
| mamma | 1woman, Japanese mother, about 50 years old, short wavy dark brown hair, kind warm smile, light beige cardigan over a pale yellow blouse, simple apron. |
| papa | 1man, Japanese father, about 55 years old, short black hair with gray at the sides, relaxed friendly expression, dark green knitted sweater over a white collared shirt, casual at home. |
| farmacista | 1woman, adult Japanese pharmacist, about 30 years old, short neat black hair, kind smile, white pharmacist coat over a light blue blouse, small name badge, no glasses. |
| commesso | 1boy, young adult Japanese shop clerk, about 22 years old, short dark brown hair, friendly polite smile, plain dark green shop apron over a white shirt, small name tag on the apron. |
| panettiera | 1girl, Japanese bakery shop assistant, about 25 years old, brown hair tied in a low ponytail, warm smile, cream-colored bakery apron over a light beige shirt, small white bandana cap. |
| medico_uomo | 1man, Japanese doctor, about 45 years old, short black hair with a little gray at the temples, thin rectangular glasses, calm reassuring expression, white doctor's coat over a light blue shirt and dark tie, stethoscope around the neck. |
| insegnante_donna | 1woman, Japanese school teacher, about 35 years old, shoulder-length black hair, gentle but serious expression, navy blue cardigan over a white blouse, small brooch. |
| studente_uomo | 1boy, Japanese high school student, about 17 years old, messy black hair, friendly smile, navy blue school blazer with a small emblem, white shirt, red tie. |
| amica | 1girl, young Japanese woman, about 24 years old, chin-length dark violet-black hair, bright cheerful smile, mustard yellow casual jacket over a white t-shirt. (fondo verde #2FA84F invece del magenta, per i capelli viola) |

### Espressioni (stesso personaggio)

Allegare il ritratto esistente. `[EMOZIONE]`: `surprised, eyes wide` ·
`nervous, sweating, eyes looking away` · `angry, frowning`.
Nome file: `<id>_<emozione>_chiusa.jpg` / `_aperta.jpg`.

```
Same character as the attached image, same PC-98 1990s visual novel pixel art style, same clothes, same hair, same colors.
Expression: [EMOZIONE].
ONE single image, landscape 16:9. The character is centered and occupies only the central third of the image width: upper body from the waist up, both shoulders and both arms completely inside the image, wide empty magenta space on the left, on the right and above the head.
The body continues down to the bottom edge of the image (cut at the waist by the bottom border), no empty space below.
Mouth closed. Facing the viewer, eye level.
Plain flat solid magenta background (#B4318F), no gradient.
No text, no labels, no frame, no UI.
```

## Sfondi

Schema comune (cambia la descrizione del luogo e la riga finale su cosa tenere al centro):

```
PC-98 style background art, 1990s Japanese visual novel, 16-color dithered pixel art, crisp pixels, ordered dithering, soft pastel palette.
<DESCRIZIONE DEL LUOGO>, seen at eye level, wide 16:9 composition.
<DETTAGLI>
Empty scene: no people, no characters, no text overlays, no frame, no UI.
Keep <COSE IMPORTANTI> in the central horizontal band of the image (top and bottom may be cropped).
```

| sfondo | luogo e dettagli |
|---|---|
| farmacia | Interior of a small Japanese neighborhood pharmacy, from the customer side. Shelves of medicine boxes, vitamins and bandages, a counter with a small cash register and a pharmacist window, a sign "くすり", white walls with light green accents, fluorescent lights. |
| cinema | Lobby of a small Japanese neighborhood movie theater. Ticket counter with a price board, movie posters (abstract, no readable titles), snack counter with popcorn, a sign "えいがかん", red carpet, a door to the screening room. |
| condominio | Entrance hall of a Japanese apartment building. Metal mailboxes with room numbers, a notice board with paper notices, an intercom next to a glass auto-lock door, an elevator, a potted plant, evening light. |
| parco | A Japanese neighborhood park on a sunny afternoon. Gravel path, wooden benches, cherry and zelkova trees, a small fountain, a playground, a public clock on a pole, a vending machine, apartment buildings behind the trees. |
| casa | Living room of an ordinary Japanese apartment. Low table on tatami with a teapot and two cups, floor cushions, small TV, wall calendar and clock, fusuma sliding door, small kitchen corner with fridge and sink, window with lace curtains, genkan at the edge. |
| museo | Interior of a quiet Japanese art and history museum room. Paintings and old scrolls (no readable text), a glass display case in the center with an EMPTY velvet stand (something was stolen), red rope barrier, spotlights, a security camera, a doorway. |
| ufficio_capo | Private office of a Japanese company president (社長室). Large dark wooden desk with leather chair, desk lamp, piles of documents, a small safe with its door slightly open, bookshelf with binders, window with city view and blinds, framed calligraphy, sofa set. |
| magazzino | Dim storage room in the basement of an office building. Metal shelves with cardboard boxes, old office chairs, mop and bucket, a single hanging bulb, a small high window, footprints in the dust, a back door slightly open. |

### Treno e panorama

Interno del vagone (i finestrini diventano trasparenti):

```
PC-98 style background art, 1990s Japanese visual novel, 16-color dithered pixel art, crisp pixels, ordered dithering, soft pastel palette.
Interior of a Japanese commuter train carriage, seen from inside at seated eye level, wide 16:9 composition.
Long bench seats with blue-green upholstery on both sides, hanging hand straps, metal poles, advertisement posters above the windows (abstract, no readable text), a route map strip above the door, a sliding door with a small window, warm ceiling lights.
IMPORTANT: every window glass area must be filled with a single plain flat solid magenta color (#FF00FF), no reflections, no scenery, no gradient.
Empty carriage: no people, no characters, no text overlays, no frame, no UI.
```

Panorama dal finestrino (striscia che si ripete):

```
PC-98 style background art, 1990s Japanese visual novel, 16-color dithered pixel art, crisp pixels, ordered dithering, soft pastel palette.
Very wide horizontal panorama seen from a moving train window, side view, flat 2D layers, ultra-wide 4:1 composition.
Japanese suburban scenery: rows of low houses with tiled roofs, small apartment blocks, utility poles with wires, a level crossing, rice fields, a river with a small bridge, distant green hills and mountains, blue sky with soft clouds.
SEAMLESS TILEABLE horizontally: the left edge must continue perfectly into the right edge.
No train, no window frame, no people, no text, no frame, no UI.
```

## Oggetti indizio

```
PC-98 style pixel art item icons, 1990s Japanese adventure game inventory, 16-color dithered pixel art, crisp pixels, soft pastel palette, thin dark outlines.
A 4x4 grid of 16 separate objects, each centered in its own equal square cell, same size and same light from top-left, slight top-down three-quarter view:
row 1: a metal door key, a brown leather wallet, a wet folded umbrella with drops, a small paper train ticket;
row 2: a shop receipt, a broken wristwatch with cracked glass, a coffee cup with a lipstick mark, a pair of work gloves;
row 3: a sealed envelope letter, a printed photograph, a flip mobile phone, a compact camera;
row 4: an adhesive bandage, a small cardboard parcel with tape, a post office receipt slip, a box of matches.
Plain flat solid magenta background (#FF00FF) everywhere around and between the objects, no shadows on the background, generous empty space between cells.
No text, no labels, no numbers, no frame, no UI.
```

id nell'ordine della griglia: chiave, portafoglio, ombrello, biglietto,
scontrino, orologio, tazza, guanti, lettera, foto, cellulare, macchina_foto,
cerotto, pacco, ricevuta_posta, fiammiferi.

## Correzioni rapide (stessa chat)

- Spalle o braccia tagliate: `Same image, zoom out: show both full shoulders with empty magenta space on the left, right and above the head. Keep everything else identical.`
- Testa tagliata in alto: `zoom out, more empty space above the head`.
- Bocca aperta con il viso cambiato: `same image, only change the mouth`.

## 事件: città di 山野市 (missioni 1-3)

### Sfondi nuovi (schema comune degli sfondi)

| sfondo | luogo e dettagli | al centro |
|---|---|---|
| koban | Front of a small Japanese neighborhood police box (交番) on a street corner, evening light. Small concrete building with a red round lamp above the door, glass sliding door, a desk with a logbook and a phone visible inside, a notice board with wanted and lost-and-found posters (no readable text), a bicycle parked outside, a map board of the neighborhood. | the door and the desk |
| jinja | A small Japanese Shinto shrine on a wooded hill at sunset. Stone steps leading up to a red torii gate, stone lanterns, a small wooden shrine hall with a rope and bell, a purification fountain with ladles, tall cedar trees, a pair of stone fox statues, fallen leaves. | the torii and the shrine hall |
| tera | Courtyard of a quiet Japanese Buddhist temple. Wooden main hall with a large curved tiled roof, a big incense burner with smoke, a bronze bell in a small bell tower, raked gravel, pine trees, stone path, a wooden board with prayer plaques (no readable text). | the main hall and the incense burner |
| piscina | Indoor Japanese public swimming pool (市民プール). Rectangular pool with lane ropes, blue tiles, a lifeguard chair, a large wall clock, benches, a big window with daylight, a kids' shallow pool at the side. | the pool and the clock |
| hotel | Lobby of a mid-range Japanese business hotel. Reception counter with a small bell and key cards, a sofa corner with a low table and newspapers, a potted plant, an elevator, a luggage cart, a wall clock, warm lights. | the reception counter |

### ミケ (sprite, schema dei personaggi)

```
PC-98 style anime sprite, 1990s Japanese visual novel, 16-color dithered pixel art, crisp pixels, cel shading.
A small calico kitten (white with orange and black patches), big round eyes, sitting and looking at the viewer, one front paw slightly lifted, a red collar with a small gold bell.
ONE single image, landscape 16:9. The kitten is centered and occupies only the central third of the image width, full body visible, wide empty space all around.
Plain flat solid green background (#2FA84F), no gradient, no pattern, no shadow on the background.
No text, no labels, no frame, no border, no UI.
```

Seconda richiesta, nella stessa chat (bocca aperta, miagola):

```
Exactly the same image, identical in every pixel, but with the mouth open as if meowing. Do not move, zoom or change anything else.
```

### Oggetti nuovi (griglia 4×4, schema degli oggetti)

```
PC-98 style pixel art item icons, 1990s Japanese adventure game inventory, 16-color dithered pixel art, crisp pixels, soft pastel palette, thin dark outlines.
A 4x4 grid of 16 separate objects, each centered in its own equal square cell, same size and same light from top-left, slight top-down three-quarter view:
row 1: a red cat collar with a small gold bell, a small metal pet bowl with water, a paper flyer with a simple drawing of a cat (no text), a printed photograph of a calico kitten;
row 2: a stack of photocopied paper sheets, a blue transparent document folder with papers inside, a white convenience store plastic bag, a small can of cat food;
row 3: a carton of milk, a small bouquet of flowers wrapped in paper, a brown bakery paper bag with bread, a hotel key card;
row 4: a business card, a Japanese train IC card, a small red shrine amulet charm (omamori), a bento box.
Plain flat solid magenta background (#FF00FF) everywhere around and between the objects, no shadows on the background, generous empty space between cells.
No text, no labels, no numbers, no frame, no UI.
```

Gemini l'ha fatta 6×3 (18 oggetti, una foto doppia e uno zaino in più). id usati, nell'ordine della griglia 4×4 richiesta: collare, ciotola, volantino_gatto, foto_gatto,
fotocopie, cartellina, busta_konbini, cibo_gatto, latte, mazzo_fiori,
sacchetto_pane, chiave_hotel, biglietto_visita, carta_ic, omamori, bento.

### Mappa illustrata di さくら町

Allegare `docs/giallo-mappa.png` come schema. La mappa deve stare **senza
scritte**: i nomi e i lucchetti li mette l'app sopra, così restano leggibili e
si possono cambiare. Formato 16:9; poi si rifanno le coordinate dei luoghi
nell'SVG sopra l'immagine.

```
Redraw the attached schematic map as a beautiful illustrated Japanese town map, in the style of a hand-drawn Japanese tourist map (観光マップ) mixed with 1990s PC-98 pixel art: 16-color dithered pixel art, crisp pixels, soft pastel palette, slight top-down isometric view of small buildings.
Keep the SAME LAYOUT as the attached image: green mountains along the top edge, a river running down the left side with a wooden bridge, a main horizontal street across the middle, a shopping street going down the center to a small train station at the bottom, a railway line along the bottom edge, a park on the right.
Draw each place as a small recognizable building exactly where its box is in the attached image: Japanese company office building (top center right), Japanese family house with tiled roof (left), small apartment building (left, below the house), school (upper left), family restaurant with noren curtain, coffee shop, post office with red mailbox, convenience store, bakery, pharmacy, flower shop, police box with red lamp, cherry blossom park, small train station, a Shinto shrine with red torii on a hill (top right), a Buddhist temple with curved roof (top left), a public swimming pool building (right).
Add small details: cherry trees in bloom, utility poles with wires, vending machines, bicycles, tiny cars, a level crossing.
ONE single image, landscape 16:9, no empty margins.
No text, no labels, no letters, no numbers, no signs with writing, no legend, no compass, no frame, no UI. Leave the lower right corner calm (plain fields) because a small panel will be placed there.
```

**Versione notturna** (stessa chat, subito dopo quella di giorno, così la disposizione resta identica). L'app usa la notte dalle 18 alle 6. File: `mappa_giorno.png` e `mappa_notte.png`. Nel repo: `static/giorno/mappa/sakura-giorno.jpg` e `sakura-notte.jpg`. La prima versione aveva una legenda in basso a sinistra: è stata coperta con lo stesso angolo della mappa di notte, schiarito.

```
Exactly the same map, identical layout and identical buildings in the same positions, but at night.
Dark blue night sky over the mountains with stars and a crescent moon. Warm yellow light in the windows of houses and shops, glowing street lamps along the streets, the convenience store brightly lit, the police box red lamp glowing, red paper lanterns at the restaurant and at the shrine, lit train station with a train passing with lit windows. Closed shops have dark windows and lowered shutters. Soft moonlight on the river.
Keep the same PC-98 16-color dithered pixel art style. Do not move, add or remove any building.
No text, no labels, no letters, no numbers, no frame, no UI.
```

**Ampliamento a destra (est)**: nella stessa chat della mappa di giorno, poi la notte. Il primo sesto a sinistra della nuova immagine ripete l'ultimo sesto a destra della vecchia: serve per allinearle e fonderle senza cucitura. File: `mappa_est_giorno.png` e `mappa_est_notte.png`.

```
Now draw the next part of the same town, to the RIGHT (east) of the day map you just made. Same style, same scale, same isometric angle, same light, same size: ONE single image, landscape 16:9.
OVERLAP: the left sixth of the new image must repeat exactly the right sixth of the previous map (the convenience store, the houses on the right, the main street and the railway), so the two images can be joined side by side.
The main street continues horizontally at the same height, the railway continues at the bottom at the same height, the green hills continue along the top edge.
New buildings, each small and recognizable, spread over the new area:
- a coffee shop with a small terrace and a striped awning;
- a family restaurant with a noren curtain and red paper lanterns;
- a post office with a red mailbox in front;
- a flower shop with flower buckets on the sidewalk;
- a small pharmacy with a green cross;
- a three-story apartment building with balconies and laundry;
- a public swimming pool building with a big glass roof, near the hills;
- a small shopping arcade entrance with a decorated gate;
- a few ordinary houses, a parking lot, vending machines, utility poles, cherry trees.
No text, no labels, no letters, no numbers, no signs with writing, no legend, no compass, no frame, no UI.
```

Poi, nella stessa chat:

```
Exactly the same new part of the map, identical layout and identical buildings in the same positions, but at night, with the same lighting as the night map you made before: dark blue sky with stars, warm yellow windows, glowing street lamps, red lanterns at the restaurant, the coffee shop softly lit, closed shops with dark windows and lowered shutters.
Do not move, add or remove any building. No text, no labels, no frame, no UI.
```

Se cambia la disposizione: `Same map, but move the <edificio> to the <posizione>. Keep everything else identical, no text.`

## 事件: espressioni per le missioni 2 e 3

Schema «Espressioni» qui sopra: si allega il ritratto esistente
(`static/giorno/ritratti/<id>-chiusa.png`) e si cambia solo `[EMOZIONE]`.
File: `<id>_<emozione>_chiusa.jpg` e `<id>_<emozione>_aperta.jpg`.

| personaggio | id | emozione (file) | `[EMOZIONE]` | dove serve |
|---|---|---|---|---|
| madre di 木村 | signora_anziana | preoccupata | `worried and sad, eyebrows raised in the middle, eyes a little teary` | M2: ミケ è sparita |
| madre di 木村 | signora_anziana | felice | `very happy and relieved, warm smile, eyes closed in joy` | M2: ミケ torna |
| 高橋くん | studente_uomo | sorpreso | `surprised, eyes wide, mouth slightly open` | M2: scoperto al santuario |
| 高橋くん | studente_uomo | imbarazzato | `embarrassed and apologetic, awkward smile, one hand scratching the back of his head` | M2: spiega perché |
| 田中さん | collega_uomo | nervoso | `nervous, sweating, eyes looking away` | M3: mente sul documento |
| 田中さん | collega_uomo | imbarazzato | `ashamed and apologetic, head slightly bowed, guilty smile` | M3: confessa |
| 鈴木さん | collega_donna | arrabbiata | `annoyed and serious, frowning, lips pressed together` | M3: «sul tavolo non c'era niente» |
| 森部長 | capo_donna | preoccupata | `worried, frowning slightly, hand near the chin` | M3: il documento è sparito |
| 林さん | receptionist | sorpresa | `surprised, eyes wide` | M3: interrogata |
| 中村刑事 | ispettore | pensieroso | `thinking hard, eyes narrowed, one hand on the chin` | M2-M3: deduzioni |

Per la missione 3 serve anche lo **sfondo della hall dell'hotel** (prompt in
«事件: città di 山野市», riga `hotel`).

## 事件: centro (山野駅前), sala giochi, hotel — prompt completi

Fatti (2026-11-07): `sala_giochi`, `tornelli`, `grande_magazzino`, mappe `ekimae-giorno` e `ekimae-notte` (allineate).

### Mappa di 山野駅前 di notte (nella stessa chat della mappa di giorno)

```
Exactly the same map, identical layout and identical buildings in the same positions, but at night.
Dark blue night sky with stars and a crescent moon. Warm yellow light in office and hotel windows, glowing street lamps along the streets, the game center glowing with bright pink and purple neon, the department store and the station brightly lit, the ramen shop with red paper lanterns, the hospital red cross lit, the shopping arcade lit inside, buses and taxis with headlights on, a train with lit windows on the tracks. Closed shops have dark windows and lowered shutters. The fountain in the park softly lit.
Keep the same PC-98 16-color dithered pixel art style. Do not move, add or remove any building.
No text, no labels, no letters, no numbers, no frame, no UI.
```

### Hall dell'hotel (missione 3)

```
PC-98 style background art, 1990s Japanese visual novel, 16-color dithered pixel art, crisp pixels, ordered dithering, soft pastel palette.
Lobby of a mid-range Japanese business hotel, seen at eye level, wide 16:9 composition.
Reception counter with a small bell and key cards, a sofa corner with a low table and newspapers, a potted plant, an elevator, a luggage cart, a wall clock, warm lights.
Empty scene: no people, no characters, no text overlays, no frame, no UI.
Keep the reception counter in the central horizontal band of the image (top and bottom may be cropped).
```

### Commesso della sala giochi (personaggio; poi, nella stessa chat, la bocca aperta)

```
PC-98 style anime portrait, 1990s Japanese visual novel character sprite, 16-color dithered pixel art, crisp pixels, cel shading, retro anime face.
1boy, young Japanese game center staff, about 23 years old, dyed light brown hair, cheerful grin, red and black staff polo shirt with a small name tag, a coin pouch on the belt.
ONE single image, landscape 16:9. The character is centered and occupies only the central third of the image width: upper body from the waist up, both shoulders and both arms completely inside the image, arms relaxed down at the sides, wide empty magenta space on the left, on the right and above the head.
The body continues down to the bottom edge of the image (cut at the waist by the bottom border), no empty space below.
Mouth closed. Facing the viewer, eye level.
Plain flat solid magenta background (#B4318F), no gradient, no pattern. Do not use pink, purple or magenta in the clothes or hair.
No text, no labels, no frame, no border, no UI.
```

```
Exactly the same image, identical in every pixel, but with the mouth clearly open as if talking. Do not move, zoom or change anything else.
```

### Oggetti della sala giochi (griglia 4×4)

```
PC-98 style pixel art item icons, 1990s Japanese adventure game inventory, 16-color dithered pixel art, crisp pixels, soft pastel palette, thin dark outlines.
A 4x4 grid of 16 separate objects, each centered in its own equal square cell, same size and same light from top-left, slight top-down three-quarter view:
row 1: a tanuki plush toy, a maneki-neko lucky cat plush, a shiba inu dog plush, a red daruma plush;
row 2: an onigiri plush with a face, a sushi plush, a small panda plush, a frog plush;
row 3: a stack of silver game medals, a 100-yen coin, a purikura sticker sheet (cute frames, no readable text), a gold trophy;
row 4: a train IC card with a penguin-like mascot (no readable text), a goshuin stamp book, a station stamp card, a gift-wrapped box.
Plain flat solid magenta background (#FF00FF) everywhere around and between the objects, no shadows on the background, generous empty space between cells.
No text, no labels, no numbers, no frame, no UI.
```

id nell'ordine: tanuki, maneki_neko, shiba, daruma, peluche_onigiri, peluche_sushi,
panda, rana, medaglie, moneta_100, purikura, trofeo, carta_ic2, goshuin, timbri_stazione, regalo.
