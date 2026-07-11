import { test, expect, type Page } from '@playwright/test';

// Smoke test dei percorsi chiave. Il primo caricamento importa il seed
// (~2 MB) in IndexedDB: i timeout dei primi expect sono larghi apposta.

async function gotoHome(page: Page): Promise<void> {
	await page.goto('/');
	await expect(page.getByText('Il piano di oggi')).toBeVisible({ timeout: 45_000 });
}

test('primo avvio: seed importato e home con il piano di oggi', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(String(e)));
	await gotoHome(page);
	await expect(page.getByRole('heading', { name: '連携 Renkei' })).toBeVisible();
	await expect(page.getByText('Ripassi SRS')).toBeVisible();
	expect(errors).toEqual([]);
});

test('onboarding: percorso guidato importa Genki I e attiva solo la lezione 1', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(String(e)));
	await gotoHome(page);
	await expect(page.getByText('Benvenuto su Renkei')).toBeVisible({ timeout: 15_000 });
	await page.getByRole('button', { name: /Sono all'inizio/ }).click();
	// import + studyOnlyCourse sono asincroni: aspetta che l'overlay sparisca
	await expect(page.getByText('Benvenuto su Renkei')).not.toBeVisible({ timeout: 20_000 });
	expect(errors).toEqual([]);

	const state = await page.evaluate(async () => {
		const { db } = await import('/src/lib/db/schema.ts');
		const objectives = await db.study_objectives.toArray();
		const courseRoot = objectives.find((o) => o.id === 'course:genki-1');
		const lesson1 = objectives.find((o) => o.id === 'course:genki-1:lesson:L01');
		const catalogRoots = objectives.filter((o) => o.id === 'obj-catalog-n5' || o.id === 'obj-catalog-n4');
		return {
			courseRootEnabled: courseRoot?.study_enabled ?? false,
			lesson1Enabled: lesson1?.study_enabled ?? false,
			catalogRootsStillEnabled: catalogRoots.some((o) => o.study_enabled)
		};
	});
	// il nodo radice del corso deve risultare attivo, non solo la lezione 1 —
	// altrimenti la card "Genki I" in home mostra "⏸ Pausa" mentre stai
	// effettivamente studiando (era un bug reale, trovato testando a mano).
	expect(state.courseRootEnabled).toBe(true);
	expect(state.lesson1Enabled).toBe(true);
	expect(state.catalogRootsStillEnabled).toBe(false);

	// spiega perché il catalogo libero è sparito in pausa, altrimenti sembra
	// che "tutto si sia spento da solo" (confusione reale, segnalata a mano)
	await expect(page.getByText(/catalogo libero N5\/N4 è in pausa/)).toBeVisible();
});

test('onboarding: "scelgo dopo" lascia tutto attivo come oggi', async ({ page }) => {
	await gotoHome(page);
	await expect(page.getByText('Benvenuto su Renkei')).toBeVisible({ timeout: 15_000 });
	await page.getByRole('button', { name: 'Scelgo dopo' }).click();
	await expect(page.getByText('Benvenuto su Renkei')).not.toBeVisible();
	const catalogEnabled = await page.evaluate(async () => {
		const { db } = await import('/src/lib/db/schema.ts');
		const obj = await db.study_objectives.get('obj-catalog-n5');
		return obj?.study_enabled ?? false;
	});
	expect(catalogEnabled).toBe(true);
	// non ricompare al prossimo giro sulla home
	await page.goto('/');
	await expect(page.getByText('Benvenuto su Renkei')).not.toBeVisible({ timeout: 5_000 });
});

test('onboarding: "ho già basi" chiede il livello e mette in pausa l\'altro', async ({ page }) => {
	await gotoHome(page);
	await expect(page.getByText('Benvenuto su Renkei')).toBeVisible({ timeout: 15_000 });
	await page.getByRole('button', { name: /Ho già delle basi/ }).click();
	await expect(page.getByText('Quale livello attivi?')).toBeVisible();
	await page.getByRole('button', { name: /Solo N5/ }).click();
	await expect(page.getByText('Benvenuto su Renkei')).not.toBeVisible({ timeout: 10_000 });

	const state = await page.evaluate(async () => {
		const { db } = await import('/src/lib/db/schema.ts');
		const n5 = await db.study_objectives.get('obj-catalog-n5');
		const n4 = await db.study_objectives.get('obj-catalog-n4');
		const n4Words = await db.study_objectives.get('obj-catalog-n4-words');
		return { n5Enabled: n5?.study_enabled, n4Enabled: n4?.study_enabled, n4WordsEnabled: n4Words?.study_enabled };
	});
	expect(state.n5Enabled).toBe(true);
	expect(state.n4Enabled).toBe(false);
	expect(state.n4WordsEnabled).toBe(false); // discende ricorsivamente ai figli

	// stessa spiegazione anche per il caso "solo un livello"
	await expect(page.getByText(/Ho messo in pausa il catalogo N4/)).toBeVisible();
});

