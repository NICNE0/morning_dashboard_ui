import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { pgTable, serial, text } from 'drizzle-orm/pg-core';
import 'dotenv/config';

// Schema
const category = pgTable('category', {
	id: serial('id').primaryKey(),
	name: text('name').notNull().unique(),
	description: text('description')
});

// Database connection
const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString);
const db = drizzle(client);

async function createCategory(name, description = '') {
	try {
		console.log(`Creating category: ${name}`);
		
		const result = await db.insert(category).values({
			name: name.trim(),
			description: description.trim()
		}).returning();

		console.log('✅ Category created successfully!');
		console.log(`ID: ${result[0].id}`);
		console.log(`Name: ${result[0].name}`);
		console.log(`Description: ${result[0].description || '(no description)'}`);
		
		process.exit(0);
	} catch (error) {
		if (error.code === '23505') {
			console.error('❌ Error: Category with this name already exists');
		} else {
			console.error('❌ Error creating category:', error.message);
		}
		process.exit(1);
	}
}

// Get command line arguments
const args = process.argv.slice(2);
const name = args[0];
const description = args[1] || '';

if (!name) {
	console.log('Usage: node scripts/create-category.js "Category Name" "Optional description"');
	console.log('Example: node scripts/create-category.js "Development" "Programming resources"');
	process.exit(1);
}

createCategory(name, description);