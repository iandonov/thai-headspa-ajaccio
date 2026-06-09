import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db/index';
import { services } from '$lib/server/db/schema';
import { updateService, deleteService, createPackage } from '../shared';

export const load: PageServerLoad = async () => {
	const all = db.select().from(services).orderBy(services.sortOrder).all();
	return {
		packages: all.filter((s) => s.category === 'formule'),
	};
};

export const actions: Actions = {
	update: updateService,
	delete: deleteService,
	createPackage,
};
