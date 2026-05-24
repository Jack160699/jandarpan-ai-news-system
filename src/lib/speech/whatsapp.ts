import { SITE_URL } from "@/lib/seo/constants";

/** Build absolute story URL for sharing */
export function buildArticleShareUrl(slugOrPath: string): string {
  const path = slugOrPath.startsWith("/")
    ? slugOrPath
    : `/story/${slugOrPath}`;
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }
  return `${SITE_URL}${path}`;
}

/** Native WhatsApp share — headline + URL */
export function buildWhatsAppShareUrl(headline: string, url: string): string {
  const text = `${headline.trim()}\n${url.trim()}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
