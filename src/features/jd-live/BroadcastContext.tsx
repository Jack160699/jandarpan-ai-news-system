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

function buildBroadcastQueue(
  rawQueue: BroadcastSegment[],
  lang: BroadcastLanguage
): BroadcastSegment[] {
  if (!rawQueue || rawQueue.length === 0) return [];

  // Filter out any stale intro placeholders and ensure each real story has an anchor script
  const realStories = rawQueue.filter((s) => s.id !== "jd-live-intro" && !s.isIntro);

  return realStories.map((seg) => {
    const headline = lang === "hi" ? (seg.headlineHi || seg.headline) : seg.headline;
    const summary = lang === "hi" ? (seg.summaryHi || seg.summary) : seg.summary;
    const district = lang === "hi" ? (seg.districtHi || seg.district) : seg.district;

    let script = seg.script;
    let durationSec = seg.durationSec || 12;

    if (!script || script.includes("नंबर ") || script.includes("Story number") || script.includes("10 बड़ी खबरें")) {
      const generated = generateAnchorSpokenScript({
        headline,
        summary,
        district,
        section: seg.section,
        categoryLabel: seg.categoryLabel,
        isBreaking: seg.isBreaking,
        language: lang,
      });
      script = generated.script;
      durationSec = generated.durationSec;
    }

    return {
      ...seg,
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
  isMuted: true,
  audioBlocked: false,
  playedIds: [],
  playedBreakingIds: [],
  sessionSeed: getSafeSessionSeed(),
  segmentToken: 1,
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
        return {
          ...state,
          queue: fullQueue,
          breakingQueue: breaking,
          currentIndex: nextIdx,
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
      return {
        ...state,
        language: action.language,
        queue: updatedQueue,
        currentSegment: curr,
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

      // If returning from breaking story
      if (state.mode === "breaking") {
        const returnIndex = typeof state.preBreakingIndex === "number"
          ? (state.preBreakingIndex + 1) % Math.max(1, state.queue.length)
          : (state.currentIndex + 1) % Math.max(1, state.queue.length);
        const returnSeg = state.queue[returnIndex] || state.queue[0];
        const playedBreaking = currentId
          ? Array.from(new Set([...state.playedBreakingIds, currentId]))
          : state.playedBreakingIds;

        return {
          ...state,
          currentIndex: returnIndex,
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

      const nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.queue.length) {
        // Continuous 48-Hour Loop: Prefer unplayed stories first
        const unplayedIdx = state.queue.findIndex(
          (s) => !updatedPlayed.includes(s.id)
        );
        const wrapIndex = unplayedIdx >= 0 ? unplayedIdx : 0;
        const loopSeg = state.queue[wrapIndex];
        const nextPlayed = unplayedIdx >= 0 ? updatedPlayed : [];

        return {
          ...state,
          currentIndex: wrapIndex,
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

      const seg = state.queue[nextIndex];
      return {
        ...state,
        currentIndex: nextIndex,
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
      };
    }
  );

  // Check saved audio consent on client mount
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && localStorage.getItem(AUDIO_CONSENT_KEY) === "1") {
        speechController.setMuted(false);
        dispatch({ type: "SET_MUTED", isMuted: false });
      } else {
        speechController.setMuted(true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (initialLanguage && initialLanguage !== state.language) {
      dispatch({ type: "SET_LANGUAGE", language: initialLanguage });
    }
  }, [initialLanguage, state.language]);

  const setLanguage = useCallback(
    (lang: BroadcastLanguage) => dispatch({ type: "SET_LANGUAGE", language: lang }),
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
          localStorage.removeItem(AUDIO_CONSENT_KEY);
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
