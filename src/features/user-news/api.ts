/** Typed browser client for /api/user-news/*. Never sends a user id: identity is the session cookie. */

import type { OwnSubmissionView, PostNewsStatus } from "@/lib/user-news/service";

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; status: number; error: string; message: string; details?: Record<string, unknown> };
export type ApiResult<T> = ApiOk<T> | ApiErr;

async function call<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) }, cache: "no-store", credentials: "same-origin" });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (res.ok && json.ok !== false) return { ok: true, data: json as T };
    return { ok: false, status: res.status, error: String(json.error ?? "error"), message: String(json.message ?? ""), details: json.details as Record<string, unknown> | undefined };
  } catch {
    return { ok: false, status: 0, error: "network", message: "" };
  }
}

const body = (b: unknown) => JSON.stringify(b);

export type MyNewsApiItem = {
  id: string;
  status: string;
  headline: string | null;
  language: "hi" | "en";
  district: string | null;
  createdAt: string;
  submittedAt: string | null;
  publishedAt: string | null;
  slug: string | null;
  thumbnailUrl: string | null;
  moderationNote: { decision: string; reason: string | null } | null;
  stats: { viewsTotal: number; viewsToday: number; views7d: number; uniqueViewers: number; likes: number; comments: number; engagementRatePct: number | null } | null;
};

export type SlotResponse = { mediaId: string; upload: { signedUrl: string; token: string; path: string } };
export type FinalizeResponse = { media: { id: string; kind: string; status: string; width: number | null; height: number | null; durationMs: number | null; needsProbe: boolean } };

export const userNewsApi = {
  status: () => call<{ status: PostNewsStatus }>("/api/user-news/status"),
  my: () => call<{ items: MyNewsApiItem[]; monetization: { active: boolean; message: string } }>("/api/user-news/my"),
  create: (b: { language: "hi" | "en"; text?: string | null; locationText?: string | null; declaredDistrict?: string | null }) => call<{ id: string; status: string }>("/api/user-news/submissions", { method: "POST", body: body(b) }),
  detail: (id: string) => call<{ view: OwnSubmissionView }>(`/api/user-news/submissions/${id}`),
  source: (id: string, b: { text?: string | null; locationText?: string | null; declaredDistrict?: string | null }) => call<{ version: number }>(`/api/user-news/submissions/${id}/source`, { method: "PATCH", body: body(b) }),
  draft: (id: string) => call<{ view: OwnSubmissionView }>(`/api/user-news/submissions/${id}/draft`, { method: "POST" }),
  edit: (id: string, b: Record<string, unknown>) => call<{ submission: unknown }>(`/api/user-news/submissions/${id}`, { method: "PATCH", body: body(b) }),
  approve: (id: string) => call<{ status: string }>(`/api/user-news/submissions/${id}/approve`, { method: "POST" }),
  submit: (id: string) => call<{ status: string }>(`/api/user-news/submissions/${id}/submit`, { method: "POST" }),
  withdraw: (id: string) => call<{ status: string }>(`/api/user-news/submissions/${id}/withdraw`, { method: "POST" }),
  mediaSlot: (id: string, b: { kind: "image" | "video" | "voice"; mime: string; sizeBytes: number }) => call<SlotResponse>(`/api/user-news/submissions/${id}/media`, { method: "POST", body: body(b) }),
  finalize: (mediaId: string) => call<FinalizeResponse>(`/api/user-news/media/${mediaId}/finalize`, { method: "POST" }),
  transcribe: (id: string, mediaId: string) => call<{ transcript: string }>(`/api/user-news/submissions/${id}/transcribe`, { method: "POST", body: body({ mediaId }) }),
  saveTranscript: (id: string, transcript: string) => call<{ version: number }>(`/api/user-news/submissions/${id}/transcript`, { method: "PATCH", body: body({ transcript }) }),
};
