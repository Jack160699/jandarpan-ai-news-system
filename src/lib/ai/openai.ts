const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_IMAGE_URL = "https://api.openai.com/v1/images/generations";

const DEFAULT_TIMEOUT_MS = 45_000;

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export class AiServiceError extends Error {
  constructor(
    message: string,
    readonly code: string
  ) {
    super(message);
    this.name = "AiServiceError";
  }
}

function getApiKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new AiServiceError("OpenAI is not configured", "ai_unavailable");
  }
  return key;
}

export async function chatJsonCompletion(input: {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}): Promise<string> {
  const apiKey = getApiKey();
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    input.timeoutMs ?? DEFAULT_TIMEOUT_MS
  );

  try {
    const res = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
        temperature: input.temperature ?? 0.35,
        max_tokens: input.maxTokens ?? 1400,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new AiServiceError(
        detail.slice(0, 200) || `OpenAI HTTP ${res.status}`,
        res.status === 429 ? "ai_rate_limit" : "ai_upstream_error"
      );
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new AiServiceError("Empty model response", "ai_empty_response");
    }
    return content;
  } catch (err) {
    if (err instanceof AiServiceError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new AiServiceError("AI request timed out", "ai_timeout");
    }
    throw new AiServiceError(
      err instanceof Error ? err.message : "AI request failed",
      "ai_request_failed"
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateCoverImage(input: {
  prompt: string;
  timeoutMs?: number;
}): Promise<string> {
  const apiKey = getApiKey();
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    input.timeoutMs ?? 60_000
  );

  try {
    const res = await fetch(OPENAI_IMAGE_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL?.trim() || "dall-e-3",
        prompt: input.prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
      }),
    });

    if (!res.ok) {
      throw new AiServiceError(`Image API HTTP ${res.status}`, "ai_image_failed");
    }

    const json = (await res.json()) as {
      data?: Array<{ url?: string }>;
    };
    const url = json.data?.[0]?.url;
    if (!url) {
      throw new AiServiceError("No image URL returned", "ai_image_empty");
    }
    return url;
  } catch (err) {
    if (err instanceof AiServiceError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new AiServiceError("Image generation timed out", "ai_timeout");
    }
    throw new AiServiceError(
      err instanceof Error ? err.message : "Image generation failed",
      "ai_image_failed"
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function parseJsonFromModel<T>(raw: string): T {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(cleaned) as T;
}
