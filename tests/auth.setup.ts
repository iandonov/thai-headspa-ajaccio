import { test as setup, expect } from '@playwright/test';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { ADMIN, ADMIN_STATE, CLIENT, CLIENT_STATE, DB_PATH } from './helpers';

// Upsert a user with a known password hash and role, returning nothing.
function upsertUser(
	db: Database.Database,
	u: { email: string; password: string; firstName: string; lastName: string; role: 'admin' | 'client' }
) {
	const hash = bcrypt.hashSync(u.password, 12);
	const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(u.email) as
		| { id: number }
		| undefined;
	if (existing) {
		db.prepare('UPDATE users SET role=?, password_hash=?, first_name=?, last_name=? WHERE id=?').run(
			u.role,
			hash,
			u.firstName,
			u.lastName,
			existing.id
		);
	} else {
		db.prepare(
			'INSERT INTO users (email,password_hash,first_name,last_name,role,created_at) VALUES (?,?,?,?,?,?)'
		).run(u.email, hash, u.firstName, u.lastName, u.role, Date.now());
	}
}

// The webServer readiness probe (GET /) has already run initDatabase(), so the
// schema + seed data exist by the time this runs. We add an admin + a client
// account, then log each in through the UI and persist their sessions.
setup('create accounts and authenticate', async ({ browser }) => {
	const db = new Database(DB_PATH);
	upsertUser(db, { ...ADMIN, firstName: 'E2E', lastName: 'Admin', role: 'admin' });
	upsertUser(db, { ...CLIENT, role: 'client' });
	db.close();

	mkdirSync(dirname(ADMIN_STATE), { recursive: true });

	// Admin → /admin dashboard.
	const adminCtx = await browser.newContext();
	const adminPage = await adminCtx.newPage();
	await adminPage.goto('/connexion');
	await adminPage.locator('#email').fill(ADMIN.email);
	await adminPage.locator('#password').fill(ADMIN.password);
	await adminPage.getByRole('button', { name: 'Se connecter' }).click();
	await adminPage.waitForURL('**/admin');
	await expect(adminPage.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();
	await adminCtx.storageState({ path: ADMIN_STATE });
	await adminCtx.close();

	// Client → /compte.
	const clientCtx = await browser.newContext();
	const clientPage = await clientCtx.newPage();
	await clientPage.goto('/connexion');
	await clientPage.locator('#email').fill(CLIENT.email);
	await clientPage.locator('#password').fill(CLIENT.password);
	await clientPage.getByRole('button', { name: 'Se connecter' }).click();
	await clientPage.waitForURL('**/compte');
	await clientCtx.storageState({ path: CLIENT_STATE });
	await clientCtx.close();
});
