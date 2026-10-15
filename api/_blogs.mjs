const selectBlogs = `SELECT b.*, c.name AS category_name FROM blogs b
  LEFT JOIN blog_categories c ON c.id = b.category_id`;

export async function listBlogs(queryRows, options = {}) {
  return queryRows(`${selectBlogs} WHERE b.deleted_at IS NULL
    ${options.includeInactive ? "" : "AND b.status = 'PUBLISHED' AND b.published_at <= NOW()"}
    ${options.slug ? "AND b.slug = ?" : ""}
    ORDER BY b.published_at DESC, b.id DESC`, options.slug ? [options.slug] : []);
}

export function blogToPost(blog) {
  return {
    slug: blog.slug, title: blog.title, excerpt: blog.short_description || "",
    category: blog.category_name || "Period Care", date: dateValue(blog.published_at) || "Draft",
    image: blog.featured_image_url || "",
    author: blog.author_name || "SheRise Team", metaTitle: blog.seo_title || "", metaDescription: blog.meta_description || "",
    content: String(blog.content || "").split(/\n{2,}/).map((part) => part.trim()).filter(Boolean),
  };
}

export async function blogsPayload(queryRows) {
  const blogs = await listBlogs(queryRows, { includeInactive: true });
  return {
    title: "Blogs", action: "Add Blog",
    columns: ["Title", "Slug", "Category", "Published", "Author", "Image", "Excerpt", "Content", "SEO Title", "SEO Description", "Keywords", "Status"],
    rows: blogs.map((blog) => [
      blog.title, blog.slug, blog.category_name || "Period Care", dateValue(blog.published_at),
      blog.author_name || "SheRise Team", blog.featured_image_url || "", blog.short_description || "",
      blog.content || "", blog.seo_title || "", blog.meta_description || "", keywordText(blog.tags), blog.status,
    ]),
    metrics: [
      { label: "Blogs", value: String(blogs.length), trend: "Saved in MySQL", tone: "up" },
      { label: "Published", value: String(blogs.filter((blog) => blog.status === "PUBLISHED").length), trend: "Website articles", tone: "up" },
      { label: "Drafts", value: String(blogs.filter((blog) => blog.status === "DRAFT").length), trend: "Hidden from website", tone: "neutral" },
      { label: "Categories", value: String(new Set(blogs.map((blog) => blog.category_name).filter(Boolean)).size), trend: "Blog categories", tone: "neutral" },
    ], source: "mysql",
  };
}

export async function upsertBlog(transaction, input) {
  const title = clean(input.title, 220);
  const slug = slugify(clean(input.slug || input.code, 240) || title).slice(0, 240);
  const originalKey = clean(input.originalKey, 240);
  const status = input.status === "ACTIVE" ? "PUBLISHED" : input.status || "DRAFT";
  const content = clean(input.description, 100000);
  if (!title || !slug) throw blogError(400, "A blog title and valid slug are required.");
  if (!["PUBLISHED", "DRAFT"].includes(status)) throw blogError(400, "Choose Draft or Published.");
  if (status === "PUBLISHED" && !content) throw blogError(400, "Add blog content before publishing.");
  const date = clean(input.publishedDate, 10);
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) {
    throw blogError(400, "Enter a valid published date.");
  }
  if (input.adminAction === "update" && !originalKey) throw blogError(400, "The original blog slug is required.");
  await transaction(async (connection) => {
    let existing;
    if (originalKey) {
      const [rows] = await connection.query("SELECT id FROM blogs WHERE slug = ? AND deleted_at IS NULL FOR UPDATE", [originalKey]);
      existing = rows[0];
      if (!existing) throw blogError(404, "Blog not found.");
    }
    const category = clean(input.category, 150) || "Period Care";
    const categorySlug = slugify(category).slice(0, 170);
    if (!categorySlug) throw blogError(400, "Enter a valid category.");
    const [categories] = await connection.query("SELECT id FROM blog_categories WHERE slug = ? AND deleted_at IS NULL", [categorySlug]);
    let categoryId = categories[0]?.id;
    if (!categoryId) {
      const [result] = await connection.execute("INSERT INTO blog_categories (name, slug) VALUES (?, ?)", [category, categorySlug]);
      categoryId = result.insertId;
    }
    const values = [categoryId, title, slug, clean(input.imageUrl, 500) || null,
      clean(input.notes || input.shortDescription, 500) || null, content,
      clean(input.author, 120) || "SheRise Team", JSON.stringify(clean(input.metaKeywords, 1000).split(",").map((tag) => tag.trim()).filter(Boolean)),
      clean(input.metaTitle, 180) || null, clean(input.metaDescription, 300) || null, status,
      date ? `${date} 00:00:00` : null];
    if (existing) {
      await connection.execute(`UPDATE blogs SET category_id = ?, title = ?, slug = ?, featured_image_url = ?,
        short_description = ?, content = ?, author_name = ?, tags = ?, seo_title = ?, meta_description = ?,
        status = ?, published_at = COALESCE(?, published_at, ${status === "PUBLISHED" ? "NOW()" : "NULL"}) WHERE id = ?`, [...values, existing.id]);
    } else {
      await connection.execute(`INSERT INTO blogs (category_id, title, slug, featured_image_url, short_description,
        content, author_name, tags, seo_title, meta_description, status, published_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, ${status === "PUBLISHED" ? "NOW()" : "NULL"}))`, values);
    }
  });
}

export async function deleteBlog(executeSql, input) {
  const slug = clean(input.originalKey || input.slug || input.code, 240);
  if (!slug) throw blogError(400, "Blog slug is required.");
  const result = await executeSql("UPDATE blogs SET deleted_at = NOW() WHERE slug = ? AND deleted_at IS NULL", [slug]);
  if (!result.affectedRows) throw blogError(404, "Blog not found.");
}

function dateValue(value) { return value ? (value instanceof Date ? value.toISOString() : String(value)).slice(0, 10) : ""; }
function clean(value, max) { return String(value ?? "").trim().slice(0, max); }
function slugify(value) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
function blogError(statusCode, message) { return Object.assign(new Error(message), { statusCode }); }
function keywordText(value) {
  try { const tags = typeof value === "string" ? JSON.parse(value) : value; return Array.isArray(tags) ? tags.join(", ") : ""; }
  catch { return ""; }
}
