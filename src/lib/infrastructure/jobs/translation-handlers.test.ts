import { beforeEach, describe, expect, it, vi } from "vitest";

const configured = vi.fn(() => true);
vi.mock("@/lib/ai/providers/chat", () => ({ isAnyChatProviderConfigured: () => configured() }));
vi.mock("@/lib/supabase", () => ({ createAdminServerClient: () => { throw new Error("db must not be touched in these tests"); } }));

import { translateArticle } from "./translation-handlers";

const job = (payload: Record<string, unknown>) =>
  ({ id: "j1", job_type: "translate_article", payload, tenant_id: null, priority: 5, attempts: 0, status: "processing", last_error: null, dedupe_key: null }) as never;

beforeEach(() => {
  configured.mockReset();
  configured.mockReturnValue(true);
  delete process.env.OPENAI_API_KEY;
});

describe("translate_article provider guard", () => {
  it("skips (visibly) only when NO AI provider is configured", async () => {
    configured.mockReturnValue(false);
    expect(await translateArticle(job({ articleId: "a" }))).toEqual({ ok: true, result: { skipped: true, reason: "no_ai_provider" } });
  });

  it("does NOT require an OpenAI key: with Gemini/Groq configured the job proceeds past the guard", async () => {
    // no OPENAI_API_KEY is set; an empty payload must fail validation (not be silently skipped as before)
    const out = (await translateArticle(job({}))) as { ok: boolean; error?: string; result?: { reason?: string } };
    expect(out.result?.reason).not.toBe("no_openai");
    expect(out.ok).toBe(false);
    expect(out.error).toBe("articleId_required");
  });
});
