import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db/index';
import { services } from '$lib/server/db/schema';
import { updateService, deleteService, createBase } from '../shared';

export const load: PageServerLoad = async () => {
	const all = db.select().from(services).orderBy(services.sortOrder).all();
	return {
		baseOptions: all.filter((s) => s.category !== 'formule'),
	};
};

export const actions: Actions = {
	update: updateService,
	delete: deleteService,
	createBase,
};
