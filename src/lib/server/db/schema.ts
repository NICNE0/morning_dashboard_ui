import { pgTable, serial, integer, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// User table - enhanced with more fields
export const user = pgTable('user', {
	id: text('id').primaryKey(),
	username: text('username').notNull().unique(),
	email: text('email').unique(),
	age: integer('age'),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
		.notNull()
		.defaultNow()
});

// Session table
export const session = pgTable('session', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull()
});

// Language table - GLOBAL, no user_id
export const language = pgTable('language', {
	id: serial('id').primaryKey(),
	name: text('name').notNull().unique(),
	shortName: text('short_name').notNull().unique()
});

// Tag table - user-specific, user_id is mandatory
export const tag = pgTable('tag', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' })
}, (table) => ({
	// Ensure unique tag names per user
	uniqueTagPerUser: unique().on(table.name, table.userId)
}));

// Category table - user-specific, user_id is mandatory
export const category = pgTable('category', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' })
}, (table) => ({
	// Ensure unique category names per user
	uniqueCategoryPerUser: unique().on(table.name, table.userId)
}));

// Site/Bookmark table - user-specific, user_id is mandatory
export const site = pgTable('site', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
	url: text('url').notNull(),
	categoryId: integer('category_id')
		.notNull()
		.references(() => category.id, { onDelete: 'cascade' }),
	languageId: integer('language_id')
		.references(() => language.id, { onDelete: 'set null' }),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
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
export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	sites: many(site),
	categories: many(category),
	tags: many(tag)
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	})
}));

export const languageRelations = relations(language, ({ many }) => ({
	sites: many(site)
}));

export const tagRelations = relations(tag, ({ many, one }) => ({
	siteToTags: many(siteToTag),
	user: one(user, {
		fields: [tag.userId],
		references: [user.id]
	})
}));

export const categoryRelations = relations(category, ({ many, one }) => ({
	sites: many(site),
	user: one(user, {
		fields: [category.userId],
		references: [user.id]
	})
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
	user: one(user, {
		fields: [site.userId],
		references: [user.id]
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
export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;
export type Language = typeof language.$inferSelect;
export type Tag = typeof tag.$inferSelect;
export type Category = typeof category.$inferSelect;
export type Site = typeof site.$inferSelect;
export type SiteToTag = typeof siteToTag.$inferSelect;

export type NewUser = typeof user.$inferInsert;
export type NewSession = typeof session.$inferInsert;
export type NewLanguage = typeof language.$inferInsert;
export type NewTag = typeof tag.$inferInsert;
export type NewCategory = typeof category.$inferInsert;
export type NewSite = typeof site.$inferInsert;
export type NewSiteToTag = typeof siteToTag.$inferInsert;

// Extended types for queries with relations
export type SiteWithRelations = Site & {
	category: Category;
	language?: Language;
	user: User;
	tags: Tag[];
};

export type UserWithData = User & {
	sites: SiteWithRelations[];
	categories: Category[];
	tags: Tag[];
};