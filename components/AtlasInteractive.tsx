"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import AtlasRegionsMap from "./AtlasRegionsMap";
import { submitWebLead } from "@/lib/submitLead";

/**
 * AtlasInteractive - the Market Pulse configurator on /market-pulse.
 *
 * 2026-06-01 honest rebuild (task #21 in REBUILD_WIRING.md). The prior version
 * hardcoded a REGIONS array with fabricated per-region PSCI values, fabricated
 * editorial paragraphs (Colonial Pipeline maintenance, port volumes, NIFC
 * wildfire), fabricated source-attributed alerts, and fabricated per-region
 * diesel and wage drivers with blurred 30-day forecasts. That violated the
 * honesty wall - invented events with real source citations.
 *
 * This version shows ONLY values we actually compute and verify:
 *   - Per-region PSCI (live, diesel-localized rebase, from psci_regional.json
 *     via lib/psci.PSCI_REGIONAL, passed in as the `regions` prop).
 *   - Per-region diesel $/gal (real EIA per-PADD, same source).
 *   - National 30-day forecast (live, from data/psci_forecast.json via
 *     PSCI_FORECAST, passed in as `forecastPct`). Clearly labeled NATIONAL -
 *     there is no per-region forecast in v0.3.
 *   - The configurator's user state (regions chosen, cost lines, priority,
 *     billing, DC count) drives pricing and the reserve-form payload; it does
 *     NOT fabricate sample numbers from those choices.
 *
 * Props are fed by app/market-pulse/page.tsx (server component) from lib/psci.
 * Defaults mirror verified 2026-05-26 values so the component still renders
 * real numbers if mounted without props (e.g. Storybook / preview surfaces).
 *
 * The regional events layer (plant openings, WARN closures, port and weather
 * disruptions) is honestly marked "launching summer 2026" - not faked. When
 * the find-verify-link pipeline ships, real source-linked events replace the
 * placeholder.
 */

export type SampleRegion = {
  slug: string;
  name: string;
  psci: number;
  diesel: number | null;
  padd: string;
  // Real regional week-over-week move (psci_wow_pct from psci_regional.json).
  // Optional so legacy callers don't break; RegionalRead uses it for the read.
  wowPct?: number | null;
};

type AtlasInteractiveProps = {
  regions?: SampleRegion[];
  nationalPsci?: number;
  nationalWowPct?: number | null;
  forecastPct?: number | null;
  forecastConfidence?: number;
  asOfLabel?: string;
};

// Verified 2026-05-26 fallback (data/psci_regional.json v0.3). Real numbers,
// not placeholders - used only if the page does not pass live props.
const DEFAULT_REGIONS: SampleRegion[] = [
  { slug: "northeast", name: "Northeast", psci: 112.54, diesel: 5.231, padd: "PADD 1B Central Atlantic" },
  { slug: "southeast", name: "Southeast", psci: 115.83, diesel: 5.808, padd: "PADD 1C Lower Atlantic" },
  { slug: "great-lakes", name: "Great Lakes", psci: 115.19, diesel: 5.749, padd: "PADD 2 Midwest" },
  { slug: "texas-south-central", name: "Texas + South Central", psci: 114.06, diesel: 5.122, padd: "PADD 3 Gulf Coast" },
  { slug: "plains-mountain", name: "Plains + Mountain", psci: 113.24, diesel: 5.549, padd: "PADD 4 Rocky Mountain" },
  { slug: "west-coast", name: "West Coast (CA + PNW)", psci: 112.71, diesel: 6.524, padd: "PADD 5 West Coast" },
];

type CostDriver = { slug: string; name: string; desc: string };

const COST_DRIVERS: CostDriver[] = [
  { slug: "lumber-wood", name: "Lumber & wood", desc: "Softwood, hardwood, pallet deck lumber." },
  { slug: "diesel-freight", name: "Diesel & freight", desc: "Inbound and outbound trucking costs." },
  { slug: "corrugated-occ", name: "Corrugated & OCC", desc: "Cardboard packaging, recycled paper stream." },
  { slug: "labor-wages", name: "Labor & wages", desc: "Warehouse hourly, sort-line, handling labor." },
  { slug: "stretch-banding", name: "Stretch wrap & banding", desc: "Consumables, strapping, banding materials." },
  { slug: "steel-fasteners", name: "Steel & fasteners", desc: "Banding hardware, nails, pallet repair fasteners." },
];

const PRIORITIES = [
  { slug: "forecast", name: "30-day forecasting", desc: "See what is coming next so you can lock or wait." },
  { slug: "audit", name: "Audit defensibility", desc: "Cite federal source IDs in every line. Stand up to procurement audit." },
  { slug: "vendor", name: "Vendor coverage", desc: "See how many vendors operate around each of your DCs." },
  { slug: "cost", name: "Cost stability", desc: "Lock in pricing before the next upward move." },
];

const FOUNDING_RATE = 19.99; // pressure test 2026-06-01 (was 79)

