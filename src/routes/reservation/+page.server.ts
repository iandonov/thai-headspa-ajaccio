import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { services, bookings, availability, users, closures, settings, categories } from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { verifyPassword, hashPassword, createToken } from '$lib/server/auth';
import { hasCapacity, toMin, blockUntilNextSlot } from '$lib/server/availability';

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
		categories: db.select().from(categories).orderBy(categories.sortOrder).all(),
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
		// Admin accounts are staff, not customers — they cannot place bookings.
		if (locals.user?.role === 'admin') {
			return fail(403, { error: "Connecté en tant qu'administrateur : les réservations ne sont pas disponibles." });
		}

		const data = await request.formData();
		const serviceId = Number(data.get('serviceId'));
		const date = String(data.get('date') || '');
		const startTime = String(data.get('startTime') || '');
		const option = String(data.get('option') || '').trim();
		const notes = String(data.get('notes') || '').trim();

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

		// Date-specific closure (public holiday or manual) → no bookings allowed.
		const [closure] = db.select().from(closures).where(eq(closures.date, date)).all();
		if (closure) return fail(400, { error: 'Nous sommes fermés ce jour-là.' });

		const dayOfWeek = new Date(date).getDay();
		const [avail] = db.select().from(availability)
			.where(and(eq(availability.dayOfWeek, dayOfWeek), eq(availability.active, true)))
			.all();
		if (!avail) return fail(400, { error: "Nous ne travaillons pas ce jour-là." });

		// Reject if no bed is free for this prestation during the chosen window.
		// Capacity = total_beds; each booking consumes its service's `beds`.
		const serviceBeds = service.beds ?? 1;
		const [bedsRow] = db.select().from(settings).where(eq(settings.key, 'total_beds')).all();
		const totalBeds = bedsRow ? Number(bedsRow.value) : 1;

		const startMin = sh * 60 + sm;
		const sameDay = db.select({
			startTime: bookings.startTime,
			endTime: bookings.endTime,
			beds: services.beds,
			bufferMinutes: services.bufferMinutes,
		})
			.from(bookings)
			.leftJoin(services, eq(bookings.serviceId, services.id))
			.where(and(eq(bookings.date, date), inArray(bookings.status, ['pending', 'confirmed'])))
			.all();

		// Each booking blocks its bed from its start until the next bookable slot
		// boundary after session end + studio prep buffer.
		const gridStart = toMin(avail.startTime);
		const intervals = sameDay.map((b) => ({
			s: toMin(b.startTime),
			e: blockUntilNextSlot(toMin(b.endTime) + (b.bufferMinutes ?? 0), gridStart),
			beds: b.beds ?? 1,
		}));

		// Reject if no bed is free for this prestation during the chosen window.
		const occupiedEnd = blockUntilNextSlot(endMinutes + (service.bufferMinutes ?? 0), gridStart);
		if (!hasCapacity({ startMin, endMin: occupiedEnd, serviceBeds, totalBeds, existing: intervals })) {
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
			option: option || null,
			notes: notes || null,
			createdAt: new Date(),
		}).run();

		redirect(302, '/reservation/confirmation');
	},
};
