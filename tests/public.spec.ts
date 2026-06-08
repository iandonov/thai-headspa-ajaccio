import { test, expect } from '@playwright/test';

test.describe('Public site', () => {
	test('home page renders hero and reservation CTA', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveTitle(/Thai Head Spa/);
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Réserver un Soin' }).first()).toBeVisible();
	});

	test('services page lists prestations', async ({ page }) => {
		await page.goto('/services');
		await expect(page.getByRole('heading', { name: 'Soins & Massages' })).toBeVisible();
		// A seeded base prestation and a formule should both be shown.
		await expect(page.getByText('Réflexologie Pieds & Mains').first()).toBeVisible();
		await expect(page.getByText('Nos Formules').first()).toBeVisible();
	});

	test('home CTA navigates to the reservation flow', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('link', { name: 'Réserver un Soin' }).first().click();
		await expect(page).toHaveURL(/\/reservation/);
		await expect(page.getByRole('heading', { name: 'Choisissez votre soin' })).toBeVisible();
	});

	test('main navigation links work', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('link', { name: 'Contact', exact: true }).first().click();
		await expect(page).toHaveURL(/\/contact/);
	});
});
