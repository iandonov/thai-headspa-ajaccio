import type { Handle } from '@sveltejs/kit';
import { getUserFromToken } from '$lib/server/auth';
import { initDatabase } from '$lib/server/init';

initDatabase();

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get('session');
	const user = await getUserFromToken(token);
	event.locals.user = user
		? {
				id: user.id,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				role: user.role,
			}
		: null;

	return resolve(event);
};
