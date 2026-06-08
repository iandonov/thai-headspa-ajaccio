// Shared constants for the Playwright e2e suite.
// Imported by playwright.config.ts (to configure the dev server) and the specs.

// Isolated database for tests — keeps e2e runs from touching the dev `spa.db`.
// (`*.db` is gitignored; the `/e2e` dir is too.)
export const DB_PATH = 'e2e/test.db';

// Fixed secret so tokens are stable across the run.
export const JWT_SECRET = 'e2e-test-secret';

// Seeded admin account (created in auth.setup.ts).
export const ADMIN = { email: 'e2e-admin@test.local', password: 'adminpass123' };

// Where the authenticated admin storage state is saved.
export const ADMIN_STATE = 'tests/.auth/admin.json';

// Local YYYY-MM-DD (avoids UTC drift), matching how the app formats dates.
export function ymd(d: Date): string {
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
