"use client";

import { memo } from "react";
import {
  Building2,
  Factory,
  Landmark,
  TrainFront,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { FeaturedDistrictSlug } from "@/lib/homepage/district-filter";

type DistrictVisual = {
  Icon: LucideIcon;
  /** Inactive icon + ring tint */
  idleClass: string;
  /** Subtle glow behind icon circle */
  glowClass: string;
};

const DISTRICT_VISUALS: Record<FeaturedDistrictSlug, DistrictVisual> = {
  raipur: {
    Icon: Building2,
    idleClass:
      "text-sky-600 ring-sky-200/90 bg-sky-50 dark:text-sky-300 dark:ring-sky-700/50 dark:bg-sky-950/50",
    glowClass: "shadow-[0_0_12px_rgba(56,189,248,0.35)]",
  },
  bilaspur: {
    Icon: TrainFront,
    idleClass:
      "text-amber-700 ring-amber-200/90 bg-amber-50 dark:text-amber-300 dark:ring-amber-800/50 dark:bg-amber-950/45",
    glowClass: "shadow-[0_0_12px_rgba(245,158,11,0.32)]",
  },
  durg: {
    Icon: Factory,
    idleClass:
      "text-emerald-700 ring-emerald-200/90 bg-emerald-50 dark:text-emerald-300 dark:ring-emerald-800/50 dark:bg-emerald-950/45",
    glowClass: "shadow-[0_0_12px_rgba(16,185,129,0.3)]",
  },
  rajnandgaon: {
    Icon: Landmark,
    idleClass:
      "text-violet-700 ring-violet-200/90 bg-violet-50 dark:text-violet-300 dark:ring-violet-800/50 dark:bg-violet-950/45",
    glowClass: "shadow-[0_0_12px_rgba(139,92,246,0.32)]",
  },
};

type DistrictSegmentIconProps = {
  slug: FeaturedDistrictSlug;
  isActive: boolean;
};

export const DistrictSegmentIcon = memo(function DistrictSegmentIcon({
  slug,
  isActive,
}: DistrictSegmentIconProps) {
  const { Icon, idleClass, glowClass } = DISTRICT_VISUALS[slug];

  return (
    <span
      className={cn(
        "relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 transition-colors duration-200",
        isActive
          ? "bg-white/20 text-white ring-white/35"
          : cn(idleClass, glowClass)
      )}
      aria-hidden
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
    </span>
  );
});
