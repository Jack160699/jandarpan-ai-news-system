"use client";

import type { ReactNode } from "react";
import { AudioProvider } from "./audio/AudioProvider";
import { FullPlayer } from "./audio/FullPlayer";
import { MiniPlayer } from "./audio/MiniPlayer";
import type { BriefingTrack } from "./audio/types";
import { applyExperienceToDocument, loadExperiencePrefs } from "./prefs";
import { useEffect } from "react";

function PrefsBoot() {
  useEffect(() => {
    applyExperienceToDocument(loadExperiencePrefs());
  }, []);
  return null;
}

/** Client chrome for Phase 4 audio + prefs boot — mount once per ReaderShell. */
export function ExperienceChrome({
  children,
  tracks,
}: {
  children: ReactNode;
  tracks?: BriefingTrack[];
}) {
  return (
    <AudioProvider initialTracks={tracks}>
      <PrefsBoot />
      {children}
      <MiniPlayer />
      <FullPlayer />
    </AudioProvider>
  );
}
