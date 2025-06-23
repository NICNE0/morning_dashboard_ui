// src/routes/api/tags/+server.ts
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { tag, siteToTag, site } from '$lib/server/db/schema.js';
import { eq, sql, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const userId = locals.user?.id;
		if (!userId) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
		
		const includeCounts = url.searchParams.get('counts') === 'true';
		
		if (includeCounts) {
			// Get tags with usage counts for user's sites only
			const tagsWithCounts = await db
				.select({
					id: tag.id,
					name: tag.name,
					count: sql<number>`count(${siteToTag.siteId})::int`
				})
				.from(tag)
				.leftJoin(siteToTag, eq(tag.id, siteToTag.tagId))
				.leftJoin(site, and(
					eq(siteToTag.siteId, site.id),
					eq(site.userId, userId)
				))
				.where(eq(tag.userId, userId))
				.groupBy(tag.id, tag.name)
				.orderBy(tag.name);
			
			return json(tagsWithCounts);
		} else {
			// Get all user's tags without counts
			const tags = await db
				.select()
				.from(tag)
				.where(eq(tag.userId, userId))
				.orderBy(tag.name);
				
			return json(tags);
		}
	} catch (error) {
		console.error('Error fetching tags:', error);
		return json({ error: 'Failed to fetch tags' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const userId = locals.user?.id;
		if (!userId) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
		
		const { name } = await request.json();
		
		if (!name || !name.trim()) {
			return json({ error: 'Tag name is required' }, { status: 400 });
		}

		// Check if tag name already exists for this user
		const existingTag = await db
			.select()
			.from(tag)
			.where(and(
				eq(tag.name, name.trim().toLowerCase()),
				eq(tag.userId, userId)
			))
			.limit(1);
			
		if (existingTag.length > 0) {
			return json({ error: 'Tag with this name already exists' }, { status: 409 });
		}

		const result = await db.insert(tag).values({
			name: name.trim().toLowerCase(),
			userId: userId
		}).returning();

		return json(result[0], { status: 201 });
	} catch (err) {
		console.error('Error creating tag:', err);
		return json({ error: 'Failed to create tag' }, { status: 500 });
	}
};