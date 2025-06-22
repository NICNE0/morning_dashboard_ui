import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { tag, siteToTag, site } from '$lib/server/db/schema.js';
import { eq, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const includeCounts = url.searchParams.get('counts') === 'true';
		
		if (includeCounts) {
			// Get tags with usage counts
			const tagsWithCounts = await db
				.select({
					id: tag.id,
					name: tag.name,
					count: sql<number>`count(${siteToTag.siteId})::int`
				})
				.from(tag)
				.leftJoin(siteToTag, eq(tag.id, siteToTag.tagId))
				.groupBy(tag.id, tag.name)
				.orderBy(tag.name);
			
			return json(tagsWithCounts);
		} else {
			// Get all tags without counts
			const tags = await db.select().from(tag).orderBy(tag.name);
			return json(tags);
		}
	} catch (error) {
		console.error('Error fetching tags:', error);
		return json({ error: 'Failed to fetch tags' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { name } = await request.json();
		
		if (!name || !name.trim()) {
			return json({ error: 'Tag name is required' }, { status: 400 });
		}

		const result = await db.insert(tag).values({
			name: name.trim().toLowerCase()
		}).returning();

		return json(result[0], { status: 201 });
	} catch (err) {
		console.error('Error creating tag:', err);
		const error = err as any;
		if (error?.code === '23505') {
			return json({ error: 'Tag with this name already exists' }, { status: 409 });
		}
		return json({ error: 'Failed to create tag' }, { status: 500 });
	}
};