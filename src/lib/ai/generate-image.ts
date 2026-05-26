import { AiServiceError, generateCoverImage, isOpenAiConfigured } from "./openai";
import { buildCoverImagePrompt } from "./prompts";
import type { GenerateImageResult } from "./types";

export async function generateStoryCoverImage(input: {
  headline: string;
  summary: string;
}): Promise<GenerateImageResult> {
  if (!isOpenAiConfigured()) {
    return { ok: false, error: "ai_unavailable" };
  }

  const headline = input.headline.trim();
  const summary = input.summary.trim();
  if (!headline) {
    return { ok: false, error: "missing_headline" };
  }

  try {
    const imageUrl = await generateCoverImage({
      prompt: buildCoverImagePrompt({ headline, summary }),
    });
    return { ok: true, imageUrl };
  } catch (err) {
    if (err instanceof AiServiceError) {
      return { ok: false, error: err.code };
    }
    return { ok: false, error: "ai_image_failed" };
  }
}
