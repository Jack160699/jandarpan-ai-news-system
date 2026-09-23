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

const initialState: BroadcastState = {
  status: "initializing",
  mode: "intro",
  language: "hi",
  currentSegment: null,
  currentIndex: -1,
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
      const queue = action.queue;
      const breaking = action.breaking;
      if (queue.length === 0) return { ...state, status: "idle", queue: [], breakingQueue: breaking };
      // Start with breaking story if present, else first in queue
      const startWithBreaking = breaking.length > 0;
      const first = startWithBreaking ? breaking[0] : queue[0];
      return {
        ...state,
        queue,
        breakingQueue: breaking,
        currentSegment: first,
        currentIndex: startWithBreaking ? -1 : 0,
        mode: startWithBreaking ? "breaking" : "intro",
        status: "loading",
        scriptReady: false,
        audioReady: false,
      };
    }
    case "SET_LANGUAGE":
      return { ...state, language: action.language, scriptReady: false, audioReady: false };
    case "SET_MODE":
      return { ...state, mode: action.mode };
    case "SET_STATUS":
      return { ...state, status: action.status };
    case "NEXT_SEGMENT": {
      const nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.queue.length) {
        // Loop back to start
        return {
          ...state,
          currentIndex: 0,
          currentSegment: state.queue[0] ?? null,
          mode: "transition",
          status: "loading",
          scriptReady: false,
          audioReady: false,
        };
      }
      return {
        ...state,
        currentIndex: nextIndex,
        currentSegment: state.queue[nextIndex],
        mode: nextIndex === 0 ? "intro" : "transition",
        status: "loading",
        scriptReady: false,
        audioReady: false,
      };
    }
    case "INTERRUPT_BREAKING":
      return {
        ...state,
        currentSegment: action.segment,
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
