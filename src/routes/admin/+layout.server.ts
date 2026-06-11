import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { categories } from '$lib/server/db/schema';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Not signed in → send to login. Signed in but not an admin → send straight
	// to their account page with a flag so we can explain the denied access
	// (avoids the confusing bounce login → /compte).
	if (!locals.user) {
		redirect(302, '/connexion?redirectTo=/admin');
	}
	if (locals.user.role !== 'admin') {
		redirect(302, '/compte?denied=admin');
	}
	// Categories feed the per-category filter links under "Soins & Tarifs".
	const allCategories = db
		.select({ slug: categories.slug, name: categories.name })
		.from(categories)
		.orderBy(categories.sortOrder)
		.all();
	return { user: locals.user, categories: allCategories };
};
