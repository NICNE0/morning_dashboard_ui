import type { Config } from 'drizzle-kit';

export default {
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',  // Changed from 'driver: pg'
	dbCredentials: {
		url: process.env.DATABASE_URL || 'postgresql://localhost:5432/bookmarks_dev'  // Changed from 'connectionString'
	}
} satisfies Config;