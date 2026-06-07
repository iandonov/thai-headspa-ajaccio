import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { services, bookings, availability, users } from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { verifyPassword, hashPassword, createToken } from '$lib/server/auth';

const SESSION_COOKIE = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax' as const,
	maxAge: 60 * 60 * 24 * 7,
	secure: false,
};

export const load: PageServerLoad = async ({ locals, url }) => {
	const allServices = db.select().from(services)
		.where(eq(services.active, true))
		.orderBy(services.sortOrder)
		.all();

	const preselectedId = url.searchParams.get('service');
	const preselectedOption = url.searchParams.get('option');

	return {
		services: allServices,
		user: locals.user,
		preselectedServiceId: preselectedId ? Number(preselectedId) : null,
		preselectedOption: preselectedOption || null,
	};
};

export const actions: Actions = {
	// Inline sign-in during booking — sets the session cookie but does NOT
	// redirect, so the client keeps its in-progress selection and continues.
	login: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = String(data.get('email') || '').toLowerCase().trim();
		const password = String(data.get('password') || '');

		if (!email || !password) {
			return fail(400, { authError: 'Veuillez remplir tous les champs.' });
		}

		const [user] = db.select().from(users).where(eq(users.email, email)).all();
		if (!user || !(await verifyPassword(password, user.passwordHash))) {
			return fail(401, { authError: 'Email ou mot de passe incorrect.' });
		}

		const token = await createToken(user.id, user.role);
		cookies.set('session', token, SESSION_COOKIE);
		return { authed: true };
	},

	// Inline account creation during booking — same seamless behaviour.
	register: async ({ request, cookies }) => {
		const data = await request.formData();
		const firstName = String(data.get('firstName') || '').trim();
		const lastName = String(data.get('lastName') || '').trim();
		const email = String(data.get('email') || '').toLowerCase().trim();
		const phone = String(data.get('phone') || '').trim();
		const password = String(data.get('password') || '');

		if (!firstName || !lastName || !email || !password) {
			return fail(400, { authError: 'Veuillez remplir tous les champs obligatoires.' });
		}
		if (password.length < 8) {
			return fail(400, { authError: 'Le mot de passe doit contenir au moins 8 caractères.' });
		}

		const [existing] = db.select().from(users).where(eq(users.email, email)).all();
		if (existing) {
			return fail(409, { authError: 'Un compte existe déjà avec cet email.' });
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
		cookies.set('session', token, SESSION_COOKIE);
		return { authed: true };
	},

	book: async ({ request, locals }) => {
		const data = await request.formData();
		const serviceId = Number(data.get('serviceId'));
		const date = String(data.get('date') || '');
		const startTime = String(data.get('startTime') || '');
		const option = String(data.get('option') || '').trim();
		const userNotes = String(data.get('notes') || '').trim();
		const notes = [option ? `Option choisie : ${option}` : '', userNotes].filter(Boolean).join('\n');

		// Guest or logged in
		const guestName = String(data.get('guestName') || '').trim();
		const guestEmail = String(data.get('guestEmail') || '').toLowerCase().trim();
		const guestPhone = String(data.get('guestPhone') || '').trim();

		if (!serviceId || !date || !startTime) {
			return fail(400, { error: 'Veuillez sélectionner un soin, une date et un créneau.' });
		}
		if (!locals.user && (!guestName || !guestEmail)) {
			return fail(400, { error: 'Veuillez indiquer votre nom et email.' });
		}

		const [service] = db.select().from(services).where(eq(services.id, serviceId)).all();
		if (!service) return fail(400, { error: 'Soin introuvable.' });

		const [sh, sm] = startTime.split(':').map(Number);
		const endMinutes = sh * 60 + sm + service.duration;
		const endTime = `${Math.floor(endMinutes/60).toString().padStart(2,'0')}:${(endMinutes%60).toString().padStart(2,'0')}`;

		const dayOfWeek = new Date(date).getDay();
		const [avail] = db.select().from(availability)
			.where(and(eq(availability.dayOfWeek, dayOfWeek), eq(availability.active, true)))
			.all();
		if (!avail) return fail(400, { error: "Nous ne travaillons pas ce jour-là." });

		// Reject if the chosen slot overlaps an existing pending/confirmed booking
		// (guards against a stale client picking an already-taken hour).
		const startMin = sh * 60 + sm;
		const sameDay = db.select().from(bookings)
			.where(and(eq(bookings.date, date), inArray(bookings.status, ['pending', 'confirmed'])))
			.all();
		const overlaps = sameDay.some((b) => {
			const [bsh, bsm] = b.startTime.split(':').map(Number);
			const [beh, bem] = b.endTime.split(':').map(Number);
			return startMin < beh * 60 + bem && endMinutes > bsh * 60 + bsm;
		});
		if (overlaps) {
			return fail(409, { error: 'Ce créneau vient d’être réservé. Veuillez en choisir un autre.' });
		}

		db.insert(bookings).values({
			userId: locals.user?.id ?? null,
			serviceId,
			guestName: locals.user ? null : guestName,
			guestEmail: locals.user ? null : guestEmail,
			guestPhone: locals.user ? null : (guestPhone || null),
			date,
			startTime,
			endTime,
			status: 'pending',
			notes: notes || null,
			createdAt: new Date(),
		}).run();

		redirect(302, '/reservation/confirmation');
	},
};
