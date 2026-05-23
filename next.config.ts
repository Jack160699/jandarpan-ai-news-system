import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
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
