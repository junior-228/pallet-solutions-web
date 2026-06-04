"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import type { SampleRegion } from "./AtlasInteractive";
import AtlasRegionsMap from "./AtlasRegionsMap";
import RegionalReport, {
  type ReportComponentRow,
} from "./RegionalReport";
import type { MarketPulseEvent, HousingTrend } from "@/lib/marketPulseEvents";
import { submitWebLead } from "@/lib/submitLead";

// RegionalRead - the on-demand benchmark shell on /market-pulse
// (2026-06-04 map-first, multi-region rewrite). The page opens with ONE job:
// get the buyer to select where they operate on the US map. No ZIP box.
//
// MULTI-REGION: a buyer clicks every region their DCs sit in - each one
// highlights on the map and gets a tab above the report. The report shows the
// region they most recently clicked; the other selected regions sit as tabs on
// top of the card so they can switch between them (or remove one).
//
// PHASED ANIMATION: on the FIRST selection the map collapses (shrinks and
// slides left) and THEN the report opens up beside it - a two-step reveal, not
// a simultaneous one. Adding/switching regions afterward does not re-collapse.
//
// HONESTY: every number is a prop from lib/psci JSON. No regional weekly send
// exists yet, so the opt-in (which appears only after a region is selected)
// captures email + the selected regions for the future regional edition and
// uses soft, forward-looking copy only - it never claims an email goes out today.

// HARD SEQUENCING GATE (Addendum 5): Beat 2's weekly-arrival promise copy
// ("in your inbox Tuesday" / "first edition lands next Tuesday") may only show
// once the per-region weekly SEND is wired and scheduled. As of 2026-06-04 the
// only automated send is the NATIONAL Tuesday Read - there is NO per-region
// send - so this stays false and the honest capture-only copy renders instead.
const REGIONAL_SEND_LIVE = false;

// Phase 1 (map collapse) runs, then phase 2 (report opens) starts after this.
const COLLAPSE_MS = 480;

type Props = {
  regions: SampleRegion[];
  nationalPsci: number;
  nationalWowPct: number | null;
  forecastPct: number | null;
  asOfLabel: string;
  componentRows: ReportComponentRow[];
  eventsByRegion: Record<string, MarketPulseEvent[]>;
  housing: HousingTrend;
};

type OptInStatus = "idle" | "loading" | "success" | "error";
type Phase = "closed" | "collapsing" | "open";

