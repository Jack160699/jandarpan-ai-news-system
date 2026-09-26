"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from "react";
import type {
  BroadcastAction,
  BroadcastLanguage,
  BroadcastSegment,
  BroadcastState,
} from "./types";
import { generateAnchorSpokenScript } from "@/lib/broadcast/anchor-script-engine";
import { speechController } from "./speechController";
import { matchesCanonicalCategory } from "./lib/categories";

function buildBroadcastQueue(
  rawQueue: BroadcastSegment[],
  lang: BroadcastLanguage
): BroadcastSegment[] {
  if (!rawQueue || rawQueue.length === 0) return [];

  // Filter out any stale intro placeholders and ensure each real story has an anchor script
  const realStories = rawQueue.filter((s) => s.id !== "jd-live-intro" && !s.isIntro);

  return realStories.map((seg) => {
    const headline = lang === "en" ? (seg.headlineEn || seg.headline) : (seg.headlineHi || seg.headline);
    const summary = lang === "en" ? (seg.summaryEn || seg.summary) : (seg.summaryHi || seg.summary);
    const district = lang === "en" ? (seg.districtEn || seg.district) : (seg.districtHi || seg.district);
    const categoryLabel = lang === "en" ? (seg.categoryLabelEn || seg.categoryLabel) : (seg.categoryLabelHi || seg.categoryLabel);

    let script = seg.script;
    let durationSec = seg.durationSec || 12;

    const needsScriptRegen =
      !script ||
      script.includes("नंबर ") ||
      script.includes("Story number") ||
      script.includes("10 बड़ी खबरें") ||
      (lang === "en" && /[\u0900-\u097F]/.test(script)) ||
      (lang === "hi" && !/[\u0900-\u097F]/.test(script));

    if (needsScriptRegen) {
      const generated = generateAnchorSpokenScript({
        headline,
        summary,
        district,
        section: seg.section,
        categoryLabel,
        isBreaking: seg.isBreaking,
        language: lang,
      });
      script = generated.script;
      durationSec = generated.durationSec;
    }

    return {
      ...seg,
      headline,
      summary,
      district,
      categoryLabel,
      script,
      durationSec,
      countdownRank: 0,
      isIntro: false,
    };
  });
}

function getSafeSessionSeed(): string {
  if (typeof window === "undefined") return "default_seed";
  try {
    const existing = sessionStorage.getItem("jdl_seed");
    if (existing) return existing;
    const s = Math.random().toString(36).slice(2, 9);
    sessionStorage.setItem("jdl_seed", s);
    return s;
  } catch {
    return "seed_" + Math.random().toString(36).slice(2, 7);
  }
}

const AUDIO_CONSENT_KEY = "jdl_audio_unlocked";

const initialState: BroadcastState = {
  status: "initializing",
  mode: "normal",
  language: "hi",
  currentSegment: null,
  currentIndex: 0,
  countdownRank: 0,
  isIntro: false,
  queue: [],
  breakingQueue: [],
  anchorState: "idle",
  amplitude: 0,
  scriptReady: false,
  audioReady: false,
  isPlaying: true,
  isMuted: false,
  audioBlocked: false,
  playedIds: [],
  playedBreakingIds: [],
  sessionSeed: getSafeSessionSeed(),
  segmentToken: 1,
  selectedCategory: "all",
  selectedArticle: null,
};

