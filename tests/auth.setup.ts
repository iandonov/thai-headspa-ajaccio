import { test as setup, expect } from '@playwright/test';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { ADMIN, ADMIN_STATE, DB_PATH } from './helpers';

// The webServer readiness probe (GET /) has already run initDatabase(), so the
// schema + seed data exist by the time this runs. We just add an admin account,
// then log in through the UI and persist the session for the admin specs.
setup('create admin and authenticate', async ({ page }) => {
	const db = new Database(DB_PATH);
	const hash = bcrypt.hashSync(ADMIN.password, 12);
	const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(ADMIN.email) as
		| { id: number }
		| undefined;
	if (existing) {
		db.prepare("UPDATE users SET role='admin', password_hash=? WHERE id=?").run(hash, existing.id);
	} else {
		db.prepare(
			'INSERT INTO users (email,password_hash,first_name,last_name,role,created_at) VALUES (?,?,?,?,?,?)'
		).run(ADMIN.email, hash, 'E2E', 'Admin', 'admin', Date.now());
	}
	db.close();

	await page.goto('/connexion');
	await page.locator('#email').fill(ADMIN.email);
	await page.locator('#password').fill(ADMIN.password);
	await page.getByRole('button', { name: 'Se connecter' }).click();

	await page.waitForURL('**/admin');
	await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();

	mkdirSync(dirname(ADMIN_STATE), { recursive: true });
	await page.context().storageState({ path: ADMIN_STATE });
});
