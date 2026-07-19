import { afterEach, describe, expect, it } from "vitest";
import { isE2eAuthEnabled } from "@/lib/auth/session-refresh";

const ORIGINAL = {
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_ENV: process.env.VERCEL_ENV,
  VERCEL: process.env.VERCEL,
  ENABLE_E2E_AUTH: process.env.ENABLE_E2E_AUTH,
};

afterEach(() => {
  const env = process.env as Record<string, string | undefined>;
  env.NODE_ENV = ORIGINAL.NODE_ENV;
  env.VERCEL_ENV = ORIGINAL.VERCEL_ENV;
  env.VERCEL = ORIGINAL.VERCEL;
  env.ENABLE_E2E_AUTH = ORIGINAL.ENABLE_E2E_AUTH;
});

function setEnv(key: string, value: string | undefined) {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) delete env[key];
  else env[key] = value;
}

describe("isE2eAuthEnabled", () => {
  it("ENABLE_E2E_AUTH wins over pulled VERCEL=1", () => {
    setEnv("NODE_ENV", "development");
    setEnv("VERCEL", "1");
    setEnv("VERCEL_ENV", "preview");
    setEnv("ENABLE_E2E_AUTH", "1");
    expect(isE2eAuthEnabled()).toBe(true);
  });

  it("strips quoted Vercel env flags from pulled .env.local", () => {
    setEnv("NODE_ENV", "development");
    setEnv("VERCEL", '"1"');
    setEnv("VERCEL_ENV", '"preview"');
    setEnv("ENABLE_E2E_AUTH", "1");
    expect(isE2eAuthEnabled()).toBe(true);
  });

  it("never enables in production", () => {
    setEnv("NODE_ENV", "production");
    setEnv("ENABLE_E2E_AUTH", "1");
    expect(isE2eAuthEnabled()).toBe(false);
  });
});
