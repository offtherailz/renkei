# Open Source Data

This project can populate its N5/N4 vocabulary and kanji seed from:

- Repository: allenlu2009/japanese-learning-datasets
- URL: https://github.com/allenlu2009/japanese-learning-datasets
- License: MIT

Imported datasets currently used by the sync script:

- vocabulary/n5.json
- vocabulary/n4.json
- kanji/n5.json
- kanji/n4.json

This project also imports N5/N4 grammar from:

- Repository: Sigmabond01/jlpt-grammar-api
- URL: https://github.com/Sigmabond01/jlpt-grammar-api
- License: MIT

Imported datasets currently used by the sync script:

- api/grammar/N5
- api/grammar/N4

Notes:

- The upstream dataset provides English meanings. The current import maps those meanings into both `it` and `en` fields until a dedicated Italian translation source is added.
- Grammar is now merged from the MIT grammar API plus any local curated entries already present in the seed.
- Genki chapter grouping is not imported from this source. It needs a separate mapping layer.