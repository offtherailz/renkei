import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			fallback: 'index.html'
		}),
		paths: {
			base: process.env.DEPLOY_BASE?.replace(/\/$/, '') ?? ''
		},
		serviceWorker: {
			// Registrato manualmente in +layout.svelte solo in produzione:
			// in dev il SW servirebbe la cache anche a server spento.
			register: false
		}
	}
};

export default config;
