import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { bookings, services } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/connexion');

	const userBookings = db
		.select({
			id: bookings.id,
			date: bookings.date,
			startTime: bookings.startTime,
			endTime: bookings.endTime,
			status: bookings.status,
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
