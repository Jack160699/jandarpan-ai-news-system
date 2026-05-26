"use client";

import { marked } from "marked";
import Link from "next/link";
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
import { CollaborationBar } from "@/components/collaboration/CollaborationBar";
import { NewsroomTipTapEditor } from "@/components/admin-editor/NewsroomTipTapEditor";
import type { EditorArticleRecord, EditorVersionSnapshot } from "@/lib/editorial-editor/types";
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

const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });

type JanDarpanEditorWorkbenchProps = {
  articleId: string;
};

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
  const hydratedIdRef = useRef<string | null>(null);

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
    if (!articleQuery.data) return;
    if (hydratedIdRef.current === articleId) return;
    hydratedIdRef.current = articleId;
    const row = articleQuery.data;
    setArticle(row);
    const md = row.article_body ?? "";
    setMarkdown(md);
    void marked.parse(md).then((html) => {
      setEditorHtml((html as string) || "<p></p>");
      setEditorReady(true);
    });
  }, [articleQuery.data, articleId]);

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
        setEditorHtml(html);
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
      window.setTimeout(() => setToast(null), 2800);
    }
  }

  const compareVersion = versions.find((v) => v.id === compareId);

  const loading = (articleQuery.isLoading && !article) || !editorReady;

  if (loading) {
    return <div className="jd-editor-page__loading">Loading editor…</div>;
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
          setEditorHtml(html);
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
                {lastSavedAt
                  ? `Saved ${new Date(lastSavedAt).toLocaleTimeString("en-IN")}`
                  : "Draft"}
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
            initialHtml={editorHtml}
            onHtmlChange={setEditorHtml}
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
                  setEditorHtml(html || "<p></p>");
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
                className="jd-editor-preview__body"
                dangerouslySetInnerHTML={{ __html: editorHtml }}
              />
            </article>
          </div>
        </div>
      ) : null}

      {toast ? <div className="anr-toast anr-toast--success">{toast}</div> : null}
    </div>
  );
}
