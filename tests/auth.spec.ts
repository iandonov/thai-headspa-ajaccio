import { test, expect } from '@playwright/test';
import { ADMIN } from './helpers';

test('a visitor can register a new account', async ({ page }) => {
	// Unique email per run so the registration always succeeds.
	const email = `client_${Date.now()}@example.com`;

	await page.goto('/inscription');
	await page.locator('#firstName').fill('Nouvelle');
	await page.locator('#lastName').fill('Cliente');
	await page.locator('#email').fill(email);
	await page.locator('#password').fill('motdepasse123');
	await page.getByRole('button', { name: 'Créer mon compte' }).click();

	// Successful sign-up sets the session and lands on the account page.
	await expect(page).toHaveURL(/\/compte/);
});

test('admin can log in and reach the dashboard', async ({ page }) => {
	await page.goto('/connexion');
	await page.locator('#email').fill(ADMIN.email);
	await page.locator('#password').fill(ADMIN.password);
	await page.getByRole('button', { name: 'Se connecter' }).click();

	await expect(page).toHaveURL(/\/admin/);
	await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();
});

test('login rejects bad credentials', async ({ page }) => {
	await page.goto('/connexion');
	await page.locator('#email').fill(ADMIN.email);
	await page.locator('#password').fill('wrong-password');
	await page.getByRole('button', { name: 'Se connecter' }).click();

	await expect(page.getByText('Email ou mot de passe incorrect.')).toBeVisible();
});

test('admin area is protected from anonymous visitors', async ({ page }) => {
	await page.goto('/admin');
	// The admin layout redirects unauthenticated users to the login page.
	await expect(page).toHaveURL(/\/connexion/);
});
