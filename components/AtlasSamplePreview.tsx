"use client";

import { useState } from "react";

/**
 * AtlasSamplePreview - the "see a Market Pulse edition" demo on /procurement
 * and /atlas.
 *
 * 2026-06-01 honest rebuild. The prior version hardcoded fabricated regional
 * PSCI numbers AND invented, source-attributed events (Colonial Pipeline
 * maintenance, Port of LA imports +4%, NIFC wildfire outlooks). That violated
 * the honesty wall - source-linked events that never happened. This version
 * shows ONLY what we actually compute and verify:
 *   - National PSCI (live, from data/psci_latest.json via PSCI_SNAPSHOT)
 *   - National 30-day forecast (live, from data/psci_forecast.json)
 *   - Per-region PSCI (live, diesel-localized rebase, from psci_regional.json)
 *   - Per-region diesel $/gal (real EIA per-PADD)
 * The regional EVENTS layer is honestly marked "launching summer 2026" - it is
 * NOT faked. When the find-verify-link events layer ships (regional-news /
 * Tuesday Report), real source-linked events replace the placeholder.
 *
 * Props are fed by the server page from lib/psci. Defaults mirror the verified
 * 2026-05-26 values so the component still renders real numbers if mounted
 * without props.
 */

export type SampleRegion = {
  name: string;
  psci: number;
  diesel: number | null;
  padd: string;
};

type AtlasSamplePreviewProps = {
  initialRegion?: string;
  nationalPsci?: number;
  nationalWowPct?: number | null;
  forecastPct?: number | null;
  forecastConfidence?: number;
  asOfLabel?: string;
  regions?: SampleRegion[];
};

// Verified fallback (2026-05-26). Real numbers, not placeholders - used only if
// the page doesn't pass live props.
const DEFAULT_REGIONS: SampleRegion[] = [
  { name: "Northeast", psci: 112.54, diesel: 5.231, padd: "PADD 1B Central Atlantic" },
  { name: "Southeast", psci: 115.83, diesel: 5.808, padd: "PADD 1C Lower Atlantic" },
  { name: "Great Lakes", psci: 115.19, diesel: 5.749, padd: "PADD 2 Midwest" },
  { name: "Texas + South Central", psci: 114.06, diesel: 5.122, padd: "PADD 3 Gulf Coast" },
  { name: "Plains + Mountain", psci: 113.24, diesel: 5.549, padd: "PADD 4 Rocky Mountain" },
  { name: "West Coast (CA + PNW)", psci: 112.71, diesel: 6.524, padd: "PADD 5 West Coast" },
];

