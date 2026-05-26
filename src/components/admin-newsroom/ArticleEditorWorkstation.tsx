"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TurndownService from "turndown";
import { marked } from "marked";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import {
  CalendarClock,
  Globe2,
  ImagePlus,
  Languages,
  Loader2,
  Save,
  Search,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ClientTime } from "@/components/admin-newsroom/ui/ClientTime";
import { traceStability } from "@/lib/observability/stability-trace";

type ArticleEditorWorkstationProps = {
  articleId: string;
};

type EditorArticle = {
  id: string;
  slug: string;
  headline: string;
  summary: string | null;
  article_body: string | null;
  hero_image_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  language: string | null;
  tags: string[] | null;
  published_at: string | null;
  translations: Record<string, unknown> | null;
  editorial_metadata: Record<string, unknown> | null;
  created_at: string;
};

type SaveState = "idle" | "saving" | "saved" | "error";
const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
const AUTOSAVE_DEBOUNCE_MS = 1500;
const LOAD_TIMEOUT_MS = 8000;

function readingEase(text: string): number {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return 0;
  const words = clean.split(" ").length;
  const sentences = Math.max(1, clean.split(/[.!?।]/).filter(Boolean).length);
  const syllablesApprox = clean.replace(/[^aeiouअआइईउऊएऐओऔऋ]/gi, "").length;
  const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllablesApprox / words);
  return Math.max(0, Math.min(100, score));
}

function seoScore(input: {
  headline: string;
  slug: string;
  seoTitle: string;
  seoDescription: string;
  body: string;
}) {
  let score = 0;
  if (input.headline.length >= 25 && input.headline.length <= 90) score += 25;
  if (input.slug.length >= 8 && input.slug.length <= 90) score += 15;
  if (input.seoTitle.length >= 40 && input.seoTitle.length <= 70) score += 20;
  if (input.seoDescription.length >= 110 && input.seoDescription.length <= 170) score += 20;
  if (input.body.length >= 1200) score += 20;
  return score;
}

