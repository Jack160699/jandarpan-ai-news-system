/**
 * High-confidence district geo repair for generated_articles.
 * Only fills empty primary_district; never overwrites manual locks.
 */

import {
  classifyDistrictContent,
  type DistrictClassification,
} from "@/lib/regional/district-classifier";
import { tagGeoFromContent, type RegionalGeoMetadata } from "@/lib/regional/geo-tagging";

export const REPAIR_MIN_CONFIDENCE = 0.8;

export type RepairArticleRow = {
  id: string;
  headline?: string | null;
  summary?: string | null;
  article_body?: string | null;
  geo_metadata?: RegionalGeoMetadata | Record<string, unknown> | null;
  editorial_metadata?: Record<string, unknown> | null;
  region?: string | null;
  tags?: string[] | null;
};

export type DistrictRepairProposal = {
  id: string;
  apply: boolean;
  reason: string;
  classification: DistrictClassification;
  proposedGeo: RegionalGeoMetadata | null;
};

function hasManualLock(row: RepairArticleRow): boolean {
  const geo = (row.geo_metadata ?? {}) as Record<string, unknown>;
  if (geo.manual_lock === true) return true;
  const editorial = row.editorial_metadata ?? {};
  if (editorial.district_manual === true) return true;
  return false;
}

function existingPrimary(row: RepairArticleRow): string | null {
  const geo = (row.geo_metadata ?? {}) as Record<string, unknown>;
  if (typeof geo.primary_district === "string" && geo.primary_district.trim()) {
    return geo.primary_district.trim();
  }
  return null;
}

export function dryRunRepairArticles(
  rows: RepairArticleRow[]
): DistrictRepairProposal[] {
  return rows.map((row) => {
    if (hasManualLock(row)) {
      return {
        id: row.id,
        apply: false,
        reason: "manual_lock",
        classification: classifyDistrictContent({
          title: row.headline ?? "",
          body: [row.summary, row.article_body].filter(Boolean).join("\n"),
        }),
        proposedGeo: null,
      };
    }

    if (existingPrimary(row)) {
      return {
        id: row.id,
        apply: false,
        reason: "primary_already_set",
        classification: classifyDistrictContent({
          title: row.headline ?? "",
          body: [row.summary, row.article_body].filter(Boolean).join("\n"),
        }),
        proposedGeo: null,
      };
    }

    const classification = classifyDistrictContent({
      title: row.headline ?? "",
      body: [row.summary, row.article_body].filter(Boolean).join("\n"),
      region: row.region ?? null,
      category: row.tags?.[0] ?? null,
    });

    if (
      classification.kind !== "district" ||
      classification.confidence < REPAIR_MIN_CONFIDENCE ||
      !classification.districtSlug
    ) {
      return {
        id: row.id,
        apply: false,
        reason: `skip_${classification.kind}_conf_${classification.confidence}`,
        classification,
        proposedGeo: null,
      };
    }

    const proposedGeo = tagGeoFromContent({
      title: row.headline ?? "",
      body: [row.summary, row.article_body].filter(Boolean).join("\n"),
      region: row.region ?? null,
      category: row.tags?.[0] ?? null,
    });

    return {
      id: row.id,
      apply: true,
      reason: "high_confidence_district_fill",
      classification,
      proposedGeo,
    };
  });
}

/**
 * Apply repairs via a caller-supplied updater (keeps this module DB-agnostic).
 * Only writes when confidence ≥ 0.8, kind=district, existing primary empty,
 * and no manual_lock / district_manual.
 */
export async function applyHighConfidenceRepairs(
  rows: RepairArticleRow[],
  updateGeo: (
    id: string,
    geo: RegionalGeoMetadata
  ) => Promise<{ ok: boolean; error?: string }>
): Promise<{
  proposed: number;
  applied: number;
  skipped: number;
  errors: string[];
}> {
  const proposals = dryRunRepairArticles(rows);
  let applied = 0;
  let skipped = 0;
  const errors: string[] = [];
  let proposed = 0;

  for (const p of proposals) {
    if (!p.apply || !p.proposedGeo) {
      skipped++;
      continue;
    }
    proposed++;
    try {
      const result = await updateGeo(p.id, p.proposedGeo);
      if (result.ok) applied++;
      else {
        skipped++;
        if (result.error) errors.push(`${p.id}:${result.error}`);
      }
    } catch (err) {
      skipped++;
      errors.push(
        `${p.id}:${err instanceof Error ? err.message : "update_failed"}`
      );
    }
  }

  return { proposed, applied, skipped, errors };
}
