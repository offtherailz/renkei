// Passi comuni alle missioni: arrivo in ufficio la mattina e rientro dalla
// pausa pranzo. Le scene dell'ufficio possono partire a qualunque ora (chi gira
// per il quartiere arriva tardi): così il ritardo si nota sempre, invece di
// sentire «è mezzogiorno» alle quattro del pomeriggio.
import type { Passo } from '../tipi';

const h = (ore: number, min = 0): number => ore * 60 + min;

// la mattina: puntuale entro le 9; dopo, 森 lo fa notare (e a mezzogiorno di più)
export const arrivo = (): Passo => ({
	se: { alle: h(9, 1) },
	allora: [],
	altrimenti: [
		{
			se: { alle: h(12) },
			allora: [{ dice: 'mori', ja: '{nome}さん、9時を すぎて いますよ。あしたは おくれないで くださいね。', it: '{nome}, sono passate le 9. Domani non faccia tardi, per favore.' }],
			altrimenti: [
				{ dice: 'mori', faccia: 'preoccupata', ja: '{nome}さん、もう 昼ですよ！ 何を して いたんですか。', it: '{nome}, è già mezzogiorno! Che cosa stava facendo?' },
				{ io: 'おそく なって、すみません。', it: 'Scusi il ritardo.' }
			]
		}
	]
});

// il pomeriggio: la pausa pranzo finisce alle 13:30
export const rientro = (): Passo => ({
	se: { dalle: h(13, 31) },
	allora: [{ dice: 'mori', ja: '{nome}さん、昼休みは もう 終わって いますよ。', it: '{nome}, la pausa pranzo è finita da un pezzo.' }]
});
