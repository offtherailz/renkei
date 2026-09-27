// GENERATO da static/seed-n5n4.json (kanji N5/N4/EXTRA). Non modificare a mano.
// Nella prova d'esame il furigana resta SOLO sui kanji sopra il livello N4,
// come nell’esame vero.

const N4_KANJI = new Set("一七万丈三上下不世中主九事二五京人今仕代以休会住体何作使借元兄先入八公六円写冬凄出分切別前力勉動匂北医十千午半南去友口古可台叱右同名味品員問喉噌噛四図国土地坊堂場売夏夕外多夜大天女妹姉始子字学安室家小少屋山川工左帰年広店度建弟強待後心思急悪意手持教文料新方旅族日早明映春昼時曜書月有服朝木本来東校椅業楽歌止正歩死母毎気水注洋海漢濡火無父牛物特犬理生用田男町画界病痩発白百目真着知研碗社私秋究空立答箸紙終習考者聞肉自色花英茶行西見親言計試話語読誰買貸貼質赤走起足車転近送通週運道醤重野金銀鍵長開間院集雨電青音頃題風食飯飲飴館駅験高魚鳥鹸黒".split(''));

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
