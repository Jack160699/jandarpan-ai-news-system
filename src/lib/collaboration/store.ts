/**
 * Collaboration persistence (service role)
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { asJsonObject, jsonObjectFrom, type JsonObject } from "@/types/json";
import { hashContent } from "@/lib/collaboration/ot-lite";
import type {
  ActivityEvent,
  ApprovalRequest,
  ChatMessage,
  CollaborationSnapshot,
  EditorLock,
  InlineComment,
  TeamNotification,
} from "@/lib/collaboration/types";

const LOCK_TTL_MS = 5 * 60 * 1000;

export async function fetchCollaborationHub(
  tenantId: string,
  userId: string
): Promise<CollaborationSnapshot> {
  const empty: CollaborationSnapshot = {
    fetchedAt: new Date().toISOString(),
    activity: [],
    notifications: [],
    chat: [],
    approvals: [],
    unreadNotifications: 0,
  };

  if (!isSupabaseConfigured()) return empty;

  const supabase = createAdminServerClient();

  const [activityRes, notifRes, chatRes, approvalsRes] = await Promise.all([
    supabase
      .from("newsroom_activity_events")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("newsroom_notifications")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("newsroom_chat_messages")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("newsroom_approval_requests")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const notifications = (notifRes.data ?? []).map(mapNotification);
  const unread = notifications.filter((n) => !n.readAt).length;

  return {
    fetchedAt: new Date().toISOString(),
    activity: (activityRes.data ?? []).map(mapActivity),
    notifications,
    chat: (chatRes.data ?? []).reverse().map(mapChat),
    approvals: (approvalsRes.data ?? []).map((r) =>
      mapApproval(r as Record<string, unknown>)
    ),
    unreadNotifications: unread,
  };
}

export async function acquireEditorLock(input: {
  tenantId: string;
  articleId: string;
  userId: string;
  email: string;
}): Promise<EditorLock | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createAdminServerClient();
  const expiresAt = new Date(Date.now() + LOCK_TTL_MS).toISOString();

  const { data: existing } = await supabase
    .from("newsroom_editor_locks")
    .select("*")
    .eq("article_id", input.articleId)
    .maybeSingle();

  if (existing) {
    const expired = new Date(existing.expires_at).getTime() < Date.now();
    if (!expired && existing.locked_by !== input.userId) {
      return {
        articleId: input.articleId,
        lockedBy: existing.locked_by,
        lockedByEmail: existing.locked_by_email,
        expiresAt: existing.expires_at,
        isOwner: false,
      };
    }
  }

  const { data, error } = await supabase
    .from("newsroom_editor_locks")
    .upsert({
      article_id: input.articleId,
      tenant_id: input.tenantId,
      locked_by: input.userId,
      locked_by_email: input.email,
      expires_at: expiresAt,
      heartbeat_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) return null;

  await logActivity({
    tenantId: input.tenantId,
    actorUserId: input.userId,
    actorEmail: input.email,
    eventType: "lock_acquired",
    summary: `Acquired edit lock on article`,
    payload: { articleId: input.articleId },
  });

  return {
    articleId: input.articleId,
    lockedBy: data.locked_by,
    lockedByEmail: data.locked_by_email,
    expiresAt: data.expires_at,
    isOwner: true,
  };
}

export async function releaseEditorLock(
  articleId: string,
  userId: string
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = createAdminServerClient();
  await supabase
    .from("newsroom_editor_locks")
    .delete()
    .eq("article_id", articleId)
    .eq("locked_by", userId);
}

export async function heartbeatLock(articleId: string, userId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = createAdminServerClient();
  await supabase
    .from("newsroom_editor_locks")
    .update({
      heartbeat_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + LOCK_TTL_MS).toISOString(),
    })
    .eq("article_id", articleId)
    .eq("locked_by", userId);
}

export async function appendDocOperation(input: {
  tenantId: string;
  articleId: string;
  userId: string;
  email: string;
  version: number;
  html: string;
  opType?: "snapshot" | "patch";
}): Promise<{ ok: boolean; version?: number; reason?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, reason: "no_db" };

  const supabase = createAdminServerClient();
  const contentHash = hashContent(input.html);

  const { data: head } = await supabase
    .from("newsroom_doc_heads")
    .select("*")
    .eq("article_id", input.articleId)
    .maybeSingle();

  const serverVersion = head ? Number(head.version) : 0;

  if (input.version <= serverVersion) {
    return { ok: false, reason: "stale_version" };
  }

  const { error: opErr } = await supabase.from("newsroom_doc_operations").insert({
    tenant_id: input.tenantId,
    article_id: input.articleId,
    version: input.version,
    user_id: input.userId,
    user_email: input.email,
    op_type: input.opType ?? "patch",
    content_hash: contentHash,
    payload: { htmlLength: input.html.length },
  });

  if (opErr) return { ok: false, reason: opErr.message };

  await supabase.from("newsroom_doc_heads").upsert({
    article_id: input.articleId,
    tenant_id: input.tenantId,
    version: input.version,
    content_hash: contentHash,
    updated_by: input.userId,
    updated_at: new Date().toISOString(),
  });

  return { ok: true, version: input.version };
}

export async function listInlineComments(
  articleId: string
): Promise<InlineComment[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createAdminServerClient();
  const { data } = await supabase
    .from("newsroom_inline_comments")
    .select("*")
    .eq("article_id", articleId)
    .order("created_at", { ascending: true });

  return (data ?? []).map(mapInlineComment);
}

export async function addInlineComment(input: {
  tenantId: string;
  articleId: string;
  anchorId: string;
  body: string;
  authorUserId: string;
  authorEmail: string;
  mentions?: string[];
}): Promise<InlineComment | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createAdminServerClient();
  const { data, error } = await supabase
    .from("newsroom_inline_comments")
    .insert({
      tenant_id: input.tenantId,
      article_id: input.articleId,
      anchor_id: input.anchorId,
      body: input.body,
      author_user_id: input.authorUserId,
      author_email: input.authorEmail,
      mentions: input.mentions ?? [],
    })
    .select("*")
    .single();

  if (error || !data) return null;

  for (const uid of input.mentions ?? []) {
    await createNotification({
      tenantId: input.tenantId,
      userId: uid,
      type: "mention",
      title: "You were mentioned",
      body: `${input.authorEmail} in a comment`,
      payload: { articleId: input.articleId, commentId: data.id },
    });
  }

  await logActivity({
    tenantId: input.tenantId,
    actorUserId: input.authorUserId,
    actorEmail: input.authorEmail,
    eventType: "inline_comment",
    summary: `Comment on article`,
    payload: { articleId: input.articleId },
  });

  return mapInlineComment(data);
}

export async function postChatMessage(input: {
  tenantId: string;
  body: string;
  authorUserId: string;
  authorEmail: string;
  channel?: string;
  mentions?: string[];
}): Promise<ChatMessage | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createAdminServerClient();
  const { data, error } = await supabase
    .from("newsroom_chat_messages")
    .insert({
      tenant_id: input.tenantId,
      channel: input.channel ?? "general",
      body: input.body,
      author_user_id: input.authorUserId,
      author_email: input.authorEmail,
      mentions: input.mentions ?? [],
    })
    .select("*")
    .single();

  if (error || !data) return null;

  for (const uid of input.mentions ?? []) {
    await createNotification({
      tenantId: input.tenantId,
      userId: uid,
      type: "chat_mention",
      title: "Chat mention",
      body: input.body.slice(0, 120),
      payload: { messageId: data.id },
    });
  }

  await logActivity({
    tenantId: input.tenantId,
    actorUserId: input.authorUserId,
    actorEmail: input.authorEmail,
    eventType: "chat_message",
    summary: `${input.authorEmail} in #${input.channel ?? "general"}`,
    payload: {},
  });

  return mapChat(data);
}

export async function createApprovalRequest(input: {
  tenantId: string;
  articleId: string;
  requestedBy: string;
  requestedByEmail: string;
  approverUserId?: string | null;
  message?: string;
}): Promise<ApprovalRequest | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createAdminServerClient();
  const { data, error } = await supabase
    .from("newsroom_approval_requests")
    .insert({
      tenant_id: input.tenantId,
      article_id: input.articleId,
      requested_by: input.requestedBy,
      requested_by_email: input.requestedByEmail,
      approver_user_id: input.approverUserId ?? null,
      message: input.message ?? null,
      status: "pending",
    })
    .select("*")
    .single();

  if (error || !data) return null;

  if (input.approverUserId) {
    await createNotification({
      tenantId: input.tenantId,
      userId: input.approverUserId,
      type: "approval_request",
      title: "Approval requested",
      body: input.message ?? "Review this story",
      payload: { articleId: input.articleId, requestId: data.id },
    });
  }

  await logActivity({
    tenantId: input.tenantId,
    actorUserId: input.requestedBy,
    actorEmail: input.requestedByEmail,
    eventType: "approval_request",
    summary: "Requested publish approval",
    payload: { articleId: input.articleId },
  });

  return mapApproval(data);
}

export async function resolveApproval(input: {
  tenantId: string;
  requestId: string;
  status: "approved" | "rejected";
  responseNote?: string;
  resolverUserId: string;
  resolverEmail: string;
}): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const supabase = createAdminServerClient();

  const { data: req } = await supabase
    .from("newsroom_approval_requests")
    .select("*")
    .eq("id", input.requestId)
    .eq("tenant_id", input.tenantId)
    .maybeSingle();

  if (!req) return false;

  await supabase
    .from("newsroom_approval_requests")
    .update({
      status: input.status,
      response_note: input.responseNote ?? null,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", input.requestId);

  await createNotification({
    tenantId: input.tenantId,
    userId: req.requested_by,
    type: `approval_${input.status}`,
    title: input.status === "approved" ? "Approved" : "Changes requested",
    body: input.responseNote ?? "",
    payload: { articleId: req.article_id, requestId: input.requestId },
  });

  return true;
}

export async function createNotification(input: {
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  payload?: JsonObject;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = createAdminServerClient();
  await supabase.from("newsroom_notifications").insert({
    tenant_id: input.tenantId,
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    payload: asJsonObject(input.payload ?? {}),
  });
}

export async function notifyAssignment(input: {
  tenantId: string;
  assigneeUserId: string;
  articleId: string;
  headline: string;
  assignerEmail: string;
}): Promise<void> {
  await createNotification({
    tenantId: input.tenantId,
    userId: input.assigneeUserId,
    type: "assignment",
    title: "Story assigned to you",
    body: input.headline,
    payload: { articleId: input.articleId },
  });

  await logActivity({
    tenantId: input.tenantId,
    actorEmail: input.assignerEmail,
    eventType: "assignment",
    summary: `Assigned: ${input.headline.slice(0, 60)}`,
    payload: { articleId: input.articleId, assigneeUserId: input.assigneeUserId },
  });
}

export async function markNotificationRead(
  userId: string,
  notificationId: string
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = createAdminServerClient();
  await supabase
    .from("newsroom_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId);
}

export async function logActivity(input: {
  tenantId: string;
  actorUserId?: string | null;
  actorEmail: string;
  eventType: string;
  summary: string;
  payload?: JsonObject;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = createAdminServerClient();
  await supabase.from("newsroom_activity_events").insert({
    tenant_id: input.tenantId,
    actor_user_id: input.actorUserId ?? null,
    actor_email: input.actorEmail,
    event_type: input.eventType,
    summary: input.summary,
    payload: asJsonObject(input.payload ?? {}),
  });
}

export async function logPublishingAlert(input: {
  tenantId: string;
  actorEmail: string;
  articleId: string;
  headline: string;
}): Promise<void> {
  await logActivity({
    tenantId: input.tenantId,
    actorEmail: input.actorEmail,
    eventType: "published",
    summary: `Published: ${input.headline.slice(0, 72)}`,
    payload: { articleId: input.articleId },
  });
}

function mapInlineComment(row: Record<string, unknown>): InlineComment {
  return {
    id: row.id as string,
    articleId: row.article_id as string,
    anchorId: row.anchor_id as string,
    body: row.body as string,
    authorEmail: row.author_email as string,
    authorUserId: (row.author_user_id as string) ?? null,
    mentions: (row.mentions as string[]) ?? [],
    resolved: Boolean(row.resolved),
    createdAt: row.created_at as string,
  };
}

function mapChat(row: Record<string, unknown>): ChatMessage {
  return {
    id: row.id as string,
    channel: row.channel as string,
    body: row.body as string,
    authorEmail: row.author_email as string,
    authorUserId: (row.author_user_id as string) ?? null,
    mentions: (row.mentions as string[]) ?? [],
    createdAt: row.created_at as string,
  };
}

function mapNotification(row: Record<string, unknown>): TeamNotification {
  return {
    id: row.id as string,
    type: row.type as string,
    title: row.title as string,
    body: row.body as string,
    readAt: (row.read_at as string) ?? null,
    payload: jsonObjectFrom(row.payload as import("@/types/supabase").Json),
    createdAt: row.created_at as string,
  };
}

function mapActivity(row: Record<string, unknown>): ActivityEvent {
  return {
    id: row.id as string,
    actorEmail: row.actor_email as string,
    eventType: row.event_type as string,
    summary: row.summary as string,
    payload: jsonObjectFrom(row.payload as import("@/types/supabase").Json),
    createdAt: row.created_at as string,
  };
}

function mapApproval(row: Record<string, unknown>): ApprovalRequest {
  const article = row.generated_articles as { headline?: string } | null;
  return {
    id: row.id as string,
    articleId: row.article_id as string,
    headline: article?.headline,
    requestedByEmail: row.requested_by_email as string,
    status: row.status as ApprovalRequest["status"],
    message: (row.message as string) ?? null,
    responseNote: (row.response_note as string) ?? null,
    createdAt: row.created_at as string,
  };
}