function broadcastReducer(
  state: BroadcastState,
  action: BroadcastAction
): BroadcastState {
  switch (action.type) {
    case "SET_QUEUE": {
      const breaking = action.breaking ? buildBroadcastQueue(action.breaking, state.language) : [];
      const fullQueue = buildBroadcastQueue(action.queue, state.language);
      if (fullQueue.length === 0) {
        return {
          ...state,
          queue: [],
          breakingQueue: breaking,
        };
      }

      // If broadcast is already running, update the queue without resetting current position!
      if (state.currentSegment) {
        const existingIdx = fullQueue.findIndex((s) => s.id === state.currentSegment?.id);
        const nextIdx = existingIdx >= 0 ? existingIdx : state.currentIndex;
        let nextSelectedArticle = state.selectedArticle;
        if (state.selectedArticle) {
          const found = fullQueue.find((s) => s.id === state.selectedArticle?.id || s.slug === state.selectedArticle?.slug);
          if (found) nextSelectedArticle = found;
        }
        return {
          ...state,
          queue: fullQueue,
          breakingQueue: breaking,
          currentIndex: nextIdx,
          selectedArticle: nextSelectedArticle,
        };
      }

      // First load initialization: Always start with the primary broadcast queue (FIRST REAL STORY)
      const first = fullQueue[0];
      return {
        ...state,
        queue: fullQueue,
        breakingQueue: breaking,
        currentSegment: first,
        currentIndex: 0,
        countdownRank: 0,
        isIntro: false,
        mode: first.isBreaking ? "breaking" : "normal",
        status: "playing",
        scriptReady: !!first.script,
        audioReady: false,
        segmentToken: state.segmentToken + 1,
      };
    }
    case "SET_LANGUAGE": {
      const updatedQueue = buildBroadcastQueue(state.queue, action.language);
      const curr = updatedQueue[state.currentIndex] || updatedQueue[0] || null;
      let updatedSelectedArticle = state.selectedArticle;
      if (state.selectedArticle) {
        const found = updatedQueue.find(
          (s) => s.id === state.selectedArticle?.id || s.slug === state.selectedArticle?.slug
        );
        if (found) {
          updatedSelectedArticle = found;
        } else {
          const s = state.selectedArticle;
          updatedSelectedArticle = {
            ...s,
            headline: action.language === "en" ? (s.headlineEn || s.headline) : (s.headlineHi || s.headline),
            summary: action.language === "en" ? (s.summaryEn || s.summary) : (s.summaryHi || s.summary),
            district: action.language === "en" ? (s.districtEn || s.district) : (s.districtHi || s.district),
            categoryLabel: action.language === "en" ? (s.categoryLabelEn || s.categoryLabel) : (s.categoryLabelHi || s.categoryLabel),
          };
        }
      }
      return {
        ...state,
        language: action.language,
        queue: updatedQueue,
        currentSegment: curr,
        selectedArticle: updatedSelectedArticle,
        scriptReady: !!curr?.script,
        audioReady: false,
        segmentToken: state.segmentToken + 1,
      };
    }
    case "SET_MODE":
      return { ...state, mode: action.mode };
    case "SET_STATUS":
      return { ...state, status: action.status };
    case "NEXT_SEGMENT": {
      if (state.queue.length === 0) return state;

      const currentId = state.currentSegment?.id;
      const updatedPlayed = currentId
        ? Array.from(new Set([...state.playedIds, currentId]))
        : state.playedIds;

      // Exact filtered queue pool based on selectedCategory
      const pool = state.selectedCategory === "all"
        ? state.queue
        : state.queue.filter((s) => matchesCanonicalCategory(s, state.selectedCategory));
      
      if (pool.length === 0) return state;

      // If returning from breaking story
      if (state.mode === "breaking") {
        const returnIndex = typeof state.preBreakingIndex === "number"
          ? (state.preBreakingIndex + 1) % Math.max(1, pool.length)
          : (state.currentIndex + 1) % Math.max(1, pool.length);
        const returnSeg = pool[returnIndex] || pool[0];
        const playedBreaking = currentId
          ? Array.from(new Set([...state.playedBreakingIds, currentId]))
          : state.playedBreakingIds;

        return {
          ...state,
          currentIndex: state.queue.findIndex((s) => s.id === returnSeg.id),
          currentSegment: returnSeg,
          preBreakingIndex: undefined,
          countdownRank: 0,
          isIntro: false,
          mode: returnSeg?.isBreaking ? "breaking" : "normal",
          status: "playing",
          scriptReady: !!returnSeg?.script,
          audioReady: false,
          segmentToken: state.segmentToken + 1,
          playedIds: updatedPlayed,
          playedBreakingIds: playedBreaking,
        };
      }

      // Find current item's index in the filtered pool
      const currentPoolIdx = pool.findIndex((s) => s.id === currentId);
      const nextPoolIdx = currentPoolIdx + 1;

      if (nextPoolIdx >= pool.length) {
        // Continuous loop: Prefer unplayed in pool
        const unplayedSeg = pool.find((s) => !updatedPlayed.includes(s.id));
        const loopSeg = unplayedSeg || pool[0];
        const nextPlayed = unplayedSeg ? updatedPlayed : [];

        return {
          ...state,
          currentIndex: state.queue.findIndex((s) => s.id === loopSeg.id),
          currentSegment: loopSeg,
          countdownRank: 0,
          isIntro: false,
          mode: loopSeg?.isBreaking ? "breaking" : "normal",
          status: "playing",
          scriptReady: !!loopSeg?.script,
          audioReady: false,
          segmentToken: state.segmentToken + 1,
          playedIds: nextPlayed,
        };
      }

      const seg = pool[nextPoolIdx];
      return {
        ...state,
        currentIndex: state.queue.findIndex((s) => s.id === seg.id),
        currentSegment: seg,
        countdownRank: 0,
        isIntro: false,
        mode: seg.isBreaking ? "breaking" : "normal",
        status: "playing",
        scriptReady: !!seg.script,
        audioReady: false,
        segmentToken: state.segmentToken + 1,
        playedIds: updatedPlayed,
      };
    }
    case "SET_CATEGORY": {
      const category = action.category;
      const filtered = state.queue.filter((s) => matchesCanonicalCategory(s, category));

      // If currently playing story already matches this category, keep it
      if (state.currentSegment && matchesCanonicalCategory(state.currentSegment, category)) {
        return {
          ...state,
          selectedCategory: category,
        };
      }

      // Otherwise switch TV playback to the first matching segment
      const nextSeg = filtered[0] || (category === "all" ? (state.queue[0] || null) : null);
      const nextIdx = nextSeg ? state.queue.findIndex((s) => s.id === nextSeg.id) : 0;
      return {
        ...state,
        selectedCategory: category,
        currentSegment: nextSeg,
        currentIndex: nextIdx >= 0 ? nextIdx : 0,
        countdownRank: 0,
        isIntro: false,
        mode: nextSeg?.isBreaking ? "breaking" : "normal",
        status: nextSeg ? "playing" : state.status,
        scriptReady: !!nextSeg?.script,
        audioReady: false,
        segmentToken: state.segmentToken + 1,
      };
    }
    case "SET_SELECTED_ARTICLE":
      return { ...state, selectedArticle: action.article };
    case "INTERRUPT_BREAKING": {
      const savedIndex = state.mode !== "breaking"
        ? state.currentIndex
        : (state.preBreakingIndex ?? state.currentIndex);
      const segIdx = state.queue.findIndex((s) => s.id === action.segment.id);
      return {
        ...state,
        currentSegment: action.segment,
        currentIndex: segIdx >= 0 ? segIdx : state.currentIndex,
        preBreakingIndex: savedIndex,
        countdownRank: 0,
        isIntro: false,
        mode: action.segment.isBreaking ? "breaking" : "normal",
        status: "playing",
        scriptReady: !!action.segment.script,
        audioReady: false,
        segmentToken: state.segmentToken + 1,
      };
    }
    case "SET_ANCHOR_STATE":
      return { ...state, anchorState: action.state };
    case "SET_AMPLITUDE":
      return { ...state, amplitude: action.amplitude };
    case "SET_SCRIPT":
      if (state.currentSegment?.id !== action.segmentId) return state;
      return {
        ...state,
        currentSegment: {
          ...state.currentSegment,
          script: action.script,
          durationSec: action.durationSec,
        },
        scriptReady: true,
      };
    case "SET_AUDIO_READY":
      return { ...state, audioReady: action.ready };
    case "SET_SCRIPT_READY":
      return { ...state, scriptReady: action.ready };
    case "SET_PLAYING":
      return { ...state, isPlaying: action.isPlaying };
    case "TOGGLE_PLAY":
      return { ...state, isPlaying: !state.isPlaying };
    case "SET_MUTED":
      return { ...state, isMuted: action.isMuted };
    case "TOGGLE_MUTE":
      return { ...state, isMuted: !state.isMuted };
    case "SET_AUDIO_BLOCKED":
      return { ...state, audioBlocked: action.blocked };
    default:
      return state;
  }
}

