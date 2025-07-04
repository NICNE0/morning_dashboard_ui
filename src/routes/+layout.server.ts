// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Always return fresh user data
	return {
		user: locals.user ? {
			id: locals.user.id,
			username: locals.user.username
		} : null
	};
};