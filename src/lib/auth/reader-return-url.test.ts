import { describe, expect, it } from "vitest";
import {
  buildReaderOAuthRedirectTo,
  isRejectedReaderReturnUrl,
  sanitizeReaderReturnUrl,
} from "./reader-return-url";

describe("sanitizeReaderReturnUrl", () => {
  it("allows safe in-app paths", () => {
    expect(sanitizeReaderReturnUrl("/archive")).toBe("/archive");
    expect(sanitizeReaderReturnUrl("/archive/saved")).toBe("/archive/saved");
    expect(sanitizeReaderReturnUrl("/?district=durg")).toBe("/?district=durg");
  });

  it("rejects open redirects and privileged paths", () => {
    expect(sanitizeReaderReturnUrl("https://evil.example")).toBe("/archive");
    expect(sanitizeReaderReturnUrl("//evil.example")).toBe("/archive");
    expect(sanitizeReaderReturnUrl("/admin")).toBe("/archive");
    expect(sanitizeReaderReturnUrl("/admin/team")).toBe("/archive");
    expect(sanitizeReaderReturnUrl("/dashboard")).toBe("/archive");
    expect(sanitizeReaderReturnUrl("/api/reader/profile")).toBe("/archive");
    expect(sanitizeReaderReturnUrl("/auth/callback")).toBe("/archive");
    expect(sanitizeReaderReturnUrl("\\evil")).toBe("/archive");
  });

  it("flags rejected return URLs", () => {
    expect(isRejectedReaderReturnUrl("https://phish.test")).toBe(true);
    expect(isRejectedReaderReturnUrl("/archive")).toBe(false);
    expect(isRejectedReaderReturnUrl(null)).toBe(false);
  });

  it("builds OAuth redirectTo with optional next", () => {
    expect(buildReaderOAuthRedirectTo("https://news.example")).toBe(
      "https://news.example/auth/callback"
    );
    expect(
      buildReaderOAuthRedirectTo("https://news.example", "/archive/saved")
    ).toBe("https://news.example/auth/callback?next=%2Farchive%2Fsaved");
    expect(
      buildReaderOAuthRedirectTo("https://news.example", "https://evil.test")
    ).toBe("https://news.example/auth/callback");
  });
});
