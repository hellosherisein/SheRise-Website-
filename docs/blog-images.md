# Blog images

Admin → Blogs → Choose image accepts JPG, PNG or WebP up to 5 MB. A local preview appears immediately. Wait for upload completion, then Save/Update the blog. Failed uploads display an error and prevent the blog saving an absent image; select the image again or use a valid image URL to retry.

New uploads use authenticated, same-origin `POST /api/admin/upload-blog-image`, save binary bytes in MySQL `blog_media`, and return a short `/api/content/blog-image?id=...` URL stored in the existing blog image column. No upload directory or local filesystem persistence is needed. Existing image URLs are preserved; files already lost from previous deployments must be selected and uploaded again.

On first upload, the app checks `blog_media` and creates it if absent. For a restricted application DB user, a database administrator can run this additive SQL before using the feature:

```sql
CREATE TABLE IF NOT EXISTS blog_media (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  mime_type VARCHAR(40) NOT NULL,
  image_data MEDIUMBLOB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

The admin can preview images before saving. Anonymous visitors can fetch an image only when a nondeleted, published blog with a publication date in the past or present references it. Draft, future and deleted blog images remain private. Responses do not cache private images. No production upload or schema migration was performed from this workspace.

Checks: `npm run test:blog-images`, `npm run test:blogs`, `npx playwright test tests/blog-images.spec.ts`, `npm run build`, `node scripts/verify-server-startup.mjs`.