test('corso: completare una lezione sblocca da sola la successiva', async ({ page }) => {
	await gotoHome(page);
	await page.getByRole('button', { name: /Sono all'inizio/ }).click();
	await expect(page.getByText('Benvenuto su Renkei')).not.toBeVisible({ timeout: 20_000 });

	await page.evaluate(async () => {
		const { db } = await import('/src/lib/db/schema.ts');
		const lesson1 = await db.study_objectives.get('course:genki-1:lesson:L01');
		const now = Date.now();
		for (const key of lesson1?.catalog_item_keys ?? []) {
			await db.srs_progress.put({
				id_item: key,
				srs_stage: 1,
				next_review_date: now + 60 * 60 * 1000,
				ease_factor: 2.3,
				streak: 1,
				mastery_points: 10,
				updated_at: now
			});
		}
	});

	await page.goto('/'); // ricarica: loadPackParty rileva il completamento e sblocca L02
	await expect(page.getByText('Il piano di oggi')).toBeVisible({ timeout: 20_000 });
	await page.waitForTimeout(1000);

	const lesson2Enabled = await page.evaluate(async () => {
		const { db } = await import('/src/lib/db/schema.ts');
		return (await db.study_objectives.get('course:genki-1:lesson:L02'))?.study_enabled ?? false;
	});
	expect(lesson2Enabled).toBe(true);
});

test('catalogo aperto in /courses: espandibile fino ai pack, toggle funziona', async ({ page }) => {
	await gotoHome(page);
	await page.goto('/courses');
	await expect(page.getByText('Catalogo aperto (N5/N4)')).toBeVisible({ timeout: 15_000 });

	const n5Root = page.locator('.objective-node', { hasText: 'Catalogo JLPT N5' });
	await expect(n5Root).toBeVisible({ timeout: 15_000 });
	await n5Root.getByRole('button', { name: /Catalogo JLPT N5/ }).click();

	const kanjiNode = page.locator('.objective-node.sub', { hasText: 'Kanji N5' });
	await expect(kanjiNode).toBeVisible();
	await kanjiNode.getByRole('button', { name: /Kanji N5/ }).click();
	await expect(page.locator('.obj-pack-row', { hasText: 'Pack 1' }).first()).toBeVisible();

	// mette in pausa il pack: il badge passa da ✓ a ⏸
	const packRow = page.locator('.obj-pack-row', { hasText: 'Pack 1' }).first();
	const packToggle = packRow.locator('.obj-status');
	await expect(packToggle).toHaveText('✓');
	await packToggle.click();
	await expect(packToggle).toHaveText('⏸');
});

test('elimina corso: rimuove davvero dataset/lezioni/obiettivi', async ({ page }) => {
	// deleteCourse() interrogava study_tags come indice su words/kanji/grammar,
	// ma non è indicizzato: SchemaError, transazione fallita, NIENTE veniva
	// cancellato e nessun errore era visibile (segnalato: "non funziona e non
	// si capisce cosa fa"). Ora usa uno scan lineare invece dell'indice.
	page.on('dialog', (d) => d.accept());
	await gotoHome(page);
	await page.goto('/courses');
	await expect(page.getByText('Catalogo aperto (N5/N4)')).toBeVisible({ timeout: 15_000 });
	await page.getByRole('button', { name: /Importa$/ }).click();
	await expect(page.getByText(/Genki I importato/)).toBeVisible({ timeout: 15_000 });
	await page.getByRole('button', { name: 'Genki I (ordine del libro)' }).click();
	await expect(page.getByText('Lezioni — Genki I')).toBeVisible();

	await page.getByRole('button', { name: '🗑 Elimina corso' }).click();
	await page.waitForTimeout(500);

	const after = await page.evaluate(async () => {
		const { db } = await import('/src/lib/db/schema.ts');
		return {
			datasets: await db.course_datasets.count(),
			objectives: (await db.study_objectives.toArray()).filter((o) => o.id.startsWith('course:genki-1')).length
		};
	});
	expect(after.datasets).toBe(0);
	expect(after.objectives).toBe(0);
	// la card "corso consigliato" ricompare, invitando a reimportare
	await expect(page.getByText('⭐ Corso consigliato')).toBeVisible();
});

test('route profonda caricata direttamente (refresh)', async ({ page }) => {
	await page.goto('/giochi');
	await expect(page.getByText('Conversazione')).toBeVisible({ timeout: 45_000 });
});

test('quiz: si apre senza errori', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(String(e)));
	await gotoHome(page);
	await page.goto('/quiz');
	// o propone una domanda o dice che non c'è nulla da ripassare: mai bianco
	await expect(page.locator('body')).not.toHaveText('', { timeout: 30_000 });
	await page.waitForTimeout(1500);
	expect(errors).toEqual([]);
});

