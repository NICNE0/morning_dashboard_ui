import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { pgTable, serial, text } from 'drizzle-orm/pg-core';
import 'dotenv/config';

// Schema
const language = pgTable('language', {
	id: serial('id').primaryKey(),
	name: text('name').notNull().unique(),
	shortName: text('short_name').notNull().unique()
});

const tag = pgTable('tag', {
	id: serial('id').primaryKey(),
	name: text('name').notNull().unique()
});

// Database connection
const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString);
const db = drizzle(client);

// Initial languages to add
const initialLanguages = [
	{ name: 'English', shortName: 'en' },
	{ name: 'Spanish', shortName: 'es' },
	{ name: 'French', shortName: 'fr' },
	{ name: 'German', shortName: 'de' },
	{ name: 'Italian', shortName: 'it' },
	{ name: 'Portuguese', shortName: 'pt' },
	{ name: 'Japanese', shortName: 'ja' },
	{ name: 'Korean', shortName: 'ko' },
	{ name: 'Chinese', shortName: 'zh' },
	{ name: 'Russian', shortName: 'ru' },
	{ name: 'Swedish', shortName: 'sv' },
	{ name: 'Norwegian', shortName: 'no' },
	{ name: 'Danish', shortName: 'da' }
];

// Initial tags to add
const initialTags = [
	'documentation',
	'tutorial',
	'reference',
	'library',
	'database',
	'frontend',
	'backend',
	'design',
	'ux',
	'web'
];

async function setupLanguagesAndTags() {
	try {
		console.log('🌍 Setting up languages...');
		
		// Insert languages
		let languageCount = 0;
		for (const lang of initialLanguages) {
			try {
				await db.insert(language).values(lang);
				console.log(`✅ Added language: ${lang.name} (${lang.shortName})`);
				languageCount++;
			} catch (error) {
				if (error.code === '23505') {
					console.log(`⚠️  Language ${lang.name} already exists`);
				} else {
					console.error(`❌ Error adding language ${lang.name}:`, error.message);
				}
			}
		}
		
		console.log(`\n🏷️  Setting up tags...`);
		
		// Insert tags
		let tagCount = 0;
		for (const tagName of initialTags) {
			try {
				await db.insert(tag).values({ name: tagName });
				console.log(`✅ Added tag: ${tagName}`);
				tagCount++;
			} catch (error) {
				if (error.code === '23505') {
					console.log(`⚠️  Tag ${tagName} already exists`);
				} else {
					console.error(`❌ Error adding tag ${tagName}:`, error.message);
				}
			}
		}
		
		console.log(`\n🎉 Setup complete!`);
		console.log(`📊 Summary:`);
		console.log(`   Languages added: ${languageCount}`);
		console.log(`   Tags added: ${tagCount}`);
		
		process.exit(0);
	} catch (error) {
		console.error('❌ Setup failed:', error);
		process.exit(1);
	}
}

setupLanguagesAndTags();