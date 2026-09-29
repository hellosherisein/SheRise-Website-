import { randomUUID } from "node:crypto";

import { faq as defaultFaqs } from "@/features/content-pages";
import { posts as defaultPosts, type BlogPost } from "@/lib/catalog";

import { database, transaction } from "./database.server";

export type ContentFaq = { q: string; a: string };

type BlogRow = {
  id: string;
  slug: string;
  title: string;
  category: string;
  author: string;
  published_date: string;
  image_url: string;
  excerpt: string;
  content: string;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  status: string;
};

type FaqRow = {
  id: string;
  question: string;
  answer: string;
  status: string;
  sort_order: number;
};

let seeded = false;

export function listContentBlogs(options: { includeInactive?: boolean } = {}): BlogPost[] {
  seedContentDefaults();
  const rows = database()
    .prepare(
      `SELECT id, slug, title, category, author, published_date, image_url, excerpt, content, meta_title, meta_description, meta_keywords, status
       FROM content_blogs
       ${options.includeInactive ? "" : "WHERE status='ACTIVE'"}
       ORDER BY CASE WHEN published_date='' THEN 1 ELSE 0 END, published_date DESC, rowid DESC`,
    )
    .all() as BlogRow[];
  return rows.map(blogRowToPost);
}

export function getContentBlog(slug: string): BlogPost | undefined {
  seedContentDefaults();
  const row = database()
    .prepare(
      `SELECT id, slug, title, category, author, published_date, image_url, excerpt, content, meta_title, meta_description, meta_keywords, status
       FROM content_blogs WHERE slug=? AND status='ACTIVE'`,
    )
    .get(slug) as BlogRow | undefined;
  return row ? blogRowToPost(row) : undefined;
}

export function listContentFaqs(options: { includeInactive?: boolean } = {}): ContentFaq[] {
  seedContentDefaults();
  const rows = database()
    .prepare(
      `SELECT id, question, answer, status, sort_order FROM content_faqs
       ${options.includeInactive ? "" : "WHERE status='ACTIVE'"}
       ORDER BY sort_order ASC, rowid ASC`,
    )
    .all() as FaqRow[];
  return rows.map((row) => ({ q: row.question, a: row.answer }));
}