test('quiz: rispondere a una domanda flashcard-recognition non lancia errori', async ({ page }) => {
	// Modalità scelta a caso tra ~8 possibili: qui forziamo flashcard-recognition
	// (la più semplice, un solo click) ripetendo il tentativo se ne esce un'altra,
	// per verificare in modo stabile che upsertSrs/recordNewCardToday non esplodano.
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(String(e)));
	await gotoHome(page);
	for (let attempt = 0; attempt < 15; attempt += 1) {
		await page.goto('/quiz');
		const hint = page.locator('.question-hint');
		await expect(hint).toBeVisible({ timeout: 30_000 });
		if ((await hint.textContent())?.includes('Scegli la parola giusta')) {
			await page.locator('.choice-btn:not([disabled])').first().click();
			await page.waitForTimeout(500);
			expect(errors).toEqual([]);
			return;
		}
	}
	throw new Error('flashcard-recognition non è mai uscita in 15 tentativi (improbabile ma non impossibile)');
});

test('sessione senza nulla da fare: niente badge bronze né statistiche a zero', async ({ page }) => {
	// Tetto giornaliero già raggiunto e nessun ripasso dovuto: pickNextItem
	// torna null subito, la sessione finisce senza aver risposto a nulla.
	// Prima mostrava comunque "🥉 Bronze" e "0 Risposte/0 Corrette/0%/+0 XP",
	// contraddicendo "Tutto fatto per oggi!" (segnalato testando a mano).
	await gotoHome(page);
	await page.evaluate(async () => {
		const { db } = await import('/src/lib/db/schema.ts');
		const now = new Date();
		const dayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
		await db.user_profile.put({
			id: 'default',
			xp_totali: 0,
			livello: 1,
			streak_giorni: 0,
			badge_sbloccati: [],
			nuove_oggi: 20,
			nuove_oggi_data: dayKey,
			updated_at: Date.now()
		});
	});
	await page.goto('/quiz');
	await expect(page.getByText('🎉 Tutto fatto per oggi!')).toBeVisible({ timeout: 20_000 });
	await expect(page.locator('.summary-tier')).toHaveCount(0);
	await expect(page.locator('.summary-stats')).toHaveCount(0);

	// "🔁 Nuova sessione" con tetto raggiunto sembrava non fare nulla (stessa
	// schermata identica) — ora c'è un bottone esplicito che sblocca altre
	// carte solo per questa sessione, senza toccare l'impostazione salvata.
	const continueBtn = page.getByRole('button', { name: /Continua ancora un po'/ });
	await expect(continueBtn).toBeVisible();
	await continueBtn.click();
	// col tetto sbloccato per la sessione, ora propone davvero una domanda
	await expect(page.locator('.choice-btn').first()).toBeVisible({ timeout: 15_000 });
});

test('contatore dovuto (da un errore in avventura): il quiz lo ripassa davvero', async ({ page }) => {
	// Un errore in un'avventura rende subito "dovuto" un contatore
	// (recordPracticeMiss → createInitialSrs), ma niente lo riprogrammava mai
	// in avanti: restava dovuto per sempre, invisibile al quiz principale.
	// Seed diretto via lo stesso modulo Dexie dell'app (dev server Vite).
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(String(e)));
	await gotoHome(page);
	await page.evaluate(async () => {
		const { db } = await import('/src/lib/db/schema.ts');
		await db.srs_progress.put({
			id_item: 'counter:人',
			srs_stage: 0,
			next_review_date: Date.now() - 1000,
			ease_factor: 2.3,
			streak: 0,
			mastery_points: -20,
			updated_at: Date.now()
		});
	});
	await page.goto('/quiz');
	// il contatore dovuto ha priorità assoluta: è la prima domanda proposta
	await expect(page.getByText('Come si legge?')).toBeVisible({ timeout: 15_000 });
	await expect(page.locator('.question-prompt')).toContainText('人');
	await page.locator('.choice-btn:not([disabled])').first().click();
	await page.waitForTimeout(500);
	expect(errors).toEqual([]);

	// dopo la risposta l'SRS del contatore è avanzato: non è più "dovuto adesso"
	const stillDue = await page.evaluate(async () => {
		const { db } = await import('/src/lib/db/schema.ts');
		const row = await db.srs_progress.get('counter:人');
		return row ? row.next_review_date <= Date.now() : true;
	});
	expect(stillDue).toBe(false);
});

test('keigo: partita, risposta e snapshot su back', async ({ page }) => {
	await gotoHome(page);
	await page.goto('/keigo');
	await page.getByRole('button', { name: 'はじめる' }).click();
	const counter = page.getByText(/1 \/ \d+ — punti/);
	await expect(counter).toBeVisible();

	// rispondi al primo round: appare Avanti/Risultato
	await page.locator('.choice').first().click();
	await expect(page.getByRole('button', { name: /Avanti|Risultato/ })).toBeVisible();

	// vai via e torna indietro: la partita deve essere ancora lì (snapshot)
	await page.getByRole('link', { name: '← Giochi' }).click();
	await expect(page.getByText('Conversazione')).toBeVisible();
	await page.goBack();
	await expect(page.getByText(/1 \/ \d+ — punti/)).toBeVisible();
	await expect(page.getByRole('button', { name: /Avanti|Risultato/ })).toBeVisible();
});

test('popover parola: non sposta il testo circostante', async ({ page }) => {
	await gotoHome(page);
	await page.goto('/detail/word:悪い');
	const tok = page.locator('.tok').first();
	await expect(tok).toBeVisible({ timeout: 15_000 });
	await tok.scrollIntoViewIfNeeded(); // isola l'effetto del popover dallo scroll-into-view del click
	const before = await tok.boundingBox();
	await tok.click();
	await expect(page.locator('.tok-pop')).toBeVisible();
	const after = await tok.boundingBox();
	expect(after?.y).toBeCloseTo(before?.y ?? 0, 0);
	// il popover è flottante (fixed), non un fratello che spinge il flusso
	await expect(page.locator('.tok-pop')).toHaveCSS('position', 'fixed');
});

test('scheda kanji 悪: badge di livello JLPT visibile', async ({ page }) => {
	await gotoHome(page);
	await page.goto('/detail/kanji:悪');
	await expect(page.locator('.jlpt-badge')).toBeVisible({ timeout: 15_000 });
	await expect(page.locator('.jlpt-badge')).toContainText('N4');
});

test('scheda grammatica 〜てみる: regole d\'uso della forma composta', async ({ page }) => {
	await gotoHome(page);
	await page.goto('/detail/grammar:grammar-api-N4-65');
	await expect(page.getByText('Regole d\'uso — si attacca a')).toBeVisible({ timeout: 15_000 });
	await expect(page.getByText(/regola: Forma て/)).toBeVisible();
	await expect(page.getByRole('link', { name: /Scheda completa in Forme composte/ })).toBeVisible();
});

test('iikae: una serie di 10 round arriva al risultato', async ({ page }) => {
	await gotoHome(page);
	await page.goto('/iikae');
	await page.getByRole('button', { name: 'Tutti' }).click();
	for (let i = 0; i < 10; i += 1) {
		await expect(page.getByText(new RegExp(`${i + 1} / 10`))).toBeVisible();
		await page.locator('.choice').first().click();
		await page.getByRole('button', { name: /Avanti|Risultato/ }).click();
	}
	await expect(page.getByText(/\d+ \/ 10/)).toBeVisible();
	await expect(page.getByRole('button', { name: /Un'altra serie/ })).toBeVisible();
});
