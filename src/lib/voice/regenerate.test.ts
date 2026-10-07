import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { planAudio } from "@/lib/voice/generate-article-audio";
import { regenerateArticleAudio, type AudioQueueRow, type AudioRegenerateRepo } from "@/lib/voice/regenerate";

function fakeRepo(rows: AudioQueueRow[]) {
  const audits: unknown[] = [];
  const repo: AudioRegenerateRepo = {
    listForArticle: async () => rows.map((r) => ({ ...r })),
    requeue: async (ids) => {
      let n = 0;
      for (const r of rows) if (ids.includes(r.id) && (r.status === "failed" || r.status === "invalid")) ((r.status = "pending"), n++);
      return n;
    },
    audit: async (e) => void audits.push(e),
  };
  return { repo, audits, rows };
}
const row = (id: string, status: AudioQueueRow["status"], language = "hi-IN"): AudioQueueRow => ({ id, article_id: "a1", language, script_kind: "radio", status });

describe("regenerateArticleAudio", () => {
  it("requeues only failed/invalid rows; ready audio is a cache hit and is never touched", async () => {
    const { repo, rows, audits } = fakeRepo([row("1", "ready"), row("2", "failed", "en-IN"), row("3", "invalid"), row("4", "generating")]);
    const r = await regenerateArticleAudio(repo, "admin-1", "a1");
    expect(r).toMatchObject({ ok: true, requeued: 2, alreadyReady: 1, inProgress: 1, nothingToDo: false });
    expect(rows.find((x) => x.id === "1")!.status).toBe("ready");
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ actor_id: "admin-1", actor_kind: "admin", action: "audio.regenerate_requested" });
  });

  it("is idempotent: a second request finds nothing to do", async () => {
    const { repo } = fakeRepo([row("2", "failed")]);
    expect(await regenerateArticleAudio(repo, "a", "a1")).toMatchObject({ requeued: 1 });
    expect(await regenerateArticleAudio(repo, "a", "a1")).toMatchObject({ requeued: 0, nothingToDo: true, inProgress: 1 });
  });

  it("filters by language and reports when no audio exists", async () => {
    const { repo } = fakeRepo([row("1", "failed", "hi-IN"), row("2", "failed", "en-IN")]);
    expect(await regenerateArticleAudio(repo, "a", "a1", { language: "en-IN" })).toMatchObject({ requeued: 1 });
    expect(await regenerateArticleAudio(fakeRepo([]).repo, "a", "a1")).toMatchObject({ ok: false, code: "no_audio_rows" });
  });
});

describe("audio cache key is deterministic", () => {
  const article = { id: "x", headline: "रायपुर में नई सड़क का उद्घाटन", summary: "नगर निगम ने शनिवार को नई सड़क का उद्घाटन किया और यातायात शुरू हुआ।", article_body: "नगर निगम ने शनिवार को रायपुर में नई सड़क का उद्घाटन किया। अधिकारियों ने बताया कि इससे यातायात आसान होगा।", language: "hi" };

  it("same story and voice configuration produce the same hash; different language/text change it", () => {
    const a = planAudio(article, "radio")!;
    const b = planAudio({ ...article }, "radio")!;
    expect(a.scriptHash).toBe(b.scriptHash);
    expect(planAudio({ ...article, headline: article.headline + " आज" }, "radio")!.scriptHash).not.toBe(a.scriptHash);
    expect(planAudio({ ...article, language: "fr" }, "radio")).toBeNull();
  });
});

describe("audio can never block publication (static)", () => {
  function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p, out);
      else if (/\.ts$/.test(name) && !/\.test\.ts$/.test(name)) out.push(p);
    }
    return out;
  }

  it("no publish path imports the audio generator or provider", () => {
    const publishFiles = [...walk(join(process.cwd(), "src/lib/user-news")), ...walk(join(process.cwd(), "src/lib/newsroom"))];
    const offenders = publishFiles.filter((f) => /from\s+["']@\/lib\/voice\/(generate-article-audio|synthesize|providers)["']/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});
