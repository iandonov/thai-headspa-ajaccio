import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index';
import { users, bookings, services } from '$lib/server/db/schema';
import { eq, sql, desc } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	// One row per user with their booking history rolled up. Total spent counts
	// only confirmed/completed bookings (pending & cancelled don't generate revenue).
	const clients = db
		.select({
			id: users.id,
			firstName: users.firstName,
			lastName: users.lastName,
			email: users.email,
			phone: users.phone,
			role: users.role,
			createdAt: users.createdAt,
			bookingCount: sql<number>`count(${bookings.id})`,
			lastVisit: sql<string | null>`max(${bookings.date})`,
			totalSpent: sql<number>`coalesce(sum(case when ${bookings.status} in ('confirmed', 'completed') then ${services.price} else 0 end), 0)`,
		})
		.from(users)
		.leftJoin(bookings, eq(bookings.userId, users.id))
		.leftJoin(services, eq(bookings.serviceId, services.id))
		.groupBy(users.id)
		.orderBy(desc(users.createdAt))
		.all();

	return { clients };
};
