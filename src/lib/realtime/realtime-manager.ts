/**
 * Centralized Supabase realtime channel registry.
 * Components must not create channels directly — use subscribe().
 */

import { createBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { tracePerf } from "@/lib/observability/performance-monitor";
import type { RealtimeChannel } from "@supabase/supabase-js";

type ChannelEntry = {
  channel: RealtimeChannel;
  refs: number;
  lastReconnectLog: number;
};

const RECONNECT_LOG_INTERVAL_MS = 15_000;

class RealtimeManager {
  private channels = new Map<string, ChannelEntry>();
  private paused = false;

  constructor() {
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        this.paused = document.hidden;
        tracePerf("REALTIME", this.paused ? "paused_hidden" : "resumed_visible");
      });
    }
  }

  subscribe(
    channelName: string,
    setup: (channel: RealtimeChannel) => RealtimeChannel,
    options?: { namespace?: string }
  ): () => void {
    if (!isSupabaseConfigured() || this.paused) {
      return () => undefined;
    }

    const key = options?.namespace
      ? `${options.namespace}:${channelName}`
      : channelName;

    let entry = this.channels.get(key);
    if (entry) {
      entry.refs += 1;
      tracePerf("REALTIME", "channel_ref_increment", { key, refs: entry.refs });
      return () => this.release(key);
    }

    const supabase = createBrowserClient();
    const channel = setup(
      supabase.channel(channelName, {
        config: { broadcast: { self: false } },
      })
    );

    this.channels.set(key, {
      channel,
      refs: 1,
      lastReconnectLog: 0,
    });
    tracePerf("REALTIME", "channel_created", { key });

    return () => this.release(key);
  }

  private release(key: string) {
    const entry = this.channels.get(key);
    if (!entry) return;
    entry.refs -= 1;
    if (entry.refs > 0) return;

    const supabase = createBrowserClient();
    void supabase.removeChannel(entry.channel);
    this.channels.delete(key);
    tracePerf("REALTIME", "channel_removed", { key });
  }

  disconnectAll() {
    const supabase = createBrowserClient();
    for (const [key, entry] of this.channels) {
      void supabase.removeChannel(entry.channel);
      tracePerf("REALTIME", "channel_force_removed", { key });
    }
    this.channels.clear();
  }
}

export const realtimeManager = new RealtimeManager();
