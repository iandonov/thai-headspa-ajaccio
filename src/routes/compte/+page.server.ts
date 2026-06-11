import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { bookings, services } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/connexion');

	const userBookings = db
		.select({
			id: bookings.id,
			date: bookings.date,
			startTime: bookings.startTime,
			endTime: bookings.endTime,
			status: bookings.status,
			option: bookings.option,
			notes: bookings.notes,
			createdAt: bookings.createdAt,
			serviceName: services.name,
			servicePrice: services.price,
			serviceDuration: services.duration,
		})
		.from(bookings)
		.leftJoin(services, eq(bookings.serviceId, services.id))
		.where(eq(bookings.userId, locals.user.id))
		.orderBy(bookings.date)
		.all();

	return { bookings: userBookings };
};

export const actions: Actions = {
	cancel: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/connexion');

		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400, { error: 'Réservation introuvable.' });

		// Only the owner can cancel, and only a still-active booking.
		const [booking] = db.select().from(bookings)
			.where(and(eq(bookings.id, id), eq(bookings.userId, locals.user.id)))
			.all();

		if (!booking) return fail(404, { error: 'Réservation introuvable.' });
		if (booking.status === 'cancelled' || booking.status === 'completed') {
			return fail(400, { error: 'Cette réservation ne peut plus être annulée.' });
		}

		db.update(bookings).set({ status: 'cancelled' }).where(eq(bookings.id, id)).run();
		return { cancelled: true };
	},
};
