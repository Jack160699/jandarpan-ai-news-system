/**
 * Editorial images - the light, native-dependency-free half of the API.
 *
 * Publication is independent of images: the generation path only needs to *queue* an image job and to judge
 * whether a source image URL is editorially eligible. Rendering, quality scoring and compression (which need
 * `sharp`, a native module) live in generate-editorial-image.ts and run on the Vercel image lane only.
 * Keeping these functions here lets the generation path (including the Supabase Edge worker) avoid importing
 * anything that cannot run outside Node. generate-editorial-image.ts re-exports them, so existing imports keep working.
 */

import { logEditorialImageAnalytics } from "@/lib/news/ai/editorial-image-analytics";
import { isImageProviderAvailable } from "@/lib/news/ai/editorial-image-provider";
import { enqueueEditorialImageDetailed } from "@/lib/news/ai/editorial-image-queue";
import { isDisplayableImage } from "@/lib/news/images/validate";

export function isEditorialImageGenerationEnabled(): boolean {
  return isImageProviderAvailable();
}

export function isEditoriallyEligibleSourceImageUrl(url: string | null): boolean {
  if (!url || !isDisplayableImage(url)) return false;
  const lower = url.toLowerCase();
  return ![
    "images.unsplash.com",
    "plus.unsplash.com",
    "source.unsplash.com",
    "pexels.com",
    "pixabay.com",
  ].some((host) => lower.includes(host));
}

export async function queueEditorialImageForArticle(
  generatedArticleId: string,
  options?: { force?: boolean; priority?: number; customPrompt?: string }
): Promise<{ enqueued: boolean; reason: string }> {
  const result = await enqueueEditorialImageDetailed(generatedArticleId, {
    force: options?.force,
    priority: options?.priority,
    customPrompt: options?.customPrompt,
  });
  logEditorialImageAnalytics({
    event: "resolve_start",
    articleId: generatedArticleId,
    metadata: {
      enqueued: result.enqueued,
      reason: result.reason,
      aiEnabled: isEditorialImageGenerationEnabled(),
    },
  });
  return { enqueued: result.enqueued, reason: result.reason };
}

/**
 * Clean editorial policy: Never assign generic Unsplash/stock placeholders to news articles.
 * Returns empty string - live candidates must have genuine source photojournalism.
 */
export function initialHeroPlaceholder(
  _category: string,
  _region?: string | null
): string {
  return "";
}
