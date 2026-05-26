"use client";

import { marked } from "marked";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TurndownService from "turndown";
import {
  ArrowLeft,
  Clock,
  Eye,
  GitCompare,
  Loader2,
  Save,
  Sparkles,
  Smartphone,
  Monitor,
} from "lucide-react";
import { ClientTime } from "@/components/admin-newsroom/ui/ClientTime";
import { CollaborationBar } from "@/components/collaboration/CollaborationBar";
import type { EditorArticleRecord, EditorVersionSnapshot } from "@/lib/editorial-editor/types";
import {
  EDITOR_IMAGE_PLACEHOLDER,
  wireEditorImageFallbacks,
} from "@/lib/editorial-editor/image-placeholder";
import {
  computeSeoScore,
  readingEaseScore,
  suggestKeywords,
  slugifyHeadline,
} from "@/lib/editorial-editor/seo";
import { buildDraftPayload } from "@/lib/editorial-editor/storage";
import { NEWSROOM_LANGUAGES } from "@/lib/i18n/languages";
import { useEditorArticleQuery } from "@/lib/query/hooks/use-editor-article";
import {
  persistArticleDraft,
  useEditorAutosave,
  useEditorDraftRecovery,
} from "@/modules/editor";
import { traceEditorBoot } from "@/lib/observability/editor-boot-trace";
import { traceEditorLifecycle } from "@/lib/observability/editor-lifecycle-trace";

const EDITOR_BOOT_TIMEOUT_MS = 10_000;

const NewsroomTipTapEditor = dynamic(
  () =>
    import("@/components/admin-editor/NewsroomTipTapEditor").then((m) => {
      traceEditorBoot("EDITOR_IMPORT", "tiptap_editor_import_ready");
      return m.NewsroomTipTapEditor;
    }),
  {
    ssr: false,
    loading: () => <div className="jd-editor-skeleton" />,
  }
);

const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });

type JanDarpanEditorWorkbenchProps = {
  articleId: string;
};

