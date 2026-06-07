import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db/index';
import { bookings, services, users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	const all = db
		.select({
			id: bookings.id,
			date: bookings.date,
			startTime: bookings.startTime,
			endTime: bookings.endTime,
			status: bookings.status,
			notes: bookings.notes,
			guestName: bookings.guestName,
			guestEmail: bookings.guestEmail,
			guestPhone: bookings.guestPhone,
			createdAt: bookings.createdAt,
			serviceName: services.name,
			servicePrice: services.price,
			firstName: users.firstName,
			lastName: users.lastName,
			email: users.email,
			phone: users.phone,
		})
		.from(bookings)
		.leftJoin(services, eq(bookings.serviceId, services.id))
		.leftJoin(users, eq(bookings.userId, users.id))
		.orderBy(bookings.date)
		.all();

	return { bookings: all };
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
