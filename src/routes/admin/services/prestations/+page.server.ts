import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

// "À la carte" and "Formules" were merged into the single /admin/services page.
export const load: PageServerLoad = async () => {
	redirect(307, '/admin/services');
};
