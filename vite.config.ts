import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		watch: {
			// The e2e suite points DATABASE_PATH at e2e/test.db inside the project.
			// Without this, every test's DB write trips the dev-server file watcher
			// and triggers an HMR reload, killing in-flight requests mid-test
			// ("network error") and causing intermittent, moving failures.
			ignored: ['**/e2e/**', '**/*.db', '**/*.db-wal', '**/*.db-shm', '**/spa.db*']
		}
	}
});
