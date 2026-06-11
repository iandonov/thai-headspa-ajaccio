import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index';
import { services, categories } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const allServices = db.select().from(services)
		.where(eq(services.active, true))
		.orderBy(services.sortOrder)
		.all();
	const allCategories = db.select().from(categories).orderBy(categories.sortOrder).all();
	return { services: allServices, categories: allCategories };
};
