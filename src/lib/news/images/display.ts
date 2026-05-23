/**
 * Client-safe display image resolution — always returns a valid URL
 * @deprecated Prefer resolveMedia from ./resolve-media for full fallback chain
 */

export {
  resolveCardImage,
  resolveDisplayImage,
  resolveMedia,
  type ResolvedMedia,
  type ResolveMediaInput,
} from "@/lib/news/images/resolve-media";

export { optimizeCdnUrl, optimizeImageUrlForNext, optimizeCdnImageUrl } from "@/lib/news/images/cdn";

export type { DisplayImageInput } from "@/lib/news/images/display-types";
