import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { category, site } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		// Get all categories with their sites
		const categories = await db.select().from(category);
		
		// Get all sites
		const sites = await db.select().from(site);
		
		// Group sites by category
		const bookmarksByCategory: Record<string, typeof sites> = {};
		
		categories.forEach(cat => {
			bookmarksByCategory[cat.name] = sites.filter(site => site.categoryId === cat.id);
		});

		return json(bookmarksByCategory);
	} catch (error) {
		console.error('Error fetching bookmarks:', error);
		return json({ error: 'Failed to fetch bookmarks' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { name, url, description, categoryId } = await request.json();
		
		if (!name || !name.trim()) {
			return json({ error: 'Site name is required' }, { status: 400 });
		}
		
		if (!url || !url.trim()) {
			return json({ error: 'URL is required' }, { status: 400 });
		}
		
		if (!categoryId) {
			return json({ error: 'Category is required' }, { status: 400 });
		}

		const result = await db.insert(site).values({
			name: name.trim(),
			url: url.trim(),
			description: description?.trim() || null,
			categoryId: parseInt(categoryId)
		}).returning();

		return json(result[0], { status: 201 });
	} catch (err) {
		console.error('Error creating site:', err);
		return json({ error: 'Failed to create site' }, { status: 500 });
	}
};