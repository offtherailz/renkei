// Pulizie da applicare al refresh del seed: bulkPut è un upsert e non rimuove
// mai — le voci rinominate/fuse/riclassificate nel pipeline resterebbero per
// sempre nei DB dei dispositivi. Qui si tolgono, migrando il progresso SRS
// dove esiste un successore. Idempotente: girare più volte non fa danni.
import { db } from '$lib/db/schema';

// vecchio id → id successore (rinomine e fusioni di scripts/lib/word-splits.mjs;
// 回る、回す era una voce doppia, il progresso va al 自動詞 回る)
const RENAMED_WORDS: Record<string, string> = {
	下る: '下がる',
	落る: '落ちる',
	落す: '落とす',
	楽む: '楽しむ',
	うかがう: '伺う',
	'回る、回す': '回る',
	// copie aggiunte per errore con le parole delle prove N4 (v150): la voce
	// esisteva già con la grafia doppia «A; B»
	いい: 'いい; よい',
	じゃあ: 'じゃ; じゃあ',
	高校: '高校; 高等学校',
	レポート: 'レポート; リポート',
	コンピューター: 'コンピュータ; コンピューター',
	やっぱり: 'やはり; やっぱり',
	けれども: 'けれど; けれども',
	// verbi in -する generati per errore da nomi che non lo vogliono: il
	// progresso passa al nome
	いっぱいする: 'いっぱい',
	かっこうする: 'かっこう',
	交通する: '交通',
	原因する: '原因',
	留守する: '留守',
	暖房する: '暖房',
	冷房する: '冷房'
};

// Voci eliminate senza successore: le 11 frasi-domanda dell'aeroporto che
// erano classificate 慣用表現 tra le PAROLE (17/07) — vivono in Frasi utili
// (situazione «In aeroporto»), non nel mazzo SRS del vocabolario.
const REMOVED_WORDS: string[] = [
	'すみません、搭乗口はどこですか',
	'チェックインカウンターはどこですか',
	'トイレはどこですか',
	'これはどこで受け取りますか',
	'観光です',
	'これは私のパスポートです',
	'申告するものはありません',
	'これを預けたいです',
	'これは機内持ち込みできますか',
	'Wi-Fiルーターのレンタルはどこですか',
	'宅急便はどこですか'
];

export async function applySeedMigrations(): Promise<void> {
	await db.words.bulkDelete([...Object.keys(RENAMED_WORDS), ...REMOVED_WORDS]);
	// il progresso delle rinominate passa al successore (se non ne ha già uno)
	for (const [oldId, newId] of Object.entries(RENAMED_WORDS)) {
		const row = await db.srs_progress.get(`word:${oldId}`);
		if (!row) continue;
		const successor = await db.srs_progress.get(`word:${newId}`);
		if (!successor) await db.srs_progress.put({ ...row, id_item: `word:${newId}` });
		await db.srs_progress.delete(`word:${oldId}`);
	}
	await db.srs_progress.bulkDelete(REMOVED_WORDS.map((id) => `word:${id}`));
}
