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
