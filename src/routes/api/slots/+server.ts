import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { availability, bookings, services } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url }) => {
	const dateStr = url.searchParams.get('date');
	const serviceId = Number(url.searchParams.get('serviceId'));

	if (!dateStr || !serviceId) {
		return json({ error: 'date and serviceId required' }, { status: 400 });
	}

	const date = new Date(dateStr);
	const dayOfWeek = date.getDay();

	const [avail] = db.select().from(availability)
		.where(and(eq(availability.dayOfWeek, dayOfWeek), eq(availability.active, true)))
		.all();

	if (!avail) return json({ slots: [] });

	const [service] = db.select().from(services).where(eq(services.id, serviceId)).all();
	if (!service) return json({ slots: [] });

	const existingBookings = db.select().from(bookings)
		.where(and(eq(bookings.date, dateStr), eq(bookings.status, 'confirmed')))
		.all();

	const slots: string[] = [];
	const [startH, startM] = avail.startTime.split(':').map(Number);
	const [endH, endM] = avail.endTime.split(':').map(Number);
	const startMinutes = startH * 60 + startM;
	const endMinutes = endH * 60 + endM;

	for (let t = startMinutes; t + service.duration <= endMinutes; t += 30) {
		const slotEnd = t + service.duration;
		const h = Math.floor(t / 60).toString().padStart(2, '0');
		const m = (t % 60).toString().padStart(2, '0');
		const slotStart = `${h}:${m}`;

		const conflict = existingBookings.some(b => {
			const [bsh, bsm] = b.startTime.split(':').map(Number);
			const [beh, bem] = b.endTime.split(':').map(Number);
			const bs = bsh * 60 + bsm;
			const be = beh * 60 + bem;
			return t < be && slotEnd > bs;
		});

		if (!conflict) slots.push(slotStart);
	}

	return json({ slots });
};
