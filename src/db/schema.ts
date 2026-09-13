import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/* ---------------------------------- People ---------------------------------- */

/** admin: everything incl. users & settings. editor: all content. */
export const userRole = pgEnum("user_role", ["admin", "editor"]);

/** Public byline shown on articles and (later) author pages. Not every author needs a login. */
export const authors = pgTable("authors", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  jobTitle: text("job_title"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  websiteUrl: text("website_url"),
  /** Social/profile URLs (X, LinkedIn, GitHub…) — used for JSON-LD sameAs. */
  sameAs: text("same_as").array().notNull().default(sql`'{}'::text[]`),
  ...timestamps,
});

/** People who can sign in to /admin. Access is invite-only: a row must exist before Google sign-in succeeds. */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name"),
    image: text("image"),
    role: userRole("role").notNull().default("editor"),
    authorId: uuid("author_id").references(() => authors.id, { onDelete: "set null" }),
    invitedById: uuid("invited_by_id"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_lower_idx").on(sql`lower(${t.email})`), uniqueIndex("users_author_idx").on(t.authorId)],
);

/* ---------------------------------- Content --------------------------------- */

export const postStatus = pgEnum("post_status", ["draft", "scheduled", "published"]);
export const contentFormat = pgEnum("content_format", ["markdown", "html"]);

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  /** Order in the public category bar. */
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull(),
    content: text("content").notNull().default(""),
    contentFormat: contentFormat("content_format").notNull().default("markdown"),
    status: postStatus("status").notNull().default("draft"),
    featured: boolean("featured").notNull().default(false),
    coverSrc: text("cover_src"),
    coverAlt: text("cover_alt"),
    coverWidth: integer("cover_width"),
    coverHeight: integer("cover_height"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    /** Main search phrase the post targets (drives the editor's SEO checklist). */
    focusKeyword: text("focus_keyword"),
    /** Set when the article was first published elsewhere. */
    canonicalUrl: text("canonical_url"),
    /** Keep this post out of search results and the sitemap. */
    noindex: boolean("noindex").notNull().default(false),
    authorId: uuid("author_id")
      .notNull()
      .references(() => authors.id, { onDelete: "restrict" }),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    updatedById: uuid("updated_by_id").references(() => users.id, { onDelete: "set null" }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("posts_status_published_idx").on(t.status, t.publishedAt)],
);

export const postTags = pgTable(
  "post_tags",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    /** Display order of tags on the post (first tag = primary section). */
    position: integer("position").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.postId, t.tagId] }), index("post_tags_tag_idx").on(t.tagId)],
);

/* --------------------------------- Redirects -------------------------------- */

/** Permanent redirects for changed URLs. Created automatically when a live slug changes, or manually in the admin. */
export const redirects = pgTable("redirects", {
  id: uuid("id").primaryKey().defaultRandom(),
  fromPath: text("from_path").notNull().unique(),
  /** A site path ("/posts/new-slug") or an absolute https URL. */
  toPath: text("to_path").notNull(),
  source: text("source", { enum: ["auto", "manual"] }).notNull().default("manual"),
  hits: integer("hits").notNull().default(0),
  lastHitAt: timestamp("last_hit_at", { withTimezone: true }),
  ...timestamps,
});

/* ----------------------------------- Media ---------------------------------- */

/** Uploaded images (Vercel Blob in production, public/uploads locally), already resized to WebP. */
export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    url: text("url").notNull().unique(),
    /** Storage key used to delete the file. */
    pathname: text("pathname").notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    alt: text("alt").notNull().default(""),
    uploadedById: uuid("uploaded_by_id").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [index("media_created_idx").on(t.createdAt)],
);

/* --------------------------------- Relations -------------------------------- */

export const authorsRelations = relations(authors, ({ many, one }) => ({
  posts: many(posts),
  user: one(users, { fields: [authors.id], references: [users.authorId] }),
}));

export const usersRelations = relations(users, ({ one }) => ({
  author: one(authors, { fields: [users.authorId], references: [authors.id] }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(authors, { fields: [posts.authorId], references: [authors.id] }),
  postTags: many(postTags),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  postTags: many(postTags),
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, { fields: [postTags.postId], references: [posts.id] }),
  tag: one(tags, { fields: [postTags.tagId], references: [tags.id] }),
}));

export type UserRow = typeof users.$inferSelect;
export type UserRole = (typeof userRole.enumValues)[number];
export type PostRow = typeof posts.$inferSelect;
export type TagRow = typeof tags.$inferSelect;
export type AuthorRow = typeof authors.$inferSelect;
export type MediaRow = typeof media.$inferSelect;
export type RedirectRow = typeof redirects.$inferSelect;
