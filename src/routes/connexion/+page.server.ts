import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { db } from '$lib/server/db/index';
import { users } from '$lib/server/db/schema';
import { verifyPassword, createToken } from '$lib/server/auth';
import { eq } from 'drizzle-orm';

// TODO(remove before launch): dev-only convenience so the admin area is
// reachable without managing credentials. Compiled out of production builds
// (`dev` is false there). Only kicks in for emails that don't match a real
// account, so genuine wrong-password attempts on real users still fail.
const ADMIN_DEV_BYPASS = dev;

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(302, '/compte');
	return { devBypass: ADMIN_DEV_BYPASS };
};

// Admins land on the reservations screen by default. A deep link to a specific
// admin sub-page (e.g. /admin/clients) is honoured; the generic guard value
// ('/admin') falls through to reservations.
function adminDest(redirectTo: string | null): string {
	return redirectTo && redirectTo.startsWith('/admin/') ? redirectTo : '/admin/reservations';
}

function setSession(cookies: import('@sveltejs/kit').Cookies, token: string) {
	cookies.set('session', token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 7,
		secure: false,
	});
}

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const data = await request.formData();
		const email = String(data.get('email') || '').toLowerCase().trim();
		const password = String(data.get('password') || '');

		if (!email || !password) {
			return fail(400, { error: 'Veuillez remplir tous les champs.' });
		}

		const [user] = db.select().from(users).where(eq(users.email, email)).all();

		const redirectTo = url.searchParams.get('redirectTo');

		if (!user) {
			// Dev bypass: any unrecognised login signs you in as an admin.
			if (ADMIN_DEV_BYPASS) {
				const [admin] = db.select().from(users).where(eq(users.role, 'admin')).all();
				if (admin) {
					setSession(cookies, await createToken(admin.id, admin.role));
					redirect(302, adminDest(redirectTo));
				}
			}
			return fail(401, { error: 'Email ou mot de passe incorrect.' });
		}

		if (!(await verifyPassword(password, user.passwordHash))) {
			return fail(401, { error: 'Email ou mot de passe incorrect.' });
		}

		setSession(cookies, await createToken(user.id, user.role));

		if (user.role === 'admin') {
			redirect(302, adminDest(redirectTo));
		}
		// Non-admins land on their account page; honour only a safe non-admin path.
		const dest =
			redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('/admin')
				? redirectTo
				: '/compte';
		redirect(302, dest);
	},
};
