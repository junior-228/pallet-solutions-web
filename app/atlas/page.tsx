"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /atlas is retired - the product is "Market Pulse" and lives at
 * /market-pulse (renamed 2026-06-01). This stub redirects any client that
 * lands here (old links, bookmarks). The canonical 301 is in
 * public/_redirects so direct hits and crawlers get a proper redirect too.
 */
export default function AtlasRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/market-pulse");
  }, [router]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-24 text-center">
      <p className="text-base text-ink-700">
        Market Pulse has moved.{" "}
        <a
          href="/market-pulse"
          className="font-semibold text-brand-600 hover:text-brand-700 underline"
        >
          Continue to Market Pulse
        </a>
        .
      </p>
    </main>
  );
}
