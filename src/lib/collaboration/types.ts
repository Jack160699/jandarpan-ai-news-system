/**
 * Newsroom collaboration — shared types
 */

import type { JsonObject } from "@/types/json";

export type PresenceStatus = "viewing" | "editing" | "idle";

export type PresenceMember = {
  userId: string;
  email: string;
  displayName: string;
  status: PresenceStatus;
  typing: boolean;
  color: string;
  lastSeen: number;
};

export type InlineComment = {
  id: string;
  articleId: string;
  anchorId: string;
  body: string;
  authorEmail: string;
  authorUserId: string | null;
  mentions: string[];
  resolved: boolean;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  channel: string;
  body: string;
  authorEmail: string;
  authorUserId: string | null;
  mentions: string[];
  createdAt: string;
};

export type TeamNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  payload: JsonObject;
  createdAt: string;
};

export type ActivityEvent = {
  id: string;
  actorEmail: string;
  eventType: string;
  summary: string;
  payload: JsonObject;
  createdAt: string;
};

export type ApprovalRequest = {
  id: string;
  articleId: string;
  headline?: string;
  requestedByEmail: string;
  status: "pending" | "approved" | "rejected";
  message: string | null;
  responseNote: string | null;
  createdAt: string;
};

export type EditorLock = {
  articleId: string;
  lockedBy: string;
  lockedByEmail: string;
  expiresAt: string;
  isOwner: boolean;
};

export type DocBroadcastPayload = {
  version: number;
  userId: string;
  email: string;
  html: string;
  contentHash: string;
  typing?: boolean;
};

export type CollaborationSnapshot = {
  fetchedAt: string;
  activity: ActivityEvent[];
  notifications: TeamNotification[];
  chat: ChatMessage[];
  approvals: ApprovalRequest[];
  unreadNotifications: number;
};
