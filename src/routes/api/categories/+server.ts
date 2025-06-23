// src/routes/api/categories/+server.ts
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { category } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		const userId = locals.user?.id;
		if (!userId) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
		
		const categories = await db
			.select()
			.from(category)
			.where(eq(category.userId, userId))
			.orderBy(category.name);
			
		return json(categories);
	} catch (error) {
		console.error('Error fetching categories:', error);
		return json({ error: 'Failed to fetch categories' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const userId = locals.user?.id;
		if (!userId) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
		
		const { name, description } = await request.json();
		
		if (!name || !name.trim()) {
			return json({ error: 'Category name is required' }, { status: 400 });
		}

		// Check if category name already exists for this user
		const existingCategory = await db
			.select()
			.from(category)
			.where(and(
				eq(category.name, name.trim()),
				eq(category.userId, userId)
			))
			.limit(1);
			
		if (existingCategory.length > 0) {
			return json({ error: 'Category with this name already exists' }, { status: 409 });
		}

		const result = await db.insert(category).values({
			name: name.trim(),
			description: description?.trim() || null,
			userId: userId
		}).returning();

		return json(result[0], { status: 201 });
	} catch (err) {
		console.error('Error creating category:', err);
		return json({ error: 'Failed to create category' }, { status: 500 });
	}
};