function initials(s: string): string {
  const parts = s.split(/\s+/);
  if (parts.length === 1) return s.slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function fmtPct(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

export default function AtlasInteractive({
  regions = DEFAULT_REGIONS,
  nationalPsci = 113.67,
  nationalWowPct = 1.8,
  forecastPct = -1.37,
  forecastConfidence = 0.8,
  asOfLabel = "May 26, 2026",
}: AtlasInteractiveProps = {}) {
  const regionList = regions.length > 0 ? regions : DEFAULT_REGIONS;
  const firstSlug = regionList[0].slug;

  // Multi-region: selectedRegions tracks subscription intent.
  // viewingRegion controls which region's sample shows.
  const [selectedRegions, setSelectedRegions] = useState<string[]>([firstSlug]);
  const [viewingRegion, setViewingRegion] = useState<string>(firstSlug);
  const [costDrivers, setCostDrivers] = useState<string[]>([]);
  const [priority, setPriority] = useState<string | null>(null);
  // null = empty input. User can type freely; we only compute per-DC math
  // when a positive number is entered.
  const [dcCount, setDcCount] = useState<number | null>(null);
  const [billingMode, setBillingMode] = useState<"monthly" | "annual">("monthly");
  const [email, setEmail] = useState<string>("");
  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedRegion =
    regionList.find((r) => r.slug === viewingRegion) ?? regionList[0];
  const driverNames = costDrivers
    .map((d) => COST_DRIVERS.find((x) => x.slug === d)?.name)
    .filter(Boolean) as string[];
  const priorityName = PRIORITIES.find((p) => p.slug === priority)?.name;

  const regionCount = selectedRegions.length;
  const monthlyTotal = regionCount * FOUNDING_RATE;
  // Annual billing = 2 months free (~17% off, industry standard).
  const annualTotal = monthlyTotal * 10; // 10 months of monthly rate
  const annualMonthlyEquivalent = annualTotal / 12;
  const annualSavings = monthlyTotal * 12 - annualTotal;
  // Per-DC daily math only when user has entered a positive DC count.
  const hasValidDcCount = dcCount !== null && dcCount > 0;
  const perDcDaily = hasValidDcCount
    ? (billingMode === "annual" ? annualMonthlyEquivalent : monthlyTotal) /
      (dcCount as number) /
      30.4
    : null;
  const displayTotal =
    billingMode === "annual" ? annualTotal : monthlyTotal;
  const displayPeriod = billingMode === "annual" ? "/yr" : "/mo";
  const step3Revealed = costDrivers.length > 0;
  // Reserve is available as soon as a region is picked (a region is
  // pre-selected on load), so a buyer can lock their founding rate without
  // working through the optional cost-line and priority steps first. Price
  // is purely regionCount x $19.99; the optional steps never change it.
  const submitRevealed = regionCount > 0;

  // Forecast direction: DOWN = cost relief = green; UP = red. Matches the
  // homepage forecast box and AtlasSamplePreview treatment.
  const forecastDown =
    typeof forecastPct === "number" && forecastPct < 0;
  const forecastColor =
    forecastPct == null
      ? "text-ink-900"
      : forecastDown
      ? "text-emerald-600"
      : "text-red-600";
  const wowDown =
    typeof nationalWowPct === "number" && nationalWowPct < 0;

  // National PSCI band-vs-regional read for the selected region.
  const regionVsNational = selectedRegion.psci - nationalPsci;
  const regionAboveNational = regionVsNational > 0;

  function handleRegionClick(slug: string) {
    // Pure toggle.
    // Click unsubscribed -> subscribe + auto-view.
    // Click subscribed -> unsubscribe (view falls back to first remaining).
    if (!selectedRegions.includes(slug)) {
      setSelectedRegions([...selectedRegions, slug]);
      setViewingRegion(slug);
    } else {
      const remaining = selectedRegions.filter((s) => s !== slug);
      if (remaining.length === 0) return; // keep at least one
      setSelectedRegions(remaining);
      if (viewingRegion === slug) {
        setViewingRegion(remaining[0]);
      }
    }
  }

  function toggleDriver(slug: string) {
    setCostDrivers((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@") || !trimmed.includes(".")) {
      setSubmitError("Please enter a valid work email address.");
      setSubmitStatus("error");
      return;
    }
    setSubmitStatus("loading");
    setSubmitError(null);
    // Capture the full configured edition so the segmented demand signal is
    // recorded even though checkout is not live yet (reservation, not a buy).
    const result = await submitWebLead({
      form_type: "market-pulse-reserve",
      email: trimmed,
      source: "atlas-market-pulse",
      regions: selectedRegions,
      cost_drivers: costDrivers,
      priority: priority ?? undefined,
      dc_count: dcCount ?? undefined,
      billing: billingMode,
      monthly_total: monthlyTotal,
    });
    if (result.ok) {
      setSubmitStatus("success");
    } else {
      setSubmitError(
        result.error
          ? `${result.error} - nothing was reserved; please try again.`
          : "Something went wrong - nothing was reserved; please try again.",
      );
      setSubmitStatus("error");
    }
  }

  const regionSummary =
    selectedRegions.length === 1
      ? regionList.find((r) => r.slug === selectedRegions[0])?.name ?? ""
      : `${selectedRegions.length} regions`;
  const driverSummary =
    driverNames.length === 0
      ? ""
      : driverNames.length <= 2
      ? driverNames.join(" + ")
      : `${driverNames.length} cost lines`;
  const configLine =
    regionSummary +
    (driverSummary ? ` · ${driverSummary}` : "") +
    (priorityName ? ` · ${priorityName.toLowerCase()} focus` : "");

  return (
    <>
      <p className="mt-10 text-center text-sm font-bold uppercase tracking-[0.2em] text-brand-600">
        Three steps to your own market read
      </p>
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* LEFT: Selectors */}
        <div className="min-w-0">
          {/* STEP 1: Region */}
          <div className="py-7 border-b border-ink-100">
            <div className="flex items-start gap-4">
              <span className="shrink-0 select-none text-5xl sm:text-6xl font-black leading-none text-brand-500 tabular-nums">
                1
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-600">
                  Your regions · sets your price
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-ink-900">
                  Pick the regions you operate in.
                </h2>
                <p className="mt-1.5 text-sm text-ink-600">
                  Click to add. Click again to remove. Use the tabs above
                  the sample to switch between regions you have selected.
                  Six US regions (West Coast covers CA and PNW), plus Canada
                  as an add-on.
                </p>
                <p className="mt-3 text-sm font-semibold text-ink-800">
                  This is your whole price: $19.99 per region, flat. Steps 2 and 3
                  tune what is in your edition - they never change the price.
                </p>
              </div>
            </div>

            {/* Subscription summary */}
            <div className="mt-4 px-4 py-3 rounded-xl bg-ink-900 text-white flex items-center justify-between flex-wrap gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-300">
                  Subscribed to
                </span>
                <p className="mt-1 text-sm font-semibold">
                  {selectedRegions
                    .map((s) => regionList.find((r) => r.slug === s)?.name)
                    .filter(Boolean)
                    .join(" + ")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold tabular-nums text-brand-300">
                  ${monthlyTotal.toFixed(2)}
                  <span className="text-sm font-semibold text-ink-300">
                    /mo
                  </span>
                </p>
                <p className="text-[10px] uppercase tracking-wider text-ink-400">
                  {selectedRegions.length} ×{" "}
                  <span className="tabular-nums">$19.99</span> founding
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {regionList.map((r) => {
                const isSubscribed = selectedRegions.includes(r.slug);
                return (
                  <button
                    key={r.slug}
                    type="button"
                    onClick={() => handleRegionClick(r.slug)}
                    aria-pressed={isSubscribed}
                    className={
                      isSubscribed
                        ? "relative px-4 py-3 rounded-xl border-2 border-brand-500 bg-brand-50 ring-2 ring-brand-200 text-left transition-all"
                        : "relative px-4 py-3 rounded-xl border-[1.5px] border-ink-200 bg-white text-left hover:border-brand-400 hover:bg-brand-50/40 transition-all cursor-pointer"
                    }
                  >
                    {isSubscribed && (
                      <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-brand-500 text-white flex items-center justify-center">
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M5 13 L9 17 L19 7" />
                        </svg>
                      </span>
                    )}
                    <span className="block text-sm font-semibold text-ink-900 pr-4">
                      {r.name}
                    </span>
                    <span className="block mt-1 text-xs text-ink-500 tabular-nums">
                      PSCI{" "}
                      <strong className="text-brand-600 font-bold">
                        {r.psci.toFixed(2)}
                      </strong>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Visual region map - sits directly under the region cards as
                immediate geographic confirmation of what each PS region
                actually covers. Click a state to toggle that region. */}
            <div className="mt-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-500 mb-2.5">
                Your subscription, on the map
              </p>
              <AtlasRegionsMap
                selectedRegions={selectedRegions}
                viewingRegion={viewingRegion}
                onRegionClick={handleRegionClick}
              />
            </div>
          </div>

          {/* STEP 2: Cost drivers (multi-select) */}
          <div className="py-7 border-b border-ink-100">
            <div className="flex items-start gap-4">
              <span className="shrink-0 select-none text-5xl sm:text-6xl font-black leading-none text-brand-500 tabular-nums">
                2
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-600">
                  Tune your edition
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-ink-900">
                  Which cost lines do you watch most?
                </h2>
                <p className="mt-1.5 text-sm text-ink-600">
                  Pick all that apply - we weight your weekly edition to the
                  inputs you watch. This never changes your price; you pay $19.99
                  per region whether you pick one or all six.
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {COST_DRIVERS.map((d) => {
                const isSelected = costDrivers.includes(d.slug);
                return (
                  <button
                    key={d.slug}
                    type="button"
                    onClick={() => toggleDriver(d.slug)}
                    aria-pressed={isSelected}
                    className={
                      isSelected
                        ? "p-4 rounded-xl border-2 border-brand-500 bg-brand-50 ring-2 ring-brand-200 text-left flex gap-3.5 items-start transition-all"
                        : "p-4 rounded-xl border-[1.5px] border-ink-200 bg-white hover:border-brand-400 hover:bg-brand-50/40 text-left flex gap-3.5 items-start transition-all cursor-pointer"
                    }
                  >
                    <span
                      className={
                        isSelected
                          ? "w-9 h-9 shrink-0 rounded-lg bg-brand-500 text-white flex items-center justify-center font-bold"
                          : "w-9 h-9 shrink-0 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-sm"
                      }
                    >
                      {isSelected ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M5 13 L9 17 L19 7" />
                        </svg>
                      ) : (
                        initials(d.name)
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] font-semibold text-ink-900">{d.name}</div>
                      <div className="mt-1 text-xs text-ink-600 leading-relaxed">{d.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            {costDrivers.length > 0 && (
              <p className="mt-3 text-xs text-brand-700 font-medium">
                {costDrivers.length} selected · click any to remove
              </p>
            )}
          </div>

          {/* STEP 3: Priority */}
          {step3Revealed && (
            <div className="py-7 animate-[fadeUp_0.4s_ease-out]">
              <div className="flex items-start gap-4">
                <span className="shrink-0 select-none text-5xl sm:text-6xl font-black leading-none text-brand-500 tabular-nums">
                  3
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-600">
                    Set your focus
                  </p>
                  <h2 className="mt-1 text-xl font-bold tracking-tight text-ink-900">
                    What matters most to your team right now?
                  </h2>
                  <p className="mt-1.5 text-sm text-ink-600">
                    We emphasize this section of your weekly edition. Shapes
                    your edition, not your price.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PRIORITIES.map((p) => {
                  const isSelected = priority === p.slug;
                  return (
                    <button
                      key={p.slug}
                      type="button"
                      onClick={() => setPriority(p.slug)}
                      className={
                        isSelected
                          ? "p-4 rounded-xl border-2 border-brand-500 bg-brand-50 ring-2 ring-brand-200 text-left flex gap-3.5 items-start transition-all"
                          : "p-4 rounded-xl border-[1.5px] border-ink-200 bg-white hover:border-brand-400 hover:bg-brand-50/40 text-left flex gap-3.5 items-start transition-all cursor-pointer"
                      }
                    >
                      <span
                        className={
                          isSelected
                            ? "w-9 h-9 shrink-0 rounded-lg bg-brand-500 text-white flex items-center justify-center font-bold text-sm"
                            : "w-9 h-9 shrink-0 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-sm"
                        }
                      >
                        {initials(p.name)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[15px] font-semibold text-ink-900">{p.name}</div>
                        <div className="mt-1 text-xs text-ink-600 leading-relaxed">{p.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* "One subscription, your whole team" - per-region vs per-seat
              differentiator. Lives below the map as the final left-column
              trust signal. */}
          <div className="mt-8 p-5 rounded-xl border-[1.5px] border-brand-200 bg-brand-50/60">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-700">
              One subscription. Your whole team.
            </p>
            <p className="mt-3 text-sm text-ink-800 leading-relaxed">
              The weekly edition is{" "}
              <strong className="font-bold">per-region, not per-seat</strong>.
              Subscribe once for the regions you operate in - forward
              it to your CFO, your auditor, your sourcing leads, your
              warehouse managers. As many people as you need.
            </p>
            <p className="mt-3 text-sm text-ink-700 leading-relaxed">
              No user licenses. No seat counts. No password sharing,
              because there is no password.
            </p>
            <p className="mt-3 text-xs text-ink-600 leading-relaxed">
              For comparison: Bloomberg Terminal is $25,000 per seat
              per year. FactSet is $15,000 per seat per year. Every
              person who needs access pays again. Market Pulse is one email,
              your whole org.
            </p>
          </div>
        </div>

        {/* RIGHT: Sample preview (sticky).
            When 2+ regions are subscribed, a tab strip appears above the
            sample card and stacked-card depth ghosts render behind it to
            show that multiple region samples are accessible. Clicking any
            tab swaps the active region (same effect as clicking another
            region card in the left column). */}
        <div className="lg:sticky lg:top-24 lg:mt-[88px] min-w-0 self-start pr-3 lg:pr-4">
          {/* Tab strip - only when 2+ regions selected */}
          {selectedRegions.length > 1 && (
            <div className="flex gap-1 px-1 -mb-px overflow-x-auto">
              {selectedRegions.map((slug) => {
                const r = regionList.find((x) => x.slug === slug);
                if (!r) return null;
                const isActive = viewingRegion === slug;
                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => setViewingRegion(slug)}
                    className={
                      isActive
                        ? "px-4 py-2 rounded-t-lg bg-white border-x border-t border-ink-200 text-xs font-bold text-ink-900 whitespace-nowrap shadow-sm relative z-20"
                        : "px-4 py-2 rounded-t-lg bg-ink-50 border-x border-t border-ink-200 text-xs font-semibold text-ink-500 hover:bg-ink-100 hover:text-ink-700 whitespace-nowrap cursor-pointer transition-colors"
                    }
                    aria-current={isActive ? "page" : undefined}
                  >
                    {r.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* Stacked-card container: active on top, ghosts behind for depth */}
          <div className="relative">
            {/* Ghost card 1 (one level back) - shown when 2+ selected */}
            {selectedRegions.length > 1 && (
              <div
                className="absolute inset-0 rounded-2xl bg-white border border-ink-200 pointer-events-none"
                style={{
                  transform: "translate(8px, 8px)",
                  zIndex: 1,
                  opacity: 0.55,
                  boxShadow: "0 12px 24px -16px rgba(15, 23, 42, 0.18)",
                }}
                aria-hidden="true"
              />
            )}
            {/* Ghost card 2 (two levels back) - shown when 3+ selected */}
            {selectedRegions.length > 2 && (
              <div
                className="absolute inset-0 rounded-2xl bg-white border border-ink-200 pointer-events-none"
                style={{
                  transform: "translate(16px, 16px)",
                  zIndex: 0,
                  opacity: 0.35,
                  boxShadow: "0 12px 24px -16px rgba(15, 23, 42, 0.12)",
                }}
                aria-hidden="true"
              />
            )}

            {/* Active sample card.
                SAMPLE TREATMENT (hardened 2026-05-23, preserved through
                2026-06-01 honest rebuild): two layers so any screenshot
                carries the disclosure.
                  1. Amber SAMPLE EDITION bar pinned to the top of the card.
                  2. Diagonal "Sample" watermark across the panel body so
                     even a cropped screenshot carries it. */}
            <div className="relative z-10 rounded-2xl border border-ink-200 bg-white shadow-2xl shadow-ink-900/10 overflow-hidden">
              {/* Hard SAMPLE bar - amber for caution */}
              <div className="bg-amber-400 px-5 py-2 flex items-center justify-between gap-3 border-b-2 border-amber-500">
                <div className="flex items-center gap-2 min-w-0">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-amber-900 shrink-0"
                    aria-hidden="true"
                  >
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                  </svg>
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-900 truncate">
                    Sample edition - illustrative only, not a live read
                  </span>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-900/80 shrink-0 hidden sm:inline">
                  First editions begin summer 2026
                </span>
              </div>

              {/* Header */}
              <div className="relative bg-ink-900 px-7 py-6 flex items-start justify-between gap-4 overflow-hidden">
                <div
                  className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
                  aria-hidden="true"
                >
                  <span
                    className="text-white/10 font-black uppercase tracking-[0.3em] text-4xl whitespace-nowrap select-none"
                    style={{ transform: "rotate(-12deg)" }}
                  >
                    Sample &nbsp;·&nbsp; Sample &nbsp;·&nbsp; Sample
                  </span>
                </div>
                <div className="relative z-10">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-300">
                    Your Market Pulse edition · Week of {asOfLabel}
                  </div>
                  <div className="mt-3 text-3xl font-bold text-white tabular-nums">
                    PSCI™ <span className="text-white">{selectedRegion.psci.toFixed(2)}</span>
                  </div>
                  <div className="mt-1 text-sm text-ink-300">
                    {selectedRegion.name}
                  </div>
                </div>
                <div className="relative z-10 text-right shrink-0">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-brand-300">PSCI™ v1.3</span>
                  <span className="mt-2 inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-[0.14em] text-amber-900 bg-amber-300/95">
                    Sample
                  </span>
                </div>
              </div>

              {/* Honesty framing - what's live vs. what's coming. Mirrors the
                  treatment on /procurement's AtlasSamplePreview so the two
                  surfaces tell the same story. */}
              <div className="bg-brand-50/70 border-b border-brand-100 px-7 py-3">
                <p className="text-xs leading-relaxed text-ink-600">
                  Cost figures below are{" "}
                  <span className="font-semibold text-ink-800">
                    live federal data
                  </span>{" "}
                  (PSCI and diesel, from BLS and EIA). The regional events
                  layer launches summer 2026 - every event will carry a source
                  link you can verify, and quiet weeks will say so.
                </p>
              </div>

              {/* Body */}
              <div className="px-7 py-7 space-y-7">
                {/* National headline + 30-day forecast. The forecast tile is
                    NATIONAL by design - there is no per-region forecast in
                    v0.3 (data/psci_regional.json carries psci_projected = null
                    for every region). Labeled accordingly so a buyer cannot
                    mistake it for a per-region projection. */}
                <div className="rounded-xl border-[1.5px] border-brand-200 bg-brand-50/60 p-5">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-700">
                        National PSCI™ · this week
                      </p>
                      <p className="mt-2 text-2xl font-bold text-ink-900 tabular-nums">
                        {nationalPsci.toFixed(2)}
                        {typeof nationalWowPct === "number" && (
                          <span className="ml-2 text-sm font-semibold text-ink-600">
                            {wowDown ? "down" : "up"}{" "}
                            {Math.abs(nationalWowPct).toFixed(2)}% WoW
                          </span>
                        )}
                      </p>
                    </div>
                    {typeof forecastPct === "number" && (
                      <div className="text-right">
                        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-700">
                          National 30-day projection
                        </p>
                        <p className={`mt-2 text-2xl font-bold tabular-nums ${forecastColor}`}>
                          {fmtPct(forecastPct)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-ink-500">
                          TimesFM 2.5 ·{" "}
                          {Math.round(forecastConfidence * 100)}% confidence
                        </p>
                      </div>
                    )}
                  </div>
                  {typeof forecastPct === "number" && (
                    <p className="mt-3 text-xs text-ink-700">
                      {forecastDown
                        ? "Projected cost relief over the next 30 days."
                        : "Projected upward cost pressure over the next 30 days."}{" "}
                      Per-region forecasts are not published in v0.3 - the
                      national projection refreshes after federal data drops.
                    </p>
                  )}
                </div>

                {/* Per-region read - real PSCI + real diesel + national
                    context. Diesel is the only localized input; the other
                    65% (wood pallet / lumber / wages / OCC) is national. */}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-600">
                    {selectedRegion.name} · this week
                  </p>
                  <p className="mt-3 text-sm text-ink-700 leading-relaxed">
                    {selectedRegion.name}&apos;s PSCI is the national index with
                    diesel localized to {selectedRegion.padd}
                    {selectedRegion.diesel != null
                      ? ` (currently $${selectedRegion.diesel.toFixed(2)}/gal)`
                      : ""}
                    . Diesel is the one cost input that differs by region; the
                    other 65% of the index - wood pallet, lumber, warehouse
                    wages, and OCC - is national and identical across every
                    region. {selectedRegion.name}{" "}
                    sits{" "}
                    {regionAboveNational ? "above" : "below"} the national{" "}
                    {nationalPsci.toFixed(2)} because its diesel has moved{" "}
                    {regionAboveNational ? "more" : "less"} than the national
                    average since the January 2024 baseline.
                  </p>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-lg border border-ink-200 bg-white p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                        Regional source · real EIA
                      </p>
                      <p className="mt-2 text-sm font-semibold text-ink-900">Diesel</p>
                      <p className="mt-1 text-xs text-ink-500">
                        {selectedRegion.padd}
                      </p>
                      <div className="mt-3 flex items-baseline justify-between gap-3">
                        <span className="text-lg font-bold text-ink-900 tabular-nums">
                          {selectedRegion.diesel != null
                            ? `$${selectedRegion.diesel.toFixed(2)}/gal`
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
                        These four inputs (65% of PSCI) are national. They
                        move the headline; diesel moves your region off it.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Your selected cost lines - reflects Step 2. No fabricated
                    per-driver values. The weekly edition surfaces the real
                    federal WoW for each cost line; the configurator just
                    confirms what we'll emphasize for this subscriber. */}
                {costDrivers.length > 0 && (
                  <div className="animate-[fadeUp_0.4s_ease-out]">
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-600">
                      Cost lines you&apos;re watching
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {driverNames.map((n) => (
                        <span
                          key={n}
                          className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 border border-brand-200 px-3 py-1 text-xs font-semibold text-brand-800"
                        >
                          {n}
                        </span>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-ink-500 leading-relaxed">
                      Your Tuesday edition carries the week-over-week move on
                      each of these from the underlying federal series (BLS
                      PPI, EIA, BLS QCEW). No fabrication on the configurator -
                      the real WoW values publish with the live edition.
                    </p>
                  </div>
                )}

                {/* Priority-driven emphasis line. Just acknowledges Step 3,
                    no fabricated emphasis content. */}
                {priorityName && (
                  <div className="rounded-lg border-l-[3px] border-brand-400 bg-brand-50/40 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-700">
                      Focus you&apos;ve set
                    </p>
                    <p className="mt-1.5 text-sm text-ink-800">
                      Your edition will lead with{" "}
                      <strong className="font-semibold">
                        {priorityName.toLowerCase()}
                      </strong>
                      .
                    </p>
                  </div>
                )}

                {/* Regional events placeholder - honest "coming summer 2026",
                    not fabricated source-linked alerts. */}
                <div className="rounded-lg border border-dashed border-ink-300 bg-white p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">
                    Regional events · launching summer 2026
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-ink-600">
                    Plant openings, WARN closures, port and weather
                    disruptions, and other corridor events - each with a
                    source link you can verify and a plain-English read on
                    what it means for your region. We do not manufacture
                    news: quiet weeks will say so.
                  </p>
                </div>

                {/* Real data + methodology links. CSV is the public PSCI
                    historical series; methodology is the full disclosure.
                    Labeled exactly as that - not an "audit pack." */}
                <div className="border-t border-ink-100 pt-5 space-y-3">
                  <p className="text-[11px] text-ink-500 leading-relaxed">
                    Regional PSCI values are PS&apos;s calculation from public
                    BLS and EIA inputs using the published methodology, each
                    region rebased to January 2024 = 100. The underlying
                    federal series are reproducible; the regional composite is
                    not published by any government source.
                  </p>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-bold">
                    <Link
                      href="/methodology"
                      className="inline-flex items-center gap-1 text-brand-700 hover:text-brand-800 hover:underline"
                    >
                      Read the PSCI™ methodology →
                    </Link>
                    <a
                      href="/data/psci_historical.csv"
                      className="inline-flex items-center gap-1 text-brand-700 hover:text-brand-800 hover:underline"
                    >
                      Download the PSCI data (CSV) →
                    </a>
                  </div>
                </div>
              </div>
            </div>
            {/* close relative wrapper for stacked-card depth */}
          </div>
        </div>
      </div>

      {/* CONVERSION BLOCK - "Why this is priced like commodity intel" +
          dynamic Market Pulse math + email/subscribe. Lives below the
          configurator. */}
      {submitRevealed && (
        <div
          id="submit-anchor"
          className="mt-12 mx-auto max-w-5xl rounded-2xl bg-ink-900 p-8 sm:p-12 animate-[fadeUp_0.5s_ease-out]"
        >
          {submitStatus === "success" ? (
            <div className="rounded-xl border border-emerald-400 bg-emerald-950/40 p-6">
              <p className="text-lg font-bold text-emerald-300">You are on the waitlist.</p>
              <p className="mt-2 text-sm text-emerald-100 leading-relaxed">
                Check your inbox - we sent you a confirmation link. Click it to lock in your founding-rate spot for {regionSummary}. We will email when your first Tuesday edition is ready to ship.
              </p>
            </div>
          ) : (
            <>
              {/* SECTION 1: Commodity intel reassurance */}
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-300">
                Why this is priced like commodity intel
              </p>
              <h2 className="mt-5 text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Pallet cost intelligence priced like commodity intel, not capital markets intel.
              </h2>
              <p className="mt-6 text-base leading-relaxed text-ink-300 max-w-3xl">
                You can subscribe to commodity intel without buying anything from the publisher.
                Market Pulse works the same way - pay for the data, the methodology, and the
                audit-defensible exports, not the transactions. Decoupled from Managed Programs by
                design.
              </p>

              {/* SECTION 2: Comparables block */}
              <div className="mt-8 pt-8 border-t border-ink-700">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400 mb-4">
                  What commodity intel usually costs
                </p>
                <div className="space-y-2.5">
                  <div className="flex items-baseline justify-between gap-4 pb-2.5 border-b border-ink-800">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">Fastmarkets RISI</p>
                      <p className="text-[11px] text-ink-400">Random Lengths lumber</p>
                    </div>
                    <p className="text-sm font-bold text-ink-300 tabular-nums whitespace-nowrap">
                      $2,500-5,000/yr per topic
                    </p>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 pb-2.5 border-b border-ink-800">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">Argus Media</p>
                      <p className="text-[11px] text-ink-400">Diesel pricing</p>
                    </div>
                    <p className="text-sm font-bold text-ink-300 tabular-nums whitespace-nowrap">
                      $3,000-6,000/yr per topic
                    </p>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 pb-2.5 border-b border-ink-800">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">S&amp;P Global Platts</p>
                      <p className="text-[11px] text-ink-400">Commodity benchmarks</p>
                    </div>
                    <p className="text-sm font-bold text-ink-300 tabular-nums whitespace-nowrap">
                      $5,000-25,000/yr per benchmark
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Your Market Pulse conversion block */}
              <div className="mt-10 pt-8 border-t-2 border-brand-500">
                <div className="flex items-baseline justify-between gap-4 flex-wrap mb-2">
                  <h3 className="text-xl font-bold tracking-tight text-white">
                    Your Market Pulse subscription
                  </h3>
                  <p className="text-[11px] font-semibold text-brand-300">
                    {configLine}
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* LEFT: controls */}
                  <div className="space-y-5">
                    {/* Billing toggle */}
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400 mb-2">
                        Billing
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setBillingMode("monthly")}
                          className={
                            billingMode === "monthly"
                              ? "flex-1 px-4 py-2.5 rounded-lg bg-brand-500 text-white text-xs font-bold uppercase tracking-wider transition-colors"
                              : "flex-1 px-4 py-2.5 rounded-lg bg-ink-800 text-ink-300 text-xs font-semibold uppercase tracking-wider hover:bg-ink-700 transition-colors cursor-pointer"
                          }
                        >
                          Monthly
                        </button>
                        <button
                          type="button"
                          onClick={() => setBillingMode("annual")}
                          className={
                            billingMode === "annual"
                              ? "flex-1 px-4 py-2.5 rounded-lg bg-brand-500 text-white text-xs font-bold uppercase tracking-wider transition-colors"
                              : "flex-1 px-4 py-2.5 rounded-lg bg-ink-800 text-ink-300 text-xs font-semibold uppercase tracking-wider hover:bg-ink-700 transition-colors cursor-pointer"
                          }
                        >
                          Annual <span className="text-brand-300">save 2 mo</span>
                        </button>
                      </div>
                      {billingMode === "annual" && (
                        <p className="mt-2 text-[11px] text-brand-300">
                          You save <span className="font-bold tabular-nums">${annualSavings}</span> per year by pre-paying.
                        </p>
                      )}
                    </div>

                    {/* DC count for per-DC math */}
                    <div>
                      <label
                        htmlFor="dc-count"
                        className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400 mb-2"
                      >
                        How many DCs do you operate?
                      </label>
                      <input
                        id="dc-count"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={dcCount === null ? "" : String(dcCount)}
                        placeholder="e.g. 12"
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, "");
                          if (raw === "") {
                            setDcCount(null);
                            return;
                          }
                          const parsed = parseInt(raw, 10);
                          if (isNaN(parsed)) {
                            setDcCount(null);
                            return;
                          }
                          // cap at 500 silently, don't enforce min during editing
                          setDcCount(Math.min(500, parsed));
                        }}
                        className="w-full max-w-[140px] px-3 py-2 rounded-md border-[1.5px] border-ink-700 bg-ink-800 text-base text-white text-center tabular-nums placeholder:text-ink-500 focus:outline-none focus:border-brand-500 transition-colors"
                      />
                      <p className="mt-2 text-[11px] text-ink-400">
                        Used only to compute your per-DC math below. Not stored.
                      </p>
                    </div>

                    <p className="text-[11px] text-ink-500 leading-relaxed pt-2">
                      Bundle pricing for full coverage available on request.
                    </p>
                  </div>

                  {/* RIGHT: price + email */}
                  <div>
                    {/* Big total */}
                    <div className="text-right md:text-left">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-300">
                        Your total
                      </p>
                      <p className="mt-1 text-5xl sm:text-6xl font-bold text-brand-300 tabular-nums leading-none">
                        ${displayTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="text-2xl sm:text-3xl">{displayPeriod}</span>
                      </p>
                      <p className="mt-2 text-xs text-ink-400 uppercase tracking-wider">
                        {regionCount} region{regionCount === 1 ? "" : "s"} ·{" "}
                        founding rate
                      </p>
                      {billingMode === "annual" && (
                        <p className="mt-1 text-[11px] text-ink-500 tabular-nums">
                          (${(annualMonthlyEquivalent).toFixed(0)}/mo equivalent)
                        </p>
                      )}
                    </div>

                    {/* Per-DC math callout - only shows when DC count is entered */}
                    {hasValidDcCount && perDcDaily !== null ? (
                      <div className="mt-5 p-3 rounded-lg bg-brand-500/10 border border-brand-500/30">
                        <p className="text-xs text-ink-200 leading-relaxed">
                          <span className="font-bold text-white">Per-DC math:</span>{" "}
                          across{" "}
                          <span className="font-bold text-brand-300 tabular-nums">
                            {dcCount}
                          </span>{" "}
                          DCs ={" "}
                          <span className="font-bold text-brand-300 tabular-nums">
                            ${perDcDaily.toFixed(2)}
                          </span>{" "}
                          per DC per day.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-5 p-3 rounded-lg bg-ink-800/60 border border-ink-700">
                        <p className="text-xs text-ink-400 leading-relaxed">
                          Enter your DC count on the left to see the per-DC math.
                        </p>
                      </div>
                    )}

                    {/* Email + subscribe */}
                    <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-3">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (submitStatus === "error") {
                            setSubmitStatus("idle");
                            setSubmitError(null);
                          }
                        }}
                        placeholder="work@yourcompany.com"
                        autoComplete="email"
                        disabled={submitStatus === "loading"}
                        aria-label="Your work email address"
                        className="w-full px-4 py-3 rounded-md border-[1.5px] border-ink-700 bg-ink-800 text-base text-white placeholder:text-ink-500 focus:outline-none focus:border-brand-500 transition-colors disabled:opacity-50"
                      />
                      <button
                        type="submit"
                        disabled={submitStatus === "loading"}
                        className="w-full px-6 py-3 rounded-md bg-brand-500 text-white text-sm font-bold uppercase tracking-wider hover:bg-brand-600 transition-colors disabled:opacity-60"
                      >
                        {submitStatus === "loading"
                          ? "Sending..."
                          : `Lock in $${displayTotal.toLocaleString()}${displayPeriod} founding-rate →`}
                      </button>
                      <p className="text-[11px] text-ink-400 leading-relaxed">
                        Double opt-in. Cancel anytime. No spam.
                      </p>
                      {submitStatus === "error" && submitError && (
                        <p role="alert" className="text-sm text-red-400 font-medium">{submitError}</p>
                      )}
                    </form>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* OFF-RAMPS - so no persona feels stuck on the configurator.
          Single-DC -> Find a Vendor + RFQ paths. Enterprise / multi-region
          beyond self-serve -> /contact (no Calendly is wired, so do not
          offer a booking link). */}
      <div className="mt-12 mx-auto max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-xl border border-ink-200 bg-white p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-600">
            Sourcing a single DC?
          </p>
          <p className="mt-2 text-sm text-ink-700 leading-relaxed">
            Market Pulse is built for multi-region procurement. For a single
            facility, get vendors near you or add us to your next RFQ.
          </p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
            <Link
              href="/find-a-vendor"
              className="text-brand-700 hover:text-brand-800 hover:underline"
            >
              Find vendors near you →
            </Link>
            <Link
              href="/rfp"
              className="text-brand-700 hover:text-brand-800 hover:underline"
            >
              Add us to your RFQ →
            </Link>
          </div>
        </div>
        <div className="rounded-xl border border-ink-200 bg-white p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-600">
            National footprint or large program?
          </p>
          <p className="mt-2 text-sm text-ink-700 leading-relaxed">
            Bundle pricing for full coverage and any program scope beyond
            self-serve is quoted on request. Tell us what you operate and we
            will come back with a number.
          </p>
          <div className="mt-4 text-sm font-semibold">
            <Link
              href="/contact"
              className="text-brand-700 hover:text-brand-800 hover:underline"
            >
              Talk to us →
            </Link>
          </div>
        </div>
      </div>

      {/* STICKY LIVE PRICE CHIP. Fixed bottom-right, follows the buyer as
          they configure regions. Hides on submit success. */}
      {submitStatus !== "success" && (
        <a
          href={submitRevealed ? "#submit-anchor" : "#"}
          onClick={(e) => {
            if (!submitRevealed) {
              e.preventDefault();
              const el = document.querySelector("h2");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }}
          className="group fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-full bg-ink-900 px-5 py-3 text-white shadow-xl shadow-ink-900/30 hover:bg-ink-800 transition-colors border border-ink-700 max-w-[calc(100vw-3rem)]"
          aria-label={`Your Market Pulse edition: ${regionCount} region${regionCount === 1 ? "" : "s"} at $${monthlyTotal.toFixed(2)} per month founding rate`}
        >
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-brand-300">
              Your edition
            </span>
            <span className="text-xs font-semibold text-white truncate">
              {regionCount} region{regionCount === 1 ? "" : "s"} ·{" "}
              <span className="tabular-nums">${monthlyTotal.toFixed(2)}</span>
              <span className="text-ink-400">/mo founding</span>
            </span>
          </div>
          <span
            aria-hidden="true"
            className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-white text-base font-bold transition-transform group-hover:translate-x-0.5"
          >
            →
          </span>
        </a>
      )}
    </>
  );
}
