import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		// gli E2E in e2e/ sono di Playwright (npm run test:e2e), non di vitest
		exclude: ['e2e/**', 'node_modules/**']
	}
});
