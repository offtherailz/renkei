// GENERATO da static/seed-n5n4.json (kanji N5/N4/EXTRA). Non modificare a mano.
// Nella prova d'esame il furigana resta SOLO sui kanji sopra il livello N4,
// come nell’esame vero.

const N4_KANJI = new Set("一七万丈三上下不世中主乗九事二五京人今仕代以休会低住体何作使便借働元兄先光入八公六円写冬凄出分切別前力勉動匂北区医十千午半南去友口古可台叱右合同名味品員問喉噌噛四回図国土地坊堂場声売夏夕外多夜大天太女好妹姉始子字学安室家寒小少屋山川工左市帰年広店度建引弟弱強待後心思急悪意所手持教文料新方旅族日早明映春昼時暑暗曜書月有服朝木本村来東林校森椅業楽歌止正歩死母毎民気水池注洋洗海漢濡火無父牛物特犬理生産用田男町画界病痩発白百目県真着知短研碗社私秋究空立答箸紙終習考者耳聞肉自色花英茶菜薬行西見親言計試話語説読誰買貸貼質赤走起足車転軽近送通週進運道遠都醤重野金銀鍵長門開間院集雨電青音頃頭題顔風食飯飲飴館首駅験高魚鳥鹸黒".split(''));

export function isInLevel(kanji: string): boolean { return N4_KANJI.has(kanji); }

// Toglie il furigana 漢字[かな] solo se tutti i kanji del gruppo sono N4/N5;
// sopra livello lo lascia (reso come ruby). Poi via gli spazi (わかち書き).
export function examStrip(text: string): string {
	return text
		.replace(/([\u4e00-\u9faf々]+)\[([^\]]+)\]/g, (m: string, base: string) =>
			[...base].every((c) => N4_KANJI.has(c) || c === '々') ? base : "​" + m
		)
		.replace(/[\s　]/g, '');
}
