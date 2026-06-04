// PSCI snapshot -- single source of truth wire.
//
// Reads from `data/psci_latest.json` at the workspace root (one level
// above this rebuild). That JSON is the canonical PSCI publish output --
// updated weekly by scripts/backfill-psci.js, read by /psci, /market-
// pulse, the Tuesday Read email, and now this homepage.
//
// CLAUDE.md rule: every surface MUST read PSCI headline from
// psci_latest.json -- no parallel pipelines, no hardcoded values in
// production. This file fulfills that rule for the rebuild.
//
// Read happens at build time via readFileSync (this is a server-only
// module, imported into Server Components). Values get baked into the
// static HTML at build. To refresh after a JSON update: rebuild the
// site. Failure modes are loud: a missing JSON file fails the build
// with an explicit error rather than silently shipping stale data.

import { readFileSync } from "node:fs";
import path from "node:path";

const JSON_PATH = path.resolve(
  process.cwd(),
  "..",
  "data",
  "psci_latest.json"
);
const HISTORICAL_PATH = path.resolve(
  process.cwd(),
  "..",
  "data",
  "psci_historical.csv"
);

interface PsciLatestJson {
  version: string;
  base_period: string;
  as_of: string;
  value: number;
  narrative_override?: string;
  deltas: {
    vs_base_pct: number;
    wow_pct?: number;
    yoy_pct?: number;
    [k: string]: number | undefined;
  };
  last_4_weeks: Array<{ week_ending: string; value: number }>;
  components?: Record<
    string,
    {
      weight: number;
      raw_value: number;
      normalized_value: number;
      source_series_id: string;
    }
  >;
  freshness_audit?: {
    component_observations?: Record<
      string,
      { stale?: boolean; observation_date?: string }
    >;
  };
  forecast?: {
    value?: number | null;
    ci_low?: number | null;
    ci_high?: number | null;
    model?: string;
    confidence_level?: number;
    horizon_days?: number;
  };
}

let raw: string;
try {
  raw = readFileSync(JSON_PATH, "utf-8");
} catch {
  throw new Error(
    `lib/psci.ts: failed to read PSCI snapshot from ${JSON_PATH}. ` +
      "This file is the single source of truth for the PSCI headline " +
      "value (CLAUDE.md). Ensure data/psci_latest.json exists at the " +
      "workspace root and that scripts/backfill-psci.js has run."
  );
}

const json = JSON.parse(raw) as PsciLatestJson;

export const PSCI_SNAPSHOT = {
  version: json.version,
  value: json.value,
  asOf: json.as_of,
  basePeriod: json.base_period,
  vsBasePct: json.deltas.vs_base_pct,
  wowPct: json.deltas.wow_pct ?? null,
  // The weekly plain-English "read" (HTML <ul>), authored in the backfill.
  // Null when absent so the edition omits the block on quiet/empty weeks.
  narrativeHtml: json.narrative_override ?? null,
  last4Weeks: (json.last_4_weeks ?? []).map((w) => ({
    weekEnding: w.week_ending,
    value: w.value,
  })),
} as const;

// National 30-day forecast WITH the numeric CI band, read from
// psci_latest.json.forecast (the band the index publishes alongside the
// headline). Distinct from PSCI_FORECAST below (which reads psci_forecast.json
// and carries the % move). Used by the /market-pulse edition forecast line.
export const PSCI_FORECAST_BAND = json.forecast
  ? {
      value: json.forecast.value ?? null,
      ciLow: json.forecast.ci_low ?? null,
      ciHigh: json.forecast.ci_high ?? null,
      model: json.forecast.model ?? "TimesFM 2.5",
      confidenceLevel:
        typeof json.forecast.confidence_level === "number"
          ? json.forecast.confidence_level
          : 0.8,
      horizonDays:
        typeof json.forecast.horizon_days === "number"
          ? json.forecast.horizon_days
          : 30,
    }
  : null;

export function formatAsOfDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// === Historical PSCI series ===
//
// Reads data/psci_historical.csv (workspace root). 540+ weeks back to
// Jan 2016. The chart on the homepage only needs the last ~8 weeks for
// the trend display; we expose a sliced array for that and the full
// series for future surfaces that want longer history.

interface HistoricalRow {
  weekEnding: string;
  value: number;
}

function loadHistorical(): HistoricalRow[] {
  let raw: string;
  try {
    raw = readFileSync(HISTORICAL_PATH, "utf-8");
  } catch {
    return [];
  }
  const lines = raw.trim().split(/\r?\n/);
  // Header: week_ending_date,psci_value,status,splice_flag,version
  return lines
    .slice(1)
    .map((line) => {
      const [weekEnding, valueStr] = line.split(",");
      return { weekEnding, value: parseFloat(valueStr) };
    })
    .filter((row) => row.weekEnding && !Number.isNaN(row.value));
}

const allHistorical = loadHistorical();

