import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";

const stylesDir = path.join(__dirname, "styles");

async function readCss(...names: string[]) {
  const chunks = await Promise.all(names.map((n) => readFile(path.join(stylesDir, n), "utf8")));
  return chunks.join("\n");
}

describe("reader-ds Hindi typography tokens", () => {
  it("defines Hindi-safe type scale and leading tokens", async () => {
    const css = await readCss("typography.css", "tokens.css");

    for (const token of [
      "--jd-type-masthead",
      "--jd-type-breaking-label",
      "--jd-type-breaking-headline",
      "--jd-type-lead",
      "--jd-type-card",
      "--jd-type-card-sm",
      "--jd-type-section",
      "--jd-type-body",
      "--jd-type-summary",
      "--jd-type-meta",
      "--jd-type-button",
      "--jd-type-nav",
      "--jd-type-caption",
      "--jd-type-footer-h",
      "--jd-type-footer-link",
      "--jd-lh-display",
      "--jd-lh-headline",
      "--jd-lh-body",
      "--jd-lh-ui",
      "--jd-lh-meta",
      "--jd-lh-label",
    ]) {
      expect(css).toContain(token);
    }

    // Metadata / nav floors from the brief
    expect(css).toMatch(/--jd-type-meta:\s*0\.8125rem/);
    expect(css).toMatch(/--jd-type-nav:\s*0\.75rem/);
    expect(css).toMatch(/--jd-type-lead:\s*clamp\(1\.75rem/);
  });

  it("keeps Devanagari leading above the unsafe Latin threshold", async () => {
    const css = await readCss("typography.css");
    const leads = [...css.matchAll(/--jd-lh-[a-z-]+:\s*([0-9.]+)/g)].map((m) => Number(m[1]));
    expect(leads.length).toBeGreaterThanOrEqual(5);
    for (const lh of leads) {
      expect(lh).toBeGreaterThanOrEqual(1.35);
    }
  });

  it("uses Hindi-first stacks with English-capable fallbacks", async () => {
    const css = await readCss("typography.css", "tokens.css");
    expect(css).toMatch(/Noto Serif Devanagari/);
    expect(css).toMatch(/Noto Sans Devanagari/);
    expect(css).toMatch(/Tiro Devanagari Hindi/);
    expect(css).toMatch(/Mukta/);
    expect(css).toMatch(/Georgia|system-ui/);
  });

  it("prevents vertical clipping on breaking strip and masthead containers", async () => {
    const css = await readCss("tokens.css", "responsive.css", "typography.css");

    expect(css).toContain("overflow-y: visible");
    expect(css).toMatch(/\.jd-breaking-strip__badge[\s\S]*?overflow:\s*visible/);
    expect(css).toMatch(/\.jd-breaking-strip__headline[\s\S]*?overflow:\s*visible/);
    expect(css).toMatch(/\.jd-masthead__inner[\s\S]*?overflow-y:\s*visible/);
    expect(css).not.toMatch(/\.jd-breaking-strip__badge[\s\S]*?line-height:\s*1(?:\.0+|\.1|\.2)?[;\s]/);
  });

  it("keeps reduced-motion breaking ticker static without removing glyph safety", async () => {
    const css = await readCss("tokens.css");
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(css).toMatch(/\.jd-breaking-strip__track[\s\S]*?animation:\s*none/);
    expect(css).toContain("jd-breaking-strip__pulse");
  });

  it("preloads Devanagari UI/brand fonts to reduce swap clipping", async () => {
    const fonts = await readFile(path.join(__dirname, "fonts.ts"), "utf8");
    const readerFonts = await readFile(
      path.join(__dirname, "../../lib/fonts/reader-fonts.ts"),
      "utf8"
    );
    expect(fonts).toMatch(/preload:\s*true/);
    expect(fonts.match(/preload:\s*true/g)?.length).toBeGreaterThanOrEqual(2);
    expect(readerFonts).toMatch(/Noto_Serif_Devanagari[\s\S]*preload:\s*true/);
  });
});

describe("reader-ds Hindi typography component contracts", () => {
  it("masthead wordmark avoids line-height 1.1 overflow crop", async () => {
    const src = await readFile(path.join(__dirname, "components/Masthead.tsx"), "utf8");
    expect(src).toContain("jd-type-masthead");
    expect(src).not.toMatch(/lineHeight:\s*1\.1/);
    expect(src).toMatch(/overflowY:\s*"visible"/);
  });

  it("bottom nav labels meet minimum readable size token", async () => {
    const src = await readFile(path.join(__dirname, "components/BottomNav.tsx"), "utf8");
    expect(src).toContain("jd-type-nav");
    expect(src).not.toMatch(/fontSize:\s*9(?:\.5)?/);
    expect(src).not.toMatch(/lineHeight:\s*1\.1/);
  });

  it("lead and card headlines use type roles, not undersized fixed px", async () => {
    const lead = await readFile(path.join(__dirname, "components/LeadStory.tsx"), "utf8");
    const secondary = await readFile(path.join(__dirname, "components/SecondaryStory.tsx"), "utf8");
    expect(lead).toContain("jd-type-lead");
    expect(lead).not.toMatch(/fontSize:\s*22/);
    expect(secondary).toContain("jd-type-card");
    expect(secondary).not.toMatch(/fontSize:\s*15/);
  });

  it("Tag does not force uppercase on Devanagari kickers", async () => {
    const src = await readFile(path.join(__dirname, "components/primitives.tsx"), "utf8");
    expect(src).toContain("data-script");
    expect(src).toContain("jd-type-tag");
    expect(src).not.toMatch(/textTransform:\s*"uppercase"/);
  });

  it("long Hindi headline remains accessible via title attribute", async () => {
    const lead = await readFile(path.join(__dirname, "components/LeadStory.tsx"), "utf8");
    const strip = await readFile(path.join(__dirname, "components/BreakingStrip.tsx"), "utf8");
    expect(lead).toMatch(/title=\{story\.headline\}/);
    expect(strip).toMatch(/title=\{item\.headline\}|title=\{primary\.headline\}/);
  });
});
