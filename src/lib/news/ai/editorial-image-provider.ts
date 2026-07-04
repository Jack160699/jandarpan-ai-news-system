/**
 * Image provider selection for editorial pipeline
 */

export type ImageProviderId = "openai";

export type ImageProviderConfig = {
  id: ImageProviderId;
  model: string;
  size: string;
  quality?: string;
  style?: string;
  timeoutMs: number;
  estimatedCostUsd: number;
  estimatedLatencyMs: number;
};

export type ProviderRecommendation = {
  current: ImageProviderId;
  recommended: ImageProviderId | "flux-pro" | "ideogram-v2";
  changeProvider: boolean;
  rationale: string;
  costComparison: string;
  latencyComparison: string;
  implementationEffort: string;
  expectedBenefits: string[];
};

export function selectImageProvider(): ImageProviderConfig {
  const model =
    process.env.NEWSROOM_IMAGE_MODEL?.trim() ||
    process.env.OPENAI_IMAGE_MODEL?.trim() ||
    "dall-e-3";

  const extra: Partial<ImageProviderConfig> = {};
  if (model.includes("dall-e-3")) {
    extra.quality = "standard";
    extra.style = "vivid";
  }

  return {
    id: "openai",
    model,
    size: model.includes("dall-e-3") ? "1792x1024" : "1024x1024",
    timeoutMs: Number(process.env.EDITORIAL_IMAGE_TIMEOUT_MS ?? 45_000),
    estimatedCostUsd: model.includes("dall-e-3") ? 0.04 : 0.02,
    estimatedLatencyMs: 18_000,
    ...extra,
  };
}

/**
 * Provider audit recommendation — do not switch providers in Phase 1.
 */
export function getProviderRecommendation(): ProviderRecommendation {
  return {
    current: "openai",
    recommended: "openai",
    changeProvider: false,
    rationale:
      "OpenAI DALL-E 3 with contextual symbolic prompts delivers sufficient quality for editorial illustration at acceptable cost. Alternative providers (Flux Pro via Replicate, Ideogram v2) excel at photorealism and text rendering — neither aligns with Jan Darpan's symbolic illustration policy and would add integration complexity without matching the editorial art direction.",
    costComparison:
      "DALL-E 3 standard 1792×1024 ≈ $0.04/image. Flux Pro ≈ $0.05–0.08/image. Ideogram v2 ≈ $0.06/image. At 200 images/day, DALL-E 3 ≈ $8/day vs $10–16/day for alternatives.",
    latencyComparison:
      "DALL-E 3 p50 ~15–20s. Flux Pro ~8–15s via Replicate. Ideogram ~10–18s. All meet the 20s target with current queue batching.",
    implementationEffort:
      "Flux Pro: 2–3 days (Replicate adapter, new quality gates, storage path changes). Ideogram: 2 days (API key, prompt tuning). Neither recommended until editorial policy shifts toward photorealism.",
    expectedBenefits: [
      "Current OpenAI path with improved contextual prompts expected to raise relevance 40–60% without provider change",
      "Consider Flux Pro only if policy shifts to photorealistic regional journalism",
      "Consider gpt-image-1 when OpenAI releases stable editorial-tier pricing",
    ],
  };
}

export function isImageProviderAvailable(): boolean {
  return (
    process.env.NEWSROOM_EDITORIAL_IMAGES === "true" &&
    Boolean(process.env.OPENAI_API_KEY?.trim())
  );
}
