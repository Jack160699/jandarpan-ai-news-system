import type { ChatCompletionRequest } from "./types";

export function allowsPromptCache(
  policy: ChatCompletionRequest["cachePolicy"]
): boolean {
  return policy !== "bypass";
}
