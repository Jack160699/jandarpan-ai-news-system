import type { DamAsset, DamRecommendation } from "@/lib/dam/types";

export function buildDamRecommendations(assets: DamAsset[]): DamRecommendation[] {
  const recs: DamRecommendation[] = [];
  let n = 0;

  const recent = [...assets]
    .filter((a) => a.mediaType === "image")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 3);

  for (const a of recent) {
    recs.push({
      id: `rec-${++n}`,
      assetId: a.id,
      headline: a.name,
      reason: "Recently uploaded — ready for story assignment",
      thumbnailUrl: a.variants.find((v) => v.variantKey === "thumb")?.publicUrl ?? a.publicUrl,
    });
  }

  const untagged = assets.filter((a) => !a.aiTags.length).slice(0, 2);
  for (const a of untagged) {
    recs.push({
      id: `rec-${++n}`,
      assetId: a.id,
      headline: a.name,
      reason: "Run AI tagging for searchability",
      thumbnailUrl: a.publicUrl,
    });
  }

  const dupes = assets.filter((a) => a.duplicateOf).slice(0, 2);
  for (const a of dupes) {
    recs.push({
      id: `rec-${++n}`,
      assetId: a.id,
      headline: a.name,
      reason: "Possible duplicate — review copyright",
      thumbnailUrl: a.publicUrl,
    });
  }

  return recs.slice(0, 6);
}
