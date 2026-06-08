import { defineConfig, devices } from '@playwright/test';
import { DB_PATH, JWT_SECRET } from './tests/helpers';

const PORT = 4173;

export default defineConfig({
	testDir: './tests',
	// The suite mutates a single shared SQLite DB, so keep it sequential.
	fullyParallel: false,
	workers: 1,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL: `http://localhost:${PORT}`,
		trace: 'on-first-retry',
	},
	projects: [
		// Creates the admin user and saves its authenticated storage state.
		{ name: 'setup', testMatch: /auth\.setup\.ts/ },
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
			dependencies: ['setup'],
			testIgnore: /auth\.setup\.ts/,
		},
	],
	// Run the SvelteKit dev server against an isolated, auto-seeded test DB.
	webServer: {
		command: `npm run dev -- --port ${PORT} --strictPort`,
		url: `http://localhost:${PORT}`,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
		env: {
			DATABASE_PATH: DB_PATH,
			JWT_SECRET,
		},
	},
});
