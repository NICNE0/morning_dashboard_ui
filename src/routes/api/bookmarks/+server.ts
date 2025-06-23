// src/routes/api/bookmarks/+server.ts
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { category, site, language, tag, siteToTag } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		// Check authentication
		const userId = locals.user?.id;
		if (!userId) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
		
		// Get user's categories sorted alphabetically
		const categories = await db
			.select()
			.from(category)
			.where(eq(category.userId, userId))
			.orderBy(category.name);
		
		// Get user's sites with their language and tags
		const sites = await db.select({
			id: site.id,
			name: site.name,
			description: site.description,
			url: site.url,
			categoryId: site.categoryId,
			languageId: site.languageId,
			userId: site.userId,
			createdAt: site.createdAt,
			language: {
				id: language.id,
				name: language.name,
				shortName: language.shortName
			}
		})
		.from(site)
		.leftJoin(language, eq(site.languageId, language.id))
		.where(eq(site.userId, userId))
		.orderBy(site.name);
		
		// Get tags for user's sites
		const siteTags = await db.select({
			siteId: siteToTag.siteId,
			tag: {
				id: tag.id,
				name: tag.name,
				userId: tag.userId
			}
		})
		.from(siteToTag)
		.innerJoin(tag, and(
			eq(siteToTag.tagId, tag.id),
			eq(tag.userId, userId)
		))
		.innerJoin(site, and(
			eq(siteToTag.siteId, site.id),
			eq(site.userId, userId)
		));
		
		// Group tags by site
		const tagsBySite: Record<number, Array<{ id: number; name: string; userId: string }>> = {};
		siteTags.forEach(({ siteId, tag }) => {
			if (!tagsBySite[siteId]) {
				tagsBySite[siteId] = [];
			}
			tagsBySite[siteId].push(tag);
		});
		
		// Add tags to sites
		const sitesWithTags = sites.map(site => ({
			...site,
			tags: tagsBySite[site.id] || []
		}));
		
		// Group sites by category
		const bookmarksByCategory: Record<string, typeof sitesWithTags> = {};
		
		categories.forEach(cat => {
			const categorySites = sitesWithTags.filter(site => site.categoryId === cat.id);
			if (categorySites.length > 0) {
				bookmarksByCategory[cat.name] = categorySites;
			}
		});

		return json(bookmarksByCategory);
	} catch (error) {
		console.error('Error fetching bookmarks:', error);
		return json({ error: 'Failed to fetch bookmarks' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const userId = locals.user?.id;
		if (!userId) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
		
		const { name, url, description, categoryId, languageId, tagIds } = await request.json();
		
		if (!name || !name.trim()) {
			return json({ error: 'Site name is required' }, { status: 400 });
		}
		
		if (!url || !url.trim()) {
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

		// Verify language exists (if provided) - no user check needed since languages are global
		if (languageId) {
			const languageExists = await db
				.select()
				.from(language)
				.where(eq(language.id, parseInt(languageId)))
				.limit(1);
				
			if (languageExists.length === 0) {
				return json({ error: 'Language not found' }, { status: 403 });
			}
		}

		// Create the site
		const result = await db.insert(site).values({
			name: name.trim(),
			url: url.trim(),
			description: description?.trim() || null,
			categoryId: parseInt(categoryId),
			languageId: languageId ? parseInt(languageId) : null,
			userId: userId
		}).returning();

		const newSite = result[0];

		// Add tags if provided (verify they belong to user)
		if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
			// Verify all tags belong to the user
			const userTags = await db
				.select()
				.from(tag)
				.where(eq(tag.userId, userId));
			
			const validTagIds = userTags.map(t => t.id);
			const filteredTagIds = tagIds.filter(id => validTagIds.includes(parseInt(id)));
			
			if (filteredTagIds.length > 0) {
				const tagRelations = filteredTagIds.map(tagId => ({
					siteId: newSite.id,
					tagId: parseInt(tagId)
				}));

				await db.insert(siteToTag).values(tagRelations);
			}
		}

		return json(newSite, { status: 201 });
	} catch (err) {
		console.error('Error creating site:', err);
		return json({ error: 'Failed to create site' }, { status: 500 });
	}
};