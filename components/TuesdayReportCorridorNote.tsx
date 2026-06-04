"use client";

// TuesdayReportCorridorNote - a small client-side banner shown on
// /tuesday-report when a vendor arrives from the edit flow with a corridor in
// the URL (?from=edit&corridor=New%20Iberia%2C%20LA&vendor=rec...). It scopes
// the page to the location they just saved instead of a generic landing.
//
// Static export: the page is a server component (has metadata), so it can't
// read searchParams at request time. This client component reads the param
// from window after mount. Renders nothing when there's no corridor param
// (the ordinary direct-visit case).
//
// Today it's acknowledgement only - the reservation form on the page is still
// generic. When the Tuesday Report ships and charges, the vendor id carried
// here ties the reservation to that exact location. (2026-06-02)

import { useEffect, useState } from "react";

export default function TuesdayReportCorridorNote() {
  const [corridor, setCorridor] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("from") !== "edit") return;
    const c = (params.get("corridor") || "").trim();
    if (c) setCorridor(c);
  }, []);

  if (!corridor) return null;

  return (
    <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3">
      <p className="text-sm leading-relaxed text-ink-800">
        <span className="font-semibold">
          Reserving for your {corridor} corridor.
        </span>{" "}
        The Tuesday Report covers the 150 miles around that yard. Have several
        locations? Each corridor is its own report - reserve the ones you
        actively sell into.
      </p>
    </div>
  );
}
