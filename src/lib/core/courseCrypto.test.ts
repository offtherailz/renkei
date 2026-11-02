// Cifra/decifra anche da riga di comando (la password non va mai nel repo):
//   CORSO_PASSWORD='…' CORSO_AZIONE=cifra npx vitest run src/lib/core/courseCrypto.test.ts
//   CORSO_PASSWORD='…' CORSO_AZIONE=decifra npx vitest run src/lib/core/courseCrypto.test.ts
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { decryptCourse, encryptCourse, isEncryptedCourse } from './courseCrypto';

const CHIARO = 'corsi/mazzi-lezioni.renkei-course.json'; // fuori dal repo (.gitignore)
const CIFRATO = 'corsi/mazzi-lezioni.renkei-course.cifrato.json'; // nel repo

describe('file corso cifrati', () => {
	it('andata e ritorno con la password giusta', async () => {
		const testo = JSON.stringify({ versione: '1.0', mazzi: [{ id: 'x', titolo: 'お正月' }] });
		const c = await encryptCourse(testo, 'segreta');
		expect(isEncryptedCourse(c)).toBe(true);
		expect(c).not.toContain('お正月');
		expect(await decryptCourse(c, 'segreta')).toBe(testo);
	});

	it('password sbagliata: errore chiaro, nessun dato', async () => {
		const c = await encryptCourse('{"a":1}', 'giusta');
		await expect(decryptCourse(c, 'sbagliata')).rejects.toThrow(/Password sbagliata/);
	});

	it('due cifrature dello stesso testo sono diverse (sale e iv casuali)', async () => {
		expect(await encryptCourse('uguale', 'p')).not.toBe(await encryptCourse('uguale', 'p'));
	});

	it('un file corso normale non risulta cifrato', () => {
		expect(isEncryptedCourse('{"versione":"1.0"}')).toBe(false);
		expect(isEncryptedCourse('non json')).toBe(false);
	});

	const password = process.env.CORSO_PASSWORD ?? '';
	it.skipIf(!password || process.env.CORSO_AZIONE !== 'cifra')('cifra il file dei mazzi', async () => {
		writeFileSync(CIFRATO, await encryptCourse(readFileSync(CHIARO, 'utf8'), password));
		expect(await decryptCourse(readFileSync(CIFRATO, 'utf8'), password)).toBe(readFileSync(CHIARO, 'utf8'));
	}, 60_000);
	it.skipIf(!password || process.env.CORSO_AZIONE !== 'decifra' || !existsSync(CIFRATO))('decifra il file dei mazzi', async () => {
		writeFileSync(CHIARO, await decryptCourse(readFileSync(CIFRATO, 'utf8'), password));
	}, 60_000);
});
