"use client";

import dynamic from "next/dynamic";
import { BroadcastProvider } from "./BroadcastContext";
import "./styles/studio.css";
import type { BroadcastLanguage } from "./types";

const JanDarpanStudio = dynamic(
  () =>
    import("./components/JanDarpanStudio").then((m) => ({
      default: m.JanDarpanStudio,
    })),
  { ssr: false }
);

type Props = {
  initialLanguage?: BroadcastLanguage;
  embedded?: boolean;
};

/**
 * Jan Darpan Live root entry point.
 * Wraps the broadcast context and lazily loads the studio compositor.
 */
export function JanDarpanLive({ initialLanguage = "hi", embedded = false }: Props) {
  return (
    <BroadcastProvider initialLanguage={initialLanguage}>
      <JanDarpanStudio embedded={embedded} />
    </BroadcastProvider>
  );
}

// Compact homepage preview card — loads no audio/video
export { JanDarpanLivePreview } from "./components/JanDarpanLivePreview";