type BroadcastContextValue = {
  state: BroadcastState;
  dispatch: React.Dispatch<BroadcastAction>;
  setLanguage: (lang: BroadcastLanguage) => void;
  nextSegment: () => void;
  interruptBreaking: (segment: BroadcastSegment) => void;
  togglePlay: () => void;
  toggleMute: () => void;
  setPlaying: (playing: boolean) => void;
  setMuted: (muted: boolean) => void;
  setCategory: (category: string) => void;
  setSelectedArticle: (article: BroadcastSegment | null) => void;
};

const BroadcastContext = createContext<BroadcastContextValue | null>(null);

export function BroadcastProvider({
  children,
  initialLanguage = "hi",
  initialQueue = [],
}: {
  children: ReactNode;
  initialLanguage?: BroadcastLanguage;
  initialQueue?: BroadcastSegment[];
}) {
  const [state, dispatch] = useReducer(
    broadcastReducer,
    { initialLanguage, initialQueue },
    ({ initialLanguage, initialQueue }) => {
      const fullQueue = initialQueue && initialQueue.length > 0
        ? buildBroadcastQueue(initialQueue, initialLanguage)
        : [];
      const first = fullQueue[0] || null;
      return {
        ...initialState,
        language: initialLanguage,
        queue: fullQueue,
        currentSegment: first,
        currentIndex: 0,
        countdownRank: 0,
        isIntro: false,
        status: (first ? "playing" : "initializing") as BroadcastState["status"],
        mode: (first?.isBreaking ? "breaking" : "normal") as BroadcastState["mode"],
        scriptReady: !!first?.script,
        segmentToken: 1,
        selectedCategory: "all",
        selectedArticle: null,
      };
    }
  );

  // Attempt unmuted audio playback on client mount by default
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        if (localStorage.getItem(AUDIO_CONSENT_KEY) === "0") {
          // Explicitly muted by user
          speechController.setMuted(true);
          dispatch({ type: "SET_MUTED", isMuted: true });
        } else {
          // Default: attempt unmuted audio
          speechController.setMuted(false);
          dispatch({ type: "SET_MUTED", isMuted: false });
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (initialLanguage && initialLanguage !== state.language) {
      dispatch({ type: "SET_LANGUAGE", language: initialLanguage });
    }
  }, [initialLanguage, state.language]);

  const setLanguage = useCallback((lang: BroadcastLanguage) => {
    dispatch({ type: "SET_LANGUAGE", language: lang });
    if (typeof window !== "undefined") {
      fetch(`/api/broadcast/feed?lang=${lang}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.queue && data.queue.length > 0) {
            dispatch({
              type: "SET_QUEUE",
              queue: data.queue,
              breaking: data.breaking,
            });
          }
        })
        .catch(() => {});
    }
  }, []);

  const setCategory = useCallback(
    (category: string) => dispatch({ type: "SET_CATEGORY", category }),
    []
  );

  const setSelectedArticle = useCallback(
    (article: BroadcastSegment | null) => dispatch({ type: "SET_SELECTED_ARTICLE", article }),
    []
  );

  const nextSegment = useCallback(() => dispatch({ type: "NEXT_SEGMENT" }), []);

  const interruptBreaking = useCallback(
    (segment: BroadcastSegment) =>
      dispatch({ type: "INTERRUPT_BREAKING", segment }),
    []
  );

  const setMuted = useCallback(
    (muted: boolean) => {
      try {
        if (!muted) {
          localStorage.setItem(AUDIO_CONSENT_KEY, "1");
        } else {
          localStorage.setItem(AUDIO_CONSENT_KEY, "0");
        }
      } catch {}
      speechController.setMuted(muted);
      dispatch({ type: "SET_MUTED", isMuted: muted });
    },
    []
  );

  const toggleMute = useCallback(() => {
    setMuted(!state.isMuted);
  }, [state.isMuted, setMuted]);

  const setPlaying = useCallback(
    (playing: boolean) => {
      if (!playing) {
        speechController.pause();
      } else {
        speechController.resume();
      }
      dispatch({ type: "SET_PLAYING", isPlaying: playing });
    },
    []
  );

  const togglePlay = useCallback(() => {
    setPlaying(!state.isPlaying);
  }, [state.isPlaying, setPlaying]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as unknown as { __JD_DISPATCH_BROADCAST__?: unknown }).__JD_DISPATCH_BROADCAST__ = dispatch;
    }
  }, [dispatch]);

  return (
    <BroadcastContext.Provider
      value={{
        state,
        dispatch,
        setLanguage,
        setCategory,
        setSelectedArticle,
        nextSegment,
        interruptBreaking,
        togglePlay,
        toggleMute,
        setPlaying,
        setMuted,
      }}
    >
      {children}
    </BroadcastContext.Provider>
  );
}

export function useBroadcast(): BroadcastContextValue {
  const ctx = useContext(BroadcastContext);
  if (!ctx) throw new Error("useBroadcast must be used inside BroadcastProvider");
  return ctx;
}
