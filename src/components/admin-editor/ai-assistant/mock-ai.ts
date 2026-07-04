import { createAiId } from "./lib/browser-safe";
import { isProductionDeployment } from "@/lib/infrastructure/production";
import type {
  AiQuickActionId,
  AiResponse,
  EditorAiContext,
} from "./types";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function excerpt(text: string, max = 120): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

const QUICK_ACTION_LABELS: Record<AiQuickActionId, string> = {
  improve_headline: "Improve headline",
  rewrite: "Rewrite",
  summarize: "Summarize",
  translate: "Translate",
  generate_tags: "Generate tags",
  social_posts: "Social posts",
};

export function getQuickActionLabel(id: AiQuickActionId): string {
  return QUICK_ACTION_LABELS[id];
}

export const QUICK_ACTIONS: { id: AiQuickActionId; label: string }[] = [
  { id: "improve_headline", label: "Improve headline" },
  { id: "rewrite", label: "Rewrite" },
  { id: "summarize", label: "Summarize" },
  { id: "translate", label: "Translate" },
  { id: "generate_tags", label: "Generate tags" },
  { id: "social_posts", label: "Social posts" },
];

export async function runMockAiGeneration(
  input: {
    prompt: string;
    actionId?: AiQuickActionId;
    context: EditorAiContext;
    onTaskUpdate: (tasks: { id: string; label: string; status: "pending" | "running" | "done" }[]) => void;
  }
): Promise<AiResponse> {
  if (isProductionDeployment()) {
    throw new Error("Mock AI is disabled in production");
  }

  const tasks = [
    { id: "1", label: "Reading draft context", status: "pending" as const },
    { id: "2", label: "Applying newsroom style", status: "pending" as const },
    { id: "3", label: "Preparing suggestions", status: "pending" as const },
  ];

  const tick = async (index: number) => {
    const next = tasks.map((t, i) => ({
      ...t,
      status: (i < index ? "done" : i === index ? "running" : "pending") as
        | "pending"
        | "running"
        | "done",
    }));
    input.onTaskUpdate(next);
    await delay(380 + index * 220);
  };

  input.onTaskUpdate(tasks);
  await tick(0);
  await tick(1);
  await tick(2);
  input.onTaskUpdate(
    tasks.map((t) => ({ ...t, status: "done" as const }))
  );

  const action = input.actionId;
  const { headline, summary, bodyMarkdown, language } = input.context;
  const base = excerpt(bodyMarkdown || summary || headline, 80);

  if (action === "improve_headline" || input.prompt.toLowerCase().includes("headline")) {
    const items = [
      `${headline || "Untitled"} — updated for clarity`,
      `Breaking: ${excerpt(headline || base, 48)}`,
      `${excerpt(summary || base, 56) || "Story"} | Jan Darpan`,
    ];
    return {
      id: createAiId(),
      kind: "headlines",
      title: "Headline options",
      content: "Pick a headline to apply to the story.",
      items,
      createdAt: new Date().toISOString(),
      actionId: action,
    };
  }

  if (action === "generate_tags") {
    const items = [
      "breaking-news",
      "local-desk",
      language === "hi" ? "hindi" : language,
      ...headline.split(/\s+/).slice(0, 3).map((w) => w.toLowerCase().replace(/[^a-z0-9-]/gi, "")),
    ].filter(Boolean);
    return {
      id: createAiId(),
      kind: "tags",
      title: "Suggested tags",
      content: "Tags tuned for search and desk taxonomy.",
      items: [...new Set(items)].slice(0, 8),
      createdAt: new Date().toISOString(),
      actionId: action,
    };
  }

  if (action === "social_posts") {
    const content = [
      `📰 ${headline || "Story update"}`,
      excerpt(summary || bodyMarkdown, 140),
      "Read more on Jan Darpan →",
    ].join("\n\n");
    return {
      id: createAiId(),
      kind: "social",
      title: "Social post draft",
      content,
      createdAt: new Date().toISOString(),
      actionId: action,
    };
  }

  if (action === "summarize") {
    return {
      id: createAiId(),
      kind: "text",
      title: "Summary",
      content:
        summary ||
        `A concise summary of the story: ${excerpt(bodyMarkdown, 200) || "Add body copy to generate a stronger summary."}`,
      createdAt: new Date().toISOString(),
      actionId: action,
    };
  }

  if (action === "translate") {
    return {
      id: createAiId(),
      kind: "body",
      title: "Translated body (mock EN)",
      content: `[Translated mock]\n\n${bodyMarkdown || "No body to translate yet."}`,
      createdAt: new Date().toISOString(),
      actionId: action,
    };
  }

  if (action === "rewrite") {
    return {
      id: createAiId(),
      kind: "body",
      title: "Rewritten draft",
      content: bodyMarkdown
        ? bodyMarkdown
            .split(/\n\n+/)
            .map((p) => p.trim())
            .filter(Boolean)
            .map((p, i) => (i === 0 ? p : `Revised — ${p}`))
            .join("\n\n")
        : "Add story body copy, then run Rewrite for a full draft pass.",
      createdAt: new Date().toISOString(),
      actionId: action,
    };
  }

  const userPrompt = input.prompt.trim();
  return {
    id: createAiId(),
    kind: "text",
    title: userPrompt ? "Assistant reply" : "Suggestion",
    content: userPrompt
      ? `Based on your prompt (“${excerpt(userPrompt, 60)}”), here is a desk-ready note about “${excerpt(headline, 40)}”: ${excerpt(bodyMarkdown || summary, 160) || "Add more copy for richer suggestions."}`
      : `Reviewing “${excerpt(headline, 50)}”. ${excerpt(bodyMarkdown || summary, 180) || "The draft is still thin — add quotes and local context."}`,
    createdAt: new Date().toISOString(),
    actionId: action,
  };
}
