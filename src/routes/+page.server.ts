import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index';
import { services, cmsContent } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const allServices = db.select().from(services)
		.where(eq(services.active, true))
		.orderBy(services.sortOrder)
		.all();

	const content = db.select().from(cmsContent).all();
	const cms: Record<string, string> = {};
	for (const item of content) cms[item.key] = item.value;

	return { services: allServices, cms };
};
