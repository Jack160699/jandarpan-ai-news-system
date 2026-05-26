/**
 * DAM storage — Supabase bucket paths + public URLs
 */

import { createAdminServerClient } from "@/lib/supabase/admin";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";
import type { DamMediaType } from "@/lib/dam/types";

export function getDamBucket(): string {
  return process.env.NEWSROOM_DAM_BUCKET?.trim() ||
    process.env.NEWSROOM_STORAGE_BUCKET?.trim() ||
    "editorial-images";
}

export function damStoragePath(input: {
  tenantId: string;
  assetId: string;
  filename: string;
  variant?: string;
}): string {
  const safe = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const base = `dam/${input.tenantId}/${input.assetId}`;
  return input.variant ? `${base}/${input.variant}-${safe}` : `${base}/${safe}`;
}

export function publicUrlForPath(path: string): string {
  const supabase = createAdminServerClient();
  const bucket = getDamBucket();
  const pub = supabase.storage.from(bucket).getPublicUrl(path);
  if (pub.data.publicUrl) return pub.data.publicUrl;
  const { url } = getPublicSupabaseEnv();
  return `${url}/storage/v1/object/public/${bucket}/${path}`;
}

export async function uploadDamBuffer(input: {
  path: string;
  buffer: Buffer;
  mimeType: string;
  cacheControl?: string;
}): Promise<{ ok: boolean; publicUrl: string; error?: string }> {
  const supabase = createAdminServerClient();
  const bucket = getDamBucket();

  const { error } = await supabase.storage.from(bucket).upload(input.path, input.buffer, {
    contentType: input.mimeType,
    cacheControl: input.cacheControl ?? "31536000",
    upsert: true,
  });

  if (error) {
    return { ok: false, publicUrl: "", error: error.message };
  }

  return { ok: true, publicUrl: publicUrlForPath(input.path) };
}

export async function deleteDamPaths(paths: string[]): Promise<void> {
  if (!paths.length) return;
  const supabase = createAdminServerClient();
  await supabase.storage.from(getDamBucket()).remove(paths);
}

export function inferMediaType(mime: string): DamMediaType | null {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return null;
}
