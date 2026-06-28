import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db/index';
import { availability, closures, settings, slotBlocks } from '$lib/server/db/schema';
import { frenchHolidays } from '$lib/server/db/seed';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	const avail = db.select().from(availability).orderBy(availability.dayOfWeek).all();
	const closed = db.select().from(closures).orderBy(closures.date).all();
	const blocks = db.select().from(slotBlocks).orderBy(slotBlocks.date, slotBlocks.startTime).all();
	const [bedsRow] = db.select().from(settings).where(eq(settings.key, 'total_beds')).all();
	return {
		availability: avail,
		closures: closed,
		slotBlocks: blocks,
		totalBeds: bedsRow ? Number(bedsRow.value) : 1,
	};
};

export const actions: Actions = {
	// Update one weekly schedule row (hours + active flag).
	update: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const startTime = String(data.get('startTime'));
		const endTime = String(data.get('endTime'));
		const active = data.get('active') === 'on';
		if (!id) return fail(400);
		// Reject empty/malformed times: blank hours would feed NaN into the slot
		// computation and silently make the day unbookable. Times must be "HH:MM"
		// and the day must open before it closes.
		const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
		if (!timeRe.test(startTime) || !timeRe.test(endTime) || startTime >= endTime) {
			return fail(400, { error: 'Horaires invalides.' });
		}
		db.update(availability).set({ startTime, endTime, active }).where(eq(availability.id, id)).run();
		return { success: true };
	},

	// Add a weekly working day. Replaces any existing row for that weekday.
	addDay: async ({ request }) => {
		const data = await request.formData();
		const dayOfWeek = Number(data.get('dayOfWeek'));
		const startTime = String(data.get('startTime') || '09:00');
		const endTime = String(data.get('endTime') || '18:00');
		if (Number.isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
			return fail(400, { error: 'Jour invalide.' });
		}
		const existing = db.select().from(availability).where(eq(availability.dayOfWeek, dayOfWeek)).all();
		if (existing.length > 0) {
			db.update(availability).set({ startTime, endTime, active: true }).where(eq(availability.dayOfWeek, dayOfWeek)).run();
		} else {
			db.insert(availability).values({ dayOfWeek, startTime, endTime, active: true }).run();
		}
		return { success: true };
	},

	deleteDay: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400);
		db.delete(availability).where(eq(availability.id, id)).run();
		return { success: true };
	},

	// Calendar toggle: close an open date, or reopen a closed one.
	toggleClosure: async ({ request }) => {
		const data = await request.formData();
		const date = String(data.get('date') || '');
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(400, { error: 'Date invalide.' });

		const existing = db.select().from(closures).where(eq(closures.date, date)).all();
		if (existing.length > 0) {
			// Reopen — drop the closure row (works for both holidays and manual closures).
			db.delete(closures).where(eq(closures.date, date)).run();
		} else {
			// Close — if the date is a French public holiday, restore its holiday
			// identity (name + amber styling) instead of a generic closure.
			const year = Number(date.slice(0, 4));
			const holiday = frenchHolidays(year).find((h) => h.date === date);
			db.insert(closures).values({
				date,
				reason: holiday ? holiday.reason : 'Fermeture',
				isHoliday: !!holiday,
			}).run();
		}
		return { success: true };
	},

	// Replace the reserved hour slots for a date with the submitted selection.
	// The admin toggles slots locally and saves the whole set at once; the date
	// stays open in the weekly schedule, only the listed windows are unbookable.
	setSlotBlocks: async ({ request }) => {
		const data = await request.formData();
		const date = String(data.get('date') || '');
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(400, { error: 'Date invalide.' });
		const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
		const starts = data.getAll('slot').map(String).filter((s) => timeRe.test(s));

		// Each slot is a 30-min window; its end is the next boundary.
		const endOf = (start: string) => {
			const [h, m] = start.split(':').map(Number);
			const e = h * 60 + m + 30;
			return `${String(Math.floor(e / 60)).padStart(2, '0')}:${String(e % 60).padStart(2, '0')}`;
		};

		db.delete(slotBlocks).where(eq(slotBlocks.date, date)).run();
		for (const start of starts) {
			db.insert(slotBlocks).values({ date, startTime: start, endTime: endOf(start) }).run();
		}
		return { success: true };
	},

	setBeds: async ({ request }) => {
		const data = await request.formData();
		const beds = Math.max(1, Number(data.get('totalBeds')) || 1);
		db.insert(settings)
			.values({ key: 'total_beds', value: String(beds) })
			.onConflictDoUpdate({ target: settings.key, set: { value: String(beds) } })
			.run();
		return { success: true };
	},
};
