import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      { hostname: 'image.tmdb.org' },
      { hostname: 'lh3.googleusercontent.com' },
      { hostname: 'placehold.co' },
      { hostname: 'www.edigitalagency.com.au' },
      { hostname: 'upload.wikimedia.org' },
      { hostname: 'i.ibb.co' },
      { hostname: 'res.cloudinary.com' },
      { hostname: 'firebasestorage.googleapis.com' },
    ],
  },
};

export default nextConfig;
