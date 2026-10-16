# Product review photos

Delivered-order customers can add up to three JPG, PNG or WebP photos while reviewing each purchased product. Files up to 8 MB are resized in the browser to at most 1200 pixels and 300 KB each; originals are not uploaded. The server validates count, byte size, MIME and image signatures, order ownership and delivery status. Selecting or removing photos does not submit the review automatically.

Photos are saved with the review and survive redeployment in MySQL's nullable `reviews.review_images` JSON column. Existing reviews are preserved. On the first photo submission the application checks this column and adds it if missing. For a database account without ALTER permission, run `npm run migrate:review-photos` once using an authorized migration account before deployment. No production migration was run from this workspace.

Customers can preview and remove their own saved photos. Admin → Reviews → Moderate shows the photos before approving. Every edit resets the entire review to PENDING. Public review responses contain image URLs, never the image bytes, and the product detail page filters by the exact product slug. The image endpoint serves pending/rejected photos only to the author or a signed-in admin; only approved reviews of delivered, nondeleted orders/products are public. Responses use `private, no-store` so rejecting a review prevents subsequent anonymous image access. Already downloaded photos cannot be recalled.

Checks: `npm run test:review-photos`, `npm run test:reviews`, `npm run test:mysql-accounts`, `npx playwright test tests/review-photos.spec.ts`, `npm run build`.
