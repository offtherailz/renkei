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
