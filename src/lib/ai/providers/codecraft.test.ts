import { describe, expect, it } from "vitest";
import { parseSseChunks, readCodeCraftUsage } from "./codecraft";

describe("readCodeCraftUsage", () => {
  it("reads OpenAI-style and input/output-style usage", () => {
    expect(readCodeCraftUsage({ prompt_tokens: 338, completion_tokens: 494, total_tokens: 832 })).toEqual({ inputTokens: 338, outputTokens: 494 });
    expect(readCodeCraftUsage({ input_tokens: 5, output_tokens: 7 })).toEqual({ inputTokens: 5, outputTokens: 7 });
  });
  it("rejects missing, malformed or all-zero usage so the estimate is used instead", () => {
    for (const bad of [undefined, null, "x", {}, { prompt_tokens: "a", completion_tokens: 1 }, { prompt_tokens: -1, completion_tokens: 1 }, { prompt_tokens: 0, completion_tokens: 0 }]) {
      expect(readCodeCraftUsage(bad)).toBeUndefined();
    }
  });
});

describe("parseSseChunks usage", () => {
  const chunk = (o: unknown) => `data: ${JSON.stringify(o)}`;
  const sse = [
    chunk({ model: "m", choices: [{ delta: { content: "{\"ok\": " } }] }),
    chunk({ model: "m", choices: [{ delta: { content: "true}" } }] }),
    chunk({ model: "m", choices: [{ delta: {}, finish_reason: "stop" }], usage: { prompt_tokens: 338, completion_tokens: 494, total_tokens: 832 } }),
    "data: [DONE]",
  ].join("\n\n");

  it("captures real usage from the final stream chunk alongside the content", () => {
    const r = parseSseChunks(sse);
    expect(r.content).toBe('{"ok": true}');
    expect(r.usage).toEqual({ inputTokens: 338, outputTokens: 494 });
  });
  it("returns no usage when the stream carries none (caller falls back to the estimate)", () => {
    const r = parseSseChunks(`${chunk({ choices: [{ delta: { content: "hi" } }] })}\n\ndata: [DONE]`);
    expect(r.content).toBe("hi");
    expect(r.usage).toBeUndefined();
  });
  it("reads usage from a direct non-streamed JSON body", () => {
    const r = parseSseChunks(JSON.stringify({ choices: [{ message: { content: "hello" } }], usage: { prompt_tokens: 3, completion_tokens: 4 } }));
    expect(r).toEqual({ content: "hello", usage: { inputTokens: 3, outputTokens: 4 } });
  });
});
