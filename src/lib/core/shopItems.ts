// Catalogo prodotti per i giochi "situazionali" (spesa, konbini, find-it…).
// Solo emoji + dati testuali: niente asset immagine. Ogni prodotto ha il suo
// contatore (per comporre "2本", "3こ"…) e un reparto (per i giochi futuri).

export interface ShopItem {
	id: string;
	emoji: string;
	scrittura: string;
	lettura: string;
	it: string;
	reparto: string; // chiave interna
	repartoJp: string; // etichetta reparto in giapponese
	prezzo: number; // yen, prezzo tipico
	counterId: string; // id contatore (deve esistere in counters-n5n4.json)
}

export const SHOP_ITEMS: ShopItem[] = [
	// 飲み物 (bevande)
	{ id: 'gyunyu', emoji: '🥛', scrittura: '牛乳', lettura: 'ぎゅうにゅう', it: 'latte', reparto: 'bevande', repartoJp: '飲み物', prezzo: 200, counterId: '本' },
	{ id: 'mizu', emoji: '💧', scrittura: '水', lettura: 'みず', it: 'acqua', reparto: 'bevande', repartoJp: '飲み物', prezzo: 100, counterId: '本' },
	{ id: 'ocha', emoji: '🍵', scrittura: 'お茶', lettura: 'おちゃ', it: 'tè', reparto: 'bevande', repartoJp: '飲み物', prezzo: 150, counterId: '本' },
	{ id: 'juice', emoji: '🧃', scrittura: 'ジュース', lettura: 'じゅうす', it: 'succo', reparto: 'bevande', repartoJp: '飲み物', prezzo: 130, counterId: '本' },
	{ id: 'coffee', emoji: '☕', scrittura: 'コーヒー', lettura: 'こうひい', it: 'caffè', reparto: 'bevande', repartoJp: '飲み物', prezzo: 180, counterId: '杯' },
	// 果物・野菜 (frutta e verdura)
	{ id: 'ringo', emoji: '🍎', scrittura: 'りんご', lettura: 'りんご', it: 'mela', reparto: 'frutta', repartoJp: '果物', prezzo: 120, counterId: '個' },
	{ id: 'banana', emoji: '🍌', scrittura: 'バナナ', lettura: 'ばなな', it: 'banana', reparto: 'frutta', repartoJp: '果物', prezzo: 100, counterId: '本' },
	{ id: 'mikan', emoji: '🍊', scrittura: 'みかん', lettura: 'みかん', it: 'mandarino', reparto: 'frutta', repartoJp: '果物', prezzo: 80, counterId: '個' },
	{ id: 'tomato', emoji: '🍅', scrittura: 'トマト', lettura: 'とまと', it: 'pomodoro', reparto: 'verdura', repartoJp: '野菜', prezzo: 90, counterId: '個' },
	{ id: 'ninjin', emoji: '🥕', scrittura: 'にんじん', lettura: 'にんじん', it: 'carota', reparto: 'verdura', repartoJp: '野菜', prezzo: 60, counterId: '本' },
	// パン・卵 (pane e uova)
	{ id: 'tamago', emoji: '🥚', scrittura: '卵', lettura: 'たまご', it: 'uovo', reparto: 'uova-pane', repartoJp: 'パン・卵', prezzo: 30, counterId: '個' },
	{ id: 'pan', emoji: '🍞', scrittura: 'パン', lettura: 'ぱん', it: 'pane', reparto: 'uova-pane', repartoJp: 'パン・卵', prezzo: 250, counterId: 'つ' },
	{ id: 'onigiri', emoji: '🍙', scrittura: 'おにぎり', lettura: 'おにぎり', it: 'onigiri', reparto: 'uova-pane', repartoJp: 'パン・卵', prezzo: 130, counterId: '個' },
	// 肉・魚 (carne e pesce)
	{ id: 'sakana', emoji: '🐟', scrittura: '魚', lettura: 'さかな', it: 'pesce', reparto: 'pesce-carne', repartoJp: '肉・魚', prezzo: 400, counterId: '匹' },
	{ id: 'ebi', emoji: '🍤', scrittura: 'えび', lettura: 'えび', it: 'gambero', reparto: 'pesce-carne', repartoJp: '肉・魚', prezzo: 300, counterId: '匹' },
	{ id: 'niku', emoji: '🍖', scrittura: '肉', lettura: 'にく', it: 'carne', reparto: 'pesce-carne', repartoJp: '肉・魚', prezzo: 500, counterId: 'つ' },
	// お菓子 (snack)
	{ id: 'choco', emoji: '🍫', scrittura: 'チョコ', lettura: 'ちょこ', it: 'cioccolato', reparto: 'snack', repartoJp: 'お菓子', prezzo: 150, counterId: '個' },
	{ id: 'cookie', emoji: '🍪', scrittura: 'クッキー', lettura: 'くっきい', it: 'biscotto', reparto: 'snack', repartoJp: 'お菓子', prezzo: 120, counterId: '枚' },
	{ id: 'ame', emoji: '🍬', scrittura: 'あめ', lettura: 'あめ', it: 'caramella', reparto: 'snack', repartoJp: 'お菓子', prezzo: 100, counterId: '個' },
	{ id: 'icecream', emoji: '🍦', scrittura: 'アイス', lettura: 'あいす', it: 'gelato', reparto: 'snack', repartoJp: 'お菓子', prezzo: 160, counterId: '個' },
	// 日用品 (casa)
	{ id: 'toiletpaper', emoji: '🧻', scrittura: 'トイレットペーパー', lettura: 'といれっとぺえぱあ', it: 'carta igienica', reparto: 'casa', repartoJp: '日用品', prezzo: 300, counterId: 'つ' },
	{ id: 'sekken', emoji: '🧼', scrittura: 'せっけん', lettura: 'せっけん', it: 'sapone', reparto: 'casa', repartoJp: '日用品', prezzo: 200, counterId: '個' },
	{ id: 'hana', emoji: '💐', scrittura: '花', lettura: 'はな', it: 'fiori', reparto: 'casa', repartoJp: '日用品', prezzo: 500, counterId: '本' },
	{ id: 'kasa', emoji: '☂️', scrittura: '傘', lettura: 'かさ', it: 'ombrello', reparto: 'casa', repartoJp: '日用品', prezzo: 600, counterId: '本' }
];

export interface ShoppingRequest {
	item: ShopItem;
	qty: number;
}

function shuffle<T>(xs: T[]): T[] {
	const a = [...xs];
	for (let i = a.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j]!, a[i]!];
	}
	return a;
}

// Genera una lista della spesa (お使い): `count` prodotti distinti con quantità
// 1-4, più alcuni distrattori da mostrare nella griglia insieme ai richiesti.
export function generateShoppingList(
	count = 3,
	distractors = 3
): { list: ShoppingRequest[]; grid: ShopItem[] } {
	const picked = shuffle(SHOP_ITEMS).slice(0, count);
	const list = picked.map((item) => ({ item, qty: 1 + Math.floor(Math.random() * 4) }));
	const others = shuffle(SHOP_ITEMS.filter((x) => !picked.includes(x))).slice(0, distractors);
	const grid = shuffle([...picked, ...others]);
	return { list, grid };
}
