"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/LanguageSwitcher";

/* ═══════════════════════════════════════════
   HOOKS
   ═══════════════════════════════════════════ */

/** Intersection-observer fade-in + subtle text parallax */
function useFadeIn<T extends HTMLElement>(
  threshold = 0.15,
  rootMargin = "0px 0px -60px 0px",
  parallaxSpeed = 0
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("in-view");
          io.unobserve(el);
        }
      },
      { threshold, rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, rootMargin]);

  useEffect(() => {
    if (!parallaxSpeed) return;
    const el = ref.current;
    if (!el) return;
    let rafId: number;
    let active = false;

    const onScroll = () => {
      if (!active) {
        if (!el.classList.contains("in-view")) return;
        active = true;
        setTimeout(() => {
          el.style.transition = "none";
        }, 950);
      }
      rafId = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const centre = rect.top + rect.height / 2;
        const offset = (centre - window.innerHeight / 2) * parallaxSpeed;
        el.style.transform = `translateY(${offset}px)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
    };
  }, [parallaxSpeed]);

  return ref;
}

/** Parallax: returns a translateY value driven by scroll position */
function useParallax(speed = 0.08) {
  const ref = useRef<HTMLDivElement>(null);
  const [y, setY] = useState(0);

  const handleScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const centre = rect.top + rect.height / 2;
    const viewH = window.innerHeight;
    const offset = (centre - viewH / 2) * speed;
    setY(offset);
  }, [speed]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return { ref, y };
}

/* ═══════════════════════════════════════════
   GRID LINES — section-aware, smooth transitions
   Desktop: 2 lines (3-col) or 3 lines (4-col) depending on section
   Mobile: 1 line at 50%
   ═══════════════════════════════════════════ */
function GridLines() {
  const [hue, setHue] = useState(310);
  const [targetGrid, setTargetGrid] = useState<"3" | "4">("3");
  const [lineOpacities, setLineOpacities] = useState([1, 1, 0]); // 3 lines, 3rd starts hidden
  const [linePositions, setLinePositions] = useState([33.333, 66.666, 50]); // 3rd at center initially
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    let raf: number;
    let prev = performance.now();
    const SPEED = 4;
    const tick = (now: number) => {
      const dt = (now - prev) / 1000;
      prev = now;
      setHue((h) => (h + SPEED * dt) % 360);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* Watch which section is in viewport and update target grid */
  useEffect(() => {
    const updateLines = () => {
      const sections = document.querySelectorAll("[data-grid]");
      const vh = window.innerHeight;
      let activeGrid: "3" | "4" = "3";

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top < vh * 0.5 && rect.bottom > vh * 0.5) {
          activeGrid = (section.getAttribute("data-grid") || "3") as "3" | "4";
        }
      });

      setTargetGrid(activeGrid);
    };

    window.addEventListener("scroll", updateLines, { passive: true });
    updateLines();
    return () => window.removeEventListener("scroll", updateLines);
  }, []);

  /* Animate transitions between 2-line and 3-line states */
  useEffect(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);

    const duration = 600; // ms
    const start = performance.now();
    const startPositions = [...linePositions];
    const startOpacities = [...lineOpacities];

    // Target states
    const endPositions = targetGrid === "4" ? [25, 50, 75] : [33.333, 66.666, 50];
    const endOpacities = targetGrid === "4" ? [1, 1, 1] : [1, 1, 0];

    const ease = (t: number) => {
      // cubic-bezier(0.25, 0.1, 0.25, 1) approximation
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const animate = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = ease(t);

      const newPositions = startPositions.map((sp, i) => sp + (endPositions[i] - sp) * eased);
      const newOpacities = startOpacities.map((so, i) => so + (endOpacities[i] - so) * eased);

      setLinePositions(newPositions);
      setLineOpacities(newOpacities);

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetGrid]);

  const color = `hsl(${hue}, 70%, 25%)`;

  return (
    <>
      {/* Desktop: 2 or 3 lines */}
      <div
        className="hidden md:block fixed inset-0 z-[1] pointer-events-none"
        aria-hidden="true"
      >
        <div className="relative h-full w-full">
          {linePositions.map((pos, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-px"
              style={{
                left: `${pos}%`,
                backgroundColor: color,
                opacity: lineOpacities[i],
              }}
            />
          ))}
        </div>
      </div>
      {/* Mobile: 1 line at 50% */}
      <div
        className="md:hidden fixed inset-0 z-[1] pointer-events-none"
        aria-hidden="true"
      >
        <div className="relative h-full w-full">
          <div
            className="absolute top-0 bottom-0 w-px"
            style={{ left: "50%", backgroundColor: color }}
          />
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════
   CUSTOM CURSOR
   ═══════════════════════════════════════════ */
const CURSOR_BASE = 20;
const CURSOR_HOVER = 48;

function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: 0, y: 0 });
  const sizeRef = useRef(CURSOR_BASE);
  const targetSizeRef = useRef(CURSOR_BASE);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const isTouchDevice =
      typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0);
    if (isTouchDevice) return;

    const el = cursorRef.current;
    if (!el) return;

    // Animation loop for smooth size interpolation
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const tick = () => {
      const currentSize = sizeRef.current;
      const targetSize = targetSizeRef.current;

      if (Math.abs(currentSize - targetSize) > 0.5) {
        sizeRef.current = lerp(currentSize, targetSize, 0.15);
      } else {
        sizeRef.current = targetSize;
      }

      const s = sizeRef.current;
      el.style.width = `${s}px`;
      el.style.height = `${s}px`;
      el.style.transform = `translate(${posRef.current.x - s / 2}px, ${posRef.current.y - s / 2}px)`;

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    const move = (e: MouseEvent) => {
      posRef.current.x = e.clientX;
      posRef.current.y = e.clientY;
    };

    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("a, button, [role=button], input, textarea")) {
        targetSizeRef.current = CURSOR_HOVER;
      }
    };

    const onOut = (e: MouseEvent) => {
      const target = e.relatedTarget as HTMLElement | null;
      if (!target || !target.closest?.("a, button, [role=button], input, textarea")) {
        targetSizeRef.current = CURSOR_BASE;
      }
    };

    window.addEventListener("mousemove", move, { passive: true });
    document.addEventListener("mouseover", onOver, { passive: true });
    document.addEventListener("mouseout", onOut, { passive: true });

    return () => {
      window.removeEventListener("mousemove", move);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      className="fixed top-0 left-0 z-[9999] pointer-events-none mix-blend-difference hidden md:block"
      style={{
        width: CURSOR_BASE,
        height: CURSOR_BASE,
        borderRadius: "50%",
        backgroundColor: "#ffffff",
        willChange: "transform, width, height",
      }}
      aria-hidden="true"
    />
  );
}

/* ═══════════════════════════════════════════
   PARALLAX IMAGE WRAPPER
   ═══════════════════════════════════════════ */
function ParallaxImage({
  src,
  alt,
  aspect = "4/3",
  sizes,
  speed = 0.08,
  className = "",
}: {
  src: string;
  alt: string;
  aspect?: string;
  sizes: string;
  speed?: number;
  className?: string;
}) {
  const { ref, y } = useParallax(speed);
  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`} style={{ aspectRatio: aspect }}>
      <div
        className="absolute inset-[-15%] will-change-transform"
        style={{ transform: `translateY(${y}px)` }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover grayscale"
          sizes={sizes}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   PARALLAX BLOCK
   ═══════════════════════════════════════════ */
function ParallaxBlock({
  children,
  speed = 0.05,
  className = "",
}: {
  children: React.ReactNode;
  speed?: number;
  className?: string;
}) {
  const { ref, y } = useParallax(speed);
  return (
    <div
      ref={ref}
      className={`will-change-transform ${className}`}
      style={{ transform: `translateY(${y}px)` }}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════
   SVG PARALLAX
   ═══════════════════════════════════════════ */
function ParallaxSvg({
  children,
  speed = -0.06,
  className = "",
}: {
  children: React.ReactNode;
  speed?: number;
  className?: string;
}) {
  const { ref, y } = useParallax(speed);
  return (
    <div
      ref={ref}
      className={`will-change-transform overflow-hidden ${className}`}
      style={{ transform: `translateY(${y}px)` }}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════
   SECTION SVG — normalized height
   Desktop: natural size (full width). Mobile: 86px height.
   ═══════════════════════════════════════════ */
function SectionSvg({
  src,
  speed = -0.06,
  blend = true,
}: {
  src: string;
  speed?: number;
  blend?: boolean;
}) {
  return (
    <ParallaxSvg speed={speed}>
      <div className={`w-full overflow-hidden ${blend ? "mix-blend-difference" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          aria-hidden="true"
          className="w-full h-auto hidden md:block"
          style={{ filter: "brightness(0) invert(1)" }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          aria-hidden="true"
          className="md:hidden h-[86px] w-auto"
          style={{ filter: "brightness(0) invert(1)" }}
        />
      </div>
    </ParallaxSvg>
  );
}

/* ═══════════════════════════════════════════
   ACCORDION COMPONENT
   ═══════════════════════════════════════════ */
interface AccordionItemData {
  title: string;
  content: React.ReactNode;
}

function Accordion({
  items,
  className = "",
}: {
  items: AccordionItemData[];
  className?: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className={className}>
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={i} className="border-b border-white/10">
            <button
              className="w-full flex items-center justify-between py-5 md:py-6 text-left"
              onClick={() => setOpenIndex(isOpen ? null : i)}
            >
              <span className="text-[16px] md:text-[18px] tracking-[0.15em] text-white uppercase font-normal pr-4">
                {item.title}
              </span>
              <span
                className="text-white/40 text-xl flex-shrink-0 transition-transform duration-300"
                style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0)" }}
              >
                +
              </span>
            </button>
            <div
              className="grid transition-[grid-template-rows] duration-500 ease-in-out"
              style={{
                gridTemplateRows: isOpen ? "1fr" : "0fr",
              }}
            >
              <div className="overflow-hidden">
                <div
                  className="pb-6 text-sm md:text-base text-white/50 leading-relaxed transition-opacity duration-300"
                  style={{ opacity: isOpen ? 1 : 0 }}
                >
                  {item.content}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════
   IMAGE CAROUSEL — horizontal swipeable (mobile)
   ═══════════════════════════════════════════ */
function ImageCarousel({
  images,
  className = "",
}: {
  images: { src: string; alt: string; num: string; desc: string }[];
  className?: string;
}) {
  return (
    <div className={`overflow-x-auto scrollbar-hide ${className}`}>
      <div className="flex gap-3" style={{ width: `${images.length * 70}vw` }}>
        {images.map((img, i) => (
          <div key={i} className="flex-shrink-0" style={{ width: "65vw" }}>
            <div className="relative overflow-hidden" style={{ aspectRatio: "3/2" }}>
              <Image
                src={img.src}
                alt={img.alt}
                fill
                className="object-cover grayscale"
                sizes="65vw"
              />
            </div>
            <div className="flex items-baseline justify-between mt-2 px-1">
              <p className="text-[10px] tracking-[0.2em] text-white/40 uppercase">
                {img.num}
              </p>
              {img.desc && (
                <p className="text-[10px] tracking-[0.15em] text-white/40 uppercase">
                  {img.desc}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── NAV ─── */
function Nav() {
  const t = useTranslations("nav");

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] mix-blend-difference">
      <nav className="mx-auto flex items-center px-3 md:px-12 lg:px-16 h-16 md:h-20 max-w-[1920px]">
        <a
          href="#"
          className="text-sm md:text-base font-normal tracking-[0.2em] text-white uppercase shrink-0"
        >
          {t("brand")}
        </a>
        {/* Desktop nav — evenly distributed between logo and CTA */}
        <div className="hidden md:flex items-center justify-evenly flex-1">
          <a href="#services" className="text-sm md:text-base font-normal tracking-[0.2em] text-white uppercase hover:text-white/70 transition-colors">
            {t("services")}
          </a>
          <a href="#approach" className="text-sm md:text-base font-normal tracking-[0.2em] text-white uppercase hover:text-white/70 transition-colors">
            {t("approach")}
          </a>
          <a href="#pricing" className="text-sm md:text-base font-normal tracking-[0.2em] text-white uppercase hover:text-white/70 transition-colors">
            {t("pricing")}
          </a>
        </div>
        <a
          href="#contact"
          className="hidden md:inline-flex items-center justify-center px-6 py-2 text-sm font-normal tracking-[0.15em] uppercase border border-white text-white rounded-full hover:bg-white/10 transition-colors shrink-0"
        >
          {t("booking")}
        </a>
        {/* Mobile menu */}
        <button className="md:hidden text-white ml-auto" aria-label="Menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 8h18M3 16h18" />
          </svg>
        </button>
      </nav>
    </header>
  );
}

/* ─── HERO ─── */
function Hero() {
  const t = useTranslations("hero");
  const tAbout = useTranslations("about");

  const headRef = useFadeIn<HTMLDivElement>(0.2, "0px 0px -40px 0px", 0.05);
  const h2Ref = useFadeIn<HTMLDivElement>(0.15, "0px 0px -60px 0px", 0.065);
  const bodyRef = useFadeIn<HTMLDivElement>(0.15, "0px 0px -60px 0px", 0.04);

  return (
    <section data-grid="3" className="relative">
      {/* Hero image — full viewport */}
      <div className="relative min-h-screen flex flex-col overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <Image
            src="/images/hero.jpg"
            alt="Studio microphone close-up"
            fill
            className="object-cover object-center"
            priority
            quality={90}
          />
          {/* Fade gradient at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-[#1C1B1A] via-[#1C1B1A]/60 to-transparent" />
        </div>

        {/* .LIVE SVG overlay */}
        <ParallaxSvg speed={-0.04} className="absolute inset-0 flex items-center justify-center z-10 px-4 md:px-8 mix-blend-exclusion pointer-events-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/live.svg"
            alt=""
            aria-hidden="true"
            className="w-full h-auto max-h-[45vh] object-contain select-none hidden md:block"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/live.svg"
            alt=""
            aria-hidden="true"
            className="md:hidden h-[86px] w-auto object-contain select-none"
          />
        </ParallaxSvg>

        {/* Hero text content — over the gradient fade */}
        <div
          ref={headRef}
          className="fade-up relative z-20 mt-auto px-3 w-full pb-12 md:pb-16 lg:pb-20 mix-blend-difference"
        >
          {/* Mobile: simple padded layout */}
          <div className="md:hidden">
            <p className="text-[10px] tracking-[0.3em] text-white uppercase mb-4">
              {t("tagline")}
            </p>
            <h1 className="text-[20px] font-normal leading-[1.35] tracking-[0.01em] text-white uppercase mb-6">
              {t("headline")}
            </h1>
            <div className="isolate">
              <a
                href="#contact"
                className="inline-flex items-center justify-center px-8 py-3 text-[16px] tracking-[0.15em] uppercase font-normal border border-white text-white rounded-full hover:bg-white/10 transition-colors"
              >
                {t("cta")}
              </a>
            </div>
          </div>
          {/* Desktop: full-width 3-col grid aligned to guide lines */}
          <div className="hidden md:block">
            <div
              className="grid"
              style={{ gridTemplateColumns: "33.333% 33.333% 33.334%" }}
            >
              <div />
              <div className="col-span-2" style={{ paddingLeft: "12px" }}>
                <p className="text-xs tracking-[0.3em] text-white uppercase mb-6">
                  {t("tagline")}
                </p>
                <h1 className="text-[24px] font-normal leading-[1.35] tracking-[0.01em] text-white uppercase max-w-3xl mb-8">
                  {t("headline")}
                </h1>
                <div className="isolate">
                  <a
                    href="#contact"
                    className="inline-flex items-center justify-center px-8 py-3 text-xs tracking-[0.15em] uppercase font-normal border border-white text-white rounded-full hover:bg-white/10 transition-colors"
                  >
                    {t("cta")}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Below hero — H2 + body text + CTA */}
      <div className="px-3 py-24 md:py-32 lg:py-40">
        <div
          ref={h2Ref}
          className="fade-up mb-16 md:mb-20"
        >
          {/* Mobile H2 */}
          <div className="md:hidden">
            <h2 className="text-[32px] font-semibold leading-[1.15] tracking-tight text-white uppercase max-w-[80vw]">
              {tAbout("headline")}
            </h2>
          </div>
          {/* Desktop H2 — full-width 3-col grid, headline spans all */}
          <div className="hidden md:block">
            <div
              className="grid"
              style={{ gridTemplateColumns: "33.333% 33.333% 33.334%" }}
            >
              <div className="col-span-3" style={{ paddingLeft: "12px" }}>
                <h2 className="text-[42px] lg:text-[52px] font-semibold leading-[1.15] tracking-tight text-white uppercase max-w-[80vw]">
                  {tAbout("headline")}
                </h2>
              </div>
            </div>
          </div>
        </div>

        <div ref={bodyRef} className="fade-up">
          {/* Mobile body */}
          <div className="md:hidden">
            <p className="text-[16px] text-white/60 leading-relaxed mb-4">
              {tAbout("body1")}
            </p>
            <p className="text-[16px] text-white/60 leading-relaxed mb-10">
              {tAbout("body2")}
            </p>
            <a
              href="#pricing"
              className="inline-flex items-center justify-center px-8 py-3 text-[16px] tracking-[0.15em] uppercase font-normal border border-white text-white rounded-full hover:bg-white/10 transition-colors"
            >
              {tAbout("ctaPricing")}
            </a>
          </div>
          {/* Desktop body — full-width 3-col grid, body in col2-3 */}
          <div className="hidden md:block">
            <div
              className="grid"
              style={{ gridTemplateColumns: "33.333% 33.333% 33.334%" }}
            >
              <div />
              <div className="col-span-2" style={{ paddingLeft: "12px" }}>
                <p className="text-base text-white/60 leading-relaxed max-w-2xl mb-4">
                  {tAbout("body1")}
                </p>
                <p className="text-base text-white/60 leading-relaxed max-w-2xl mb-14">
                  {tAbout("body2")}
                </p>
                <a
                  href="#pricing"
                  className="inline-flex items-center justify-center px-8 py-3 text-xs tracking-[0.15em] uppercase font-normal border border-white text-white rounded-full hover:bg-white/10 transition-colors"
                >
                  {tAbout("ctaPricing")}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── SERVICES (WHAT) ─── */
function Services() {
  const t = useTranslations("services");

  const headRef = useFadeIn<HTMLDivElement>(0.15, "0px 0px -60px 0px", 0.06);
  const blocksRef = useFadeIn<HTMLDivElement>(0.1, "0px 0px -60px 0px", 0.035);
  const quoteRef = useFadeIn<HTMLDivElement>(0.15, "0px 0px -60px 0px", 0.07);
  const bodyRef = useFadeIn<HTMLDivElement>(0.15, "0px 0px -60px 0px", 0.045);

  const serviceItems: AccordionItemData[] = [
    {
      title: t("podcastProduction"),
      content: (
        <ul className="space-y-1">
          <li>{t("curatedFormats")}</li>
          <li>{t("dramaturgy")}</li>
          <li>{t("recordingPost")}</li>
        </ul>
      ),
    },
    {
      title: t("videoContent"),
      content: (
        <ul className="space-y-1">
          <li>{t("videoPodcasts")}</li>
          <li>{t("interviews")}</li>
          <li>{t("brandedFormats")}</li>
        </ul>
      ),
    },
    {
      title: t("audiobooksVoice"),
      content: (
        <ul className="space-y-1">
          <li>{t("audiobooks")}</li>
          <li>{t("voiceover")}</li>
          <li>{t("commercials")}</li>
        </ul>
      ),
    },
    {
      title: t("creativeGuidance"),
      content: (
        <ul className="space-y-1">
          <li>{t("concept")}</li>
          <li>{t("direction")}</li>
          <li>{t("strategy")}</li>
        </ul>
      ),
    },
  ];

  const images = [
    { src: "/images/camera.jpg", alt: "Sony camera setup", num: "01", desc: t("img01Desc") },
    { src: "/images/studio.jpg", alt: "Recording studio setup", num: "02", desc: t("img02Desc") },
    { src: "/images/mic.jpg", alt: "Studio microphone", num: "03", desc: t("img03Desc") },
  ];

  return (
    <section id="services" data-grid="3" className="relative py-24 md:py-32 lg:py-40">
      {/* WHAT SVG */}
      <SectionSvg src="/images/what.svg" speed={-0.06} />

      {/* SERVICES headline */}
      <div
        ref={headRef}
        className="fade-up px-3 mb-12 md:mb-16 mt-8 md:mt-12"
      >
        {/* Mobile */}
        <div className="md:hidden">
          <h2 className="text-[32px] font-semibold leading-[1.15] tracking-tight text-white uppercase max-w-[80vw]">
            {t("headline")}
          </h2>
        </div>
        {/* Desktop: full-width 3-col grid */}
        <div className="hidden md:block">
          <div
            className="grid"
            style={{ gridTemplateColumns: "33.333% 33.333% 33.334%" }}
          >
            <div className="col-span-3" style={{ paddingLeft: "12px" }}>
              <h2 className="text-[42px] lg:text-[52px] font-semibold leading-[1.15] tracking-tight text-white uppercase max-w-[80vw]">
                {t("headline")}
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop: 2x2 grid of service items */}
      <div
        ref={blocksRef}
        className="fade-up mb-16 md:mb-24"
      >
        {/* Desktop: 2x2 attached to guide lines with 12px gaps.
            Guide lines sit at 33.333% and 66.666% of viewport.
            Grid uses the same 3-col split so content aligns to guide lines. */}
        <div className="hidden md:block">
          <div
            className="grid gap-y-12 md:gap-y-16"
            style={{
              gridTemplateColumns: "33.333% 33.333% 33.334%",
            }}
          >
            {/* Row 1: col1 empty, Podcast Production starts at guideline1+12px, Video Content starts at guideline2+12px */}
            <div />
            <div style={{ paddingLeft: "12px" }}>
              <h3 className="text-[24px] font-normal leading-[1.35] tracking-[0.01em] text-white uppercase mb-5">{t("podcastProduction")}</h3>
              <ul className="space-y-2">
                <li className="text-sm text-white/50 leading-relaxed">{t("curatedFormats")}</li>
                <li className="text-sm text-white/50 leading-relaxed">{t("dramaturgy")}</li>
                <li className="text-sm text-white/50 leading-relaxed">{t("recordingPost")}</li>
              </ul>
            </div>
            <div style={{ paddingLeft: "12px" }}>
              <h3 className="text-[24px] font-normal leading-[1.35] tracking-[0.01em] text-white uppercase mb-5">{t("videoContent")}</h3>
              <ul className="space-y-2">
                <li className="text-sm text-white/50 leading-relaxed">{t("videoPodcasts")}</li>
                <li className="text-sm text-white/50 leading-relaxed">{t("interviews")}</li>
                <li className="text-sm text-white/50 leading-relaxed">{t("brandedFormats")}</li>
              </ul>
            </div>
            {/* Row 2 */}
            <div />
            <div style={{ paddingLeft: "12px" }}>
              <h3 className="text-[24px] font-normal leading-[1.35] tracking-[0.01em] text-white uppercase mb-5">{t("audiobooksVoice")}</h3>
              <ul className="space-y-2">
                <li className="text-sm text-white/50 leading-relaxed">{t("audiobooks")}</li>
                <li className="text-sm text-white/50 leading-relaxed">{t("voiceover")}</li>
                <li className="text-sm text-white/50 leading-relaxed">{t("commercials")}</li>
              </ul>
            </div>
            <div style={{ paddingLeft: "12px" }}>
              <h3 className="text-[24px] font-normal leading-[1.35] tracking-[0.01em] text-white uppercase mb-5">{t("creativeGuidance")}</h3>
              <ul className="space-y-2">
                <li className="text-sm text-white/50 leading-relaxed">{t("concept")}</li>
                <li className="text-sm text-white/50 leading-relaxed">{t("direction")}</li>
                <li className="text-sm text-white/50 leading-relaxed">{t("strategy")}</li>
              </ul>
            </div>
          </div>
        </div>
        {/* Mobile: accordion */}
        <div className="md:hidden px-3">
          <Accordion items={serviceItems} />
        </div>
      </div>

      {/* Desktop: 3 staggered images — attached to guide lines with 12px gaps.
          Image 1: right edge at guideline1 - 12px
          Image 2: left at guideline1 + 12px, right at guideline2 - 12px
          Image 3: left edge at guideline2 + 12px */}
      <div className="hidden md:block mb-24 md:mb-32">
        <div
          className="grid md:items-start"
          style={{ gridTemplateColumns: "33.333% 33.333% 33.334%" }}
        >
          <ParallaxBlock speed={0.04} className="mt-0">
            <div style={{ paddingRight: "12px" }}>
              <ParallaxImage src="/images/camera.jpg" alt="Sony camera setup" aspect="4/3" sizes="33vw" speed={0.02} />
              <div className="flex items-baseline justify-between mt-3 px-1">
                <p className="text-[10px] tracking-[0.2em] text-white/40 uppercase">01</p>
                {t("img01Desc") && <p className="text-[10px] tracking-[0.15em] text-white/40 uppercase">{t("img01Desc")}</p>}
              </div>
            </div>
          </ParallaxBlock>
          <ParallaxBlock speed={0.09} className="mt-32">
            <div style={{ paddingLeft: "12px", paddingRight: "12px" }}>
              <ParallaxImage src="/images/studio.jpg" alt="Recording studio" aspect="4/3" sizes="33vw" speed={0.03} />
              <div className="flex items-baseline justify-between mt-3 px-1">
                <p className="text-[10px] tracking-[0.2em] text-white/40 uppercase">02</p>
                {t("img02Desc") && <p className="text-[10px] tracking-[0.15em] text-white/40 uppercase">{t("img02Desc")}</p>}
              </div>
            </div>
          </ParallaxBlock>
          <ParallaxBlock speed={0.065} className="mt-16">
            <div style={{ paddingLeft: "12px" }}>
              <ParallaxImage src="/images/mic.jpg" alt="Studio microphone" aspect="4/3" sizes="33vw" speed={0.02} />
              <div className="flex items-baseline justify-between mt-3 px-1">
                <p className="text-[10px] tracking-[0.2em] text-white/40 uppercase">03</p>
                {t("img03Desc") && <p className="text-[10px] tracking-[0.15em] text-white/40 uppercase">{t("img03Desc")}</p>}
              </div>
            </div>
          </ParallaxBlock>
        </div>
      </div>

      {/* Mobile: swipeable image carousel */}
      <div className="md:hidden px-3 mb-16">
        <ImageCarousel images={images} />
      </div>

      {/* Quote */}
      <div
        ref={quoteRef}
        className="fade-up px-3 mb-16 md:mb-20"
      >
        {/* Mobile */}
        <div className="md:hidden">
          <h2 className="text-[32px] font-semibold leading-[1.15] tracking-tight text-white uppercase max-w-[80vw]">
            {t("quote")}
          </h2>
        </div>
        {/* Desktop: full-width 3-col grid */}
        <div className="hidden md:block">
          <div
            className="grid"
            style={{ gridTemplateColumns: "33.333% 33.333% 33.334%" }}
          >
            <div className="col-span-3" style={{ paddingLeft: "12px" }}>
              <h2 className="text-[42px] lg:text-[52px] font-semibold leading-[1.15] tracking-tight text-white uppercase max-w-[80vw]">
                {t("quote")}
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* Body + CTA */}
      <div
        ref={bodyRef}
        className="fade-up px-3"
      >
        {/* Mobile */}
        <div className="md:hidden">
          <p className="text-[16px] text-white/60 leading-relaxed mb-10">
            {t("quoteBody")}
          </p>
          <a
            href="#contact"
            className="inline-flex items-center justify-center px-8 py-3 text-[16px] tracking-[0.15em] uppercase font-normal border border-white text-white rounded-full hover:bg-white/10 transition-colors"
          >
            {t("ctaBook")}
          </a>
        </div>
        {/* Desktop: full-width 3-col grid */}
        <div className="hidden md:block">
          <div
            className="grid"
            style={{ gridTemplateColumns: "33.333% 33.333% 33.334%" }}
          >
            <div />
            <div className="col-span-2" style={{ paddingLeft: "12px" }}>
              <p className="text-base text-white/60 leading-relaxed max-w-2xl mb-14">
                {t("quoteBody")}
              </p>
              <a
                href="#contact"
                className="inline-flex items-center justify-center px-8 py-3 text-xs tracking-[0.15em] uppercase font-normal border border-white text-white rounded-full hover:bg-white/10 transition-colors"
              >
                {t("ctaBook")}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── APPROACH (HOW) ─── */
function Approach() {
  const t = useTranslations("approach");

  const blocksRef = useFadeIn<HTMLDivElement>(0.1, "0px 0px -60px 0px", 0.04);

  const approachItems: AccordionItemData[] = [
    { title: t("idea"), content: t("ideaDesc") },
    { title: t("production"), content: t("productionDesc") },
    { title: t("directionTitle"), content: t("directionDesc") },
    { title: t("output"), content: t("outputDesc") },
  ];

  const images = [
    { src: "/images/camera.jpg", alt: "Sony camera", num: "01", desc: t("img01Desc") },
    { src: "/images/mixer.jpg", alt: "Audio mixer", num: "02", desc: t("img02Desc") },
    { src: "/images/mic.jpg", alt: "Studio microphone", num: "03", desc: t("img03Desc") },
    { src: "/images/books.jpg", alt: "Studio details", num: "04", desc: t("img04Desc") },
  ];

  return (
    <section id="approach" className="relative">
      {/* Part 1: Text — 3 columns */}
      <div data-grid="3" className="py-24 md:py-32 lg:py-40">
        {/* HOW SVG */}
        <div className="relative mb-16 md:mb-20">
          <ParallaxSvg speed={-0.05}>
            <div className="w-full overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/how.svg" alt="" aria-hidden="true" className="w-full h-auto hidden md:block" style={{ filter: "brightness(0) invert(1)" }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/how.svg" alt="" aria-hidden="true" className="md:hidden h-[86px] w-auto" style={{ filter: "brightness(0) invert(1)" }} />
            </div>
          </ParallaxSvg>
          <div className="absolute inset-0 flex items-center px-3 mix-blend-difference">
            <ParallaxBlock speed={0.04} className="w-full">
              {/* Mobile */}
              <div className="md:hidden">
                <h2 className="text-[32px] font-semibold leading-[1.15] tracking-tight text-white uppercase max-w-[80vw]">
                  {t("headline")}
                </h2>
              </div>
              {/* Desktop: full-width 3-col grid */}
              <div className="hidden md:block">
                <div
                  className="grid"
                  style={{ gridTemplateColumns: "33.333% 33.333% 33.334%" }}
                >
                  <div className="col-span-3" style={{ paddingLeft: "12px" }}>
                    <h2 className="text-[42px] lg:text-[52px] font-semibold leading-[1.15] tracking-tight text-white uppercase max-w-[80vw]">
                      {t("headline")}
                    </h2>
                  </div>
                </div>
              </div>
            </ParallaxBlock>
          </div>
        </div>

        {/* Desktop: 2x2 process blocks */}
        <div ref={blocksRef} className="fade-up px-3">
          {/* Desktop: 2x2 aligned to guide lines with 12px gaps */}
          <div className="hidden md:block">
            <div
              className="grid gap-y-12 md:gap-y-16"
              style={{
                gridTemplateColumns: "33.333% 33.333% 33.334%",
              }}
            >
              {/* Row 1: col1 empty, Idea starts at guideline1+12px, Production starts at guideline2+12px */}
              <div />
              <div style={{ paddingLeft: "12px" }}>
                <h3 className="text-[24px] font-normal leading-[1.35] tracking-[0.01em] text-white uppercase mb-5">{t("idea")}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{t("ideaDesc")}</p>
              </div>
              <div style={{ paddingLeft: "12px" }}>
                <h3 className="text-[24px] font-normal leading-[1.35] tracking-[0.01em] text-white uppercase mb-5">{t("production")}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{t("productionDesc")}</p>
              </div>
              {/* Row 2 */}
              <div />
              <div style={{ paddingLeft: "12px" }}>
                <h3 className="text-[24px] font-normal leading-[1.35] tracking-[0.01em] text-white uppercase mb-5">{t("directionTitle")}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{t("directionDesc")}</p>
              </div>
              <div style={{ paddingLeft: "12px" }}>
                <h3 className="text-[24px] font-normal leading-[1.35] tracking-[0.01em] text-white uppercase mb-5">{t("output")}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{t("outputDesc")}</p>
              </div>
            </div>
          </div>
          {/* Mobile: accordion */}
          <div className="md:hidden">
            <Accordion items={approachItems} />
          </div>
        </div>
      </div>

      {/* Part 2: Images — 4 columns */}
      <div data-grid="4" className="py-16 md:py-24">
        {/* Desktop: 4-column image grid — 12px gaps from guide lines */}
        <div className="hidden md:block w-full">
          <div
            className="grid md:items-start"
            style={{ gridTemplateColumns: "25% 25% 25% 25%" }}
          >
            <ParallaxBlock speed={0.035} className="lg:mt-0">
              <div style={{ paddingRight: "12px" }}>
                <ParallaxImage src="/images/camera.jpg" alt="Sony camera" aspect="3/2" sizes="25vw" speed={0.02} />
                <div className="flex items-baseline justify-between mt-3 px-1">
                  <p className="text-[10px] tracking-[0.2em] text-white/40 uppercase">01</p>
                  {t("img01Desc") && <p className="text-[10px] tracking-[0.15em] text-white/40 uppercase">{t("img01Desc")}</p>}
                </div>
              </div>
            </ParallaxBlock>
            <ParallaxBlock speed={0.09} className="lg:mt-60">
              <div style={{ paddingLeft: "12px", paddingRight: "12px" }}>
                <ParallaxImage src="/images/mixer.jpg" alt="Audio mixer" aspect="3/2" sizes="25vw" speed={0.03} />
                <div className="flex items-baseline justify-between mt-3 px-1">
                  <p className="text-[10px] tracking-[0.2em] text-white/40 uppercase">02</p>
                  {t("img02Desc") && <p className="text-[10px] tracking-[0.15em] text-white/40 uppercase">{t("img02Desc")}</p>}
                </div>
              </div>
            </ParallaxBlock>
            <ParallaxBlock speed={0.06} className="lg:mt-24">
              <div style={{ paddingLeft: "12px", paddingRight: "12px" }}>
                <ParallaxImage src="/images/mic.jpg" alt="Studio microphone" aspect="3/2" sizes="25vw" speed={0.02} />
                <div className="flex items-baseline justify-between mt-3 px-1">
                  <p className="text-[10px] tracking-[0.2em] text-white/40 uppercase">03</p>
                  {t("img03Desc") && <p className="text-[10px] tracking-[0.15em] text-white/40 uppercase">{t("img03Desc")}</p>}
                </div>
              </div>
            </ParallaxBlock>
            <ParallaxBlock speed={0.075} className="lg:mt-48">
              <div style={{ paddingLeft: "12px" }}>
                <ParallaxImage src="/images/books.jpg" alt="Studio details" aspect="3/2" sizes="25vw" speed={0.03} />
                <div className="flex items-baseline justify-between mt-3 px-1">
                  <p className="text-[10px] tracking-[0.2em] text-white/40 uppercase">04</p>
                  {t("img04Desc") && <p className="text-[10px] tracking-[0.15em] text-white/40 uppercase">{t("img04Desc")}</p>}
                </div>
              </div>
            </ParallaxBlock>
          </div>
        </div>
        {/* Mobile: swipeable carousel */}
        <div className="md:hidden px-3">
          <ImageCarousel images={images} />
        </div>
      </div>
    </section>
  );
}

/* ─── MODEL ─── */
function Model() {
  const t = useTranslations("model");

  const quoteRef = useFadeIn<HTMLDivElement>(0.15, "0px 0px -60px 0px", 0.06);

  /* ── Session card JSX (used inside 4th accordion) ── */
  const sessionCard = (
    <div className="space-y-8">
      {/* Session header */}
      <div>
        <h4 className="text-[22px] md:text-[26px] text-white font-normal tracking-tight">
          {t("sessionTitle")}
        </h4>
        <p className="text-sm text-white/50 mt-1">{t("sessionDesc")}</p>
      </div>

      {/* LIVE block */}
      <div>
        <p className="text-[10px] tracking-[0.2em] text-white/30 uppercase mb-4">
          {t("sessionLiveLabel")}
        </p>
        <ul className="space-y-4 text-sm text-white/70">
          <li>
            <span className="text-white font-medium">{t("sessionLiveItem1Bold")}</span>{" "}
            <span className="text-white/40">{t("sessionLiveItem1Detail")}</span>
            <br />
            <span className="text-white/40">{t("sessionLiveItem1Sub")}</span>
          </li>
          <li>
            <span className="text-white font-medium">{t("sessionLiveItem2Bold")}</span>
            <br />
            <span className="text-white/40">{t("sessionLiveItem2Sub")}</span>
          </li>
          <li>
            <span className="text-white font-medium">{t("sessionLiveItem3Bold")}</span>{" "}
            <span className="text-white/40">{t("sessionLiveItem3Detail")}</span>
          </li>
          <li>
            <span className="text-white font-medium">{t("sessionLiveItem4Bold")}</span>
            <br />
            {t("sessionLiveItem4Sub").split("\n").map((line, i, arr) => (
              <span key={i} className="text-white/40">
                {line}{i < arr.length - 1 && <br />}
              </span>
            ))}
          </li>
        </ul>
      </div>

      {/* STUDIO block */}
      <div className="border-t border-white/10 pt-6">
        <p className="text-[10px] tracking-[0.2em] text-white/30 uppercase mb-4">
          {t("sessionStudioLabel")}
        </p>
        <ul className="space-y-1 text-sm">
          <li>
            <span className="text-white font-medium">{t("sessionStudioItem1Bold")}</span>
            <br />
            <span className="text-white/40">{t("sessionStudioItem1Sub")}</span>
          </li>
        </ul>
      </div>

      {/* SLA block */}
      <div className="border-t border-white/10 pt-6">
        <p className="text-[10px] tracking-[0.2em] text-white/30 uppercase mb-4">
          {t("sessionSlaLabel")}
        </p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-white font-medium">{t("sessionSlaDelivery")}</p>
            <p className="text-white/40">{t("sessionSlaDeliveryVal")}</p>
          </div>
          <div>
            <p className="text-white font-medium">{t("sessionSlaRevisions")}</p>
            <p className="text-white/40">{t("sessionSlaRevisionsVal")}</p>
          </div>
          <div>
            <p className="text-white font-medium">{t("sessionSlaOutputs")}</p>
            <p className="text-white/40">{t("sessionSlaOutputsVal")}</p>
          </div>
          <div>
            <p className="text-white font-medium">{t("sessionSlaHandoff")}</p>
            <p className="text-white/40">{t("sessionSlaHandoffVal")}</p>
          </div>
        </div>
      </div>

      {/* Price */}
      <div className="border-t border-white/10 pt-6">
        <p className="text-[32px] md:text-[36px] text-white font-light tracking-tight leading-none">
          {t("sessionPrice")}{" "}
          <span className="text-sm text-white/40 font-normal">{t("sessionPricePer")}</span>
        </p>
        <p className="text-sm text-white/40 mt-2">{t("sessionPriceCommitment")}</p>
      </div>
    </div>
  );

  /* ── "What is a session" content ── */
  const whatIsSessionContent = (
    <div className="space-y-4">
      <p>{t("whatIsSessionContent")}</p>
      <p>{t("whatIsSessionCombine")}</p>
      <ul className="space-y-1 pl-0">
        {["whatIsSessionItem1", "whatIsSessionItem2", "whatIsSessionItem3", "whatIsSessionItem4", "whatIsSessionItem5"].map((key) => (
          <li key={key} className="flex gap-2">
            <span className="text-white/30">&mdash;</span>
            <span>{t(key)}</span>
          </li>
        ))}
      </ul>
      <p>{t("whatIsSessionResult")}</p>
      <p>{t("whatIsSessionGuarantee")}</p>
    </div>
  );

  /* ── "Why subscription" content ── */
  const whySubscriptionContent = (
    <div className="space-y-4">
      <p>{t("whySubscriptionIntro")}</p>
      {(["01", "02", "03", "04"] as const).map((num, i) => {
        const keys = [
          ["whyConsistency", "whyConsistencyDesc"],
          ["whyDepth", "whyDepthDesc"],
          ["whyFlexibility", "whyFlexibilityDesc"],
          ["whyClarity", "whyClarityDesc"],
        ] as const;
        return (
          <p key={i}>
            <span className="text-white/30">{num}</span>{" "}
            <span className="text-white">{t(keys[i][0])}</span>{" "}
            <span>&mdash; {t(keys[i][1])}</span>
          </p>
        );
      })}
    </div>
  );

  /* ── "How subscription works" content ── */
  const howSubscriptionContent = (
    <div className="space-y-4">
      <p>{t("howSubscriptionIntro")}</p>
      <p>{t("howSubscriptionProblem")}</p>
      <p className="text-white">{t("howSubscriptionDifferent")}</p>
      {t("howSubscriptionSystem") && <p>{t("howSubscriptionSystem")}</p>}
      {t("howSubscriptionExamples") && <p>{t("howSubscriptionExamples")}</p>}
      <p>{t("howSubscriptionConclusion")}</p>
    </div>
  );

  const modelItems: AccordionItemData[] = [
    { title: t("whatIsSession"), content: whatIsSessionContent },
    { title: t("howSubscription"), content: howSubscriptionContent },
    { title: t("whySubscription"), content: whySubscriptionContent },
    { title: t("sessionExample"), content: sessionCard },
  ];

  return (
    <section id="pricing" data-grid="4" className="relative py-24 md:py-32 lg:py-40">
      {/* MODEL SVG */}
      <SectionSvg src="/images/model.svg" speed={-0.05} />

      {/* Creative Subscription subtitle */}
      <div className="px-3 mt-4 md:mt-8 mb-16 md:mb-24">
        <div className="md:hidden">
          <h2 className="text-[28px] font-semibold leading-[1.15] tracking-tight text-white uppercase max-w-[80vw]">
            {t("subtitle")}
          </h2>
        </div>
        <div className="hidden md:block">
          <div className="grid" style={{ gridTemplateColumns: "25% 25% 25% 25%" }}>
            <div className="col-span-4" style={{ paddingLeft: "12px" }}>
              <h2 className="text-[42px] lg:text-[52px] font-semibold leading-[1.15] tracking-tight text-white uppercase max-w-[80vw]">
                {t("subtitle")}
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* Accordion */}
      <div className="px-3 mb-24 md:mb-32">
        {/* Desktop: 4-col grid, accordion in cols 2-3 */}
        <div className="hidden md:block">
          <div
            className="grid"
            style={{ gridTemplateColumns: "25% 25% 25% 25%" }}
          >
            <div />
            <div className="col-span-2" style={{ paddingLeft: "12px", paddingRight: "12px" }}>
              <Accordion items={modelItems} />
            </div>
            <div />
          </div>
        </div>
        {/* Mobile: full width */}
        <div className="md:hidden">
          <Accordion items={modelItems} />
        </div>
      </div>

      {/* Bold statement */}
      <div ref={quoteRef} className="fade-up px-3">
        {/* Mobile */}
        <div className="md:hidden">
          <h2 className="text-[32px] font-semibold leading-[1.15] tracking-tight text-white uppercase max-w-[80vw]">
            {t("quote")}
          </h2>
        </div>
        {/* Desktop: full-width 4-col grid */}
        <div className="hidden md:block">
          <div
            className="grid"
            style={{ gridTemplateColumns: "25% 25% 25% 25%" }}
          >
            <div className="col-span-4" style={{ paddingLeft: "12px" }}>
              <h2 className="text-[42px] lg:text-[52px] font-semibold leading-[1.15] tracking-tight text-white uppercase max-w-[80vw]">
                {t("quote")}
              </h2>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── CONTACT ─── */
function Contact() {
  const tContact = useTranslations("contact");
  const tFooter = useTranslations("footer");

  const formRef = useFadeIn<HTMLDivElement>(0.15, "0px 0px -60px 0px", 0.04);
  const [formState, setFormState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [formData, setFormData] = useState({ name: "", contact: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.contact || !formData.message) return;
    setFormState("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error();
      setFormState("sent");
      setFormData({ name: "", contact: "", message: "" });
    } catch {
      setFormState("error");
    }
  };

  return (
    <section id="contact" data-grid="4" className="relative py-24 md:py-32 lg:py-40">
      {/* Desktop: Image in cols 3-4 */}
      <div className="hidden md:block mb-8">
        <div
          className="grid"
          style={{ gridTemplateColumns: "25% 25% 25% 25%" }}
        >
          <div className="col-span-2" />
          <div className="col-span-2" style={{ paddingLeft: "12px" }}>
            <ParallaxImage
              src="/images/studio-reflection.jpg"
              alt="Studio reflection"
              aspect="16/9"
              sizes="50vw"
              speed={0.06}
            />
          </div>
        </div>
      </div>

      {/* Mobile: full-width image */}
      <div className="md:hidden mb-4">
        <div className="relative overflow-hidden" style={{ aspectRatio: "4/3" }}>
          <Image
            src="/images/studio-reflection.jpg"
            alt="Studio reflection"
            fill
            className="object-cover grayscale"
            sizes="100vw"
          />
        </div>
      </div>

      {/* TALK SVG */}
      <SectionSvg src="/images/talk.svg" speed={-0.04} />

      {/* Contact form */}
      <div
        ref={formRef}
        className="fade-up px-3 mt-12 md:mt-16"
      >
        {/* Desktop: centered in cols 2-3 */}
        <div className="hidden md:block">
          <div
            className="grid"
            style={{ gridTemplateColumns: "25% 25% 25% 25%" }}
          >
            <div />
            <div className="col-span-2" style={{ paddingLeft: "12px", paddingRight: "12px" }}>
              {formState === "sent" ? (
                <p className="text-sm tracking-[0.1em] text-white/60 uppercase py-8">
                  {tContact("thankYou")}
                </p>
              ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <input
                    type="text"
                    placeholder={tContact("placeholderName")}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full bg-transparent border border-white/20 rounded-[24px] px-6 py-3 text-sm tracking-[0.1em] text-white placeholder:text-white/30 uppercase focus:outline-none focus:border-white/50 transition-colors"
                  />
                  <input
                    type="text"
                    placeholder={tContact("placeholderContact")}
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    required
                    className="w-full bg-transparent border border-white/20 rounded-[24px] px-6 py-3 text-sm tracking-[0.1em] text-white placeholder:text-white/30 uppercase focus:outline-none focus:border-white/50 transition-colors"
                  />
                </div>
                <textarea
                  placeholder={tContact("placeholderMessage")}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                  rows={5}
                  className="w-full bg-transparent border border-white/20 rounded-[24px] px-6 py-4 text-sm tracking-[0.1em] text-white placeholder:text-white/30 uppercase focus:outline-none focus:border-white/50 transition-colors resize-none"
                />
                <button
                  type="submit"
                  disabled={formState === "sending"}
                  className="inline-flex items-center justify-center px-10 py-3 text-sm tracking-[0.15em] uppercase font-normal bg-white text-[#0F0F0F] rounded-full hover:bg-white/90 transition-colors disabled:opacity-50"
                >
                  {formState === "sending" ? tContact("sending") : formState === "error" ? tContact("tryAgain") : tContact("submit")}
                </button>
              </form>
              )}
            </div>
          </div>
        </div>

        {/* Mobile: stacked full width */}
        <div className="md:hidden">
          {formState === "sent" ? (
            <p className="text-[16px] text-white/60 uppercase py-8">
              {tContact("thankYou")}
            </p>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder={tContact("placeholderName")}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full bg-transparent border border-white/20 rounded-[24px] px-6 py-3 text-[16px] text-white placeholder:text-white/30 uppercase focus:outline-none focus:border-white/50 transition-colors"
            />
            <input
              type="text"
              placeholder={tContact("placeholderContact")}
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              required
              className="w-full bg-transparent border border-white/20 rounded-[24px] px-6 py-3 text-[16px] text-white placeholder:text-white/30 uppercase focus:outline-none focus:border-white/50 transition-colors"
            />
            <textarea
              placeholder={tContact("placeholderMessage")}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              required
              rows={5}
              className="w-full bg-transparent border border-white/20 rounded-[24px] px-6 py-4 text-[16px] text-white placeholder:text-white/30 uppercase focus:outline-none focus:border-white/50 transition-colors resize-none"
            />
            <button
              type="submit"
              disabled={formState === "sending"}
              className="inline-flex items-center justify-center px-10 py-3 text-[16px] tracking-[0.15em] uppercase font-normal bg-white text-[#0F0F0F] rounded-full hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              {formState === "sending" ? tContact("sending") : formState === "error" ? tContact("tryAgain") : tContact("submit")}
            </button>
          </form>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="px-3 mt-24 md:mt-32 pt-12">
        {/* Desktop: all 4 cols used */}
        <div className="hidden md:block">
          <div
            className="grid"
            style={{ gridTemplateColumns: "25% 25% 25% 25%" }}
          >
            <div style={{ paddingLeft: "12px" }}>
              <p className="text-[10px] tracking-[0.3em] text-white/30 uppercase mb-4">
                &copy; {new Date().getFullYear()} alwaysfriday.live
              </p>
              <div className="mt-4">
                <LanguageSwitcher />
              </div>
            </div>
            <div style={{ paddingLeft: "12px" }}>
              <p className="text-[10px] tracking-[0.3em] text-white/30 uppercase mb-4">
                {tFooter("studioRevnice")}
              </p>
              <p className="text-sm text-white/50 leading-relaxed">
                {tFooter("studioRevniceAddr").split("\n").map((line, i, arr) => (
                  <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
                ))}
              </p>
            </div>
            <div style={{ paddingLeft: "12px" }}>
              <p className="text-[10px] tracking-[0.3em] text-white/30 uppercase mb-4">
                {tFooter("studioPraha")}
              </p>
              <p className="text-sm text-white/50 leading-relaxed">
                {tFooter("studioPrahaAddr").split("\n").map((line, i, arr) => (
                  <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
                ))}
              </p>
            </div>
            <div style={{ paddingLeft: "12px" }}>
              <p className="text-[10px] tracking-[0.3em] text-white/30 uppercase mb-4">
                {tFooter("billing")}
              </p>
              <p className="text-sm text-white/50 leading-relaxed">
                {tFooter("billingAddr").split("\n").map((line, i, arr) => (
                  <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
                ))}
              </p>
            </div>
          </div>
          <div className="pb-8" />
        </div>

        {/* Mobile: stacked */}
        <div className="md:hidden space-y-8">
          <div>
            <p className="text-[10px] tracking-[0.3em] text-white/30 uppercase mb-3">
              {tFooter("studioRevnice")}
            </p>
            <p className="text-sm text-white/50 leading-relaxed">
              {tFooter("studioRevniceAddr").split("\n").map((line, i, arr) => (
                <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
              ))}
            </p>
          </div>
          <div>
            <p className="text-[10px] tracking-[0.3em] text-white/30 uppercase mb-3">
              {tFooter("studioPraha")}
            </p>
            <p className="text-sm text-white/50 leading-relaxed">
              {tFooter("studioPrahaAddr").split("\n").map((line, i, arr) => (
                <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
              ))}
            </p>
          </div>
          <div>
            <p className="text-[10px] tracking-[0.3em] text-white/30 uppercase mb-3">
              {tFooter("billing")}
            </p>
            <p className="text-sm text-white/50 leading-relaxed">
              {tFooter("billingAddr").split("\n").map((line, i, arr) => (
                <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
              ))}
            </p>
          </div>
          <div className="mt-12 pb-8">
            <p className="text-xs text-white/20">
              &copy; {new Date().getFullYear()} alwaysfriday.live
            </p>
            <div className="mt-4">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </footer>
    </section>
  );
}

/* ─── PAGE ─── */
export default function Home() {
  return (
    <>
      <CustomCursor />
      <GridLines />
      <Nav />
      <main>
        <Hero />
        <Services />
        <Approach />
        <Model />
        <Contact />
      </main>
    </>
  );
}
