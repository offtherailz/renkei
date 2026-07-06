// Ristoranti (お店) per l'avventura "Al ristorante". Menu realistici e semplici,
// con bevande in ognuno (お水 è gratis, come in Giappone). Contatori: 杯 (ciotole/
// bicchieri), 本 (bottiglie/spiedini), 個 (pezzi), つ (generico). Struttura pronta
// per aggiungere locali e menu più complessi.

export interface Dish {
	id: string;
	emoji: string;
	nome: string;
	lettura: string;
	it: string;
	prezzo: number;
	counterId: string;
}

export interface Restaurant {
	id: string;
	emoji: string;
	nome: string;
	lettura: string;
	it: string;
	menu: Dish[];
}

// Bevande comuni a (quasi) tutti i menu.
const OMIZU: Dish = { id: 'mizu', emoji: '💧', nome: 'お水', lettura: 'おみず', it: 'acqua (gratis)', prezzo: 0, counterId: '杯' };
const OCHA: Dish = { id: 'ocha', emoji: '🍵', nome: 'お茶', lettura: 'おちゃ', it: 'tè', prezzo: 200, counterId: '杯' };
const BEER: Dish = { id: 'beer', emoji: '🍺', nome: 'ビール', lettura: 'びーる', it: 'birra', prezzo: 500, counterId: '本' };

export const RESTAURANTS: Restaurant[] = [
	{
		id: 'ramen',
		emoji: '🍜',
		nome: 'ラーメン屋',
		lettura: 'らーめんや',
		it: 'Ramen-ya',
		menu: [
			{ id: 'ramen', emoji: '🍜', nome: 'ラーメン', lettura: 'らーめん', it: 'ramen', prezzo: 800, counterId: '杯' },
			{ id: 'gyoza', emoji: '🥟', nome: '餃子', lettura: 'ぎょうざ', it: 'gyoza', prezzo: 400, counterId: '個' },
			{ id: 'chahan', emoji: '🍚', nome: 'チャーハン', lettura: 'ちゃーはん', it: 'riso fritto', prezzo: 600, counterId: 'つ' },
			BEER,
			OCHA,
			OMIZU
		]
	},
	{
		id: 'sushi',
		emoji: '🍣',
		nome: '寿司屋',
		lettura: 'すしや',
		it: 'Sushi-ya',
		menu: [
			{ id: 'nigiri', emoji: '🍣', nome: 'にぎり', lettura: 'にぎり', it: 'nigiri (a pezzo)', prezzo: 200, counterId: '個' },
			{ id: 'maki', emoji: '🍥', nome: '巻き寿司', lettura: 'まきずし', it: 'maki roll', prezzo: 500, counterId: '本' },
			{ id: 'misoshiru', emoji: '🥣', nome: '味噌汁', lettura: 'みそしる', it: 'zuppa di miso', prezzo: 250, counterId: '杯' },
			BEER,
			OCHA,
			OMIZU
		]
	},
	{
		id: 'yakitori',
		emoji: '🍢',
		nome: '焼き鳥屋',
		lettura: 'やきとりや',
		it: 'Yakitori-ya',
		menu: [
			{ id: 'yakitori', emoji: '🍢', nome: '焼き鳥', lettura: 'やきとり', it: 'spiedino di pollo', prezzo: 150, counterId: '本' },
			{ id: 'edamame', emoji: '🫛', nome: '枝豆', lettura: 'えだまめ', it: 'edamame', prezzo: 300, counterId: '個' },
			{ id: 'rice', emoji: '🍚', nome: 'ライス', lettura: 'らいす', it: 'riso', prezzo: 200, counterId: '杯' },
			{ id: 'highball', emoji: '🥃', nome: 'ハイボール', lettura: 'はいぼーる', it: 'highball', prezzo: 450, counterId: '杯' },
			BEER,
			OMIZU
		]
	}
];
