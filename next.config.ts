import type { NextConfig } from "next";
import { LEGACY_DASHBOARD_REDIRECTS } from "./src/lib/admin-platform/legacy-redirects";

const nextConfig: NextConfig = {
  transpilePackages: ["@stratxcel/platform"],
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
