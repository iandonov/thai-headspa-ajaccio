import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

// "Soins & Tarifs" is now split into two sub-pages (prestations à la carte and
// formules). Landing on the bare /admin/services sends you to the first one.
export const load: PageServerLoad = async () => {
	redirect(307, '/admin/services/prestations');
};
