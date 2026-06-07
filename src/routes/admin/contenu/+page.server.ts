import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db/index';
import { cmsContent } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	const content = db.select().from(cmsContent).all();
	return { content };
};

export const actions: Actions = {
	update: async ({ request }) => {
		const data = await request.formData();
		const key = String(data.get('key') || '');
		const value = String(data.get('value') || '');
		if (!key) return fail(400, { error: 'Key required' });

		const existing = db.select().from(cmsContent).where(eq(cmsContent.key, key)).all()[0];
		if (existing) {
			db.update(cmsContent).set({ value, updatedAt: new Date() }).where(eq(cmsContent.key, key)).run();
		} else {
			db.insert(cmsContent).values({ key, value, type: 'text', updatedAt: new Date() }).run();
		}
		return { success: true, key };
	},
};
