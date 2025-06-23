// src/routes/api/bookmarks/[id]/+server.ts
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { site, siteToTag, category, tag } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	try {
		const userId = locals.user?.id;
		if (!userId) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
		
		const id = parseInt(params.id);
		if (!id || isNaN(id)) {
			return json({ error: 'Invalid bookmark ID' }, { status: 400 });
		}

		// Verify the bookmark belongs to the user
		const existingSite = await db
			.select()
			.from(site)
			.where(and(
				eq(site.id, id),
				eq(site.userId, userId)
			))
			.limit(1);
			
		if (existingSite.length === 0) {
			return json({ error: 'Bookmark not found or access denied' }, { status: 404 });
		}

		const { name, url: bookmarkUrl, description, categoryId, languageId, tagIds } = await request.json();
		
		if (!name || !name.trim()) {
			return json({ error: 'Site name is required' }, { status: 400 });
		}
		
		if (!bookmarkUrl || !bookmarkUrl.trim()) {
			return json({ error: 'URL is required' }, { status: 400 });
		}
		
		if (!categoryId) {
			return json({ error: 'Category is required' }, { status: 400 });
		}

		// Verify category belongs to user
		const userCategory = await db
			.select()
			.from(category)
			.where(and(
				eq(category.id, parseInt(categoryId)),
				eq(category.userId, userId)
			))
			.limit(1);
			
		if (userCategory.length === 0) {
			return json({ error: 'Category not found or access denied' }, { status: 403 });
		}

		// Update the site
		const result = await db.update(site)
			.set({
				name: name.trim(),
				url: bookmarkUrl.trim(),
				description: description?.trim() || null,
				categoryId: parseInt(categoryId),
				languageId: languageId ? parseInt(languageId) : null
			})
			.where(and(
				eq(site.id, id),
				eq(site.userId, userId)
			))
			.returning();

		if (result.length === 0) {
			return json({ error: 'Failed to update bookmark' }, { status: 500 });
		}

		// Update tags - remove existing and add new ones
		await db.delete(siteToTag).where(eq(siteToTag.siteId, id));
		
		if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
			// Verify all tags belong to the user
			const userTags = await db
				.select()
				.from(tag)
				.where(eq(tag.userId, userId));
			
			const validTagIds = userTags.map(t => t.id);
			const filteredTagIds = tagIds.filter(tagId => validTagIds.includes(parseInt(tagId)));
			
			if (filteredTagIds.length > 0) {
				const tagRelations = filteredTagIds.map(tagId => ({
					siteId: id,
					tagId: parseInt(tagId)
				}));

				await db.insert(siteToTag).values(tagRelations);
			}
		}

		return json(result[0]);
	} catch (err) {
		console.error('Error updating bookmark:', err);
		return json({ error: 'Failed to update bookmark' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		const userId = locals.user?.id;
		if (!userId) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
		
		const id = parseInt(params.id);
		if (!id || isNaN(id)) {
			return json({ error: 'Invalid bookmark ID' }, { status: 400 });
		}

		// Delete the site (only if it belongs to the user)
		const result = await db.delete(site)
			.where(and(
				eq(site.id, id),
				eq(site.userId, userId)
			))
			.returning();

		if (result.length === 0) {
			return json({ error: 'Bookmark not found or access denied' }, { status: 404 });
		}

		return json({ message: 'Bookmark deleted successfully' });
	} catch (err) {
		console.error('Error deleting bookmark:', err);
		return json({ error: 'Failed to delete bookmark' }, { status: 500 });
	}
};