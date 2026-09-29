import { useState } from "react";
import { Link } from "@/router-shim";
import {
  Activity,
  Bed,
  Droplets,
  Flower2,
  Heart,
  Leaf,
  MessageCircleHeart,
  Moon,
  ShieldCheck,
  Sparkles,
  SunMedium,
  Utensils,
  Waves,
} from "lucide-react";
import {
  PageHeading,
  SectionHeading,
  Benefits,
  BlogGrid,
  Accordion,
  Action,
  Newsletter,
} from "@/components/commerce";
import { Button } from "@/components/ui/button";
import { posts, type BlogPost } from "@/lib/catalog";
import story from "@/assets/sherise-story.jpg";
export const faq = [
  {
    q: "How often should I change my sanitary pad?",
    a: "For good menstrual hygiene, it's generally recommended to change your pad every 4-6 hours, or sooner depending on your flow and comfort.",
  },
  {
    q: "How do I choose the right SheRise pad for my flow?",
    a: "Choose based on your flow level, comfort and coverage needs. Lighter-flow days may need regular coverage, while heavier-flow days or overnight use may benefit from longer, more absorbent options.",
  },
  {
    q: "Can I use SheRise pads overnight?",
    a: "Yes, if the selected product is designed for overnight or extended coverage. Check the product description for size, absorbency and recommended use.",
  },
  {
    q: "How should I dispose of a used sanitary pad?",
    a: "Wrap the used pad securely in its wrapper or disposal paper and place it in a designated waste bin. Do not flush sanitary pads down the toilet.",
  },
  {
    q: "What should I do if I experience irritation while using a pad?",
    a: "Stop using the product if you experience persistent irritation or discomfort. Keep the area clean and dry, and consult a qualified healthcare professional if symptoms continue or are severe.",
  },
  {
    q: "Is it normal for my menstrual flow to change?",
    a: "Flow can vary between people and even between cycles. If you notice a sudden or significant change, very heavy bleeding, severe pain, or anything concerning, consider speaking with a healthcare professional.",
  },
  {
    q: "How can I stay comfortable during my period?",
    a: "Stay hydrated, get enough rest, eat balanced meals, maintain good hygiene and consider gentle movement or relaxation practices that feel comfortable for you.",
  },
  {
    q: "Can exercise be done during periods?",
    a: "For many people, gentle activities such as walking, stretching or yoga can be comfortable during periods. Choose activity according to how your body feels.",
  },
  {
    q: "How should SheRise pads be stored?",
    a: "Keep unopened pads in a clean, cool and dry place, away from moisture and direct sunlight.",
  },
  {
    q: "Does SheRise support wellness beyond menstrual hygiene?",
    a: "Yes. SheRise positions menstrual care as one part of overall well-being, encouraging self-care, hygiene, rest, nutrition, movement and emotional wellness without treating these as substitutes for medical care.",
  },
  {
    q: "How can I place an order?",
    a: "Select your preferred product and pack, add it to your cart and complete checkout using the available payment and delivery options.",
  },
  {
    q: "Is Cash on Delivery available?",
    a: "Yes. Cash on Delivery is available for orders of Rs.1,000 and above.",
  },
  {
    q: "How can I track my SheRise order?",
    a: "Once your order is confirmed and dispatched, tracking information will be provided through the contact method available for your order.",
  },
  {
    q: "What is the return or refund policy?",
    a: "Returns and refunds are subject to the SheRise Return & Refund Policy. Because sanitary products are hygiene-sensitive items, eligibility may depend on whether the package is unopened, damaged, incorrect or otherwise qualifies under the policy.",
  },
  {
    q: "What should I do if I receive a damaged or incorrect product?",
    a: "Contact SheRise customer support with your order details and clear product/package photos so the issue can be reviewed.",
  },
  {
    q: "Is my personal information kept private?",
    a: "Customer information is handled according to the website's Privacy Policy and used only for legitimate purposes such as account management, order processing, delivery and customer support.",
  },
];
export const infoTitles: Record<string, string> = {
  about: "A little care. A whole lot of you.",
  "why-sherise": "Care that puts you first.",
  "period-guide": "Get to know your flow.",
  faq: "SheRise - Frequently Asked Questions",
  contact: "Let’s talk.",
  "privacy-policy": "Privacy policy",
  terms: "Terms & conditions",
  "shipping-policy": "Shipping policy",
  "return-refund-policy": "Returns & refunds",
};
export const policies: Record<string, { q: string; a: string }[]> = {
  "privacy-policy": [
    {
      q: "Preview data and storage",
      a: "Customer profiles, saved addresses, wishlists, preview orders and newsletter signups are stored in the server database. Passwords are stored as salted hashes, and login uses an HttpOnly session cookie. Cart selections are stored in this browser. Contact forms validate locally unless connected later.",
    },
    {
      q: "Your choices",
      a: "Manage your profile, remove addresses and update your wishlist from your account. Clearing browser data removes the local cart and cookie, but does not delete your server account. The business must supply its retention policy and privacy contact before live operations.",
    },
  ],
  terms: [
    {
      q: "About this preview",
      a: "This website is a demonstration of the SheRise shopping experience. Products, prices, stock and offers are illustrative. Submitting checkout saves a preview order to your customer account and does not form a purchase agreement.",
    },
    {
      q: "Before launch",
      a: "The brand must confirm its legal entity, contact details, final catalog, payment terms and applicable customer policies before accepting real orders.",
    },
  ],
  "shipping-policy": [
    {
      q: "Shipping is not active",
      a: "This preview does not dispatch goods. The standard ?40 shipping and free-shipping threshold shown at checkout are illustrative.",
    },
    {
      q: "Details awaiting confirmation",
      a: "Delivery areas, courier partners, dispatch times, shipping charges, tracking, delays and lost-package procedures will be provided by SheRise before launch.",
    },
  ],
  "return-refund-policy": [
    {
      q: "No real transactions in this preview",
      a: "Demo orders cannot be refunded because no payment is collected. Do not ship products to any address associated with this preview.",
    },
    {
      q: "Final return policy pending",
      a: "Eligibility for sealed hygiene products, damaged or incorrect items, reporting windows, required evidence, refund timing and support contact details must be approved and published by SheRise before launch.",
    },
  ],
};
export function InfoPage({ kind, items }: { kind: string; items?: { q: string; a: string }[] }) {
  const [sent, setSent] = useState(false);
  const faqItems = items || faq;
  return (
    <>
      <div
        className={`container-shell ${
          kind === "period-guide" || kind === "why-sherise" || kind === "about" ? "py-8 md:py-10" : "section-space"
        }`}
      >
        {kind !== "period-guide" && kind !== "why-sherise" && kind !== "about" && (
          <PageHeading
            title={infoTitles[kind] || "SheRise"}
            showBreadcrumb={false}
            align={kind === "faq" ? "center" : "left"}
            copy={
              policies[kind]
                ? "Preview policy. Final business terms must be approved before launch."
                : kind === "faq"
                  ? "Answers to help you feel a little more at home."
                  : "Release. Renew & Rise."
            }
          />
        )}
        {policies[kind] ? (
          <div className="max-w-3xl">
            <Accordion items={policies[kind]} />
          </div>
        ) : kind === "faq" ? (
          <div className="mx-auto max-w-3xl">
            <Accordion items={faqItems} />
          </div>
        ) : kind === "contact" ? (
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <h2 className="text-3xl">We’re here for the conversation.</h2>
              <p className="mt-5 leading-7">
                Questions about products, your routine or SheRise? Leave a preview message below.
                The customer support inbox and official social channels will be added before launch.
              </p>
              <p className="mt-5 text-sm text-muted-foreground">
                This form validates your message locally; it does not send an email.
              </p>
              <Link to="/faq" className="mt-6 inline-block underline">
                Explore frequently asked questions ?
              </Link>
            </div>
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
            >
              <label className="field">
                Name
                <input required autoComplete="name" />
              </label>
              <label className="field">
                Email
                <input required type="email" autoComplete="email" />
              </label>
              <label className="field">
                Topic
                <select>
                  <option>Product question</option>
                  <option>Order support</option>
                  <option>Partnerships</option>
                  <option>Something else</option>
                </select>
              </label>
              <label className="field">
                Your message
                <textarea required rows={5} minLength={10} />
              </label>
              <Button type="submit" size="lg">
                Preview message
              </Button>
              <p role="status">
                {sent
                  ? "Your message is valid. Sending will be available when customer support is connected."
                  : ""}
              </p>
            </form>
          </div>
        ) : kind === "period-guide" ? (
          <>
            <section className="grid gap-6 md:grid-cols-[1.05fr_0.95fr] md:gap-8">
              <div className="flex flex-col justify-center">
                <p className="eyebrow">MENSTRUAL WELLNESS & MINDFUL SELF-CARE</p>
                <h2 className="font-display text-3xl leading-tight md:text-4xl">
                  Comfort and calm for your cycle.
                </h2>
                <div className="mt-6 border bg-gradient-to-br from-brand-blush/70 via-white to-brand-cream p-5 shadow-sm md:p-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="eyebrow">WELLNESS TIPS DURING MENSTRUATION</p>
                      <h3 className="font-display text-2xl leading-tight text-brand-navy">
                        Simple care tips.
                      </h3>
                    </div>
                    <span className="w-fit border border-brand-coral/30 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-brand-coral">
                      Daily care
                    </span>
                  </div>
                  <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                    {[
                      {
                        icon: ShieldCheck,
                        title: "Hygiene",
                        copy: "Change pads every 4-6 hours and wash with clean water.",
                      },
                      {
                        icon: Droplets,
                        title: "Hydration",
                        copy: "Drink water; warm water may ease cramps and bloating.",
                      },
                      {
                        icon: Utensils,
                        title: "Balanced Food",
                        copy: "Choose iron-rich foods and reduce salty, oily snacks.",
                      },
                      {
                        icon: Activity,
                        title: "Light Exercise",
                        copy: "Gentle walking, stretching and breathing can relax the body.",
                      },
                      {
                        icon: Waves,
                        title: "Cramps",
                        copy: "Use a heating pad or warm water bag on the lower abdomen.",
                      },
                      {
                        icon: Bed,
                        title: "Rest",
                        copy: "Sleep properly and avoid overexertion.",
                      },
                      {
                        icon: MessageCircleHeart,
                        title: "Emotional Care",
                        copy: "Talk to someone you trust if you feel low.",
                        wide: true,
                      },
                    ].map(({ icon: Icon, title, copy, wide }, index) => (
                      <div
                        key={title}
                        className={`group border bg-white/85 p-4 shadow-sm transition-transform hover:-translate-y-0.5 hover:border-brand-coral/40 hover:shadow-md ${
                          wide ? "sm:col-span-2" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-blush text-brand-coral">
                            <Icon className="size-5" />
                          </span>
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-coral">
                              {String(index + 1).padStart(2, "0")}
                            </p>
                            <p className="font-display text-xl leading-tight text-brand-navy">{title}</p>
                            <p className="mt-1 text-base font-semibold leading-6 text-muted-foreground">{copy}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <img
                src={story}
                alt="A calm moment for personal care"
                width="700"
                height="700"
                className="period-guide-side-image aspect-[16/10] w-full self-start object-cover md:aspect-[4/5]"
              />
            </section>

            <section className="mt-14 grid gap-6 bg-brand-blush/60 p-6 md:mt-16 md:grid-cols-[0.8fr_1.2fr] md:p-8">
              <div>
                <p className="eyebrow">OUR ESSENCE</p>
                <h2 className="font-display text-3xl leading-tight text-brand-navy md:text-4xl">
                  Soft, strong and mindful.
                </h2>
                <p className="mt-3 leading-7 text-muted-foreground">
                  A wellness-inspired sanitary napkin brand should feel caring, clear and
                  empowering.
                </p>
              </div>
              <div className="grid content-center gap-x-8 gap-y-3 text-sm font-semibold text-brand-navy sm:grid-cols-2">
                {[
                  "Compassionate",
                  "Nurturing",
                  "Pure",
                  "Mindful",
                  "Balanced",
                  "Empowering",
                  "Healing-focused",
                  "Respectful of nature",
                  "Feminine without stereotypes",
                  "Calm and positive",
                ].map((value) => (
                  <span key={value} className="flex items-center gap-3 border-b border-brand-coral/20 pb-2">
                    <span className="size-2 shrink-0 rounded-full bg-brand-coral" />
                    {value}
                  </span>
                ))}
              </div>
            </section>

            <section className="mt-14 overflow-hidden pb-4 md:mt-16 md:pb-6" aria-label="Menstrual wellness pillars">
              <div className="wellness-carousel-track flex gap-4">
                {[
                  {
                    icon: Leaf,
                    title: "Holistic",
                    copy: "Supports overall well-being, not just menstrual hygiene.",
                  },
                  {
                    icon: Heart,
                    title: "Menstrual Wellness",
                    copy: "Comfort, skin health, breathability, hygiene and confidence during periods.",
                  },
                  {
                    icon: Sparkles,
                    title: "Mindful Self-Care",
                    copy: "Simple habits like meditation, deep breathing, journaling, rest and nourishing food.",
                  },
                  {
                    icon: Flower2,
                    title: "Spiritual Perspective",
                    copy: "Honoring natural rhythms with self-awareness, self-compassion and calm reflection.",
                  },
                  {
                    icon: Leaf,
                    title: "Holistic",
                    copy: "Supports overall well-being, not just menstrual hygiene.",
                    duplicate: true,
                  },
                  {
                    icon: Heart,
                    title: "Menstrual Wellness",
                    copy: "Comfort, skin health, breathability, hygiene and confidence during periods.",
                    duplicate: true,
                  },
                  {
                    icon: Sparkles,
                    title: "Mindful Self-Care",
                    copy: "Simple habits like meditation, deep breathing, journaling, rest and nourishing food.",
                    duplicate: true,
                  },
                  {
                    icon: Flower2,
                    title: "Spiritual Perspective",
                    copy: "Honoring natural rhythms with self-awareness, self-compassion and calm reflection.",
                    duplicate: true,
                  },
                ].map(({ icon: Icon, title, copy, duplicate }, index) => (
                  <article
                    key={`${title}-${index}`}
                    aria-hidden={duplicate ? "true" : undefined}
                    className="wellness-carousel-card shrink-0 border bg-brand-cream p-5"
                  >
                    <Icon className="mb-3 size-7 text-brand-coral" />
                    <h3 className="font-display text-2xl">{title}</h3>
                    <p className="mt-2 leading-6 text-muted-foreground">{copy}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="mt-14 grid gap-5 md:mt-16 md:grid-cols-2">
              <div className="bg-brand-blush p-5 md:p-6">
                <Moon className="mb-3 size-7 text-brand-coral" />
                <h3 className="font-display text-3xl">During your period</h3>
                <ul className="mt-4 space-y-3 leading-6">
                  {[
                    "Choose a pad that feels comfortable for your flow.",
                    "Look for breathable, hygienic care that supports skin comfort.",
                    "Carry an extra pad when you are going out.",
                    "Change as needed and follow the final product instructions.",
                    "Give yourself permission to rest when your body asks for it.",
                  ].map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2 size-2 shrink-0 rounded-full bg-brand-coral" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border p-5 md:p-6">
                <SunMedium className="mb-3 size-7 text-brand-coral" />
                <h3 className="font-display text-3xl">Mindful self-care</h3>
                <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  {[
                    "Meditation",
                    "Gentle yoga",
                    "Deep breathing",
                    "Journaling",
                    "Rest",
                    "Nourishing food",
                    "Good sleep",
                    "Emotional balance",
                  ].map((item) => (
                    <li key={item} className="border bg-white px-4 py-2.5 font-semibold">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

          </>
        ) : (
          <>
            <div className="editorial-grid mb-14">
              <img
                src={story}
                alt="Everyday comfort and a moment of pause"
                width="800"
                height="800"
              />
              <div className="p-5 md:p-12">
                {kind === "why-sherise" ? (
                  <>
                    <p className="eyebrow">THE SHERISE PHILOSOPHY</p>
                    <blockquote className="font-display text-3xl leading-tight text-brand-navy md:text-4xl">
                      "With every cycle, she releases, renews and RISE."
                    </blockquote>
                    <div className="my-6 space-y-4 text-justify leading-7">
                      <p>
                        Menstruation is a beautiful rhythm created by nature. Just like the moon
                        changes its phases every month, the female body also follows a natural cycle.
                      </p>
                      <p>
                        This cycle shows strength, renewal and the power of creation. It reminds us
                        that care, rest and self-respect are part of a woman&apos;s natural rhythm.
                      </p>
                      <p>
                        The feminine energy is called <strong>Shakti</strong>, the energy that
                        creates and sustains life. Menstruation is a reminder of that inner power.
                      </p>
                      <p>When we honor this natural process, we honor life itself.</p>
                    </div>
                    <blockquote className="border-t border-brand-coral/30 pt-5 font-display text-2xl leading-tight text-brand-navy">
                      "Let us support, respect and celebrate the strength within every woman."
                    </blockquote>
                  </>
                ) : (
                  <>
                    <p className="eyebrow">THE SHERISE PHILOSOPHY</p>
                    <h2 className="text-4xl">
                      Made for the way
                      <br />
                      you live.
                    </h2>
                    <div className="my-6 space-y-5 text-justify leading-8">
                      <p>
                        Period care should feel like part of your day. A little simpler. A little more
                        considered. SheRise is a space for thoughtful essentials and open conversations,
                        with room for every kind of routine.
                      </p>
                      <p>
                        We believe in clear information, personal choice and care without pressure. Our
                        preview collection is a first look at that direction.
                      </p>
                    </div>
                    <Action to="/shop">Explore SheRise</Action>
                  </>
                )}
              </div>
            </div>
            <Benefits />
          </>
        )}
      </div>
      {!policies[kind] && <Newsletter />}
    </>
  );
}
export function BlogListing({ items = posts }: { items?: BlogPost[] }) {
  return (
    <div className="container-shell section-space">
      <PageHeading
        title="Let’s talk periods."
        copy="A thoughtful reading corner for everyday care, routines and getting to know yourself."
      />
      <BlogGrid items={items} />
    </div>
  );
}
export function BlogDetail({ post, relatedPosts = posts }: { post: BlogPost; relatedPosts?: BlogPost[] }) {
  return (
    <div className="container-shell section-space">
      <div className="mx-auto max-w-3xl">
        <PageHeading
          title={post.title}
          copy={`${post.category} · ${post.date} · SheRise editorial preview`}
        />
        <img
          src={post.image}
          alt={post.title}
          width="1000"
          height="700"
          className="mb-10 aspect-[3/2] w-full object-cover"
        />
        <article className="space-y-6 text-lg leading-8">
          {post.content.map((t) => (
            <p key={t}>{t}</p>
          ))}
          <h2 className="pt-5 text-3xl">Make a little space for your routine</h2>
          <p>
            Keep the essentials you prefer close by, and give yourself permission to adjust your
            plans. Comfort is personal, and your routine can be too.
          </p>
          <p className="text-sm text-muted-foreground">
            Editorial preview. This is general information, not personalised medical advice.
          </p>
          <Action to="/period-guide">Explore the period guide</Action>
        </article>
      </div>
      <section className="mt-16">
        <SectionHeading title="Keep the conversation going" />
        <div className="grid gap-5 sm:grid-cols-2">
          {relatedPosts
            .filter((p) => p.slug !== post.slug)
            .map((p) => (
              <Link
                className="border p-6 font-display text-2xl"
                key={p.slug}
                to="/blog/$slug"
                params={{ slug: p.slug }}
              >
                {p.title} ?
              </Link>
            ))}
        </div>
      </section>
    </div>
  );
}
