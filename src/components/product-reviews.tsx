import { useEffect, useState } from "react";
import { Star } from "lucide-react";

type Review = { customerName: string; productSlug: string; rating: number; reviewText: string; photos?: string[]; reviewedAt: string };

export function ProductReviews({ slug }: { slug: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [state, setState] = useState("loading");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    setReviews([]);
    fetch("/api/reviews", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load reviews");
        const data = await response.json() as { reviews: Review[] };
        if (!Array.isArray(data.reviews)) throw new Error("Could not load reviews");
        if (!controller.signal.aborted) { setReviews(data.reviews.filter((review) => review.productSlug === slug)); setState("ready"); }
      }).catch(() => { if (!controller.signal.aborted) setState("error"); });
    return () => controller.abort();
  }, [slug, attempt]);
  return <section className="my-12 border-t pt-8" aria-label="Customer reviews">
    <h2 className="mb-5 text-2xl">Customer reviews</h2>
    {state === "loading" ? <p role="status">Loading reviews…</p> : state === "error" ? <div><p>Could not load reviews.</p><button className="mt-2 underline" onClick={() => setAttempt((value) => value + 1)}>Retry reviews</button></div>
      : !reviews.length ? <p className="text-sm text-muted-foreground">No approved reviews for this product yet.</p>
      : <div className="grid gap-5 sm:grid-cols-2">{reviews.map((review, index) => <article key={`${review.reviewedAt}-${index}`} className="border p-4">
        <p className="font-semibold">{review.customerName}</p>
        <div className="my-2 flex gap-1 text-brand-coral" aria-label={`${review.rating} out of 5 stars`}>{[1, 2, 3, 4, 5].map((value) => <Star key={value} size={18} fill={value <= review.rating ? "currentColor" : "none"} />)}</div>
        <p className="whitespace-pre-wrap text-sm">{review.reviewText}</p>
        <div className="mt-3 flex flex-wrap gap-2">{review.photos?.map((photo, photoIndex) => <a key={photo} href={photo} target="_blank" rel="noreferrer" aria-label={`Open customer product photo ${photoIndex + 1}`}><img src={photo} alt={`Customer photo of this product ${photoIndex + 1}`} loading="lazy" className="size-24 rounded border object-cover" /></a>)}</div>
      </article>)}</div>}
  </section>;
}
