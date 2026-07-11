import { defineConfig } from '@playwright/test';

// Smoke E2E: avvia il dev server su una porta dedicata (non disturba il 5173
// di lavoro) e prova i percorsi chiave nel browser vero. `npm run test:e2e`.
export default defineConfig({
	testDir: 'e2e',
	timeout: 60_000,
	retries: 0,
	use: {
		baseURL: 'http://localhost:5175',
		trace: 'retain-on-failure'
	},
	webServer: {
		command: 'npm run dev -- --port 5175 --strictPort',
		url: 'http://localhost:5175',
		reuseExistingServer: true,
		timeout: 60_000
	}
});
