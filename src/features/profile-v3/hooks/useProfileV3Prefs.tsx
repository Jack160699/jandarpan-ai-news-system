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
import {
  DEFAULT_PROFILE_V3_PREFS,
  loadProfileV3Prefs,
  saveProfileV3Prefs,
} from "../lib/profile-prefs";
import type { ProfileV3Prefs } from "../types";

type ProfileV3PrefsContextValue = {
  prefs: ProfileV3Prefs;
  hydrated: boolean;
  update: (partial: Partial<ProfileV3Prefs>) => ProfileV3Prefs;
};

const ProfileV3PrefsContext = createContext<ProfileV3PrefsContextValue | null>(null);

export function ProfileV3PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<ProfileV3Prefs>(DEFAULT_PROFILE_V3_PREFS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPrefs(loadProfileV3Prefs());
    setHydrated(true);
  }, []);

  const update = useCallback((partial: Partial<ProfileV3Prefs>) => {
    const next = saveProfileV3Prefs(partial);
    setPrefs(next);
    return next;
  }, []);

  const value = useMemo(
    () => ({ prefs, hydrated, update }),
    [prefs, hydrated, update]
  );

  return (
    <ProfileV3PrefsContext.Provider value={value}>
      {children}
    </ProfileV3PrefsContext.Provider>
  );
}

export function useProfileV3Prefs() {
  const ctx = useContext(ProfileV3PrefsContext);
  if (!ctx) {
    throw new Error("useProfileV3Prefs must be used within ProfileV3PrefsProvider");
  }
  return ctx;
}
