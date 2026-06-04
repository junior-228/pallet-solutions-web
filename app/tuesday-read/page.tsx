import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import TuesdayReadForm from "@/components/TuesdayReadForm";
import DarkBarFx from "@/components/DarkBarFx";
import Reveal from "@/components/Reveal";
import ForecastBand from "@/components/ForecastBand";

// DATA HONESTY FLAG (2026-06-01): the sample edition + archive below carry
// specific dated PSCI values and narratives. Until Rob confirms these are the
// REAL published figures, they are shown as ILLUSTRATIVE (set the flag below to
// false once verified). Archive editions dated before the public PSCI launch
// (~2026-05-12) - i.e. 2026-04-28 / 04-21 / 04-14 - cannot be presented as real
// "recent editions"; they are labeled sample examples until Rob confirms a real
// publication history that predates the launch, or replaces/removes them.
const EDITIONS_ARE_ILLUSTRATIVE = true;
const PSCI_PUBLIC_LAUNCH = "2026-05-12";

export const metadata: Metadata = {
  title: "The Tuesday Read | Pallet Solutions",
  description:
    "A free weekly publication on pallet cost inputs. National PSCI value, plain-English read on federal data, source links, public-domain CSV. Published every Tuesday after BLS and EIA releases.",
};

// ---------------------------------------------------------------------------
// Publication data
// ---------------------------------------------------------------------------
//
// TODO (Session 3): replace CURRENT_EDITION + RECENT_EDITIONS with
// build-time read of data/psci_latest.json + the narrative field. CLAUDE.md
// rule: every surface MUST read PSCI headline from psci_latest.json.

const CURRENT_EDITION = {
  weekEnding: "2026-05-19",
  editionNumber: 121,
  psciValue: 111.66,
  psciVersion: "PSCI v1.3",
  wowDelta: -0.16,
  wowDirection: "down" as const,
  headline: "Wages carry-forward absorbs a soft lumber print",
  read: "BLS pushed April warehouse-worker earnings past its usual Monday release window, so PSCI published at 111.66 with the wage component (15% weight) carried forward from March. Softwood lumber PPI eased 0.6% week-over-week as building permits softened in the Midwest and Southeast. Diesel held flat at the national PADD blend, with PADD 2 the only region showing meaningful weakness. Net result: a quiet print, dominated by lumber easing slightly more than diesel and OCC held steady.",
  topMovers: [
    {
      series: "Softwood Lumber PPI",
      sourceId: "BLS WPU0811",
      direction: "down" as const,
      magnitude: "-0.6% WoW",
      note: "Eased on softer Midwest and Southeast building permits.",
    },
    {
      series: "Diesel (national blend)",
      sourceId: "EIA EPD2D",
      direction: "flat" as const,
      magnitude: "+0.0% WoW",
      note: "Held flat. PADD 2 weakest, PADD 3 strongest within the blend.",
    },
    {
      series: "Paper Containers PPI (OCC proxy)",
      sourceId: "BLS WPU09150301",
      direction: "up" as const,
      magnitude: "+0.4% WoW",
      note: "Fourth straight week of cooling reversed. Small index impact at 5% weight.",
    },
  ],
  carryForward: {
    component: "Warehouse Worker Earnings",
    sourceId: "BLS CES4349300008",
    weight: "15%",
    note: "BLS April release pending. PSCI republishes when the data lands.",
  },
  forecast: {
    horizonDate: "2026-06-16",
    horizonLabel: "30 days out",
    median: 111.4,
    ciLower: 110.2,
    ciUpper: 112.6,
    ciPct: 80,
    direction: "down" as const,
    note: "TimesFM projects PSCI eases slightly over the next 30 days as lumber softness persists and diesel holds national-blend flat. The 80% confidence band includes the possibility of a flat print or a small upward move on a diesel reversal.",
    model: "TimesFM 2.5",
    runtime: "BigQuery ML AI.FORECAST",
  },
};

