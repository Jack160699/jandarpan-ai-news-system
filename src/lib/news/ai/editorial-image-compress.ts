/**
 * Editorial image compression — CDN-ready WebP variants (hero + OpenGraph)
 */

import sharp from "sharp";

export type CompressedImageVariants = {
  hero: Buffer;
  og: Buffer;
  heroWidth: number;
  heroHeight: number;
  ogWidth: number;
  ogHeight: number;
  format: "webp";
};

const HERO_MAX_WIDTH = 1200;
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const WEBP_QUALITY = 82;

export async function compressEditorialImage(
  input: Buffer
): Promise<CompressedImageVariants> {
  const base = sharp(input).rotate();

  const hero = await base
    .clone()
    .resize(HERO_MAX_WIDTH, undefined, {
      withoutEnlargement: true,
      fit: "inside",
    })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toBuffer();

  const heroMeta = await sharp(hero).metadata();

  const og = await base
    .clone()
    .resize(OG_WIDTH, OG_HEIGHT, { fit: "cover", position: "centre" })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toBuffer();

  return {
    hero,
    og,
    heroWidth: heroMeta.width ?? HERO_MAX_WIDTH,
    heroHeight: heroMeta.height ?? 675,
    ogWidth: OG_WIDTH,
    ogHeight: OG_HEIGHT,
    format: "webp",
  };
}

/** CDN query hints for external fallback URLs (Unsplash etc.) */
export function optimizeCdnImageUrl(url: string, width = 1200): string {
  if (!url.startsWith("http")) return url;

  try {
    if (url.includes("images.unsplash.com")) {
      const u = new URL(url);
      u.searchParams.set("auto", "format");
      u.searchParams.set("fit", "crop");
      u.searchParams.set("w", String(width));
      u.searchParams.set("q", "80");
      return u.toString();
    }

    const u = new URL(url);
    if (!u.searchParams.has("w")) {
      u.searchParams.set("w", String(width));
    }
    return u.toString();
  } catch {
    return url;
  }
}

export function buildOpenGraphImageUrl(
  heroUrl: string,
  ogUrl?: string | null
): string {
  return ogUrl?.trim() || optimizeCdnImageUrl(heroUrl, 1200);
}
