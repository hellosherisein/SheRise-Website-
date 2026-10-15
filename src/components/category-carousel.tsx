import { useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play } from "lucide-react";
import { Link } from "@/router-shim";
import flatlay from "@/assets/sherise-flatlay.jpg";
import story from "@/assets/sherise-story.jpg";

const collections = [
  { title: "Sanitary Pads", copy: "Your everyday essentials", image: flatlay, to: "/category/sanitary-pads" },
  { title: "Day + Night Combos", copy: "A routine that goes with your flow", image: story, to: "/shop?q=combo" },
];

export function CategoryCarousel() {
  const [viewport, api] = useEmblaCarousel({ loop: true, align: "start", breakpoints: { "(min-width: 768px)": { active: false } } });
  const region = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { setReducedMotion(preference.matches); };
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!api) return;
    const update = () => setSelected(api.selectedScrollSnap());
    update();
    api.on("select", update);
    api.on("reInit", update);
    return () => { api.off("select", update); api.off("reInit", update); };
  }, [api]);

  useEffect(() => {
    if (!api || paused || hovered || reducedMotion) return;
    let dragging = false;
    const startDrag = () => { dragging = true; };
    const endDrag = () => { dragging = false; };
    api.on("pointerDown", startDrag);
    api.on("pointerUp", endDrag);
    const timer = window.setInterval(() => {
      if (window.matchMedia("(max-width: 767px)").matches && !document.hidden && !dragging && !region.current?.contains(document.activeElement)) {
        api.scrollNext();
      }
    }, 4500);
    return () => {
      window.clearInterval(timer);
      api.off("pointerDown", startDrag);
      api.off("pointerUp", endDrag);
    };
  }, [api, paused, hovered, reducedMotion]);

  return (
    <div ref={region} role="region" aria-label="Care collections" aria-roledescription="carousel"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse" && window.matchMedia("(hover: hover)").matches) setHovered(true);
      }} onPointerLeave={() => setHovered(false)}>
      <div ref={viewport} className="overflow-hidden">
        <div className="category-grid">
          {collections.map(({ title, copy, image, to }) => (
            <Link key={title} to={to} className="category-tile group" aria-label={`${title} collection`}>
              <img src={image} alt={`${title} collection inspiration`} loading="lazy" width="600" height="500"
                className="transition-transform duration-300 group-hover:scale-105" />
              <div>
                <p className="text-xs">{copy}</p>
                <h3 className="mt-1 text-2xl">{title}</h3>
                <ArrowUpRight className="absolute right-5 bottom-6" aria-hidden="true" />
              </div>
            </Link>
          ))}
        </div>
      </div>
      <div className="mt-5 flex items-center justify-center gap-4 md:hidden">
        <button type="button" className="grid size-11 place-items-center rounded-full border border-brand-navy/20 bg-white text-brand-navy"
          aria-label="Previous collection" onClick={() => api?.scrollPrev()}><ArrowLeft size={19} aria-hidden="true" /></button>
        <span className="text-sm font-semibold text-brand-navy" aria-live="off">{selected + 1} / {collections.length}</span>
        <button type="button" className="grid size-11 place-items-center rounded-full border border-brand-navy/20 bg-white text-brand-navy"
          aria-label="Next collection" onClick={() => api?.scrollNext()}><ArrowRight size={19} aria-hidden="true" /></button>
        {!reducedMotion && <button type="button" className="grid size-11 place-items-center rounded-full border border-brand-navy/20 bg-white text-brand-navy"
          aria-label={paused ? "Start automatic sliding" : "Pause automatic sliding"} onClick={() => setPaused((value) => !value)}>
          {paused ? <Play size={17} aria-hidden="true" /> : <Pause size={17} aria-hidden="true" />}
        </button>}
      </div>
    </div>
  );
}