const RECENT_EDITIONS = [
  {
    weekEnding: "2026-05-12",
    headline: "Diesel softening absorbs a hot lumber print",
    summary:
      "PSCI lands at 111.84 (+1.06% WoW) as softwood lumber climbs 2.1% on tariff anticipation, partially offset by a -0.4% diesel move.",
  },
  {
    weekEnding: "2026-05-05",
    headline: "PADD 2 corridor diverges from national PSCI",
    summary:
      "Midwest pallet costs run 80 bps above the national composite for the third week in a row. Wages and warehouse-labor lift carry most of the gap.",
  },
  {
    weekEnding: "2026-04-28",
    headline: "OCC at a six-month low - what this means for pallets",
    summary:
      "Old corrugated containers PPI has cooled four straight weeks. With OCC weighted at 5%, the index impact is small but the supply-chain signal is louder.",
  },
  {
    weekEnding: "2026-04-21",
    headline: "BLS PPI methodology revision: how PSCI handles it",
    summary:
      "BLS quarterly seasonal adjustments restated Q1 wood pallet PPI by ~30 bps. PSCI republishes the affected weeks dated, with the original alongside.",
  },
  {
    weekEnding: "2026-04-14",
    headline: "Why diesel is the noisiest component in your read",
    summary:
      "EIA's weekly retail diesel series prints Mondays, so PSCI catches one full week of new diesel data per publication. The other four series move monthly.",
  },
];

const INSIDE_EVERY_EDITION = [
  {
    label: "PSCI™ this week",
    detail:
      "The current national value, week-over-week change, and direction. Reproducible from public BLS and EIA data using the published weights.",
  },
  {
    label: "30-day forecast",
    detail:
      "National PSCI projected 30 days out with an 80% confidence band. Powered by Google Research's open-source TimesFM 2.5, run via BigQuery ML AI.FORECAST.",
  },
  {
    label: "Plain-English read",
    detail:
      "What moved across the five federal cost-input series this week, why, and what the index movement actually means for procurement planning.",
  },
  {
    label: "Sources and CSV",
    detail:
      "Every figure cites its federal source ID (BLS PCU321920321920, EIA EPD2D, etc.). The full historical PSCI series is released CC0 public domain.",
  },
];

