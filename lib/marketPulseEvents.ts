// Curated buy-side "what's coming this week" context for /market-pulse.
//
// SEPARATE PIPELINE from PSCI: the PSCI cost table is auto-generated from
// federal data (lib/psci.ts). This module reads a HAND-CURATED, link-checked
// file (data/market_pulse_events.json, mirror-local). NO LINK, NO ITEM.
//
// Graceful by design: unlike the PSCI snapshot (which throws if missing so we
// never ship stale cost data), the events file is NON-CRITICAL. If it is
// absent or unparseable, we return an empty registry so every region simply
// renders the honest "Quiet week" line. The page must never depend on this
// box being full.
//
// Read happens at build time (server-only module). Refresh by rebuilding
// after editing the JSON.

import { readFileSync } from "node:fs";
import path from "node:path";

const EVENTS_PATH = path.resolve(
  process.cwd(),
  "data",
  "market_pulse_events.json"
);

export type MarketPulseEvent = {
  date: string;
  location: string;
  type: "warn" | "weather";
  text: string;
  url: string;
};

export type HousingTrend = {
  month: string;
  momPct: number;
  directionDemand: string; // "easing" | "climbing"
  pressure: string; // "downward" | "upward"
  sourceUrl: string;
} | null;

export type MarketPulseEvents = {
  asOf: string | null;
  housing: HousingTrend;
  regions: Record<string, MarketPulseEvent[]>;
};

const EMPTY: MarketPulseEvents = {
  asOf: null,
  housing: null,
  regions: {},
};

interface RawEventsJson {
  as_of?: string;
  housing?: HousingTrend;
  regions?: Record<string, unknown>;
}

// Only events that carry a real source URL survive (no link, no item) and
// that have the minimum fields. Anything malformed is dropped silently rather
// than crashing the build.
function sanitizeEvents(arr: unknown): MarketPulseEvent[] {
  if (!Array.isArray(arr)) return [];
  const out: MarketPulseEvent[] = [];
  for (const raw of arr) {
    if (!raw || typeof raw !== "object") continue;
    const e = raw as Record<string, unknown>;
    const url = typeof e.url === "string" ? e.url.trim() : "";
    const text = typeof e.text === "string" ? e.text.trim() : "";
    const date = typeof e.date === "string" ? e.date.trim() : "";
    const location = typeof e.location === "string" ? e.location.trim() : "";
    const type = e.type === "weather" ? "weather" : "warn";
    // No link, no item. Also require the text so we never render a bare row.
    if (!url || !text) continue;
    out.push({ date, location, type, text, url });
  }
  return out;
}

function load(): MarketPulseEvents {
  let raw: string;
  try {
    raw = readFileSync(EVENTS_PATH, "utf-8");
  } catch {
    return EMPTY;
  }
  let json: RawEventsJson;
  try {
    json = JSON.parse(raw) as RawEventsJson;
  } catch {
    return EMPTY;
  }
  const regionsIn = json.regions ?? {};
  const regions: Record<string, MarketPulseEvent[]> = {};
  for (const [slug, arr] of Object.entries(regionsIn)) {
    regions[slug] = sanitizeEvents(arr);
  }
  return {
    asOf: typeof json.as_of === "string" ? json.as_of : null,
    housing: json.housing ?? null,
    regions,
  };
}

export const MARKET_PULSE_EVENTS: MarketPulseEvents = load();

export function eventsForRegion(slug: string): MarketPulseEvent[] {
  return MARKET_PULSE_EVENTS.regions[slug] ?? [];
}
