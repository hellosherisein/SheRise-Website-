export const whySheRiseLinks = [
  { label: "Designed for Your Comfort", to: "/why-sherise/product-features", sectionId: "product-features" },
  { label: "Anion Strip Technology*", to: "/why-sherise/anion-strip", sectionId: "anion-strip" },
  { label: "Our Social Impact", to: "/why-sherise/foundation", sectionId: "foundation" },
] as const;

export const aboutLinks = [
  { label: "Meet our Founder", to: "/about/meet-the-founder", sectionId: "meet-the-founder" },
  { label: "Our Mission & Vision", to: "/about/vision", sectionId: "vision" },
  { label: "Our Foundation", to: "/about/sherise-welfare-foundation", sectionId: "sherise-welfare-foundation" },
] as const;

export const periodCareLinks = [
  { label: "Period Guide Overview", to: "/period-guide/period-guide-overview", sectionId: "period-guide-overview" },
  { label: "Wellness Tips", to: "/period-guide/wellness-tips", sectionId: "wellness-tips" },
  { label: "Red Dot Disposal", to: "/period-guide/red-dot-method", sectionId: "red-dot-method" },
  { label: "During Your Period", to: "/period-guide/during-period", sectionId: "during-period" },
  { label: "Mindful Self-Care", to: "/period-guide/mindful-self-care", sectionId: "mindful-self-care" },
] as const;

export const sectionNavigation = [
  { pagePath: "/why-sherise", links: whySheRiseLinks },
  { pagePath: "/about", links: aboutLinks },
  { pagePath: "/period-guide", links: periodCareLinks },
] as const;
