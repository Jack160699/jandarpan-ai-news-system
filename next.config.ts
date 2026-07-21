import type { NextConfig } from "next";
import path from "path";
import { LEGACY_DASHBOARD_REDIRECTS } from "./src/lib/admin-platform/legacy-redirects";
import { TRUSTED_REMOTE_PATTERNS } from "./src/lib/news/images/trusted-remote-hosts";

const nextConfig: NextConfig = {
  // Keep Turbopack rooted at this package (git worktrees otherwise pick the parent lockfile)
  turbopack: {
    root: path.join(__dirname),
  },
  transpilePackages: ["@stratxcel/platform"],
  images: {
    remotePatterns: TRUSTED_REMOTE_PATTERNS.map((p) => ({
      protocol: p.protocol,
      hostname: p.hostname,
      ...(p.pathname ? { pathname: p.pathname } : {}),
    })),
  },
  async redirects() {
    return [
      ...LEGACY_DASHBOARD_REDIRECTS.map((r) => ({
        source: r.source,
        destination: r.destination,
        permanent: true,
      })),
      {
        source: "/admin/dashboard",
        destination: "/admin/overview",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
