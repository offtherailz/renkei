// Ristoranti per l'avventura "Al ristorante". Ogni ristorante ha il suo menu
// (piatti con emoji, nome JP, prezzo, contatore). Si parte con 2 ristoranti e
// piatti semplici; la struttura è pensata per aggiungerne di più complessi.

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
			{ id: 'beer', emoji: '🍺', nome: 'ビール', lettura: 'びーる', it: 'birra', prezzo: 500, counterId: '本' },
			{ id: 'ocha', emoji: '🍵', nome: 'お茶', lettura: 'おちゃ', it: 'tè', prezzo: 200, counterId: '杯' }
		]
	},
	{
		id: 'teishoku',
		emoji: '🍱',
		nome: '定食屋',
		lettura: 'ていしょくや',
		it: 'Teishoku-ya',
		menu: [
			{ id: 'teishoku', emoji: '🍱', nome: '定食', lettura: 'ていしょく', it: 'set completo', prezzo: 900, counterId: 'つ' },
			{ id: 'curry', emoji: '🍛', nome: 'カレー', lettura: 'かれー', it: 'curry', prezzo: 700, counterId: 'つ' },
			{ id: 'udon', emoji: '🥣', nome: 'うどん', lettura: 'うどん', it: 'udon', prezzo: 600, counterId: '杯' },
			{ id: 'salad', emoji: '🥗', nome: 'サラダ', lettura: 'さらだ', it: 'insalata', prezzo: 300, counterId: '個' },
			{ id: 'ocha', emoji: '🍵', nome: 'お茶', lettura: 'おちゃ', it: 'tè', prezzo: 200, counterId: '杯' }
		]
	}
];
