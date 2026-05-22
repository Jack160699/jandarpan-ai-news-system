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
      { protocol: "https", hostname: "**.jagran.com", pathname: "/**" },
      { protocol: "https", hostname: "**.etvbharat.com", pathname: "/**" },
      { protocol: "https", hostname: "**.zeenews.india.com", pathname: "/**" },
      { protocol: "https", hostname: "**.ndtv.com", pathname: "/**" },
      { protocol: "https", hostname: "**.ndtvimg.com", pathname: "/**" },
      { protocol: "https", hostname: "**.pib.gov.in", pathname: "/**" },
    ],
  },
};

export default nextConfig;
