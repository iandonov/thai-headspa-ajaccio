import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db/index';
import { bookings, services, users, availability, closures, settings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { computeSlots, toMin, blockUntilNextSlot } from '$lib/server/availability';

export const load: PageServerLoad = async () => {
	const all = db
		.select({
			id: bookings.id,
			date: bookings.date,
			startTime: bookings.startTime,
			endTime: bookings.endTime,
			status: bookings.status,
			option: bookings.option,
			notes: bookings.notes,
			guestName: bookings.guestName,
			guestEmail: bookings.guestEmail,
			guestPhone: bookings.guestPhone,
			createdAt: bookings.createdAt,
			serviceName: services.name,
			servicePrice: services.price,
			serviceBeds: services.beds,
			serviceBuffer: services.bufferMinutes,
			firstName: users.firstName,
			lastName: users.lastName,
			email: users.email,
			phone: users.phone,
		})
		.from(bookings)
		.leftJoin(services, eq(bookings.serviceId, services.id))
		.leftJoin(users, eq(bookings.userId, users.id))
		.orderBy(bookings.date, bookings.startTime)
		.all();

	const weekly = db.select().from(availability).where(eq(availability.active, true)).all();
	const allClosures = db.select().from(closures).all();
	const [bedsRow] = db.select().from(settings).where(eq(settings.key, 'total_beds')).all();
	const totalBeds = bedsRow ? Number(bedsRow.value) : 1;

	// Occupancy per date that has active (pending/confirmed) bookings:
	// 'full' when no 30-minute single-bed slot remains free, else 'partial'.
	// Dates without active bookings simply have no entry (= nothing booked).
	const activeByDate = new Map<string, typeof all>();
	for (const b of all) {
		if (b.status !== 'pending' && b.status !== 'confirmed') continue;
		const list = activeByDate.get(b.date);
		if (list) list.push(b);
		else activeByDate.set(b.date, [b]);
	}

	const dayStatus: Record<string, 'partial' | 'full'> = {};
	for (const [date, list] of activeByDate) {
		const dow = new Date(date).getDay();
		const avail = weekly.find((a) => a.dayOfWeek === dow);
		if (!avail) {
			// Booked outside the weekly schedule (e.g. exceptional opening).
			dayStatus[date] = 'partial';
			continue;
		}
		const gridStart = toMin(avail.startTime);
		const intervals = list.map((b) => ({
			s: toMin(b.startTime),
			e: blockUntilNextSlot(toMin(b.endTime) + (b.serviceBuffer ?? 0), gridStart),
			beds: b.serviceBeds ?? 1,
		}));
		const slots = computeSlots({
			availStartMin: toMin(avail.startTime),
			availEndMin: toMin(avail.endTime),
			durationMin: 30,
			serviceBeds: 1,
			totalBeds,
			existing: intervals,
		});
		dayStatus[date] = slots.some((s) => s.available) ? 'partial' : 'full';
	}

	return {
		bookings: all,
		dayStatus,
		availability: weekly,
		closures: allClosures,
	};
};

export const actions: Actions = {
	updateStatus: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const status = String(data.get('status')) as 'pending' | 'confirmed' | 'cancelled' | 'completed';
		if (!id || !status) return fail(400, { error: 'Invalid' });
		db.update(bookings).set({ status }).where(eq(bookings.id, id)).run();
		return { success: true };
	},
};
