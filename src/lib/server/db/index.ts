import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import * as schema from './schema.js';

// Database connection
const connectionString = env.DATABASE_URL || 'postgresql://localhost:5432/bookmarks_dev';
const client = postgres(connectionString);
export const db = drizzle(client, { schema });