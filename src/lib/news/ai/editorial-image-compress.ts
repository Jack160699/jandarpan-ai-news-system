/**
 * Editorial image compression — CDN-ready WebP variants (hero + OpenGraph)
 */

import sharp from "sharp";

export type CompressedImageVariants = {
  hero: Buffer;
  og: Buffer;
  mobile: Buffer;
  heroWidth: number;
  heroHeight: number;
  ogWidth: number;
  ogHeight: number;
  mobileWidth: number;
  mobileHeight: number;
  format: "webp";
};

const HERO_MAX_WIDTH = 1200;
const MOBILE_WIDTH = 640;
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const WEBP_QUALITY = 82;
const CACHE_CONTROL = "public, max-age=31536000, immutable";

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

  const mobile = await base
    .clone()
    .resize(MOBILE_WIDTH, undefined, {
      withoutEnlargement: true,
      fit: "inside",
    })
    .webp({ quality: 78, effort: 4 })
    .toBuffer();

  const mobileMeta = await sharp(mobile).metadata();

  return {
    hero,
    og,
    mobile,
    heroWidth: heroMeta.width ?? HERO_MAX_WIDTH,
    heroHeight: heroMeta.height ?? 675,
    ogWidth: OG_WIDTH,
    ogHeight: OG_HEIGHT,
    mobileWidth: mobileMeta.width ?? MOBILE_WIDTH,
    mobileHeight: mobileMeta.height ?? 360,
    format: "webp",
  };
}

export function getImageCacheControl(): string {
  return CACHE_CONTROL;
}

export {
  buildOpenGraphImageUrl,
  buildResponsiveSizes,
  optimizeCdnImageUrl,
} from "@/lib/news/images/responsive-sizes";
