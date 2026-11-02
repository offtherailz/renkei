// File corso cifrati con password: AES-256-GCM, chiave derivata con PBKDF2-SHA256.
// Così il file sta in un repo pubblico ma si legge solo con la password. Stessa
// implementazione nel browser (import da «Corsi») e in Node (script di cifratura).

export interface EncryptedCourse {
	renkei_cifrato: 1;
	kdf: 'PBKDF2-SHA256';
	iterazioni: number;
	sale: string;
	iv: string;
	dati: string;
}

const ITERAZIONI = 600_000;
const enc = new TextEncoder();
const dec = new TextDecoder();

const toB64 = (b: Uint8Array): string => btoa(String.fromCharCode(...b));
const fromB64 = (s: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function deriveKey(password: string, sale: Uint8Array<ArrayBuffer>, iterazioni: number): Promise<CryptoKey> {
	const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
	return crypto.subtle.deriveKey(
		{ name: 'PBKDF2', hash: 'SHA-256', salt: sale, iterations: iterazioni },
		base,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt', 'decrypt']
	);
}

export function isEncryptedCourse(text: string): boolean {
	try {
		return (JSON.parse(text) as Partial<EncryptedCourse>).renkei_cifrato === 1;
	} catch {
		return false;
	}
}

export async function encryptCourse(text: string, password: string): Promise<string> {
	const sale = crypto.getRandomValues(new Uint8Array(16));
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const key = await deriveKey(password, sale, ITERAZIONI);
	const dati = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text)));
	const out: EncryptedCourse = { renkei_cifrato: 1, kdf: 'PBKDF2-SHA256', iterazioni: ITERAZIONI, sale: toB64(sale), iv: toB64(iv), dati: toB64(dati) };
	return JSON.stringify(out) + '\n';
}

// Password sbagliata o file alterato: AES-GCM lo rileva, e qui diventa un errore leggibile.
export async function decryptCourse(text: string, password: string): Promise<string> {
	const c = JSON.parse(text) as EncryptedCourse;
	const key = await deriveKey(password, fromB64(c.sale), c.iterazioni);
	try {
		const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(c.iv) }, key, fromB64(c.dati));
		return dec.decode(plain);
	} catch {
		throw new Error('Password sbagliata, oppure il file è danneggiato.');
	}
}
