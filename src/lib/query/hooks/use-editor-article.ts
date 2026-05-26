"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";
import type { EditorArticleRecord } from "@/lib/editorial-editor/types";
import { tracePerf } from "@/lib/observability/performance-monitor";
import { queryKeys } from "@/lib/query/query-keys";

type ArticleResponse = {
  ok: boolean;
  article?: EditorArticleRecord;
  error?: string;
};

async function fetchArticle(
  id: string,
  signal?: AbortSignal
): Promise<EditorArticleRecord> {
  tracePerf("EDITOR", "article_query_fetch", { id });
  const result = await apiClient.get<ArticleResponse>(
    `/api/editorial/article/${id}`,
    { label: "editor_article", timeoutMs: 8_000, signal }
  );
  if (!result.ok) {
    throw new Error(result.timedOut ? "timeout" : result.error);
  }
  if (!result.data.ok || !result.data.article) {
    throw new Error(result.data.error ?? "article_not_found");
  }
  return result.data.article;
}

export function useEditorArticleQuery(articleId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.editorial.article(articleId),
    queryFn: ({ signal }) => fetchArticle(articleId, signal),
    enabled: Boolean(articleId) && enabled,
    staleTime: 60_000,
  });
}
