// src/routes/logout/+page.server.ts
import { redirect } from '@sveltejs/kit';
import * as auth from '$lib/server/auth.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	if (locals.session) {
		await auth.invalidateSession(locals.session.id);
		auth.deleteSessionTokenCookie({ cookies } as any);
	}
	
	throw redirect(302, '/login');
};