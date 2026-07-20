"use client";

/**
 * React hook — browser Supabase client + auth subscription.
 * Client-only: never instantiates Supabase during SSR.
 *
 * Uses a module-level singleton listener to avoid duplicate onAuthStateChange storms.
 */

import { useEffect, useSyncExternalStore } from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { traceStability } from "@/lib/observability/stability-trace";

export type UseSupabaseState = {
  client: SupabaseClient<Database> | null;
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
  error: string | null;
};

type AuthSnapshot = {
  client: SupabaseClient<Database> | null;
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
};

let snapshot: AuthSnapshot = {
  client: null,
  user: null,
  session: null,
  loading: false,
  error: null,
};

/** Stable empty snapshots — useSyncExternalStore requires referential equality. */
const SERVER_SNAPSHOT: AuthSnapshot = {
  client: null,
  user: null,
  session: null,
  loading: false,
  error: null,
};

const UNCONFIGURED_SNAPSHOT: AuthSnapshot = {
  client: null,
  user: null,
  session: null,
  loading: false,
  error: null,
};

const listeners = new Set<() => void>();
let initStarted = false;

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): AuthSnapshot {
  return snapshot;
}

function ensureAuthBootstrap() {
  if (initStarted) return;
  if (typeof window === "undefined" || !isSupabaseConfigured()) {
    snapshot = { ...snapshot, loading: false };
    return;
  }

  initStarted = true;
  snapshot = { ...snapshot, loading: true };
  emit();

  try {
    const supabase = createBrowserClient();
    snapshot = { ...snapshot, client: supabase, error: null };
    emit();

    void supabase.auth
      .getUser()
      .then(({ data, error: userError }) => {
        snapshot = {
          ...snapshot,
          user: data.user ?? null,
          loading: false,
          error: userError?.message ?? null,
        };
        emit();
      })
      .catch((e: unknown) => {
        snapshot = {
          ...snapshot,
          loading: false,
          error: e instanceof Error ? e.message : "Session error",
        };
        emit();
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      traceStability("SESSION_REFRESH", "supabase_auth_state_change", { event });
      snapshot = {
        ...snapshot,
        session: nextSession,
        user: nextSession?.user ?? null,
        loading: false,
      };
      emit();
    });

    void subscription;
  } catch (e) {
    snapshot = {
      ...snapshot,
      loading: false,
      error: e instanceof Error ? e.message : "Failed to create Supabase client",
    };
    emit();
  }
}

export function useSupabase(): UseSupabaseState {
  const configured =
    typeof window !== "undefined" && isSupabaseConfigured();

  useEffect(() => {
    if (configured) ensureAuthBootstrap();
  }, [configured]);

  const state = useSyncExternalStore(
    subscribe,
    () => (configured ? getSnapshot() : UNCONFIGURED_SNAPSHOT),
    () => SERVER_SNAPSHOT
  );

  return {
    client: configured ? state.client : null,
    user: configured ? state.user : null,
    session: configured ? state.session : null,
    loading: configured ? state.loading : false,
    configured,
    error: configured ? state.error : null,
  };
}
