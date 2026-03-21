"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useCallback } from "react";

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

  /* Subtle text parallax — only when speed > 0, waits for fade-in to finish */
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
        /* Let the CSS transition finish before taking over transform */
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
   GRID LINES  (3 lines → 4 columns, md+ only)
   ═══════════════════════════════════════════ */
function GridLines() {
  return (
    <div
      className="hidden md:block fixed inset-0 z-[999] pointer-events-none"
      aria-hidden="true"
    >
      <div className="mx-auto h-full max-w-[1920px] px-6 md:px-12 lg:px-16">
        <div className="relative h-full grid grid-cols-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-px bg-[#5E0058]"
              style={{ left: `${(i / 4) * 100}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   CUSTOM CURSOR  (20px, blend-difference)
   ═══════════════════════════════════════════ */
function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let x = -100,
      y = -100;
    let rX = -100,
      rY = -100;
    let rafId: number;

    const move = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
    };

    const render = () => {
      rX += (x - rX) * 0.15;
      rY += (y - rY) * 0.15;
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${rX - 10}px, ${rY - 10}px)`;
      }
      rafId = requestAnimationFrame(render);
    };

    // Hide on touch devices
    const isTouchDevice =
      typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0);
    if (isTouchDevice) return;

    window.addEventListener("mousemove", move, { passive: true });
    rafId = requestAnimationFrame(render);
    return () => {
      window.removeEventListener("mousemove", move);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      className="fixed top-0 left-0 z-[9999] pointer-events-none mix-blend-difference hidden md:block"
      style={{
        width: 20,
        height: 20,
        borderRadius: "50%",
        backgroundColor: "#ffffff",
        willChange: "transform",
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

/* ─── NAV ─── */
function Nav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-[100] mix-blend-difference">
      <nav className="mx-auto flex items-center justify-between px-6 md:px-12 lg:px-16 h-16 md:h-20 max-w-[1920px]">
        <a
          href="#"
          className="text-sm md:text-base font-semibold tracking-[0.2em] text-white uppercase"
        >
          ALWAYSFRIDAY
        </a>
        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8 lg:gap-12">
          <a
            href="#services"
            className="text-xs tracking-[0.2em] text-white/70 hover:text-white transition-colors uppercase"
          >
            Services
          </a>
          <a
            href="#approach"
            className="text-xs tracking-[0.2em] text-white/70 hover:text-white transition-colors uppercase"
          >
            Approach
          </a>
          <a
            href="#pricing"
            className="text-xs tracking-[0.2em] text-white/70 hover:text-white transition-colors uppercase"
          >
            Pricing
          </a>
        </div>
        <a
          href="#booking"
          className="hidden md:inline-flex items-center justify-center px-6 py-2 text-xs tracking-[0.15em] uppercase font-medium bg-white text-[#0F0F0F] rounded-full hover:bg-white/90 transition-colors"
        >
          Booking
        </a>
        {/* Mobile menu button */}
        <button className="md:hidden text-white" aria-label="Menu">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M3 8h18M3 16h18" />
          </svg>
        </button>
      </nav>
    </header>
  );
}

/* ─── HERO ─── */
function Hero() {
  const headRef = useFadeIn<HTMLDivElement>(0.2, "0px 0px -40px 0px", 0.018);

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden bg-[#0d0d0d] isolate">
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
      </div>

      {/* .LIVE SVG overlay — centered, full-width, blend mode exclusion */}
      <div className="absolute inset-0 flex items-center justify-center z-10 px-4 md:px-8 mix-blend-exclusion pointer-events-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/live.svg"
          alt=""
          aria-hidden="true"
          className="w-full h-auto max-h-[45vh] object-contain select-none"
        />
      </div>

      {/* Content — lower quarter, offset 1/3 from left */}
      <div
        ref={headRef}
        className="fade-up relative z-20 mt-auto px-6 md:px-12 lg:px-16 max-w-[1920px] mx-auto w-full pb-12 md:pb-16 lg:pb-20"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3">
          <div className="hidden lg:block" />
          <div className="lg:col-span-2">
            <p className="text-[10px] md:text-xs tracking-[0.3em] text-white/60 uppercase mb-6 md:mb-8">
              Curated Audio &amp; Video Creation
            </p>
            <h1 className="text-[24px] font-normal leading-[1.35] tracking-[0.01em] text-white uppercase max-w-3xl mb-8 md:mb-12">
              Podcasts, audiobooks and voiceovers with guidance, dramaturgy
              and&nbsp;quality.
            </h1>
            <a
              href="#booking"
              className="inline-flex items-center justify-center px-8 py-3 text-xs tracking-[0.15em] uppercase font-medium bg-white text-[#0F0F0F] rounded-full hover:bg-white/90 transition-colors"
            >
              Book a Session
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── ABOUT ─── */
function About() {
  const h2Ref = useFadeIn<HTMLDivElement>(0.15, "0px 0px -60px 0px", 0.025);
  const bodyRef = useFadeIn<HTMLDivElement>(0.15, "0px 0px -60px 0px", 0.015);

  return (
    <section className="relative py-24 md:py-32 lg:py-40">
      {/* Headline */}
      <div
        ref={h2Ref}
        className="fade-up px-6 md:px-12 lg:px-16 max-w-[1920px] mx-auto mb-16 md:mb-20"
      >
        <div className="grid grid-cols-1 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <h2 className="text-[32px] md:text-[42px] lg:text-[52px] font-bold leading-[1.15] tracking-tight text-white uppercase">
              From idea to finished content. In one&nbsp;place.
            </h2>
          </div>
        </div>
      </div>

      {/* Body text + CTA */}
      <div
        ref={bodyRef}
        className="fade-up px-6 md:px-12 lg:px-16 max-w-[1920px] mx-auto mb-20 md:mb-28"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3">
          <div className="hidden lg:block" />
          <div className="lg:col-span-2">
            <p className="text-sm md:text-base text-white/60 leading-relaxed max-w-2xl mb-10 md:mb-14">
              Our approach is based on focus, calm environment and thoughtful
              guidance. Every project is treated with attention and care.
            </p>
            <a
              href="#pricing"
              className="inline-flex items-center justify-center px-8 py-3 text-xs tracking-[0.15em] uppercase font-medium bg-white text-[#0F0F0F] rounded-full hover:bg-white/90 transition-colors"
            >
              Pricing
            </a>
          </div>
        </div>
      </div>

      {/* WHAT SVG — full width, white, blend mode difference */}
      <div className="w-full overflow-hidden mix-blend-difference">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/what.svg"
          alt=""
          aria-hidden="true"
          className="w-full h-auto"
          style={{ filter: "brightness(0) invert(1)" }}
        />
      </div>
    </section>
  );
}

/* ─── SERVICES (WHAT) ─── */
function Services() {
  const headRef = useFadeIn<HTMLDivElement>(0.15, "0px 0px -60px 0px", 0.022);
  const blocksRef = useFadeIn<HTMLDivElement>(0.1, "0px 0px -60px 0px", 0.012);

  return (
    <section id="services" className="relative py-24 md:py-32 lg:py-40">
      {/* Headline */}
      <div
        ref={headRef}
        className="fade-up px-6 md:px-12 lg:px-16 max-w-[1920px] mx-auto mb-16 md:mb-20"
      >
        <div className="grid grid-cols-1 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <h2 className="text-[32px] md:text-[42px] lg:text-[52px] font-bold leading-[1.15] tracking-tight text-white uppercase">
              Services
            </h2>
          </div>
        </div>
      </div>

      {/* 4 service blocks */}
      <div
        ref={blocksRef}
        className="fade-up px-6 md:px-12 lg:px-16 max-w-[1920px] mx-auto mb-24 md:mb-32"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3">
          <div className="hidden lg:block" />
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-12 md:gap-y-16">
              <div>
                <h3 className="text-[24px] font-normal leading-[1.35] tracking-[0.01em] text-white uppercase mb-5">
                  Podcast Production
                </h3>
                <ul className="space-y-2">
                  <li className="text-sm text-white/50 leading-relaxed">
                    Curated formats
                  </li>
                  <li className="text-sm text-white/50 leading-relaxed">
                    Dramaturgy
                  </li>
                  <li className="text-sm text-white/50 leading-relaxed">
                    Recording &amp; Post-production
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-[24px] font-normal leading-[1.35] tracking-[0.01em] text-white uppercase mb-5">
                  Video Content
                </h3>
                <ul className="space-y-2">
                  <li className="text-sm text-white/50 leading-relaxed">
                    Video podcasts
                  </li>
                  <li className="text-sm text-white/50 leading-relaxed">
                    Interviews
                  </li>
                  <li className="text-sm text-white/50 leading-relaxed">
                    Branded formats
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-[24px] font-normal leading-[1.35] tracking-[0.01em] text-white uppercase mb-5">
                  Audiobooks &amp; Voice
                </h3>
                <ul className="space-y-2">
                  <li className="text-sm text-white/50 leading-relaxed">
                    Audiobooks
                  </li>
                  <li className="text-sm text-white/50 leading-relaxed">
                    Voiceover
                  </li>
                  <li className="text-sm text-white/50 leading-relaxed">
                    Commercials
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-[24px] font-normal leading-[1.35] tracking-[0.01em] text-white uppercase mb-5">
                  Creative Guidance
                </h3>
                <ul className="space-y-2">
                  <li className="text-sm text-white/50 leading-relaxed">
                    Concept
                  </li>
                  <li className="text-sm text-white/50 leading-relaxed">
                    Direction
                  </li>
                  <li className="text-sm text-white/50 leading-relaxed">
                    Strategy
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image blocks — 3 columns, staggered */}
      <div className="px-6 md:px-12 lg:px-16 max-w-[1920px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4 md:items-start">
          {/* Image 01 — highest */}
          <div className="md:mt-0 p-2">
            <ParallaxImage
              src="/images/camera.jpg"
              alt="Sony camera setup"
              sizes="(max-width: 768px) 100vw, 33vw"
              speed={0.06}
            />
            <div className="flex items-baseline justify-between mt-3 px-1">
              <p className="text-[10px] tracking-[0.2em] text-white/40 uppercase">
                01
              </p>
              <p className="text-[10px] tracking-[0.15em] text-white/40 uppercase">
                Sony FX3 · GM 24mm · GM 50mm
              </p>
            </div>
          </div>
          {/* Image 02 — lowest */}
          <div className="md:mt-48 p-2">
            <ParallaxImage
              src="/images/studio.jpg"
              alt="Recording studio setup"
              sizes="(max-width: 768px) 100vw, 33vw"
              speed={0.12}
            />
            <div className="flex items-baseline justify-between mt-3 px-1">
              <p className="text-[10px] tracking-[0.2em] text-white/40 uppercase">
                02
              </p>
              <p className="text-[10px] tracking-[0.15em] text-white/40 uppercase">
                Description
              </p>
            </div>
          </div>
          {/* Image 03 — mid-low */}
          <div className="md:mt-24 p-2">
            <ParallaxImage
              src="/images/mic.jpg"
              alt="Studio microphone"
              sizes="(max-width: 768px) 100vw, 33vw"
              speed={0.04}
            />
            <div className="flex items-baseline justify-between mt-3 px-1">
              <p className="text-[10px] tracking-[0.2em] text-white/40 uppercase">
                03
              </p>
              <p className="text-[10px] tracking-[0.15em] text-white/40 uppercase">
                Description
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── APPROACH STATEMENT ─── */
function ApproachStatement() {
  const h2Ref = useFadeIn<HTMLDivElement>(0.15, "0px 0px -60px 0px", 0.028);
  const bodyRef = useFadeIn<HTMLDivElement>(0.15, "0px 0px -60px 0px", 0.016);

  return (
    <section className="relative py-24 md:py-32 lg:py-40">
      {/* Headline */}
      <div
        ref={h2Ref}
        className="fade-up px-6 md:px-12 lg:px-16 max-w-[1920px] mx-auto mb-16 md:mb-20"
      >
        <div className="grid grid-cols-1 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <h2 className="text-[32px] md:text-[42px] lg:text-[52px] font-bold leading-[1.15] tracking-tight text-white uppercase">
              We guide the creative process from concept and dramaturgy through
              recording and post&#8209;production.
            </h2>
          </div>
        </div>
      </div>

      {/* Body text + CTA */}
      <div
        ref={bodyRef}
        className="fade-up px-6 md:px-12 lg:px-16 max-w-[1920px] mx-auto"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3">
          <div className="hidden lg:block" />
          <div className="lg:col-span-2">
            <p className="text-sm md:text-base text-white/60 leading-relaxed max-w-2xl mb-10 md:mb-14">
              Our studio offers a rare combination of professional
              infrastructure and a unique setting — whether for a few hours or
              several focused days.
            </p>
            <a
              href="#booking"
              className="inline-flex items-center justify-center px-8 py-3 text-xs tracking-[0.15em] uppercase font-medium bg-white text-[#0F0F0F] rounded-full hover:bg-white/90 transition-colors"
            >
              Book a Session
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── APPROACH (HOW) ─── */
function Approach() {
  const blocksRef = useFadeIn<HTMLDivElement>(0.1, "0px 0px -60px 0px", 0.014);

  return (
    <section id="approach" className="relative py-24 md:py-32 lg:py-40">
      {/* APPROACH headline + HOW SVG */}
      <div className="relative mb-16 md:mb-20">
        <div className="w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/how.svg"
            alt=""
            aria-hidden="true"
            className="w-full h-auto"
            style={{ filter: "brightness(0) invert(1)" }}
          />
        </div>
        <div className="absolute inset-0 flex items-center px-6 md:px-12 lg:px-16 mix-blend-difference">
          <div className="max-w-[1920px] mx-auto w-full">
            <div className="grid grid-cols-1 lg:grid-cols-4">
              <div className="lg:col-span-3">
                <h2 className="text-[32px] md:text-[42px] lg:text-[52px] font-bold leading-[1.15] tracking-tight text-white uppercase">
                  Approach
                </h2>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 process blocks */}
      <div
        ref={blocksRef}
        className="fade-up px-6 md:px-12 lg:px-16 max-w-[1920px] mx-auto mb-24 md:mb-32"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3">
          <div className="hidden lg:block" />
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-12 md:gap-y-16">
              <div>
                <h3 className="text-[24px] font-normal leading-[1.35] tracking-[0.01em] text-white uppercase mb-5">
                  Idea
                </h3>
                <p className="text-sm text-white/50 leading-relaxed">
                  We help shape your idea and format.
                </p>
              </div>
              <div>
                <h3 className="text-[24px] font-normal leading-[1.35] tracking-[0.01em] text-white uppercase mb-5">
                  Direction
                </h3>
                <p className="text-sm text-white/50 leading-relaxed">
                  Dramaturgy, preparation and guidance.
                </p>
              </div>
              <div>
                <h3 className="text-[24px] font-normal leading-[1.35] tracking-[0.01em] text-white uppercase mb-5">
                  Production
                </h3>
                <p className="text-sm text-white/50 leading-relaxed">
                  Audio &amp; video recording in our studio.
                </p>
              </div>
              <div>
                <h3 className="text-[24px] font-normal leading-[1.35] tracking-[0.01em] text-white uppercase mb-5">
                  Output
                </h3>
                <p className="text-sm text-white/50 leading-relaxed">
                  Post-production and ready-to-publish content.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 image blocks — 4-column grid, cascading stagger */}
      <div className="px-6 md:px-12 lg:px-16 max-w-[1920px] mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-4 md:items-start">
          <div className="lg:mt-0 p-2">
            <ParallaxImage
              src="/images/camera.jpg"
              alt="Sony camera"
              aspect="3/4"
              sizes="(max-width: 1024px) 50vw, 25vw"
              speed={0.05}
            />
            <div className="flex items-baseline justify-between mt-3 px-1">
              <p className="text-[10px] tracking-[0.2em] text-white/40 uppercase">
                01
              </p>
              <p className="text-[10px] tracking-[0.15em] text-white/40 uppercase">
                Description
              </p>
            </div>
          </div>
          <div className="lg:mt-20 p-2">
            <ParallaxImage
              src="/images/mixer.jpg"
              alt="Audio mixing console"
              aspect="3/4"
              sizes="(max-width: 1024px) 50vw, 25vw"
              speed={0.1}
            />
            <div className="flex items-baseline justify-between mt-3 px-1">
              <p className="text-[10px] tracking-[0.2em] text-white/40 uppercase">
                02
              </p>
              <p className="text-[10px] tracking-[0.15em] text-white/40 uppercase">
                Description
              </p>
            </div>
          </div>
          <div className="lg:mt-40 p-2">
            <ParallaxImage
              src="/images/hero.jpg"
              alt="Studio microphone close-up"
              aspect="3/4"
              sizes="(max-width: 1024px) 50vw, 25vw"
              speed={0.07}
            />
            <div className="flex items-baseline justify-between mt-3 px-1">
              <p className="text-[10px] tracking-[0.2em] text-white/40 uppercase">
                03
              </p>
              <p className="text-[10px] tracking-[0.15em] text-white/40 uppercase">
                Description
              </p>
            </div>
          </div>
          <div className="lg:mt-60 p-2">
            <ParallaxImage
              src="/images/books.jpg"
              alt="Studio details"
              aspect="3/4"
              sizes="(max-width: 1024px) 50vw, 25vw"
              speed={0.13}
            />
            <div className="flex items-baseline justify-between mt-3 px-1">
              <p className="text-[10px] tracking-[0.2em] text-white/40 uppercase">
                04
              </p>
              <p className="text-[10px] tracking-[0.15em] text-white/40 uppercase">
                Description
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── WHEN (FINAL SECTION) ─── */
function When() {
  return (
    <section id="pricing" className="relative py-16 md:py-24 lg:py-32">
      {/* WHEN — large background SVG */}
      <div className="w-full overflow-hidden mb-12 md:mb-16 lg:mb-20 px-6 md:px-12 lg:px-16">
        <Image
          src="/images/when.svg"
          alt=""
          width={1692}
          height={324}
          className="w-full h-auto opacity-[0.08]"
          aria-hidden="true"
        />
      </div>

      <div className="px-6 md:px-12 lg:px-16 max-w-[1920px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-3">
          <ParallaxImage
            src="/images/studio-reflection.jpg"
            alt="Studio reflection in window"
            sizes="(max-width: 768px) 100vw, 50vw"
            speed={0.06}
          />
          <ParallaxImage
            src="/images/mixer.jpg"
            alt="Audio mixing console detail"
            sizes="(max-width: 768px) 100vw, 50vw"
            speed={0.1}
          />
        </div>
      </div>
    </section>
  );
}

/* ─── FOOTER ─── */
function Footer() {
  return (
    <footer
      id="booking"
      className="border-t border-white/5 py-16 md:py-20 lg:py-24 px-6 md:px-12 lg:px-16 max-w-[1920px] mx-auto"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">
        {/* Left — brand */}
        <div className="lg:col-span-4">
          <p className="text-sm font-semibold tracking-[0.2em] uppercase text-white mb-4">
            ALWAYSFRIDAY
          </p>
          <p className="text-sm text-white/40 leading-relaxed max-w-xs">
            Curated audio &amp; video creation studio based in Prague.
          </p>
        </div>

        {/* Center — links */}
        <div className="lg:col-span-4">
          <div className="flex flex-col sm:flex-row gap-8">
            <div>
              <p className="text-[10px] tracking-[0.3em] text-white/30 uppercase mb-4">
                Navigation
              </p>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#services"
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    Services
                  </a>
                </li>
                <li>
                  <a
                    href="#approach"
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    Approach
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    Pricing
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.3em] text-white/30 uppercase mb-4">
                Contact
              </p>
              <ul className="space-y-2">
                <li>
                  <a
                    href="mailto:hello@alwaysfriday.live"
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    hello@alwaysfriday.live
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right — CTA */}
        <div className="lg:col-span-4 lg:text-right">
          <a
            href="#booking"
            className="inline-flex items-center justify-center px-8 py-3 text-xs tracking-[0.15em] uppercase font-medium bg-white text-[#0F0F0F] rounded-full hover:bg-white/90 transition-colors"
          >
            Book a Session
          </a>
        </div>
      </div>

      <div className="mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-xs text-white/20">
          &copy; {new Date().getFullYear()} alwaysfriday.live
        </p>
        <a
          href="https://www.perplexity.ai/computer"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-white/20 hover:text-white/40 transition-colors"
        >
          Created with Perplexity Computer
        </a>
      </div>
    </footer>
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
        <About />
        <Services />
        <ApproachStatement />
        <Approach />
        <When />
      </main>
      <Footer />
    </>
  );
}