function sanitizeEditorHtmlImages(html: string): string {
  // Known-dead Unsplash source that otherwise causes repeated 404s.
  const brokenSrcRe =
    /src=(["'])https?:\/\/images\.unsplash\.com\/photo-1529107386315-e1a269ed48e0[^"']*\1/g;
  return html.replace(brokenSrcRe, (_match, quote: string) => {
    return `src=${quote}${EDITOR_IMAGE_PLACEHOLDER}${quote}`;
  });
}

export function JanDarpanEditorWorkbench({ articleId }: JanDarpanEditorWorkbenchProps) {
  const articleQuery = useEditorArticleQuery(articleId);
  const [article, setArticle] = useState<EditorArticleRecord | null>(null);
  const [markdownMode, setMarkdownMode] = useState(false);
  const [markdown, setMarkdown] = useState("");
  const [editorHtml, setEditorHtml] = useState("<p></p>");
  const [editorReady, setEditorReady] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [showPreview, setShowPreview] = useState(false);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [headlineOptions, setHeadlineOptions] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [bootState, setBootState] = useState<"loading" | "ready" | "error" | "timeout">(
    "loading"
  );
  const [bootError, setBootError] = useState<string | null>(null);
  const [bootAttempt, setBootAttempt] = useState(0);
  const hydratedIdRef = useRef<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const previewBodyRef = useRef<HTMLDivElement | null>(null);

  const versions = useMemo(() => {
    const raw = article?.editorial_metadata?.editor_versions;
    return Array.isArray(raw) ? (raw as EditorVersionSnapshot[]) : [];
  }, [article]);

  const seoMeta = useMemo(
    () => (article?.editorial_metadata?.seo ?? {}) as Record<string, string>,
    [article?.editorial_metadata?.seo]
  );

  const { conflict: draftConflict } = useEditorDraftRecovery(articleId, article);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setBootState("loading");
      setBootError(null);
      setArticle(null);
      setEditorReady(false);
      hydratedIdRef.current = null;
      traceEditorBoot("EDITOR_BOOT", "editor_boot_start", { articleId, bootAttempt });
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [articleId, bootAttempt]);

  useEffect(() => {
    if (bootState !== "loading") return;
    const id = window.setTimeout(() => {
      setBootState("timeout");
      setBootError("Editor initialization timed out. Please retry.");
      traceEditorBoot("EDITOR_TIMEOUT", "editor_boot_timeout", { articleId });
    }, EDITOR_BOOT_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [bootState, articleId]);

  useEffect(() => {
    if (bootState !== "loading") return;
    traceEditorBoot("EDITOR_QUERY", "editor_query_state", {
      isLoading: articleQuery.isLoading,
      isError: articleQuery.isError,
      hasData: Boolean(articleQuery.data),
    });

    if (articleQuery.isError) {
      const message =
        articleQuery.error instanceof Error
          ? articleQuery.error.message
          : "Failed to load article";
      const bootId = window.setTimeout(() => {
        if (
          message.toLowerCase().includes("does not exist") &&
          message.toLowerCase().includes("translations")
        ) {
          setBootError(
            "Schema mismatch: translations column missing. Editor running in degraded mode."
          );
          setEditorReady(true);
          setBootState("ready");
          traceEditorBoot("EDITOR_ERROR", "editor_query_schema_mismatch", { message });
          return;
        }
        setBootState("error");
        setBootError(message);
        setEditorReady(false);
        traceEditorBoot("EDITOR_ERROR", "editor_query_failed", { message });
      }, 0);
      return () => window.clearTimeout(bootId);
    }
    if (!articleQuery.data) return;
    if (hydratedIdRef.current === articleId) return;
    hydratedIdRef.current = articleId;
    const row = articleQuery.data;
    let cancelled = false;
    const bootId = window.setTimeout(() => {
      setArticle(row);
      setMarkdown(row.article_body ?? "");
    }, 0);
    void (async () => {
      try {
        const html = await marked.parse(row.article_body ?? "");
        if (cancelled) return;
        const safeHtml = sanitizeEditorHtmlImages((html as string) || "<p></p>");
        window.setTimeout(() => {
          if (cancelled) return;
          setEditorHtml(safeHtml);
          setEditorReady(true);
          setBootState("ready");
          traceEditorBoot("EDITOR_READY", "editor_boot_ready", { articleId });
        }, 0);
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "Failed to initialize editor body";
        window.setTimeout(() => {
          if (cancelled) return;
          setEditorHtml("<p></p>");
          setBootError(message);
          setEditorReady(true);
          setBootState("ready");
          traceEditorBoot("EDITOR_ERROR", "editor_markdown_parse_failed", { message });
        }, 0);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(bootId);
    };
  }, [
    articleQuery.data,
    articleQuery.error,
    articleQuery.isError,
    articleQuery.isLoading,
    articleId,
    bootState,
  ]);

  useEffect(() => {
    return () => {
      traceEditorLifecycle("EDITOR_UNMOUNT", "jan_workbench_unmounted", {
        articleId,
      });
      // Final memory hint (best-effort).
      try {
        const perf = performance as Performance & {
          memory?: { usedJSHeapSize?: number };
        };
        const mem = perf.memory?.usedJSHeapSize;
        if (typeof mem === "number") {
          traceEditorLifecycle("EDITOR_MEMORY", "usedJSHeapSize", { mem });
        }
      } catch {
        // ignore
      }
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    };
  }, [articleId]);

  const bodyMarkdown = useMemo(() => {
    if (markdownMode) return markdown;
    return turndown.turndown(editorHtml);
  }, [markdownMode, markdown, editorHtml]);

  const payload = useMemo(() => {
    if (!article) return null;
    return buildDraftPayload({
      article,
      bodyMarkdown,
      seoExtras: {
        seo: {
          canonicalUrl: seoMeta.canonicalUrl ?? "",
          ogImage: seoMeta.ogImage ?? article.hero_image_url ?? "",
          focusKeyword: seoMeta.focusKeyword ?? "",
        },
      },
    });
  }, [article, bodyMarkdown, seoMeta]);

  const { saveState, lastSavedAt, saveNow } = useEditorAutosave(
    articleId,
    payload as Record<string, unknown> | null
  );

  const saveDraft = useCallback(
    async (withVersion = false) => {
      if (!payload) return;
      if (withVersion) {
        const result = await persistArticleDraft(
          articleId,
          { ...payload, save_version: true } as Record<string, unknown>,
          "manual"
        );
        if (!result.ok) return;
      } else {
        saveNow();
      }
    },
    [articleId, payload, saveNow]
  );

  const seo = computeSeoScore({
    headline: article?.headline ?? "",
    slug: article?.slug ?? "",
    seoTitle: article?.seo_title ?? "",
    seoDescription: article?.seo_description ?? "",
    body: bodyMarkdown,
    tags: article?.tags ?? [],
    focusKeyword: seoMeta.focusKeyword,
  });
  const readability = readingEaseScore(bodyMarkdown);
  const keywords = suggestKeywords({
    headline: article?.headline ?? "",
    summary: article?.summary ?? "",
    body: bodyMarkdown,
    tags: article?.tags ?? [],
  });

  async function runAi(
    action: string,
    extra?: Record<string, string>
  ) {
    if (!article) return;
    setAiBusy(action);
    try {
      const res = await fetch("/api/editorial/editor-ai", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          headline: article.headline,
          summary: article.summary,
          body: bodyMarkdown,
          language: article.language,
          ...extra,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setToast(json.error === "ai_unavailable" ? "Add OPENAI_API_KEY for AI" : "AI failed");
        return;
      }
      const r = json.result as Record<string, unknown>;
      if (r.headlines) setHeadlineOptions(r.headlines as string[]);
      if (typeof r.headline === "string") {
        setArticle((p) => (p ? { ...p, headline: r.headline as string } : p));
      }
      if (typeof r.summary === "string") {
        setArticle((p) => (p ? { ...p, summary: r.summary as string } : p));
      }
      if (typeof r.body === "string") {
        const html = (await marked.parse(r.body as string)) as string;
        setEditorHtml(sanitizeEditorHtmlImages(html));
        setMarkdown(r.body as string);
      }
      if (typeof r.seo_title === "string") {
        setArticle((p) =>
          p
            ? {
                ...p,
                seo_title: r.seo_title as string,
                seo_description: (r.seo_description as string) ?? p.seo_description,
                editorial_metadata: {
                  ...(p.editorial_metadata ?? {}),
                  seo: {
                    ...seoMeta,
                    focusKeyword: (r.focus_keyword as string) ?? seoMeta.focusKeyword,
                  },
                },
              }
            : p
        );
      }
      if (Array.isArray(r.tags)) {
        setArticle((p) => (p ? { ...p, tags: r.tags as string[] } : p));
      }
      setToast("AI applied");
    } finally {
      setAiBusy(null);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => setToast(null), 2800);
    }
  }

  const compareVersion = versions.find((v) => v.id === compareId);

  useEffect(() => {
    if (!showPreview) return;
    wireEditorImageFallbacks(previewBodyRef.current);
  }, [showPreview, editorHtml]);

  const loading = bootState === "loading";

  if (loading) {
    return <div className="jd-editor-page__loading">Loading editor…</div>;
  }

  if (bootState === "error" || bootState === "timeout" || !article || !editorReady) {
    return (
      <div className="anr-card" role="status">
        <div className="anr-card__head">
          <strong>Editor unavailable</strong>
          <span className="anr-meta">{bootState === "timeout" ? "Timed out" : "Failed"}</span>
        </div>
        <div className="anr-card__body">
          <p className="anr-meta">
            {bootError ?? "Editor could not initialize. Retry to recover."}
          </p>
          <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className="anr-btn anr-btn--primary"
              onClick={() => {
                traceEditorBoot("EDITOR_BOOT", "editor_boot_retry", { articleId });
                void articleQuery.refetch();
                setBootAttempt((n) => n + 1);
              }}
            >
              Retry editor
            </button>
            <Link href="/admin/stories" className="anr-btn anr-btn--ghost">
              Back to desk
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const siteBase =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return (
    <div className="jd-editor-page">
      {draftConflict ? (
        <div className="anr-emergency-banner" role="status">
          <strong>Local draft detected.</strong> A newer offline snapshot may exist on this device.
        </div>
      ) : null}
      <CollaborationBar
        articleId={articleId}
        editorHtml={editorHtml}
        onRemoteHtml={(html) => {
          const sanitized = sanitizeEditorHtmlImages(html);
          setEditorHtml(sanitized);
          setMarkdown(turndown.turndown(html));
        }}
      />
      <header className="jd-editor-chrome">
        <div className="jd-editor-chrome__left">
          <Link href="/admin/stories" className="jd-editor-back">
            <ArrowLeft size={16} />
            Desk
          </Link>
          <span className={`jd-editor-save jd-editor-save--${saveState}`}>
            {saveState === "saving" ? (
              <>
                <Loader2 size={14} className="spin" /> Saving
              </>
            ) : saveState === "error" ? (
              "Save failed"
            ) : (
              <>
                <Clock size={14} />
                {lastSavedAt ? (
                  <>
                    Saved <ClientTime iso={lastSavedAt} preset="time" />
                  </>
                ) : (
                  "Draft"
                )}
              </>
            )}
          </span>
        </div>
        <div className="jd-editor-chrome__actions">
          <button
            type="button"
            className="anr-btn anr-btn--ghost"
            onClick={() => setShowPreview((v) => !v)}
          >
            <Eye size={14} />
            Preview
          </button>
          <button
            type="button"
            className="anr-btn anr-btn--ghost"
            onClick={() => void saveDraft(true)}
          >
            <GitCompare size={14} />
            Snapshot
          </button>
          <button type="button" className="anr-btn anr-btn--ghost" onClick={() => void saveDraft(false)}>
            <Save size={14} />
            Save
          </button>
          <a
            href={`/story/${article.slug}`}
            target="_blank"
            rel="noreferrer"
            className="anr-btn anr-btn--primary"
          >
            Publish preview
          </a>
        </div>
      </header>

      <div className="jd-editor-layout">
        <main className="jd-editor-main">
          <input
            className="jd-editor-headline"
            value={article.headline}
            onChange={(e) =>
              setArticle((p) => (p ? { ...p, headline: e.target.value } : p))
            }
            placeholder="Headline"
          />
          <textarea
            className="jd-editor-dek"
            value={article.summary ?? ""}
            onChange={(e) =>
              setArticle((p) => (p ? { ...p, summary: e.target.value } : p))
            }
            placeholder="Summary / dek"
            rows={2}
          />

          <NewsroomTipTapEditor
            key={`${articleId}-${bootAttempt}`}
            initialHtml={editorHtml}
            onHtmlChange={(html) => setEditorHtml(sanitizeEditorHtmlImages(html))}
            markdownMode={markdownMode}
            markdown={markdown}
            onMarkdownChange={setMarkdown}
          />

          <div className="jd-editor-mode-toggle">
            <button
              type="button"
              className={!markdownMode ? "is-active" : ""}
              onClick={async () => {
                if (markdownMode) {
                  const html = (await marked.parse(markdown)) as string;
                  setEditorHtml(sanitizeEditorHtmlImages(html || "<p></p>"));
                  setMarkdownMode(false);
                }
              }}
            >
              Rich text
            </button>
            <button
              type="button"
              className={markdownMode ? "is-active" : ""}
              onClick={() => {
                if (!markdownMode) {
                  setMarkdown(turndown.turndown(editorHtml));
                  setMarkdownMode(true);
                }
              }}
            >
              Markdown
            </button>
          </div>
        </main>

        <aside className="jd-editor-rail">
          <section className="jd-editor-panel">
            <h3>Quality</h3>
            <div className="jd-editor-scores">
              <div>
                <span>SEO</span>
                <strong className={seo >= 70 ? "ok" : seo >= 50 ? "mid" : "low"}>{seo}</strong>
              </div>
              <div>
                <span>Readability</span>
                <strong className={readability >= 60 ? "ok" : "mid"}>{readability}</strong>
              </div>
            </div>
          </section>

          <section className="jd-editor-panel">
            <h3>SEO & metadata</h3>
            <label className="jd-field">
              <span>Slug</span>
              <input
                className="anr-input"
                value={article.slug}
                onChange={(e) =>
                  setArticle((p) => (p ? { ...p, slug: e.target.value } : p))
                }
              />
              <button
                type="button"
                className="jd-field__link"
                onClick={() =>
                  setArticle((p) =>
                    p ? { ...p, slug: slugifyHeadline(p.headline) } : p
                  )
                }
              >
                Auto from headline
              </button>
            </label>
            <label className="jd-field">
              <span>SEO title</span>
              <input
                className="anr-input"
                value={article.seo_title ?? ""}
                onChange={(e) =>
                  setArticle((p) => (p ? { ...p, seo_title: e.target.value } : p))
                }
              />
            </label>
            <label className="jd-field">
              <span>Meta description</span>
              <textarea
                className="anr-input"
                rows={3}
                value={article.seo_description ?? ""}
                onChange={(e) =>
                  setArticle((p) =>
                    p ? { ...p, seo_description: e.target.value } : p
                  )
                }
              />
            </label>
            <label className="jd-field">
              <span>OG image URL</span>
              <input
                className="anr-input"
                value={seoMeta.ogImage ?? article.hero_image_url ?? ""}
                onChange={(e) =>
                  setArticle((p) =>
                    p
                      ? {
                          ...p,
                          hero_image_url: e.target.value,
                          editorial_metadata: {
                            ...(p.editorial_metadata ?? {}),
                            seo: { ...seoMeta, ogImage: e.target.value },
                          },
                        }
                      : p
                  )
                }
              />
            </label>
            <label className="jd-field">
              <span>Canonical URL</span>
              <input
                className="anr-input"
                value={seoMeta.canonicalUrl ?? `${siteBase}/story/${article.slug}`}
                onChange={(e) =>
                  setArticle((p) =>
                    p
                      ? {
                          ...p,
                          editorial_metadata: {
                            ...(p.editorial_metadata ?? {}),
                            seo: { ...seoMeta, canonicalUrl: e.target.value },
                          },
                        }
                      : p
                  )
                }
              />
            </label>
            <div className="jd-keywords">
              {keywords.map((k) => (
                <button
                  key={k}
                  type="button"
                  className="jd-keyword"
                  onClick={() =>
                    setArticle((p) =>
                      p
                        ? {
                            ...p,
                            tags: [...new Set([...(p.tags ?? []), k])],
                          }
                        : p
                    )
                  }
                >
                  {k}
                </button>
              ))}
            </div>
          </section>

          <section className="jd-editor-panel">
            <h3>
              <Sparkles size={14} /> AI desk
            </h3>
            <div className="jd-ai-grid">
              {[
                ["rewrite", "Rewrite"],
                ["headlines", "Headlines"],
                ["seo", "SEO pack"],
                ["grammar", "Grammar"],
                ["summarize", "Summarize"],
                ["tags", "Auto tags"],
                ["tone", "Neutral tone"],
                ["translate", "Translate EN"],
              ].map(([action, label]) => (
                <button
                  key={action}
                  type="button"
                  className="anr-btn anr-btn--ghost"
                  disabled={aiBusy !== null}
                  onClick={() =>
                    void runAi(action, action === "tone" ? { tone: "neutral" } : action === "translate" ? { targetLang: "en" } : undefined)
                  }
                >
                  {aiBusy === action ? <Loader2 size={12} className="spin" /> : null}
                  {label}
                </button>
              ))}
            </div>
            {headlineOptions.length > 0 ? (
              <ul className="jd-headline-picks">
                {headlineOptions.map((h) => (
                  <li key={h}>
                    <button
                      type="button"
                      onClick={() => {
                        setArticle((p) => (p ? { ...p, headline: h } : p));
                        setHeadlineOptions([]);
                      }}
                    >
                      {h}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="jd-editor-panel">
            <h3>Publish</h3>
            <label className="jd-field">
              <span>Language</span>
              <select
                className="anr-input"
                value={article.language ?? "hi"}
                onChange={(e) =>
                  setArticle((p) => (p ? { ...p, language: e.target.value } : p))
                }
              >
                {NEWSROOM_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
            <label className="jd-field">
              <span>Schedule</span>
              <input
                className="anr-input"
                type="datetime-local"
                value={
                  article.published_at
                    ? new Date(article.published_at).toISOString().slice(0, 16)
                    : ""
                }
                onChange={(e) =>
                  setArticle((p) =>
                    p
                      ? {
                          ...p,
                          published_at: e.target.value
                            ? new Date(e.target.value).toISOString()
                            : null,
                        }
                      : p
                  )
                }
              />
            </label>
            <label className="jd-field">
              <span>Tags</span>
              <input
                className="anr-input"
                value={(article.tags ?? []).join(", ")}
                onChange={(e) =>
                  setArticle((p) =>
                    p
                      ? {
                          ...p,
                          tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                        }
                      : p
                  )
                }
              />
            </label>
          </section>

          {versions.length > 0 ? (
            <section className="jd-editor-panel">
              <h3>Versions</h3>
              <select
                className="anr-input"
                value={compareId ?? ""}
                onChange={(e) => setCompareId(e.target.value || null)}
              >
                <option value="">Compare snapshot…</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {new Date(v.savedAt).toLocaleString("en-IN")} — {v.headline.slice(0, 40)}
                  </option>
                ))}
              </select>
              {compareVersion ? (
                <div className="jd-version-diff">
                  <p className="anr-meta">Snapshot vs current headline</p>
                  <del>{compareVersion.headline}</del>
                  <ins>{article.headline}</ins>
                </div>
              ) : null}
            </section>
          ) : null}
        </aside>
      </div>

      {showPreview ? (
        <div className="jd-editor-preview-layer" role="dialog">
          <div className="jd-editor-preview">
            <header>
              <div className="jd-editor-preview__tabs">
                <button
                  type="button"
                  className={previewMode === "desktop" ? "is-active" : ""}
                  onClick={() => setPreviewMode("desktop")}
                >
                  <Monitor size={14} /> Desktop
                </button>
                <button
                  type="button"
                  className={previewMode === "mobile" ? "is-active" : ""}
                  onClick={() => setPreviewMode("mobile")}
                >
                  <Smartphone size={14} /> Mobile
                </button>
              </div>
              <button type="button" className="anr-btn anr-btn--ghost" onClick={() => setShowPreview(false)}>
                Close
              </button>
            </header>
            <article
              className={`jd-editor-preview__article ${previewMode === "mobile" ? "is-mobile" : ""}`}
            >
              <h1>{article.headline}</h1>
              <p className="jd-editor-preview__dek">{article.summary}</p>
              <div
                ref={previewBodyRef}
                className="jd-editor-preview__body"
                dangerouslySetInnerHTML={{
                  __html: sanitizeEditorHtmlImages(editorHtml),
                }}
              />
            </article>
          </div>
        </div>
      ) : null}

      {toast ? <div className="anr-toast anr-toast--success">{toast}</div> : null}
    </div>
  );
}
