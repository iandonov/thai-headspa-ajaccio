import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { services, bookings, availability } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, url }) => {
	const allServices = db.select().from(services)
		.where(eq(services.active, true))
		.orderBy(services.sortOrder)
		.all();

	const preselectedId = url.searchParams.get('service');

	return {
		services: allServices,
		user: locals.user,
		preselectedServiceId: preselectedId ? Number(preselectedId) : null,
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const data = await request.formData();
		const serviceId = Number(data.get('serviceId'));
		const date = String(data.get('date') || '');
		const startTime = String(data.get('startTime') || '');
		const notes = String(data.get('notes') || '');

		// Guest or logged in
		const guestName = String(data.get('guestName') || '').trim();
		const guestEmail = String(data.get('guestEmail') || '').toLowerCase().trim();
		const guestPhone = String(data.get('guestPhone') || '').trim();

		if (!serviceId || !date || !startTime) {
			return fail(400, { error: 'Veuillez sélectionner un soin, une date et un créneau.' });
		}
		if (!locals.user && (!guestName || !guestEmail)) {
			return fail(400, { error: 'Veuillez indiquer votre nom et email.' });
		}

		const [service] = db.select().from(services).where(eq(services.id, serviceId)).all();
		if (!service) return fail(400, { error: 'Soin introuvable.' });

		const [sh, sm] = startTime.split(':').map(Number);
		const endMinutes = sh * 60 + sm + service.duration;
		const endTime = `${Math.floor(endMinutes/60).toString().padStart(2,'0')}:${(endMinutes%60).toString().padStart(2,'0')}`;

		// Check conflict
		const dayOfWeek = new Date(date).getDay();
		const [avail] = db.select().from(availability)
			.where(and(eq(availability.dayOfWeek, dayOfWeek), eq(availability.active, true)))
			.all();
		if (!avail) return fail(400, { error: "Nous ne travaillons pas ce jour-là." });

		db.insert(bookings).values({
			userId: locals.user?.id ?? null,
			serviceId,
			guestName: locals.user ? null : guestName,
			guestEmail: locals.user ? null : guestEmail,
			guestPhone: locals.user ? null : (guestPhone || null),
			date,
			startTime,
			endTime,
			status: 'pending',
			notes: notes || null,
			createdAt: new Date(),
		}).run();

		redirect(302, '/reservation/confirmation');
	},
};
