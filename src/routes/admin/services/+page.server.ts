// Single "Soins & Tarifs" management page: every service (à la carte and
// formules alike) is edited here with the same template. The categories
// themselves are managed on their own screen (./categories).
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import { db } from '$lib/server/db/index';
import { services, bookings, categories } from '$lib/server/db/schema';
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

// Make a service slug unique by appending -2, -3, … if needed.
function uniqueServiceSlug(base: string): string {
	let slug = base || 'prestation';
	let n = 1;
	while (db.select().from(services).where(eq(services.slug, slug)).all().length > 0) {
		n += 1;
		slug = `${base}-${n}`;
	}
	return slug;
}

function parseOptions(raw: FormDataEntryValue | null): string | null {
	if (raw === null) return null;
	const list = String(raw)
		.split('\n')
		.map((s) => s.trim())
		.filter(Boolean);
	return list.length ? JSON.stringify(list) : null;
}

function validCategorySlug(slug: string): boolean {
	return db.select().from(categories).where(eq(categories.slug, slug)).all().length > 0;
}

export const load: PageServerLoad = async () => {
	return {
		services: db.select().from(services).orderBy(services.sortOrder).all(),
		categories: db.select().from(categories).orderBy(categories.sortOrder).all(),
	};
};

export const actions: Actions = {
	create: async ({ request }: RequestEvent) => {
		const data = await request.formData();
		const name = String(data.get('name') || '').trim();
		const category = String(data.get('category') || '');
		if (!name) return fail(400, { error: 'Le nom est requis.', scope: 'service' });
		if (!validCategorySlug(category)) return fail(400, { error: 'Catégorie invalide.', scope: 'service' });

		const nextSort = db.select().from(services).all().reduce((m, s) => Math.max(m, s.sortOrder), 0) + 1;
		db.insert(services).values({
			slug: uniqueServiceSlug(slugify(name)),
			name,
			description: String(data.get('description') || '').trim(),
			longDescription: String(data.get('longDescription') || '').trim() || null,
			duration: Math.max(15, Number(data.get('duration')) || 60),
			price: Math.max(0, Number(data.get('price')) || 0),
			category,
			options: parseOptions(data.get('options')),
			beds: Math.max(1, Number(data.get('beds')) || 1),
			bufferMinutes: Math.max(0, Number(data.get('bufferMinutes')) || 0),
			imageUrl: null,
			active: true,
			sortOrder: nextSort,
		}).run();
		return { success: true, created: 'service' };
	},

	update: async ({ request }: RequestEvent) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400);

		const category = String(data.get('category') || '');
		if (!validCategorySlug(category)) return fail(400, { error: 'Catégorie invalide.' });

		db.update(services).set({
			name: String(data.get('name') || ''),
			description: String(data.get('description') || ''),
			longDescription: String(data.get('longDescription') || '').trim() || null,
			duration: Math.max(15, Number(data.get('duration')) || 60),
			price: Math.max(0, Number(data.get('price')) || 0),
			beds: Math.max(1, Number(data.get('beds')) || 1),
			bufferMinutes: Math.max(0, Number(data.get('bufferMinutes')) || 0),
			category,
			options: parseOptions(data.get('options')),
			active: data.get('active') === 'on',
		}).where(eq(services.id, id)).run();
		return { success: true };
	},

	delete: async ({ request }: RequestEvent) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400);
		// A service referenced by bookings can't be removed (FK). Hide it instead.
		const [ref] = db.select().from(bookings).where(eq(bookings.serviceId, id)).limit(1).all();
		if (ref) {
			db.update(services).set({ active: false }).where(eq(services.id, id)).run();
			return fail(409, { error: 'Cette prestation a des réservations : elle a été masquée plutôt que supprimée.' });
		}
		db.delete(services).where(eq(services.id, id)).run();
		return { success: true, deleted: true };
	},
};
