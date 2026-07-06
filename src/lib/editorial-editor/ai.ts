import type { EditorAiAction } from "@/lib/editorial-editor/types";
import { recordDirectChatCompletion } from "@/lib/observability/openai-cost";

type AiInput = {
  action: EditorAiAction;
  headline: string;
  summary: string;
  body: string;
  language: string;
  tone?: string;
  targetLang?: string;
};

async function chatCompletion(
  system: string,
  user: string,
  operation: string
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const started = Date.now();

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 800,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  const latencyMs = Date.now() - started;

  if (!res.ok) {
    recordDirectChatCompletion({
      operation,
      model,
      system,
      user,
      latencyMs,
      success: false,
      context: { worker: "editor_ai" },
    });
    return null;
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content?.trim() ?? null;
  recordDirectChatCompletion({
    operation,
    model,
    system,
    user,
    json,
    content: content ?? undefined,
    latencyMs,
    success: Boolean(content),
    context: { worker: "editor_ai" },
  });
  return content;
}

export async function runEditorAiAction(
  input: AiInput
): Promise<{ ok: boolean; result?: Record<string, unknown>; error?: string }> {
  const excerpt = input.body.slice(0, 4000);
  const lang = input.language === "hi" ? "Hindi" : "English";

  switch (input.action) {
    case "rewrite": {
      const text = await chatCompletion(
        `You are a senior ${lang} news editor. Rewrite for clarity and neutrality. Return only the rewritten body markdown.`,
        `Headline: ${input.headline}\n\nBody:\n${excerpt}`,
        "editor_rewrite"
      );
      if (!text) return { ok: false, error: "ai_unavailable" };
      return { ok: true, result: { body: text } };
    }
    case "headlines": {
      const text = await chatCompletion(
        "Suggest 5 distinct headline options for a regional Indian newsroom. Return JSON array of strings only.",
        `Current: ${input.headline}\nSummary: ${input.summary}\nExcerpt: ${excerpt.slice(0, 600)}`,
        "editor_headlines"
      );
      if (!text) return { ok: false, error: "ai_unavailable" };
      try {
        const parsed = JSON.parse(text.replace(/```json|```/g, "").trim()) as string[];
        return { ok: true, result: { headlines: parsed.slice(0, 5) } };
      } catch {
        return { ok: true, result: { headlines: text.split("\n").filter(Boolean).slice(0, 5) } };
      }
    }
    case "seo": {
      const text = await chatCompletion(
        "Return JSON: { seo_title, seo_description, focus_keyword } optimized for Google News India.",
        `Headline: ${input.headline}\nSummary: ${input.summary}`,
        "editor_seo"
      );
      if (!text) return { ok: false, error: "ai_unavailable" };
      try {
        const parsed = JSON.parse(text.replace(/```json|```/g, "").trim()) as Record<string, string>;
        return { ok: true, result: parsed };
      } catch {
        return { ok: false, error: "ai_parse_failed" };
      }
    }
    case "grammar": {
      const text = await chatCompletion(
        `Fix grammar and spelling in ${lang}. Return only corrected body markdown.`,
        excerpt,
        "editor_grammar"
      );
      if (!text) return { ok: false, error: "ai_unavailable" };
      return { ok: true, result: { body: text } };
    }
    case "summarize": {
      const text = await chatCompletion(
        `Write a 2-sentence dek/summary in ${lang}. Return plain text only.`,
        `Headline: ${input.headline}\n\n${excerpt.slice(0, 1500)}`,
        "editor_summarize"
      );
      if (!text) return { ok: false, error: "ai_unavailable" };
      return { ok: true, result: { summary: text } };
    }
    case "translate": {
      const target = input.targetLang === "hi" ? "Hindi" : "English";
      const text = await chatCompletion(
        `Translate headline, summary, and body to ${target}. Return JSON: { headline, summary, body }`,
        JSON.stringify({
          headline: input.headline,
          summary: input.summary,
          body: excerpt.slice(0, 2500),
        }),
        "editor_translate"
      );
      if (!text) return { ok: false, error: "ai_unavailable" };
      try {
        const parsed = JSON.parse(text.replace(/```json|```/g, "").trim()) as Record<string, string>;
        return { ok: true, result: parsed };
      } catch {
        return { ok: false, error: "ai_parse_failed" };
      }
    }
    case "tone": {
      const tone = input.tone ?? "neutral";
      const text = await chatCompletion(
        `Adjust tone to "${tone}" for Indian regional news. Return only body markdown.`,
        excerpt,
        "editor_tone"
      );
      if (!text) return { ok: false, error: "ai_unavailable" };
      return { ok: true, result: { body: text } };
    }
    case "tags": {
      const text = await chatCompletion(
        "Suggest 6–8 lowercase topic tags for Chhattisgarh news SEO. Return JSON array of strings.",
        `Headline: ${input.headline}\n${input.summary}`,
        "editor_tags"
      );
      if (!text) return { ok: false, error: "ai_unavailable" };
      try {
        const parsed = JSON.parse(text.replace(/```json|```/g, "").trim()) as string[];
        return { ok: true, result: { tags: parsed } };
      } catch {
        return { ok: true, result: { tags: text.split(",").map((t) => t.trim()) } };
      }
    }
    default:
      return { ok: false, error: "unknown_action" };
  }
}
