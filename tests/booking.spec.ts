import { test, expect } from '@playwright/test';
import {
	ymd,
	nextWeekday,
	serviceIdBySlug,
	setBeds,
	setServiceBuffer,
	clearBookings,
	seedBooking,
	addClosure,
	removeClosure,
	resetAvailabilityToSeed,
	countBookings,
	lastBookingOption,
	selectServiceAndContinue,
	pickFirstDayWithSlots,
} from './helpers';

test('guest can complete a booking end-to-end', async ({ page }) => {
	// Ensure the standard schedule and free capacity for a clean happy path.
	resetAvailabilityToSeed();
	setBeds(3);
	clearBookings();

	await page.goto('/reservation');

	await selectServiceAndContinue(page, 'Réflexologie Pieds & Mains');

	await expect(page.getByRole('heading', { name: 'Choisissez une date' })).toBeVisible();
	const slot = await pickFirstDayWithSlots(page);
	await slot.click();
	await page.getByRole('button', { name: /Continuer/ }).click();

	await expect(page.getByRole('heading', { name: 'Vos coordonnées' })).toBeVisible();
	await page.locator('#guest-name').fill('Marie Testeur');
	await page.locator('#guest-email').fill('marie.testeur@example.com');
	await page.getByRole('button', { name: 'Confirmer la réservation' }).click();

	await expect(page).toHaveURL(/\/reservation\/confirmation/);
	await expect(page.getByRole('heading', { name: /Demande Envoyée/ })).toBeVisible();
});

test('a selected option chip is stored on the booking', async ({ page }) => {
	resetAvailabilityToSeed();
	setBeds(3);
	clearBookings();

	await page.goto('/reservation');

	// Picking a service jumps to the date step with every option preselected;
	// options are toggled in the step-2 recap (each is an aria-pressed button).
	await selectServiceAndContinue(page, 'Massage Personnalisé');

	const chips = page.locator('button[aria-pressed]');
	await expect(chips.first()).toBeVisible();
	for (const chip of await chips.all()) {
		await expect(chip).toHaveAttribute('aria-pressed', 'true');
	}

	// Deselect every option except Aromathérapie.
	for (const chip of await chips.all()) {
		if ((await chip.textContent())?.trim() !== 'Aromathérapie') await chip.click();
	}
	await expect(chips.filter({ hasText: 'Aromathérapie' })).toHaveAttribute('aria-pressed', 'true');

	const slot = await pickFirstDayWithSlots(page);
	await slot.click();
	await page.getByRole('button', { name: /Continuer/ }).click();

	// The recap lists the chosen option.
	await expect(page.getByText('Option', { exact: true })).toBeVisible();
	await expect(page.getByText('Aromathérapie', { exact: true })).toBeVisible();

	await page.locator('#guest-name').fill('Option Testeur');
	await page.locator('#guest-email').fill('option.testeur@example.com');
	await page.getByRole('button', { name: 'Confirmer la réservation' }).click();
	await expect(page).toHaveURL(/\/reservation\/confirmation/);

	expect(lastBookingOption()).toBe('Aromathérapie');
});

test.describe('slots API — working days, holidays, non-working days', () => {
	test('a seeded public holiday is closed with no slots', async ({ request }) => {
		const nextYear = new Date().getFullYear() + 1;
		const xmas = `${nextYear}-12-25`;
		const res = await request.get(`/api/slots?date=${xmas}&serviceId=1`);
		expect(res.ok()).toBeTruthy();
		const body = await res.json();
		expect(body.closed).toBe(true);
		expect(body.slots).toEqual([]);
	});

	test('a working day (Tuesday) returns bookable slots', async ({ request }) => {
		resetAvailabilityToSeed();
		setBeds(3);
		clearBookings();
		const tue = ymd(nextWeekday(2));
		removeClosure(tue); // guarantee it is open even if it lands on a holiday
		const res = await request.get(`/api/slots?date=${tue}&serviceId=1`);
		const body = await res.json();
		expect(body.closed).toBeFalsy();
		expect(Array.isArray(body.slots)).toBe(true);
		expect(body.slots.length).toBeGreaterThan(0);
		expect(body.slots.every((s: { available: boolean }) => s.available)).toBe(true);
	});

	test('a non-working day (Sunday) returns no slots and is not "closed"', async ({ request }) => {
		const sun = ymd(nextWeekday(0));
		removeClosure(sun);
		const res = await request.get(`/api/slots?date=${sun}&serviceId=1`);
		const body = await res.json();
		expect(body.closed).toBeFalsy(); // no closure row — just outside the weekly schedule
		expect(body.slots).toEqual([]);
	});
});

