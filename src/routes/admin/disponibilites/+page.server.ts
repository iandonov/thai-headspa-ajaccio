import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db/index';
import { availability } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	const avail = db.select().from(availability).orderBy(availability.dayOfWeek).all();
	return { availability: avail };
};

export const actions: Actions = {
	update: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const startTime = String(data.get('startTime'));
		const endTime = String(data.get('endTime'));
		const active = data.get('active') === 'on';
		if (!id) return fail(400);
		db.update(availability).set({ startTime, endTime, active }).where(eq(availability.id, id)).run();
		return { success: true };
	},
};
