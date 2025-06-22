import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { category, site, language, tag, siteToTag } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		// Get all categories sorted alphabetically
		const categories = await db.select().from(category).orderBy(category.name);
		
		// Get all sites with their language and tags
		const sites = await db.select({
			id: site.id,
			name: site.name,
			description: site.description,
			url: site.url,
			categoryId: site.categoryId,
			languageId: site.languageId,
			createdAt: site.createdAt,
			language: {
				id: language.id,
				name: language.name,
				shortName: language.shortName
			}
		})
		.from(site)
		.leftJoin(language, eq(site.languageId, language.id))
		.orderBy(site.name); // Sort sites alphabetically
		
		// Get tags for each site
		const siteTags = await db.select({
			siteId: siteToTag.siteId,
			tag: {
				id: tag.id,
				name: tag.name
			}
		})
		.from(siteToTag)
		.innerJoin(tag, eq(siteToTag.tagId, tag.id));
		
		// Group tags by site
		const tagsBySite: Record<number, typeof tag.$inferSelect[]> = {};
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
		
		// Group sites by category (already sorted alphabetically)
		const bookmarksByCategory: Record<string, typeof sitesWithTags> = {};
		
		categories.forEach(cat => {
			const categorySites = sitesWithTags.filter(site => site.categoryId === cat.id);
			if (categorySites.length > 0) {
				// Sites are already sorted alphabetically from the query
				bookmarksByCategory[cat.name] = categorySites;
			}
		});

		return json(bookmarksByCategory);
	} catch (error) {
		console.error('Error fetching bookmarks:', error);
		return json({ error: 'Failed to fetch bookmarks' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
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

		// Create the site
		const result = await db.insert(site).values({
			name: name.trim(),
			url: url.trim(),
			description: description?.trim() || null,
			categoryId: parseInt(categoryId),
			languageId: languageId ? parseInt(languageId) : null
		}).returning();

		const newSite = result[0];

		// Add tags if provided
		if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
			const tagRelations = tagIds.map(tagId => ({
				siteId: newSite.id,
				tagId: parseInt(tagId)
			}));

			await db.insert(siteToTag).values(tagRelations);
		}

		return json(newSite, { status: 201 });
	} catch (err) {
		console.error('Error creating site:', err);
		return json({ error: 'Failed to create site' }, { status: 500 });
	}
};