test.describe('slots API — bed capacity', () => {
	test('an existing booking removes only the overlapping slots when beds=1', async ({ request }) => {
		resetAvailabilityToSeed();
		setBeds(1);
		clearBookings();

		const reflexId = serviceIdBySlug('reflexologie'); // 30-min, 1 bed
		const tue = ymd(nextWeekday(2));
		removeClosure(tue);
		// Occupy 10:00–10:30.
		seedBooking({ serviceId: reflexId, date: tue, startTime: '10:00', endTime: '10:30', status: 'confirmed' });

		const res = await request.get(`/api/slots?date=${tue}&serviceId=${reflexId}`);
		const slots: { time: string; available: boolean }[] = (await res.json()).slots;
		const byTime = Object.fromEntries(slots.map((s) => [s.time, s.available]));

		expect(byTime['09:30']).toBe(true); // 09:30–10:00 ends at booking start → free
		expect(byTime['10:00']).toBe(false); // overlaps the booking
		expect(byTime['10:30']).toBe(true); // starts when the booking ends → free
	});

	test('adding capacity frees a previously blocked slot', async ({ request }) => {
		resetAvailabilityToSeed();
		clearBookings();

		const reflexId = serviceIdBySlug('reflexologie');
		const tue = ymd(nextWeekday(2));
		removeClosure(tue);
		seedBooking({ serviceId: reflexId, date: tue, startTime: '10:00', endTime: '10:30', status: 'confirmed' });

		setBeds(1);
		let slots = (await (await request.get(`/api/slots?date=${tue}&serviceId=${reflexId}`)).json()).slots;
		expect(slots.find((s: { time: string }) => s.time === '10:00').available).toBe(false);

		setBeds(2);
		slots = (await (await request.get(`/api/slots?date=${tue}&serviceId=${reflexId}`)).json()).slots;
		expect(slots.find((s: { time: string }) => s.time === '10:00').available).toBe(true);
	});

	test('the prep buffer keeps the bed blocked between sessions', async ({ request }) => {
		resetAvailabilityToSeed();
		setBeds(1);
		clearBookings();

		const reflexId = serviceIdBySlug('reflexologie'); // 30-min service
		setServiceBuffer(reflexId, 30); // studio needs 30 min between clients
		const tue = ymd(nextWeekday(2));
		removeClosure(tue);
		// Occupy 10:00–10:30 (+ 30 min prep → bed blocked until 11:00).
		seedBooking({ serviceId: reflexId, date: tue, startTime: '10:00', endTime: '10:30', status: 'confirmed' });

		const res = await request.get(`/api/slots?date=${tue}&serviceId=${reflexId}`);
		const slots: { time: string; available: boolean }[] = (await res.json()).slots;
		const byTime = Object.fromEntries(slots.map((s) => [s.time, s.available]));

		expect(byTime['09:00']).toBe(true);  // 09:00–09:30 + prep ends exactly at 10:00 → free
		expect(byTime['09:30']).toBe(false); // its own prep (until 10:30) overlaps the booking
		expect(byTime['10:30']).toBe(false); // studio still being prepared after the booking
		expect(byTime['11:00']).toBe(true);  // prep done → free

		setServiceBuffer(reflexId, 0);
	});

	test('cancelled bookings do not consume a bed', async ({ request }) => {
		resetAvailabilityToSeed();
		setBeds(1);
		clearBookings();

		const reflexId = serviceIdBySlug('reflexologie');
		const tue = ymd(nextWeekday(2));
		removeClosure(tue);
		seedBooking({ serviceId: reflexId, date: tue, startTime: '10:00', endTime: '10:30', status: 'cancelled' });

		const slots = (await (await request.get(`/api/slots?date=${tue}&serviceId=${reflexId}`)).json()).slots;
		expect(slots.find((s: { time: string }) => s.time === '10:00').available).toBe(true);
	});
});

test.describe('booking action — server-side guards', () => {
	// SvelteKit re-renders the page on `fail(...)` (no new booking row) and
	// 30x-redirects to the confirmation page on success, so we assert the real
	// outcome via the bookings table. The first test is a positive control that
	// also proves the POST path (and CSRF origin) works.
	const ORIGIN_HEADER = { origin: 'http://localhost:4173' };

	test('a valid POST creates a booking (positive control)', async ({ request }) => {
		resetAvailabilityToSeed();
		setBeds(3);
		clearBookings();

		const reflexId = serviceIdBySlug('reflexologie');
		const tue = ymd(nextWeekday(2));
		removeClosure(tue);

		await request.post('/reservation?/book', {
			headers: ORIGIN_HEADER,
			maxRedirects: 0,
			form: {
				serviceId: String(reflexId),
				date: tue,
				startTime: '09:00',
				guestName: 'Positive Control',
				guestEmail: 'pos@test.local',
			},
		});
		// The booking row is the source of truth (a successful action redirects,
		// a rejected one re-renders — either way the table tells us what happened).
		expect(countBookings({ date: tue })).toBe(1);
	});

	test('rejects a booking on a closed (holiday) date', async ({ request }) => {
		clearBookings();
		const reflexId = serviceIdBySlug('reflexologie');
		const closed = ymd(nextWeekday(2));
		addClosure(closed, 'Fermeture test', false);

		await request.post('/reservation?/book', {
			headers: ORIGIN_HEADER,
			maxRedirects: 0,
			form: {
				serviceId: String(reflexId),
				date: closed,
				startTime: '10:00',
				guestName: 'Guard Test',
				guestEmail: 'guard@test.local',
			},
		});
		expect(countBookings({ date: closed })).toBe(0); // closure → no booking created
		removeClosure(closed);
	});

	test('rejects a booking when no bed is free', async ({ request }) => {
		resetAvailabilityToSeed();
		setBeds(1);
		clearBookings();

		const reflexId = serviceIdBySlug('reflexologie');
		const tue = ymd(nextWeekday(2));
		removeClosure(tue);
		seedBooking({ serviceId: reflexId, date: tue, startTime: '10:00', endTime: '10:30', status: 'confirmed' });

		await request.post('/reservation?/book', {
			headers: ORIGIN_HEADER,
			maxRedirects: 0,
			form: {
				serviceId: String(reflexId),
				date: tue,
				startTime: '10:00',
				guestName: 'Guard Test',
				guestEmail: 'guard@test.local',
			},
		});
		// Only the seeded booking remains — the conflicting attempt was rejected.
		expect(countBookings({ date: tue })).toBe(1);
	});
});
