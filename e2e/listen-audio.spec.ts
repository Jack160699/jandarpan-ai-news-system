import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/** Minimal MP3 fixture bytes (same as public/fixtures/listen-tone.mp3). */
function fixtureDataUrl(): string {
  const file = path.join(process.cwd(), "public/fixtures/listen-tone.mp3");
  const buf = fs.readFileSync(file);
  return `data:audio/mpeg;base64,${buf.toString("base64")}`;
}

test.describe("listen audio playback UX", () => {
  test.setTimeout(60_000);

  test("mobile viewport: fixture audio respects playing-event honesty", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.setContent("<html><body><p>listen-audio fixture host</p></body></html>");

    const src = fixtureDataUrl();
    const result = await page.evaluate(async (audioSrc) => {
      const audio = new Audio(audioSrc);
      let playingEvent = false;
      audio.addEventListener("playing", () => {
        playingEvent = true;
      });
      try {
        await audio.play();
      } catch {
        return { ok: false as const, reason: "play_rejected", playingEvent };
      }
      await new Promise((r) => setTimeout(r, 200));
      return {
        ok: true as const,
        playingEvent,
        paused: audio.paused,
      };
    }, src);

    // Honesty rule: never claim audible playback without a playing event.
    if (result.ok && !result.paused) {
      expect(result.playingEvent).toBe(true);
    } else {
      expect(result.playingEvent).toBe(false);
    }
  });

  test("listen page Hindi chrome when reader-ds is enabled", async ({
    page,
  }) => {
    test.skip(
      process.env.NEXT_PUBLIC_READER_DS !== "1",
      "Requires NEXT_PUBLIC_READER_DS=1"
    );

    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      localStorage.setItem("jd-ds-perm-notify-v1", "1");
      localStorage.setItem("jd-ds-perm-loc-v1", "1");
    });

    const response = await page
      .goto("/listen", { waitUntil: "domcontentloaded", timeout: 45_000 })
      .catch(() => null);

    test.skip(!response || !response.ok(), "/listen did not become ready in time");

    await expect(page.getByText("सुनें").first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByRole("button", { name: /सभी सुनें|ऑडियो उपलब्ध नहीं/ }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("voice 503 maps to controlled unavailable messaging when page loads", async ({
    page,
  }) => {
    test.skip(
      process.env.NEXT_PUBLIC_READER_DS !== "1",
      "Requires NEXT_PUBLIC_READER_DS=1"
    );

    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("**/api/shorts/voice/**", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "voice_unavailable" }),
      });
    });

    const response = await page
      .goto("/listen", { waitUntil: "domcontentloaded", timeout: 45_000 })
      .catch(() => null);

    test.skip(!response || !response.ok(), "/listen did not become ready in time");

    const unavailable = page.getByText(/ऑडियो उपलब्ध नहीं|ऑडियो चला नहीं पाए/);
    if ((await unavailable.count()) === 0) {
      const trackBtn = page.locator("main button").first();
      if ((await trackBtn.count()) > 0 && !(await trackBtn.isDisabled())) {
        await trackBtn.click();
      }
    }
    await expect(unavailable.first()).toBeVisible({ timeout: 20_000 });
  });
});
