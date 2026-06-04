"use client";

import { type ReactNode } from "react";
import type { MarketPulseEvent, HousingTrend } from "@/lib/marketPulseEvents";

// RegionalReport - the region's cost read, presented as the email edition and
// styled to MIRROR the Atlas+ edition card (2026-06-04, "mirror how Atlas+
// looked"): dark navy edition header with the PSCI value in white, the
// brand-tinted national/forecast tile, and the emerald/ink source cards. It is
// the ONE artifact on /market-pulse - no separate web data section.
//
// ONE TEMPLATE, surfaces that must never drift:
//   - on-page edition mockup (this component)
//   - downloadable PDF (window.print() isolates #market-pulse-report - the
//     exact same DOM, so the PDF IS this mockup)
//   - the future regional sent email (NOT built yet - no automated per-region
//     send exists; when it ships it must render from this same content).
//
// DYNAMIC LEAD (rule-based, Addendum 3): quiet weeks lead with an honest "only
// diesel moved"; active weeks lead with the mover or the verified signal. The
// component table is NOT the lead - it sits lower as the receipts.
//
// HONESTY: every value is a prop from lib/psci JSON. Regional PSCI, regional
// WoW, and regional diesel are region-specific; the 30-day direction is
// NATIONAL and labeled national. NO confidence interval on this page (it lives
// on /methodology) - this is the one place we deliberately diverge from the
// Atlas card, which showed an 80% confidence line. PADD never surfaces.

export type ReportRegion = {
  slug: string;
  name: string;
  psci: number;
  diesel: number | null;
  wowPct: number | null;
};

export type ReportComponentRow = {
  key: string;
  wowPct: number;
  stale: boolean;
  observationDate: string | null;
};

type Props = {
  region: ReportRegion;
  nationalPsci: number;
  nationalWowPct: number | null;
  forecastPct: number | null;
  asOf: string;
  componentRows: ReportComponentRow[];
  events: MarketPulseEvent[];
  housing: HousingTrend;
};

const EDITION_ROWS: {
  key: string;
  name: string;
  weight: string;
  seriesId: string;
  cadence: string;
  url: string;
  highlight?: boolean;
}[] = [
  {
    key: "wood",
    name: "Wood pallet PPI",
    weight: "40%",
    seriesId: "BLS PCU321920321920",
    cadence: "monthly",
    url: "https://data.bls.gov/timeseries/PCU321920321920",
  },
  {
    key: "lumber",
    name: "Softwood lumber PPI",
    weight: "20%",
    seriesId: "BLS WPU0811",
    cadence: "monthly",
    url: "https://data.bls.gov/timeseries/WPU0811",
  },
  {
    key: "diesel",
    name: "Diesel - your region",
    weight: "20%",
    seriesId: "EIA EPD2D",
    cadence: "weekly",
    url: "https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?n=pet&s=emd_epd2d_pte_nus_dpg&f=w",
    highlight: true,
  },
  {
    key: "wages",
    name: "Warehouse wages",
    weight: "15%",
    seriesId: "BLS CES4349300008",
    cadence: "monthly",
    url: "https://data.bls.gov/timeseries/CES4349300008",
  },
  {
    key: "paper",
    name: "Paper / OCC",
    weight: "5%",
    seriesId: "BLS WPU09150301",
    cadence: "monthly",
    url: "https://data.bls.gov/timeseries/WPU09150301",
  },
];

const COMPONENT_LABEL: Record<string, string> = {
  wood: "Wood pallet PPI",
  lumber: "Softwood lumber",
  wages: "Warehouse wages",
  paper: "Paper / OCC",
};

