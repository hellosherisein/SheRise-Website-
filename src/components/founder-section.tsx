import { useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import { Button } from "./ui/button";
import { FounderVisionPanels } from "./founder-vision-panels";
import careImage from "@/assets/sherise-flatlay.jpg";

const qualifications = [
  "Certified Yoga Teacher",
  "Certified Meditation Teacher",
  "Therapeutic Nutritionist",
  "Emotional Healing Coach",
];

// The care image is an interim brand visual, not a portrait of the founder.
export function FounderSection({
  portrait,
  founderName,
}: {
  portrait?: string;
  founderName?: string;
}) {
  const messageRef = useRef<HTMLElement>(null);
  const [messageOpen, setMessageOpen] = useState(false);
  return (
    <section
      id="meet-the-founder"
      aria-labelledby="founder-heading"
      className="founder-story mt-14 scroll-mt-[74px] border-t border-[#e5d8cf] pt-10 md:mt-20 md:pt-12"
    >
      <div className="grid items-start gap-8 md:grid-cols-[0.85fr_1.15fr] md:gap-9 lg:items-center lg:gap-14">
        <figure className="m-0">
          <div className="relative isolate px-4 pt-4 lg:px-6 lg:pt-6">
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 bottom-10 -z-10 rounded-t-[48%] bg-[#f2e5de]"
            />
            <img
              src={portrait || careImage}
              alt={
                portrait
                  ? founderName || "The founder of SheRise"
                  : "SheRise period-care essentials with flowers and a reusable pouch"
              }
              width="720"
              height="900"
              loading="lazy"
              className="aspect-[4/5] w-full rounded-t-[46%] object-cover"
            />
          </div>
          <figcaption className="relative mx-auto -mt-8 w-[85%] border border-[#e5d8cf] bg-[#fffaf6] px-4 py-4 text-center shadow-[0_8px_28px_rgba(74,31,39,0.06)]">
            <span className="block font-display text-xl text-brand-burgundy">
              {portrait ? founderName || "Founder, SheRise" : "A vision rooted in care."}
            </span>
            <span className="mt-1 block text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {portrait && founderName ? "Founder, SheRise" : "Release. Renew. Rise."}
            </span>
          </figcaption>
        </figure>
        <div>
          <p className="eyebrow !mb-3">MEET THE FOUNDER</p>
          <h2
            id="founder-heading"
            className="font-display text-4xl leading-[1.1] text-brand-navy lg:text-5xl"
          >
            Helping every woman
            <br />
            <span className="text-brand-burgundy">rise with confidence.</span>
          </h2>
          <p className="founder-prose mt-5">
            A women's wellness advocate and entrepreneur, the founder of <strong>SheRise</strong>{" "}
            believes every woman deserves dignity, good health and self-worth. Her approach brings
            together care for the <strong>body, mind and emotions.</strong>
          </p>
          <ul className="my-6 grid gap-x-5 gap-y-3 border-y border-[#e5d8cf] py-5 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
            {qualifications.map((qualification) => (
              <li
                key={qualification}
                className="flex items-start gap-2.5 font-medium text-brand-navy"
              >
                <span
                  aria-hidden="true"
                  className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand-coral"
                />
                {qualification}
              </li>
            ))}
          </ul>
          <p className="founder-prose">
            She created SheRise to make menstrual care a conversation of{" "}
            <strong>confidence, not shame.</strong> Through holistic wellness and her association
            with <strong>SheRise Welfare Foundation</strong>, her vision is to help women and girls
            feel informed, supported and empowered.
          </p>
          <blockquote className="mt-6 border-l-2 border-brand-coral pl-4 font-display text-2xl leading-snug text-brand-burgundy">
            &ldquo;Because when SHE rises, we all rise.&rdquo;
          </blockquote>
          <Button
            type="button"
            variant="navy"
            aria-expanded={messageOpen}
            aria-controls="founders-message"
            onClick={() => {
              setMessageOpen(!messageOpen);
              if (!messageOpen) {
                requestAnimationFrame(() => messageRef.current?.scrollIntoView({ block: "start" }));
              }
            }}
            className="mt-5 min-h-11 gap-3 px-6"
          >
            {messageOpen ? "Hide message" : "Read her full message"}
            <ArrowDown aria-hidden="true" className={`size-4 transition-transform ${messageOpen ? "rotate-180" : ""}`} />
          </Button>
        </div>
      </div>
      <div hidden={!messageOpen} className="mt-10">
        <section
          ref={messageRef}
          id="founders-message"
          aria-labelledby="founder-message-heading"
          className="scroll-mt-28 border border-[#e9d8ce] bg-[#faf0e9] px-6 py-10 sm:px-10 md:px-16 md:py-14"
        >
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow">A LETTER TO EVERY WOMAN</p>
            <h3
              id="founder-message-heading"
              className="font-display text-3xl text-brand-navy md:text-4xl"
            >
              Founder’s message
            </h3>
            <blockquote className="mt-8">
              <div className="font-display text-3xl leading-snug text-brand-burgundy md:text-4xl">
                “I founded SheRise with a simple belief — every woman deserves to rise.
              </div>
              <div className="my-7 border-l-2 border-brand-coral pl-5 font-display text-xl leading-relaxed text-brand-burgundy sm:text-2xl">
                <div>Rise above shame.</div>
                <div>Rise above silence.</div>
                <div>Rise above limitations.</div>
                <div>Rise with confidence.</div>
              </div>
              <div className="founder-prose space-y-5 text-justify [text-justify:inter-word]">
                <p>
                  My journey as a yoga teacher, meditation teacher, therapeutic nutritionist and
                  emotional healing coach has taught me that true wellness is holistic. It is about
                  caring for our body, calming our mind, nourishing ourselves and healing our
                  emotions.
                </p>
                <p>
                  Menstruation is a natural part of a woman’s life, yet for generations it has been
                  surrounded by stigma and silence. I believe it is time to change that
                  conversation.
                </p>
                <p>
                  With SheRise, my dream is not just to provide menstrual hygiene products. My dream
                  is to create awareness, encourage self-care, support dignity and help women feel
                  empowered in their own bodies.
                </p>
                <p>
                  <strong>
                    SheRise is my belief that when a woman is supported, informed and empowered, she
                    doesn’t just rise herself — she helps an entire generation rise with her.
                  </strong>
                </p>
                <p>
                  Let us create a world where every girl grows up knowing that her body is not
                  something to be ashamed of, but something to understand, respect and celebrate.
                </p>
              </div>
              <div className="mt-8 font-display text-3xl leading-tight text-brand-burgundy md:text-4xl">
                Because when SHE rises,
                <br />
                we all rise.”
              </div>
              <footer className="mt-7 flex items-center gap-4">
                <span aria-hidden="true" className="h-px w-10 bg-brand-burgundy/40" />
                <cite className="text-sm font-semibold not-italic text-brand-navy">
                  {founderName ? `${founderName} · Founder, SheRise` : "Founder, SheRise"}
                </cite>
              </footer>
            </blockquote>
          </div>
        </section>
      </div>
      <FounderVisionPanels />
    </section>
  );
}
