import { useState } from "react";
import { Link } from "@/router-shim";
import { useEffect, type ReactNode } from "react";
import { createEnquirySubmitter } from "@/lib/enquiries";
import { FounderSection } from "@/components/founder-section";
import { SheRiseInitiative } from "@/components/sherise-initiative";
import {
  Droplets,
  Flower2,
  Heart,
  Leaf,
  Moon,
  ShieldCheck,
  Sparkles,
  SunMedium,
  TruckIcon,
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
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { posts, type BlogPost } from "@/lib/catalog";
import disposeSafelyImage from "@/assets/period guide/Dispose safely.png";
import markItImage from "@/assets/period guide/Mark it.png";
import rollOrFoldImage from "@/assets/period guide/Roll or fold.png";
import wrapItImage from "@/assets/period guide/Wrap it.png";
import guideImage from "@/assets/sherise-guide.jpg";
import wellnessTipsImage from "@/assets/WELLNESS TIPS DURING MENSTRUATION.png";
import story from "@/assets/sherise-story.jpg";
import menstrualWellnessImage from "@/assets/MENSTRUAL WELLNESS & MINDFUL SELF-CARE.png";
import philosophyImage from "@/assets/sherise-philosophy.webp";
import whyPhilosophyImage from "@/assets/product img why sherise.png";
import anionStripImage from "@/assets/Anion strip.png";
import softCottonImage from "@/assets/comfort section cards img/Soft Cotton Top Layer.png";
import absorbentCoreImage from "@/assets/comfort section cards img/Super Absorbent.png";
import breathableSheetImage from "@/assets/comfort section cards img/Breathable back sheet.png";
import leakGuardImage from "@/assets/comfort section cards img/Leak guard protection.png";
import dryComfortImage from "@/assets/comfort section cards img/dry and comfortable feel.png";
import wrappedHygieneImage from "@/assets/comfort section cards img/indvidually wrapped for hygiene.png";
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
function ComfortCarousel({ children }: { children: ReactNode }) {
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const [count, setCount] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!api) return;
    const update = () => {
      setSelected(api.selectedScrollSnap());
      setCount(api.scrollSnapList().length);
    };
    update();
    api.on("select", update);
    api.on("reInit", update);
    return () => {
      api.off("select", update);
      api.off("reInit", update);
    };
  }, [api]);

  useEffect(() => {
    if (!api || paused) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timer = window.setInterval(() => {
      if (!motion.matches && !document.hidden) api.scrollNext();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [api, paused]);

  return (
    <Carousel
      id="comfort-carousel"
      aria-label="Comfort in every layer features"
      opts={{ align: "start", loop: true }}
      setApi={setApi}
      className="mt-10 scroll-mt-28 md:mt-12"
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <CarouselContent className="-ml-4">{children}</CarouselContent>
      <div className="mt-4 flex justify-center gap-0">
        {Array.from({ length: count }, (_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Go to feature ${index + 1}`}
            aria-current={selected === index ? "true" : undefined}
            onClick={() => api?.scrollTo(index)}
            className="flex size-7 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-navy"
          >
            <span className={`h-1.5 rounded-full transition-all ${selected === index ? "w-4 bg-brand-navy" : "w-1.5 bg-brand-navy/25"}`} />
          </button>
        ))}
      </div>
    </Carousel>
  );
}

export function InfoPage({ kind, items }: { kind: string; items?: { q: string; a: string }[] }) {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [enquiryError, setEnquiryError] = useState("");
  const [submitEnquiry] = useState(() => createEnquirySubmitter());
  const faqItems = items || faq;
  return (
    <>
      <div
        className={`${kind === "about" ? "about-page " : ""}container-shell ${
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
                <address className="mt-6 text-sm not-italic">
                  <dl className="grid gap-5">
                  <div>
                    <dt className="font-bold uppercase text-brand-burgundy">Address</dt>
                    <dd className="mt-1 leading-6 text-muted-foreground">
                      S3 Enterprises, Prabhadevi, Mumbai 400 013
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold uppercase text-brand-burgundy">Phone</dt>
                    <dd className="mt-1 leading-6 text-muted-foreground">
                      <a href="tel:+919594241666" className="underline underline-offset-4 hover:text-brand-burgundy">
                        +91 95942 41666
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold uppercase text-brand-burgundy">Email</dt>
                    <dd className="mt-1 break-words leading-6 text-muted-foreground">
                      <a href="mailto:hellosherise.in@gmail.com" className="underline underline-offset-4 hover:text-brand-burgundy">
                        hellosherise.in@gmail.com
                      </a>
                    </dd>
                  </div>
                  </dl>
                </address>
                <Link to="/faq" className="mt-6 inline-flex font-semibold text-brand-navy underline underline-offset-4">
                  View FAQs
                </Link>
              </div>
            </div>
            <form
              className="border border-[#eadbd2] bg-white p-6 shadow-sm md:p-8"
              onSubmit={async (e) => {
                e.preventDefault();
                if (sending) return;
                const form = e.currentTarget;
                const data = new FormData(form);
                setSending(true);
                setSent(false);
                setEnquiryError("");
                try {
                  await submitEnquiry({
                    name: String(data.get("name") ?? ""),
                    email: String(data.get("email") ?? ""),
                    mobile: String(data.get("mobile") ?? ""),
                    interestedIn: String(data.get("interestedIn") ?? ""),
                    message: String(data.get("message") ?? ""),
                    source: "Contact form",
                  });
                  setSent(true);
                  form.reset();
                } catch (error) {
                  setEnquiryError(error instanceof Error ? error.message : "Could not send your enquiry. Please try again.");
                } finally {
                  setSending(false);
                }
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
                  <input name="name" required maxLength={120} autoComplete="name" placeholder="Your full name" />
                </label>
                <label className="field">
                  Email
                  <input name="email" required type="email" maxLength={254} autoComplete="email" placeholder="you@example.com" />
                </label>
                <label className="field">
                  Phone number (optional)
                  <input name="mobile" type="tel" minLength={10} maxLength={10} pattern="[0-9]{10}"
                    inputMode="numeric" autoComplete="tel-national" title="Enter exactly 10 digits, without +91 or spaces."
                    placeholder="10-digit mobile number" />
                </label>
                <label className="field">
                  Topic
                  <select name="interestedIn">
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
                  <textarea name="message" required rows={5} minLength={10} maxLength={1000} placeholder="Write your message here" />
                </label>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <Button type="submit" size="lg" disabled={sending}>
                  {sending ? "Sending..." : "Submit message"}
                </Button>
                <p className="text-sm font-medium text-green-700" role="status">
                  {sent ? "Your message has been sent. The SheRise team will get back to you soon." : ""}
                </p>
              </div>
              {enquiryError ? <p role="alert" className="mt-3 text-sm text-red-700">{enquiryError}</p> : null}
            </form>
          </section>
        ) : kind === "period-guide" ? (
          <>
            <section id="period-guide-overview" className="scroll-mt-28 grid gap-6 md:grid-cols-[1.05fr_0.95fr] md:gap-8">
              <div className="flex flex-col justify-center">
                <h2 className="font-display text-3xl leading-tight text-brand-navy md:text-4xl">
                  Menstrual wellness &amp; <span className="text-brand-coral">mindful self-care</span>
                </h2>
                <div className="mt-6 leading-7 text-muted-foreground">
                  <p className="text-justify">
                    Use this guide as a quick checklist for period days: choose the right pad for
                    your flow, change it on time, dispose of it safely, and give your body enough
                    water, food and rest.
                  </p>
                  <ul className="mt-5 grid gap-x-6 gap-y-3 text-sm font-medium text-brand-navy sm:grid-cols-2">
                    {[
                      "Pick regular, heavy-flow or overnight coverage based on your day.",
                      "Change your pad every 4-6 hours, or sooner if needed.",
                      "Keep an extra pad and disposal pouch in your bag.",
                      "Track pain, heavy bleeding or unusual changes and ask a doctor if worried.",
                    ].map((item) => (
                      <li key={item} className="flex gap-3">
                        <span aria-hidden="true" className="mt-2 size-2 shrink-0 rounded-full bg-brand-coral" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <img
                src={menstrualWellnessImage}
                alt="A calm moment for personal care"
                width="700"
                height="520"
                className="h-[300px] w-full self-start object-cover sm:h-[340px] md:h-[420px]"
              />
            </section>

            <section id="wellness-tips" className="mt-14 scroll-mt-28 md:mt-16">
              <div className="grid gap-7 lg:grid-cols-[1fr_1fr] lg:gap-12">
                <div className="relative order-2 aspect-square w-full self-start overflow-hidden lg:order-1">
                <img
                  src={wellnessTipsImage}
                  alt="Period care essentials arranged for daily comfort"
                  width="700"
                  height="520"
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-contain"
                />
                </div>
                <div className="order-1 self-center py-1 lg:order-2">
                  <h3 className="max-w-lg font-display text-3xl leading-tight text-brand-navy md:text-4xl">
                    Wellness tips <span className="text-brand-coral">during menstruation</span>
                  </h3>
                  <p className="mt-4 max-w-xl leading-7 text-muted-foreground">
                    Some days you may need more rest; other days, your usual routine feels fine.
                    Here are a few everyday things to keep in mind.
                  </p>
                  <dl className="mt-6 grid gap-x-8 sm:grid-cols-2">
                    {[
                      {
                        title: "Pad changes",
                        copy: "Change pads every 4-6 hours and keep spare pads in a clean pouch.",
                      },
                      {
                        title: "Water",
                        copy: "Warm water can feel comforting during cramps or bloating.",
                      },
                      {
                        title: "Regular meals",
                        copy: "Choose iron-rich foods, fruits and simple home meals.",
                      },
                      {
                        title: "Gentle movement",
                        copy: "Walk, stretch or breathe deeply only if your body feels ready.",
                      },
                      {
                        title: "Comfort during cramps",
                        copy: "Use gentle warmth and pause when pain starts rising.",
                      },
                      {
                        title: "Rest",
                        copy: "Sleep properly and ask for support when you feel low.",
                      },
                    ].map(({ title, copy }) => (
                      <div key={title} className="border-t border-brand-navy/10 py-4">
                        <dt className="text-base font-semibold">{title}</dt>
                        <dd className="mt-1 text-sm leading-6 text-muted-foreground">{copy}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </section>

            <section id="red-dot-method" className="mt-14 scroll-mt-28 overflow-hidden border border-brand-coral/20 bg-white shadow-sm md:mt-16">
              <div className="bg-brand-navy p-6 text-white md:p-8 lg:p-10">
                <div className="grid gap-6 lg:grid-cols-[0.7fr_1fr] lg:items-end">
                  <div>
                    <p className="eyebrow eyebrow-on-dark">SAFE PAD DISPOSAL</p>
                    <h2 className="font-display text-3xl leading-tight md:text-4xl">
                      Red Dot Method
                    </h2>
                    <p className="mt-4 text-justify leading-7 text-white/80">
                      The Red Dot Method is a simple public-health practice for safely disposing of
                      used sanitary pads. A visible red dot on the wrapped waste helps waste handlers
                      identify menstrual waste without opening it.
                    </p>
                  </div>
                  <div className="border-t border-white/20 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                    <p className="font-display text-2xl leading-tight text-brand-blush">
                      Wrap it. Mark it. Dispose of it safely.
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/70">
                      Always follow your local municipal waste-segregation rules where available.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-brand-blush/50 p-4 md:p-6 lg:p-8">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      {
                        image: rollOrFoldImage,
                        title: "Roll or fold",
                        copy: "Roll the used pad inward so the soiled area is covered securely.",
                      },
                      {
                        image: wrapItImage,
                        title: "Wrap it",
                        copy: "Wrap it tightly in newspaper, a paper disposal bag, or an eco-friendly disposal pouch.",
                      },
                      {
                        image: markItImage,
                        title: "Mark it",
                        copy: "Draw or stick a clear red dot on the outside of the wrapped paper or bag.",
                      },
                      {
                        image: disposeSafelyImage,
                        title: "Dispose safely",
                        copy: "Place it in a lidded dry-waste or sanitary-waste bin. Never flush pads.",
                      },
                    ].map((item, index) => (
                      <article
                        key={item.title}
                        className="group overflow-hidden border border-[#eadbd2] bg-white shadow-sm transition-transform hover:-translate-y-0.5 hover:border-brand-coral/40 hover:shadow-md"
                      >
                        <div className="relative">
                          <img
                            src={item.image}
                            alt={`${item.title} step for the Red Dot Method`}
                            width="512"
                            height="512"
                            loading="lazy"
                            className="aspect-square w-full object-cover"
                          />
                          <span className="absolute left-4 top-4 inline-flex size-10 items-center justify-center rounded-full bg-brand-coral text-sm font-bold text-white shadow-sm">
                            {index + 1}
                          </span>
                        </div>
                        <div className="p-4 md:p-5">
                          <h3 className="font-display text-2xl leading-tight text-brand-navy">
                            {item.title}
                          </h3>
                          <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground">
                            {item.copy}
                          </p>
                        </div>
                      </article>
                    ))}
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="flex gap-3 border border-[#eadbd2] bg-white p-4">
                    <ShieldCheck className="mt-1 size-6 shrink-0 text-brand-coral" />
                    <div>
                      <h3 className="font-display text-xl leading-tight text-brand-navy">
                        Protects sanitation workers
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Wrapped and marked sanitary waste reduces accidental contact during manual
                        sorting.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 border border-[#eadbd2] bg-white p-4">
                    <Droplets className="mt-1 size-6 shrink-0 text-brand-coral" />
                    <div>
                      <h3 className="font-display text-xl leading-tight text-brand-navy">
                        Improves segregation
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        The red dot alerts waste handlers to separate menstrual waste for safer
                        disposal or processing.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="wellness-essence" className="mt-14 scroll-mt-28 grid gap-6 bg-brand-blush/60 p-6 md:mt-16 md:grid-cols-[0.8fr_1.2fr] md:p-8">
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

            <section id="during-period" className="mt-14 scroll-mt-28 grid gap-5 md:mt-16 md:grid-cols-2">
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
              <div id="mindful-self-care" className="scroll-mt-28 border p-5 md:p-6">
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
                src={kind === "about" ? philosophyImage : kind === "why-sherise" ? whyPhilosophyImage : story}
                alt={kind === "about" ? "Women sharing a conversation about SheRise period-care essentials" : kind === "why-sherise" ? "SheRise sanitary pads, pink packaging and individually wrapped pads on a table" : "Everyday comfort and a moment of pause"}
                width={kind === "about" ? 1500 : kind === "why-sherise" ? 1407 : 800}
                height={kind === "about" ? 1000 : kind === "why-sherise" ? 768 : 800}
              />
              <div className="p-5 md:p-12">
                {kind === "why-sherise" ? (
                  <>
                    <h2 className="font-display text-3xl leading-tight text-brand-navy md:text-4xl">
                      Why choose <span className="text-brand-coral">SheRise</span>
                    </h2>
                    <div className="mt-5 space-y-4 text-justify leading-7 text-muted-foreground">
                      <p>
                        From busy mornings to slower evenings, your period care should fit into your
                        life. SheRise brings together a soft cotton top layer, an absorbent core and
                        a breathable back sheet to help you feel comfortable through your daily routine.
                      </p>
                      <p>
                        A soft feel against your skin and added leak guards give you practical reasons
                        to choose SheRise. Different sizes and pack options let you pick what suits
                        your flow, while individual wrappers make it easy to keep a spare in your bag
                        for work, college or days out.
                      </p>
                      <p>
                        Whether you are choosing your first pack or stocking up for your next cycle,
                        explore the product details to find your fit. Choose SheRise for thoughtful
                        essentials that put everyday comfort and convenience first.
                      </p>
                    </div>
                    <div className="mt-6">
                      <Action to="/shop">Shop SheRise pads</Action>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-4xl text-brand-navy">
                      The SheRise <span className="text-brand-coral">philosophy</span>
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
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                      <Action to="/shop">Explore SheRise</Action>
                      {kind === "about" && (
                        <Link to="/about/meet-the-founder" className="inline-flex min-h-11 items-center font-semibold text-brand-burgundy underline underline-offset-8">
                          Meet our founder
                        </Link>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
            {kind === "why-sherise" && (
              <section
                id="product-features"
                aria-labelledby="comfort-heading"
                className="mb-14 scroll-mt-28 pt-8 md:pt-12"
              >
                <h2 id="comfort-heading" className="text-center font-display text-3xl text-brand-navy md:text-4xl">
                  Product <span className="text-brand-coral">Features</span>
                </h2>
                <ComfortCarousel>
                  {[
                    { title: "Soft Cotton Top Layer", copy: "A soft surface for comfort against your skin.", image: softCottonImage, alt: "Soft cotton top layer" },
                    { title: "Super Absorbent Core", copy: "Absorbs menstrual flow to help keep you dry.", image: absorbentCoreImage, alt: "Super absorbent core" },
                    { title: "Breathable Back Sheet", copy: "Breathable care for everyday wear.", image: breathableSheetImage, alt: "Breathable back sheet" },
                    { title: "Leak Guard Protection", copy: "Added protection to help guard against leaks.", image: leakGuardImage, alt: "Leak guard protection" },
                    { title: "Dry & Comfortable Feel", copy: "Comfort that fits into your daily routine.", image: dryComfortImage, alt: "Dry and comfortable everyday care" },
                    { title: "Individually Wrapped for Hygiene", copy: "Easy to carry and kept wrapped until use.", image: wrappedHygieneImage, alt: "Individually wrapped pads for hygiene" },
                  ].map(({ title, image, alt }) => (
                    <CarouselItem key={title} className="basis-[85%] pl-4 sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                    <article className="h-full overflow-hidden rounded-none border border-brand-coral/15 bg-white">
                      <img
                        src={image}
                        alt={alt}
                        width={432}
                        height={360}
                        loading="lazy"
                        className="aspect-[4/3] w-full object-cover"
                      />
                    </article>
                    </CarouselItem>
                  ))}
                </ComfortCarousel>
              </section>
            )}
            <Benefits />
            {kind === "about" && <FounderSection />}
            {kind === "why-sherise" && (
              <>
                <section id="anion-strip" className="mt-12 grid scroll-mt-28 items-center gap-8 border-y border-brand-coral/20 py-8 md:grid-cols-2 md:gap-12">
                  <img
                    src={anionStripImage}
                    alt="SheRise sanitary pad with a visible anion strip alongside its packaging"
                    width={432}
                    height={360}
                    loading="lazy"
                    className="mx-auto h-auto w-full max-w-lg rounded-none md:order-2"
                  />
                  <div>
                    <h2 className="font-display text-3xl text-brand-navy">
                      What to know about the <span className="text-brand-coral">Anion Strip</span>
                    </h2>
                    <div className="mt-4 max-w-3xl space-y-4 text-justify [text-justify:inter-word] leading-7 text-muted-foreground">
                      <p>
                        Selected SheRise pads include an Anion Strip as an additional component in
                        the pad&apos;s layered design. Anion or negative-ion pads are sometimes
                        promoted with claims about odour, bacteria, cramps, or other health effects.
                      </p>
                      <p>
                        We have not verified clinical evidence showing that the strip in SheRise
                        pads provides those effects, so we describe it as a design feature rather
                        than a health benefit. For the pad&apos;s softness, absorbency, breathability,
                        and individual wrapping, see Product Features above.
                      </p>
                    </div>
                    <div className="mt-5"><Action to="/shop">Explore our pads</Action></div>
                  </div>
                </section>
                <SheRiseInitiative />
              </>
            )}
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
          copy={`${post.category} · ${post.date} · ${post.author || "SheRise Team"}`}
        />
        <img
          src={post.image || guideImage}
          alt={post.title}
          width="1000"
          height="700"
          className="mb-10 aspect-[3/2] w-full object-cover"
        />
        <article className="space-y-6 text-lg leading-8">
          {post.content.map((t) => (
            <p key={t}>{t}</p>
          ))}
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
