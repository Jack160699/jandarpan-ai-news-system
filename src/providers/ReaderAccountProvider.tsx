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
import { FEED_INTERESTS } from "@/lib/super-menu/config";
import { loadPreferences, savePreferences } from "@/lib/reader-preferences";
import { loadReadingMemory } from "@/lib/reading-memory";

const ACCOUNT_KEY = "cgb-reader-account";
const STREAK_KEY = "cgb-reader-streak";
const INTERESTS_COOKIE = "cgb-feed-interests";

function syncInterestsCookie(ids: string[]) {
  if (typeof document === "undefined") return;
  const val = encodeURIComponent(JSON.stringify(ids));
  document.cookie = `${INTERESTS_COOKIE}=${val};path=/;max-age=31536000;SameSite=Lax`;
}

type GuestProfile = {
  displayName: string;
  streakDays: number;
  lastVisit: string;
};

type ReaderAccountContextValue = {
  user: User | null;
  isLoggedIn: boolean;
  loading: boolean;
  displayName: string;
  avatarInitial: string;
  isPremium: boolean;
  streakDays: number;
  savedCount: number;
  interests: string[];
  toggleInterest: (id: string) => void;
  setInterests: (ids: string[]) => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const ReaderAccountContext = createContext<ReaderAccountContextValue | null>(
  null
);

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

export function ReaderAccountProvider({ children }: { children: ReactNode }) {
  const { user, client, loading: authLoading, configured } = useSupabase();
  const [guest, setGuest] = useState<GuestProfile | null>(null);
  const [interests, setInterestsState] = useState<string[]>([]);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    setGuest(loadGuest());
    const prefs = loadPreferences();
    setInterestsState(
      prefs.feedInterests?.length
        ? prefs.feedInterests
        : ["cg-news", "politics", "business"]
    );
    setSavedCount(loadReadingMemory().bookmarks.length);
  }, []);

  const toggleInterest = useCallback((id: string) => {
    setInterestsState((prev) => {
      const valid = FEED_INTERESTS.some((i) => i.id === id);
      if (!valid) return prev;
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id].slice(0, 12);
      savePreferences({ feedInterests: next });
      syncInterestsCookie(next);
      return next;
    });
  }, []);

  const setInterests = useCallback((ids: string[]) => {
    const next = ids.filter((id) => FEED_INTERESTS.some((i) => i.id === id)).slice(0, 12);
    setInterestsState(next);
    savePreferences({ feedInterests: next });
    syncInterestsCookie(next);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!client || !configured) {
      window.location.href = "/login";
      return;
    }
    const origin = window.location.origin;
    await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/login?oauth=1` },
    });
  }, [client, configured]);

  const signOut = useCallback(async () => {
    if (client) await client.auth.signOut();
    setGuest(loadGuest());
  }, [client]);

  const displayName = useMemo(() => {
    if (user?.user_metadata?.full_name) return String(user.user_metadata.full_name);
    if (user?.email) return user.email.split("@")[0] ?? "Reader";
    return guest?.displayName ?? "Guest Reader";
  }, [user, guest]);

  const value = useMemo(
    () => ({
      user,
      isLoggedIn: Boolean(user),
      loading: authLoading,
      displayName,
      avatarInitial: displayName.charAt(0).toUpperCase() || "R",
      isPremium: false,
      streakDays: guest?.streakDays ?? 1,
      savedCount,
      interests,
      toggleInterest,
      setInterests,
      signInWithGoogle,
      signOut,
    }),
    [
      user,
      authLoading,
      displayName,
      guest,
      savedCount,
      interests,
      toggleInterest,
      setInterests,
      signInWithGoogle,
      signOut,
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
    throw new Error("useReaderAccount must be used within ReaderAccountProvider");
  }
  return ctx;
}
