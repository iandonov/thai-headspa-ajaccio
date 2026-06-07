import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { users } from '$lib/server/db/schema';
import { hashPassword, createToken } from '$lib/server/auth';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(302, '/compte');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const firstName = String(data.get('firstName') || '').trim();
		const lastName = String(data.get('lastName') || '').trim();
		const email = String(data.get('email') || '').toLowerCase().trim();
		const phone = String(data.get('phone') || '').trim();
		const password = String(data.get('password') || '');

		if (!firstName || !lastName || !email || !password) {
			return fail(400, { error: 'Veuillez remplir tous les champs obligatoires.' });
		}
		if (password.length < 8) {
			return fail(400, { error: 'Le mot de passe doit contenir au moins 8 caractères.' });
		}

		const [existing] = db.select().from(users).where(eq(users.email, email)).all();
		if (existing) {
			return fail(409, { error: 'Un compte existe déjà avec cet email.' });
		}

		const passwordHash = await hashPassword(password);
		const result = db.insert(users).values({
			email,
			passwordHash,
			firstName,
			lastName,
			phone: phone || null,
			role: 'client',
			createdAt: new Date(),
		}).run();

		const token = await createToken(Number(result.lastInsertRowid), 'client');
		cookies.set('session', token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 7,
			secure: false,
		});

		redirect(302, '/compte');
	},
};
