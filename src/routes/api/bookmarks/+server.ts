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

export const PUT: RequestHandler = async ({ url, request }) => {
	try {
		const id = parseInt(url.pathname.split('/').pop() || '');
		if (!id) {
			return json({ error: 'Invalid bookmark ID' }, { status: 400 });
		}

		const { name, url: bookmarkUrl, description, categoryId } = await request.json();
		
		if (!name || !name.trim()) {
			return json({ error: 'Site name is required' }, { status: 400 });
		}
		
		if (!bookmarkUrl || !bookmarkUrl.trim()) {
			return json({ error: 'URL is required' }, { status: 400 });
		}
		
		if (!categoryId) {
			return json({ error: 'Category is required' }, { status: 400 });
		}

		// Update the bookmark
		const result = await db.update(site)
			.set({
				name: name.trim(),
				url: bookmarkUrl.trim(),
				description: description?.trim() || null,
				categoryId: parseInt(categoryId)
			})
			.where(eq(site.id, id))
			.returning();

		if (result.length === 0) {
			return json({ error: 'Bookmark not found' }, { status: 404 });
		}

		return json(result[0]);
	} catch (err) {
		console.error('Error updating bookmark:', err);
		return json({ error: 'Failed to update bookmark' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ url }) => {
	try {
		const id = parseInt(url.pathname.split('/').pop() || '');
		if (!id) {
			return json({ error: 'Invalid bookmark ID' }, { status: 400 });
		}

		const result = await db.delete(site)
			.where(eq(site.id, id))
			.returning();

		if (result.length === 0) {
			return json({ error: 'Bookmark not found' }, { status: 404 });
		}

		return json({ message: 'Bookmark deleted successfully' });
	} catch (err) {
		console.error('Error deleting bookmark:', err);
		return json({ error: 'Failed to delete bookmark' }, { status: 500 });
	}
};