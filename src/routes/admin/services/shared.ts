// Shared helpers + form actions for the two service-management pages
// (/admin/services/prestations and /admin/services/formules). Both pages edit
// the same `services` table, so the create/update/delete logic lives here once.
import { db } from '$lib/server/db/index';
import { services, bookings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fail, type RequestEvent } from '@sveltejs/kit';

// Categories used for "à la carte" base prestations (everything that isn't a formule).
export const BASE_CATEGORIES = ['head-spa', 'reflexologie', 'facial', 'massage'] as const;

function slugify(name: string): string {
	return name
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '') // strip accents
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60);
}

// Make a slug unique by appending -2, -3, … if needed.
function uniqueSlug(base: string): string {
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

function nextSortOrder(): number {
	return db.select().from(services).all().reduce((m, s) => Math.max(m, s.sortOrder), 0) + 1;
}

// ---- Actions shared by both pages -------------------------------------------

export async function updateService({ request }: RequestEvent) {
	const data = await request.formData();
	const id = Number(data.get('id'));
	const price = Number(data.get('price'));
	const duration = Number(data.get('duration'));
	const beds = Math.max(1, Number(data.get('beds')) || 1);
	const name = String(data.get('name') || '');
	const description = String(data.get('description') || '');
	const active = data.get('active') === 'on';

	if (!id) return fail(400);

	const values: Partial<typeof services.$inferInsert> = { price, duration, beds, name, description, active };

	// Options field is only present for formules — parse newline list into a
	// JSON array (or null when empty).
	if (data.get('options') !== null) {
		values.options = parseOptions(data.get('options'));
	}

	db.update(services).set(values).where(eq(services.id, id)).run();
	return { success: true };
}

export async function deleteService({ request }: RequestEvent) {
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
}

// Add a new "à la carte" base prestation.
export async function createBase({ request }: RequestEvent) {
	const data = await request.formData();
	const name = String(data.get('name') || '').trim();
	const category = String(data.get('category') || 'massage');
	if (!name) return fail(400, { error: 'Le nom est requis.', scope: 'base' });
	if (!BASE_CATEGORIES.includes(category as (typeof BASE_CATEGORIES)[number])) {
		return fail(400, { error: 'Catégorie invalide.', scope: 'base' });
	}

	db.insert(services).values({
		slug: uniqueSlug(slugify(name)),
		name,
		description: String(data.get('description') || '').trim(),
		longDescription: null,
		duration: Math.max(15, Number(data.get('duration')) || 60),
		price: Math.max(0, Number(data.get('price')) || 0),
		category,
		options: null,
		beds: Math.max(1, Number(data.get('beds')) || 1),
		imageUrl: null,
		active: true,
		sortOrder: nextSortOrder(),
	}).run();
	return { success: true, created: 'base' };
}

// Add a new formule (package) with selectable options.
export async function createPackage({ request }: RequestEvent) {
	const data = await request.formData();
	const name = String(data.get('name') || '').trim();
	if (!name) return fail(400, { error: 'Le nom est requis.', scope: 'package' });

	db.insert(services).values({
		slug: uniqueSlug(slugify(name)),
		name,
		description: String(data.get('description') || '').trim(),
		longDescription: String(data.get('longDescription') || '').trim() || null,
		duration: Math.max(15, Number(data.get('duration')) || 60),
		price: Math.max(0, Number(data.get('price')) || 0),
		category: 'formule',
		options: parseOptions(data.get('options')),
		beds: Math.max(1, Number(data.get('beds')) || 1),
		imageUrl: null,
		active: true,
		sortOrder: nextSortOrder(),
	}).run();
	return { success: true, created: 'package' };
}
