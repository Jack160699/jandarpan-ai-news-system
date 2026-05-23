"use client";

/**
 * React hook — browser Supabase client + auth subscription.
 */

import { useEffect, useMemo, useState } from "react";
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
  const configured = isSupabaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);

  const client = useMemo(() => {
    if (!configured) return null;
    try {
      return createBrowserClient();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create Supabase client");
      return null;
    }
  }, [configured]);

  useEffect(() => {
    if (!client) {
      setLoading(false);
      return;
    }

    let mounted = true;

    client.auth
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
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [client]);

  return { client, user, session, loading, configured, error };
}