export function upsertContentBlog(input: Record<string, unknown>) {
  seedContentDefaults();
  const now = new Date().toISOString();
  const title = cleanText(input["title"], 220);
  if (!title) throw new Error("Blog title is required.");
  const originalKey = cleanText(input["originalKey"], 260);
  const slug = slugify(cleanText(input["slug"], 260) || cleanText(input["code"], 260) || title);
  const category = cleanText(input["category"], 120) || "Period Care";
  const author = cleanText(input["author"], 120) || "SheRise Team";
  const publishedDate = cleanText(input["publishedDate"], 40) || "";
  const imageUrl = cleanText(input["imageUrl"], 500) || "/uploads/products/blog-image.jpg";
  const excerpt = cleanText(input["notes"], 700) || cleanText(input["shortDescription"], 700) || "";
  const content = cleanText(input["description"], 8000) || excerpt;
  const status = contentStatus(input["status"]);
  const existing = originalKey
    ? (database().prepare("SELECT id FROM content_blogs WHERE slug=? OR title=?").get(originalKey, originalKey) as
        | { id: string }
        | undefined)
    : undefined;

  if (existing) {
    database()
      .prepare(
        `UPDATE content_blogs
         SET slug=?, title=?, category=?, author=?, published_date=?, image_url=?, excerpt=?, content=?,
             meta_title=?, meta_description=?, meta_keywords=?, status=?, updated_at=?
         WHERE id=?`,
      )
      .run(
        slug,
        title,
        category,
        author,
        publishedDate,
        imageUrl,
        excerpt,
        content,
        cleanText(input["metaTitle"], 220),
        cleanText(input["metaDescription"], 500),
        cleanText(input["metaKeywords"], 500),
        status,
        now,
        existing.id,
      );
    return;
  }

  database()
    .prepare(
      `INSERT INTO content_blogs
       (id, slug, title, category, author, published_date, image_url, excerpt, content, meta_title, meta_description, meta_keywords, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      randomUUID(),
      slug,
      title,
      category,
      author,
      publishedDate,
      imageUrl,
      excerpt,
      content,
      cleanText(input["metaTitle"], 220),
      cleanText(input["metaDescription"], 500),
      cleanText(input["metaKeywords"], 500),
      status,
      now,
      now,
    );
}

export function deleteContentBlog(input: Record<string, unknown>) {
  seedContentDefaults();
  const key = cleanText(input["originalKey"], 260) || cleanText(input["slug"], 260) || cleanText(input["code"], 260);
  if (!key) throw new Error("Blog slug is required.");
  database().prepare("DELETE FROM content_blogs WHERE slug=? OR title=?").run(key, key);
}

export function upsertContentFaq(input: Record<string, unknown>) {
  seedContentDefaults();
  const now = new Date().toISOString();
  const question = cleanText(input["title"], 500);
  const answer = cleanText(input["notes"], 3000);
  if (!question || !answer) throw new Error("Question and answer are required.");
  const originalKey = cleanText(input["originalKey"], 500);
  const status = contentStatus(input["status"]);
  const existing = originalKey
    ? (database().prepare("SELECT id FROM content_faqs WHERE question=?").get(originalKey) as { id: string } | undefined)
    : undefined;

  if (existing) {
    database()
      .prepare("UPDATE content_faqs SET question=?, answer=?, status=?, updated_at=? WHERE id=?")
      .run(question, answer, status, now, existing.id);
    return;
  }

  const sortRow = database().prepare("SELECT COALESCE(MAX(sort_order), 0) + 10 AS next_sort FROM content_faqs").get() as {
    next_sort: number;
  };
  database()
    .prepare(
      "INSERT INTO content_faqs (id, question, answer, status, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(randomUUID(), question, answer, status, sortRow.next_sort || 10, now, now);
}

export function deleteContentFaq(input: Record<string, unknown>) {
  seedContentDefaults();
  const key = cleanText(input["originalKey"], 500) || cleanText(input["title"], 500);
  if (!key) throw new Error("FAQ question is required.");
  database().prepare("DELETE FROM content_faqs WHERE question=?").run(key);
}

function seedContentDefaults() {
  if (seeded) return;
  transaction(() => {
    const now = new Date().toISOString();
    const blogCount = database().prepare("SELECT COUNT(*) AS count FROM content_blogs").get() as { count: number };
    if (!blogCount.count) {
      const insertBlog = database().prepare(
        `INSERT INTO content_blogs
         (id, slug, title, category, author, published_date, image_url, excerpt, content, meta_title, meta_description, meta_keywords, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`,
      );
      for (const post of defaultPosts) {
        insertBlog.run(
          randomUUID(),
          post.slug,
          post.title,
          post.category,
          "SheRise Team",
          post.date,
          post.image,
          post.excerpt,
          post.content.join("\n\n"),
          post.title,
          post.excerpt,
          post.category,
          now,
          now,
        );
      }
    }

    const faqCount = database().prepare("SELECT COUNT(*) AS count FROM content_faqs").get() as { count: number };
    if (!faqCount.count) {
      const insertFaq = database().prepare(
        "INSERT INTO content_faqs (id, question, answer, status, sort_order, created_at, updated_at) VALUES (?, ?, ?, 'ACTIVE', ?, ?, ?)",
      );
      defaultFaqs.forEach((item, index) => {
        insertFaq.run(randomUUID(), item.q, item.a, (index + 1) * 10, now, now);
      });
    }
  });
  seeded = true;
}

function blogRowToPost(row: BlogRow): BlogPost {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    category: row.category,
    date: row.published_date || "Draft",
    image: row.image_url,
    content: row.content.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean),
  };
}

function cleanText(value: unknown, max = 1000) {
  return String(value ?? "").trim().slice(0, max);
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function contentStatus(value: unknown) {
  const status = cleanText(value, 20).toUpperCase();
  return ["ACTIVE", "DRAFT", "INACTIVE", "PENDING"].includes(status) ? status : "ACTIVE";
}
