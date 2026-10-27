import { createFileRoute, Link } from "@/router-shim";
import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowUpRight, Flower2, Droplets, Moon, Star, Sun } from "lucide-react";
import {
  Action,
  Benefits,
  BlogGrid,
  Newsletter,
  ProductGrid,
  SectionHeading,
} from "@/components/commerce";
import { products, type BlogPost } from "@/lib/catalog";
import { seo } from "@/lib/seo";
import hero from "@/assets/sherise-hero.jpg";
import story from "@/assets/sherise-story.jpg";
import guide from "@/assets/sherise-guide.jpg";
import flatlay from "@/assets/sherise-flatlay.jpg";
import { CategoryCarousel } from "@/components/category-carousel";

type PublicReview = {
  orderId: string;
  customerName: string;
  productName: string;
  productSlug: string;
  rating: number;
  reviewText: string;
  reviewedAt: string;
};

export const Route = createFileRoute("/")({
  head: () =>
    seo(
      "Release. Renew & Rise.",
      "Thoughtful period care for comfort, confidence and everyday movement.",
    ),
  component: Home,
});
function Home() {
  const [communityViewport, communityCarousel] = useEmblaCarousel({
    loop: true,
    align: "start",
    breakpoints: { "(min-width: 768px)": { active: false } },
  });
  const [communityPaused, setCommunityPaused] = useState(false);

  useEffect(() => {
    if (!communityCarousel || communityPaused) return;
    let dragging = false;
    const startDrag = () => { dragging = true; };
    const endDrag = () => { dragging = false; };
    communityCarousel.on("pointerDown", startDrag);
    communityCarousel.on("pointerUp", endDrag);
    const timer = window.setInterval(() => {
      if (!dragging && !document.hidden &&
        window.matchMedia("(max-width: 767px)").matches &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        communityCarousel.scrollNext();
      }
    }, 3500);
    return () => {
      window.clearInterval(timer);
      communityCarousel.off("pointerDown", startDrag);
      communityCarousel.off("pointerUp", endDrag);
    };
  }, [communityCarousel, communityPaused]);

  const [approvedReviews, setApprovedReviews] = useState<PublicReview[]>([]);
  const [publishedPosts, setPublishedPosts] = useState<BlogPost[]>([]);
  const careTiles = [
    { flow: "Light", href: "/shop?flow=Light", icon: Sun },
    { flow: "Medium", href: "/shop?flow=Medium", icon: Droplets },
    { flow: "Heavy", href: "/shop?flow=Heavy", icon: Droplets },
    { flow: "Overnight", href: "/shop?flow=Overnight", icon: Moon },
  ];

  useEffect(() => {
    let cancelled = false;
    fetch("/api/reviews")
      .then(async (response) => {
        if (!response.ok) return { reviews: [] };
        return (await response.json()) as { reviews: PublicReview[] };
      })
      .then((payload) => {
        if (!cancelled) setApprovedReviews(payload.reviews.slice(0, 6));
      })
      .catch(() => {
        if (!cancelled) setApprovedReviews([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/content/blogs")
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load blogs.");
        return await response.json() as { posts: BlogPost[] };
      })
      .then((payload) => { if (!cancelled) setPublishedPosts(payload.posts.slice(0, 3)); })
      .catch(() => { if (!cancelled) setPublishedPosts([]); });
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">PERIOD CARE, REIMAGINED</p>
          <h1>
            Rise above
            <br />
            every <em>period.</em>
          </h1>
          <p className="my-7 max-w-md leading-7 text-muted-foreground">
            For the slow mornings. The big days. And everything in between. Thoughtful period care
            that moves with you.
          </p>
          <div className="grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2 [&>a]:w-full [&>a]:justify-center">
            <Action to="/shop">SHOP NOW</Action>
            <Action to="/why-sherise" outline>
              EXPLORE SHERISE
            </Action>
          </div>
          <div className="mt-9 flex items-center gap-3 text-xs">
            <Flower2 className="text-brand-coral" />
            <span>Your flow. Your rhythm. Your rise.</span>
          </div>
        </div>
        <div className="hero-visual">
          <img
            src={hero}
            alt="A quiet moment of everyday comfort in warm natural light"
            width="1200"
            height="1200"
            fetchPriority="high"
            className="h-full w-full object-cover"
          />
          <div className="hero-note">
            <span className="font-display text-3xl md:text-4xl">
              Your cycle.
              <br />Your comfort.
              <br />Your confidence.
            </span>
            <span className="mt-3 block text-[10px] uppercase tracking-widest">
              RELEASE. RENEW & RISE.
            </span>
          </div>
        </div>
      </section>
      <div className="ngo-ribbon" tabIndex={0} role="region" aria-label="SheRise NGO initiative">
        <div className="ngo-ribbon-track">
          {[0, 1].map((copy) => (
            <div key={copy} className="ngo-ribbon-message" aria-hidden={copy === 1 ? true : undefined}>
              <Flower2 aria-hidden="true" />
              <span>Together with NGO initiatives, SheRise supports menstrual health awareness, dignity and confidence for girls and women.</span>
            </div>
          ))}
        </div>
      </div>
      <section className="container-shell section-space pt-10! md:pt-14!">
        <div className="text-center">
          <SectionHeading eyebrow="EVERYDAY ESSENTIALS" title="Your care, your way" />
        </div>
        <CategoryCarousel />
      </section>
      <section className="bg-brand-cream">
        <div className="container-shell py-12 md:py-16">
          <div className="text-center">
            <SectionHeading
              title="Made for your flow."
              copy="Find comfort for every kind of day. Explore our preview collection."
            />
          </div>
          <div className="everyday-products">
            <ProductGrid items={products.slice(0, 4)} />
          </div>
          <div className="mt-10 text-center">
            <Action to="/shop" outline>
              SHOP ALL ESSENTIALS
            </Action>
          </div>
        </div>
      </section>
      <section className="container-shell section-space pt-8! text-center md:pt-10!">
        <SectionHeading
          title="Find your perfect flow."
          copy="Every cycle is different. Start with what feels right for you."
        />
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
          {careTiles.map(({ flow, href, icon: Icon }) => {
            return (
              <Link key={flow} to={href} className="flow-tile" aria-label={`Shop ${flow} flow products`}>
                <Icon className="mx-auto mb-4 size-8" />
                <span>{flow}</span>
                <span className="mt-2 inline-flex items-center justify-center gap-1 text-xs font-bold uppercase tracking-[0.16em] opacity-70">
                  Explore care <ArrowUpRight className="size-3" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
      <section className="editorial-grid">
        <img
          src={story}
          alt="A relaxed everyday moment, with time to pause and recharge"
          loading="lazy"
          width="900"
          height="900"
        />
        <div className="bg-brand-blush p-8 md:p-16">
          <p className="eyebrow">LIFE DOESN'T FOLLOW A CYCLE</p>
          <h2 className="text-4xl leading-tight md:text-6xl">
            Your period shouldn't
            <br />
            <em>pause your life.</em>
          </h2>
          <p className="my-7 max-w-md leading-7">
            Some days you take on the world. Some days you take a breath. We're here for both, with
            a simpler, more thoughtful approach to period care.
          </p>
          <Action to="/about">OUR STORY</Action>
        </div>
      </section>
      <section className="container-shell section-space pt-12! md:pt-16!">
        <h2 className="mb-9 text-center text-3xl text-brand-navy md:text-5xl">
          A more thoughtful <span className="text-brand-coral">kind of care</span>
        </h2>
        <Benefits />
      </section>
      <section className="bg-brand-cream">
        <div className="container-shell section-space grid gap-10 md:grid-cols-2">
          <div>
            <div className="mb-9">
              <h2 className="text-3xl text-brand-navy md:text-5xl">
                Get to know <span className="text-brand-coral">your flow</span>
              </h2>
              <p className="mt-3 text-muted-foreground">
                A simple place to start. No complicated rules, just a little guidance.
              </p>
            </div>
            <Action to="/period-guide" outline>
              VIEW PERIOD GUIDE
            </Action>
          </div>
          <ol className="divide-y">
            {[
              "Know your flow",
              "Find your preferred length",
              "Think about your day or night",
              "Change as needed for comfort",
            ].map((s, i) => (
              <li key={s} className="flex items-center gap-6 py-5">
                <span className="font-display text-3xl text-brand-coral">0{i + 1}</span>
                <h3 className="text-xl">{s}</h3>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="container-shell section-space pt-8! text-center md:pt-10!">
        <SectionHeading
          title="Let's talk periods."
          copy="Good reads for getting to know yourself a little better."
        />
        <BlogGrid items={publishedPosts} />
      </section>
      <section className="container-shell pb-16 text-center">
        <SectionHeading
          eyebrow={approvedReviews.length ? "VERIFIED CUSTOMER REVIEWS" : ""}
          title="The SheRise community"
          copy={
            approvedReviews.length
              ? "Approved reviews from delivered orders, shared by the SheRise community."
              : "A space for honest experiences. Verified customer stories will appear here after launch."
          }
        />
        {approvedReviews.length ? (
          <div className="grid gap-4 md:grid-cols-3">
            {approvedReviews.map((review) => (
              <article key={`${review.orderId}-${review.productSlug}`} className="border bg-white p-5 shadow-sm">
                <div className="mb-4 flex gap-1 text-brand-coral" aria-label={`${review.rating} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star key={value} className={`size-4 ${value <= review.rating ? "fill-current" : ""}`} />
                  ))}
                </div>
                <p className="min-h-20 text-sm leading-6">"{review.reviewText}"</p>
                <div className="mt-5 border-t pt-4">
                  <p className="font-semibold text-brand-navy">{review.customerName}</p>
                  <Link
                    to="/products/$slug"
                    params={{ slug: review.productSlug }}
                    className="mt-1 block text-xs text-muted-foreground underline"
                  >
                    {review.productName}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="border-y py-8 text-center">
            <Flower2 className="mx-auto mb-4 text-brand-burgundy" />
            <p>No customer reviews yet. Your story could be one of the first.</p>
          </div>
        )}
      </section>
      <section className="container-shell pb-16 text-center">
        <SectionHeading
          eyebrow="A SPACE FOR ALL OF US"
          title="#RiseWithSheRise"
          copy="Everyday moments. Honest conversations. Care that connects us."
        />
        <div ref={communityViewport} className="overflow-hidden" role="region" aria-label="SheRise community photos" aria-roledescription="carousel">
        <div className="community-strip">
          {[story, guide, flatlay, hero, guide, story].map((img, i) => (
            <img
              key={i}
              src={img}
              alt={`SheRise community moodboard ${i + 1}`}
              loading="lazy"
              width="320"
              height="320"
            />
          ))}
        </div>
        </div>
        <button
          type="button"
          className="mt-2 min-h-11 px-3 text-xs text-brand-navy underline underline-offset-4 md:hidden motion-reduce:hidden"
          aria-pressed={communityPaused}
          onClick={() => setCommunityPaused((paused) => !paused)}
        >
          {communityPaused ? "Resume slideshow" : "Pause slideshow"}
        </button>
        <p className="mt-5 text-xs text-muted-foreground">
          Community moodboard · Official social links coming at launch.
        </p>
        <div className="mt-5">
          <Action to="/contact" outline>
            CONNECT WITH SHERISE
          </Action>
        </div>
      </section>
      <Newsletter />
    </>
  );
}
