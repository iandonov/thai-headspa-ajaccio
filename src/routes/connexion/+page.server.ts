import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { users } from '$lib/server/db/schema';
import { verifyPassword, createToken } from '$lib/server/auth';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(302, '/compte');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = String(data.get('email') || '').toLowerCase().trim();
		const password = String(data.get('password') || '');

		if (!email || !password) {
			return fail(400, { error: 'Veuillez remplir tous les champs.' });
		}

		const [user] = db.select().from(users).where(eq(users.email, email)).all();

		if (!user || !(await verifyPassword(password, user.passwordHash))) {
			return fail(401, { error: 'Email ou mot de passe incorrect.' });
		}

		const token = await createToken(user.id, user.role);
		cookies.set('session', token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 7,
			secure: false,
		});

		redirect(302, user.role === 'admin' ? '/admin' : '/compte');
	},
};
