// src/routes/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Check if user is authenticated
	if (!locals.user) {
		throw redirect(302, '/login'); // Redirect to login page
	}
	
	// Return user data if needed
	return {
		user: locals.user
	};
};