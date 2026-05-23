"use client";

import { useEffect } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { REALTIME_CONFIG } from "@/lib/realtime/config";

/**
 * Optional Supabase realtime — debounced poll trigger on generated_articles changes.
 * Falls back to polling-only when unavailable.
 */
export function useRealtimeTrigger(onTrigger: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled || !isSupabaseConfigured()) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const trigger = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(onTrigger, REALTIME_CONFIG.debounceMs);
    };

    const supabase = createBrowserClient();
    const channel = supabase
      .channel("newsroom-homepage-live")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "generated_articles",
        },
        trigger
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "generated_articles",
        },
        trigger
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      void supabase.removeChannel(channel);
    };
  }, [enabled, onTrigger]);
}
