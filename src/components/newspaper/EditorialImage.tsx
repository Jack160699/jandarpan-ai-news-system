"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type EditorialImageProps = {
  src: string;
  alt: string;
  credit?: string;
  className?: string;
  wrapperClassName?: string;
  /** Delay before image begins revealing (seconds) */
  revealDelay?: number;
  enableZoom?: boolean;
  crop?: "tight" | "editorial" | "wide";
};

export function EditorialImage({
  src,
  alt,
  credit,
  className,
  wrapperClassName,
  revealDelay = 0.4,
  enableZoom = true,
  crop = "editorial",
}: EditorialImageProps) {
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

    const reveal = gsap.fromTo(
      img,
      {
        clipPath: "inset(8% 6% 100% 6%)",
        opacity: 0.3,
        scale: 1.08,
      },
      {
        clipPath: "inset(0% 0% 0% 0%)",
        opacity: 1,
        scale: 1,
        duration: 1.85,
        delay: revealDelay,
        ease: "power2.inOut",
        onComplete: () => setRevealed(true),
        scrollTrigger: {
          trigger: wrap,
          start: "top 78%",
          toggleActions: "play none none none",
        },
      }
    );

    let zoom: gsap.core.Tween | undefined;
    if (enableZoom) {
      zoom = gsap.to(img, {
        scale: 1.06,
        ease: "none",
        scrollTrigger: {
          trigger: wrap,
          start: "top bottom",
          end: "bottom top",
          scrub: 1.2,
        },
      });
    }

    return () => {
      reveal.kill();
      zoom?.kill();
    };
  }, [reduced, revealDelay, enableZoom]);

  const cropClass =
    crop === "tight"
      ? "object-[center_25%]"
      : crop === "wide"
        ? "object-[center_40%]"
        : "object-[center_30%]";

  return (
    <figure className={cn("relative", wrapperClassName)}>
      <div
        ref={wrapRef}
        className="editorial-shadow relative overflow-hidden bg-[var(--paper-shadow)]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={cn(
            "image-ink block h-full w-full object-cover",
            cropClass,
            !revealed && "image-reveal-mask",
            revealed && "is-revealed",
            className
          )}
          loading="lazy"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--paper)]/50 via-transparent to-[color-mix(in_srgb,var(--ink-primary)_8%,transparent)]"
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
