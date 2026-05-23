/** Responsive srcset hint for Next/Image — client-safe (no sharp) */

export function buildResponsiveSizes(): string {
  return "(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1200px";
}

import { optimizeCdnImageUrl } from "@/lib/news/images/cdn";

export { optimizeCdnImageUrl };

export function buildOpenGraphImageUrl(
  heroUrl: string,
  ogUrl?: string | null
): string {
  return ogUrl?.trim() || optimizeCdnImageUrl(heroUrl, 1200);
}
