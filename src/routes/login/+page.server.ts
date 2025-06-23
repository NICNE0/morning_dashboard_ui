// src/routes/login/+page.server.ts
import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { user } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import * as auth from '$lib/server/auth.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// If user is already logged in, redirect to home
	if (locals.user) {
		throw redirect(302, '/');
	}
};

export const actions: Actions = {
	login: async ({ request, cookies }) => {
		const formData = await request.formData();
		const username = formData.get('username')?.toString();
		const password = formData.get('password')?.toString();

		if (!username || !password) {
			return fail(400, {
				error: 'Username and password are required'
			});
		}

		// Find the user
		const existingUser = await db
			.select()
			.from(user)
			.where(eq(user.username, username))
			.limit(1);

		if (existingUser.length === 0) {
			return fail(400, {
				error: 'Invalid username or password'
			});
		}

		// Clear any existing session first
		const existingSessionToken = cookies.get(auth.sessionCookieName);
		if (existingSessionToken) {
			try {
				const { session } = await auth.validateSessionToken(existingSessionToken);
				if (session) {
					await auth.invalidateSession(session.id);
					console.log('Invalidated existing session');
				}
			} catch (error) {
				console.log('Error clearing existing session:', error);
			}
			// Always delete the cookie regardless
			auth.deleteSessionTokenCookie({ cookies } as any);
		}

		// Create fresh session
		const sessionToken = auth.generateSessionToken();
		const session = await auth.createSession(sessionToken, existingUser[0].id);
		
		console.log('Created session for user:', existingUser[0].username, 'with token:', sessionToken);
		
		// Set the new session cookie
		auth.setSessionTokenCookie({ cookies } as any, sessionToken, session.expiresAt);

		throw redirect(302, '/');
	}
};