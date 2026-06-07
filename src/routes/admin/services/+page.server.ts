import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db/index';
import { services } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	const all = db.select().from(services).orderBy(services.sortOrder).all();
	return { services: all };
};

export const actions: Actions = {
	update: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const price = Number(data.get('price'));
		const duration = Number(data.get('duration'));
		const name = String(data.get('name') || '');
		const description = String(data.get('description') || '');
		const active = data.get('active') === 'on';

		if (!id) return fail(400);
		db.update(services).set({ price, duration, name, description, active }).where(eq(services.id, id)).run();
		return { success: true };
	},
};
