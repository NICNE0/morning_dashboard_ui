import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { language } from '$lib/server/db/schema.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		const languages = await db.select().from(language).orderBy(language.name);
		return json(languages);
	} catch (error) {
		console.error('Error fetching languages:', error);
		return json({ error: 'Failed to fetch languages' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { name, shortName } = await request.json();
		
		if (!name || !name.trim()) {
			return json({ error: 'Language name is required' }, { status: 400 });
		}
		
		if (!shortName || !shortName.trim()) {
			return json({ error: 'Language short name is required' }, { status: 400 });
		}

		const result = await db.insert(language).values({
			name: name.trim(),
			shortName: shortName.trim().toLowerCase()
		}).returning();

		return json(result[0], { status: 201 });
	} catch (err) {
		console.error('Error creating language:', err);
		const error = err as any;
		if (error?.code === '23505') {
			return json({ error: 'Language with this name already exists' }, { status: 409 });
		}
		return json({ error: 'Failed to create language' }, { status: 500 });
	}
};