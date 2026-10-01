import { describe, expect, it } from "vitest";
import { drainBackground, runInBackground } from "./background.edge";

describe("Edge background-task port", () => {
  it("tracks tasks and drain waits for them to finish (usage writes land inside the invocation)", async () => {
    let done = false;
    runInBackground(async () => {
      await new Promise((r) => setTimeout(r, 30));
      done = true;
    });
    expect(done).toBe(false);
    await drainBackground(1000);
    expect(done).toBe(true);
  });

  it("a failing task never throws into the caller or the drain", async () => {
    runInBackground(() => Promise.reject(new Error("write failed")));
    await expect(drainBackground(1000)).resolves.toBeUndefined();
  });

  it("drain is bounded: a hung write cannot consume the invocation", async () => {
    runInBackground(() => new Promise(() => {}));
    const t0 = Date.now();
    await drainBackground(80);
    expect(Date.now() - t0).toBeLessThan(500);
  });
});
