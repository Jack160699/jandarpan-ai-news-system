/**
 * DAM database operations
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import type {
  DamAsset,
  DamCopyright,
  DamFolder,
  DamLibrarySnapshot,
  DamRecommendation,
  DamSearchFilters,
  DamVariant,
} from "@/lib/dam/types";
import { buildDamRecommendations } from "@/lib/dam/recommendations";

function mapAsset(row: Record<string, unknown>, variants: DamVariant[] = []): DamAsset {
  return {
    id: row.id as string,
    folderId: (row.folder_id as string) ?? null,
    name: row.name as string,
    mediaType: row.media_type as DamAsset["mediaType"],
    mimeType: row.mime_type as string,
    sizeBytes: Number(row.size_bytes),
    storagePath: row.storage_path as string,
    publicUrl: row.public_url as string,
    contentHash: row.content_hash as string,
    width: row.width != null ? Number(row.width) : null,
    height: row.height != null ? Number(row.height) : null,
    durationSec: row.duration_sec != null ? Number(row.duration_sec) : null,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    copyright: (row.copyright ?? {}) as DamCopyright,
    aiTags: (row.ai_tags as string[]) ?? [],
    aiObjects: (row.ai_objects as string[]) ?? [],
    aiOcr: (row.ai_ocr as string) ?? null,
    aiCaption: (row.ai_caption as string) ?? null,
    aiFaces: (row.ai_faces as DamAsset["aiFaces"]) ?? [],
    duplicateOf: (row.duplicate_of as string) ?? null,
    watermarkApplied: Boolean(row.watermark_applied),
    cdnOptimized: Boolean(row.cdn_optimized),
    variants,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function listDamLibrary(
  tenantId: string,
  filters: DamSearchFilters = {}
): Promise<DamLibrarySnapshot> {
  const empty: DamLibrarySnapshot = {
    fetchedAt: new Date().toISOString(),
    folders: [],
    assets: [],
    total: 0,
    counts: { image: 0, video: 0, audio: 0 },
    recommendations: [],
  };

  if (!isSupabaseConfigured()) return empty;

  const supabase = createAdminServerClient();
  const limit = filters.limit ?? 48;
  const offset = filters.offset ?? 0;

  const { data: folders } = await supabase
    .from("dam_folders")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name");

  let assetsQuery = supabase
    .from("dam_assets")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.folderId) {
    assetsQuery = assetsQuery.eq("folder_id", filters.folderId);
  }
  if (filters.mediaType && filters.mediaType !== "all") {
    assetsQuery = assetsQuery.eq("media_type", filters.mediaType);
  }
  if (filters.tag) {
    assetsQuery = assetsQuery.contains("ai_tags", [filters.tag]);
  }
  if (filters.q?.trim()) {
    const q = filters.q.trim().replace(/[%_]/g, "");
    assetsQuery = assetsQuery.or(
      `name.ilike.%${q}%,ai_caption.ilike.%${q}%,ai_ocr.ilike.%${q}%`
    );
  }

  const { data: assetRows, count } = await assetsQuery;
  const assetIds = (assetRows ?? []).map((r) => r.id);

  const { data: variantRows } = assetIds.length
    ? await supabase.from("dam_asset_variants").select("*").in("asset_id", assetIds)
    : { data: [] };

  const variantsByAsset = new Map<string, DamVariant[]>();
  for (const v of variantRows ?? []) {
    const list = variantsByAsset.get(v.asset_id) ?? [];
    list.push({
      id: v.id,
      variantKey: v.variant_key,
      width: v.width,
      height: v.height,
      publicUrl: v.public_url,
      sizeBytes: Number(v.size_bytes),
    });
    variantsByAsset.set(v.asset_id, list);
  }

  const assets = (assetRows ?? []).map((r) =>
    mapAsset(r, variantsByAsset.get(r.id) ?? [])
  );

  const counts = { image: 0, video: 0, audio: 0 };
  for (const a of assets) counts[a.mediaType] += 1;

  const folderList: DamFolder[] = (folders ?? []).map((f) => ({
    id: f.id,
    parentId: f.parent_id,
    name: f.name,
    slug: f.slug,
  }));

  const recommendations = buildDamRecommendations(assets);

  return {
    fetchedAt: new Date().toISOString(),
    folders: folderList,
    assets,
    total: count ?? assets.length,
    counts,
    recommendations,
  };
}

export async function insertDamAsset(input: {
  tenantId: string;
  folderId?: string | null;
  name: string;
  mediaType: DamAsset["mediaType"];
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  publicUrl: string;
  contentHash: string;
  width?: number | null;
  height?: number | null;
  durationSec?: number | null;
  metadata?: Record<string, unknown>;
  copyright?: DamCopyright;
  aiTags?: string[];
  aiObjects?: string[];
  aiOcr?: string | null;
  aiCaption?: string | null;
  aiFaces?: DamAsset["aiFaces"];
  duplicateOf?: string | null;
  watermarkApplied?: boolean;
  cdnOptimized?: boolean;
  createdBy?: string | null;
  variants?: Array<{
    variantKey: string;
    width: number;
    height: number;
    sizeBytes: number;
    storagePath: string;
    publicUrl: string;
  }>;
}): Promise<DamAsset | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createAdminServerClient();

  const { data: row, error } = await supabase
    .from("dam_assets")
    .insert({
      tenant_id: input.tenantId,
      folder_id: input.folderId ?? null,
      name: input.name,
      media_type: input.mediaType,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
      storage_path: input.storagePath,
      public_url: input.publicUrl,
      content_hash: input.contentHash,
      width: input.width ?? null,
      height: input.height ?? null,
      duration_sec: input.durationSec ?? null,
      metadata: input.metadata ?? {},
      copyright: input.copyright ?? {},
      ai_tags: input.aiTags ?? [],
      ai_objects: input.aiObjects ?? [],
      ai_ocr: input.aiOcr ?? null,
      ai_caption: input.aiCaption ?? null,
      ai_faces: input.aiFaces ?? [],
      duplicate_of: input.duplicateOf ?? null,
      watermark_applied: input.watermarkApplied ?? false,
      cdn_optimized: input.cdnOptimized ?? false,
      created_by: input.createdBy ?? null,
    })
    .select("*")
    .single();

  if (error || !row) return null;

  const variants: DamVariant[] = [];
  for (const v of input.variants ?? []) {
    const { data: vr } = await supabase
      .from("dam_asset_variants")
      .insert({
        asset_id: row.id,
        variant_key: v.variantKey,
        width: v.width,
        height: v.height,
        size_bytes: v.sizeBytes,
        storage_path: v.storagePath,
        public_url: v.publicUrl,
      })
      .select("*")
      .single();
    if (vr) {
      variants.push({
        id: vr.id,
        variantKey: vr.variant_key,
        width: vr.width,
        height: vr.height,
        publicUrl: vr.public_url,
        sizeBytes: Number(vr.size_bytes),
      });
    }
  }

  return mapAsset(row, variants);
}

export async function updateDamAsset(
  tenantId: string,
  assetId: string,
  patch: Partial<{
    name: string;
    folderId: string | null;
    copyright: DamCopyright;
    aiTags: string[];
  }>
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const supabase = createAdminServerClient();
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name) body.name = patch.name;
  if (patch.folderId !== undefined) body.folder_id = patch.folderId;
  if (patch.copyright) body.copyright = patch.copyright;
  if (patch.aiTags) body.ai_tags = patch.aiTags;

  const { error } = await supabase
    .from("dam_assets")
    .update(body)
    .eq("id", assetId)
    .eq("tenant_id", tenantId);

  return !error;
}

export async function deleteDamAsset(
  tenantId: string,
  assetId: string
): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createAdminServerClient();
  const { data: asset } = await supabase
    .from("dam_assets")
    .select("storage_path")
    .eq("id", assetId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const { data: variants } = await supabase
    .from("dam_asset_variants")
    .select("storage_path")
    .eq("asset_id", assetId);

  const paths = [
    asset?.storage_path,
    ...(variants ?? []).map((v) => v.storage_path),
  ].filter(Boolean) as string[];

  await supabase.from("dam_assets").delete().eq("id", assetId).eq("tenant_id", tenantId);

  return paths;
}

export async function createDamFolder(input: {
  tenantId: string;
  name: string;
  parentId?: string | null;
}): Promise<DamFolder | null> {
  if (!isSupabaseConfigured()) return null;

  const slug = input.name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 48);

  const supabase = createAdminServerClient();
  const { data, error } = await supabase
    .from("dam_folders")
    .insert({
      tenant_id: input.tenantId,
      parent_id: input.parentId ?? null,
      name: input.name,
      slug: slug || "folder",
    })
    .select("*")
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    parentId: data.parent_id,
    name: data.name,
    slug: data.slug,
  };
}

export async function getDamAsset(
  tenantId: string,
  assetId: string
): Promise<DamAsset | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createAdminServerClient();
  const { data: row } = await supabase
    .from("dam_assets")
    .select("*")
    .eq("id", assetId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!row) return null;

  const { data: variants } = await supabase
    .from("dam_asset_variants")
    .select("*")
    .eq("asset_id", assetId);

  return mapAsset(
    row,
    (variants ?? []).map((v) => ({
      id: v.id,
      variantKey: v.variant_key,
      width: v.width,
      height: v.height,
      publicUrl: v.public_url,
      sizeBytes: Number(v.size_bytes),
    }))
  );
}

export type { DamRecommendation };
