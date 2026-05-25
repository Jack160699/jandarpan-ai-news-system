"use client";

import { memo } from "react";
import {
  Building2,
  Factory,
  Flame,
  Landmark,
  Mountain,
  Pickaxe,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { FeaturedDistrictSlug } from "@/lib/homepage/district-filter";

type DistrictVisual = {
  Icon: LucideIcon;
  idleClass: string;
  glowClass: string;
};

const DISTRICT_VISUALS: Record<FeaturedDistrictSlug, DistrictVisual> = {
  raipur: {
    Icon: Building2,
    idleClass:
      "text-sky-500/90 ring-sky-400/25 bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30 dark:bg-sky-500/12",
    glowClass: "shadow-[0_0_10px_rgba(56,189,248,0.28)]",
  },
  bilaspur: {
    Icon: Landmark,
    idleClass:
      "text-violet-500/90 ring-violet-400/25 bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30 dark:bg-violet-500/12",
    glowClass: "shadow-[0_0_10px_rgba(139,92,246,0.26)]",
  },
  durg: {
    Icon: Factory,
    idleClass:
      "text-emerald-500/90 ring-emerald-400/25 bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30 dark:bg-emerald-500/12",
    glowClass: "shadow-[0_0_10px_rgba(16,185,129,0.24)]",
  },
  raigarh: {
    Icon: Pickaxe,
    idleClass:
      "text-amber-500/90 ring-amber-400/25 bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30 dark:bg-amber-500/12",
    glowClass: "shadow-[0_0_10px_rgba(245,158,11,0.26)]",
  },
  korba: {
    Icon: Flame,
    idleClass:
      "text-orange-500/90 ring-orange-400/25 bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/30 dark:bg-orange-500/12",
    glowClass: "shadow-[0_0_10px_rgba(249,115,22,0.26)]",
  },
  jagdalpur: {
    Icon: Mountain,
    idleClass:
      "text-teal-500/90 ring-teal-400/25 bg-teal-500/10 dark:text-teal-300 dark:ring-teal-500/30 dark:bg-teal-500/12",
    glowClass: "shadow-[0_0_10px_rgba(20,184,166,0.24)]",
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
          ? "bg-white/18 text-white ring-white/30"
          : cn(idleClass, glowClass)
      )}
      aria-hidden
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
    </span>
  );
});
