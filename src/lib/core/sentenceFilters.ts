// Filtri condivisi sulle frasi d'esempio (quiz, riordina…).

// «Elenco di forme» tipo 飲むな、食べるな、するな、来るな。: dimostra una
// coniugazione sulla scheda, ma NON è una frase — niente ordine da ricostruire,
// niente buco sensato da riempire. Riconoscimento: 2+ virgole giapponesi e
// nessuna particella né connettivo (una frase vera con più virgole ne ha
// sempre almeno uno: おいしいかどうか、わからないから、食べない。).
// niente も/と/へ nella classe: compaiono dentro le coniugazioni stesse
// (飲もう, 来と…) e nelle parole (へや) — qui bastano le particelle di caso
// «forti» e i connettivi, visto che si applica solo a frasi con 3+ segmenti.
const PARTICLE_OR_CONNECTIVE = /[はがをにで]|から|ので|けど|かどうか/;

export function isFormEnumeration(plainSentence: string): boolean {
	const segs = plainSentence
		.split('、')
		.map((x) => x.replace(/[。！？\s　]/g, '').trim())
		.filter(Boolean);
	if (segs.length < 3) return false;
	// Elenco di forme = 3+ segmenti TUTTI brevi (飲める、食べられる、できる、来られる。):
	// anche quando una forma contiene per caso un kana-particella (で in «できる»,
	// に…), che prima faceva fallire il controllo basato sulle particelle. Una
	// frase vera ha almeno un segmento lungo (predicato/soggetto esteso).
	if (segs.every((x) => [...x].length <= 6)) return true;
	return !PARTICLE_OR_CONNECTIVE.test(plainSentence);
}
