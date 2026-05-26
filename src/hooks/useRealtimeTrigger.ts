"use client";

import { useEffect, useRef } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { REALTIME_CONFIG } from "@/lib/realtime/config";
import { traceStability } from "@/lib/observability/stability-trace";

/**
 * Optional Supabase realtime — debounced poll trigger on generated_articles changes.
 * Falls back to polling-only when unavailable.
 */
export function useRealtimeTrigger(onTrigger: () => void, enabled = true) {
  const onTriggerRef = useRef(onTrigger);
  useEffect(() => {
    onTriggerRef.current = onTrigger;
  }, [onTrigger]);

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured()) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnects = 0;
    const trigger = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => onTriggerRef.current(), REALTIME_CONFIG.debounceMs);
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
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          reconnects += 1;
          traceStability("SUBSCRIPTION_RECONNECT", "homepage_live_channel", {
            status,
            reconnects,
          });
        }
      });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      void supabase.removeChannel(channel);
    };
  }, [enabled]);
}
