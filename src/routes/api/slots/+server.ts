import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { availability, bookings, services, closures, settings } from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { computeSlots, toMin } from '$lib/server/availability';

export const GET: RequestHandler = async ({ url }) => {
	const dateStr = url.searchParams.get('date');
	const serviceId = Number(url.searchParams.get('serviceId'));

	if (!dateStr || !serviceId) {
		return json({ error: 'date and serviceId required' }, { status: 400 });
	}

	// Date-specific closure (public holiday or manual) → no slots at all.
	const [closure] = db.select().from(closures).where(eq(closures.date, dateStr)).all();
	if (closure) return json({ slots: [], closed: true, reason: closure.reason });

	const date = new Date(dateStr);
	const dayOfWeek = date.getDay();

	const [avail] = db.select().from(availability)
		.where(and(eq(availability.dayOfWeek, dayOfWeek), eq(availability.active, true)))
		.all();

	if (!avail) return json({ slots: [] });

	const [service] = db.select().from(services).where(eq(services.id, serviceId)).all();
	if (!service) return json({ slots: [] });

	const serviceBeds = service.beds ?? 1;
	const [bedsRow] = db.select().from(settings).where(eq(settings.key, 'total_beds')).all();
	const totalBeds = bedsRow ? Number(bedsRow.value) : 1;

	// Pending and confirmed bookings both occupy beds (cancelled ones free them).
	// Join services to know how many beds each existing booking consumes.
	const existing = db.select({
		startTime: bookings.startTime,
		endTime: bookings.endTime,
		beds: services.beds,
	})
		.from(bookings)
		.leftJoin(services, eq(bookings.serviceId, services.id))
		.where(and(eq(bookings.date, dateStr), inArray(bookings.status, ['pending', 'confirmed'])))
		.all();

	const intervals = existing.map((b) => ({ s: toMin(b.startTime), e: toMin(b.endTime), beds: b.beds ?? 1 }));

	const slots = computeSlots({
		availStartMin: toMin(avail.startTime),
		availEndMin: toMin(avail.endTime),
		durationMin: service.duration,
		serviceBeds,
		totalBeds,
		existing: intervals,
	});

	return json({ slots });
};
