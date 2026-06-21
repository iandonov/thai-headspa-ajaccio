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
		// ('Nos Formules' also exists as a hidden nav-submenu link, so target the heading.)
		await expect(page.getByText('Réflexologie Pieds & Mains').first()).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Nos Formules' })).toBeVisible();
	});

	test('category pills filter the services page', async ({ page }) => {
		await page.goto('/services');
		await page.getByRole('link', { name: 'Head Spa', exact: true }).click();
		await expect(page).toHaveURL(/\/services\?categorie=head-spa/);
		// Only the Head Spa section remains; the formules section is filtered out.
		// (level 2 = the category heading; a service card h3 is also named 'Head Spa')
		await expect(page.getByRole('heading', { name: 'Head Spa', exact: true, level: 2 })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Nos Formules', level: 2 })).not.toBeVisible();
	});

	test('home CTA navigates to the soin catalogue (booking now starts there)', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('link', { name: 'Réserver un Soin' }).first().click();
		await expect(page).toHaveURL(/\/services/);
		await expect(page.getByRole('heading', { name: 'Soins & Massages' })).toBeVisible();
	});

	test('main navigation links work', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('link', { name: 'Contact', exact: true }).first().click();
		await expect(page).toHaveURL(/\/contact/);
	});
});
