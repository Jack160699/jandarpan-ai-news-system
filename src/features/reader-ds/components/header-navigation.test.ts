import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  JAN_DARPAN_BRAND_ASSETS,
  JAN_DARPAN_COMPACT_LOGO_INTRINSIC,
  JAN_DARPAN_MASTHEAD_FORBIDDEN_ASSETS,
} from "@/lib/brand/assets";
import {
  getPrimaryNavItems,
  PRIMARY_NAV_ITEMS,
  type PrimaryNavKey,
} from "../components/navItems";
import { MASTHEAD_LOGO_DISPLAY } from "../components/MastheadBrandLogo";

const root = join(__dirname, "../../../..");
const publicBrand = join(root, "public/brand/jan-darpan");

describe("approved masthead logo asset", () => {
  it("selects compact-dark lockup for navy phone masthead", () => {
    expect(JAN_DARPAN_BRAND_ASSETS.logoCompactDark).toBe(
      "/brand/jan-darpan/logo/compact-dark.svg"
    );
    expect(JAN_DARPAN_COMPACT_LOGO_INTRINSIC).toEqual({ width: 230, height: 48 });
    expect(MASTHEAD_LOGO_DISPLAY).toEqual({ width: 134, height: 28 });
    expect(
      Math.abs(
        MASTHEAD_LOGO_DISPLAY.width / MASTHEAD_LOGO_DISPLAY.height - 230 / 48
      )
    ).toBeLessThan(0.02);
  });

  it("ships the compact-dark file on disk", () => {
    const abs = join(publicBrand, "logo/compact-dark.svg");
    expect(existsSync(abs)).toBe(true);
    const svg = readFileSync(abs, "utf8");
    expect(svg).toContain("जन दर्पण");
    expect(svg).toContain('viewBox="0 0 230 48"');
  });

  it("does not use favicon or app-icon as the masthead asset", () => {
    expect(JAN_DARPAN_MASTHEAD_FORBIDDEN_ASSETS).toContain(
      JAN_DARPAN_BRAND_ASSETS.faviconSvg
    );
    expect(JAN_DARPAN_MASTHEAD_FORBIDDEN_ASSETS).toContain(
      JAN_DARPAN_BRAND_ASSETS.appIcon
    );
    expect(JAN_DARPAN_MASTHEAD_FORBIDDEN_ASSETS).not.toContain(
      JAN_DARPAN_BRAND_ASSETS.logoCompactDark
    );
    expect(JAN_DARPAN_BRAND_ASSETS.logoCompactDark).not.toMatch(/favicon|app-icon|apple-icon/i);
  });

  it("MastheadBrandLogo source references compact-dark only", () => {
    const src = readFileSync(
      join(__dirname, "../components/MastheadBrandLogo.tsx"),
      "utf8"
    );
    expect(src).toContain("logoCompactDark");
    expect(src).toContain('data-jd-brand-asset="compact-dark"');
    expect(src).not.toContain("JAN_DARPAN_BRAND_ASSETS.faviconSvg");
    expect(src).not.toContain("JAN_DARPAN_BRAND_ASSETS.appIcon");
  });
});

describe("masthead header actions", () => {
  it("wires Search, Notifications, and Profile into Masthead", () => {
    const src = readFileSync(join(__dirname, "../components/Masthead.tsx"), "utf8");
    expect(src).toContain("MastheadSearchButton");
    expect(src).toContain("MastheadNotifyButton");
    expect(src).toContain("MastheadProfileButton");
    expect(src).toContain('data-jd-masthead-actions={hideActions ? "hidden" : "search-notify-profile"}');
  });

  it("Search opens the real overlay (not a dead control)", () => {
    const src = readFileSync(
      join(__dirname, "../components/MastheadSearchButton.tsx"),
      "utf8"
    );
    expect(src).toContain("setSearchOpen(true)");
    expect(src).toContain("minWidth: 44");
    expect(src).toContain("minHeight: 44");
  });

  it("Notifications links to /notifications with stable badge slot", () => {
    const src = readFileSync(
      join(__dirname, "../components/MastheadNotifyButton.tsx"),
      "utf8"
    );
    expect(src).toContain('href="/notifications"');
    expect(src).toContain("position: \"absolute\"");
    expect(src).toContain("unreadCount");
    expect(src).toContain("showBadge");
    // No hard-coded fake always-on badge
    expect(src).not.toMatch(/unreadCount\s*=\s*[1-9]/);
  });

  it("Profile links to /archive with logged-in avatar / logged-out icon fallback", () => {
    const src = readFileSync(
      join(__dirname, "../components/MastheadProfileButton.tsx"),
      "utf8"
    );
    expect(src).toContain('href="/archive"');
    expect(src).toContain("avatarUrl");
    expect(src).toContain('name="user"');
    expect(src).toContain("jd-masthead-avatar-fallback");
    expect(src).toContain("width: AVATAR_SIZE");
    expect(src).toContain("height: AVATAR_SIZE");
  });

  it("does not duplicate account control in bottom nav", () => {
    const keys = getPrimaryNavItems("hi").map((i) => i.key);
    expect(keys).not.toContain("more" as PrimaryNavKey);
    expect(PRIMARY_NAV_ITEMS.every((i) => i.href !== "/archive")).toBe(true);
  });
});

describe("bottom navigation destinations", () => {
  it("keeps four primary reading destinations plus Videos", () => {
    const items = getPrimaryNavItems("hi");
    expect(items).toHaveLength(5);
    expect(items.map((i) => i.key)).toEqual([
      "home",
      "district",
      "latest",
      "listen",
      "videos",
    ]);
    expect(items.map((i) => i.href)).toEqual([
      "/",
      "/district",
      "/latest",
      "/listen",
      "/shorts",
    ]);
    expect(items.find((i) => i.key === "videos")?.label).toBe("वीडियो");
  });

  it("exposes English labels for the same routes", () => {
    const items = getPrimaryNavItems("en");
    expect(items.find((i) => i.key === "videos")?.label).toBe("Videos");
    expect(items.find((i) => i.key === "district")?.label).toBe("District");
  });

  it("BottomNav source has no More/अधिक destination", () => {
    const src = readFileSync(join(__dirname, "../components/BottomNav.tsx"), "utf8");
    expect(src).not.toContain('key: "more"');
    expect(src).not.toContain("/archive");
    expect(src).toContain("minHeight: 48");
    expect(src).toContain("aria-current");
    expect(src).toContain("safe-area-inset-bottom");
  });

  it("navItems source documents five-item behavior without Search duplication", () => {
    const src = readFileSync(join(__dirname, "../components/navItems.ts"), "utf8");
    expect(src).toContain('key: "videos"');
    expect(src).not.toContain('key: "more"');
    expect(src).not.toContain('href: "/search"');
  });
});

describe("utility row alignment contract", () => {
  it("uses a balanced three-column grid without clipping district", () => {
    const src = readFileSync(join(__dirname, "../components/UtilityRow.tsx"), "utf8");
    expect(src).toContain('gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)"');
    expect(src).toContain("textOverflow: \"ellipsis\"");
    expect(src).toContain("overflow: \"hidden\"");
    expect(src).toContain('href={districtHref}');
  });
});
