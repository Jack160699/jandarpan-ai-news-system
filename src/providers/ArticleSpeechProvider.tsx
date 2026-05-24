"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  articleSpeechController,
  type ArticleSpeechPayload,
  type ArticleSpeechSnapshot,
} from "@/lib/speech/article-speech-controller";

type ArticleSpeechContextValue = {
  snapshot: ArticleSpeechSnapshot;
  toggle: (payload: ArticleSpeechPayload) => Promise<void>;
  cancel: () => void;
  cycleRate: () => number;
  isActive: (articleId: string) => boolean;
  isSpeaking: (articleId: string) => boolean;
  isPaused: (articleId: string) => boolean;
};

const ArticleSpeechContext = createContext<ArticleSpeechContextValue | null>(
  null
);

function subscribe(listener: () => void) {
  return articleSpeechController.subscribe(listener);
}

function getSnapshot() {
  return articleSpeechController.getSnapshot();
}

export function ArticleSpeechProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    return articleSpeechController.mountGlobalHandlers();
  }, []);

  useEffect(() => {
    articleSpeechController.cancel();
  }, [pathname]);

  const toggle = useCallback(
    (payload: ArticleSpeechPayload) => articleSpeechController.toggle(payload),
    []
  );
  const cancel = useCallback(() => articleSpeechController.cancel(), []);
  const cycleRate = useCallback(() => articleSpeechController.cycleRate(), []);
  const isActive = useCallback(
    (id: string) => articleSpeechController.isActive(id),
    [snapshot]
  );
  const isSpeaking = useCallback(
    (id: string) => articleSpeechController.isSpeaking(id),
    [snapshot]
  );
  const isPaused = useCallback(
    (id: string) => articleSpeechController.isPaused(id),
    [snapshot]
  );

  const value = useMemo<ArticleSpeechContextValue>(
    () => ({
      snapshot,
      toggle,
      cancel,
      cycleRate,
      isActive,
      isSpeaking,
      isPaused,
    }),
    [snapshot, toggle, cancel, cycleRate, isActive, isSpeaking, isPaused]
  );

  return (
    <ArticleSpeechContext.Provider value={value}>
      {children}
    </ArticleSpeechContext.Provider>
  );
}

export function useArticleSpeech() {
  const ctx = useContext(ArticleSpeechContext);
  if (!ctx) {
    throw new Error("useArticleSpeech must be used within ArticleSpeechProvider");
  }
  return ctx;
}

export function useArticleSpeechOptional() {
  return useContext(ArticleSpeechContext);
}
