/**
 * Digital Asset Management — shared types
 */

export type DamMediaType = "image" | "video" | "audio";

export type DamFolder = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  assetCount?: number;
};

export type DamCopyright = {
  holder?: string;
  license?: string;
  source?: string;
  expiresAt?: string | null;
  notes?: string;
};

export type DamFaceGroup = {
  groupId: string;
  label: string;
  count: number;
};

export type DamVariant = {
  id: string;
  variantKey: string;
  width: number | null;
  height: number | null;
  publicUrl: string;
  sizeBytes: number;
};

export type DamAsset = {
  id: string;
  folderId: string | null;
  name: string;
  mediaType: DamMediaType;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  publicUrl: string;
  contentHash: string;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  metadata: Record<string, unknown>;
  copyright: DamCopyright;
  aiTags: string[];
  aiObjects: string[];
  aiOcr: string | null;
  aiCaption: string | null;
  aiFaces: DamFaceGroup[];
  duplicateOf: string | null;
  watermarkApplied: boolean;
  cdnOptimized: boolean;
  variants: DamVariant[];
  createdAt: string;
  updatedAt: string;
};

export type DamSearchFilters = {
  q?: string;
  mediaType?: DamMediaType | "all";
  folderId?: string | null;
  tag?: string;
  limit?: number;
  offset?: number;
};

export type DamLibrarySnapshot = {
  fetchedAt: string;
  folders: DamFolder[];
  assets: DamAsset[];
  total: number;
  counts: { image: number; video: number; audio: number };
  recommendations: DamRecommendation[];
};

export type DamRecommendation = {
  id: string;
  assetId: string;
  headline: string;
  reason: string;
  thumbnailUrl: string;
};
