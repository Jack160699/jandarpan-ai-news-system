/**
 * Build and deployment metadata — admin diagnostics only.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

export type BuildInfo = {
  appVersion: string;
  buildId: string | null;
  gitSha: string | null;
  gitBranch: string | null;
  deploymentId: string | null;
  vercelEnv: string | null;
  nodeEnv: string;
};

function readBuildId(): string | null {
  try {
    return readFileSync(join(process.cwd(), ".next", "BUILD_ID"), "utf8").trim();
  } catch {
    return null;
  }
}

/** Safe build metadata — no secrets. */
export function getBuildInfo(): BuildInfo {
  let appVersion = "0.0.0";
  try {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8")
    ) as { version?: string };
    appVersion = pkg.version ?? appVersion;
  } catch {
    /* default */
  }

  return {
    appVersion,
    buildId: readBuildId(),
    gitSha: process.env.VERCEL_GIT_COMMIT_SHA?.trim() ?? null,
    gitBranch: process.env.VERCEL_GIT_COMMIT_REF?.trim() ?? null,
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID?.trim() ?? null,
    vercelEnv: process.env.VERCEL_ENV?.trim() ?? null,
    nodeEnv: process.env.NODE_ENV ?? "development",
  };
}
