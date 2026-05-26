/**
 * OT-lite — monotonic versions + content hash conflict detection
 */

import { createHash } from "crypto";

export function hashContent(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

export type MergeResult =
  | { ok: true; version: number; accepted: true }
  | { ok: false; reason: "stale_version" | "hash_mismatch"; serverVersion: number };

/**
 * Decide whether an incoming operation can apply on top of server head.
 */
export function canApplyOperation(input: {
  serverVersion: number;
  incomingVersion: number;
  serverHash: string | null;
  baseHash: string | null;
}): MergeResult {
  if (input.incomingVersion <= input.serverVersion) {
    return {
      ok: false,
      reason: "stale_version",
      serverVersion: input.serverVersion,
    };
  }

  if (
    input.baseHash &&
    input.serverHash &&
    input.baseHash !== input.serverHash &&
    input.incomingVersion === input.serverVersion + 1
  ) {
    return {
      ok: false,
      reason: "hash_mismatch",
      serverVersion: input.serverVersion,
    };
  }

  return { ok: true, version: input.incomingVersion, accepted: true };
}

/**
 * Simple patch merge for concurrent typing — prefer longer/newer HTML when versions tie within 1.
 */
export function mergeBroadcastHtml(input: {
  localHtml: string;
  localVersion: number;
  remoteHtml: string;
  remoteVersion: number;
  remoteUserId: string;
  localUserId: string;
}): { html: string; version: number; source: "local" | "remote" } {
  if (input.remoteVersion > input.localVersion) {
    return {
      html: input.remoteHtml,
      version: input.remoteVersion,
      source: "remote",
    };
  }
  if (input.remoteVersion < input.localVersion) {
    return {
      html: input.localHtml,
      version: input.localVersion,
      source: "local",
    };
  }
  if (input.remoteUserId === input.localUserId) {
    return {
      html: input.localHtml,
      version: input.localVersion,
      source: "local",
    };
  }
  return input.remoteHtml.length >= input.localHtml.length
    ? { html: input.remoteHtml, version: input.remoteVersion, source: "remote" }
    : { html: input.localHtml, version: input.localVersion, source: "local" };
}
