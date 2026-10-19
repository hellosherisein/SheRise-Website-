const focusAreas = [
  {
    title: "Menstrual hygiene products",
    copy: "Care essentials for women and girls with limited access.",
  },
  { title: "Awareness sessions", copy: "Open conversations about menstrual health and hygiene." },
  {
    title: "Education for adolescent girls",
    copy: "Practical knowledge to understand periods with confidence.",
  },
  { title: "Community support", copy: "Support for women and girls in underserved communities." },
  {
    title: "Women’s health programmes",
    copy: "A broader approach to women’s health and wellbeing.",
  },
  { title: "Women’s empowerment", copy: "Knowledge and support for informed, confident choices." },
];

export function SheRiseInitiative() {
  return (
    <section
      aria-labelledby="initiative-heading"
      className="mt-14 border-t border-[#e5d8cf] py-9 md:mt-16 md:py-12"
    >
      <div className="grid gap-7 bg-brand-navy px-6 py-8 text-white md:px-9 md:py-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
        <div>
          <p className="eyebrow eyebrow-on-dark !mb-4">SHERISE INITIATIVE</p>
          <h2
            id="initiative-heading"
            className="max-w-lg font-display text-3xl leading-[1.15] text-white sm:text-4xl"
          >
            Your purchase can become someone else’s support.
          </h2>
        </div>
        <div className="space-y-4 text-white/85 lg:pt-1">
          <p>
            With every SheRise sanitary napkin purchase, we can create an opportunity to support
            women and girls who have limited access to menstrual hygiene products and education.
          </p>
          <p>
            Menstrual health is a basic part of dignity, health and wellbeing. We invite customers,
            partners and supporters to help build practical support and awareness.
          </p>
        </div>
      </div>

      <div className="mt-9 pt-7">
        <h3 className="text-base font-semibold text-brand-burgundy [font-family:var(--font-sans)]">
          What this initiative aims to support
        </h3>
        <ol className="mt-5 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {focusAreas.map(({ title, copy }, index) => (
            <li key={title} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="mt-1 text-xs font-medium tabular-nums text-brand-burgundy/60"
              >
                0{index + 1}
              </span>
              <div>
                <h4 className="font-semibold leading-snug text-brand-navy">{title}</h4>
                <p className="mt-2 max-w-sm text-[#746168]">{copy}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

    </section>
  );
}
