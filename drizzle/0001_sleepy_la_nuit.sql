CREATE TABLE "language" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	CONSTRAINT "language_name_unique" UNIQUE("name"),
	CONSTRAINT "language_short_name_unique" UNIQUE("short_name")
);
--> statement-breakpoint
CREATE TABLE "site_to_tag" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"tag_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tag" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "tag_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "site" ADD COLUMN "language_id" integer;--> statement-breakpoint
ALTER TABLE "site_to_tag" ADD CONSTRAINT "site_to_tag_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_to_tag" ADD CONSTRAINT "site_to_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site" ADD CONSTRAINT "site_language_id_language_id_fk" FOREIGN KEY ("language_id") REFERENCES "public"."language"("id") ON DELETE no action ON UPDATE no action;