function Chevron({ rotated }: { rotated: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`transition-transform duration-200 ${
        rotated ? "rotate-90 text-brand-600" : "text-ink-400"
      }`}
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function fmtPct(pct: number): string {
  const s = pct > 0 ? "+" : "";
  return `${s}${pct.toFixed(2)}%`;
}

export default function AtlasSamplePreview({
  initialRegion,
  nationalPsci = 113.67,
  nationalWowPct = 1.8,
  forecastPct = -1.37,
  forecastConfidence = 0.8,
  asOfLabel = "May 26, 2026",
  regions = DEFAULT_REGIONS,
}: AtlasSamplePreviewProps) {
  const list = regions.length > 0 ? regions : DEFAULT_REGIONS;
  const initialIdx = Math.max(
    0,
    list.findIndex((r) => r.name === initialRegion)
  );
  const [selectedIdx, setSelectedIdx] = useState<number>(
    initialIdx === -1 ? 0 : initialIdx
  );
  const selected = list[selectedIdx] ?? list[0];

  // Forecast direction: DOWN = cost relief = green; UP = red.
  const forecastDown = typeof forecastPct === "number" && forecastPct < 0;
  const forecastColor =
    forecastPct == null
      ? "text-ink-900"
      : forecastDown
      ? "text-emerald-600"
      : "text-red-600";

  const wowDown = typeof nationalWowPct === "number" && nationalWowPct < 0;

  return (
    <div className="mt-10 mx-auto max-w-5xl rounded-2xl border border-ink-200 bg-white shadow-xl shadow-ink-900/5 overflow-hidden">
      {/* Branded header bar */}
      <div className="bg-ink-900 px-7 py-6 sm:px-9 sm:py-7 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-300">
            Sample edition · week of {asOfLabel}
          </p>
          <p className="mt-3 text-3xl sm:text-4xl font-bold text-white tabular-nums">
            PSCI™ {nationalPsci.toFixed(2)}
          </p>
          {typeof nationalWowPct === "number" && (
            <p className="mt-1 text-sm text-ink-300">
              {wowDown ? "Down" : "Up"} {Math.abs(nationalWowPct).toFixed(2)}% WoW
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-300">
            PSCI™ v1.3
          </span>
          <span className="block mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">
            Sample
          </span>
        </div>
      </div>

      {/* Honesty framing - what's live vs. what's coming */}
      <div className="bg-brand-50/70 border-b border-brand-100 px-7 py-3 sm:px-9">
        <p className="text-xs leading-relaxed text-ink-600">
          Cost figures below are <span className="font-semibold text-ink-800">live federal data</span>{" "}
          (PSCI and diesel, from BLS and EIA). The regional events layer
          launches summer 2026 - every event will carry a source link you can
          verify, and quiet weeks will say so.
        </p>
      </div>

      {/* National 30-day forecast tile */}
      {typeof forecastPct === "number" && (
        <div className="px-7 pt-8 pb-6 sm:px-9 sm:pt-10">
          <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-6 sm:p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-700">
              National 30-day projection
            </p>
            <p className={`mt-3 text-3xl sm:text-4xl font-bold tabular-nums ${forecastColor}`}>
              {fmtPct(forecastPct)}
            </p>
            <p className="mt-2 text-sm text-ink-700">
              {forecastDown
                ? "Projected cost relief over the next 30 days."
                : "Projected upward cost pressure over the next 30 days."}
            </p>
            <p className="mt-3 text-xs text-ink-500">
              TimesFM 2.5 model · {Math.round(forecastConfidence * 100)}%
              confidence · refreshes after federal data drops
            </p>
          </div>
        </div>
      )}

      {/* Interactive regions */}
      <div className="px-7 pb-8 sm:px-9 sm:pb-10 pt-2">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            Your regions this week
          </p>
          <p className="text-xs text-ink-500">Click a region to drill in</p>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((r, i) => {
            const isSelected = selectedIdx === i;
            return (
              <button
                key={r.name}
                type="button"
                onClick={() => setSelectedIdx(i)}
                aria-pressed={isSelected}
                className={
                  isSelected
                    ? "flex items-center justify-between rounded-lg border-2 border-brand-500 bg-brand-50/60 px-4 py-3 text-left"
                    : "flex items-center justify-between rounded-lg border border-ink-200 bg-white px-4 py-3 text-left hover:border-brand-300 hover:bg-brand-50/30 transition-colors cursor-pointer"
                }
              >
                <span className="text-sm font-semibold text-ink-900">
                  {r.name}
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-semibold text-ink-900 tabular-nums">
                    {r.psci.toFixed(2)}
                  </span>
                  <Chevron rotated={isSelected} />
                </span>
              </button>
            );
          })}
        </div>

        {/* Expanded panel for selected region */}
        <div className="mt-6 rounded-xl border border-ink-200 bg-ink-50/50 p-6 sm:p-7">
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <h3 className="text-xl font-bold text-ink-900">
              {selected.name}{" "}
              <span className="ml-2 text-base font-semibold text-ink-600 tabular-nums">
                PSCI {selected.psci.toFixed(2)}
              </span>
            </h3>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-700">
              Refreshes weekly
            </span>
          </div>

          {/* Honest, data-grounded read */}
          <p className="mt-4 text-sm leading-relaxed text-ink-700">
            {selected.name}&apos;s PSCI is the national index with diesel
            localized to {selected.padd}
            {selected.diesel != null
              ? ` (currently $${selected.diesel.toFixed(2)}/gal)`
              : ""}
            . Diesel is the one cost input that differs by region; the other
            65% of the index - wood pallet, lumber, warehouse wages, and OCC -
            is national and identical across every region. {selected.name}{" "}
            sits {selected.psci >= nationalPsci ? "above" : "below"} the
            national {nationalPsci.toFixed(2)} because its diesel has moved{" "}
            {selected.psci >= nationalPsci ? "more" : "less"} than the national
            average since the January 2024 baseline.
          </p>

          {/* Component grid: 1 regional (diesel) + national note */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-ink-200 bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Regional source · real EIA
              </p>
              <p className="mt-2 text-sm font-semibold text-ink-900">Diesel</p>
              <p className="mt-1 text-xs text-ink-500">{selected.padd}</p>
              <div className="mt-3 flex items-baseline justify-between gap-3">
                <span className="text-lg font-bold text-ink-900 tabular-nums">
                  {selected.diesel != null
                    ? `$${selected.diesel.toFixed(2)}/gal`
                    : "n/a"}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-ink-400">
                  EIA weekly
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-ink-200 bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">
                National series · shared across regions
              </p>
              <p className="mt-2 text-sm font-semibold text-ink-900">
                Wood pallet · lumber · wages · OCC
              </p>
              <p className="mt-1 text-xs text-ink-500">
                BLS PCU321920321920 · WPU0811 · CES4349300008 · WPU09150301
              </p>
              <p className="mt-3 pt-3 border-t border-ink-100 text-[11px] leading-relaxed text-ink-600">
                These four inputs (65% of PSCI) are national. They move the
                headline; diesel moves your region off it.
              </p>
            </div>
          </div>

          {/* Regional events - honest "coming soon", not fabricated */}
          <div className="mt-5 rounded-lg border border-dashed border-ink-300 bg-white p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">
              Regional events · launching summer 2026
            </p>
            <p className="mt-2 text-xs leading-relaxed text-ink-600">
              Plant openings, WARN closures, port and weather disruptions, and
              other corridor events - each with a source link you can verify and
              a plain-English read on what it means for your region. We do not
              manufacture news: quiet weeks will say so.
            </p>
          </div>
        </div>
      </div>

      {/* Citations + CTA */}
      <div className="px-7 pb-8 sm:px-9 sm:pb-10">
        <div className="border-t border-ink-200 pt-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
          <p className="text-xs leading-relaxed text-ink-500 max-w-md">
            All federal inputs from BLS and EIA. Regional PSCI is the national
            index with diesel localized per PADD, each region rebased to
            January 2024 = 100. Full methodology and weights on the methodology
            page. Historical PSCI data is CC0 public domain.
          </p>
          <a
            href="/market-pulse"
            className="group inline-flex items-center gap-1.5 rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors whitespace-nowrap shrink-0"
          >
            Learn more
            <span
              aria-hidden="true"
              className="transition-transform group-hover:translate-x-1"
            >
              →
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
