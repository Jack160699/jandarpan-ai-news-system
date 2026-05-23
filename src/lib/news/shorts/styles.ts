/**
 * Category-specific short visual styles
 */

import type { HomeSectionId } from "@/lib/homepage/types";

export type ShortVisualStyle = {
  id: string;
  label: string;
  gradient: string;
  accent: string;
  badge: string;
  badgeHi: string;
  overlay: string;
  pulse: string;
};

export const SHORT_STYLES: Record<HomeSectionId, ShortVisualStyle> = {
  chhattisgarh: {
    id: "cg-regional",
    label: "Chhattisgarh",
    gradient: "linear-gradient(165deg, #1a472a 0%, #0d2137 55%, #1a0a0a 100%)",
    accent: "#4ade80",
    badge: "CG Desk",
    badgeHi: "छत्तीसगढ़",
    overlay: "rgba(26, 71, 42, 0.55)",
    pulse: "rgba(74, 222, 128, 0.35)",
  },
  raipur: {
    id: "raipur-city",
    label: "Raipur",
    gradient: "linear-gradient(165deg, #7c2d12 0%, #1e1b4b 50%, #0f172a 100%)",
    accent: "#fb923c",
    badge: "Raipur",
    badgeHi: "रायपुर",
    overlay: "rgba(124, 45, 18, 0.5)",
    pulse: "rgba(251, 146, 60, 0.35)",
  },
  india: {
    id: "national",
    label: "India",
    gradient: "linear-gradient(165deg, #1e3a5f 0%, #312e81 45%, #0f172a 100%)",
    accent: "#60a5fa",
    badge: "National",
    badgeHi: "देश",
    overlay: "rgba(30, 58, 95, 0.55)",
    pulse: "rgba(96, 165, 250, 0.35)",
  },
  world: {
    id: "world",
    label: "World",
    gradient: "linear-gradient(165deg, #134e4a 0%, #1e1b4b 50%, #020617 100%)",
    accent: "#2dd4bf",
    badge: "World",
    badgeHi: "विश्व",
    overlay: "rgba(19, 78, 74, 0.5)",
    pulse: "rgba(45, 212, 191, 0.35)",
  },
  business: {
    id: "business",
    label: "Business",
    gradient: "linear-gradient(165deg, #422006 0%, #1c1917 50%, #0c0a09 100%)",
    accent: "#fbbf24",
    badge: "Business",
    badgeHi: "व्यापार",
    overlay: "rgba(66, 32, 6, 0.55)",
    pulse: "rgba(251, 191, 36, 0.35)",
  },
  sports: {
    id: "sports",
    label: "Sports",
    gradient: "linear-gradient(165deg, #14532d 0%, #172554 50%, #0f172a 100%)",
    accent: "#4ade80",
    badge: "Sports",
    badgeHi: "खेल",
    overlay: "rgba(20, 83, 45, 0.5)",
    pulse: "rgba(74, 222, 128, 0.35)",
  },
  education: {
    id: "education",
    label: "Education",
    gradient: "linear-gradient(165deg, #4c1d95 0%, #1e3a5f 50%, #0f172a 100%)",
    accent: "#c084fc",
    badge: "Education",
    badgeHi: "शिक्षा",
    overlay: "rgba(76, 29, 149, 0.5)",
    pulse: "rgba(192, 132, 252, 0.35)",
  },
};

export function getShortStyle(section: HomeSectionId): ShortVisualStyle {
  return SHORT_STYLES[section] ?? SHORT_STYLES.chhattisgarh;
}
