// scripts/create-sample-data.ts
import { db } from '../src/lib/server/db/index.js';
import { user, category, language, tag, site, siteToTag } from '../src/lib/server/db/schema.js';
import { generateSessionToken, createSession } from '../src/lib/server/auth.js';

async function createSampleData() {
	try {
		// Create sample users
		const sampleUsers = await db.insert(user).values([
			{
				id: 'user-1',
				username: 'alice',
				email: 'alice@example.com'
			},
			{
				id: 'user-2', 
				username: 'bob',
				email: 'bob@example.com'
			}
		]).returning();

		console.log('Created users:', sampleUsers);

		// Create sessions for users (optional, for testing)
		for (const user of sampleUsers) {
			const token = generateSessionToken();
			await createSession(token, user.id);
			console.log(`Session token for ${user.username}: ${token}`);
		}

		// Create global languages (no userId)
		const languages = await db.insert(language).values([
			{ name: 'English', shortName: 'en' },
			{ name: 'Spanish', shortName: 'es' },
			{ name: 'French', shortName: 'fr' },
			{ name: 'German', shortName: 'de' },
			{ name: 'Japanese', shortName: 'ja' }
		]).returning();

		console.log('Created global languages:', languages);

		// Create sample data for Alice (user-1)
		const aliceCategories = await db.insert(category).values([
			{ name: 'Development', description: 'Programming resources', userId: 'user-1' },
			{ name: 'Design', description: 'Design inspiration', userId: 'user-1' },
			{ name: 'News', description: 'Tech news', userId: 'user-1' }
		]).returning();

		const aliceTags = await db.insert(tag).values([
			{ name: 'javascript', userId: 'user-1' },
			{ name: 'react', userId: 'user-1' },
			{ name: 'ui', userId: 'user-1' },
			{ name: 'tutorial', userId: 'user-1' }
		]).returning();

		const aliceSites = await db.insert(site).values([
			{
				name: 'MDN Web Docs',
				url: 'https://developer.mozilla.org',
				description: 'Comprehensive web development documentation',
				categoryId: aliceCategories[0].id,
				languageId: languages.find(l => l.shortName === 'en')?.id,
				userId: 'user-1'
			},
			{
				name: 'Dribbble',
				url: 'https://dribbble.com',
				description: 'Design inspiration and portfolio showcase',
				categoryId: aliceCategories[1].id,
				languageId: languages.find(l => l.shortName === 'en')?.id,
				userId: 'user-1'
			},
			{
				name: 'React Documentation',
				url: 'https://react.dev',
				description: 'Official React documentation',
				categoryId: aliceCategories[0].id,
				languageId: languages.find(l => l.shortName === 'en')?.id,
				userId: 'user-1'
			}
		]).returning();

		// Add tags to sites
		await db.insert(siteToTag).values([
			{ siteId: aliceSites[0].id, tagId: aliceTags[0].id }, // MDN + javascript
			{ siteId: aliceSites[0].id, tagId: aliceTags[3].id }, // MDN + tutorial
			{ siteId: aliceSites[1].id, tagId: aliceTags[2].id }, // Dribbble + ui
			{ siteId: aliceSites[2].id, tagId: aliceTags[0].id }, // React + javascript
			{ siteId: aliceSites[2].id, tagId: aliceTags[1].id }  // React + react
		]);

		// Create sample data for Bob (user-2)
		const bobCategories = await db.insert(category).values([
			{ name: 'Learning', description: 'Educational content', userId: 'user-2' },
			{ name: 'Tools', description: 'Useful development tools', userId: 'user-2' },
			{ name: 'Reference', description: 'Quick reference guides', userId: 'user-2' }
		]).returning();

		const bobTags = await db.insert(tag).values([
			{ name: 'python', userId: 'user-2' },
			{ name: 'productivity', userId: 'user-2' },
			{ name: 'api', userId: 'user-2' },
			{ name: 'documentation', userId: 'user-2' }
		]).returning();

		const bobSites = await db.insert(site).values([
			{
				name: 'Python.org',
				url: 'https://python.org',
				description: 'Official Python programming language website',
				categoryId: bobCategories[0].id,
				languageId: languages.find(l => l.shortName === 'en')?.id,
				userId: 'user-2'
			},
			{
				name: 'Postman',
				url: 'https://postman.com',
				description: 'API development and testing tool',
				categoryId: bobCategories[1].id,
				languageId: languages.find(l => l.shortName === 'en')?.id,
				userId: 'user-2'
			},
			{
				name: 'Stack Overflow',
				url: 'https://stackoverflow.com',
				description: 'Programming questions and answers',
				categoryId: bobCategories[2].id,
				languageId: languages.find(l => l.shortName === 'en')?.id,
				userId: 'user-2'
			}
		]).returning();

		await db.insert(siteToTag).values([
			{ siteId: bobSites[0].id, tagId: bobTags[0].id }, // Python.org + python
			{ siteId: bobSites[0].id, tagId: bobTags[3].id }, // Python.org + documentation
			{ siteId: bobSites[1].id, tagId: bobTags[2].id }, // Postman + api
			{ siteId: bobSites[1].id, tagId: bobTags[1].id }, // Postman + productivity
			{ siteId: bobSites[2].id, tagId: bobTags[3].id }  // Stack Overflow + documentation
		]);

		console.log('Sample data created successfully!');
		console.log('Alice has:', aliceCategories.length, 'categories,', aliceSites.length, 'sites');
		console.log('Bob has:', bobCategories.length, 'categories,', bobSites.length, 'sites');
		console.log('Global languages:', languages.length);

	} catch (error) {
		console.error('Error creating sample data:', error);
	}
}

// Run the script
createSampleData().then(() => {
	console.log('Done!');
	process.exit(0);
}).catch(error => {
	console.error('Script failed:', error);
	process.exit(1);
});