function fmtPct(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

function signedPct(n: number, dp = 1): string {
  const s = n > 0 ? "+" : "";
  return `${s}${n.toFixed(dp)}%`;
}

function moveColor(pct: number | null | undefined): string {
  if (pct == null) return "text-ink-500";
  if (pct < -0.005) return "text-emerald-700";
  if (pct > 0.005) return "text-red-700";
  return "text-ink-500";
}

// Light-on-dark variant for the navy edition header.
function darkMoveColor(pct: number | null | undefined): string {
  if (pct == null) return "text-ink-300";
  if (pct < -0.005) return "text-emerald-300";
  if (pct > 0.005) return "text-red-300";
  return "text-ink-300";
}

function fmtDateShort(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// RULE-BASED dynamic lead (Addendum 3 flag A default). Priority: a verified
// WARN/weather signal first, then a real monthly component move, else quiet.
function buildLead(
  region: ReportRegion,
  byKey: Map<string, ReportComponentRow>,
  hasSignal: boolean,
  signal: MarketPulseEvent | null
): string {
  const monthlyKeys = ["wood", "lumber", "wages", "paper"];
  const movers = monthlyKeys
    .map((k) => byKey.get(k))
    .filter(
      (m): m is ReportComponentRow =>
        !!m && !m.stale && Math.abs(m.wowPct) >= 0.05
    );

  if (hasSignal && signal) {
    const kind = signal.type === "weather" ? "weather" : "WARN";
    const where = signal.location ? ` (${signal.location})` : "";
    return `A ${kind} signal in your area this week${where} - here is your ${region.name} number, with the details below.`;
  }

  if (movers.length > 0) {
    const top = movers.reduce((a, b) =>
      Math.abs(b.wowPct) > Math.abs(a.wowPct) ? b : a
    );
    const dir = top.wowPct > 0 ? "rose" : "eased";
    return `${COMPONENT_LABEL[top.key] ?? "A cost input"} ${dir} this week - here is your ${region.name} number and what it means for you.`;
  }

  return `Quiet week - only diesel moved. Here is the number and what it means for you.`;
}

// Plain-English regional read from real props only. NO confidence interval.
function buildRead(region: ReportRegion, forecastPct: number | null): string {
  const name = region.name;
  const wow = region.wowPct;

  let level: string;
  if (wow == null) {
    level = `sits at ${region.psci.toFixed(2)}`;
  } else if (Math.abs(wow) < 0.1) {
    level = `sits at ${region.psci.toFixed(2)}, roughly flat week over week`;
  } else if (wow < 0) {
    level = `sits at ${region.psci.toFixed(2)}, down ${Math.abs(wow).toFixed(
      2
    )}% week over week`;
  } else {
    level = `sits at ${region.psci.toFixed(2)}, up ${wow.toFixed(
      2
    )}% week over week`;
  }

  const regionalDown = wow != null && wow < -0.1;
  const regionalUp = wow != null && wow > 0.1;
  const natDown = forecastPct != null && forecastPct < 0;
  const natUp = forecastPct != null && forecastPct > 0;
  let meaning: string;
  if (regionalUp || (wow == null && natUp)) {
    meaning =
      " For a buyer, that points to a firming cost basis - a week to lock or push to source before the next move rather than accept a later increase.";
  } else if (regionalDown || (wow == null && natDown)) {
    meaning =
      " For a buyer, that is a softening cost basis - a reasonable week to hold or push on price rather than accept an increase.";
  } else {
    meaning =
      " For a buyer, the basis looks broadly stable this week - no strong signal to move either way.";
  }

  return `The ${name} cost-input read ${level}.${meaning}`;
}

export default function RegionalReport({
  region,
  nationalPsci,
  nationalWowPct,
  forecastPct,
  asOf,
  componentRows,
  events,
  housing,
}: Props) {
  const flaggedEvents = events.slice(0, 3);
  const byKey = new Map(componentRows.map((c) => [c.key, c]));
  const dieselObs = byKey.get("diesel")?.observationDate ?? null;
  const hasSignal = flaggedEvents.length > 0;
  const lead = buildLead(region, byKey, hasSignal, flaggedEvents[0] ?? null);
  const readText = buildRead(region, forecastPct);
  const forecastDown = forecastPct != null && forecastPct < 0;
  const wowDown = nationalWowPct != null && nationalWowPct < 0;

  // Region-vs-national framing. A region reads above/below national purely
  // because its diesel (the only localized, 20% input) moved more/less since
  // the Jan-2024 base - NOT because pallets cost more there today. This one
  // line kills the "why is my region higher than national" misread.
  const regionNatDiff = region.psci - nationalPsci;
  const regionNatNote =
    regionNatDiff > 0.05
      ? `${region.name} runs above the national line because regional diesel has climbed faster than the national average - the other four inputs are shared.`
      : regionNatDiff < -0.05
      ? `${region.name} runs below the national line because regional diesel has climbed slower than the national average - the other four inputs are shared.`
      : null;

  return (
    <div
      id="market-pulse-report"
      className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-2xl shadow-ink-900/10"
    >
      {/* DARK EDITION HEADER - mirrors the Atlas+ card header. Doubles as the
          email artifact (the From line) without promising weekly arrival. */}
      <div className="bg-ink-900 px-6 py-6 sm:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-300">
              Your {region.name} cost read · week of {asOf}
            </p>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-3xl font-bold tabular-nums text-white sm:text-4xl">
                {region.psci.toFixed(2)}
              </span>
              <span className="text-sm font-semibold text-brand-300">
                PSCI&trade;
              </span>
              {region.wowPct != null && (
                <span
                  className={`ml-1 text-sm font-semibold tabular-nums ${darkMoveColor(
                    region.wowPct
                  )}`}
                >
                  {fmtPct(region.wowPct)} WoW
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-ink-400">
              From Pallet Solutions · hello@palletsolutionsusa.com
            </p>
          </div>
          <div className="shrink-0 text-right">
            <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-brand-300">
              PSCI&trade; v1.3
            </span>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
              <span
                className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                aria-hidden="true"
              />
              Live
            </span>
          </div>
        </div>
      </div>

      {/* DYNAMIC LEAD strip - the boring-week fix, on the brand band. */}
      <div className="border-b border-brand-100 bg-brand-50/70 px-6 py-4 sm:px-8">
        <p className="text-base font-semibold leading-snug text-ink-900 sm:text-lg">
          {lead}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-700">{readText}</p>
      </div>

      {/* BODY */}
      <div className="space-y-6 px-6 py-6 sm:px-8 sm:py-7">
        {/* National headline + 30-day direction tile (Atlas brand tile).
            NO confidence interval here per Addendum 1 - direction only. */}
        <div className="rounded-xl border-[1.5px] border-brand-200 bg-brand-50/60 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-700">
                National PSCI · this week
              </p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-ink-900">
                {nationalPsci.toFixed(2)}
                {nationalWowPct != null && (
                  <span className="ml-2 text-sm font-semibold text-ink-600">
                    {wowDown ? "down" : "up"}{" "}
                    {Math.abs(nationalWowPct).toFixed(2)}% WoW
                  </span>
                )}
              </p>
            </div>
            {forecastPct != null && (
              <div className="text-right">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-700">
                  National 30-day direction
                </p>
                <p
                  className={`mt-2 text-2xl font-bold tabular-nums ${moveColor(
                    forecastPct
                  )}`}
                >
                  {fmtPct(forecastPct)}
                </p>
              </div>
            )}
          </div>
          {forecastPct != null && (
            <p className="mt-3 text-xs text-ink-700">
              {forecastDown
                ? "Projected cost relief over the next 30 days."
                : "Projected upward cost pressure over the next 30 days."}{" "}
              National only - per-region forecasts aren&apos;t published yet.
            </p>
          )}
        </div>

        {regionNatNote && (
          <p className="text-xs leading-relaxed text-ink-500">{regionNatNote}</p>
        )}

        {/* Two source cards - mirrors the Atlas card. Diesel is the localized
            input; the other four are national. PADD is never shown. */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-ink-200 bg-white p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Regional source · real EIA
            </p>
            <p className="mt-2 text-sm font-semibold text-ink-900">Diesel</p>
            <p className="mt-1 text-xs text-ink-500">{region.name}</p>
            <div className="mt-3 flex items-baseline justify-between gap-3">
              <span className="text-lg font-bold tabular-nums text-ink-900">
                {region.diesel != null
                  ? `$${region.diesel.toFixed(3)}/gal`
                  : "n/a"}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-ink-400">
                EIA weekly
                {dieselObs ? ` · ${fmtDateShort(dieselObs)}` : ""}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-ink-200 bg-white p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">
              National series · shared across regions
            </p>
            <p className="mt-2 text-sm font-semibold text-ink-900">
              Wood pallet · lumber · wages · OCC (old corrugated containers)
            </p>
            <p className="mt-1 font-mono text-[11px] text-ink-500">
              BLS PCU321920321920 · WPU0811 · CES4349300008 · WPU09150301
            </p>
            <p className="mt-3 border-t border-ink-100 pt-3 text-[11px] leading-relaxed text-ink-600">
              These four are national; only diesel is local to your region.
            </p>
          </div>
        </div>

        {/* WHAT'S COMING THIS WEEK - curated context OUTSIDE the index (the
            honesty wall; verbatim label). Quiet weeks say "quiet". */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">
            Context outside the PSCI index
          </p>
          {flaggedEvents.length === 0 ? (
            <p className="mt-2 text-sm text-ink-600">
              Quiet week - no regional disruptions flagged.
            </p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {flaggedEvents.map((ev, i) => (
                <li key={i} className="text-sm leading-relaxed text-ink-700">
                  <span className="mr-2 inline-block rounded border border-ink-200 bg-white px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                    {ev.type === "weather" ? "Weather" : "WARN"}
                  </span>
                  {ev.date ? (
                    <span className="font-semibold text-ink-900">
                      {fmtDateShort(ev.date)}
                    </span>
                  ) : null}
                  {ev.location ? (
                    <span className="text-ink-500"> · {ev.location}</span>
                  ) : null}
                  {" - "}
                  {ev.text}{" "}
                  <a
                    href={ev.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-brand-600 hover:text-brand-700 underline underline-offset-2"
                  >
                    Source
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* The receipts - the component table sits lower, not the lead. */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            What&apos;s in the index
            <span className="ml-2 font-normal normal-case tracking-normal text-ink-400">
              the five federal inputs, weighted
            </span>
          </p>
          <div className="mt-3 overflow-hidden rounded-xl border border-ink-200">
            {EDITION_ROWS.map((row, i) => {
              const m = byKey.get(row.key);
              let cell: ReactNode = null;
              if (row.key === "diesel") {
                cell = (
                  <span className="font-semibold tabular-nums text-ink-900">
                    {region.diesel != null
                      ? `$${region.diesel.toFixed(3)} / gal`
                      : "-"}
                    {dieselObs ? (
                      <span className="ml-1.5 font-normal text-xs text-ink-400">
                        EIA {fmtDateShort(dieselObs)}
                      </span>
                    ) : null}
                  </span>
                );
              } else if (m && m.stale) {
                cell = (
                  <span className="text-ink-700">
                    Held, carried forward
                    {m.observationDate ? (
                      <span className="block text-xs text-ink-400">
                        Last release {fmtDateShort(m.observationDate)}
                      </span>
                    ) : null}
                  </span>
                );
              } else if (m && Math.abs(m.wowPct) < 0.05) {
                cell = (
                  <span className="text-ink-500">Held, no new release</span>
                );
              } else if (m) {
                cell = (
                  <span className="font-semibold tabular-nums text-ink-900">
                    {signedPct(m.wowPct)} on last release
                  </span>
                );
              }
              return (
                <div
                  key={row.key}
                  className={`flex items-start justify-between gap-4 px-4 py-3.5 sm:px-5 ${
                    i !== EDITION_ROWS.length - 1
                      ? "border-b border-ink-100"
                      : ""
                  } ${row.highlight ? "bg-brand-50/50" : ""}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-900">
                      {row.key === "diesel"
                        ? `Diesel - ${region.name}`
                        : row.name}
                      <span className="ml-2 text-xs font-medium text-ink-500">
                        {row.weight}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-500">
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono hover:text-brand-600 hover:underline"
                      >
                        {row.seriesId}
                      </a>
                      <span className="mx-1.5 text-ink-300">·</span>
                      {row.cadence}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-sm">{cell}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Housing / demand trend note - renders only when real Census data is
            present in the JSON; omitted otherwise. */}
        {housing && (
          <p className="text-sm leading-relaxed text-ink-600">
            U.S. housing starts {housing.momPct >= 0 ? "rose" : "fell"}{" "}
            {Math.abs(housing.momPct).toFixed(1)}% in {housing.month} -
            construction demand {housing.directionDemand}, {housing.pressure}{" "}
            pallet pressure ahead.{" "}
            <a
              href={housing.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand-600 hover:text-brand-700 underline underline-offset-2"
            >
              Census
            </a>
            .
          </p>
        )}

        {/* Sources footer */}
        <div className="border-t border-ink-100 pt-5">
          <p className="text-xs text-ink-500">
            Every figure links to its federal source. Quiet weeks say quiet.
            Sources: BLS (wood pallet, lumber, warehouse wages, paper/OCC) and
            EIA (diesel), reproducible from the published PSCI&trade; weights.
          </p>
          <a
            href="/methodology"
            className="group mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            See methodology &amp; history
            <span
              aria-hidden="true"
              className="transition-transform group-hover:translate-x-0.5"
            >
              →
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
