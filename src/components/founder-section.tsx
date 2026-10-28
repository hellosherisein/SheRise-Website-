import { useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import { Button } from "./ui/button";
import { FounderVisionPanels } from "./founder-vision-panels";
import careImage from "@/assets/sherise-flatlay.jpg";

const qualifications = [
  "BA and MA in Political Science",
  "MBA in Human Resources",
  "Certified in yoga and yoga therapy",
  "Certified in meditation and Ayurvedic wellness",
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
              {founderName || "Sweta Jadhav"}
            </span>
            <span className="mt-1 block text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Founder, SheRise Welfare Foundation
            </span>
          </figcaption>
        </figure>
        <div className="max-w-2xl">
          <h2
            id="founder-heading"
            className="font-display text-3xl leading-tight text-brand-navy sm:text-4xl lg:text-[2.75rem]"
          >
            Meet Our Founder
          </h2>
          <p className="mt-3 text-sm font-semibold uppercase tracking-[0.14em] text-brand-coral">
            {founderName || "Sweta Jadhav"} <span aria-hidden="true">|</span> Founder, SheRise Welfare Foundation
          </p>
          <p className="founder-prose mt-6">
            For me, women&apos;s empowerment begins with awareness, self-belief, and the opportunity to
            live with dignity. This belief inspired me to establish SheRise Welfare Foundation&mdash;a
            platform dedicated to empowering women, promoting menstrual health awareness, and
            nurturing holistic well-being.
          </p>
          <div className="my-7">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-brand-burgundy">
              Education &amp; Certifications
            </h3>
            <ul className="grid gap-3 sm:grid-cols-2">
            {qualifications.map((qualification) => (
              <li
                key={qualification}
                className="flex min-h-14 items-center gap-3 rounded-lg border border-[#eadbd2] bg-[#fffaf6] px-4 py-3 text-sm font-medium leading-snug text-brand-navy shadow-[0_2px_10px_rgba(74,31,39,0.035)]"
              >
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-full bg-brand-coral ring-4 ring-[#f7e9e3]"
                />
                {qualification}
              </li>
            ))}
            </ul>
          </div>
          <p className="founder-prose">
            I bring together my education and professional training with a deep commitment to social
            welfare, to make a meaningful difference in women&apos;s lives.
          </p>
          <p className="founder-prose mt-4">
            I believe every woman deserves to be heard, respected, informed, and empowered to take
            charge of her well-being. Through SheRise, my mission is to break the silence around
            menstrual health, encourage self-care, and create supportive communities where women
            can learn, grow, and thrive.
          </p>
          <blockquote className="mt-7 rounded-r-lg border-l-[3px] border-brand-coral bg-[#fff8f4] px-5 py-4 font-display text-xl leading-relaxed text-brand-burgundy sm:text-2xl">
            &ldquo;My vision is simple: to help every woman discover her strength, recognize her worth,
            and rise with confidence.&rdquo;
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
            {messageOpen ? "Hide message" : "Join Me in Making a Difference"}
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
            <p className="eyebrow">MAKE A DIFFERENCE WITH SHERISE</p>
            <h3
              id="founder-message-heading"
              className="font-display text-3xl text-brand-navy md:text-4xl"
            >
              Join Me in Making a Difference
            </h3>
            <blockquote className="mt-8">
              <div className="founder-prose space-y-5 text-justify [text-justify:inter-word]">
                <p>
                  Together, we can create a more informed, healthier, and empowered society. Join
                  SheRise as a volunteer, partner, or supporter and help turn this vision into
                  meaningful action.
                </p>
                <p><strong>SheRise - Empowering Women. Inspiring Change.</strong></p>
              </div>
              <footer className="mt-7 flex items-center gap-4">
                <span aria-hidden="true" className="h-px w-10 bg-brand-burgundy/40" />
                <cite className="text-sm font-semibold not-italic text-brand-navy">
                  {founderName || "Sweta Jadhav"} | Founder, SheRise Welfare Foundation
                </cite>
              </footer>
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 pl-14 text-sm">
                <a
                  href="mailto:hellosherise.in@gmail.com"
                  className="text-brand-burgundy underline underline-offset-4 hover:text-brand-navy"
                >
                  hellosherise.in@gmail.com
                </a>
                <a
                  href="tel:+919594241666"
                  className="text-brand-burgundy underline underline-offset-4 hover:text-brand-navy"
                >
                  +91 95942 41666
                </a>
              </div>
            </blockquote>
          </div>
        </section>
      </div>
      <FounderVisionPanels />
    </section>
  );
}
