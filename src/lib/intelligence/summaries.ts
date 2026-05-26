/**
 * Automated editorial summaries (extractive — no LLM required)
 */

export function buildAutomatedSummary(input: {
  headline: string;
  summary: string | null;
  articleBody?: string | null;
  maxChars?: number;
}): string {
  const maxChars = input.maxChars ?? 220;
  const base = (input.summary ?? "").trim();
  if (base.length >= 40) {
    return truncateAtSentence(base, maxChars);
  }

  const body = (input.articleBody ?? "").trim();
  if (body.length >= 60) {
    const firstPara = body.split(/\n\n+/)[0]?.replace(/^#+\s*/gm, "").trim() ?? body;
    return truncateAtSentence(firstPara, maxChars);
  }

  return truncateAtSentence(input.headline, maxChars);
}

function truncateAtSentence(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max);
  const lastStop = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("। "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? ")
  );
  if (lastStop > max * 0.5) return `${slice.slice(0, lastStop + 1).trim()}…`;
  return `${slice.trim()}…`;
}

export async function buildAiSummaryOptional(input: {
  headline: string;
  summary: string;
  articleBody: string;
}): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 120,
      messages: [
        {
          role: "system",
          content:
            "Write a 2-sentence neutral news desk summary in Hindi or English matching the article language. No hype.",
        },
        {
          role: "user",
          content: `Headline: ${input.headline}\n\nBody excerpt:\n${input.articleBody.slice(0, 1200)}`,
        },
      ],
    }),
  });

  if (!res.ok) return null;
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content?.trim() ?? null;
}
