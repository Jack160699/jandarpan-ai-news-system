import { createAiId } from "./lib/browser-safe";
import type { EditorAiAction } from "@/lib/editorial-editor/types";
import type {
  AiQuickActionId,
  AiResponse,
  AiTask,
  EditorAiContext,
} from "./types";

const ACTION_MAP: Partial<Record<AiQuickActionId, EditorAiAction>> = {
  improve_headline: "headlines",
  rewrite: "rewrite",
  summarize: "summarize",
  translate: "translate",
  generate_tags: "tags",
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function mapResultToResponse(
  actionId: AiQuickActionId | undefined,
  result: Record<string, unknown>
): AiResponse {
  const id = createAiId();
  const createdAt = new Date().toISOString();

  if (actionId === "improve_headline" || result.headlines) {
    const headlines = (result.headlines as string[]) ?? [];
    return {
      id,
      kind: "headlines",
      title: "Headline options",
      content: headlines[0] ?? "",
      items: headlines,
      createdAt,
      actionId: actionId ?? "improve_headline",
    };
  }

  if (actionId === "generate_tags" || result.tags) {
    const tags = (result.tags as string[]) ?? [];
    return {
      id,
      kind: "tags",
      title: "Suggested tags",
      content: tags.join(", "),
      items: tags,
      createdAt,
      actionId: "generate_tags",
    };
  }

  if (result.summary) {
    return {
      id,
      kind: "text",
      title: "Summary",
      content: String(result.summary),
      createdAt,
      actionId: "summarize",
    };
  }

  if (result.body) {
    return {
      id,
      kind: "body",
      title: "Rewritten draft",
      content: String(result.body),
      createdAt,
      actionId: actionId ?? "rewrite",
    };
  }

  if (result.seo_title || result.seo_description) {
    return {
      id,
      kind: "text",
      title: "SEO pack",
      content: [
        result.seo_title ? `Title: ${result.seo_title}` : "",
        result.seo_description ? `Description: ${result.seo_description}` : "",
        result.focus_keyword ? `Keyword: ${result.focus_keyword}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      createdAt,
      actionId,
    };
  }

  return {
    id,
    kind: "text",
    title: "AI suggestion",
    content: JSON.stringify(result, null, 2),
    createdAt,
    actionId,
  };
}

export async function runEditorAiAssistantGeneration(input: {
  prompt: string;
  actionId?: AiQuickActionId;
  context: EditorAiContext;
  onTaskUpdate: (tasks: AiTask[]) => void;
}): Promise<AiResponse> {
  const tasks: AiTask[] = [
    { id: "1", label: "Reading draft context", status: "pending" },
    { id: "2", label: "Calling newsroom AI", status: "pending" },
    { id: "3", label: "Preparing suggestions", status: "pending" },
  ];

  const tick = async (index: number) => {
    input.onTaskUpdate(
      tasks.map((t, i) => ({
        ...t,
        status: i < index ? "done" : i === index ? "running" : "pending",
      }))
    );
    await delay(200 + index * 150);
  };

  input.onTaskUpdate(tasks);
  await tick(0);

  if (input.actionId === "social_posts") {
    await tick(1);
    await tick(2);
    input.onTaskUpdate(tasks.map((t) => ({ ...t, status: "done" })));
    return {
      id: createAiId(),
      kind: "social",
      title: "Social posts",
      content:
        "Social post generation is not available in the assistant yet. Use the intake panel for story drafts.",
      createdAt: new Date().toISOString(),
      actionId: "social_posts",
    };
  }

  const mappedAction =
    (input.actionId && ACTION_MAP[input.actionId]) ??
    (input.prompt.toLowerCase().includes("headline") ? "headlines" : "rewrite");

  await tick(1);

  const res = await fetch("/api/editorial/editor-ai", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: mappedAction,
      headline: input.context.headline,
      summary: input.context.summary,
      body: input.context.bodyMarkdown,
      language: input.context.language,
      targetLang: input.context.language === "hi" ? "en" : "hi",
    }),
  });

  const json = (await res.json()) as {
    ok?: boolean;
    result?: Record<string, unknown>;
    error?: string;
  };

  await tick(2);
  input.onTaskUpdate(tasks.map((t) => ({ ...t, status: "done" })));

  if (!res.ok || !json.ok || !json.result) {
    throw new Error(json.error ?? "ai_unavailable");
  }

  return mapResultToResponse(input.actionId, json.result);
}
