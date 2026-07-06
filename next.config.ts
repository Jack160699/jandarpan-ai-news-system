import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "@tanstack/react-query",
    ],
  },
  async redirects() {
    return [
      {
        source: "/districts/:slug",
        destination: "/district/:slug",
        permanent: true,
      },
    ];
  },
  async headers() {
    const headers = Object.entries(securityHeaders()).map(([key, value]) => ({
      key,
      value,
    }));

    return [
      {
        source: "/:path*",
        headers,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      { protocol: "https", hostname: "**.gnews.io", pathname: "/**" },
      { protocol: "https", hostname: "**.bhaskar.com", pathname: "/**" },
      { protocol: "https", hostname: "**.patrika.com", pathname: "/**" },
      { protocol: "https", hostname: "**.haribhoomi.com", pathname: "/**" },
      { protocol: "https", hostname: "**.naidunia.com", pathname: "/**" },
      { protocol: "https", hostname: "**.prabhatkhabar.com", pathname: "/**" },
      { protocol: "https", hostname: "**.jagran.com", pathname: "/**" },
      { protocol: "https", hostname: "**.etvbharat.com", pathname: "/**" },
      { protocol: "https", hostname: "**.zeenews.india.com", pathname: "/**" },
      { protocol: "https", hostname: "**.ndtv.com", pathname: "/**" },
      { protocol: "https", hostname: "**.ndtvimg.com", pathname: "/**" },
      { protocol: "https", hostname: "**.pib.gov.in", pathname: "/**" },
      { protocol: "https", hostname: "news.google.com", pathname: "/**" },
      { protocol: "https", hostname: "**.googleusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "**.amarujala.com", pathname: "/**" },
      { protocol: "https", hostname: "**.livehindustan.com", pathname: "/**" },
      { protocol: "https", hostname: "**.webdunia.com", pathname: "/**" },
      { protocol: "https", hostname: "**.ddnews.gov.in", pathname: "/**" },
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
