import {
  isAnyChatProviderConfigured,
  requestChatCompletion,
  requestImageGeneration,
} from "@/lib/ai/providers";

const DEFAULT_TIMEOUT_MS = 45_000;

export function isOpenAiConfigured(): boolean {
  return isAnyChatProviderConfigured();
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

export async function chatJsonCompletion(input: {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}): Promise<string> {
  const result = await requestChatCompletion({
    operation: "chat_json",
    system: input.system,
    user: input.user,
    maxTokens: input.maxTokens ?? 1400,
    temperature: input.temperature ?? 0.35,
    jsonMode: true,
    timeoutMs: input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  });

  if (!result.ok) {
    throw new AiServiceError(result.error.message, result.error.code);
  }
  return result.content;
}

export async function generateCoverImage(input: {
  prompt: string;
  timeoutMs?: number;
}): Promise<string> {
  const result = await requestImageGeneration({
    operation: "cover_image",
    prompt: input.prompt,
    timeoutMs: input.timeoutMs ?? 60_000,
  });

  if ("error" in result) {
    throw new AiServiceError(result.error.message, result.error.code);
  }
  return result.url;
}

export function parseJsonFromModel<T>(raw: string): T {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(cleaned) as T;
}
