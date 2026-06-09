import { defineConfig } from 'vitest/config';

// Kept separate from vite.config.ts so the SvelteKit build config stays clean
// and the two Vite versions don't clash on types. Unit tests use only relative
// imports (no $lib alias), so the SvelteKit plugin isn't needed here.
export default defineConfig({
	test: {
		// Vitest owns `*.test.ts` under src/; Playwright owns `*.spec.ts` under tests/.
		include: ['src/**/*.test.ts'],
		environment: 'node'
	}
});
