// Shared constants + DB helpers for the Playwright e2e suite.
// Imported by playwright.config.ts (to configure the dev server) and the specs.

import Database from 'better-sqlite3';
import { expect, type Page } from '@playwright/test';

// Isolated database for tests — keeps e2e runs from touching the dev `spa.db`.
// (`*.db` is gitignored; the `/e2e` dir is too.)
export const DB_PATH = 'e2e/test.db';

// Fixed secret so tokens are stable across the run.
export const JWT_SECRET = 'e2e-test-secret';

// Seeded admin account (created in auth.setup.ts).
export const ADMIN = { email: 'e2e-admin@test.local', password: 'adminpass123' };

// Seeded client account (created in auth.setup.ts) for logged-in journeys.
export const CLIENT = {
	email: 'e2e-client@test.local',
	password: 'clientpass123',
	firstName: 'Client',
	lastName: 'E2E',
};

// Where the authenticated storage states are saved.
export const ADMIN_STATE = 'tests/.auth/admin.json';
export const CLIENT_STATE = 'tests/.auth/client.json';

// Local YYYY-MM-DD (avoids UTC drift), matching how the app formats dates.
export function ymd(d: Date): string {
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Next calendar date (strictly in the future) that falls on the given weekday
// (0=Sun … 6=Sat). Used to target a known working/non-working day.
export function nextWeekday(dow: number, from = new Date()): Date {
	const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
	const delta = ((dow - d.getDay() + 7) % 7) || 7;
	d.setDate(d.getDate() + delta);
	return d;
}

// --- Direct DB helpers: pin known state for an isolated scenario -------------
// Same pattern as auth.setup.ts. WAL mode lets a separate connection write
// while the dev server holds the DB open.

export function withDb<T>(fn: (db: Database.Database) => T): T {
	const db = new Database(DB_PATH);
	try {
		return fn(db);
	} finally {
		db.close();
	}
}

export function serviceIdBySlug(slug: string): number {
	return withDb((db) => {
		const row = db.prepare('SELECT id FROM services WHERE slug = ?').get(slug) as
			| { id: number }
			| undefined;
		if (!row) throw new Error(`Service not found: ${slug}`);
		return row.id;
	});
}

export function userIdByEmail(email: string): number {
	return withDb((db) => {
		const row = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as
			| { id: number }
			| undefined;
		if (!row) throw new Error(`User not found: ${email}`);
		return row.id;
	});
}

export function setBeds(n: number) {
	withDb((db) => {
		db.prepare(
			`INSERT INTO settings (key, value) VALUES ('total_beds', ?)
			 ON CONFLICT(key) DO UPDATE SET value = excluded.value`
		).run(String(n));
	});
}

export function getBeds(): number {
	return withDb((db) => {
		const row = db.prepare("SELECT value FROM settings WHERE key = 'total_beds'").get() as
			| { value: string }
			| undefined;
		return row ? Number(row.value) : 1;
	});
}

export function clearBookings() {
	withDb((db) => db.prepare('DELETE FROM bookings').run());
}

export function bookingStatus(id: number): string | undefined {
	return withDb((db) => {
		const row = db.prepare('SELECT status FROM bookings WHERE id = ?').get(id) as
			| { status: string }
			| undefined;
		return row?.status;
	});
}

export function countBookings(where?: { date?: string; startTime?: string }): number {
	return withDb((db) => {
		if (where?.date && where?.startTime) {
			return (
				db
					.prepare('SELECT COUNT(*) AS c FROM bookings WHERE date = ? AND start_time = ?')
					.get(where.date, where.startTime) as { c: number }
			).c;
		}
		if (where?.date) {
			return (db.prepare('SELECT COUNT(*) AS c FROM bookings WHERE date = ?').get(where.date) as {
				c: number;
			}).c;
		}
		return (db.prepare('SELECT COUNT(*) AS c FROM bookings').get() as { c: number }).c;
	});
}

export function seedBooking(opts: {
	serviceId: number;
	date: string;
	startTime: string;
	endTime: string;
	status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
	userId?: number | null;
	guestName?: string;
	guestEmail?: string;
}): number {
	return withDb((db) => {
		const r = db
			.prepare(
				`INSERT INTO bookings
				 (user_id, service_id, guest_name, guest_email, date, start_time, end_time, status, created_at)
				 VALUES (?,?,?,?,?,?,?,?,?)`
			)
			.run(
				opts.userId ?? null,
				opts.serviceId,
				opts.guestName ?? 'Seeded Guest',
				opts.guestEmail ?? 'seed@test.local',
				opts.date,
				opts.startTime,
				opts.endTime,
				opts.status ?? 'confirmed',
				Date.now()
			);
		return Number(r.lastInsertRowid);
	});
}

export function addClosure(date: string, reason = 'Fermeture', isHoliday = false) {
	withDb((db) => {
		db.prepare(
			`INSERT INTO closures (date, reason, is_holiday) VALUES (?,?,?)
			 ON CONFLICT(date) DO UPDATE SET reason = excluded.reason, is_holiday = excluded.is_holiday`
		).run(date, reason, isHoliday ? 1 : 0);
	});
}

export function removeClosure(date: string) {
	withDb((db) => db.prepare('DELETE FROM closures WHERE date = ?').run(date));
}

// Replace the weekly schedule with the given rows (clears all existing rows).
export function setAvailability(rows: { dayOfWeek: number; startTime: string; endTime: string; active?: boolean }[]) {
	withDb((db) => {
		db.prepare('DELETE FROM availability').run();
		const stmt = db.prepare(
			'INSERT INTO availability (day_of_week, start_time, end_time, active) VALUES (?,?,?,?)'
		);
		for (const r of rows) stmt.run(r.dayOfWeek, r.startTime, r.endTime, r.active === false ? 0 : 1);
	});
}

// Restore the seeded default schedule: Tue–Fri 9–18, Sat 9–17.
export function resetAvailabilityToSeed() {
	setAvailability([
		{ dayOfWeek: 2, startTime: '09:00', endTime: '18:00' },
		{ dayOfWeek: 3, startTime: '09:00', endTime: '18:00' },
		{ dayOfWeek: 4, startTime: '09:00', endTime: '18:00' },
		{ dayOfWeek: 5, startTime: '09:00', endTime: '18:00' },
		{ dayOfWeek: 6, startTime: '09:00', endTime: '17:00' },
	]);
}

// --- Shared booking-flow UI helpers ------------------------------------------

// Step 1: select a service by its visible name and advance to the date step.
// Retries the (client-side) selection until "next" enables, in case the first
// click lands before Svelte hydration.
export async function selectServiceAndContinue(page: Page, serviceName: string) {
	const serviceBtn = page.locator('button', { hasText: serviceName }).first();
	const nextBtn = page.getByRole('button', { name: /Choisir un créneau/ });
	await expect(async () => {
		await serviceBtn.click();
		await expect(nextBtn).toBeEnabled({ timeout: 1000 });
	}).toPass({ timeout: 15_000 });
	await nextBtn.click();
}

// Step 2: walk the calendar's selectable days until one returns bookable time
// slots (a working day can still be closed, e.g. a public holiday). Returns the
// first available slot locator (already on screen).
export async function pickFirstDayWithSlots(page: Page) {
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
