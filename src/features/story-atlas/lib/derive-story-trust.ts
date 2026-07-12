import type { StoryIntelligenceVm } from "@/lib/story/story-intelligence";

export type StoryTrustSignal =
  | { kind: "human-reviewed" }
  | { kind: "verified" }
  | { kind: "ai-reviewed" }
  | { kind: "live" }
  | { kind: "source-count"; count: number }
  | { kind: "updated"; label: string }
  | { kind: "district"; label: string };

const PRIORITY: StoryTrustSignal["kind"][] = [
  "human-reviewed",
  "verified",
  "ai-reviewed",
  "live",
  "source-count",
  "updated",
  "district",
];

const MAX_ITEMS = 3;

type DeriveStoryTrustInput = {
  intelligence: Pick<
    StoryIntelligenceVm,
    "trust" | "attribution" | "reader" | "knowledge"
  >;
  isLive: boolean;
  suppressLive?: boolean;
};

export function deriveStoryTrustSignals({
  intelligence,
  isLive,
  suppressLive = false,
}: DeriveStoryTrustInput): StoryTrustSignal[] {
  const { trust, attribution, reader, knowledge } = intelligence;
  const candidates: StoryTrustSignal[] = [];

  const humanReviewed =
    trust.reviewStatus?.toLowerCase().includes("review") ||
    trust.aiDisclosureLines.some((line) => /reviewed|workflow/i.test(line)) ||
    trust.badges.some((badge) => /reviewed|editorial/i.test(badge.label));

  if (humanReviewed) candidates.push({ kind: "human-reviewed" });

  if (trust.trustLevel || trust.verificationState) {
    candidates.push({ kind: "verified" });
  }

  const aiReviewed =
    trust.aiDisclosureLines.length > 0 &&
    !humanReviewed &&
    !trust.trustLevel;
  if (aiReviewed) candidates.push({ kind: "ai-reviewed" });

  if (!suppressLive && isLive) {
    candidates.push({ kind: "live" });
  }

  if (attribution.sourceCount > 0) {
    candidates.push({ kind: "source-count", count: attribution.sourceCount });
  }

  if (trust.showUpdateHistory && reader.updatedAtLabel) {
    candidates.push({ kind: "updated", label: reader.updatedAtLabel });
  } else if (reader.publishedAtLabel) {
    candidates.push({
      kind: "updated",
      label: reader.updatedAtLabel ?? reader.publishedAtLabel,
    });
  }

  const district = knowledge.district?.trim();
  if (district) {
    candidates.push({ kind: "district", label: district });
  }

  const selected: StoryTrustSignal[] = [];
  const used = new Set<StoryTrustSignal["kind"]>();

  for (const kind of PRIORITY) {
    if (selected.length >= MAX_ITEMS) break;
    const match = candidates.find((item) => item.kind === kind);
    if (!match || used.has(kind)) continue;
    used.add(kind);
    selected.push(match);
  }

  return selected;
}
