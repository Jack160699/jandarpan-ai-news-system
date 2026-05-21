"use client";

import { useEffect, useRef } from "react";
import { animateImageParallax } from "@/animations/gsap-presets";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type ParallaxImageProps = {
  src: string;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  amount?: number;
};

export function ParallaxImage({
  src,
  alt,
  className,
  wrapperClassName,
  amount = 80,
}: ParallaxImageProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || !wrapperRef.current || !imageRef.current) return;
    const tween = animateImageParallax(imageRef.current, amount);
    return () => {
      tween.kill();
    };
  }, [reduced, amount]);

  return (
    <div
      ref={wrapperRef}
      className={cn("parallax-wrap overflow-hidden", wrapperClassName)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        className={cn("parallax-image h-[115%] w-full object-cover", className)}
        loading="lazy"
      />
    </div>
  );
}
