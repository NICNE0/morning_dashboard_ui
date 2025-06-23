// src/routes/api/languages/+server.ts
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { language } from '$lib/server/db/schema.js';
import { eq, or, isNull, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		const userId = locals.user?.id;
		if (!userId) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
		
		// Get both global languages (userId is null) and user-specific languages
		const languages = await db
			.select()
			.from(language)
			.where(or(
				isNull(language.userId), // Global languages
				eq(language.userId, userId) // User's languages
			))
			.orderBy(language.name);
			
		return json(languages);
	} catch (error) {
		console.error('Error fetching languages:', error);
		return json({ error: 'Failed to fetch languages' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const userId = locals.user?.id;
		if (!userId) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
		
		const { name, shortName, isGlobal = false } = await request.json();
		
		if (!name || !name.trim()) {
			return json({ error: 'Language name is required' }, { status: 400 });
		}
		
		if (!shortName || !shortName.trim()) {
			return json({ error: 'Language short name is required' }, { status: 400 });
		}

		// Check if language name already exists (for user or globally)
		const existingLanguage = await db
			.select()
			.from(language)
			.where(and(
				eq(language.name, name.trim()),
				isGlobal ? isNull(language.userId) : eq(language.userId, userId)
			))
			.limit(1);
			
		if (existingLanguage.length > 0) {
			return json({ error: 'Language with this name already exists' }, { status: 409 });
		}

		const result = await db.insert(language).values({
			name: name.trim(),
			shortName: shortName.trim().toLowerCase(),
			userId: isGlobal ? null : userId // null for global, userId for user-specific
		}).returning();

		return json(result[0], { status: 201 });
	} catch (err) {
		console.error('Error creating language:', err);
		return json({ error: 'Failed to create language' }, { status: 500 });
	}
};