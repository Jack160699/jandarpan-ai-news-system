"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getLiveEditionState,
  PHASE_ATMOSPHERE,
  type LiveEditionState,
} from "@/lib/live-edition";
import {
  loadReadingMemory,
  recordArticleProgress,
  recordSectionVisit,
  toggleBookmark,
  type ReadingMemory,
} from "@/lib/reading-memory";
import { useAdaptivePacing, type PacingProfile } from "@/hooks/useAdaptivePacing";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type EditorialIntelligenceContextValue = {
  memory: ReadingMemory;
  live: LiveEditionState;
  pacing: PacingProfile;
  saveArticleProgress: (
    slug: string,
    progress: number,
    scrollY: number,
    title: string
  ) => void;
  markSection: (id: string, label: string, dwellMs?: number) => void;
  toggleArticleBookmark: (slug: string) => boolean;
  isBookmarked: (slug: string) => boolean;
};

const EditorialIntelligenceContext =
  createContext<EditorialIntelligenceContextValue | null>(null);

export function useEditorialIntelligence() {
  const ctx = useContext(EditorialIntelligenceContext);
  if (!ctx) {
    throw new Error(
      "useEditorialIntelligence must be used within EditorialIntelligenceProvider"
    );
  }
  return ctx;
}

export function useEditorialIntelligenceOptional() {
  return useContext(EditorialIntelligenceContext);
}

type Props = { children: ReactNode };

export function EditorialIntelligenceProvider({ children }: Props) {
  const [memory, setMemory] = useState<ReadingMemory>(() => loadReadingMemory());
  const [live, setLive] = useState<LiveEditionState>(() =>
    getLiveEditionState()
  );
  const pacing = useAdaptivePacing();
  const reduced = useReducedMotion();

  useEffect(() => {
    setMemory(loadReadingMemory());
  }, []);

  useEffect(() => {
    const tick = () => setLive(getLiveEditionState());
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const phase = live.phase;
    const atm = PHASE_ATMOSPHERE[phase];
    const root = document.documentElement;
    root.setAttribute("data-day-phase", phase);
    root.style.setProperty(
      "--day-warmth",
      String(atm.warmth + pacing.motionDensity * 0.02)
    );
    root.style.setProperty("--day-depth", String(atm.depth));
    root.style.setProperty(
      "--day-tempo",
      String(atm.tempo * pacing.typographyTempo)
    );
  }, [live.phase, pacing.motionDensity, pacing.typographyTempo, reduced]);

  const saveArticleProgress = useCallback(
    (slug: string, progress: number, scrollY: number, title: string) => {
      setMemory((m) => recordArticleProgress(m, slug, progress, scrollY, title));
    },
    []
  );

  const markSection = useCallback(
    (id: string, label: string, dwellMs = 0) => {
      setMemory((m) => recordSectionVisit(m, id, label, dwellMs));
    },
    []
  );

  const toggleArticleBookmark = useCallback((slug: string) => {
    let added = false;
    setMemory((m) => {
      const has = m.bookmarks.includes(slug);
      added = !has;
      return toggleBookmark(m, slug);
    });
    return added;
  }, []);

  const isBookmarked = useCallback(
    (slug: string) => memory.bookmarks.includes(slug),
    [memory.bookmarks]
  );

  const value = useMemo(
    () => ({
      memory,
      live,
      pacing,
      saveArticleProgress,
      markSection,
      toggleArticleBookmark,
      isBookmarked,
    }),
    [
      memory,
      live,
      pacing,
      saveArticleProgress,
      markSection,
      toggleArticleBookmark,
      isBookmarked,
    ]
  );

  return (
    <EditorialIntelligenceContext.Provider value={value}>
      {children}
    </EditorialIntelligenceContext.Provider>
  );
}
