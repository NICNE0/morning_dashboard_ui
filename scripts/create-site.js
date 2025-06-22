import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { pgTable, serial, integer, text, timestamp } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';
import 'dotenv/config';

// Schema
const category = pgTable('category', {
	id: serial('id').primaryKey(),
	name: text('name').notNull().unique(),
	description: text('description')
});

const site = pgTable('site', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
	url: text('url').notNull(),
	categoryId: integer('category_id')
		.notNull()
		.references(() => category.id),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
		.notNull()
		.defaultNow()
});

// Database connection
const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString);
const db = drizzle(client);

async function createSite(name, url, categoryName, description = '') {
	try {
		console.log(`Creating site: ${name}`);
		
		// First, find the category
		const categories = await db.select()
			.from(category)
			.where(eq(category.name, categoryName));
		
		if (categories.length === 0) {
			console.error(`❌ Error: Category "${categoryName}" does not exist`);
			console.log('Available categories:');
			const allCategories = await db.select().from(category);
			allCategories.forEach(cat => console.log(`  - ${cat.name}`));
			process.exit(1);
		}

		const categoryId = categories[0].id;

		// Create the site
		const result = await db.insert(site).values({
			name: name.trim(),
			url: url.trim(),
			description: description.trim(),
			categoryId: categoryId
		}).returning();

		console.log('✅ Site created successfully!');
		console.log(`ID: ${result[0].id}`);
		console.log(`Name: ${result[0].name}`);
		console.log(`URL: ${result[0].url}`);
		console.log(`Description: ${result[0].description || '(no description)'}`);
		console.log(`Category: ${categoryName}`);
		
		process.exit(0);
	} catch (error) {
		console.error('❌ Error creating site:', error.message);
		process.exit(1);
	}
}

// Get command line arguments
const args = process.argv.slice(2);
const name = args[0];
const url = args[1];
const categoryName = args[2];
const description = args[3] || '';

if (!name || !url || !categoryName) {
	console.log('Usage: node scripts/create-site.js "Site Name" "URL" "Category Name" "Optional description"');
	console.log('Example: node scripts/create-site.js "GitHub" "https://github.com" "Development" "Code hosting platform"');
	process.exit(1);
}

createSite(name, url, categoryName, description);