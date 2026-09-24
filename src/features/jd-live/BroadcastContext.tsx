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

function buildCountdownQueue(
  rawQueue: BroadcastSegment[],
  lang: BroadcastLanguage
): BroadcastSegment[] {
  if (!rawQueue || rawQueue.length === 0) return [];

  // Top 10 stories
  const topSlice = rawQueue.slice(0, 10);
  const total = topSlice.length;

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
    imageUrl: topSlice[0]?.imageUrl || "/jd-live/master-studio.jpg",
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

  // Order countdown: 10 down to 1
  // Rank 10 is the 10th story, Rank 1 is the lead/top story
  const countdownItems = topSlice
    .map((seg, idx) => ({
      ...seg,
      countdownRank: total - idx,
    }))
    .reverse();

  return [introSegment, ...countdownItems];
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
};

function broadcastReducer(
  state: BroadcastState,
  action: BroadcastAction
): BroadcastState {
  switch (action.type) {
    case "SET_QUEUE": {
      const breaking = action.breaking;
      const fullQueue = buildCountdownQueue(action.queue, state.language);
      if (fullQueue.length === 0) {
        return {
          ...state,
          status: "idle",
          queue: [],
          breakingQueue: breaking,
          currentSegment: null,
        };
      }

      // If breaking news exists on load, prioritize it, else start at intro
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
      };
    }
    case "SET_LANGUAGE": {
      const updatedQueue = buildCountdownQueue(state.queue, action.language);
      const curr = updatedQueue[state.currentIndex] || updatedQueue[0] || null;
      return {
        ...state,
        language: action.language,
        queue: updatedQueue,
        currentSegment: curr,
        scriptReady: false,
        audioReady: false,
      };
    }
    case "SET_MODE":
      return { ...state, mode: action.mode };
    case "SET_STATUS":
      return { ...state, status: action.status };
    case "NEXT_SEGMENT": {
      if (state.queue.length === 0) return state;
      // If we were in breaking mode, return to the live program at current index
      if (state.mode === "breaking") {
        const returnIndex = Math.max(0, state.currentIndex);
        const returnSeg = state.queue[returnIndex];
        return {
          ...state,
          currentIndex: returnIndex,
          currentSegment: returnSeg,
          countdownRank: returnSeg?.countdownRank || 10,
          isIntro: !!returnSeg?.isIntro,
          mode: returnSeg?.isIntro ? "intro" : "normal",
          status: "loading",
          scriptReady: !!returnSeg?.script,
          audioReady: false,
        };
      }
      const nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.queue.length) {
        // Loop back to intro (index 0) or countdown start
        const loopSeg = state.queue[0];
        return {
          ...state,
          currentIndex: 0,
          currentSegment: loopSeg,
          countdownRank: loopSeg.countdownRank || 10,
          isIntro: !!loopSeg.isIntro,
          mode: "intro",
          status: "loading",
          scriptReady: !!loopSeg.script,
          audioReady: false,
        };
      }
      const seg = state.queue[nextIndex];
      return {
        ...state,
        currentIndex: nextIndex,
        currentSegment: seg,
        countdownRank: seg.countdownRank || 10,
        isIntro: !!seg.isIntro,
        mode: seg.isIntro ? "intro" : "normal",
        status: "loading",
        scriptReady: !!seg.script,
        audioReady: false,
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

  const togglePlay = useCallback(() => dispatch({ type: "TOGGLE_PLAY" }), []);

  const toggleMute = useCallback(() => dispatch({ type: "TOGGLE_MUTE" }), []);

  const setPlaying = useCallback(
    (playing: boolean) => dispatch({ type: "SET_PLAYING", isPlaying: playing }),
    []
  );

  const setMuted = useCallback(
    (muted: boolean) => dispatch({ type: "SET_MUTED", isMuted: muted }),
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
