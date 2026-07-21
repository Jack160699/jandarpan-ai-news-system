import type { NextConfig } from "next";
import path from "path";
import { LEGACY_DASHBOARD_REDIRECTS } from "./src/lib/admin-platform/legacy-redirects";

const nextConfig: NextConfig = {
  // Keep Turbopack rooted at this package (git worktrees otherwise pick the parent lockfile)
  turbopack: {
    root: path.join(__dirname),
  },
  transpilePackages: ["@stratxcel/platform"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.supabase.in" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**.jandarpan.news" },
    ],
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
