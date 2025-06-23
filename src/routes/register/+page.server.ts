// src/routes/register/+page.server.ts
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
	register: async ({ request, cookies }) => {
		const formData = await request.formData();
		const username = formData.get('username')?.toString();
		const email = formData.get('email')?.toString();
		const password = formData.get('password')?.toString();

		if (!username || !password) {
			return fail(400, {
				error: 'Username and password are required',
				username,
				email
			});
		}

		if (username.length < 3) {
			return fail(400, {
				error: 'Username must be at least 3 characters long',
				username,
				email
			});
		}

		// Check if username already exists
		const existingUser = await db
			.select()
			.from(user)
			.where(eq(user.username, username))
			.limit(1);

		if (existingUser.length > 0) {
			return fail(400, {
				error: 'Username already exists',
				username,
				email
			});
		}

		// Check if email already exists (if provided)
		if (email) {
			const existingEmail = await db
				.select()
				.from(user)
				.where(eq(user.email, email))
				.limit(1);

			if (existingEmail.length > 0) {
				return fail(400, {
					error: 'Email already registered',
					username,
					email
				});
			}
		}

		try {
			// Create user
			const userId = crypto.randomUUID();
			const newUser = await db
				.insert(user)
				.values({
					id: userId,
					username: username,
					email: email || null
				})
				.returning();

			// Create session
			const sessionToken = auth.generateSessionToken();
			const session = await auth.createSession(sessionToken, newUser[0].id);
			
			auth.setSessionTokenCookie({ cookies } as any, sessionToken, session.expiresAt);

			throw redirect(302, '/');
		} catch (error) {
			console.error('Registration error:', error);
			return fail(500, {
				error: 'Failed to create account. Please try again.',
				username,
				email
			});
		}
	}
};