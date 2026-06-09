import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db/index';
import { users, bookings, services } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const id = Number(params.id);
	if (!id) error(404, 'Client introuvable');

	const [client] = db.select().from(users).where(eq(users.id, id)).all();
	if (!client) error(404, 'Client introuvable');

	const history = db
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
		})
		.from(bookings)
		.leftJoin(services, eq(bookings.serviceId, services.id))
		.where(eq(bookings.userId, id))
		.orderBy(desc(bookings.date))
		.all();

	// Roll-up stats for the dossier header.
	const revenueStatuses = new Set(['confirmed', 'completed']);
	const stats = {
		total: history.length,
		completed: history.filter((b) => b.status === 'completed').length,
		cancelled: history.filter((b) => b.status === 'cancelled').length,
		upcoming: history.filter((b) => (b.status === 'pending' || b.status === 'confirmed')).length,
		totalSpent: history
			.filter((b) => revenueStatuses.has(b.status))
			.reduce((sum, b) => sum + (b.servicePrice ?? 0), 0),
		firstVisit: history.length ? history[history.length - 1].date : null,
		lastVisit: history.length ? history[0].date : null,
	};

	return {
		client: {
			id: client.id,
			firstName: client.firstName,
			lastName: client.lastName,
			email: client.email,
			phone: client.phone,
			role: client.role,
			notes: client.notes,
			createdAt: client.createdAt,
		},
		history,
		stats,
	};
};

export const actions: Actions = {
	saveNotes: async ({ request, params }) => {
		const id = Number(params.id);
		if (!id) return fail(400);
		const data = await request.formData();
		const notes = String(data.get('notes') ?? '').trim() || null;
		db.update(users).set({ notes }).where(eq(users.id, id)).run();
		return { success: true };
	},
};
