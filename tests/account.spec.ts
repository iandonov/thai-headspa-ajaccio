import { test, expect } from '@playwright/test';
import {
	setBeds,
	clearBookings,
	resetAvailabilityToSeed,
	selectServiceAndContinue,
	pickFirstDayWithSlots,
} from './helpers';

// Full client journey: create an account, book a soin, see it tracked on the
// account page, then cancel it and confirm the status flips to "Annulé".
test('register → book → track → cancel', async ({ page }) => {
	resetAvailabilityToSeed();
	setBeds(3);
	clearBookings();

	const email = `journey_${Date.now()}@example.com`;

	// 1. Register — lands authenticated on /compte.
	await page.goto('/inscription');
	await page.locator('#firstName').fill('Parcours');
	await page.locator('#lastName').fill('Complet');
	await page.locator('#email').fill(email);
	await page.locator('#password').fill('motdepasse123');
	await page.getByRole('button', { name: 'Créer mon compte' }).click();
	await expect(page).toHaveURL(/\/compte/);

	// 2. Book a soin. As an authenticated client the details step is pre-filled,
	// so we confirm directly.
	await page.goto('/reservation');
	await selectServiceAndContinue(page, 'Réflexologie Pieds & Mains');
	const slot = await pickFirstDayWithSlots(page);
	await slot.click();
	await page.getByRole('button', { name: /Continuer/ }).click();
	await expect(page.getByText(/Réservation pour/)).toBeVisible();
	await page.getByRole('button', { name: 'Confirmer la réservation' }).click();
	await expect(page).toHaveURL(/\/reservation\/confirmation/);

	// 3. Track — the booking shows under "Rendez-vous à venir".
	await page.goto('/compte');
	const upcoming = page.getByRole('heading', { name: /Rendez-vous à venir/ });
	await expect(upcoming).toBeVisible();
	await expect(page.getByText('Réflexologie Pieds & Mains').first()).toBeVisible();

	// 4. Cancel — accept the confirm() dialog, then the booking lands in history
	// as "Annulé".
	page.on('dialog', (d) => d.accept());
	await page.getByRole('button', { name: 'Annuler', exact: true }).first().click();
	await expect(page.getByText('Annulé').first()).toBeVisible();
});

test('account page is gated behind authentication', async ({ page }) => {
	await page.goto('/compte');
	await expect(page).toHaveURL(/\/connexion/);
});
