// Icone per riconoscere a colpo d'occhio le categorie grammaticali (品詞).
// Condivise da JpBadge e da qualunque altra UI che elenchi le stesse categorie
// (es. i filtri di /consolida), per restare visivamente coerenti.
export const ICONS_BY_LABEL: Record<string, string> = {
	動詞: '🏃',
	名詞: '📦',
	形容詞: '🎨',
	副詞: '🔀',
	連体詞: '📌',
	接続詞: '➕',
	助詞: '🪝',
	感動詞: '😮',
	助動詞: '🔧',
	数詞: '🔟',
	助数詞: '🔢',
	慣用表現: '💬',
	五段動詞: '5️⃣',
	一段動詞: '1️⃣',
	不規則動詞: '*️⃣',
	他動詞: '👉',
	自動詞: '🤖',
	尊敬語: '👑',
	謙譲語: '🙇'
};

// Aggettivi: l'icona È la desinenza — い/な stilizzati come emoticon.
export const KANA_ICONS: Record<string, string> = {
	い形容詞: 'い',
	な形容詞: 'な'
};
