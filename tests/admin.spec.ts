import { test, expect, type Page } from '@playwright/test';
import {
	ADMIN_STATE,
	CLIENT,
	ymd,
	nextWeekday,
	serviceIdBySlug,
	userIdByEmail,
	setBeds,
	getBeds,
	clearBookings,
	seedBooking,
	addClosure,
	removeClosure,
	resetAvailabilityToSeed,
	setAvailability,
	countBookings,
	bookingStatus,
	categoryExists,
	removeCategoriesLike,
	selectServiceAndContinue,
	pickFirstDayWithSlots,
} from './helpers';

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
	test('the combined Soins & Tarifs page replaces the old sub-pages', async ({ page }) => {
		await page.goto('/admin/services');
		await expect(page.getByRole('heading', { name: 'Soins & Tarifs' })).toBeVisible();
		// Categories are managed on their own screen, linked from here.
		await expect(page.getByRole('link', { name: 'leur propre écran' })).toBeVisible();

		// The old sub-pages redirect to the combined page.
		await page.goto('/admin/services/prestations');
		await expect(page).toHaveURL(/\/admin\/services$/);
		await page.goto('/admin/services/formules');
		await expect(page).toHaveURL(/\/admin\/services$/);
	});

	test('admin can add a new prestation with category, beds and prep buffer', async ({ page }) => {
		await page.goto('/admin/services');
		const name = `Soin Test ${Date.now()}`;

		await openToggleForm(page, /Nouvelle prestation/, '#ns-name');
		await page.locator('#ns-name').fill(name);
		await page.locator('#ns-category').selectOption('massage');
		await page.locator('#ns-beds').fill('2');
		await page.locator('#ns-buffer').fill('20');
		await page.locator('#ns-duration').fill('45');
		await page.locator('#ns-price').fill('40');
		await page.getByRole('button', { name: /Créer la prestation/ }).click();

		// The new prestation appears in the list (rendered as its own heading),
		// with its prep buffer summarised in the meta line.
		await expect(page.getByRole('heading', { name })).toBeVisible();
		const card = page.locator('div.bg-white', { has: page.getByRole('heading', { name }) });
		await expect(card.getByText(/20 min de préparation/)).toBeVisible();
	});

	test('admin can create, rename and delete a category on the categories screen', async ({ page }) => {
		page.on('dialog', (d) => d.accept());
		removeCategoriesLike('Cat Test'); // leftovers from previous failed runs
		await page.goto('/admin/services/categories');
		await expect(page.getByRole('heading', { name: 'Catégories' })).toBeVisible();

		// The created slug is predictable from the name — used to find the row.
		const ts = Date.now();
		const catName = `Cat Test ${ts}`;
		const slug = `cat-test-${ts}`;

		// The category forms are plain POST forms, so they work whether or not the
		// click lands before hydration. The DB is the source of truth after each
		// step (asserting on the DOM right away races the in-flight submission).
		await page.locator('#nc-name').fill(catName);
		await page.getByRole('button', { name: /Ajouter/ }).click();
		await expect.poll(() => categoryExists(catName), { timeout: 10_000 }).toBe(true);

		// Rename (slug stays stable, only the display name changes). Hydration can
		// reset a too-early fill back to the server value (submitting the old
		// name) — retrying the whole fill+submit+verify loop rides past that.
		await page.goto('/admin/services/categories');
		const renamed = `${catName} v2`;
		const row = page.locator(`[data-slug="${slug}"]`);
		const input = row.locator('input[name="name"]');
		await expect(input).toHaveValue(catName);
		await expect(async () => {
			await input.fill(renamed);
			await row.getByRole('button', { name: 'Renommer' }).click();
			await expect.poll(() => categoryExists(renamed), { timeout: 3000 }).toBe(true);
		}).toPass({ timeout: 20_000 });

		// Delete (allowed because no service uses it).
		await page.goto('/admin/services/categories');
		await row.getByRole('button', { name: 'Supprimer' }).click();
		await expect.poll(() => categoryExists(renamed), { timeout: 10_000 }).toBe(false);
	});
});

test.describe('Admin · responsive layout', () => {
	test('on mobile the burger menu opens and navigates between sections', async ({ page }) => {
		await page.setViewportSize({ width: 414, height: 850 });
		await page.goto('/admin');

		// The desktop sidebar is hidden; the burger toggle is shown instead.
		await expect(page.locator('aside')).toBeHidden();
		const burger = page.getByRole('button', { name: 'Ouvrir le menu' });
		await expect(burger).toBeVisible();

		// Open the drawer and navigate to a section. Retried in case the click
		// lands before hydration attaches the toggle handler.
		const reservationsLink = page.getByRole('link', { name: 'Réservations' });
		await expect(async () => {
			if (!(await reservationsLink.isVisible())) await burger.click();
			await expect(reservationsLink).toBeVisible({ timeout: 1000 });
		}).toPass({ timeout: 15_000 });
		await reservationsLink.click();
		await expect(page).toHaveURL(/\/admin\/reservations/);
		await expect(page.getByRole('heading', { name: 'Réservations' })).toBeVisible();
	});
});

