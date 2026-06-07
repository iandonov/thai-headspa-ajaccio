import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index';
import { services } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const allServices = db.select().from(services)
		.where(eq(services.active, true))
		.orderBy(services.sortOrder)
		.all();
	return { services: allServices };
};
