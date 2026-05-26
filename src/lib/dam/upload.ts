/**
 * DAM upload orchestration
 */

import { randomUUID } from "crypto";
import { analyzeAssetWithAi } from "@/lib/dam/ai-analysis";
import { contentHash, findDuplicateAsset } from "@/lib/dam/duplicates";
import { processImageBuffer } from "@/lib/dam/image-pipeline";
import { insertDamAsset } from "@/lib/dam/store";
import {
  damStoragePath,
  inferMediaType,
  uploadDamBuffer,
} from "@/lib/dam/storage";
import type { DamCopyright } from "@/lib/dam/types";

export type UploadDamFileResult = {
  ok: boolean;
  asset?: Awaited<ReturnType<typeof insertDamAsset>>;
  duplicateOf?: { id: string; name: string; publicUrl: string };
  error?: string;
};

export async function uploadDamFile(input: {
  tenantId: string;
  userId?: string | null;
  folderId?: string | null;
  filename: string;
  mimeType: string;
  buffer: Buffer;
  copyright?: DamCopyright;
  applyWatermark?: boolean;
  runAi?: boolean;
}): Promise<UploadDamFileResult> {
  const mediaType = inferMediaType(input.mimeType);
  if (!mediaType) {
    return { ok: false, error: "unsupported_media_type" };
  }

  const hash = contentHash(input.buffer);
  const duplicate = await findDuplicateAsset({
    tenantId: input.tenantId,
    hash,
  });

  const assetId = randomUUID();
  const watermarkText = input.applyWatermark
    ? process.env.NEWSROOM_DAM_WATERMARK ?? "Jan Darpan"
    : undefined;

  let aiAnalysis = {
    tags: [] as string[],
    objects: [] as string[],
    ocr: null as string | null,
    caption: null as string | null,
    faces: [] as Awaited<ReturnType<typeof analyzeAssetWithAi>>["faces"],
  };

  if (mediaType === "image") {
    const processed = await processImageBuffer(input.buffer, {
      watermarkText,
    });

    const mainPath = damStoragePath({
      tenantId: input.tenantId,
      assetId,
      filename: `${input.filename.replace(/\.[^.]+$/, "")}.webp`,
    });

    const mainUp = await uploadDamBuffer({
      path: mainPath,
      buffer: processed.original,
      mimeType: processed.mimeType,
    });

    if (!mainUp.ok) {
      return { ok: false, error: mainUp.error ?? "upload_failed" };
    }

    const variantRecords: Array<{
      variantKey: string;
      width: number;
      height: number;
      sizeBytes: number;
      storagePath: string;
      publicUrl: string;
    }> = [];

    for (const v of processed.variants) {
      const vPath = damStoragePath({
        tenantId: input.tenantId,
        assetId,
        filename: `${v.key}.webp`,
        variant: v.key,
      });
      const vUp = await uploadDamBuffer({
        path: vPath,
        buffer: v.buffer,
        mimeType: v.mimeType,
      });
      if (vUp.ok) {
        variantRecords.push({
          variantKey: v.key,
          width: v.width,
          height: v.height,
          sizeBytes: v.buffer.length,
          storagePath: vPath,
          publicUrl: vUp.publicUrl,
        });
      }
    }

    if (input.runAi !== false) {
      aiAnalysis = await analyzeAssetWithAi({
        mediaType: "image",
        mimeType: processed.mimeType,
        name: input.filename,
        imageBase64: processed.original.toString("base64"),
      });
    }

    const asset = await insertDamAsset({
      tenantId: input.tenantId,
      folderId: input.folderId,
      name: input.filename,
      mediaType: "image",
      mimeType: processed.mimeType,
      sizeBytes: processed.original.length,
      storagePath: mainPath,
      publicUrl: mainUp.publicUrl,
      contentHash: hash,
      width: processed.width,
      height: processed.height,
      metadata: processed.metadata,
      copyright: input.copyright ?? {},
      aiTags: aiAnalysis.tags,
      aiObjects: aiAnalysis.objects,
      aiOcr: aiAnalysis.ocr,
      aiCaption: aiAnalysis.caption,
      aiFaces: aiAnalysis.faces,
      duplicateOf: duplicate?.id ?? null,
      watermarkApplied: Boolean(watermarkText),
      cdnOptimized: true,
      createdBy: input.userId,
      variants: variantRecords,
    });

    if (!asset) return { ok: false, error: "db_insert_failed" };

    return {
      ok: true,
      asset,
      duplicateOf: duplicate ?? undefined,
    };
  }

  const ext = input.filename.split(".").pop() ?? "bin";
  const path = damStoragePath({
    tenantId: input.tenantId,
    assetId,
    filename: `${input.filename.replace(/\.[^.]+$/, "")}.${ext}`,
  });

  const up = await uploadDamBuffer({
    path,
    buffer: input.buffer,
    mimeType: input.mimeType,
  });

  if (!up.ok) return { ok: false, error: up.error ?? "upload_failed" };

  if (input.runAi !== false) {
    aiAnalysis = await analyzeAssetWithAi({
      mediaType,
      mimeType: input.mimeType,
      name: input.filename,
    });
  }

  const asset = await insertDamAsset({
    tenantId: input.tenantId,
    folderId: input.folderId,
    name: input.filename,
    mediaType,
    mimeType: input.mimeType,
    sizeBytes: input.buffer.length,
    storagePath: path,
    publicUrl: up.publicUrl,
    contentHash: hash,
    metadata: { originalName: input.filename },
    copyright: input.copyright ?? {},
    aiTags: aiAnalysis.tags,
    aiObjects: aiAnalysis.objects,
    aiOcr: aiAnalysis.ocr,
    aiCaption: aiAnalysis.caption,
    aiFaces: aiAnalysis.faces,
    duplicateOf: duplicate?.id ?? null,
    cdnOptimized: false,
    createdBy: input.userId,
  });

  if (!asset) return { ok: false, error: "db_insert_failed" };

  return { ok: true, asset, duplicateOf: duplicate ?? undefined };
}
