import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ],
  },
};

export default nextConfig;
