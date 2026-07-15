import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@stratxcel/platform"],
  images: {
    qualities: [75, 76, 82, 84, 92],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "staticimg.amarujala.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cf-img-a-in.tosshub.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
