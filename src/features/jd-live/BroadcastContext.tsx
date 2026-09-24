"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useReducer,
  type ReactNode,
} from "react";
import type {
  BroadcastAction,
  BroadcastLanguage,
  BroadcastSegment,
  BroadcastState,
} from "./types";

function buildBroadcastQueue(
  rawQueue: BroadcastSegment[],
  lang: BroadcastLanguage
): BroadcastSegment[] {
  if (!rawQueue || rawQueue.length === 0) return [];

  // Intro segment
  const introSegment: BroadcastSegment = {
    id: "jd-live-intro",
    slug: "",
    headline:
      lang === "hi"
        ? "जन दर्पण LIVE: आज छत्तीसगढ़ की 10 बड़ी खबरें"
        : "Jan Darpan Live: Top 10 Stories from Chhattisgarh",
    headlineHi: "जन दर्पण LIVE: आज छत्तीसगढ़ की 10 बड़ी खबरें",
    summary:
      lang === "hi"
        ? "नमस्कार, आप देख रहे हैं जन दर्पण लाइव। आइए जानते हैं आज छत्तीसगढ़ की 10 बड़ी खबरें।"
        : "Hello, you’re watching Jan Darpan Live. Here are the top 10 stories from Chhattisgarh today.",
    summaryHi:
      "नमस्कार, आप देख रहे हैं जन दर्पण लाइव। आइए जानते हैं आज छत्तीसगढ़ की 10 बड़ी खबरें।",
    script:
      lang === "hi"
        ? "नमस्कार, आप देख रहे हैं जन दर्पण लाइव। आइए जानते हैं आज छत्तीसगढ़ की 10 बड़ी खबरें।"
        : "Hello, you’re watching Jan Darpan Live. Here are the top 10 stories from Chhattisgarh today.",
    imageUrl: rawQueue[0]?.imageUrl || "/jd-live/master-studio.jpg",
    categoryLabel: lang === "hi" ? "लाइव बुलेटिन" : "Live Bulletin",
    categoryLabelHi: "लाइव बुलेटिन",
    district: lang === "hi" ? "छत्तीसगढ़" : "Chhattisgarh",
    districtHi: "छत्तीसगढ़",
    section: "lead",
    isBreaking: false,
    isLive: true,
    priorityScore: 100,
    publishedAt: new Date().toISOString(),
    durationSec: 6,
    isIntro: true,
  };

  // The first 10 stories form the Top 10 Countdown (10 down to 1)
  const top10Count = Math.min(10, rawQueue.length);
  const top10Slice = rawQueue.slice(0, top10Count);
  const countdownItems = top10Slice
    .map((seg, idx) => ({
      ...seg,
      countdownRank: top10Count - idx,
    }))
    .reverse();

  // The remaining 48-hour pool stories continue indefinitely as the live program
  const continuationItems = rawQueue.slice(top10Count).map((seg) => ({
    ...seg,
    countdownRank: undefined,
  }));

  return [introSegment, ...countdownItems, ...continuationItems];
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

const initialState: BroadcastState = {
  status: "initializing",
  mode: "intro",
  language: "hi",
  currentSegment: null,
  currentIndex: 0,
  countdownRank: 10,
  isIntro: true,
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
      const breaking = action.breaking;
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

      // First load initialization
      if (breaking.length > 0) {
        const firstBreaking = breaking[0];
        return {
          ...state,
          queue: fullQueue,
          breakingQueue: breaking,
          currentSegment: firstBreaking,
          currentIndex: -1,
          countdownRank: 0,
          isIntro: false,
          mode: "breaking",
          status: "loading",
          scriptReady: false,
          audioReady: false,
          segmentToken: state.segmentToken + 1,
        };
      }

      const first = fullQueue[0];
      return {
        ...state,
        queue: fullQueue,
        breakingQueue: breaking,
        currentSegment: first,
        currentIndex: 0,
        countdownRank: first.countdownRank || 10,
        isIntro: !!first.isIntro,
        mode: "intro",
        status: "loading",
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
        scriptReady: false,
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

      // Track story as played in this broadcast cycle
      const currentId = state.currentSegment?.id;
      const updatedPlayed = currentId && !state.currentSegment?.isIntro
        ? Array.from(new Set([...state.playedIds, currentId]))
        : state.playedIds;

      // If we were in breaking mode, return to the live program at current index
      if (state.mode === "breaking") {
        const returnIndex = Math.max(0, state.currentIndex);
        const returnSeg = state.queue[returnIndex] || state.queue[0];
        // Track the played breaking story so it doesn't re-interrupt
        const playedBreaking = currentId
          ? Array.from(new Set([...state.playedBreakingIds, currentId]))
          : state.playedBreakingIds;
        return {
          ...state,
          currentIndex: returnIndex,
          currentSegment: returnSeg,
          countdownRank: returnSeg?.countdownRank || 0,
          isIntro: !!returnSeg?.isIntro,
          mode: returnSeg?.isIntro ? "intro" : "normal",
          status: "loading",
          scriptReady: !!returnSeg?.script,
          audioReady: false,
          segmentToken: state.segmentToken + 1,
          playedIds: updatedPlayed,
          playedBreakingIds: playedBreaking,
        };
      }

      const nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.queue.length) {
        // Continuous 48-Hour Loop: Wrap around to the first real story and continue forever!
        const firstStoryIdx = state.queue.findIndex((s) => !s.isIntro);
        const wrapIndex = firstStoryIdx >= 0 ? firstStoryIdx : 0;
        const loopSeg = state.queue[wrapIndex];
        return {
          ...state,
          currentIndex: wrapIndex,
          currentSegment: loopSeg,
          countdownRank: loopSeg?.countdownRank || 0,
          isIntro: !!loopSeg?.isIntro,
          mode: "normal",
          status: "loading",
          scriptReady: !!loopSeg?.script,
          audioReady: false,
          segmentToken: state.segmentToken + 1,
          playedIds: updatedPlayed,
        };
      }

      const seg = state.queue[nextIndex];
      return {
        ...state,
        currentIndex: nextIndex,
        currentSegment: seg,
        countdownRank: seg.countdownRank || 0,
        isIntro: !!seg.isIntro,
        mode: seg.isIntro ? "intro" : "normal",
        status: "loading",
        scriptReady: !!seg.script,
        audioReady: false,
        segmentToken: state.segmentToken + 1,
        playedIds: updatedPlayed,
      };
    }
    case "INTERRUPT_BREAKING":
      return {
        ...state,
        currentSegment: action.segment,
        countdownRank: action.segment.countdownRank || 0,
        isIntro: false,
        mode: "breaking",
        status: "loading",
        scriptReady: false,
        audioReady: false,
        segmentToken: state.segmentToken + 1,
      };
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

const AUDIO_CONSENT_KEY = "jdl_audio_unlocked";

export function BroadcastProvider({
  children,
  initialLanguage = "hi",
}: {
  children: ReactNode;
  initialLanguage?: BroadcastLanguage;
}) {
  const [state, dispatch] = useReducer(broadcastReducer, {
    ...initialState,
    language: initialLanguage,
  });

  // Check saved audio consent on client mount
  React.useEffect(() => {
    try {
      if (typeof window !== "undefined" && localStorage.getItem(AUDIO_CONSENT_KEY) === "1") {
        dispatch({ type: "SET_MUTED", isMuted: false });
      }
    } catch {}
  }, []);

  React.useEffect(() => {
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
      dispatch({ type: "SET_MUTED", isMuted: muted });
    },
    []
  );

  const toggleMute = useCallback(() => {
    setMuted(!state.isMuted);
  }, [state.isMuted, setMuted]);

  const togglePlay = useCallback(() => dispatch({ type: "TOGGLE_PLAY" }), []);

  const setPlaying = useCallback(
    (playing: boolean) => dispatch({ type: "SET_PLAYING", isPlaying: playing }),
    []
  );

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
