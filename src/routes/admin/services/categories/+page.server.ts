// Dedicated screen for managing the service categories. `services.category`
// stores the category slug, which stays stable across renames.
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import { db } from '$lib/server/db/index';
import { services, categories } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';

function slugify(name: string): string {
	return name
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '') // strip accents
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60);
}

function uniqueCategorySlug(base: string): string {
	let slug = base || 'categorie';
	let n = 1;
	while (db.select().from(categories).where(eq(categories.slug, slug)).all().length > 0) {
		n += 1;
		slug = `${base}-${n}`;
	}
	return slug;
}

export const load: PageServerLoad = async () => {
	const all = db.select().from(categories).orderBy(categories.sortOrder).all();
	const allServices = db.select().from(services).all();
	// How many services each category groups — shown next to the row, and the
	// reason a non-empty category can't be deleted.
	const usage = Object.fromEntries(
		all.map((c) => [c.slug, allServices.filter((s) => s.category === c.slug).length])
	);
	return { categories: all, usage };
};

export const actions: Actions = {
	create: async ({ request }: RequestEvent) => {
		const data = await request.formData();
		const name = String(data.get('name') || '').trim();
		if (!name) return fail(400, { error: 'Le nom est requis.' });

		const nextSort = db.select().from(categories).all().reduce((m, c) => Math.max(m, c.sortOrder), 0) + 1;
		db.insert(categories).values({
			slug: uniqueCategorySlug(slugify(name)),
			name,
			sortOrder: nextSort,
		}).run();
		return { success: true, created: true };
	},

	update: async ({ request }: RequestEvent) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const name = String(data.get('name') || '').trim();
		if (!id || !name) return fail(400, { error: 'Le nom est requis.' });
		// The slug stays stable on rename — services reference it.
		db.update(categories).set({ name }).where(eq(categories.id, id)).run();
		return { success: true };
	},

	delete: async ({ request }: RequestEvent) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400);
		const [cat] = db.select().from(categories).where(eq(categories.id, id)).all();
		if (!cat) return fail(404);
		const used = db.select().from(services).where(eq(services.category, cat.slug)).all();
		if (used.length > 0) {
			return fail(409, {
				error: `« ${cat.name} » est utilisée par ${used.length} soin(s) : déplacez-les d'abord vers une autre catégorie.`,
			});
		}
		db.delete(categories).where(eq(categories.id, id)).run();
		return { success: true, deleted: true };
	},
};
