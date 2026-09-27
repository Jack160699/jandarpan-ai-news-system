"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
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
import { DURG_SOLAR_AD_SEGMENT } from "./lib/ad-segment";
import {
  computeCanonicalQueue,
  selectNextPlayableStory,
} from "./lib/queue-engine";

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
const STORAGE_KEY = "jd_consumed_stories_v1";
const BROADCAST_CHANNEL_NAME = "jd_consumption_channel";

function loadLocalConsumedSet(): Set<string> {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      const set = new Set<string>();
      for (const [id, rec] of Object.entries(parsed)) {
        if ((rec as any)?.consumed) set.add(id);
      }
      return set;
    }
  } catch {}
  return new Set<string>();
}

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
  consecutiveNewsCount: 0,
  rawPool: [],
  activeStoryId: null,
  consumedIds: new Set<string>(),
};

function broadcastReducer(
  state: BroadcastState,
  action: BroadcastAction
): BroadcastState {
  switch (action.type) {
    case "SET_CONSUMED_IDS": {
      const nextConsumed = new Set(action.consumedIds);
      const { queue } = computeCanonicalQueue({
        rawStories: state.rawPool,
        categoryId: state.selectedCategory,
        consumedIds: nextConsumed,
      });

      // Maintain active story stability (Requirement #11, #12)
      let curr = state.currentSegment;
      let activeId = state.activeStoryId;

      if (curr && activeId) {
        const found = queue.find((s) => s.id === activeId);
        if (found) curr = found;
      } else if (queue.length > 0) {
        curr = selectNextPlayableStory({ queue, consumedIds: nextConsumed });
        activeId = curr?.id || null;
      }

      return {
        ...state,
        consumedIds: nextConsumed,
        queue,
        currentSegment: curr,
        activeStoryId: activeId,
        currentIndex: curr ? Math.max(0, queue.findIndex((s) => s.id === curr.id)) : 0,
      };
    }

    case "MARK_CONSUMED": {
      const nextConsumed = new Set(state.consumedIds);
      nextConsumed.add(action.storyId);

      const { queue } = computeCanonicalQueue({
        rawStories: state.rawPool,
        categoryId: state.selectedCategory,
        consumedIds: nextConsumed,
      });

      // Active story remains active during playback consumption; queue reorders smoothly underneath
      let curr = state.currentSegment;
      let activeId = state.activeStoryId;
      if (curr && activeId) {
        const found = queue.find((s) => s.id === activeId);
        if (found) curr = found;
      }

      return {
        ...state,
        consumedIds: nextConsumed,
        queue,
        currentSegment: curr,
        activeStoryId: activeId,
        currentIndex: curr ? Math.max(0, queue.findIndex((s) => s.id === curr.id)) : 0,
      };
    }

    case "SELECT_STORY": {
      const seg = action.story;
      const segIdx = state.queue.findIndex((s) => s.id === seg.id);
      return {
        ...state,
        currentSegment: seg,
        activeStoryId: seg.id,
        currentIndex: segIdx >= 0 ? segIdx : 0,
        mode: seg.isBreaking ? "breaking" : "normal",
        status: "playing",
        scriptReady: !!seg.script,
        audioReady: false,
        segmentToken: state.segmentToken + 1,
      };
    }

    case "SET_QUEUE": {
      const breaking = action.breaking ? buildBroadcastQueue(action.breaking, state.language) : [];
      const incomingRaw = buildBroadcastQueue(action.queue, state.language);
      if (incomingRaw.length === 0 && state.rawPool.length === 0) {
        return {
          ...state,
          queue: [],
          rawPool: [],
          breakingQueue: breaking,
        };
      }

      // Merge incoming stories into rawPool (enriching or adding new ones)
      const existingMap = new Map<string, BroadcastSegment>();
      for (const s of state.rawPool) {
        existingMap.set(s.id, s);
      }
      for (const s of incomingRaw) {
        existingMap.set(s.id, s);
      }
      const mergedRawPool = Array.from(existingMap.values());

      // Authoritative Canonical Queue computation
      const { queue } = computeCanonicalQueue({
        rawStories: mergedRawPool,
        categoryId: state.selectedCategory,
        consumedIds: state.consumedIds,
      });

      // FEED REFRESH SAFETY (Requirements #11, #12, #14):
      // If a story is currently active, FEED UPDATES MUST NOT OVERWRITE OR REPLACE IT.
      if (state.activeStoryId && state.currentSegment) {
        const foundInQueue = queue.find((s) => s.id === state.activeStoryId);
        const retainedSegment = foundInQueue || state.currentSegment;
        const currentIdx = queue.findIndex((s) => s.id === retainedSegment.id);

        let nextSelectedArticle = state.selectedArticle;
        if (state.selectedArticle) {
          const foundArt = queue.find(
            (s) => s.id === state.selectedArticle?.id || s.slug === state.selectedArticle?.slug
          );
          if (foundArt) nextSelectedArticle = foundArt;
        }

        return {
          ...state,
          rawPool: mergedRawPool,
          queue,
          breakingQueue: breaking,
          currentSegment: retainedSegment,
          activeStoryId: retainedSegment.id,
          currentIndex: currentIdx >= 0 ? currentIdx : 0,
          selectedArticle: nextSelectedArticle,
          lastFeedRefresh: Date.now(),
        };
      }

      // First load initialization: select first eligible story from canonical queue
      const first =
        selectNextPlayableStory({ queue, consumedIds: state.consumedIds }) ||
        queue[0] ||
        null;

      return {
        ...state,
        rawPool: mergedRawPool,
        queue,
        breakingQueue: breaking,
        currentSegment: first,
        activeStoryId: first ? first.id : null,
        currentIndex: 0,
        countdownRank: 0,
        isIntro: false,
        mode: first?.isBreaking ? "breaking" : "normal",
        status: first ? "playing" : state.status,
        scriptReady: !!first?.script,
        audioReady: false,
        segmentToken: state.segmentToken + 1,
        lastFeedRefresh: Date.now(),
      };
    }

    case "SET_LANGUAGE": {
      const updatedRaw = buildBroadcastQueue(state.rawPool, action.language);
      const { queue } = computeCanonicalQueue({
        rawStories: updatedRaw,
        categoryId: state.selectedCategory,
        consumedIds: state.consumedIds,
      });

      let curr = state.currentSegment;
      if (state.activeStoryId) {
        curr = queue.find((s) => s.id === state.activeStoryId) || curr;
      }

      let updatedSelectedArticle = state.selectedArticle;
      if (state.selectedArticle) {
        const found = queue.find(
          (s) => s.id === state.selectedArticle?.id || s.slug === state.selectedArticle?.slug
        );
        if (found) {
          updatedSelectedArticle = found;
        }
      }

      return {
        ...state,
        language: action.language,
        rawPool: updatedRaw,
        queue,
        currentSegment: curr,
        activeStoryId: curr?.id || null,
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
      if (state.queue.length === 0 && state.rawPool.length === 0) return state;

      const currentId = state.currentSegment?.id;
      const wasAd = Boolean(state.currentSegment?.isAd);

      // Record consumption for finished story (Requirement #9, #10)
      const nextConsumed = new Set(state.consumedIds);
      if (currentId && !wasAd && !state.currentSegment?.isIntro) {
        nextConsumed.add(currentId);
      }

      const updatedPlayed = currentId && !wasAd
        ? Array.from(new Set([...state.playedIds, currentId]))
        : state.playedIds;

      const currentNewsCount = state.consecutiveNewsCount ?? 0;
      const nextNewsCount = wasAd ? 0 : currentNewsCount + 1;

      // Recompute canonical queue with latest consumption
      const { queue } = computeCanonicalQueue({
        rawStories: state.rawPool,
        categoryId: state.selectedCategory,
        consumedIds: nextConsumed,
      });

      // Commercial Ad rule: exactly after every 3 news stories (Requirement #38, #59)
      if (!wasAd && nextNewsCount >= 3) {
        return {
          ...state,
          currentSegment: DURG_SOLAR_AD_SEGMENT,
          activeStoryId: DURG_SOLAR_AD_SEGMENT.id,
          countdownRank: 0,
          isIntro: false,
          mode: "normal",
          status: "playing",
          scriptReady: !!DURG_SOLAR_AD_SEGMENT.script,
          audioReady: false,
          segmentToken: state.segmentToken + 1,
          playedIds: updatedPlayed,
          consumedIds: nextConsumed,
          queue,
          consecutiveNewsCount: 0,
        };
      }

      // If returning from breaking story
      if (state.mode === "breaking") {
        const nextSeg =
          selectNextPlayableStory({
            queue,
            consumedIds: nextConsumed,
            activeStoryId: currentId,
          }) || queue[0];

        const playedBreaking = currentId
          ? Array.from(new Set([...state.playedBreakingIds, currentId]))
          : state.playedBreakingIds;

        return {
          ...state,
          currentIndex: queue.findIndex((s) => s.id === nextSeg?.id),
          currentSegment: nextSeg,
          activeStoryId: nextSeg?.id || null,
          preBreakingIndex: undefined,
          countdownRank: 0,
          isIntro: false,
          mode: nextSeg?.isBreaking ? "breaking" : "normal",
          status: "playing",
          scriptReady: !!nextSeg?.script,
          audioReady: false,
          segmentToken: state.segmentToken + 1,
          playedIds: updatedPlayed,
          playedBreakingIds: playedBreaking,
          consumedIds: nextConsumed,
          queue,
          consecutiveNewsCount: nextNewsCount,
        };
      }

      // Authoritative advancement: select first eligible unconsumed story != currentId
      // NEVER uses currentIndex + 1
      const seg =
        selectNextPlayableStory({
          queue,
          consumedIds: nextConsumed,
          activeStoryId: currentId,
        }) || queue[0];

      return {
        ...state,
        currentIndex: seg ? queue.findIndex((s) => s.id === seg.id) : 0,
        currentSegment: seg,
        activeStoryId: seg?.id || null,
        countdownRank: 0,
        isIntro: false,
        mode: seg?.isBreaking ? "breaking" : "normal",
        status: "playing",
        scriptReady: !!seg?.script,
        audioReady: false,
        segmentToken: state.segmentToken + 1,
        playedIds: updatedPlayed,
        consumedIds: nextConsumed,
        queue,
        consecutiveNewsCount: nextNewsCount,
      };
    }

    case "SET_CATEGORY": {
      const category = action.category;
      const { queue } = computeCanonicalQueue({
        rawStories: state.rawPool,
        categoryId: category,
        consumedIds: state.consumedIds,
      });

      // If currently playing story already matches this category, keep it!
      if (state.currentSegment && matchesCanonicalCategory(state.currentSegment, category)) {
        return {
          ...state,
          selectedCategory: category,
          queue,
          currentIndex: Math.max(0, queue.findIndex((s) => s.id === state.currentSegment?.id)),
        };
      }

      // Otherwise switch TV playback to the first unconsumed matching segment
      const nextSeg =
        selectNextPlayableStory({ queue, consumedIds: state.consumedIds }) ||
        queue[0] ||
        null;
      const nextIdx = nextSeg ? queue.findIndex((s) => s.id === nextSeg.id) : 0;

      return {
        ...state,
        selectedCategory: category,
        queue,
        currentSegment: nextSeg,
        activeStoryId: nextSeg?.id || null,
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

    case "PLAY_AD": {
      const savedIndex =
        state.mode !== "breaking"
          ? state.currentIndex
          : (state.preBreakingIndex ?? state.currentIndex);
      return {
        ...state,
        currentSegment: DURG_SOLAR_AD_SEGMENT,
        activeStoryId: DURG_SOLAR_AD_SEGMENT.id,
        preBreakingIndex: savedIndex,
        countdownRank: 0,
        isIntro: false,
        mode: "normal",
        status: "playing",
        scriptReady: !!DURG_SOLAR_AD_SEGMENT.script,
        audioReady: false,
        segmentToken: state.segmentToken + 1,
        consecutiveNewsCount: 0,
      };
    }

    case "INTERRUPT_BREAKING": {
      const savedIndex =
        state.mode !== "breaking"
          ? state.currentIndex
          : (state.preBreakingIndex ?? state.currentIndex);
      const segIdx = state.queue.findIndex((s) => s.id === action.segment.id);
      return {
        ...state,
        currentSegment: action.segment,
        activeStoryId: action.segment.id,
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
  selectStory: (story: BroadcastSegment) => void;
  markConsumed: (storyId: string) => void;
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
      const fullQueue =
        initialQueue && initialQueue.length > 0
          ? buildBroadcastQueue(initialQueue, initialLanguage)
          : [];
      const initialConsumed = loadLocalConsumedSet();
      const canonical = computeCanonicalQueue({
        rawStories: fullQueue,
        categoryId: "all",
        consumedIds: initialConsumed,
      });

      const first =
        selectNextPlayableStory({ queue: canonical.queue, consumedIds: initialConsumed }) ||
        canonical.queue[0] ||
        null;

      return {
        ...initialState,
        language: initialLanguage,
        rawPool: fullQueue,
        queue: canonical.queue,
        currentSegment: first,
        activeStoryId: first?.id || null,
        currentIndex: 0,
        countdownRank: 0,
        isIntro: false,
        status: (first ? "playing" : "initializing") as BroadcastState["status"],
        mode: (first?.isBreaking ? "breaking" : "normal") as BroadcastState["mode"],
        scriptReady: !!first?.script,
        segmentToken: 1,
        selectedCategory: "all",
        selectedArticle: null,
        consumedIds: initialConsumed,
      };
    }
  );

  // Sync multi-tab consumption events via BroadcastChannel & localStorage
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      if ("BroadcastChannel" in window) {
        const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        broadcastChannelRef.current = bc;
        bc.onmessage = (event) => {
          if (event.data?.type === "STORY_CONSUMED" && event.data?.storyId) {
            dispatch({ type: "MARK_CONSUMED", storyId: event.data.storyId });
          }
        };
      }
    } catch {}

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          const nextSet = new Set<string>();
          for (const [id, rec] of Object.entries(parsed)) {
            if ((rec as any)?.consumed) nextSet.add(id);
          }
          dispatch({ type: "SET_CONSUMED_IDS", consumedIds: nextSet });
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
    };
  }, []);

  // Attempt unmuted audio playback on client mount by default
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        if (localStorage.getItem(AUDIO_CONSENT_KEY) === "0") {
          speechController.setMuted(true);
          dispatch({ type: "SET_MUTED", isMuted: true });
        } else {
          speechController.setMuted(false);
          dispatch({ type: "SET_MUTED", isMuted: false });
        }
      }
    } catch {}
  }, []);

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

  useEffect(() => {
    if (initialLanguage && initialLanguage !== state.language) {
      setLanguage(initialLanguage);
    }
  }, [initialLanguage, state.language, setLanguage]);

  const setCategory = useCallback(
    (category: string) => dispatch({ type: "SET_CATEGORY", category }),
    []
  );

  const setSelectedArticle = useCallback(
    (article: BroadcastSegment | null) =>
      dispatch({ type: "SET_SELECTED_ARTICLE", article }),
    []
  );

  const nextSegment = useCallback(() => dispatch({ type: "NEXT_SEGMENT" }), []);

  const selectStory = useCallback(
    (story: BroadcastSegment) => dispatch({ type: "SELECT_STORY", story }),
    []
  );

  const markConsumed = useCallback(
    (storyId: string) => dispatch({ type: "MARK_CONSUMED", storyId }),
    []
  );

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
      (window as unknown as { __JD_DISPATCH_BROADCAST__?: unknown }).__JD_DISPATCH_BROADCAST__ =
        dispatch;
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
        selectStory,
        markConsumed,
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
