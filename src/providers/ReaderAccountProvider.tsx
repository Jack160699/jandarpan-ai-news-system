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
import type { User } from "@supabase/supabase-js";
import { useSupabase } from "@/hooks/useSupabase";
import { FEED_INTERESTS, normalizeFeedInterests } from "@/lib/personalization/interests";
import { loadPreferences, savePreferences } from "@/lib/reader-preferences";
import { loadReadingMemory, getRecentReadSlugs } from "@/lib/reading-memory";
import {
  syncInterestsCookie,
  syncRecentReadsCookie,
} from "@/lib/personalization/cookies";
import { buildReaderOAuthRedirectTo } from "@/lib/auth/reader-return-url";
import {
  applyCustomDisplayName,
  extractProviderIdentity,
  loadLocalEditableProfile,
  mergeProviderIntoProfile,
  saveLocalEditableProfile,
  type ReaderEditableProfile,
} from "@/lib/auth/reader-profile";
import {
  districtPayloadForRemoteSync,
  reconcileDistrictAfterLogin,
} from "@/lib/auth/district-sync";
import {
  fetchOwnReaderProfile,
  rowToEditable,
  updateOwnReaderProfile,
  upsertReaderProfileOnLogin,
} from "@/lib/auth/reader-profile-remote";

const ACCOUNT_KEY = "cgb-reader-account";
const STREAK_KEY = "cgb-reader-streak";

const DEFAULT_INTERESTS = normalizeFeedInterests(undefined);

type GuestProfile = {
  displayName: string;
  streakDays: number;
  lastVisit: string;
};

export type ReaderSyncStatusKey =
  | "accountCard.syncOnDevice"
  | "accountCard.syncSynced"
  | "accountCard.syncPending";

type ReaderAccountContextValue = {
  mounted: boolean;
  user: User | null;
  isLoggedIn: boolean;
  loading: boolean;
  displayName: string;
  avatarInitial: string;
  avatarUrl: string | null;
  email: string | null;
  syncStatus: ReaderSyncStatusKey | null;
  authError: string | null;
  isPremium: boolean;
  streakDays: number;
  savedCount: number;
  interests: string[];
  toggleInterest: (id: string) => void;
  setInterests: (ids: string[]) => void;
  signInWithGoogle: (returnTo?: string | null) => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  updateDisplayName: (name: string) => Promise<{ ok: boolean; error?: string }>;
  clearAuthError: () => void;
};

const ReaderAccountContext = createContext<ReaderAccountContextValue | null>(
  null
);

const DEFAULT_VALUE: ReaderAccountContextValue = {
  mounted: false,
  user: null,
  isLoggedIn: false,
  loading: false,
  displayName: "Guest Reader",
  avatarInitial: "R",
  avatarUrl: null,
  email: null,
  syncStatus: null,
  authError: null,
  isPremium: false,
  streakDays: 1,
  savedCount: 0,
  interests: DEFAULT_INTERESTS,
  toggleInterest: () => {},
  setInterests: () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
  continueAsGuest: () => {},
  updateDisplayName: async () => ({ ok: false, error: "unavailable" }),
  clearAuthError: () => {},
};

function loadGuest(): GuestProfile {
  if (typeof window === "undefined") {
    return { displayName: "Guest Reader", streakDays: 1, lastVisit: "" };
  }
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    const streakRaw = localStorage.getItem(STREAK_KEY);
    const today = new Date().toDateString();
    let streak = 1;
    if (streakRaw) {
      const parsed = JSON.parse(streakRaw) as { days: number; last: string };
      if (parsed.last === today) streak = parsed.days;
      else if (parsed.last) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        streak =
          parsed.last === yesterday.toDateString() ? parsed.days + 1 : 1;
      }
      localStorage.setItem(
        STREAK_KEY,
        JSON.stringify({ days: streak, last: today })
      );
    } else {
      localStorage.setItem(
        STREAK_KEY,
        JSON.stringify({ days: 1, last: today })
      );
    }
    const base = raw
      ? (JSON.parse(raw) as GuestProfile)
      : { displayName: "Guest Reader", streakDays: streak, lastVisit: today };
    return { ...base, streakDays: streak, lastVisit: today };
  } catch {
    return { displayName: "Guest Reader", streakDays: 1, lastVisit: "" };
  }
}

function readAuthErrorFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const code = params.get("authError");
  if (!code) return null;
  switch (code) {
    case "denied":
      return "Google sign-in was cancelled or denied.";
    case "missing_code":
      return "Sign-in did not complete. Please try again.";
    case "exchange_failed":
      return "Could not complete sign-in. Please try again.";
    case "not_configured":
      return "Sign-in is not configured on this environment.";
    case "expired":
      return "Your session expired. Please sign in again.";
    default:
      return "Sign-in failed. Please try again.";
  }
}

export function ReaderAccountProvider({ children }: { children: ReactNode }) {
  const { user, client, loading: authLoading, configured, session } = useSupabase();
  const [mounted, setMounted] = useState(false);
  const [guest, setGuest] = useState<GuestProfile | null>(null);
  const [editable, setEditable] = useState<ReaderEditableProfile | null>(null);
  const [interests, setInterestsState] = useState<string[]>(DEFAULT_INTERESTS);
  const [savedCount, setSavedCount] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<ReaderSyncStatusKey | null>(null);
  const [profileSyncDoneFor, setProfileSyncDoneFor] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setGuest(loadGuest());
    setEditable(loadLocalEditableProfile());
    setAuthError(readAuthErrorFromUrl());
    try {
      const prefs = loadPreferences();
      setInterestsState(normalizeFeedInterests(prefs.feedInterests));
      setSavedCount(loadReadingMemory().bookmarks.length);
      syncRecentReadsCookie(getRecentReadSlugs(loadReadingMemory()));
    } catch {
      /* ignore storage errors */
    }
  }, []);

  useEffect(() => {
    if (!user?.email || !client) {
      setIsPremium(false);
      return;
    }
    void client
      .from("reader_subscriptions")
      .select("status")
      .eq("email", user.email)
      .eq("status", "active")
      .maybeSingle()
      .then(({ data }) => setIsPremium(Boolean(data)));
  }, [user, client]);

  // After Google login: import provider identity once; never clobber custom name/avatar.
  useEffect(() => {
    if (!user || !client || !mounted) return;
    if (profileSyncDoneFor === user.id) return;

    let cancelled = false;
    void (async () => {
      const provider = extractProviderIdentity(user);
      const local = loadLocalEditableProfile();
      const remoteRow = await fetchOwnReaderProfile(client, user.id);
      const remoteEditable = remoteRow ? rowToEditable(remoteRow) : null;

      reconcileDistrictAfterLogin(
        remoteEditable
          ? { homeDistrict: remoteEditable.homeDistrict }
          : null
      );

      const district = districtPayloadForRemoteSync();
      const mergedLocal = mergeProviderIntoProfile(
        remoteEditable ?? local,
        provider,
        guest?.displayName ?? "Reader"
      );

      const synced = await upsertReaderProfileOnLogin(
        client,
        user.id,
        provider,
        mergedLocal,
        district
      );

      if (cancelled) return;
      saveLocalEditableProfile(synced);
      setEditable(synced);
      setSyncStatus(
        remoteRow || district
          ? "accountCard.syncSynced"
          : "accountCard.syncPending"
      );
      setProfileSyncDoneFor(user.id);
      setAuthError(null);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, client, mounted, profileSyncDoneFor, guest?.displayName]);

  useEffect(() => {
    if (!user) {
      setProfileSyncDoneFor(null);
      setSyncStatus(mounted ? "accountCard.syncOnDevice" : null);
    }
  }, [user, mounted]);

  // Expired / missing refresh: surface a gentle error when session vanished mid-use.
  useEffect(() => {
    if (!mounted || authLoading) return;
    if (configured && !user && !session && authError === null) {
      // Do not treat cold guest start as expired — only when URL says so.
    }
  }, [mounted, authLoading, configured, user, session, authError]);

  const toggleInterest = useCallback((id: string) => {
    if (!mounted) return;
    setInterestsState((prev) => {
      const valid = FEED_INTERESTS.some((i) => i.id === id);
      if (!valid) return prev;
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id].slice(0, 12);
      const normalized = normalizeFeedInterests(next);
      savePreferences({ feedInterests: normalized });
      syncInterestsCookie(normalized);
      return normalized;
    });
  }, [mounted]);

  const setInterests = useCallback((ids: string[]) => {
    if (!mounted) return;
    const next = normalizeFeedInterests(ids);
    setInterestsState(next);
    savePreferences({ feedInterests: next });
    syncInterestsCookie(next);
  }, [mounted]);

  const signInWithGoogle = useCallback(
    async (returnTo?: string | null) => {
      if (typeof window === "undefined") return;
      if (!client || !configured) {
        window.location.href = "/login";
        return;
      }
      setAuthError(null);
      const origin = window.location.origin;
      const currentPath = `${window.location.pathname}${window.location.search}`;
      const next = returnTo || currentPath || "/archive";
      const redirectTo = buildReaderOAuthRedirectTo(origin, next);
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) {
        setAuthError(error.message);
        throw error;
      }
    },
    [client, configured]
  );

  const signOut = useCallback(async () => {
    if (client) await client.auth.signOut();
    setGuest(loadGuest());
    setEditable(loadLocalEditableProfile());
    setProfileSyncDoneFor(null);
    setSyncStatus("accountCard.syncOnDevice");
    setIsPremium(false);
  }, [client]);

  const continueAsGuest = useCallback(() => {
    setAuthError(null);
    if (typeof window !== "undefined") {
      // Stay on More — guest reading is never blocked.
      const url = new URL(window.location.href);
      url.searchParams.delete("authError");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, []);

  const updateDisplayName = useCallback(
    async (name: string) => {
      const base =
        editable ??
        loadLocalEditableProfile() ?? {
          displayName: "Reader",
          avatarUrl: null,
          displayNameCustomized: false,
          avatarCustomized: false,
          homeDistrict: null,
          language: null,
          districtExplicit: false,
        };
      const next = applyCustomDisplayName(base, name);
      saveLocalEditableProfile(next);
      setEditable(next);

      if (user && client) {
        const result = await updateOwnReaderProfile(client, user.id, next);
        if (!result.ok) return { ok: false, error: result.error };
        setSyncStatus("accountCard.syncSynced");
      }
      return { ok: true };
    },
    [editable, user, client]
  );

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const displayName = useMemo(() => {
    if (editable?.displayName) return editable.displayName;
    if (user) {
      const provider = extractProviderIdentity(user);
      return (
        provider.displayName ||
        user.email?.split("@")[0] ||
        "Reader"
      );
    }
    return guest?.displayName ?? "Guest Reader";
  }, [editable, user, guest]);

  const avatarUrl = useMemo(() => {
    if (editable?.avatarUrl) return editable.avatarUrl;
    if (user) return extractProviderIdentity(user).avatarUrl;
    return null;
  }, [editable, user]);

  const value = useMemo(
    () => ({
      mounted,
      user,
      isLoggedIn: Boolean(user),
      loading: authLoading,
      displayName,
      avatarInitial: displayName.charAt(0).toUpperCase() || "R",
      avatarUrl,
      email: user?.email ?? null,
      syncStatus: user
        ? syncStatus ?? "accountCard.syncPending"
        : "accountCard.syncOnDevice",
      authError,
      isPremium,
      streakDays: guest?.streakDays ?? 1,
      savedCount,
      interests,
      toggleInterest,
      setInterests,
      signInWithGoogle,
      signOut,
      continueAsGuest,
      updateDisplayName,
      clearAuthError,
    }),
    [
      mounted,
      user,
      authLoading,
      displayName,
      avatarUrl,
      syncStatus,
      authError,
      guest,
      savedCount,
      isPremium,
      interests,
      toggleInterest,
      setInterests,
      signInWithGoogle,
      signOut,
      continueAsGuest,
      updateDisplayName,
      clearAuthError,
    ]
  );

  return (
    <ReaderAccountContext.Provider value={value}>
      {children}
    </ReaderAccountContext.Provider>
  );
}

export function useReaderAccount(): ReaderAccountContextValue {
  const ctx = useContext(ReaderAccountContext);
  if (!ctx) {
    return DEFAULT_VALUE;
  }
  return ctx;
}
