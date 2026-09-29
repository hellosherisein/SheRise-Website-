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
  TruckIcon,
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
      q: "Information we collect",
      a: "SheRise may collect your name, phone number, email address, delivery address, order details, payment status, customer support messages, newsletter signups and basic website usage information needed to run the store.",
    },
    {
      q: "How we use your information",
      a: "We use your information to create and manage your account, process orders, arrange delivery, provide customer support, send order updates, prevent misuse, improve the website and share product or wellness updates when you choose to receive them.",
    },
    {
      q: "Payments and sensitive details",
      a: "Online payments, when enabled, are processed through payment service providers. SheRise does not ask you to share card PINs, OTPs or banking passwords and does not store full card details on the website.",
    },
    {
      q: "Sharing with service partners",
      a: "We may share only the information required with delivery partners, payment providers, technology service providers, customer support tools, auditors, legal authorities or business partners who help us operate the SheRise store.",
    },
    {
      q: "Cookies and local storage",
      a: "The website may use cookies or browser storage for login sessions, cart, wishlist, preferences, security and analytics. You can clear browser data, but some features may stop working until you sign in or add items again.",
    },
    {
      q: "Data security",
      a: "We use reasonable technical and organisational safeguards to protect customer information. No online system is completely risk-free, so customers should keep account details private and report suspicious activity promptly.",
    },
    {
      q: "Your choices and requests",
      a: "You can update account details, remove saved addresses and unsubscribe from marketing communication where available. For access, correction or deletion requests, contact SheRise support using the official contact details on the website.",
    },
    {
      q: "Retention and updates",
      a: "We keep information only as long as needed for orders, support, legal, accounting and security purposes. This policy may be updated when business processes, laws or website features change.",
    },
  ],
  terms: [
    {
      q: "Using the SheRise website",
      a: "By using this website, creating an account or placing an order, you agree to use the SheRise store lawfully and in accordance with these terms, our privacy policy and applicable customer policies.",
    },
    {
      q: "Product information",
      a: "We aim to display product names, pack counts, sizes, prices, images, features and availability accurately. Minor differences in packaging, colour, batch details or display appearance may occur. Always read the product pack before use.",
    },
    {
      q: "Health and hygiene note",
      a: "SheRise sanitary pads are hygiene products and are not a substitute for medical advice. If you experience severe pain, very heavy bleeding, unusual symptoms, irritation or allergy, stop use if needed and consult a qualified healthcare professional.",
    },
    {
      q: "Orders, pricing and availability",
      a: "An order is confirmed only after successful order placement and acceptance by SheRise. Prices, offers, stock and delivery availability may change without prior notice. We may cancel or contact you about orders affected by errors, stock issues or delivery restrictions.",
    },
    {
      q: "Payments",
      a: "Customers must provide accurate billing and contact information. Online payment, COD or other payment options may be available depending on order value, location and business rules shown at checkout.",
    },
    {
      q: "Account responsibility",
      a: "You are responsible for keeping your login details confidential and for all activity under your account. Please make sure your name, phone number and delivery address are correct before placing an order.",
    },
    {
      q: "Website content and brand rights",
      a: "The SheRise name, logo, product content, images, design, text and website materials belong to SheRise or its licensors. They may not be copied, reused or modified for commercial use without written permission.",
    },
    {
      q: "Limitation of liability",
      a: "To the extent permitted by law, SheRise is not responsible for indirect losses, delays outside our control, incorrect customer-provided information, misuse of products or issues caused by third-party services.",
    },
    {
      q: "Changes to terms",
      a: "SheRise may update these terms as the business, website features or legal requirements change. Continued use of the website after updates means you accept the revised terms.",
    },
  ],
  "shipping-policy": [
    {
      q: "Where we ship",
      a: "SheRise currently accepts delivery details for serviceable locations in India. Delivery availability may depend on courier coverage, pincode, product availability and order value.",
    },
    {
      q: "Order processing time",
      a: "Orders are usually processed within 1-2 business days after confirmation, excluding Sundays, public holidays or days affected by stock checks, payment review or operational delays.",
    },
    {
      q: "Estimated delivery time",
      a: "Most orders are expected to arrive within 3-7 business days after dispatch, depending on your city, pincode and courier movement. Remote or high-demand locations may take longer.",
    },
    {
      q: "Shipping charges",
      a: "Shipping charges, COD charges or free-shipping eligibility are shown at checkout before order confirmation. Charges may vary based on order value, delivery location, offer rules and logistics partner terms.",
    },
    {
      q: "Tracking updates",
      a: "Once an order is dispatched, tracking details will be shared through the available contact method or account order page. Tracking may take some time to update after pickup by the courier.",
    },
    {
      q: "Address and contact details",
      a: "Please enter a complete address, correct pincode and reachable phone number. SheRise is not responsible for delays or failed delivery caused by incomplete, incorrect or unreachable delivery details.",
    },
    {
      q: "Failed delivery or returned shipment",
      a: "If a courier cannot deliver because the customer is unavailable, refuses delivery or provides incorrect details, the shipment may return to us. Re-shipping may require an additional delivery charge.",
    },
    {
      q: "Damaged package at delivery",
      a: "If the outer package appears damaged, tampered or wet, please record photos before opening and contact SheRise support as soon as possible with order details.",
    },
  ],
  "return-refund-policy": [
    {
      q: "Hygiene product return rule",
      a: "Sanitary pads are hygiene-sensitive products. For customer safety, opened, used, damaged-after-delivery or unsealed packs cannot be returned or exchanged unless the issue is due to wrong, defective or damaged goods received from SheRise.",
    },
    {
      q: "Eligible return or replacement cases",
      a: "You may request support if you receive an incorrect product, missing item, damaged pack, expired product or a manufacturing defect. The request must include order details and clear photos or videos of the package and product.",
    },
    {
      q: "Reporting window",
      a: "Please report damaged, missing, incorrect or defective items within 48 hours of delivery. Requests raised after this window may be difficult to verify and may not qualify for replacement or refund.",
    },
    {
      q: "Non-returnable cases",
      a: "Returns are not accepted for opened packs, used products, change of mind, dislike of product after opening, incorrect product ordered by the customer, wrong address, refusal of delivery or damage caused after delivery.",
    },
    {
      q: "Cancellation before dispatch",
      a: "Orders may be cancellable before dispatch from the customer account or by contacting support. Once dispatched, cancellation may not be possible and the standard delivery and return rules will apply.",
    },
    {
      q: "Refund method and timeline",
      a: "Approved refunds are usually processed to the original payment method or approved refund channel within 5-10 business days after verification. Bank or payment provider timelines may vary.",
    },
    {
      q: "Replacement process",
      a: "If a replacement is approved, SheRise may ship the correct product or suitable replacement based on stock availability. In some cases, refund may be offered instead of replacement.",
    },
    {
      q: "How to raise a request",
      a: "Contact SheRise support with your order number, registered phone or email, issue description and clear photos or videos. Please keep the product and packaging until the review is completed.",
    },
  ],
};
function PolicyList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="max-w-4xl border-y border-[#eadbd2]">
      {items.map((item, index) => (
        <section key={item.q} className="grid gap-4 border-b border-[#eadbd2] py-6 last:border-b-0 sm:grid-cols-[72px_minmax(0,1fr)]">
          <span className="font-display text-2xl leading-none text-brand-coral">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div>
            <h2 className="font-display text-2xl leading-tight text-brand-navy sm:text-3xl">
              {item.q}
            </h2>
            <p className="mt-3 max-w-3xl text-justify text-base leading-7 text-muted-foreground">
              {item.a}
            </p>
          </div>
        </section>
      ))}
    </div>
  );
}
export function InfoPage({ kind, items }: { kind: string; items?: { q: string; a: string }[] }) {
  const [sent, setSent] = useState(false);
  const faqItems = items || faq;
  return (
    <>
      <div
        className={`container-shell ${
          kind === "period-guide" || kind === "why-sherise" || kind === "about" ? "py-8 md:py-10" : policies[kind] ? "pt-8 pb-12 md:pt-10 md:pb-16" : "pt-8 pb-12 md:pt-10 md:pb-16"
        }`}
      >
        {kind !== "period-guide" && kind !== "why-sherise" && kind !== "about" && (
          <PageHeading
            title={infoTitles[kind] || "SheRise"}
            showBreadcrumb={false}
            align={kind === "faq" ? "center" : "left"}
            copy={
              policies[kind]
                ? "Clear information for shopping with SheRise."
                : kind === "faq"
                  ? "Answers to help you feel a little more at home."
                  : "Release. Renew & Rise."
            }
          />
        )}
        {policies[kind] ? (
          <PolicyList items={policies[kind]} />
        ) : kind === "faq" ? (
          <div className="mx-auto max-w-3xl">
            <Accordion items={faqItems} />
          </div>
        ) : kind === "contact" ? (
          <section className="grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-stretch">
            <div className="overflow-hidden border border-[#eadbd2] bg-brand-blush/70">
              <img
                src={story}
                alt="SheRise support and care conversation"
                width="800"
                height="560"
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="p-6 md:p-8">
                <p className="eyebrow">SHERISE SUPPORT</p>
                <h2 className="font-display text-3xl leading-tight text-brand-navy">
                  We are here to help you choose with comfort.
                </h2>
                <p className="mt-4 text-justify leading-7 text-muted-foreground">
                  Questions about products, sizing, flow, orders or partnerships? Send your details and the SheRise team will guide you with clear, thoughtful support.
                </p>
                <div className="mt-6 grid gap-3 text-sm">
                  <div className="border border-[#eadbd2] bg-white p-4">
                    <p className="font-bold uppercase text-brand-burgundy">Product guidance</p>
                    <p className="mt-1 text-muted-foreground">Pads, pack sizes, comfort and flow selection.</p>
                  </div>
                  <div className="border border-[#eadbd2] bg-white p-4">
                    <p className="font-bold uppercase text-brand-burgundy">Order support</p>
                    <p className="mt-1 text-muted-foreground">Shipping, returns, account and checkout help.</p>
                  </div>
                </div>
                <Link to="/faq" className="mt-6 inline-flex font-semibold text-brand-navy underline underline-offset-4">
                  View FAQs
                </Link>
              </div>
            </div>
            <form
              className="border border-[#eadbd2] bg-white p-6 shadow-sm md:p-8"
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
            >
              <div className="mb-6">
                <p className="eyebrow">SEND A MESSAGE</p>
                <h2 className="font-display text-3xl leading-tight text-brand-navy">Contact SheRise</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Share your question and we will help you with the next step.
                </p>
              </div>
              <div className="grid gap-5">
                <label className="field">
                  Name
                  <input required autoComplete="name" placeholder="Your full name" />
                </label>
                <label className="field">
                  Email
                  <input required type="email" autoComplete="email" placeholder="you@example.com" />
                </label>
                <label className="field">
                  Topic
                  <select>
                    <option>Help me choose a pad</option>
                    <option>Flow or size guidance</option>
                    <option>First-time SheRise user</option>
                    <option>Order or delivery support</option>
                    <option>Returns or replacement</option>
                    <option>Bulk / retail partnership</option>
                    <option>Feedback or suggestion</option>
                    <option>Something else</option>
                  </select>
                </label>
                <label className="field">
                  Your message
                  <textarea required rows={5} minLength={10} placeholder="Write your message here" />
                </label>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <Button type="submit" size="lg">
                  Submit message
                </Button>
                <p className="text-sm text-muted-foreground" role="status">
                  {sent ? "Your message is ready. Support email connection can be enabled for live sending." : ""}
                </p>
              </div>
            </form>
          </section>
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
