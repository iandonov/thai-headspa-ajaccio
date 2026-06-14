import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

// The dashboard was removed — /admin now lands straight on the reservations page.
export const load: PageServerLoad = async () => {
	redirect(302, '/admin/reservations');
};
