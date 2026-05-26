import type { EditorDraftPayload, EditorVersionSnapshot } from "@/lib/editorial-editor/types";

const MAX_VERSIONS = 12;

export function appendEditorVersion(
  metadata: Record<string, unknown> | null,
  snapshot: Omit<EditorVersionSnapshot, "id">
): EditorVersionSnapshot[] {
  const existing = Array.isArray(metadata?.editor_versions)
    ? (metadata!.editor_versions as EditorVersionSnapshot[])
    : [];

  const entry: EditorVersionSnapshot = {
    id: crypto.randomUUID(),
    ...snapshot,
  };

  return [entry, ...existing].slice(0, MAX_VERSIONS);
}

export function buildDraftPayload(input: {
  article: {
    slug: string;
    headline: string;
    summary: string | null;
    hero_image_url: string | null;
    seo_title: string | null;
    seo_description: string | null;
    language: string | null;
    tags: string[] | null;
    published_at: string | null;
    translations: Record<string, unknown> | null;
    editorial_metadata: Record<string, unknown> | null;
  };
  bodyMarkdown: string;
  seoExtras?: Record<string, unknown>;
}): EditorDraftPayload {
  const meta = { ...(input.article.editorial_metadata ?? {}) };
  if (input.seoExtras) {
    Object.assign(meta, input.seoExtras);
  }

  return {
    slug: input.article.slug,
    headline: input.article.headline,
    summary: input.article.summary ?? "",
    article_body: input.bodyMarkdown,
    hero_image_url: input.article.hero_image_url ?? "",
    seo_title: input.article.seo_title ?? "",
    seo_description: input.article.seo_description ?? "",
    language: input.article.language ?? "hi",
    tags: input.article.tags ?? [],
    published_at: input.article.published_at,
    translations: input.article.translations ?? {},
    editorial_metadata: meta,
  };
}