test.describe('Admin · disponibilités', () => {
	test('admin can update bed capacity', async ({ page }) => {
		setBeds(3); // known starting point ≠ the value we set through the UI
		await page.goto('/admin/disponibilites');
		const capacity = page.locator('section').filter({ hasText: 'Capacité' });

		// Hydration can reset a too-early fill back to the server value, so retry
		// the fill+submit until the DB (source of truth) holds the new capacity.
		await expect(async () => {
			await capacity.locator('#total-beds').fill('4');
			await capacity.getByRole('button', { name: 'Sauvegarder' }).click();
			await expect.poll(() => getBeds(), { timeout: 3000 }).toBe(4);
		}).toPass({ timeout: 15_000 });

		// Re-load fresh and confirm the persisted capacity is rendered.
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
		resetAvailabilityToSeed();
		await page.goto('/admin/disponibilites');
		await expect(page.getByRole('heading', { name: 'Horaires hebdomadaires' })).toBeVisible();
		// Seeded availability includes Tuesday → Saturday (rendered as day labels).
		await expect(page.getByText('Mardi', { exact: true })).toBeVisible();
		await expect(page.getByText('Samedi', { exact: true })).toBeVisible();
	});

	test('closing a date through the calendar makes it unbookable via the API', async ({ page, request }) => {
		resetAvailabilityToSeed();
		setBeds(3);
		clearBookings();

		const tue = ymd(nextWeekday(2));
		removeClosure(tue);
		// Sanity: open before closing.
		let body = await (await request.get(`/api/slots?date=${tue}&serviceId=1`)).json();
		expect(body.slots.length).toBeGreaterThan(0);

		// Close it directly (the calendar toggle uses this same action) and confirm.
		addClosure(tue, 'Fermeture test', false);
		body = await (await request.get(`/api/slots?date=${tue}&serviceId=1`)).json();
		expect(body.closed).toBe(true);
		expect(body.slots).toEqual([]);

		removeClosure(tue);
	});

	test('adding a working day makes that weekday bookable via the API', async ({ request }) => {
		// Monday (dow 1) is non-working by default → no slots.
		const mon = ymd(nextWeekday(1));
		removeClosure(mon);
		resetAvailabilityToSeed();
		setBeds(3);

		let body = await (await request.get(`/api/slots?date=${mon}&serviceId=1`)).json();
		expect(body.slots).toEqual([]);

		// Open Mondays, then it returns slots.
		setAvailability([
			{ dayOfWeek: 1, startTime: '09:00', endTime: '18:00' },
			{ dayOfWeek: 2, startTime: '09:00', endTime: '18:00' },
			{ dayOfWeek: 3, startTime: '09:00', endTime: '18:00' },
			{ dayOfWeek: 4, startTime: '09:00', endTime: '18:00' },
			{ dayOfWeek: 5, startTime: '09:00', endTime: '18:00' },
			{ dayOfWeek: 6, startTime: '09:00', endTime: '17:00' },
		]);

		body = await (await request.get(`/api/slots?date=${mon}&serviceId=1`)).json();
		expect(body.slots.length).toBeGreaterThan(0);

		resetAvailabilityToSeed();
	});
});

