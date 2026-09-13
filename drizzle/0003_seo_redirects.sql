CREATE TABLE "redirects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_path" text NOT NULL,
	"to_path" text NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"hits" integer DEFAULT 0 NOT NULL,
	"last_hit_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "redirects_from_path_unique" UNIQUE("from_path")
);
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "focus_keyword" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "canonical_url" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "noindex" boolean DEFAULT false NOT NULL;