"use client";

import { useEffect, useRef } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { REALTIME_CONFIG } from "@/lib/realtime/config";
import { realtimeManager } from "@/lib/realtime/realtime-manager";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Optional Supabase realtime — debounced poll trigger on generated_articles changes.
 * Uses centralized realtime manager (public namespace).
 */
export function useRealtimeTrigger(onTrigger: () => void, enabled = true) {
  const onTriggerRef = useRef(onTrigger);
  useEffect(() => {
    onTriggerRef.current = onTrigger;
  }, [onTrigger]);

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured()) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const trigger = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => onTriggerRef.current(), REALTIME_CONFIG.debounceMs);
    };

    const teardown = realtimeManager.subscribe(
      "newsroom-homepage-live",
      (channel) =>
        channel
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
          .subscribe() as RealtimeChannel,
      { namespace: "public" }
    );

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      teardown();
    };
  }, [enabled]);
}
