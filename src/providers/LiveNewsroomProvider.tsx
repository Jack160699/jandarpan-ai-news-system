"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNewsroomPolling } from "@/hooks/useNewsroomPolling";
import { useRealtimeTrigger } from "@/hooks/useRealtimeTrigger";
import type { GeneratedHomepageFeed } from "@/lib/homepage/types";
import { snapshotFromFeed } from "@/lib/realtime/snapshot-utils";
import { REALTIME_CONFIG } from "@/lib/realtime/config";
import {
  applySnapshotToFeed,
  findNewArticleIds,
  prependWireItems,
  shouldShowUpdateBanner,
} from "@/lib/realtime/merge-feed";
import type { LiveHomepageSnapshot } from "@/lib/realtime/types";
import { localizeGeneratedFeed } from "@/lib/i18n/strict-locale";
import { normalizeAppLanguage } from "@/lib/i18n/safe-language";
import {
  ensureHomepageFeed,
  homeDebug,
  normalizeHomepageFeed,
} from "@/lib/homepage/feed-safety";
import { useLanguageOptional } from "@/providers/LanguageProvider";

type LiveNewsroomContextValue = {
  feed: GeneratedHomepageFeed;
  lastSyncedAt: string;
  freshIds: ReadonlySet<string>;
  hasPendingUpdates: boolean;
  pendingCount: number;
  applyPendingUpdates: () => void;
  dismissPendingUpdates: () => void;
};

const LiveNewsroomContext = createContext<LiveNewsroomContextValue | null>(
  null
);

type LiveNewsroomProviderProps = {
  initialFeed: GeneratedHomepageFeed;
  children: ReactNode;
  /** Disable polling (e.g. admin) */
  enabled?: boolean;
};

export function LiveNewsroomProvider({
  initialFeed,
  children,
  enabled = true,
}: LiveNewsroomProviderProps) {
  const languageCtx = useLanguageOptional();
  const displayLanguage = normalizeAppLanguage(languageCtx?.language) || "en";
  const languageReady = languageCtx?.ready ?? false;
  const contentLocked = languageCtx?.contentLocked ?? true;

  const safeInitial = normalizeHomepageFeed(initialFeed) ?? initialFeed;
  const [feed, setFeed] = useState(safeInitial);
  const [localeReady, setLocaleReady] = useState(false);

  useEffect(() => {
    setLocaleReady(true);
  }, []);

  useEffect(() => {
    const base = normalizeHomepageFeed(initialFeed) ?? initialFeed;
    if (!localeReady || !languageReady || contentLocked) {
      setFeed(base);
      return;
    }
    try {
      const localized = localizeGeneratedFeed(base, displayLanguage);
      const next = ensureHomepageFeed(base, localized);
      homeDebug("LiveNewsroom localize", {
        language: displayLanguage,
        trending: next.trending.length,
      });
      setFeed(next);
    } catch (err) {
      console.error("[LiveNewsroom] localize feed", err);
      setFeed(base);
    }
  }, [
    initialFeed,
    displayLanguage,
    localeReady,
    languageReady,
    contentLocked,
  ]);
  const [lastSyncedAt, setLastSyncedAt] = useState(safeInitial.fetchedAt);
  const [freshIds, setFreshIds] = useState<Set<string>>(() => new Set());
  const [pendingSnapshot, setPendingSnapshot] =
    useState<LiveHomepageSnapshot | null>(null);
  const [hasPendingUpdates, setHasPendingUpdates] = useState(false);
  const versionRef = useRef(snapshotFromFeed(safeInitial).version);

  const markFresh = useCallback((ids: string[]) => {
    if (!ids.length) return;
    setFreshIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
    window.setTimeout(() => {
      setFreshIds((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
    }, 45_000);
  }, []);

  const handleSnapshot = useCallback(
    (snapshot: LiveHomepageSnapshot) => {
      if (snapshot.version === versionRef.current) {
        setLastSyncedAt(snapshot.fetchedAt);
        return;
      }

      versionRef.current = snapshot.version;
      setLastSyncedAt(snapshot.fetchedAt);

      setFeed((current) => {
        const wireMerge = prependWireItems(
          current.liveWire,
          snapshot.liveWire,
          REALTIME_CONFIG.maxSilentWireInserts
        );
        const tickerNew = findNewArticleIds(
          current.breakingTicker,
          snapshot.breakingTicker
        );

        markFresh([...wireMerge.newIds, ...tickerNew]);

        document.documentElement.setAttribute("data-live-ticker-pulse", "1");
        window.setTimeout(() => {
          document.documentElement.removeAttribute("data-live-ticker-pulse");
        }, 600);

        if (shouldShowUpdateBanner(current, snapshot)) {
          queueMicrotask(() => {
            setPendingSnapshot(snapshot);
            setHasPendingUpdates(true);
          });
        }

        return {
          ...current,
          breakingTicker: snapshot.breakingTicker,
          liveWire: wireMerge.merged,
          localBreakingAlerts: snapshot.localBreakingAlerts,
          fetchedAt: snapshot.fetchedAt,
        };
      });
    },
    [markFresh]
  );

  const { triggerPoll, isSyncing } = useNewsroomPolling({
    enabled,
    onSnapshot: handleSnapshot,
    onError: (code) => {
      console.warn("[LiveNewsroom] background sync failed:", code);
    },
  });

  useEffect(() => {
    if (isSyncing) {
      document.documentElement.setAttribute("data-live-syncing", "1");
    } else {
      document.documentElement.removeAttribute("data-live-syncing");
    }
    return () => {
      document.documentElement.removeAttribute("data-live-syncing");
    };
  }, [isSyncing]);

  useRealtimeTrigger(triggerPoll, enabled);

  const pendingCount = useMemo(() => {
    if (!pendingSnapshot) return 0;
    return findNewArticleIds(feed.trending, pendingSnapshot.trending).length;
  }, [feed.trending, pendingSnapshot]);

  const applyPendingUpdates = useCallback(() => {
    if (!pendingSnapshot) return;
    setFeed((current) => applySnapshotToFeed(current, pendingSnapshot));
    setPendingSnapshot(null);
    setHasPendingUpdates(false);
    versionRef.current = pendingSnapshot.version;
  }, [pendingSnapshot]);

  const dismissPendingUpdates = useCallback(() => {
    setPendingSnapshot(null);
    setHasPendingUpdates(false);
  }, []);

  const value = useMemo(
    () => ({
      feed,
      lastSyncedAt,
      freshIds,
      hasPendingUpdates,
      pendingCount,
      applyPendingUpdates,
      dismissPendingUpdates,
    }),
    [
      feed,
      lastSyncedAt,
      freshIds,
      hasPendingUpdates,
      pendingCount,
      applyPendingUpdates,
      dismissPendingUpdates,
    ]
  );

  return (
    <LiveNewsroomContext.Provider value={value}>
      {children}
    </LiveNewsroomContext.Provider>
  );
}

export function useLiveNewsroom(): LiveNewsroomContextValue {
  const ctx = useContext(LiveNewsroomContext);
  if (!ctx) {
    throw new Error("useLiveNewsroom must be used within LiveNewsroomProvider");
  }
  return ctx;
}

export function useLiveNewsroomOptional(): LiveNewsroomContextValue | null {
  return useContext(LiveNewsroomContext);
}
