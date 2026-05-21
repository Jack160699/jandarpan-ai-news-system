"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type NarrativeImageProps = {
  src: string;
  alt: string;
  credit?: string;
  className?: string;
  wrapperClassName?: string;
  revealDelay?: number;
  enableZoom?: boolean;
  enablePan?: boolean;
  variant?: "default" | "hero" | "folio" | "article";
};

export function NarrativeImage({
  src,
  alt,
  credit,
  className,
  wrapperClassName,
  revealDelay = 0.5,
  enableZoom = true,
  enablePan = false,
  variant = "default",
}: NarrativeImageProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [revealed, setRevealed] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || !wrapRef.current || !imgRef.current) {
      setRevealed(true);
      return;
    }

    const wrap = wrapRef.current;
    const img = imgRef.current;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        img,
        {
          clipPath: "inset(4% 2% 100% 2%)",
          opacity: 0.88,
          scale: 1.02,
          filter: "blur(0px)",
        },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          opacity: 1,
          scale: 1,
          filter: "blur(0px)",
          duration: 1.4,
          delay: revealDelay,
          ease: "power2.inOut",
          onComplete: () => setRevealed(true),
          scrollTrigger: {
            trigger: wrap,
            start: "top 80%",
            toggleActions: "play none none none",
          },
        }
      );

      if (enableZoom) {
        gsap.to(img, {
          scale: variant === "hero" ? 1.04 : 1.02,
          ease: "none",
          scrollTrigger: {
            trigger: wrap,
            start: "top bottom",
            end: "bottom top",
            scrub: 1.4,
          },
        });
      }

      if (enablePan) {
        gsap.fromTo(
          img,
          { yPercent: -2, scale: 1.03 },
          {
            yPercent: 2,
            scale: 1.05,
            ease: "none",
            scrollTrigger: {
              trigger: wrap,
              start: "top bottom",
              end: "bottom top",
              scrub: 1.8,
            },
          }
        );
      }
    }, wrap);

    return () => ctx.revert();
  }, [reduced, revealDelay, enableZoom, enablePan, variant]);

  const cropClass =
    variant === "hero"
      ? "object-[center_28%]"
      : variant === "folio"
        ? "object-[center_38%]"
        : "object-[center_32%]";

  return (
    <figure className={cn("relative", wrapperClassName)}>
      <div
        ref={wrapRef}
        className={cn(
          "editorial-shadow relative overflow-hidden bg-[var(--paper-shadow)]",
          variant === "hero" && "min-h-full"
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          decoding="async"
          loading="lazy"
          className={cn(
            "image-ink block h-full w-full object-cover",
            cropClass,
            !revealed && "image-reveal-mask",
            revealed && "is-revealed",
            className
          )}
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--paper)]/28 via-transparent to-transparent"
          aria-hidden
        />
      </div>
      {credit ? (
        <figcaption className="meta-label mt-3 text-[var(--ink-muted)]">
          {credit}
        </figcaption>
      ) : null}
    </figure>
  );
}
