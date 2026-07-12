"use client";

import { useCallback, useEffect, useState } from "react";
import { PageContainer } from "@/layouts/PageContainer";
import { HomeSectionErrorBoundary } from "@/components/errors/HomeSectionErrorBoundary";
import { useMorningBriefData } from "./hooks/useMorningBriefData";
import type { MorningBriefData } from "./types";
import { Greeting } from "./components/Greeting";
import { Breaking } from "./components/Breaking";
import { Weather } from "./components/Weather";
import { Government } from "./components/Government";
import { Jobs } from "./components/Jobs";
import { Traffic } from "./components/Traffic";
import { Events } from "./components/Events";
import { MorningBriefAISummary } from "./components/MorningBriefAISummary";
import { AudioPlayer } from "./components/AudioPlayer";
import { CompletionScreen } from "./components/CompletionScreen";
import { Loading } from "./components/Loading";
import { MorningBriefSkeleton } from "./components/Skeleton";
import { Responsive } from "./components/Responsive";
import "./styles/morning-brief.css";

export type MorningBriefExperienceProps = {
  /** Optional data overrides (e.g. from homepage feed). */
  data?: Partial<MorningBriefData>;
  /** Simulate initial load for skeleton demo */
  simulateLoadMs?: number;
};

/**
 * JDP-005 — Morning Brief scroll experience.
 * Greeting → Breaking → Widgets → AI Summary → Audio → Completion
 */
export function MorningBriefExperience({
  data: dataOverride,
  simulateLoadMs = 0,
}: MorningBriefExperienceProps) {
  const data = useMorningBriefData({ data: dataOverride });
  const [phase, setPhase] = useState<"loading" | "ready">(
    simulateLoadMs > 0 ? "loading" : "ready"
  );
  const [sessionKey, setSessionKey] = useState(0);

  useEffect(() => {
    if (simulateLoadMs <= 0) return undefined;
    const timer = window.setTimeout(() => setPhase("ready"), simulateLoadMs);
    return () => window.clearTimeout(timer);
  }, [simulateLoadMs, sessionKey]);

  const restart = useCallback(() => {
    setSessionKey((k) => k + 1);
    if (simulateLoadMs > 0) setPhase("loading");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [simulateLoadMs]);

  const listenHref =
    data.listenArticleIds.length > 0
      ? `/listen?ids=${data.listenArticleIds.slice(0, 5).join(",")}`
      : "/listen";

  if (phase === "loading") {
    return (
      <PageContainer width="default" className="mb-page">
        <Loading />
        <MorningBriefSkeleton />
      </PageContainer>
    );
  }

  return (
    <PageContainer width="default" className="mb-page" key={sessionKey}>
      <HomeSectionErrorBoundary name="mb-greeting">
        <Greeting weather={data.weather} />
      </HomeSectionErrorBoundary>

      <HomeSectionErrorBoundary name="mb-breaking">
        <Breaking items={data.breaking} />
      </HomeSectionErrorBoundary>

      <Responsive layout="widgets">
        <HomeSectionErrorBoundary name="mb-weather">
          <Weather weather={data.weather} />
        </HomeSectionErrorBoundary>
        <HomeSectionErrorBoundary name="mb-traffic">
          <Traffic items={data.traffic} />
        </HomeSectionErrorBoundary>
      </Responsive>

      <Responsive layout="split">
        <HomeSectionErrorBoundary name="mb-government">
          <Government items={data.government} />
        </HomeSectionErrorBoundary>
        <HomeSectionErrorBoundary name="mb-jobs">
          <Jobs items={data.jobs} />
        </HomeSectionErrorBoundary>
      </Responsive>

      <HomeSectionErrorBoundary name="mb-events">
        <Events items={data.events} />
      </HomeSectionErrorBoundary>

      <HomeSectionErrorBoundary name="mb-ai-summary">
        <MorningBriefAISummary summary={data.aiSummary} />
      </HomeSectionErrorBoundary>

      <HomeSectionErrorBoundary name="mb-audio">
        <AudioPlayer tracks={data.audioTracks} listenHref={listenHref} />
      </HomeSectionErrorBoundary>

      <HomeSectionErrorBoundary name="mb-complete">
        <CompletionScreen onRestart={restart} />
      </HomeSectionErrorBoundary>
    </PageContainer>
  );
}
