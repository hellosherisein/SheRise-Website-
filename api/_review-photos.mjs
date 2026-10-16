export function storedReviewPhotos(value) {
  try {
    const photos = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(photos) ? photos.filter((photo) => typeof photo === "string").slice(0, 3) : [];
  } catch { return []; }
}

export function reviewPhotoUrls(review) {
  return storedReviewPhotos(review.review_images).map((_, index) => `/api/reviews/image?review=${review.id}&index=${index}`);
}

export function validateReviewPhotos(photos, existing = [], reviewId) {
  if (!Array.isArray(photos) || photos.length > 3) throw Object.assign(new Error("Upload up to 3 product photos."), { status: 400 });
  return photos.map((value) => {
    if (typeof value !== "string" || value.length > 410000) throw Object.assign(new Error("Each photo must be 300 KB or smaller."), { status: 400 });
    const retained = existing.findIndex((_, index) => value === `/api/reviews/image?review=${reviewId}&index=${index}`);
    if (retained >= 0) return existing[retained];
    const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!match) throw Object.assign(new Error("Use a JPG, PNG or WebP photo."), { status: 400 });
    const bytes = Buffer.from(match[2], "base64");
    const valid = match[1] === "image/jpeg" ? bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
      : match[1] === "image/png" ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
    if (!valid || !bytes.length || bytes.length > 300 * 1024) throw Object.assign(new Error("Invalid photo or photo larger than 300 KB."), { status: 400 });
    return value;
  });
}
