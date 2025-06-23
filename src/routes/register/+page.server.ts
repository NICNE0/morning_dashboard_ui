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
				error: 'Invalid username',
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
					error: 'Invalid e-mail',
					username,
					email
				});
			}
		}

		// Create user - don't wrap redirect in try/catch
		const userId = crypto.randomUUID();
		
		try {
			const newUser = await db
				.insert(user)
				.values({
					id: userId,
					username: username,
					email: email || null
				})
				.returning();

			console.log('User created successfully:', newUser[0].username);

			// Return success data in proper SvelteKit format
			return {
				success: true,
				message: `Account created successfully! Welcome ${newUser[0].username}! You can now sign in.`,
				username: newUser[0].username,
				email: email
			};

		} catch (error) {
			console.error('Database error during registration:', error);
			return fail(500, {
				error: 'Failed to create account. Please try again.',
				username,
				email
			});
		}
	}
};