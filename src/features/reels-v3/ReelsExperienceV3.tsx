"use client";

import { useSearchParams } from "next/navigation";
import type { NewsShortCard } from "@/lib/news/shorts/types";
import type { ReelsV3Status } from "./types";
import { ReelViewer } from "./components/ReelViewer";
import { ReelsEmpty } from "./components/ReelsEmpty";
import { ReelsError } from "./components/ReelsError";
import { ReelsLoading } from "./components/ReelsLoading";
import "./styles/reels-v3.css";

export type ReelsExperienceV3Props = {
  shorts: NewsShortCard[];
  status?: ReelsV3Status;
  errorMessage?: string;
  onRetry?: () => void;
};

/**
 * JDP-017 — Premium vertical Reels Experience V3
 *
 * Presentation layer over existing shorts data — no API changes.
 */
export function ReelsExperienceV3({
  shorts,
  status = "ready",
  errorMessage,
  onRetry,
}: ReelsExperienceV3Props) {
  const searchParams = useSearchParams();
  const start = searchParams.get("start") ?? undefined;

  if (status === "loading") {
    return (
      <div className="reels-v3 reels-v3--loading">
        <ReelsLoading />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="reels-v3 reels-v3--error">
        <ReelsError message={errorMessage} onRetry={onRetry} />
      </div>
    );
  }

  if (!shorts.length) {
    return (
      <div className="reels-v3 reels-v3--empty">
        <ReelsEmpty />
      </div>
    );
  }

  return (
    <div className="reels-v3">
      <ReelViewer shorts={shorts} initialSlug={start} />
    </div>
  );
}
