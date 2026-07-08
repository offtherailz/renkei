// Stazioni per l'avventura "Al treno". Nomi reali della zona di Tokyo, prezzo
// biglietto indicativo dalla stazione di partenza. Struttura semplice, pronta
// per aggiungerne altre o linee diverse.

export interface Station {
	id: string;
	nome: string;
	lettura: string;
	prezzo: number; // yen del biglietto
}

export const STATIONS: Station[] = [
	{ id: 'shinjuku', nome: '新宿', lettura: 'しんじゅく', prezzo: 200 },
	{ id: 'shibuya', nome: '渋谷', lettura: 'しぶや', prezzo: 160 },
	{ id: 'ueno', nome: '上野', lettura: 'うえの', prezzo: 170 },
	{ id: 'ikebukuro', nome: '池袋', lettura: 'いけぶくろ', prezzo: 210 },
	{ id: 'shinagawa', nome: '品川', lettura: 'しながわ', prezzo: 180 },
	{ id: 'akihabara', nome: '秋葉原', lettura: 'あきはばら', prezzo: 150 }
];
