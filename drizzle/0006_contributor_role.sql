ALTER TYPE "public"."user_role" ADD VALUE 'contributor';--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "review_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "review_note" text;