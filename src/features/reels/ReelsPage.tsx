"use client";

import { ShortsReelsShell } from "@/components/shorts/ShortsReelsShell";
import type { ReelsCardData } from "@/features/reels/types";

export type ReelsPageProps = {
  shorts: ReelsCardData[];
};

/**
 * ReelsPage — immersive full-screen reels route shell.
 * Route stays at /shorts; this layer is the future home for feed UX upgrades.
 */
export function ReelsPage({ shorts }: ReelsPageProps) {
  return <ShortsReelsShell shorts={shorts} />;
}
