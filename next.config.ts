import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static HTML export. Produces an `out/` directory at build time that
  // can be deployed to any static host (Netlify, GitHub Pages, S3).
  // Required because this project ships no API routes / server actions
  // and we want to host it under Rob's own Netlify account alongside
  // the existing palletsolutionsusa.com site.
  output: "export",

  // next/image optimization requires a Node server. With static export
  // there's no server, so images must be served as-is. We don't use
  // next/image anywhere right now, but this is the safe default for
  // future image additions.
  images: { unoptimized: true },

  // Static hosts serve directories as `path/index.html`. Adding a trailing
  // slash makes Next.js generate that structure (e.g. /atlas/index.html
  // instead of /atlas.html), which Netlify/most static hosts route most
  // cleanly without rewrite rules.
  trailingSlash: true,
};

export default nextConfig;