const PSCI_COMPONENTS = [
  { label: "BLS Wood Pallet PPI", source: "PCU321920321920", weight: "40%" },
  { label: "BLS Softwood Lumber PPI", source: "WPU0811", weight: "20%" },
  { label: "EIA Diesel (weekly retail)", source: "EPD2D", weight: "20%" },
  { label: "BLS Warehouse Worker Earnings", source: "CES4349300008", weight: "15%" },
  { label: "Paper Containers PPI (OCC proxy)", source: "WPU09150301", weight: "5%" },
];

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function formatEditionDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function ArrowRight() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="transition-transform group-hover:translate-x-1"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function DirectionIcon({ direction }: { direction: "up" | "down" | "flat" }) {
  if (direction === "flat") {
    return (
      <span
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-ink-100 text-ink-500 text-[10px] font-bold tabular-nums"
        aria-label="Flat"
      >
        =
      </span>
    );
  }
  const isUp = direction === "up";
  return (
    <span
      className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold ${
        isUp ? "bg-brand-50 text-brand-700" : "bg-ink-100 text-ink-600"
      }`}
      aria-label={isUp ? "Up" : "Down"}
    >
      {isUp ? "↑" : "↓"}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TuesdayReadPage() {
  return (
    <>
      {/* MASTHEAD - publication identity, not a product pitch. Same grounded
          depth as the other heroes: single-hue grid + low-opacity blue glow,
          grid radial-masked so it fades at the edges. */}
      <section className="relative overflow-hidden border-b border-ink-200 bg-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(73,165,193,0.13) 1px, transparent 1px), linear-gradient(to bottom, rgba(73,165,193,0.13) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(ellipse 80% 78% at 50% 42%, #000 46%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 78% at 50% 42%, #000 46%, transparent 100%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 -right-32 h-[640px] w-[640px] rounded-full bg-brand-500/[0.10] blur-[130px]"
        />
        <div className="relative z-10 mx-auto max-w-5xl px-6 pt-16 pb-12 sm:pt-20 sm:pb-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-600">
            Published weekly · National · Tuesdays
          </p>
          <h1 className="mt-6 text-5xl font-bold tracking-tight text-ink-900 sm:text-6xl sm:leading-[1.02]">
            The Tuesday Read.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-700">
            A free weekly publication on national pallet cost inputs. PSCI™
            value, plain-English read on what moved across the federal data,
            source citations, public-domain CSV. Published every Tuesday after
            BLS and EIA releases.
          </p>
        </div>
      </section>

      {/* THIS WEEK'S EDITION - the current issue, front and center */}
      <section className="bg-ink-50/60 border-b border-ink-200">
        <div className="mx-auto max-w-5xl px-6 py-14 sm:py-20">
          <div className="flex items-baseline justify-between gap-6 flex-wrap mb-6">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
              This week&apos;s edition · No. {CURRENT_EDITION.editionNumber}
              {EDITIONS_ARE_ILLUSTRATIVE && (
                <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] text-ink-500">
                  Illustrative sample
                </span>
              )}
            </p>
            <p className="text-xs text-ink-500 tabular-nums">
              Week ending {formatEditionDate(CURRENT_EDITION.weekEnding)}
            </p>
          </div>

          <Reveal>
          <article className="reveal-item rounded-2xl border border-ink-200 bg-white overflow-hidden" style={{ "--i": 0 } as CSSProperties}>
            {/* Edition header */}
            <div className="border-b border-ink-100 px-8 py-7 sm:px-10 sm:py-8">
              <div className="flex items-start justify-between gap-8 flex-wrap">
                <div className="flex-1 min-w-[260px]">
                  <h2 className="text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl sm:leading-[1.1]">
                    {CURRENT_EDITION.headline}
                  </h2>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">
                    {CURRENT_EDITION.psciVersion}
                  </p>
                  <p className="mt-1 text-5xl font-bold text-ink-900 tabular-nums leading-none">
                    {CURRENT_EDITION.psciValue.toFixed(2)}
                  </p>
                  <p
                    className={`mt-2 text-sm font-semibold tabular-nums ${
                      CURRENT_EDITION.wowDelta > 0
                        ? "text-brand-700"
                        : CURRENT_EDITION.wowDelta < 0
                        ? "text-ink-600"
                        : "text-ink-500"
                    }`}
                  >
                    {CURRENT_EDITION.wowDelta > 0 ? "+" : ""}
                    {CURRENT_EDITION.wowDelta.toFixed(2)}% WoW
                  </p>
                </div>
              </div>
            </div>

            {/* The read - plain-English narrative */}
            <div className="px-8 py-7 sm:px-10 sm:py-8 border-b border-ink-100">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500 mb-4">
                This week&apos;s read
              </p>
              <p className="text-base leading-relaxed text-ink-800 sm:text-lg sm:leading-[1.7]">
                {CURRENT_EDITION.read}
              </p>
            </div>

            {/* Top movers - federal source citations */}
            <div className="px-8 py-7 sm:px-10 sm:py-8 border-b border-ink-100">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500 mb-5">
                Top movers · cited
              </p>
              <ul className="space-y-4">
                {CURRENT_EDITION.topMovers.map((mover, i) => (
                  <li
                    key={mover.series}
                    className="reveal-item flex items-start gap-4 pb-4 border-b border-ink-100 last:border-0 last:pb-0"
                    style={{ "--i": i + 1 } as CSSProperties}
                  >
                    <span
                      className="reveal-pop inline-flex shrink-0"
                      style={{ "--i": i + 1 } as CSSProperties}
                    >
                      <DirectionIcon direction={mover.direction} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-4 flex-wrap">
                        <p className="text-sm font-semibold text-ink-900">
                          {mover.series}
                        </p>
                        <p className="text-sm font-semibold tabular-nums text-ink-700">
                          {mover.magnitude}
                        </p>
                      </div>
                      <p className="mt-1 text-sm text-ink-600 leading-relaxed">
                        {mover.note}
                      </p>
                      <p className="mt-1 text-[11px] font-mono uppercase tracking-wider text-ink-400">
                        Source: {mover.sourceId}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* 30-day forecast - AI Forecast Layer overlay on PSCI */}
            <div className="px-8 py-7 sm:px-10 sm:py-8 bg-brand-50/30 border-b border-ink-100">
              <div className="flex items-baseline justify-between gap-4 flex-wrap mb-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500">
                  30-day forecast · AI Forecast Layer v1.0
                </p>
                <p className="text-[11px] text-ink-500 tabular-nums">
                  Horizon: week ending{" "}
                  {formatEditionDate(CURRENT_EDITION.forecast.horizonDate)}
                </p>
              </div>

              <div className="flex items-end gap-6 flex-wrap">
                <div>
                  <p className="text-5xl font-bold text-ink-900 tabular-nums leading-none">
                    {CURRENT_EDITION.forecast.median.toFixed(2)}
                  </p>
                  <p className="mt-2 text-xs text-ink-600">
                    Projected PSCI median
                  </p>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <p className="text-sm font-semibold text-ink-800 tabular-nums">
                    {CURRENT_EDITION.forecast.ciLower.toFixed(2)} -{" "}
                    {CURRENT_EDITION.forecast.ciUpper.toFixed(2)}
                  </p>
                  <p className="mt-1 text-xs text-ink-500">
                    {CURRENT_EDITION.forecast.ciPct}% confidence band
                  </p>
                  {/* CI visualization - band fills L-to-R on scroll, median
                      settles; the numbers stay static (credibility surface). */}
                  <ForecastBand
                    lower={CURRENT_EDITION.forecast.ciLower}
                    upper={CURRENT_EDITION.forecast.ciUpper}
                  />
                </div>
              </div>

              <p className="mt-5 text-sm leading-relaxed text-ink-700">
                {CURRENT_EDITION.forecast.note}
              </p>

              <p className="mt-4 text-[11px] text-ink-500 leading-relaxed">
                Model:{" "}
                <span className="font-mono text-ink-700">
                  {CURRENT_EDITION.forecast.model}
                </span>{" "}
                (Google Research, Apache 2.0, ~200M parameters, zero-shot). Run
                via{" "}
                <span className="font-mono text-ink-700">
                  {CURRENT_EDITION.forecast.runtime}
                </span>
                . Reproducible from public federal data + pinned model
                version.
              </p>
            </div>

            {/* Carry-forward disclosure (methodology v1.4) */}
            {CURRENT_EDITION.carryForward && (
              <div className="px-8 py-6 sm:px-10 sm:py-7 bg-ink-50/40">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500 mb-2">
                  Methodology note · carry-forward
                </p>
                <p className="text-sm text-ink-700 leading-relaxed">
                  <span className="font-semibold text-ink-900">
                    {CURRENT_EDITION.carryForward.component}
                  </span>{" "}
                  ({CURRENT_EDITION.carryForward.weight} weight, source{" "}
                  <span className="font-mono text-xs">
                    {CURRENT_EDITION.carryForward.sourceId}
                  </span>
                  ) was carried forward from the prior release this week.{" "}
                  {CURRENT_EDITION.carryForward.note}
                </p>
              </div>
            )}
          </article>
          </Reveal>

          {/* Subscribe inline below the edition - context is set, ask once */}
          <div className="mt-10 flex items-center justify-between gap-6 flex-wrap">
            <p className="text-sm text-ink-700 max-w-md leading-relaxed">
              Get next Tuesday&apos;s edition in your inbox. Free, no spam, one
              email a week.
            </p>
            <a
              href="#subscribe"
              className="group inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              Subscribe to The Tuesday Read
              <ArrowRight />
            </a>
          </div>
        </div>
      </section>

      {/* INSIDE EVERY EDITION - what you get, told plainly */}
      <section className="border-b border-ink-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            Inside every edition
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            Four things, every Tuesday.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-700">
            The Tuesday Read covers the national pallet cost picture -
            current value, 30-day forecast, plain-English read, and sources.
            Per-region weighting tuned to your specific DC footprint is the
            regional read, free at /market-pulse.
          </p>

          <Reveal className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {INSIDE_EVERY_EDITION.map((item, i) => (
              <div
                key={item.label}
                className="reveal-item flex flex-col border-t-2 border-brand-500 pt-5"
                style={{ "--i": i } as CSSProperties}
              >
                <p
                  className="reveal-pop text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500 tabular-nums"
                  style={{ "--i": i } as CSSProperties}
                >
                  0{i + 1}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-ink-900">
                  {item.label}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-700">
                  {item.detail}
                </p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* RECENT EDITIONS - publication archive */}
      <section className="bg-ink-50/60 border-b border-ink-200">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            Recent editions
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            A taste of the last month.
          </h2>
          {EDITIONS_ARE_ILLUSTRATIVE && (
            <p className="mt-3 text-xs text-ink-500">
              Illustrative examples. The public PSCI™ archive begins{" "}
              {formatEditionDate(PSCI_PUBLIC_LAUNCH)}.
            </p>
          )}

          <Reveal className="mt-10 rounded-2xl border border-ink-200 bg-white overflow-hidden">
            {RECENT_EDITIONS.map((edition, i) => {
              const preLaunch = edition.weekEnding < PSCI_PUBLIC_LAUNCH;
              return (
                <article
                  key={edition.weekEnding}
                  className={`reveal-item px-8 py-6 sm:px-10 sm:py-7 transition-colors hover:bg-ink-50/70 ${
                    i !== RECENT_EDITIONS.length - 1
                      ? "border-b border-ink-100"
                      : ""
                  }`}
                  style={{ "--i": i } as CSSProperties}
                >
                  <div className="flex items-baseline justify-between gap-4 flex-wrap">
                    <p className="text-[11px] font-mono uppercase tracking-wider text-ink-500 tabular-nums">
                      {edition.weekEnding}
                    </p>
                    {preLaunch && (
                      <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                        Sample · predates launch
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-xl font-semibold text-ink-900 sm:text-2xl">
                    {edition.headline}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-700 max-w-3xl">
                    {edition.summary}
                  </p>
                </article>
              );
            })}
          </Reveal>

          <p className="mt-6 text-xs text-ink-500">
            Subscribe below for the full archive and weekly delivery.
          </p>
        </div>
      </section>

      {/* METHODOLOGY TRUST BLOCK - the receipts */}
      <section className="border-b border-ink-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
                How the math works
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl sm:leading-[1.1]">
                Every value reproduces from public federal data.
              </h2>
              <p className="mt-5 text-base leading-relaxed text-ink-700">
                PSCI™ v1.3 is a weighted geometric mean of five federal
                cost-input series, normalized so January 2024 equals 100. The
                weights are governance-locked and the formula is published.
                Anyone with the source series and the published weights gets
                the same PSCI value to the second decimal place.
              </p>
              <div className="mt-7 flex flex-wrap gap-4">
                <Link
                  href="/methodology"
                  className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
                >
                  Read the full methodology
                  <ArrowRight />
                </Link>
                <a
                  href="https://palletsolutionsusa.com/data/psci_historical.csv"
                  className="group inline-flex items-center gap-1.5 text-sm font-semibold text-ink-700 hover:text-brand-600"
                >
                  Download historical CSV (CC0)
                  <ArrowRight />
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-ink-200 bg-ink-50/60 p-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500 mb-5">
                Five federal series, published weights
              </p>
              <Reveal>
              <ul className="space-y-3">
                {PSCI_COMPONENTS.map((c, i) => (
                  <li
                    key={c.label}
                    className="reveal-item flex items-start justify-between gap-4 pb-3 border-b border-ink-200 last:border-0 last:pb-0"
                    style={{ "--i": i } as CSSProperties}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-900 leading-snug">
                        {c.label}
                      </p>
                      <p className="mt-0.5 text-[11px] font-mono uppercase tracking-wider text-ink-400">
                        {c.source}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-brand-700">
                      {c.weight}
                    </span>
                  </li>
                ))}
              </ul>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* REGIONAL-READ ASIDE - quiet, single paragraph, no salesification */}
      <section className="border-b border-ink-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="rounded-xl border border-ink-200 bg-ink-50/40 px-7 py-6 sm:px-8 sm:py-7">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div className="flex-1 min-w-[280px]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">
                  Need this weighted to your regions?
                </p>
                <p className="mt-3 text-base text-ink-800 leading-relaxed max-w-2xl">
                  The Tuesday Read is national. If you operate multi-DC and
                  want PSCI and the 30-day forecast tuned to your specific
                  regions, the per-region read is free at{" "}
                  <span className="font-semibold text-ink-900">
                    Market Pulse
                  </span>
                  . It is the same cost intelligence we bring to a managed
                  program.
                </p>
              </div>
              <Link
                href="/market-pulse"
                className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 shrink-0"
              >
                See what's moving
                <ArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SUBSCRIBE - the actual job of this page */}
      <section
        id="subscribe"
        className="relative overflow-hidden border-y-2 border-brand-500 bg-ink-900 text-white scroll-mt-20"
      >
        <DarkBarFx />
        <div className="relative z-10 mx-auto max-w-3xl px-6 py-20 sm:py-24 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-300">
            Free · Weekly · National
          </p>
          <h2 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
            Subscribe to The Tuesday Read.
          </h2>
          <p className="mt-6 text-base text-ink-300 leading-relaxed max-w-xl mx-auto">
            One email every Tuesday after BLS and EIA federal data drops.
            Plain-English read on what moved across PSCI™ cost-input series
            this week.
          </p>

          <TuesdayReadForm />

          <p className="mt-6 text-xs text-ink-400">
            No spam. Unsubscribe anytime. We never share the list.
          </p>
        </div>
      </section>
    </>
  );
}
