import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index';
import { bookings, users, services } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const totalBookings = db.select({ count: sql<number>`count(*)` }).from(bookings).all()[0].count;
	const pendingBookings = db.select({ count: sql<number>`count(*)` }).from(bookings).where(eq(bookings.status, 'pending')).all()[0].count;
	const totalUsers = db.select({ count: sql<number>`count(*)` }).from(users).all()[0].count;
	const totalServices = db.select({ count: sql<number>`count(*)` }).from(services).where(eq(services.active, true)).all()[0].count;

	const recentBookings = db
		.select({
			id: bookings.id,
			date: bookings.date,
			startTime: bookings.startTime,
			status: bookings.status,
			guestName: bookings.guestName,
			guestEmail: bookings.guestEmail,
			serviceName: services.name,
			firstName: users.firstName,
			lastName: users.lastName,
		})
		.from(bookings)
		.leftJoin(services, eq(bookings.serviceId, services.id))
		.leftJoin(users, eq(bookings.userId, users.id))
		.orderBy(bookings.createdAt)
		.limit(8)
		.all();

	return { totalBookings, pendingBookings, totalUsers, totalServices, recentBookings };
};
