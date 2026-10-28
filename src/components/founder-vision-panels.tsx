import {
  BicepsFlexed,
  BriefcaseMedical,
  HeartPulse,
  ShieldCheck,
  Smile,
  UsersRound,
} from "lucide-react";
import socialImpactImage from "@/assets/social-impact.webp";
import { VisionFlorals } from "./vision-florals";

const pillars = [
  { title: "Menstrual health", caption: "Know your flow." },
  { title: "Nutrition", caption: "Nourish your body." },
  { title: "Yoga", caption: "Move with kindness." },
  { title: "Mindfulness", caption: "Make room to pause." },
  { title: "Emotional wellness", caption: "Feel what you feel." },
  { title: "Empowerment", caption: "Own your voice." },
];

const visionPoints = [
  {
    title: "No shame. Just confidence.",
    text: "No girl feels ashamed of her period.",
    Icon: Smile,
  },
  { title: "Dignity, always.", text: "No woman compromises her dignity.", Icon: ShieldCheck },
  {
    title: "Care within reach.",
    text: "Every woman has access to menstrual hygiene.",
    Icon: BriefcaseMedical,
  },
  {
    title: "Self-care comes first.",
    text: "Every woman understands the importance of self-care.",
    Icon: HeartPulse,
  },
  {
    title: "The power to rise.",
    text: "Every woman knows that she has the power to rise.",
    Icon: BicepsFlexed,
  },
  {
    title: "We rise together.",
    text: "When a woman is supported, informed and empowered, she helps an entire generation rise with her.",
    Icon: UsersRound,
  },
];

function VisionPoint({ point }: { point: (typeof visionPoints)[number] }) {
  const { title, text, Icon } = point;
  return (
    <li className="flex items-start gap-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#e6ccc5] bg-[#fffaf6] text-brand-burgundy">
        <Icon aria-hidden="true" className="size-5" strokeWidth={2} />
      </span>
      <div className="min-w-0 pt-1">
        <h4 className="text-lg font-bold leading-snug text-brand-navy xl:text-xl">{title}</h4>
        <p className="mt-2 leading-7 text-[#746168]">{text}</p>
      </div>
    </li>
  );
}

