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

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { name, description } = await request.json();
		
		if (!name || !name.trim()) {
			return json({ error: 'Category name is required' }, { status: 400 });
		}

		const result = await db.insert(category).values({
			name: name.trim(),
			description: description?.trim() || null
		}).returning();

		return json(result[0], { status: 201 });
	} catch (err) {
		console.error('Error creating category:', err);
		// Type-safe error handling
		const error = err as any;
		if (error?.code === '23505') {
			return json({ error: 'Category with this name already exists' }, { status: 409 });
		}
		return json({ error: 'Failed to create category' }, { status: 500 });
	}
};