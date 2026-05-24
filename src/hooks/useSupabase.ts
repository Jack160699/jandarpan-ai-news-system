"use client";

/**
 * React hook — browser Supabase client + auth subscription.
 * Client-only: never instantiates Supabase during SSR.
 */

import { useEffect, useState } from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type UseSupabaseState = {
  client: SupabaseClient<Database> | null;
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
  error: string | null;
};

export function useSupabase(): UseSupabaseState {
  const configured =
    typeof window !== "undefined" && isSupabaseConfigured();
  const [client, setClient] = useState<SupabaseClient<Database> | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    let mounted = true;
    let supabase: SupabaseClient<Database> | null = null;

    try {
      supabase = createBrowserClient();
      setClient(supabase);
    } catch (e) {
      if (mounted) {
        setError(
          e instanceof Error ? e.message : "Failed to create Supabase client"
        );
        setLoading(false);
      }
      return;
    }

    setLoading(true);

    supabase.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!mounted) return;
        if (sessionError) setError(sessionError.message);
        setSession(data.session);
        setUser(data.session?.user ?? null);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Session error");
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [configured]);

  return {
    client,
    user,
    session,
    loading,
    configured,
    error,
  };
}
