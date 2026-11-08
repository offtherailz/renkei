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

// ── la sera a casa: due chiacchiere in famiglia e il meteo di domani alla TV
// (domanda d'ascolto, come al 聴解). Una voce per ogni sera di missione; le altre
// sere non aggiungono niente. Parole scelte tra le N4 che la storia non usa.
interface Sera {
	famiglia: Passo[];
	meteo: { ja: string; it: string; domanda: string; domandaIt: string; opzioni: [string, string][]; giusta: number; spiega: string };
}
const SERE: Record<number, Sera> = {
	0: {
		famiglia: [
			{ dice: 'papa', ja: '{nome}さん、はじめての しごとは どうだった？ つかれただろう。', it: '{nome}, com’è andato il primo giorno? Sarai stanc{o}.' },
			{ dice: 'mamma', ja: 'おふろが わいて いるわよ。今日は ゆっくり やすんでね。', it: 'Il bagno è pronto. Stasera riposati.' },
			{ nota: 'わく (沸[わ]く) = l’acqua bolle / il bagno è pronto; わかす = far bollire.', it: 'Coppia di verbi.' }
		],
		meteo: { ja: 'あしたの 天気です。午前中は はれますが、午後から くもって、夜は 雨に なるでしょう。かさを もって 出かけて ください。', it: 'Il meteo di domani. In mattinata sereno, dal pomeriggio nuvoloso, la sera pioggia. Uscite con l’ombrello.', domanda: 'あしたの 夜の 天気は どうですか。', domandaIt: 'Che tempo farà domani sera?', opzioni: [['雨', 'pioggia'], ['はれ', 'sereno'], ['くもり', 'nuvoloso'], ['ゆき', 'neve']], giusta: 0, spiega: 'Mattina はれ, pomeriggio くもり, sera 雨: la domanda chiede la sera. 〜でしょう = probabilmente.' }
	},
	1: {
		famiglia: [
			{ dice: 'papa', ja: 'あしたから しばらく 車で 会社へ 行く ことに なったよ。電車が こんで いて ね。', it: 'Da domani per un po’ vado al lavoro in macchina. I treni sono troppo pieni.' },
			{ dice: 'mamma', ja: 'うんてんには 気を つけてね。この 間も じこが あったでしょう。', it: 'Attento a guidare. Anche l’altro giorno c’è stato un incidente.' }
		],
		meteo: { ja: 'あしたは 一日中 くもりです。きおんは きょうより 5度 ひくく、すこし さむく なります。', it: 'Domani nuvoloso tutto il giorno. Temperature 5 gradi più basse di oggi: un po’ più freddo.', domanda: 'あしたは きょうと くらべて どうですか。', domandaIt: 'Domani rispetto a oggi?', opzioni: [['さむい', 'più freddo'], ['あつい', 'più caldo'], ['おなじ', 'uguale'], ['雨が ふる', 'piove']], giusta: 0, spiega: '「5度 ひくく、さむく なります」: きおん (きおん) = temperatura; 〜と くらべて = rispetto a.' }
	},
	2: {
		famiglia: [
			{ dice: 'mamma', ja: 'せんたくきが こしょうして しまったの。あした、でんきやさんが 来るわ。', it: 'Si è rotta la lavatrice. Domani viene il tecnico.' },
			{ dice: 'papa', ja: 'もう 15年も つかったからなあ。そろそろ 新しいのを かおうか。', it: 'L’abbiamo usata 15 anni. Forse è ora di comprarne una nuova.' }
		],
		meteo: { ja: 'あしたは はれて、あたたかく なります。でも、夕方から 風が つよく なるので、気を つけて ください。', it: 'Domani sereno e mite. Ma dal tardo pomeriggio il vento si rinforza: attenzione.', domanda: 'あしたの 夕方は 何に 気を つけますか。', domandaIt: 'A cosa fare attenzione domani verso sera?', opzioni: [['風', 'il vento'], ['雨', 'la pioggia'], ['ゆき', 'la neve'], ['あつさ', 'il caldo']], giusta: 0, spiega: '「夕方から 風が つよく なる」. Al 聴解 la risposta è spesso dopo でも (il «però»).' }
	},
	7: {
		famiglia: [
			{ dice: 'papa', ja: 'らいしゅうの 土曜日、いなかの そふと そぼが あそびに 来るんだ。', it: 'Sabato prossimo vengono a trovarci i nonni dalla campagna.' },
			{ dice: 'mamma', ja: 'じゃあ、おしいれから おきゃくさん用の ふとんを 出して おかないと。', it: 'Allora devo tirare fuori dall’armadio i futon per gli ospiti.' },
			{ nota: 'おしいれ (押[お]し入れ) = l’armadio a muro dove si ripongono i ふとん (布団[ふとん]). 〜ないと = devo…', it: 'Casa giapponese.' }
		],
		meteo: { ja: 'あしたの 朝は きりが 出て、とおくが 見えにくい ところが あります。昼からは はれるでしょう。', it: 'Domattina nebbia, in alcune zone si vedrà poco lontano. Dal pomeriggio sereno.', domanda: 'あしたの 朝は どうですか。', domandaIt: 'Com’è domattina?', opzioni: [['きりで とおくが 見えにくい', 'nebbia, si vede poco'], ['はれて いる', 'sereno'], ['つよい 雨', 'pioggia forte'], ['とても あつい', 'caldissimo']], giusta: 0, spiega: 'きり = nebbia; 見えにくい = difficile da vedere (〜にくい). とおく (遠く) = lontano.' }
	},
	8: {
		famiglia: [
			{ dice: 'mamma', ja: 'テレビの ばんぐみで、日本の しゅうかんを しょうかいして いたわよ。{nome}さんも 見たら？', it: 'In TV c’era un programma sulle usanze giapponesi. Perché non lo guardi?' },
			{ dice: 'papa', ja: 'アナウンサーの 話し方が はっきりして いて、べんきょうに なるよ。', it: 'L’annunciatore parla chiaro, è utile per studiare.' }
		],
		meteo: { ja: 'あしたは 雨の あと くもりです。雨は 朝 9時ごろ やむでしょう。', it: 'Domani pioggia, poi nuvoloso. La pioggia smetterà verso le 9.', domanda: '雨は 何時ごろ やみますか。', domandaIt: 'Verso che ora smette di piovere?', opzioni: [['9時ごろ', 'verso le 9'], ['午後', 'nel pomeriggio'], ['夜', 'di sera'], ['やまない', 'non smette']], giusta: 0, spiega: 'やむ (止む) = smettere (pioggia, vento).' }
	},
	9: {
		famiglia: [
			{ dice: 'papa', ja: 'ミケは まだ 見つからないのかい？ しんぱいだね。', it: 'Miké non l’hanno ancora trovata? Che pensiero.' },
			{ dice: 'mamma', ja: '木村[きむら]さんの お母さん、さびしそうだったわ。早く 見つかると いいわね。', it: 'La madre di Kimura sembrava così triste. Speriamo la trovino presto.' }
		],
		meteo: { ja: 'あしたは はれて、きおんが 25度まで 上がります。もう 夏のような 天気です。', it: 'Domani sereno, fino a 25 gradi. Sembrerà già estate.', domanda: 'あしたは 何度まで 上がりますか。', domandaIt: 'Fino a quanti gradi si arriva domani?', opzioni: [['25度', '25 gradi'], ['15度', '15 gradi'], ['20度', '20 gradi'], ['30度', '30 gradi']], giusta: 0, spiega: '「25度まで 上がります」: 〜ような = come; 上がる = salire.' }
	},
	14: {
		famiglia: [
			{ dice: 'mamma', ja: 'さいきん、{nome}さんの 日本語、とても 上手に なったわね。', it: 'Ultimamente il tuo giapponese è migliorato tanto.' },
			{ io: 'ありがとうございます。まいにち ふくしゅうして いるんです。', it: 'Grazie. Ripasso ogni giorno.' },
			{ dice: 'papa', ja: 'えらいなあ。わたしも わかい ころ、えいごを 一生けんめい べんきょうしたよ。', it: 'Bravo. Anch’io da giovane studiavo inglese con tutto l’impegno.' }
		],
		meteo: { ja: 'あしたは くもりで、ときどき 雨が ふります。出かける ときは かさを わすれないで ください。', it: 'Domani nuvoloso con pioggia a tratti. Non dimenticate l’ombrello.', domanda: 'あした 出かける とき、何を もって 行きますか。', domandaIt: 'Domani, cosa porti uscendo?', opzioni: [['かさ', 'l’ombrello'], ['ぼうし', 'il cappello'], ['てぶくろ', 'i guanti'], ['水', 'l’acqua']], giusta: 0, spiega: 'ときどき = a tratti. 〜ないで ください = non… (consiglio).' }
	},
	15: {
		famiglia: [
			{ dice: 'papa', ja: 'かいしゃで 何か あったのかい？ かおに 「たいへんでした」と 書いて あるよ。', it: 'È successo qualcosa al lavoro? Hai «che giornata» scritto in faccia.' },
			{ io: 'しりょうが なくなって、みんなで さがしたんです。', it: 'È sparito un documento e l’abbiamo cercato tutti.' },
			{ dice: 'mamma', ja: 'まあ。でも、見つかって よかったわね。', it: 'Oh. Ma meno male che si è trovato.' }
		],
		meteo: { ja: 'あしたは 一日中 はれて、空気が かわいて います。火事に 気を つけて ください。', it: 'Domani sereno tutto il giorno, aria secca. Attenzione agli incendi.', domanda: 'あした、何に 気を つけますか。', domandaIt: 'Domani, a cosa fare attenzione?', opzioni: [['火事', 'agli incendi'], ['雨', 'alla pioggia'], ['じしん', 'ai terremoti'], ['ゆき', 'alla neve']], giusta: 0, spiega: 'くうき (空気) = aria; かわく (乾く) = seccarsi; かじ (火事) = incendio.' }
	},
	16: {
		famiglia: [
			{ dice: 'papa', ja: 'ホテルで かいぎ？ すごいなあ。こんどは 東京[とうきょう]へ しゅっちょうかな。', it: 'Una riunione in hotel? Accidenti. La prossima volta una trasferta a Tokyo?' },
			{ dice: 'mamma', ja: 'お父さんは わかい ころ、ぼうえきの 会社で せかいじゅうへ 行ったのよ。', it: 'Papà da giovane lavorava in una ditta di commercio estero e girava il mondo.' }
		],
		meteo: { ja: 'あしたの 朝は ひえて、5度ぐらいに なります。あたたかい ふくを きて ください。昼は 15度ぐらいです。', it: 'Domattina freddo, circa 5 gradi. Vestitevi pesante. A mezzogiorno circa 15.', domanda: 'あしたの 朝は 何度ぐらいですか。', domandaIt: 'Domattina quanti gradi?', opzioni: [['5度', '5 gradi'], ['15度', '15 gradi'], ['10度', '10 gradi'], ['0度', '0 gradi']], giusta: 0, spiega: 'Il 聴解 dà due numeri (mattina 5, mezzogiorno 15): la domanda chiede la mattina. ひえる (冷える) = raffreddarsi.' }
	},
	21: {
		famiglia: [
			{ dice: 'mamma', ja: 'ゴールデンウィークは どこも こむから、なるべく 近くで あそびましょう。', it: 'Nella Golden Week c’è folla dappertutto: divertiamoci il più possibile vicino a casa.' },
			{ dice: 'papa', ja: 'じゃあ、どうぶつえんは どうかな。前から 行きたいと 思って いたんだ。', it: 'Allora che ne dite dello zoo? Era da un po’ che volevo andarci.' }
		],
		meteo: { ja: 'あしたは はれますが、夕方から 雨が ふるでしょう。あさっての しゅくじつは 一日中 いい 天気です。', it: 'Domani sereno, ma dal tardo pomeriggio pioggia. Dopodomani, festivo, bel tempo tutto il giorno.', domanda: 'しゅくじつの 天気は どうですか。', domandaIt: 'Che tempo farà il giorno festivo?', opzioni: [['一日中 いい 天気', 'bello tutto il giorno'], ['夕方から 雨', 'pioggia dal tardo pomeriggio'], ['朝だけ 雨', 'pioggia solo la mattina'], ['くもり', 'nuvoloso']], giusta: 0, spiega: 'Due giorni nello stesso annuncio: il festivo è あさって (dopodomani). La pioggia è di domani.' }
	},
	22: {
		famiglia: [
			{ dice: 'papa', ja: '{nome}さん、えの しゅみは ある？ わたしは わかい ころ、えを かいて いたんだよ。', it: '{nome}, ti piace dipingere? Io da giovane dipingevo.' },
			{ dice: 'mamma', ja: 'お父さんの え、おしいれに まだ あるわよ。こんど 見せて あげたら？', it: 'I quadri di papà sono ancora nell’armadio. Perché non glieli fai vedere?' }
		],
		meteo: { ja: 'あしたは きょうと おなじく はれて、すずしい 一日に なります。お出かけには ちょうど いいでしょう。', it: 'Domani sereno come oggi, una giornata fresca. Perfetta per uscire.', domanda: 'あしたは どんな 一日ですか。', domandaIt: 'Che giornata sarà domani?', opzioni: [['はれて すずしい', 'sereno e fresco'], ['雨で さむい', 'pioggia e freddo'], ['くもりで あつい', 'nuvoloso e caldo'], ['風が つよい', 'vento forte']], giusta: 0, spiega: 'すずしい (涼しい) = fresco, piacevole; ちょうど いい = proprio adatto.' }
	},
	23: {
		famiglia: [
			{ dice: 'mamma', ja: 'しゅくじつなのに、しごと おつかれさま。ばんごはんは ステーキよ！', it: 'Grazie del lavoro anche nel giorno di festa. Stasera bistecca!' },
			{ dice: 'papa', ja: 'あしたからは しばらく 休みだろう？ ゆっくり ねぼうしても いいよ。', it: 'Da domani sei in vacanza per un po’, no? Puoi dormire quanto vuoi.' }
		],
		meteo: { ja: 'ゴールデンウィークの 天気です。あしたから 三日間は はれ、そのあと 雨の 日が つづくでしょう。', it: 'Il meteo della Golden Week. Da domani tre giorni sereni, poi diversi giorni di pioggia.', domanda: 'あしたから 何日間 はれますか。', domandaIt: 'Da domani, per quanti giorni sereno?', opzioni: [['三日間', 'tre giorni'], ['一日', 'un giorno'], ['一週間', 'una settimana'], ['はれない', 'non sarà sereno']], giusta: 0, spiega: '「三日間は はれ、そのあと 雨の 日が つづく」: つづく = continuare.' }
	}
};

export const serata = (): Passo[] =>
	Object.entries(SERE).map(([g, s]) => ({
		se: { giorno: Number(g) },
		allora: [
			...s.famiglia,
			{ narra: 'テレビで 天気よほうを やって います。', it: 'In TV c’è il meteo.' },
			{
				domanda: {
					ja: s.meteo.domanda,
					it: s.meteo.domandaIt,
					ascolto: { ja: s.meteo.ja, it: s.meteo.it, chi: 'F' },
					opzioni: s.meteo.opzioni.map(([ja, it]) => ({ ja, it })),
					giusta: s.meteo.giusta,
					spiega: s.meteo.spiega
				}
			}
		]
	}));
