import { createFileRoute, Link } from "@/router-shim";
import { useEffect, useState } from "react";
import { ArrowUpRight, Flower2, Droplets, Moon, Star, Sun } from "lucide-react";
import {
  Action,
  Benefits,
  BlogGrid,
  Newsletter,
  ProductGrid,
  SectionHeading,
} from "@/components/commerce";
import { products } from "@/lib/catalog";
import { seo } from "@/lib/seo";
import hero from "@/assets/sherise-hero.jpg";
import story from "@/assets/sherise-story.jpg";
import guide from "@/assets/sherise-guide.jpg";
import flatlay from "@/assets/sherise-flatlay.jpg";

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
  const [approvedReviews, setApprovedReviews] = useState<PublicReview[]>([]);

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
          <div className="flex flex-wrap gap-3">
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
            <span className="font-display text-3xl">
              A little care.
              <br />A whole lot of you.
            </span>
            <span className="mt-3 block text-[10px] uppercase tracking-widest">
              RELEASE. RENEW & RISE.
            </span>
          </div>
        </div>
      </section>
      <div className="brand-ribbon">
        <span>Made for your everyday</span>
        <Flower2 />
        <span>Care without the complicated</span>
        <Flower2 />
        <span>Room to be you</span>
        <Flower2 />
        <span>Release. Renew & Rise.</span>
      </div>
      <section className="container-shell section-space">
        <SectionHeading eyebrow="YOUR CARE, YOUR WAY" title="A little comfort for every day." />
        <div className="category-grid">
          {[
            ["Sanitary Pads", "Your everyday essentials", flatlay, "/category/sanitary-pads"],
            ["Day + Night Combos", "A routine that goes with your flow", story, "/shop?q=combo"],
          ].map(([title, copy, img, to]) => (
            <Link key={title} to={to!} className="category-tile group">
              <img
                src={img}
                alt={title + " collection inspiration"}
                loading="lazy"
                width="600"
                height="500"
                className="transition-transform duration-300 group-hover:scale-105"
              />
              <div>
                <p className="text-xs">{copy}</p>
                <h3 className="mt-1 text-2xl">{title}</h3>
                <ArrowUpRight className="absolute right-5 bottom-6" />
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="bg-brand-cream">
        <div className="container-shell py-12 md:py-16">
          <SectionHeading
            eyebrow="THE EVERYDAY EDIT"
            title="Made for your flow."
            copy="Find comfort for every kind of day. Explore our preview collection."
          />
          <ProductGrid items={products.slice(0, 4)} />
          <div className="mt-10 text-center">
            <Action to="/shop" outline>
              SHOP ALL ESSENTIALS
            </Action>
          </div>
        </div>
      </section>
      <section className="container-shell section-space text-center">
        <SectionHeading
          eyebrow="LET YOUR BODY LEAD"
          title="Find your perfect flow."
          copy="Every cycle is different. Start with what feels right for you."
        />
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
          {["Light", "Medium", "Heavy", "Overnight"].map((flow, i) => {
            const Icon = i === 3 ? Moon : i === 0 ? Sun : Droplets;
            return (
              <Link key={flow} to="/shop" search={{ flow }} className="flow-tile">
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
      <section className="container-shell section-space">
        <SectionHeading
          eyebrow="A MORE THOUGHTFUL KIND OF CARE"
          title="Comfort you can count on."
        />
        <Benefits />
      </section>
      <section className="bg-brand-cream">
        <div className="container-shell section-space grid gap-10 md:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="GET TO KNOW YOUR FLOW"
              title="The right care starts with you."
              copy="A simple place to start. No complicated rules, just a little guidance."
            />
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
      <section className="container-shell section-space">
        <SectionHeading
          eyebrow="OPEN CONVERSATIONS, ALWAYS"
          title="Let's talk periods."
          copy="Good reads for getting to know yourself a little better."
        />
        <BlogGrid />
      </section>
      <section className="container-shell pb-16">
        <SectionHeading
          eyebrow={approvedReviews.length ? "VERIFIED CUSTOMER REVIEWS" : "REAL STORIES, WHEN THEY ARRIVE"}
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