export const PSCI_HISTORICAL_LAST_8: ReadonlyArray<HistoricalRow> =
  allHistorical.slice(-8);

// Aggregate weekly historical values to monthly (taking the last weekly
// close in each calendar month). Mirrors the marketing-site fan graph,
// which the Tuesday Read email script feeds with monthly values. 12
// months of history is the standard window for the fan graph display.
function aggregateToMonthly(
  weekly: HistoricalRow[]
): HistoricalRow[] {
  const byMonth = new Map<string, HistoricalRow>();
  for (const row of weekly) {
    const key = row.weekEnding.slice(0, 7); // "YYYY-MM"
    byMonth.set(key, row); // last write wins -> last weekly close per month
  }
  return Array.from(byMonth.values());
}

const allMonthly = aggregateToMonthly([...allHistorical]);
export const PSCI_HISTORICAL_LAST_12_MONTHS: ReadonlyArray<HistoricalRow> =
  allMonthly.slice(-12);

// Last 12 weekly closes -- approximately 3 months of week-by-week trend.
// Used by the homepage fan graph (Rob: weekly granularity reads better
// at the homepage tile size than monthly aggregation).
export const PSCI_HISTORICAL_LAST_12_WEEKS: ReadonlyArray<HistoricalRow> =
  allHistorical.slice(-12);

// Full historical series -- ~540 weekly closes back to Jan 2016. Used by
// the interactive chart on the homepage (3M / 6M / 1Y / 5Y / All toggle).
// Server reads CSV at build time, ships baked into the client bundle.
// ~540 rows × ~20 bytes/row ≈ ~11 KB JSON payload, well under the
// threshold that would warrant a runtime fetch.
export const PSCI_HISTORICAL_ALL: ReadonlyArray<HistoricalRow> =
  allHistorical;

// === PSCI component movers ===
//
// The five federal cost-input series that compose PSCI, each with its REAL
// week-over-week move computed from data/psci_components_historical.csv
// (latest published week vs the prior one) and its stale/carry-forward flag
// from psci_latest.json freshness_audit. These are what make "what's moving"
// honest - the numbers reproduce the narrative_override (e.g. lumber up,
// diesel softened, wages carried forward) because they come from the same
// federal observations. Surfaced in the Tuesday Report read on /vendors.

const COMPONENTS_HIST_PATH = path.resolve(
  process.cwd(),
  "..",
  "data",
  "psci_components_historical.csv"
);

export interface PsciComponentMover {
  key: string; // freshness_audit key (wood/lumber/diesel/wages/paper)
  label: string; // short display label
  weightPct: number; // PSCI v1.3 governance-locked weight
  wowPct: number; // real week-over-week move on the raw federal value
  stale: boolean; // carried forward (observation past stale threshold)
  observationDate: string | null; // the series' last real release date
}

// CSV component_name -> display meta. Weights are the governance-locked
// PSCI v1.3 weights (40/20/20/15/5), ordered by weight for display.
const COMPONENT_META: Array<{
  csvName: string;
  key: string;
  label: string;
  weightPct: number;
}> = [
  { csvName: "Wood Pallet PPI", key: "wood", label: "Wood pallet", weightPct: 40 },
  { csvName: "Softwood Lumber PPI", key: "lumber", label: "Lumber", weightPct: 20 },
  { csvName: "Diesel (US weekly retail)", key: "diesel", label: "Diesel", weightPct: 20 },
  { csvName: "Warehouse Worker Earnings", key: "wages", label: "Wages", weightPct: 15 },
  { csvName: "Paper Containers PPI (OCC proxy)", key: "paper", label: "Cardboard", weightPct: 5 },
];

function loadComponentMovers(): PsciComponentMover[] {
  let rawCsv: string;
  try {
    rawCsv = readFileSync(COMPONENTS_HIST_PATH, "utf-8");
  } catch {
    return [];
  }
  // week_ending_date,component_name,normalized_value,raw_value,source_series_id
  const lines = rawCsv.trim().split(/\r?\n/).slice(1);
  const byWeek = new Map<string, Map<string, number>>();
  for (const line of lines) {
    const parts = line.split(",");
    const week = parts[0];
    const name = parts[1];
    const rawVal = parseFloat(parts[3]);
    if (!week || !name || Number.isNaN(rawVal)) continue;
    if (!byWeek.has(week)) byWeek.set(week, new Map());
    byWeek.get(week)!.set(name, rawVal);
  }
  const weeks = Array.from(byWeek.keys()).sort();
  if (weeks.length < 2) return [];
  const latest = byWeek.get(weeks[weeks.length - 1]);
  const prev = byWeek.get(weeks[weeks.length - 2]);
  if (!latest || !prev) return [];
  const staleMap = json.freshness_audit?.component_observations ?? {};

  const out: PsciComponentMover[] = [];
  for (const meta of COMPONENT_META) {
    const cur = latest.get(meta.csvName);
    const pr = prev.get(meta.csvName);
    if (cur === undefined || pr === undefined || pr === 0) continue;
    out.push({
      key: meta.key,
      label: meta.label,
      weightPct: meta.weightPct,
      wowPct: ((cur - pr) / pr) * 100,
      stale: staleMap[meta.key]?.stale === true,
      observationDate: staleMap[meta.key]?.observation_date ?? null,
    });
  }
  return out;
}

