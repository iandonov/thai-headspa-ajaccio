import { test, expect, type Page } from '@playwright/test';
import { ymd } from './helpers';

// Walk the calendar's selectable days until one returns bookable time slots
// (a day can be a working day yet still closed, e.g. a public holiday).
async function pickFirstDayWithSlots(page: Page) {
	const days = page.getByRole('button', { name: /^\d{1,2}$/, disabled: false });
	const slot = page.getByRole('button', { name: /^\d{1,2}:\d{2}$/, disabled: false }).first();

	const count = await days.count();
	for (let i = 0; i < count; i++) {
		await days.nth(i).click();
		try {
			await slot.waitFor({ state: 'visible', timeout: 4000 });
			return slot;
		} catch {
			// no slots this day — try the next selectable date
		}
	}
	throw new Error('No bookable slot found in the visible calendar months');
}

test('guest can complete a booking end-to-end', async ({ page }) => {
	await page.goto('/reservation');

	// Step 1 — choose a service. Retry the (client-side) selection until the
	// "next" button enables, in case the first click lands before hydration.
	const serviceBtn = page.locator('button', { hasText: 'Réflexologie Pieds & Mains' }).first();
	const nextBtn = page.getByRole('button', { name: /Choisir un créneau/ });
	await expect(async () => {
		await serviceBtn.click();
		await expect(nextBtn).toBeEnabled({ timeout: 1000 });
	}).toPass({ timeout: 15_000 });
	await nextBtn.click();

	// Step 2 — pick a date that has slots, then a slot.
	await expect(page.getByRole('heading', { name: 'Choisissez une date' })).toBeVisible();
	const slot = await pickFirstDayWithSlots(page);
	await slot.click();
	await page.getByRole('button', { name: /Continuer/ }).click();

	// Step 3 — guest details + confirm.
	await expect(page.getByRole('heading', { name: 'Vos coordonnées' })).toBeVisible();
	await page.locator('#guest-name').fill('Marie Testeur');
	await page.locator('#guest-email').fill('marie.testeur@example.com');
	await page.getByRole('button', { name: 'Confirmer la réservation' }).click();

	await expect(page).toHaveURL(/\/reservation\/confirmation/);
	await expect(page.getByRole('heading', { name: /Demande Envoyée/ })).toBeVisible();
});

test('slots API respects holidays and working days', async ({ request }) => {
	const nextYear = new Date().getFullYear() + 1;

	// Christmas is a seeded French public holiday → closed, no slots.
	const xmas = `${nextYear}-12-25`;
	const holidayRes = await request.get(`/api/slots?date=${xmas}&serviceId=1`);
	expect(holidayRes.ok()).toBeTruthy();
	const holiday = await holidayRes.json();
	expect(holiday.closed).toBe(true);
	expect(holiday.slots).toEqual([]);

	// The next Tuesday is a weekly working day → returns bookable slots.
	const d = new Date();
	d.setDate(d.getDate() + (((2 - d.getDay() + 7) % 7) || 7));
	const tuesdayRes = await request.get(`/api/slots?date=${ymd(d)}&serviceId=1`);
	const tuesday = await tuesdayRes.json();
	expect(tuesday.closed).toBeFalsy();
	expect(Array.isArray(tuesday.slots)).toBe(true);
	expect(tuesday.slots.length).toBeGreaterThan(0);
});