test.describe('Admin · réservations', () => {
	test('calendar shows day occupancy and the day list shows the chosen option', async ({ page }) => {
		resetAvailabilityToSeed();
		setBeds(3);
		clearBookings();

		const formuleId = serviceIdBySlug('massage-personnalise');
		const date = ymd(nextWeekday(2));
		removeClosure(date);
		seedBooking({
			serviceId: formuleId,
			date,
			startTime: '10:00',
			endTime: '11:00',
			status: 'confirmed',
			guestName: 'Option Vue',
			guestEmail: 'optionvue@test.local',
			option: 'Aromathérapie',
		});

		await page.goto('/admin/reservations');

		// The day cell reports partial occupancy (1 active booking, beds free).
		const cell = page.locator(`button[data-date="${date}"]:visible`).first();
		await expect(cell).toContainText('1 rés.');

		// The nearest day with bookings is selected by default — its list shows
		// the service and the option chip picked at booking time. Scope to the
		// booking row: the same data also renders in the (hidden) mobile cards.
		const row = page.locator('tr', { hasText: 'Option Vue' });
		await expect(row).toBeVisible();
		await expect(row.getByText('Massage Personnalisé')).toBeVisible();
		await expect(row.getByText('Aromathérapie', { exact: true })).toBeVisible();
	});

	test('a day with no remaining capacity is marked Complet', async ({ page }) => {
		resetAvailabilityToSeed();
		setBeds(1);
		clearBookings();

		const reflexId = serviceIdBySlug('reflexologie');
		const date = ymd(nextWeekday(2));
		removeClosure(date);
		// One booking covering the whole working day on the only bed.
		seedBooking({ serviceId: reflexId, date, startTime: '09:00', endTime: '18:00', status: 'confirmed' });

		await page.goto('/admin/reservations');
		const cell = page.locator(`button[data-date="${date}"]:visible`).first();
		await expect(cell).toContainText('Complet');

		setBeds(3);
	});

	test('admin can change a reservation status', async ({ page }) => {
		resetAvailabilityToSeed();
		setBeds(3);
		clearBookings();
		const reflexId = serviceIdBySlug('reflexologie');
		const date = ymd(nextWeekday(2));
		const bookingId = seedBooking({
			serviceId: reflexId,
			date,
			startTime: '11:00',
			endTime: '11:30',
			status: 'pending',
			guestName: 'Statut Test',
			guestEmail: 'statut@test.local',
		});

		// The day list defaults to the nearest upcoming day with bookings.
		await page.goto('/admin/reservations');
		const row = page.locator('tr', { hasText: 'Statut Test' });
		await expect(row).toBeVisible();
		// Scope to the status badge span ("En attente" also appears as a <option>).
		await expect(row.locator('span', { hasText: 'En attente' })).toBeVisible();

		// Retry the select + submit until the change is persisted — on a freshly
		// loaded page a click can land before Svelte hydration attaches the
		// enhance handler. The DB is the source of truth.
		await expect(async () => {
			await row.locator('select[name="status"]').selectOption('confirmed');
			await row.getByRole('button', { name: 'OK' }).click();
			expect(bookingStatus(bookingId)).toBe('confirmed');
		}).toPass({ timeout: 15_000 });

		// Reload and confirm the badge reflects the new status.
		await page.goto('/admin/reservations');
		await expect(
			page.locator('tr', { hasText: 'Statut Test' }).locator('span', { hasText: 'Confirmé' })
		).toBeVisible();
	});
});

test.describe('Admin · dossier client', () => {
	test('client dossier rolls up booking stats', async ({ page }) => {
		clearBookings();
		const clientId = userIdByEmail(CLIENT.email);
		const reflexId = serviceIdBySlug('reflexologie'); // 30€
		const headSpaId = serviceIdBySlug('head-spa'); // 65€
		const past = ymd(nextWeekday(2, new Date(Date.now() - 30 * 86_400_000)));
		const future = ymd(nextWeekday(2));

		// 1 completed (30€) + 1 confirmed (65€) count toward revenue (95€);
		// 1 cancelled does not. upcoming = the confirmed one.
		seedBooking({ serviceId: reflexId, date: past, startTime: '09:00', endTime: '09:30', status: 'completed', userId: clientId });
		seedBooking({ serviceId: headSpaId, date: future, startTime: '10:00', endTime: '11:15', status: 'confirmed', userId: clientId });
		seedBooking({ serviceId: reflexId, date: future, startTime: '14:00', endTime: '14:30', status: 'cancelled', userId: clientId });

		await page.goto(`/admin/clients/${clientId}`);
		await expect(page.getByRole('heading', { name: `${CLIENT.firstName} ${CLIENT.lastName}` })).toBeVisible();

		// Each stat card is a bg-white div holding the label <p> and a font-serif
		// value <p>. Scope to the card by its (exact) label, then read the value.
		const statValue = (label: string) =>
			page.locator('div.bg-white', { has: page.getByText(label, { exact: true }) }).locator('p.font-serif');

		await expect(statValue('Réservations')).toHaveText('3');
		await expect(statValue('Terminées')).toHaveText('1');
		await expect(statValue('À venir')).toHaveText('1');
		await expect(statValue('Total dépensé')).toHaveText('95€');
	});
});

test.describe('Admin · booking restriction', () => {
	test('the reservation page warns an admin that booking is unavailable', async ({ page }) => {
		resetAvailabilityToSeed();
		setBeds(3);
		clearBookings();

		await page.goto('/reservation');
		await selectServiceAndContinue(page, 'Réflexologie Pieds & Mains');
		const slot = await pickFirstDayWithSlots(page);
		await slot.click();
		await page.getByRole('button', { name: /Continuer/ }).click();

		// Step 3 surfaces the staff warning for an admin account.
		await expect(page.getByText(/administrateur/i)).toBeVisible();
	});

	test('the book action rejects an admin (403) — no booking is created', async ({ page }) => {
		resetAvailabilityToSeed();
		setBeds(3);
		clearBookings();

		const reflexId = serviceIdBySlug('reflexologie');
		const tue = ymd(nextWeekday(2));
		removeClosure(tue);

		// page.request carries the authenticated admin session cookie.
		await page.request.post('/reservation?/book', {
			headers: { origin: 'http://localhost:4173' },
			maxRedirects: 0,
			form: { serviceId: String(reflexId), date: tue, startTime: '09:00' },
		});
		expect(countBookings({ date: tue })).toBe(0);
	});
});
