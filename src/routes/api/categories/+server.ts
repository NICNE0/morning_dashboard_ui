import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { category } from '$lib/server/db/schema.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		const categories = await db.select().from(category);
		return json(categories);
	} catch (error) {
		console.error('Error fetching categories:', error);
		return json({ error: 'Failed to fetch categories' }, { status: 500 });
	}
};