import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage public URLs (media library thumbnails)
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
};

export default nextConfig;
