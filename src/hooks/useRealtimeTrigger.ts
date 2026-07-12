"use client";

import { useEffect, useRef } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { REALTIME_CONFIG } from "@/lib/realtime/config";
import { setRealtimePollBacked } from "@/lib/realtime/live-poll-coordinator";
import { realtimeManager } from "@/lib/realtime/realtime-manager";
import type { RealtimeChannel } from "@supabase/supabase-js";

type RealtimeTriggerHandler = (
  delayMs?: number,
  forceFetch?: boolean
) => void;

/**
 * Supabase realtime — debounced poll trigger on generated_articles changes.
 * Uses centralized realtime manager (public namespace).
 */
export function useRealtimeTrigger(
  onTrigger: RealtimeTriggerHandler,
  enabled = true
) {
  const onTriggerRef = useRef(onTrigger);
  useEffect(() => {
    onTriggerRef.current = onTrigger;
  }, [onTrigger]);

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured()) {
      setRealtimePollBacked(false);
      return;
    }

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const trigger = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(
        () => onTriggerRef.current(0, true),
        REALTIME_CONFIG.debounceMs
      );
    };

    setRealtimePollBacked(true);

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
      setRealtimePollBacked(false);
      if (debounceTimer) clearTimeout(debounceTimer);
      teardown();
    };
  }, [enabled]);
}
