import { db } from './schema';
import { setPrivateMazzi, type Mazzo } from '$lib/data/mazzi';

// Mazzi arrivati dai file corso: letti dal database e resi visibili a findMazzo/allMazzi.
export async function loadPrivateMazzi(): Promise<void> {
	try {
		const rows = await db.course_mazzi.toArray();
		setPrivateMazzi(rows.map(({ corso_id: _corso, updated_at: _updated, ...m }) => m as Mazzo));
	} catch {
		setPrivateMazzi([]); // database non ancora pronto: nessun mazzo privato
	}
}