export const PSCI_COMPONENTS: ReadonlyArray<PsciComponentMover> =
  loadComponentMovers();

// === Regional cost read ===
//
// Reads data/psci_regional.json, produced by scripts/backfill-psci-regional.js
// from atlas_pspi_cache.regional - the SAME row Atlas+ reads. One source, two
// audiences: the vendor's regional read is identical to the Atlas+ buyer's,
// worded sell-side on /vendors. OPTIONAL: returns null if the file hasn't been
// generated yet, so the page falls back to placeholder copy without breaking
// the build. Carries the region's current PSCI, 30-day projected PSCI, WoW,
// and diesel - everything Atlas+ shows regionally.

const REGIONAL_PATH = path.resolve(
  process.cwd(),
  "..",
  "data",
  "psci_regional.json"
);

export interface PsciRegionEntry {
  padd: string;
  label: string;
  psciCurrent: number | null;
  psciProjected: number | null;
  psciWowPct: number | null;
  horizonDays: number;
  dieselUsdGal: number | null;
}

export interface PsciRegional {
  asOf: string;
  fallback: boolean;
  regions: Record<string, PsciRegionEntry>;
}

function loadRegional(): PsciRegional | null {
  let rawR: string;
  try {
    rawR = readFileSync(REGIONAL_PATH, "utf-8");
  } catch {
    return null;
  }
  try {
    const j = JSON.parse(rawR) as {
      as_of?: string;
      fallback?: boolean;
      regions?: Record<
        string,
        {
          padd?: string;
          label?: string;
          psci_current?: number | null;
          psci_projected?: number | null;
          psci_wow_pct?: number | null;
          horizon_days?: number;
          diesel_usd_gal?: number | null;
        } | null
      >;
    };
    const regions: Record<string, PsciRegionEntry> = {};
    for (const [name, r] of Object.entries(j.regions ?? {})) {
      if (!r) continue;
      regions[name] = {
        padd: r.padd ?? "",
        label: r.label ?? "",
        psciCurrent: r.psci_current ?? null,
        psciProjected: r.psci_projected ?? null,
        psciWowPct: r.psci_wow_pct ?? null,
        horizonDays: typeof r.horizon_days === "number" ? r.horizon_days : 30,
        dieselUsdGal: r.diesel_usd_gal ?? null,
      };
    }
    return {
      asOf: j.as_of ?? "",
      fallback: Boolean(j.fallback),
      regions,
    };
  } catch {
    return null;
  }
}

export const PSCI_REGIONAL: PsciRegional | null = loadRegional();

// === National 30-day forecast ===
//
// Reads data/psci_forecast.json, produced from atlas_pspi_cache - the SAME
// national AI forecast (TimesFM 2.5 via BigQuery AI.FORECAST) the Cloud Run
// job feeds to Atlas+. canonical_current_psci -> current, canonical_projected
// _psci -> projected, the model's own current->projected delta -> changePct.
// NATIONAL ONLY by design: a regional composite index reopens the "why is my
// region 144 but national 113" base-confusion landmine, so the vendor read
// carries only the national forecast. The forecast is an OVERLAY on PSCI - it
// never modifies the index. OPTIONAL: null if the file hasn't been generated,
// so the page falls back gracefully without breaking the build.

const FORECAST_PATH = path.resolve(
  process.cwd(),
  "..",
  "data",
  "psci_forecast.json"
);

export interface PsciForecast {
  asOf: string;
  model: string;
  confidenceLevel: number; // e.g. 0.8 for an 80% CI
  horizonDays: number;
  current: number | null;
  projected: number | null;
  changePct: number | null; // model's own current -> projected % move
}

function loadForecast(): PsciForecast | null {
  let rawF: string;
  try {
    rawF = readFileSync(FORECAST_PATH, "utf-8");
  } catch {
    return null;
  }
  try {
    const j = JSON.parse(rawF) as {
      as_of?: string;
      model?: string;
      confidence_level?: number;
      horizon_days?: number;
      current?: number | null;
      projected?: number | null;
      change_pct?: number | null;
    };
    return {
      asOf: j.as_of ?? "",
      model: j.model ?? "TimesFM 2.5",
      confidenceLevel:
        typeof j.confidence_level === "number" ? j.confidence_level : 0.8,
      horizonDays: typeof j.horizon_days === "number" ? j.horizon_days : 30,
      current: j.current ?? null,
      projected: j.projected ?? null,
      changePct: j.change_pct ?? null,
    };
  } catch {
    return null;
  }
}

export const PSCI_FORECAST: PsciForecast | null = loadForecast();

