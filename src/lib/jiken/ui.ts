// 事件 — testi dell'interfaccia. Giapponese (solo kanji N5/N4) e italiano;
// l'inglese si aggiunge qui (en) e, finché manca, ricade sull'italiano.
import type { Testo } from './tipi';

export const UI = {
	indietro: { ja: '← アドベンチャー', it: '← Avventure' },
	ノート: { ja: '📓 ノート', it: '📓 Taccuino' },
	lingua: { ja: '🌐 日本語', it: '🌐 Italiano' },
	titolo: { ja: 'さくら町の 毎日', it: 'La vita a さくら町' },
	intro: {
		ja: 'あなたは さくら町に 来た ばかりです。さくら会社で はたらいて、吉田[よしだ]さんの 家に 住んで います。町を 歩いて、用事を して、いろいろな 人と 話しましょう。ときどき ふしぎな ことが 起きます。よく 見て、よく 聞いて ください。',
		it: 'Sei appena arrivato a さくら町, un quartiere di 山野市. Lavori alla さくら会社 e vivi presso la famiglia 吉田. Gira per il quartiere, fai le commissioni, parla con la gente: ogni tanto succede qualcosa di strano, e tu osservi bene.'
	},
	regole: [
		{ ja: '🗺️ 地図の たてものを タッチすると、そこへ 行きます（15分）。店には 開いて いる 時間が あります。', it: '🗺️ Tocca un edificio sulla mappa per andarci (15 minuti). I negozi hanno i loro orari.' },
		{ ja: '❗ は 今 する ことが ある 所です。', it: '❗ indica dove c’è qualcosa della storia da fare adesso.' },
		{ ja: '💬 ✂️ か 文を タッチすると、ことばに 分かれて、読み方と いみが 見られます。🇮🇹 で ほんやくが 出ます。', it: '💬 ✂️ (o un tocco sulla frase) la divide in parole: toccale per lettura e significato. 🇮🇹 mostra la traduzione.' },
		{ ja: '📓 ノートには やる こと、大切な ことば、持ち物、行った 所と 時間が 書いて あります。', it: '📓 Il taccuino tiene obiettivi, frasi importanti, oggetti e dove sei stato a che ora.' },
		{ ja: '🌙 夜、家で 今日の 問題に 答えて、ねます（自動で セーブ）。', it: '🌙 La sera, a casa: domande d’esame sulla giornata, poi a letto (salvataggio automatico).' }
	],
	nome: { ja: 'あなたの 名前（カタカナ。ローマ字でも いいです：luca → ルカ）', it: 'Il tuo nome (katakana, o in lettere: «luca» → ルカ)' },
	continua: { ja: '▶ つづける', it: '▶ Continua' },
	nuova: { ja: '✨ 新しく 始める', it: '✨ Nuova partita' },
	sicuro: { ja: '始めから やりなおしますか。今の セーブは きえます。', it: 'Ricominciare da capo? Il salvataggio attuale si perde.' },
	missione1: { ja: 'ミッション1：「はじめての 一週間」。三日間（4月6日〜8日）。', it: 'Missione 1: «はじめての 一週間» (la prima settimana). Tre giornate, 6-8 aprile.' },
	vai: { ja: '🚶 行く（15分）', it: '🚶 Vai (15 min)' },
	entra: { ja: '🚪 入る', it: '🚪 Entra' },
	aspetta: { ja: '⏳ 30分 待つ', it: '⏳ Aspetta 30 min' },
	seiA: { ja: '📍 今 いる 所：', it: '📍 Sei a: ' },
	aperto: { ja: '今 開いて います', it: 'aperto adesso' },
	chiusoOra: { ja: '今 しまって います', it: 'chiuso adesso' },
	chiuso: { ja: 'しまって います。', it: 'È chiuso.' },
	niente: { ja: '今は ここで する ことが ありません。', it: 'Non c’è niente da fare qui adesso.' },
	avanti: { ja: '▶ つぎへ', it: '▶ Avanti' },
	cosaDici: { ja: '— 何と 言いますか。', it: '— cosa dici?' },
	domanda: { ja: '📝 試験の 問題', it: '📝 Domanda d’esame' },
	giusto: { ja: '⭕ 正しい！', it: '⭕ Giusto!' },
	sbagliato: { ja: '❌ ちがいます。', it: '❌ No.' },
	spiega: { ja: '💡 せつめい', it: '💡 Spiegazione' },
	prova: { ja: '🔎 しょうこを 見せる', it: '🔎 Mostra una prova' },
	nonSo: { ja: 'わからない', it: 'non so' },
	provaOk: { ja: '⭕ それです！', it: '⭕ Prova giusta!' },
	provaNo: { ja: '❌ それでは ありません。', it: '❌ Non era quella.' },
	completata: { ja: '🎉 ミッション クリア：', it: '🎉 Missione completata: ' },
	punti: { ja: '試験の 問題：', it: 'Domande d’esame: ' },
	giuste: { ja: '問 正しい', it: 'giuste' },
	obiettivi: { ja: '🎯 やる こと', it: '🎯 Obiettivi' },
	nessuno: { ja: 'まだ ありません。', it: 'Ancora niente.' },
	oggetti: { ja: '🎒 持ち物', it: '🎒 Oggetti' },
	percorso: { ja: '🕐 行った 所', it: '🕐 Dove sei stato' },
	frasi: { ja: '💬 大切な ことば', it: '💬 Frasi importanti' },
	domande: { ja: '📝 試験の 問題', it: '📝 Domande d’esame' },
	taccuinoDi: { ja: 'の ノート', it: '' },
	nuovoOb: { ja: '📓 新しい やる こと', it: '📓 nuovo obiettivo' },
	obFatto: { ja: '✅ やる こと クリア', it: '✅ obiettivo fatto' },
	fine: {
		ja: 'ミッション クリア！ さいふが 見つかって、高橋[たかはし]くんに おれいを 言って、中村[なかむら]さんと 知り合いに なりました。',
		it: 'Missione completata! Hai ritrovato il portafoglio, ringraziato 高橋くん e conosciuto l’ispettore 中村.'
	},
	prossima: { ja: 'ミッション2「いなくなった ミケ」は もうすぐです。', it: 'La missione 2 (いなくなった ミケ, il gattino scomparso) arriva presto.' },
	rileggi: { ja: '📓 ノートを 読む', it: '📓 Rileggi il taccuino' },
	inizio: { ja: '↺ はじめの ページへ', it: '↺ Torna all’inizio' },
	tu: { ja: 'あなた', it: 'tu' }
} satisfies Record<string, Testo | Testo[]>;
