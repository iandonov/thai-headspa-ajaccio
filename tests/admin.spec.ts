import { test, expect, type Page } from '@playwright/test';
import { ADMIN_STATE } from './helpers';

// All tests in this file run as the authenticated admin.
test.use({ storageState: ADMIN_STATE });

// The admin pages toggle forms with client-side handlers. On a freshly loaded
// (heavy) page a click can land before Svelte hydration attaches the handler,
// so it's lost. Retry the toggle until the target form actually appears — the
// guard avoids double-toggling once it's open.
async function openToggleForm(page: Page, toggleName: RegExp, fieldSelector: string) {
	const toggle = page.getByRole('button', { name: toggleName });
	const field = page.locator(fieldSelector);
	await expect(async () => {
		if (!(await field.isVisible())) await toggle.click();
		await expect(field).toBeVisible({ timeout: 1000 });
	}).toPass({ timeout: 15_000 });
}

test.describe('Admin · services', () => {
	test('services are split into base prestations and formules', async ({ page }) => {
		await page.goto('/admin/services');
		await expect(page.getByRole('heading', { name: 'Prestations à la carte' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Formules', exact: true })).toBeVisible();
	});

	test('admin can add a new base prestation with a bed count', async ({ page }) => {
		await page.goto('/admin/services');
		const name = `Soin Test ${Date.now()}`;

		await openToggleForm(page, /Nouvelle prestation/, '#nb-name');
		await page.locator('#nb-name').fill(name);
		await page.locator('#nb-beds').fill('2');
		await page.locator('#nb-duration').fill('45');
		await page.locator('#nb-price').fill('40');
		await page.getByRole('button', { name: /Créer la prestation/ }).click();

		// The new prestation appears in the list (rendered as its own heading).
		await expect(page.getByRole('heading', { name })).toBeVisible();
	});
});

test.describe('Admin · disponibilités', () => {
	test('admin can update bed capacity', async ({ page }) => {
		await page.goto('/admin/disponibilites');
		const capacity = page.locator('section').filter({ hasText: 'Capacité' });

		await capacity.locator('#total-beds').fill('4');
		await capacity.getByRole('button', { name: 'Sauvegarder' }).click();
		await page.waitForLoadState('networkidle');

		// Re-load fresh and confirm the new capacity was persisted.
		await page.goto('/admin/disponibilites');
		await expect(page.locator('#total-beds')).toHaveValue('4');
	});

	test('calendar shows holidays and lets admin close an open day', async ({ page }) => {
		await page.goto('/admin/disponibilites');
		const calendar = page.locator('section').filter({ hasText: 'Calendrier des fermetures' });
		await expect(calendar).toBeVisible();

		// Closing an open day removes it from the set of "Ouvert" cells.
		const openDays = calendar.getByRole('button').filter({ hasText: 'Ouvert' });
		await expect(openDays.first()).toBeVisible();
		const before = await openDays.count();
		expect(before).toBeGreaterThan(0);

		await openDays.first().click();
		await expect(openDays).toHaveCount(before - 1);
	});

	test('weekly schedule lists the seeded working days', async ({ page }) => {
		await page.goto('/admin/disponibilites');
		await expect(page.getByRole('heading', { name: 'Horaires hebdomadaires' })).toBeVisible();
		// Seeded availability includes Tuesday → Saturday (rendered as day labels).
		await expect(page.getByText('Mardi', { exact: true })).toBeVisible();
		await expect(page.getByText('Samedi', { exact: true })).toBeVisible();
	});
});