export function FounderVisionPanels() {
  return (
    <div className="founder-visual-stories mt-16 space-y-14 md:mt-20 md:space-y-20">
      <section
        aria-labelledby="founder-journey"
        className="border-y border-[#e5d8cf] py-9 md:py-12"
      >
        <div className="grid gap-7 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div>
            <h3
              id="founder-journey"
              className="max-w-lg font-display text-4xl leading-[1.12] text-brand-navy lg:text-5xl"
            >
              The Idea Behind <span className="text-brand-coral">SheRise</span>
            </h3>
            <ul
              aria-label="Our values"
              className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-black"
            >
              {["Dignity", "Freedom", "Confidence", "Self-care"].map((value) => (
                <li key={value}>{value}</li>
              ))}
            </ul>
          </div>
          <div className="founder-prose max-w-2xl space-y-4 lg:pt-1">
            <p>
              SheRise began with a belief: no girl should feel ashamed, restricted or less confident
              because of her period. By opening up conversations about <strong>menstruation</strong>
              , the founder hopes to replace silence and stigma with understanding.
            </p>
            <p>
              For her, a sanitary napkin is more than a product. Through awareness, education and
              holistic wellness, SheRise brings care for the{" "}
              <strong>body, mind and emotions</strong> together &mdash; helping women feel strong,
              informed, comfortable and confident at every stage of life.
            </p>
          </div>
        </div>
        <div className="mt-8 bg-[#f7eee8] px-5 py-6 md:mt-9 md:px-7">
          <h4 id="founder-wellness" className="mb-5 text-sm font-semibold text-brand-burgundy">
            Care for Your Whole Self
          </h4>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-3 xl:grid-cols-6">
            {pillars.map(({ title, caption }) => (
              <li key={title} className="border-l border-[#d7b7ab] pl-3">
                <span className="block font-semibold leading-snug text-brand-navy">{title}</span>
                <span className="mt-2 block text-sm leading-relaxed text-[#746168]">{caption}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        id="vision"
        aria-labelledby="founder-vision"
        className="founder-vision-band relative isolate scroll-mt-[74px] bg-[#faeee8] px-6 py-10 sm:px-9 md:py-14 lg:px-12"
      >
        <VisionFlorals className="founder-floral-start pointer-events-none absolute top-0 -z-10 w-28 opacity-45 sm:w-44 lg:w-60" />
        <VisionFlorals className="founder-floral-end pointer-events-none absolute bottom-0 -z-10 w-28 rotate-180 opacity-35 sm:w-40 lg:w-52" />
        <div className="mx-auto max-w-2xl text-center">
          <h3
            id="founder-vision"
            className="font-display text-4xl leading-tight text-brand-navy md:text-5xl"
          >
            Her <span className="text-brand-coral">Vision</span>
          </h3>
        </div>
        <div className="founder-vision-layout mt-10 grid gap-x-8 gap-y-8 lg:mt-14 xl:gap-x-10">
          <ul className="founder-vision-list founder-vision-list-first order-2 grid gap-7">
            {visionPoints.slice(0, 3).map((point) => (
              <VisionPoint key={point.title} point={point} />
            ))}
          </ul>
          <div className="founder-vision-logo order-1 mx-auto w-full max-w-[250px]">
            <div className="relative flex aspect-square items-center justify-center">
              <div
                aria-hidden="true"
                className="absolute inset-1 rounded-full border border-[#dfbeb4]"
              />
              <div
                aria-hidden="true"
                className="absolute inset-4 rounded-full border border-[#e9cdc3]"
              />
              <div
                role="img"
                aria-label="SheRise. Release, Renew, Rise."
                className="relative w-full bg-[#faeee8] py-7 text-center"
              >
                <span className="block whitespace-nowrap font-display text-[64px] leading-none tracking-[-0.04em] text-brand-navy xl:text-[76px]">
                  She<span className="text-brand-coral">Rise</span>
                </span>
                <span className="mt-3 block text-[9px] font-bold uppercase tracking-[0.18em] text-[#746168] xl:text-[10px]">
                  Release &middot; Renew &middot; Rise
                </span>
              </div>
            </div>
            <div className="mt-2 text-center font-display text-xl italic text-brand-burgundy">
              Because when SHE rises,
              <br />
              we all rise.
            </div>
          </div>
          <ul className="founder-vision-list founder-vision-list-last order-3 grid gap-7">
            {visionPoints.slice(3).map((point) => (
              <VisionPoint key={point.title} point={point} />
            ))}
          </ul>
        </div>
      </section>

      <section
        id="sherise-welfare-foundation"
        aria-labelledby="founder-impact"
        className="grid scroll-mt-[74px] items-start gap-9 border-y border-[#e5d8cf] py-10 md:py-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16"
      >
        <div>
          <h3
            id="founder-impact"
            className="max-w-xl font-display text-4xl leading-[1.12] text-brand-navy md:text-5xl"
          >
            Her <span className="text-brand-coral">Social Impact</span>
          </h3>
          <p className="founder-prose mt-6 max-w-xl">
            Through the <strong>SheRise Welfare Foundation</strong>, we work to improve menstrual
            health awareness and access to hygiene resources. We create safe spaces where girls and
            women can learn, ask questions and speak openly, so they can make informed choices with
            dignity and confidence.
          </p>
          <ul className="mt-5 divide-y divide-[#e5d8cf]">
            {[
              {
                title: "Awareness",
                text: "Helping women and girls understand their bodies and menstrual wellbeing.",
              },
              {
                title: "Access",
                text: "Supporting those who may have limited access to menstrual hygiene resources.",
              },
              {
                title: "Confidence",
                text: "Wellness education and the confidence to ask questions and speak openly.",
              },
            ].map(({ title, text }, index) => (
              <li key={title} className="flex gap-5 py-3">
                <span
                  aria-hidden="true"
                  className="pt-1 text-xs font-semibold tracking-widest text-brand-burgundy/60"
                >
                  0{index + 1}
                </span>
                <div>
                  <h4 className="font-semibold text-brand-navy">{title}</h4>
                  <p className="mt-1 max-w-md text-[#746168]">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <figure className="m-0">
            <img
              src={socialImpactImage}
              alt="A facilitator discussing menstrual health with women and girls"
              width="1600"
              height="900"
              loading="lazy"
              className="h-auto w-full rounded-sm"
            />
          </figure>
          <blockquote className="mt-7 border-l-2 border-brand-coral pl-5">
            <div className="font-display text-2xl leading-snug text-brand-burgundy">
              A stronger future begins with an informed girl.
            </div>
            <p className="mt-3 text-[#746168]">
              When a girl understands her body, has access to menstrual hygiene, receives the right
              knowledge and feels confident to speak openly, she takes one more step toward a
              stronger future.
            </p>
          </blockquote>
        </div>
      </section>
    </div>
  );
}
