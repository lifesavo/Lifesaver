import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server is bound on 0.0.0.0, so browsers that open 127.0.0.1
  // are treated as a different origin. Allow them or hydration never finishes.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  devIndicators: false,
  serverExternalPackages: ["better-sqlite3"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
