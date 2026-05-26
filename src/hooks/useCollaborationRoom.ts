"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { colorForUser } from "@/lib/collaboration/presence-colors";
import { hashContent, mergeBroadcastHtml } from "@/lib/collaboration/ot-lite";
import type {
  DocBroadcastPayload,
  PresenceMember,
} from "@/lib/collaboration/types";
import { buildCollabChannelName } from "@/lib/security/realtime-guard";
import type { RealtimeChannel } from "@supabase/supabase-js";

type UseCollaborationRoomOptions = {
  tenantId: string;
  roomId: string;
  roomType: "article" | "tenant";
  userId: string;
  email: string;
  enabled?: boolean;
  onRemoteDoc?: (html: string, version: number) => void;
};

export function useCollaborationRoom({
  tenantId,
  roomId,
  roomType,
  userId,
  email,
  enabled = true,
  onRemoteDoc,
}: UseCollaborationRoomOptions) {
  const [members, setMembers] = useState<PresenceMember[]>([]);
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const localVersionRef = useRef(0);
  const onRemoteDocRef = useRef(onRemoteDoc);

  useEffect(() => {
    onRemoteDocRef.current = onRemoteDoc;
  }, [onRemoteDoc]);

  const upsertSelf = useCallback(
    (patch: Partial<PresenceMember>) => {
      setMembers((prev) => {
        const others = prev.filter((m) => m.userId !== userId);
        const self = prev.find((m) => m.userId === userId) ?? {
          userId,
          email,
          displayName: email.split("@")[0],
          status: "viewing" as const,
          typing: false,
          color: colorForUser(userId),
          lastSeen: Date.now(),
        };
        return [...others, { ...self, ...patch, lastSeen: Date.now() }];
      });
    },
    [userId, email]
  );

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured() || !roomId || !tenantId) return;

    const supabase = createBrowserClient();
    const channelName = buildCollabChannelName({ tenantId, roomType, roomId });

    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false }, presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{
          email?: string;
          status?: string;
          typing?: boolean;
        }>();
        const list: PresenceMember[] = [];
        for (const key of Object.keys(state)) {
          const entries = state[key];
          const row = entries?.[0];
          if (!row) continue;
          list.push({
            userId: key,
            email: row.email ?? key,
            displayName: (row.email ?? key).split("@")[0],
            status: (row.status as PresenceMember["status"]) ?? "viewing",
            typing: Boolean(row.typing),
            color: colorForUser(key),
            lastSeen: Date.now(),
          });
        }
        setMembers(list);
      })
      .on("broadcast", { event: "doc" }, ({ payload }) => {
        const p = payload as DocBroadcastPayload;
        if (!p || p.userId === userId) return;
        const merged = mergeBroadcastHtml({
          localHtml: "",
          localVersion: localVersionRef.current,
          remoteHtml: p.html,
          remoteVersion: p.version,
          remoteUserId: p.userId,
          localUserId: userId,
        });
        localVersionRef.current = merged.version;
        onRemoteDocRef.current?.(merged.html, merged.version);
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const p = payload as { userId: string; typing: boolean };
        if (!p || p.userId === userId) return;
        setMembers((prev) =>
          prev.map((m) =>
            m.userId === p.userId ? { ...m, typing: p.typing, lastSeen: Date.now() } : m
          )
        );
      })
      .subscribe(async (status) => {
        setConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") {
          await channel.track({
            email,
            status: "viewing",
            typing: false,
          });
        }
      });

    channelRef.current = channel;

    const prune = setInterval(() => {
      const cutoff = Date.now() - 45_000;
      setMembers((prev) => prev.filter((m) => m.lastSeen >= cutoff));
    }, 15_000);

    return () => {
      clearInterval(prune);
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [tenantId, roomId, roomType, userId, email, enabled, upsertSelf]);

  const broadcastDoc = useCallback(
    (html: string, typing = false) => {
      localVersionRef.current += 1;
      const version = localVersionRef.current;
      const payload: DocBroadcastPayload = {
        version,
        userId,
        email,
        html,
        contentHash: hashContent(html),
        typing,
      };
      channelRef.current?.send({
        type: "broadcast",
        event: "doc",
        payload,
      });
      upsertSelf({ status: "editing", typing });
    },
    [userId, email, upsertSelf]
  );

  const setTyping = useCallback(
    (typing: boolean) => {
      channelRef.current?.send({
        type: "broadcast",
        event: "typing",
        payload: { userId, typing },
      });
      void channelRef.current?.track({ email, status: "editing", typing });
      upsertSelf({ typing, status: typing ? "editing" : "viewing" });
    },
    [userId, email, upsertSelf]
  );

  const setStatus = useCallback(
    (status: PresenceMember["status"]) => {
      void channelRef.current?.track({ email, status, typing: false });
      upsertSelf({ status, typing: false });
    },
    [email, upsertSelf]
  );

  return {
    members,
    connected,
    broadcastDoc,
    setTyping,
    setStatus,
    localVersion: localVersionRef,
  };
}
