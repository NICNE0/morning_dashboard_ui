import { pgTable, serial, integer, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Language table
export const language = pgTable('language', {
	id: serial('id').primaryKey(),
	name: text('name').notNull().unique(), 
	shortName: text('short_name').notNull().unique()
});

// Tag table
export const tag = pgTable('tag', {
	id: serial('id').primaryKey(),
	name: text('name').notNull().unique()
});

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
	languageId: integer('language_id')
		.references(() => language.id), 
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
		.notNull()
		.defaultNow()
});

// Many-to-many relationship table between sites and tags
export const siteToTag = pgTable('site_to_tag', {
	id: serial('id').primaryKey(),
	siteId: integer('site_id')
		.notNull()
		.references(() => site.id, { onDelete: 'cascade' }),
	tagId: integer('tag_id')
		.notNull()
		.references(() => tag.id, { onDelete: 'cascade' })
});

// Define relationships
export const languageRelations = relations(language, ({ many }) => ({
	sites: many(site)
}));

export const tagRelations = relations(tag, ({ many }) => ({
	siteToTags: many(siteToTag)
}));

export const categoryRelations = relations(category, ({ many }) => ({
	sites: many(site)
}));

export const siteRelations = relations(site, ({ one, many }) => ({
	category: one(category, {
		fields: [site.categoryId],
		references: [category.id]
	}),
	language: one(language, {
		fields: [site.languageId],
		references: [language.id]
	}),
	siteToTags: many(siteToTag)
}));

export const siteToTagRelations = relations(siteToTag, ({ one }) => ({
	site: one(site, {
		fields: [siteToTag.siteId],
		references: [site.id]
	}),
	tag: one(tag, {
		fields: [siteToTag.tagId],
		references: [tag.id]
	})
}));

// Type exports
export type Language = typeof language.$inferSelect;
export type Tag = typeof tag.$inferSelect;
export type Category = typeof category.$inferSelect;
export type Site = typeof site.$inferSelect;
export type SiteToTag = typeof siteToTag.$inferSelect;

export type NewLanguage = typeof language.$inferInsert;
export type NewTag = typeof tag.$inferInsert;
export type NewCategory = typeof category.$inferInsert;
export type NewSite = typeof site.$inferInsert;
export type NewSiteToTag = typeof siteToTag.$inferInsert;

// Extended types for queries with relations
export type SiteWithRelations = Site & {
	category: Category;
	language?: Language;
	tags: Tag[];
};

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