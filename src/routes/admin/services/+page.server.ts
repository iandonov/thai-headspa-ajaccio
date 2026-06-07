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

		const values: Partial<typeof services.$inferInsert> = { price, duration, name, description, active };

		// Options field is only present for formules — parse newline list into a
		// JSON array (or null when empty).
		const optionsRaw = data.get('options');
		if (optionsRaw !== null) {
			const list = String(optionsRaw)
				.split('\n')
				.map((s) => s.trim())
				.filter(Boolean);
			values.options = list.length ? JSON.stringify(list) : null;
		}

		db.update(services).set(values).where(eq(services.id, id)).run();
		return { success: true };
	},
};
