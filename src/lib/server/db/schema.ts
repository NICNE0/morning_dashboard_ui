import { pgTable, serial, integer, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Category table
export const category = pgTable('category', {
	id: serial('id').primaryKey(),
	name: text('name').notNull().unique(),
	description: text('description')
});

// Site/Bookmark table
export const site = pgTable('site', {
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

// Define relationships
export const categoryRelations = relations(category, ({ many }) => ({
	sites: many(site)
}));

export const siteRelations = relations(site, ({ one }) => ({
	category: one(category, {
		fields: [site.categoryId],
		references: [category.id]
	})
}));

// Type exports
export type Category = typeof category.$inferSelect;
export type Site = typeof site.$inferSelect;
export type NewCategory = typeof category.$inferInsert;
export type NewSite = typeof site.$inferInsert;

// Keep your existing user/session tables if you need them later
export const user = pgTable('user', {
	id: text('id').primaryKey(),
	age: integer('age')
});

export const session = pgTable('session', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull()
});

export type Session = typeof session.$inferSelect;
export type User = typeof user.$inferSelect;