export default function RegionalRead({
  regions,
  nationalPsci,
  nationalWowPct,
  forecastPct,
  asOfLabel,
  componentRows,
  eventsByRegion,
  housing,
}: Props) {
  const list = regions.length > 0 ? regions : [];

  // Multi-region selection. `selected` keeps click order; `active` is the one
  // currently shown in the report. Nothing is selected on first paint.
  const [selected, setSelected] = useState<string[]>([]);
  const [active, setActive] = useState<string>("");
  const [phase, setPhase] = useState<Phase>("closed");

  const activeRegion = list.find((r) => r.slug === active);
  const selectedRegions = selected
    .map((s) => list.find((r) => r.slug === s))
    .filter((r): r is SampleRegion => Boolean(r));
  const multi = selected.length > 1;
  const regionLabel = multi ? "selected regions" : activeRegion?.name ?? "region";

  // Email opt-in state (capture only - no send today)
  const [optEmail, setOptEmail] = useState("");
  const [optStatus, setOptStatus] = useState<OptInStatus>("idle");
  const [optError, setOptError] = useState<string | null>(null);

  function handleRegionClick(s: string) {
    // Re-clicking a region that is already selected deselects it.
    if (selected.includes(s)) {
      removeRegion(s);
      return;
    }
    setSelected((prev) => [...prev, s]);
    setActive(s);
    if (phase === "closed") {
      // Phase 1: collapse the map. Phase 2: open the report after it settles.
      // Guarded so a deselect-to-empty during the collapse cancels the open.
      setPhase("collapsing");
      window.setTimeout(
        () => setPhase((p) => (p === "collapsing" ? "open" : p)),
        COLLAPSE_MS
      );
    }
  }

  function removeRegion(s: string) {
    const next = selected.filter((x) => x !== s);
    setSelected(next);
    if (next.length === 0) {
      setActive("");
      setPhase("closed");
    } else if (active === s) {
      setActive(next[next.length - 1]);
    }
  }

  async function submitOptIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeRegion) return;
    const email = optEmail.trim();
    if (!email || !email.includes("@") || !email.includes(".")) {
      setOptStatus("error");
      setOptError("Please enter a valid email address.");
      return;
    }
    setOptStatus("loading");
    setOptError(null);
    // Capture email + ALL selected regions TOGETHER so a region-specific send
    // is possible later without re-deriving anyone's footprint. Lands in
    // web_leads via the existing market-pulse-waitlist form type.
    const res = await submitWebLead({
      form_type: "market-pulse-waitlist",
      email,
      zip: null,
      region: selectedRegions.map((r) => r.name).join(", ") || activeRegion.name,
      region_slug: activeRegion.slug,
      source_page: "market-pulse-regional",
    });
    if (res.ok) {
      setOptStatus("success");
    } else {
      setOptStatus("error");
      setOptError(res.error || "Something went wrong. Please try again.");
    }
  }

  const isOpen = phase === "open";
  const wsClass =
    phase === "open"
      ? "mp-ws is-open"
      : phase === "collapsing"
      ? "mp-ws is-collapsing"
      : "mp-ws";

  return (
    <div className="mt-10">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #market-pulse-report, #market-pulse-report * { visibility: visible !important; }
          #market-pulse-report { position: absolute; left: 0; top: 0; width: 100%; border: none !important; }
          .mp-noprint { display: none !important; }
        }
        @keyframes mpReveal {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: none; }
        }
        .mp-reveal { animation: mpReveal .42s cubic-bezier(.22,1,.36,1) both; }
        /* Map sizing - phase 1 (collapsing) shrinks it and slides it left;
           the report column opens in phase 2 (is-open). */
        .mp-mapcap {
          max-width: 640px; margin-left: auto; margin-right: auto;
          transition: max-width .5s cubic-bezier(.22,1,.36,1),
                      margin .5s cubic-bezier(.22,1,.36,1);
        }
        .mp-ws.is-collapsing .mp-mapcap,
        .mp-ws.is-open .mp-mapcap {
          max-width: 440px; margin-left: 0; margin-right: auto;
        }
        /* Mobile: single column, DOM order = map+download, report, managed card. */
        .mp-ws { display: flex; flex-direction: column; gap: 1.25rem; }
        @media (min-width: 1024px) {
          .mp-ws {
            display: grid; grid-template-columns: 1fr 0fr; gap: 0; align-items: start;
            transition: grid-template-columns .55s cubic-bezier(.22,1,.36,1),
                        gap .55s cubic-bezier(.22,1,.36,1);
          }
          .mp-ws.is-open { grid-template-columns: 0.82fr 1.18fr; gap: 2rem; }
        }
      `}</style>

      <div className={wsClass}>
        {/* LEFT - the map is the selector (not printed) */}
        <div
          className={`mp-left mp-noprint${
            isOpen ? " lg:sticky lg:top-24" : ""
          }`}
        >
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500">
            {selected.length > 0
              ? "Your selected regions, on the map"
              : "Select where you operate"}
          </p>

          <div className="mp-mapcap">
            <AtlasRegionsMap
              selectedRegions={selected}
              viewingRegion={active}
              onRegionClick={handleRegionClick}
            />
          </div>

          {selected.length === 0 ? (
            <p className="mt-4 text-center text-sm font-medium text-brand-600 lg:text-base">
              Click your region on the map to see this week&apos;s read. Add as
              many as you operate in.
            </p>
          ) : (
            <>
              <p className="mt-3 text-xs text-ink-500">
                Click more regions to add them. Switch between them with the tabs
                above the report.
              </p>
              {/* Download - primary on-demand action, near the report */}
              <div className="mt-5 border-t border-ink-100 pt-4">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-md border border-ink-300 bg-white px-5 py-2.5 text-sm font-semibold text-ink-800 hover:border-brand-400 hover:text-brand-700 transition-colors"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 9V2h12v7" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <path d="M6 14h12v8H6z" />
                  </svg>
                  Download this week&apos;s report
                </button>
                <p className="mt-2 text-xs text-ink-500">
                  One page. Forward it to finance. No email required.
                </p>
              </div>
            </>
          )}
        </div>

        {/* RIGHT - region tabs on top of the edition report card. Rendered in
            phase 2 (after the map has collapsed) so the report "opens up". */}
        <div className="mp-right min-w-0">
          {isOpen && activeRegion && (
            <>
              {/* Tabs - one per selected region, active highlighted, x removes */}
              <div className="mp-noprint mb-3 flex flex-wrap items-center gap-2">
                {selectedRegions.map((r) => {
                  const tabActive = r.slug === active;
                  return (
                    <span
                      key={r.slug}
                      className={`inline-flex items-center overflow-hidden rounded-full border text-sm font-semibold transition-colors ${
                        tabActive
                          ? "border-ink-900 bg-ink-900 text-white"
                          : "border-ink-300 bg-white text-ink-700 hover:border-brand-400 hover:text-brand-700"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setActive(r.slug)}
                        className="py-1.5 pl-4 pr-2"
                      >
                        {r.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRegion(r.slug)}
                        aria-label={`Remove ${r.name}`}
                        className={`flex h-full items-center pr-3 pl-1 text-base leading-none ${
                          tabActive
                            ? "text-white/70 hover:text-white"
                            : "text-ink-400 hover:text-ink-700"
                        }`}
                      >
                        &times;
                      </button>
                    </span>
                  );
                })}
              </div>

              {/* key={active} so switching tabs gives a quick re-reveal */}
              <div key={active} className="mp-reveal">
                <RegionalReport
                  region={activeRegion}
                  nationalPsci={nationalPsci}
                  nationalWowPct={nationalWowPct}
                  forecastPct={forecastPct}
                  asOf={asOfLabel}
                  componentRows={componentRows}
                  events={eventsByRegion[activeRegion.slug] ?? []}
                  housing={housing}
                />
              </div>
            </>
          )}
        </div>

      </div>

      {/* Managed card - full-width band between the report and the signup
          (item 5). The left tools column stays short; the white space below
          the map and download is intentionally left empty. Same copy, no
          pricing. */}
      {isOpen && (
        <div className="mp-noprint mt-8 rounded-2xl border-t-4 border-brand-500 bg-ink-900 p-8 text-white">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-300">
                The read behind a program
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                This is the cost data every quote is read against.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">
                When we run your pallet program, you see this read every week -
                the same one, your region, alongside every quote.
              </p>
            </div>
            <Link
              href="/sourcing"
              className="group inline-flex w-fit shrink-0 items-center gap-2 rounded-md bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
            >
              See how managed programs work
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      )}

      {/* Email opt-in - SECONDARY, appears only after the report opens (so they
          have seen the value first). The weekly-arrival PROMISE only renders
          when REGIONAL_SEND_LIVE is true (the per-region send is not built
          yet); otherwise honest capture-only copy renders. Not printed. */}
      {isOpen && activeRegion && (
        <div className="mp-noprint mt-8 rounded-2xl border border-ink-200 bg-white p-6 sm:p-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            Your {multi ? "regions" : "region"}, every week
          </p>
          {optStatus === "success" ? (
            <div className="mt-2">
              <p className="text-lg font-semibold text-ink-900">
                You are on the list.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                {REGIONAL_SEND_LIVE
                  ? `Your first edition lands next Tuesday. Unsubscribe anytime.`
                  : `We saved your ${regionLabel} read. As the weekly regional send rolls out, yours is among the first. Unsubscribe anytime.`}
              </p>
            </div>
          ) : (
            <>
              <h2 className="mt-2 text-lg font-semibold text-ink-900">
                Get your {multi ? "regions'" : "region's"} read every week.
              </h2>
              {REGIONAL_SEND_LIVE ? (
                <>
                  <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-600">
                    You can pull this up whenever finance asks. Subscribing means
                    you already know - the week diesel jumps or a mill closes near
                    your DCs, it&apos;s in your inbox Tuesday, your{" "}
                    {multi ? "regions" : "region"}, before a vendor brings it up.
                    We watch the federal data so you don&apos;t have to.
                  </p>
                  <p className="mt-2 text-sm font-medium text-ink-700">
                    Your first edition lands next Tuesday.
                  </p>
                  <p className="mt-1 text-xs text-ink-500">
                    Free, unsubscribe anytime.
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-600">
                    You can pull this up whenever finance asks - free, no signup.
                    Leave your email and we will save your {regionLabel} read; as
                    the weekly regional send rolls out, yours is among the first.
                  </p>
                  <p className="mt-2 text-xs text-ink-500">
                    Free, unsubscribe anytime.
                  </p>
                </>
              )}
              <form
                onSubmit={submitOptIn}
                noValidate
                className="mt-4 flex flex-col gap-2 sm:flex-row sm:max-w-md"
              >
                <label htmlFor="mp-optin-email" className="sr-only">
                  Email address
                </label>
                <input
                  type="email"
                  id="mp-optin-email"
                  required
                  value={optEmail}
                  onChange={(e) => {
                    setOptEmail(e.target.value);
                    if (optStatus === "error") {
                      setOptStatus("idle");
                      setOptError(null);
                    }
                  }}
                  placeholder="you@company.com"
                  disabled={optStatus === "loading"}
                  className="flex-1 rounded-md border border-ink-300 bg-white px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-brand-400 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={optStatus === "loading"}
                  className="rounded-md bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-60"
                >
                  {optStatus === "loading"
                    ? "Saving..."
                    : REGIONAL_SEND_LIVE
                    ? "Send me my read"
                    : "Save my regions"}
                </button>
              </form>
              {optStatus === "error" && optError && (
                <p role="alert" className="mt-2 text-xs font-medium text-red-700">
                  {optError}
                </p>
              )}
            </>
          )}
        </div>
      )}

    </div>
  );
}
