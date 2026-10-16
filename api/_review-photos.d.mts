export function storedReviewPhotos(value: unknown): string[];
export function reviewPhotoUrls(review: { id: string | number; review_images?: unknown }): string[];
export function validateReviewPhotos(photos: unknown, existing?: string[], reviewId?: string | number): string[];
