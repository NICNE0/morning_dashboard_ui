import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { site, siteToTag } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const id = parseInt(params.id);
		if (!id || isNaN(id)) {
			return json({ error: 'Invalid bookmark ID' }, { status: 400 });
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

		// Update the site
		const result = await db.update(site)
			.set({
				name: name.trim(),
				url: bookmarkUrl.trim(),
				description: description?.trim() || null,
				categoryId: parseInt(categoryId),
				languageId: languageId ? parseInt(languageId) : null
			})
			.where(eq(site.id, id))
			.returning();

		if (result.length === 0) {
			return json({ error: 'Bookmark not found' }, { status: 404 });
		}

		// Update tags - remove existing and add new ones
		await db.delete(siteToTag).where(eq(siteToTag.siteId, id));
		
		if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
			const tagRelations = tagIds.map(tagId => ({
				siteId: id,
				tagId: parseInt(tagId)
			}));

			await db.insert(siteToTag).values(tagRelations);
		}

		return json(result[0]);
	} catch (err) {
		console.error('Error updating bookmark:', err);
		return json({ error: 'Failed to update bookmark' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const id = parseInt(params.id);
		if (!id || isNaN(id)) {
			return json({ error: 'Invalid bookmark ID' }, { status: 400 });
		}

		// Delete the site (tags will be deleted automatically due to CASCADE)
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