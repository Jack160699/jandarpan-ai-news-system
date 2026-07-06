/**
 * OpenAI pricing (USD per 1M tokens) — July 2025 reference rates for cost estimation.
 * Image/TTS use per-unit pricing.
 */

type ModelRates = {
  inputPer1M: number;
  outputPer1M: number;
  cachedInputPer1M?: number;
};

const CHAT_RATES: Record<string, ModelRates> = {
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6, cachedInputPer1M: 0.075 },
  "gpt-4o": { inputPer1M: 2.5, outputPer1M: 10, cachedInputPer1M: 1.25 },
  "gpt-4.1-mini": { inputPer1M: 0.4, outputPer1M: 1.6, cachedInputPer1M: 0.1 },
  "gpt-4.1": { inputPer1M: 2.0, outputPer1M: 8.0, cachedInputPer1M: 0.5 },
  "o3-mini": { inputPer1M: 1.1, outputPer1M: 4.4 },
  "o3": { inputPer1M: 10, outputPer1M: 40 },
  "o4-mini": { inputPer1M: 1.1, outputPer1M: 4.4 },
};

const EMBEDDING_RATES: Record<string, number> = {
  "text-embedding-3-small": 0.02,
  "text-embedding-3-large": 0.13,
  "text-embedding-ada-002": 0.1,
};

/** Per-image USD (standard quality) */
const IMAGE_RATES: Record<string, Record<string, number>> = {
  "dall-e-3": {
    "1024x1024": 0.04,
    "1792x1024": 0.08,
    "1024x1792": 0.08,
  },
  "dall-e-2": {
    "1024x1024": 0.02,
    "512x512": 0.018,
    "256x256": 0.016,
  },
};

const TTS_RATES: Record<string, number> = {
  "tts-1": 15 / 1_000_000,
  "tts-1-hd": 30 / 1_000_000,
};

function normalizeModel(model: string): string {
  const m = model.trim().toLowerCase();
  if (m.startsWith("openai/")) return m.slice("openai/".length);
  return m;
}

export function computeChatCostUsd(input: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
}): number {
  const model = normalizeModel(input.model);
  const rates = CHAT_RATES[model] ?? CHAT_RATES["gpt-4o-mini"]!;
  const cached = input.cachedTokens ?? 0;
  const uncachedInput = Math.max(0, input.inputTokens - cached);
  const cachedRate = rates.cachedInputPer1M ?? rates.inputPer1M * 0.5;

  const inputCost =
    (uncachedInput / 1_000_000) * rates.inputPer1M +
    (cached / 1_000_000) * cachedRate;
  const outputCost = (input.outputTokens / 1_000_000) * rates.outputPer1M;

  return roundUsd(inputCost + outputCost);
}

export function computeEmbeddingCostUsd(input: {
  model: string;
  inputTokens: number;
}): number {
  const model = normalizeModel(input.model);
  const rate = EMBEDDING_RATES[model] ?? EMBEDDING_RATES["text-embedding-3-small"]!;
  return roundUsd((input.inputTokens / 1_000_000) * rate);
}

export function computeImageCostUsd(input: {
  model: string;
  size?: string;
  count?: number;
}): number {
  const model = normalizeModel(input.model);
  const size = input.size ?? "1024x1024";
  const count = input.count ?? 1;
  const modelRates = IMAGE_RATES[model] ?? IMAGE_RATES["dall-e-3"]!;
  const unit = modelRates[size] ?? modelRates["1024x1024"] ?? 0.04;
  return roundUsd(unit * count);
}

export function computeTtsCostUsd(input: {
  model: string;
  charCount: number;
}): number {
  const model = normalizeModel(input.model);
  const rate = TTS_RATES[model] ?? TTS_RATES["tts-1"]!;
  return roundUsd(input.charCount * rate);
}

export function estimateCostUsd(input: {
  endpoint: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
  imageSize?: string;
  imageCount?: number;
  charCount?: number;
}): number {
  switch (input.endpoint) {
    case "embeddings":
      return computeEmbeddingCostUsd({
        model: input.model,
        inputTokens: input.inputTokens ?? 0,
      });
    case "images.generations":
      return computeImageCostUsd({
        model: input.model,
        size: input.imageSize,
        count: input.imageCount,
      });
    case "audio.speech":
      return computeTtsCostUsd({
        model: input.model,
        charCount: input.charCount ?? 0,
      });
    default:
      return computeChatCostUsd({
        model: input.model,
        inputTokens: input.inputTokens ?? 0,
        outputTokens: input.outputTokens ?? 0,
        cachedTokens: input.cachedTokens,
      });
  }
}

function roundUsd(n: number): number {
  return Math.round(n * 1e8) / 1e8;
}

export function isExpensiveModel(model: string): boolean {
  const m = normalizeModel(model);
  return (
    m.startsWith("o3") ||
    m.startsWith("o4") ||
    m === "gpt-4o" ||
    m === "gpt-4.1" ||
    m.includes("dall-e-3")
  );
}
