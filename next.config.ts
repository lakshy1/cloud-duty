import type { NextConfig } from "next";

const replitDevDomain = process.env.REPLIT_DEV_DOMAIN;

const nextConfig: NextConfig = {
  // pdfjs-dist must run as native Node.js, not bundled by webpack
  serverExternalPackages: ["pdfjs-dist"],
  ...(replitDevDomain ? { allowedDevOrigins: [replitDevDomain] } : {}),
  // Hide the Next.js dev indicator; its draggable badge can throw pointer-capture
  // errors on mobile interactions in this repo's dev setup.
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.mos.cms.futurecdn.net",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
      {
        protocol: "https",
        hostname: "img.freepik.com",
      },
      {
        protocol: "https",
        hostname: "zzrhvgfzylepqseogfpi.supabase.co",
      },
    ],
  },
};

export default nextConfig;
