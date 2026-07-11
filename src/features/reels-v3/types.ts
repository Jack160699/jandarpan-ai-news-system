/**
 * JDP-017 — Reels V3 shared types
 */

export type { NewsShortCard as ReelsV3Card } from "@/lib/news/shorts/types";

export type ReelsV3Status = "idle" | "loading" | "ready" | "empty" | "error";