export function ArticleEditorWorkstation({ articleId }: ArticleEditorWorkstationProps) {
  const [article, setArticle] = useState<EditorArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [activeTab, setActiveTab] = useState("compose");
  const [previewTab, setPreviewTab] = useState("og");
  const [markdownMode, setMarkdownMode] = useState(false);
  const [markdownDraft, setMarkdownDraft] = useState("");
  const [editorHtml, setEditorHtml] = useState("<p></p>");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const lastPayloadRef = useRef("");
  const saveDebounceRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const loadAbortRef = useRef<AbortController | null>(null);
  const editorHydratedRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image,
      Link.configure({ openOnClick: true }),
      Placeholder.configure({ placeholder: "Write the editorial body..." }),
    ],
    content: "<p></p>",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "min-h-[420px] rounded-md border border-zinc-800 bg-zinc-950/70 p-4 text-sm text-zinc-100 focus:outline-none",
      },
    },
  });

  useEffect(() => {
    editorHydratedRef.current = false;
    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;
    let cancelled = false;
    (async () => {
      setLoading(true);
      traceStability("EDITOR_BOOT", "editor_article_fetch_start", { articleId });
      const timeout = window.setTimeout(() => controller.abort(), LOAD_TIMEOUT_MS);
      let res: Response;
      try {
        res = await fetch(`/api/editorial/article/${articleId}`, {
          cache: "no-store",
          credentials: "include",
          signal: controller.signal,
        });
      } finally {
        window.clearTimeout(timeout);
      }
      const json = (await res.json()) as { ok: boolean; article?: EditorArticle };
      if (!cancelled && json.ok && json.article) {
        setArticle(json.article);
        const initialMarkdown = json.article.article_body ?? "";
        setMarkdownDraft(initialMarkdown);
        const html = (await marked.parse(initialMarkdown)) as string;
        setEditorHtml(html || "<p></p>");
        traceStability("EDITOR_BOOT", "editor_article_fetch_ok", {
          hasBody: Boolean(initialMarkdown?.length),
        });
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [articleId]);

  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => {
      setEditorHtml(editor.getHTML());
    };
    editor.on("update", onUpdate);
    return () => {
      editor.off("update", onUpdate);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor || !article) return;
    if (editorHydratedRef.current) return;
    editorHydratedRef.current = true;
    editor.commands.setContent(editorHtml || "<p></p>");
    traceStability("EDITOR_BOOT", "editor_hydrated_content_set", { articleId });
  }, [editor, article, editorHtml, articleId]);

  const basePayload = useMemo(() => {
    if (!article) return null;
    return {
      slug: article.slug,
      headline: article.headline,
      summary: article.summary ?? "",
      hero_image_url: article.hero_image_url ?? "",
      seo_title: article.seo_title ?? "",
      seo_description: article.seo_description ?? "",
      language: article.language ?? "hi",
      tags: article.tags ?? [],
      published_at: article.published_at,
      translations: article.translations ?? {},
      editorial_metadata: article.editorial_metadata ?? {},
    };
  }, [article]);

  const payload = useMemo(() => {
    if (!basePayload) return null;
    const bodyMarkdown = markdownMode
      ? markdownDraft
      : turndown.turndown(editorHtml || "");
    return {
      ...basePayload,
      article_body: bodyMarkdown,
    };
  }, [basePayload, markdownMode, markdownDraft, editorHtml]);

  const saveDraft = useCallback(async (reason: "manual" | "debounced" | "interval") => {
    if (!payload) return;
    const serialized = JSON.stringify({
      ...payload,
      editorial_metadata: {
        ...(payload.editorial_metadata ?? {}),
        draft_state: {
          updatedAt: new Date().toISOString(),
          authoring: true,
          reason,
        },
      },
    });
    if (serialized === lastPayloadRef.current) return;
    traceStability("SESSION_REFRESH", "editor_autosave_start", { reason });
    setSaveState("saving");
    const res = await fetch(`/api/editorial/article/${articleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: serialized,
    });
    if (!res.ok) {
      setSaveState("error");
      traceStability("EDITOR_CRASH", "editor_autosave_failed", { status: res.status });
      return;
    }
    setSaveState("saved");
    setLastSavedAt(new Date().toISOString());
    lastPayloadRef.current = serialized;
    setTimeout(() => setSaveState("idle"), 1200);
    traceStability("SESSION_REFRESH", "editor_autosave_done", { reason });
  }, [articleId, payload]);

  useEffect(() => {
    if (!payload) return;
    if (saveDebounceRef.current) window.clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = window.setTimeout(() => {
      void saveDraft("debounced");
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (saveDebounceRef.current) window.clearTimeout(saveDebounceRef.current);
    };
  }, [payload, saveDraft]);

  useEffect(() => {
    const id = window.setInterval(() => void saveDraft("interval"), 30_000);
    return () => window.clearInterval(id);
  }, [saveDraft]);

  useEffect(() => {
    const channel = new BroadcastChannel(`article-draft-${articleId}`);
    channel.onmessage = (event) => {
      if (event.data?.type === "draft_saved") {
        setLastSavedAt(event.data.at);
      }
    };
    return () => channel.close();
  }, [articleId]);

  const bodyText = markdownMode ? markdownDraft : turndown.turndown(editorHtml || "");
  const seo = seoScore({
    headline: article?.headline ?? "",
    slug: article?.slug ?? "",
    seoTitle: article?.seo_title ?? "",
    seoDescription: article?.seo_description ?? "",
    body: bodyText,
  });
  const readability = readingEase(bodyText);

  if (loading || !article) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading article editor...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 animate-pulse rounded-md bg-zinc-900" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Newsroom Article Editor</CardTitle>
              <CardDescription>
                TipTap rich editor · autosave · realtime draft state
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={saveState === "error" ? "destructive" : saveState === "saving" ? "warning" : "success"}>
                {saveState === "saving" ? "Saving..." : saveState === "error" ? "Save failed" : "Draft synced"}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => void saveDraft("manual")}>
                {saveState === "saving" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save now
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-2">
            <Input
              value={article.headline}
              onChange={(e) => setArticle((prev) => (prev ? { ...prev, headline: e.target.value } : prev))}
              placeholder="Headline"
            />
            <Input
              value={article.slug}
              onChange={(e) => setArticle((prev) => (prev ? { ...prev, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") } : prev))}
              placeholder="Slug"
            />
          </div>
          <Textarea
            value={article.summary ?? ""}
            onChange={(e) => setArticle((prev) => (prev ? { ...prev, summary: e.target.value } : prev))}
            placeholder="Summary"
            className="min-h-[80px]"
          />

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="compose">Compose</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
              <TabsTrigger value="ai">AI Assist</TabsTrigger>
              <TabsTrigger value="publish">Publish</TabsTrigger>
            </TabsList>

            <TabsContent value="compose">
              <div className="mb-2 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => editor?.chain().focus().toggleBold().run()}>Bold</Button>
                <Button size="sm" variant="outline" onClick={() => editor?.chain().focus().toggleItalic().run()}>Italic</Button>
                <Button size="sm" variant="outline" onClick={() => editor?.chain().focus().toggleBlockquote().run()}>Quote</Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const url = window.prompt("Image URL");
                    if (url) editor?.chain().focus().setImage({ src: url }).run();
                  }}
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  Image embed
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    if (!editor) return;
                    if (!markdownMode) {
                      setMarkdownDraft(turndown.turndown(editor.getHTML()));
                      setMarkdownMode(true);
                    } else {
                      const html = (await marked.parse(markdownDraft)) as string;
                      editor.commands.setContent(html || "<p></p>");
                      setMarkdownMode(false);
                    }
                  }}
                >
                  {markdownMode ? "Rich text mode" : "Markdown mode"}
                </Button>
              </div>
              {markdownMode ? (
                <Textarea
                  value={markdownDraft}
                  onChange={(e) => setMarkdownDraft(e.target.value)}
                  className="min-h-[420px] font-mono text-xs"
                />
              ) : (
                <EditorContent editor={editor} />
              )}
            </TabsContent>

            <TabsContent value="metadata">
              <div className="space-y-2">
                <Input
                  value={article.seo_title ?? ""}
                  onChange={(e) => setArticle((prev) => (prev ? { ...prev, seo_title: e.target.value } : prev))}
                  placeholder="SEO title"
                />
                <Textarea
                  value={article.seo_description ?? ""}
                  onChange={(e) => setArticle((prev) => (prev ? { ...prev, seo_description: e.target.value } : prev))}
                  placeholder="SEO description"
                />
                <Input
                  value={article.hero_image_url ?? ""}
                  onChange={(e) => setArticle((prev) => (prev ? { ...prev, hero_image_url: e.target.value } : prev))}
                  placeholder="Hero image URL"
                />
                <div className="grid gap-2 md:grid-cols-2">
                  <Input
                    value={(article.tags ?? []).join(", ")}
                    onChange={(e) =>
                      setArticle((prev) =>
                        prev
                          ? {
                              ...prev,
                              tags: e.target.value
                                .split(",")
                                .map((t) => t.trim())
                                .filter(Boolean),
                            }
                          : prev
                      )
                    }
                    placeholder="Tags (comma separated)"
                  />
                  <Input
                    value={article.language ?? "hi"}
                    onChange={(e) => setArticle((prev) => (prev ? { ...prev, language: e.target.value } : prev))}
                    placeholder="Language"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ai">
              <div className="grid gap-2 md:grid-cols-2">
                <Button
                  variant="secondary"
                  onClick={() =>
                    setArticle((prev) =>
                      prev
                        ? { ...prev, headline: `${prev.headline.replace(/\s*\|.*/, "")} | AI Updated` }
                        : prev
                    )
                  }
                >
                  <Sparkles className="h-4 w-4" />
                  Rewrite headline
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    setArticle((prev) =>
                      prev
                        ? {
                            ...prev,
                            seo_title: (prev.seo_title || prev.headline).slice(0, 60),
                            seo_description:
                              (prev.summary || "").slice(0, 150) || "Live regional newsroom update",
                          }
                        : prev
                    )
                  }
                >
                  <Search className="h-4 w-4" />
                  SEO optimize
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    setArticle((prev) =>
                      prev
                        ? {
                            ...prev,
                            translations: {
                              ...(prev.translations ?? {}),
                              en: { headline: prev.headline, summary: prev.summary ?? "" },
                              hi: { headline: prev.headline, summary: prev.summary ?? "" },
                            },
                          }
                        : prev
                    )
                  }
                >
                  <Languages className="h-4 w-4" />
                  Translate Hindi / English
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    setArticle((prev) =>
                      prev
                        ? {
                            ...prev,
                            editorial_metadata: {
                              ...(prev.editorial_metadata ?? {}),
                              push_notification: (prev.headline || "").slice(0, 90),
                              social_caption: `${(prev.headline || "").slice(0, 80)} #Chhattisgarh #News`,
                            },
                          }
                        : prev
                    )
                  }
                >
                  <Globe2 className="h-4 w-4" />
                  Push + social copy
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="publish">
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">
                    Scheduled publishing
                  </label>
                  <Input
                    type="datetime-local"
                    value={
                      article.published_at
                        ? new Date(article.published_at).toISOString().slice(0, 16)
                        : ""
                    }
                    onChange={(e) =>
                      setArticle((prev) =>
                        prev
                          ? {
                              ...prev,
                              published_at: e.target.value
                                ? new Date(e.target.value).toISOString()
                                : null,
                            }
                          : prev
                      )
                    }
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setArticle((prev) => (prev ? { ...prev, published_at: null } : prev))
                    }
                  >
                    Clear schedule
                  </Button>
                  <Button onClick={() => void saveDraft("manual")}>
                    <CalendarClock className="h-4 w-4" />
                    Save schedule
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Live quality scores</CardTitle>
            <CardDescription>SEO + readability analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>SEO score</span>
              <Badge variant={seo >= 75 ? "success" : seo >= 55 ? "warning" : "destructive"}>
                {seo}/100
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Readability</span>
              <Badge
                variant={
                  readability >= 65 ? "success" : readability >= 45 ? "warning" : "destructive"
                }
              >
                {Math.round(readability)}/100
              </Badge>
            </div>
            <p className="text-xs text-zinc-400">
              Last autosave:{" "}
              {lastSavedAt ? (
                <ClientTime iso={lastSavedAt} preset="time" />
              ) : (
                "not saved yet"
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview Studio</CardTitle>
            <CardDescription>OG, mobile, and social preview</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={previewTab} onValueChange={setPreviewTab}>
              <TabsList>
                <TabsTrigger value="og">OG</TabsTrigger>
                <TabsTrigger value="mobile">Mobile</TabsTrigger>
                <TabsTrigger value="social">Social</TabsTrigger>
              </TabsList>
              <TabsContent value="og">
                <div className="rounded-md border border-zinc-800 bg-zinc-900 p-3">
                  <p className="text-xs text-zinc-400">{article.slug}</p>
                  <h4 className="mt-1 text-sm font-semibold">{article.seo_title || article.headline}</h4>
                  <p className="mt-1 text-xs text-zinc-300">
                    {article.seo_description || article.summary}
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="mobile">
                <div className="mx-auto max-w-[260px] rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
                  <p className="text-[11px] text-zinc-500">Jan Darpan mobile</p>
                  <h4 className="mt-2 text-sm font-semibold leading-tight">{article.headline}</h4>
                  <p className="mt-2 text-xs text-zinc-300 line-clamp-5">{article.summary}</p>
                </div>
              </TabsContent>
              <TabsContent value="social">
                <div className="rounded-md border border-zinc-800 bg-zinc-900 p-3">
                  <p className="text-sm font-medium">{article.headline}</p>
                  <p className="mt-1 text-xs text-zinc-300">
                    {((article.editorial_metadata?.social_caption as string) || article.summary || "").slice(0, 160)}
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
