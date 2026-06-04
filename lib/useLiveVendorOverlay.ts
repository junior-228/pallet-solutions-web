"use client";

// Live-status overlay for the buyer + vendor surfaces.
//
// Both /find-a-vendor and /vendors load the bulk static vendor-index.json
// for fast initial paint (~3,300 rows). That snapshot is stale the moment
// any vendor claims; without an overlay, a freshly-claimed vendor still
// renders as a gray "Listed" dot on the buyer finder + the wrong card.
//
// This hook fetches the small set of claimed + enhanced vendors live from
// vendor_public_read (via vendor-typeahead?claimed=1) and returns a
// Map<id, OverlayEntry> the page can merge onto its in-memory index
// entries by id. Listed vendors stay in the snapshot (fast); claimed +
// enhanced status / classification / services / etc. come from live.
//
// ONE mechanism, two consumers. Do NOT duplicate this fetch per page.

import { useEffect, useRef, useState } from "react";
import { FUNCTIONS_BASE } from "./functionsBase";

export type VendorOverlayEntry = {
  id: string;
  name: string;
  city: string;
  state: string;
  lat: number | null;
  lng: number | null;
  status: "listed" | "claimed" | "enhanced";
  classification?: string[];
  services?: string[];
  palletTypes?: string[];
  treatments?: string[];
  serviceRadiusMi?: number | null;
  hoursOpen?: string | null;
  hoursClose?: string | null;
  daysOpen?: string[];
};

const OVERLAY_URL = `${FUNCTIONS_BASE}/.netlify/functions/vendor-typeahead?claimed=1`;

// Tiny module-level cache so a page that mounts/unmounts (or two
// components on the same page) shares one fetch within a session.
let cachedOverlay: Map<string, VendorOverlayEntry> | null = null;
let cachedFetchAt = 0;
let pendingPromise: Promise<Map<string, VendorOverlayEntry>> | null = null;
const TTL_MS = 60 * 1000;

async function fetchOverlay(): Promise<Map<string, VendorOverlayEntry>> {
  const now = Date.now();
  if (cachedOverlay && now - cachedFetchAt < TTL_MS) return cachedOverlay;
  if (pendingPromise) return pendingPromise;
  pendingPromise = (async () => {
    try {
      const res = await fetch(OVERLAY_URL);
      if (!res.ok) {
        // Soft-fail: empty overlay just means the page reads the static
        // snapshot, same as if this hook didn't exist. No regression.
        console.warn("[useLiveVendorOverlay] HTTP", res.status);
        return new Map<string, VendorOverlayEntry>();
      }
      const data = await res.json();
      const list: VendorOverlayEntry[] = Array.isArray(data?.vendors)
        ? data.vendors
        : [];
      const map = new Map<string, VendorOverlayEntry>();
      for (const v of list) {
        if (v && typeof v.id === "string") map.set(v.id, v);
      }
      cachedOverlay = map;
      cachedFetchAt = Date.now();
      return map;
    } catch (e) {
      console.warn("[useLiveVendorOverlay] fetch failed", e);
      return new Map<string, VendorOverlayEntry>();
    } finally {
      pendingPromise = null;
    }
  })();
  return pendingPromise;
}

// One-shot fetch on mount. Returns the overlay map (empty until the
// fetch resolves) and an `applied` boolean so the caller can avoid
// re-rendering before the live data lands.
export function useLiveVendorOverlay(): {
  overlay: Map<string, VendorOverlayEntry>;
  applied: boolean;
} {
  const [overlay, setOverlay] = useState<Map<string, VendorOverlayEntry>>(
    () => cachedOverlay || new Map()
  );
  const [applied, setApplied] = useState<boolean>(() => cachedOverlay != null);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    fetchOverlay().then((m) => {
      if (cancelled.current) return;
      setOverlay(m);
      setApplied(true);
    });
    return () => {
      cancelled.current = true;
    };
  }, []);

  return { overlay, applied };
}

// Pure merge helper for any array of static index entries. Caller is
// responsible for re-running this whenever overlay or the static array
// changes. Idempotent; safe to apply on every render.
export function applyOverlay<T extends { id: string }>(
  staticEntries: T[],
  overlay: Map<string, VendorOverlayEntry>
): T[] {
  if (!overlay.size) return staticEntries;
  return staticEntries.map((e) => {
    const live = overlay.get(e.id);
    if (!live) return e;
    // Spread live AFTER static so live wins on every overlapping key.
    // lat/lng are kept from the static entry only if live lacks them
    // (live should always have them, but defensive).
    return {
      ...e,
      ...live,
      lat: live.lat ?? (e as unknown as { lat: number }).lat,
      lng: live.lng ?? (e as unknown as { lng: number }).lng,
    } as T;
  });
}
