/** Inline SVG used when an editor embed fails to load (no network request). */
export const EDITOR_IMAGE_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
      <rect width="100%" height="100%" fill="#1a1d24"/>
      <rect x="240" y="110" width="160" height="120" rx="8" fill="none" stroke="#6b7280" stroke-width="2"/>
      <circle cx="280" cy="150" r="12" fill="#6b7280"/>
      <path d="M250 210l40-35 30 28 35-45 45 52H250z" fill="#4b5563"/>
      <text x="50%" y="280" text-anchor="middle" fill="#9ca3af" font-family="Arial,sans-serif" font-size="16">Image unavailable</text>
    </svg>`
  );

/** Hard-coded URLs that consistently 404 in editor embeds. */
const KNOWN_BROKEN_EDITOR_IMAGE_RE =
  /photo-1529107386315-e1a269ed48e0/i;

export function shouldUseEditorImagePlaceholder(
  url: string | null | undefined
): boolean {
  if (!url?.trim()) return true;
  return KNOWN_BROKEN_EDITOR_IMAGE_RE.test(url.toLowerCase());
}

export function applyEditorImageFallback(img: HTMLImageElement): void {
  if (img.dataset.fallbackApplied === "1") return;
  img.dataset.fallbackApplied = "1";
  img.onerror = null;
  img.removeAttribute("srcset");
  img.src = EDITOR_IMAGE_PLACEHOLDER;
  img.classList.add("jd-editor-image--fallback");
}

export function wireEditorImageFallbacks(root: ParentNode | null | undefined): void {
  if (!root) return;
  root.querySelectorAll("img").forEach((node) => {
    const img = node as HTMLImageElement;
    if (img.dataset.fallbackWired === "1") return;
    img.dataset.fallbackWired = "1";
    img.addEventListener("error", () => applyEditorImageFallback(img), { once: true });
  });
}
