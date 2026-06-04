// TuesdayReportPreview - the email-style sample of the actual weekly vendor
// Tuesday Report. Three tiers, top to bottom:
//   1. National PSCI (backward-looking cost anchor, the federal composite)
//   2. 30-day forecast (forward AI overlay, national only, with CI)
//   3. Events (the corridor differentiator -- a real, dated, source-linked
//      back-issue used as the sample so the vendor sees the actual product)
//
// Extracted 2026-06-02 from VendorJourneyPrototype.tsx so the standalone
// /tuesday-report discovery page can render the SAME proof sample the
// in-flow post-claim WaitlistView renders. One component, two surfaces;
// the sample never duplicates or drifts.
//
// Honesty discipline preserved: real PSCI from props, the forecast is
// labeled a projection (not a guarantee), events are labeled "Recent
// example" / "Example edition" with verified source links, the "we don't
// manufacture news" line stays in the footer. "Yours" / "your" refer
// only to FUTURE delivery, never to the dated sample on screen.
//
// === EVENT MOVE RULE (standing - governs every event, sample AND real) ===
// Every "What it means" + "Your move" is written for an OUTSIDE vendor who is
// almost never the incumbent on the account in the event. Frame guidance as
// what the event does to his MARKET (an account going contestable, regional
// buy/sell prices softening or tightening, a demand shift he operates
// against) - NEVER as instructions for handling pallets he does not have.
// BANNED (assume he is the incumbent): "find homes for the supply", "line up
// buyers", "position to pick up [Company]'s program", "reach out to whoever
// supplies that site". Two legitimate moves: (1) Positioning - flux is a
// contact window ("if you've wanted into accounts like this, a wind-down is
// when those arrangements reopen"); (2) Pricing awareness - how the event
// shifts the regional buy/sell prices he operates against. Stay directional +
// conditional ("usually", "tends to", "if you've wanted in"); never promise
// the account, never declare the incumbent out, never fabricate a qty/date.
// Mirror of tuesday-report-events.json `_MOVE_RULE` (the real-send registry).
//
// Pure presentational -- no hooks, no event handlers, no client APIs. Left
// without a "use client" directive so it can be rendered from both a
// client tree (VendorJourneyPrototype) and a server tree (the new
// /tuesday-report page) without a wrapper.

// === Types (local mirrors of lib/psci's interfaces) ===
// The types are duplicated here rather than imported from lib/psci so this
// component remains usable in a client tree -- lib/psci does a readFileSync
// at module load and cannot be imported into a client bundle. Server pages
// that already use lib/psci pass these straight through.

export type PsciComponentMover = {
  key: string;
  label: string;
  weightPct: number;
  wowPct: number;
  stale: boolean;
};

export type PsciForecast = {
  asOf: string;
  model: string;
  confidenceLevel: number;
  horizonDays: number;
  current: number | null;
  projected: number | null;
  changePct: number | null;
};

export type TuesdayReportPreviewProps = {
  corridorLabel: string;
  // stateCode is accepted but not currently rendered -- kept in the type
  // because the in-flow WaitlistView wires it for future per-state framing.
  stateCode?: string;
  serviceRadius?: string | null;
  psciValue?: number;
  psciAsOf?: string;
  psciWowPct?: number | null;
  psciComponents?: ReadonlyArray<PsciComponentMover>;
  psciForecast?: PsciForecast | null;
};

export default function TuesdayReportPreview({
  corridorLabel,
  serviceRadius,
  psciValue,
  psciAsOf,
  psciWowPct,
  psciComponents,
  psciForecast,
}: TuesdayReportPreviewProps) {
  // Radius the high-alert watch covers - the vendor's own service area if they
  // set it during the claim, otherwise a sane default. Used to frame the local
  // tier as a coverage promise instead of a "quiet week."
  // Normalize so the sentence always reads "... within 150 miles of your yard"
  // and never "150of" / "150 of" / "150 mi" - a bare number or a "mi"
  // abbreviation gets the unit spelled out.
  const rawRadius =
    serviceRadius && serviceRadius.trim() ? serviceRadius.trim() : "100 miles";
  const radiusLabel = /mile/i.test(rawRadius)
    ? rawRadius
    : /\bmi\b/i.test(rawRadius)
      ? rawRadius.replace(/\bmi\b/i, "miles")
      : `${rawRadius.replace(/[^0-9]/g, "") || "100"} miles`;

  // National 30-day forecast - the forward overlay. Direction + magnitude come
  // from the model's OWN current -> projected move (psciForecast.changePct),
  // so the forecast never mixes baselines with the backward PSCI headline
  // above. NATIONAL ONLY: a regional composite index reopens the "region 144
  // vs national 113" base-confusion landmine, so it is intentionally absent.
  const fc = psciForecast ?? null;
  const fcChange = fc && typeof fc.changePct === "number" ? fc.changePct : null;
  const fcHasValue = fcChange !== null;
  const fcEasing = fcChange !== null && fcChange < -0.3;
  const fcClimbing = fcChange !== null && fcChange > 0.3;
  // steady = |change| <= 0.3% (neither easing nor climbing)
  const fcAbs = fcChange !== null ? Math.abs(fcChange).toFixed(1) : "";
  const fcCiPct =
    fc && typeof fc.confidenceLevel === "number"
      ? Math.round(fc.confidenceLevel * 100)
      : 80;
  const fcModel = fc?.model || "TimesFM 2.5";
  const fcHorizon = fc?.horizonDays ?? 30;
  const psciDisplay =
    typeof psciValue === "number" ? psciValue.toFixed(2) : "[pending]";
  const wowUp = typeof psciWowPct === "number" && psciWowPct > 0;
  const wowDisplay =
    typeof psciWowPct === "number"
      ? `${psciWowPct < 0 ? "↓" : "↑"}${Math.abs(psciWowPct).toFixed(2)}% vs last week`
      : "";
  const wowAbs1 =
    typeof psciWowPct === "number" ? Math.abs(psciWowPct).toFixed(1) : "";

  // Fix the doubled-word header bug ("your corridor corridor"): strip any
  // trailing "corridor" from the label, then re-append cleanly. A bare "your"
  // or empty label becomes "Your corridor"; a city becomes "Kenosha, WI
  // corridor".
  const corridorBase = (corridorLabel || "").replace(/\s*corridor\s*$/i, "").trim();
  const corridorTitle =
    !corridorBase || corridorBase.toLowerCase() === "your"
      ? "Your corridor"
      : `${corridorBase} corridor`;
  // Inline name for body sentences ("Yours covers ___").
  const corridorName =
    corridorBase && corridorBase.toLowerCase() !== "your"
      ? corridorBase
      : "your corridor";

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-lg shadow-ink-900/10">
      {/* Masthead */}
      <div className="bg-ink-900 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-300">
              The Tuesday Report
            </p>
            <p className="mt-1 text-base font-bold leading-tight text-white">
              {corridorTitle}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-400">
              Week of {psciAsOf || "this Tuesday"}
            </p>
          </div>
          <span className="shrink-0 rounded bg-brand-300 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-ink-900">
            Your area
          </span>
        </div>
      </div>

      {/* 1. CORRIDOR ONE-LINER - plain regional cost read, no methodology. The
          real per-vendor edition fills psciWowPct from atlas_pspi_cache for the
          vendor's region; the sample uses what it's given. */}
      <section className="border-b border-ink-100 px-5 py-3">
        <p className="text-sm leading-relaxed text-ink-800">
          <span className="font-semibold">Your corridor this week:</span>{" "}
          {wowDisplay
            ? wowUp
              ? `costs ticked up ~${wowAbs1}% - some upward pressure on new-pallet inputs.`
              : `costs eased ~${wowAbs1}% - pressure coming off new-pallet inputs.`
            : "your cost read lands here after the federal data drops."}
        </p>
      </section>

      {/* 2. LOCAL EVENTS - THE PRODUCT. Leads, biggest. Each event: title,
          source link (NO LINK NO ITEM), WHAT IT MEANS, and YOUR MOVE (operator
          actions). Honesty: name the real company/account, never a fabricated
          individual contact; supply signals are directional, never an invented
          quantity. Shown here as a real dated Dallas-Fort Worth back-issue so
          the vendor sees the actual product; the live per-vendor edition pulls
          events within ~150mi of the vendor's own yard. */}
      <section className="bg-brand-50/40 px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-700">
            Local events · {corridorName}
          </span>
          <span className="rounded bg-brand-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-brand-700">
            Every Tuesday
          </span>
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-700">
          New DCs, closures, and competitor moves within {radiusLabel} of your
          yard. Here&apos;s a real edition from another market so you see exactly
          what lands:
        </p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-500">
            Example · Dallas-Fort Worth · week of Apr 27, 2026
          </span>
          <span className="rounded bg-ink-200 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-ink-600">
            Real back-issue
          </span>
        </div>

        {/* Event 1 - Reyes/RNDC Grand Prairie WARN (beverage distribution). */}
        <div className="mt-3 rounded-lg border border-ink-200 bg-white px-3.5 py-3">
          <p className="text-[15px] font-bold leading-snug text-ink-900">
            Reyes/RNDC winding down Grand Prairie beverage distribution - 689
            positions
          </p>
          <p className="mt-1 text-[11px] text-ink-500">
            WARN filed Apr 23, 2026 · Grand Prairie, TX ·{" "}
            <a
              href="https://www.twc.texas.gov/data-reports/warn-notice"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand-700 underline underline-offset-2"
            >
              Source: Texas WARN filing
            </a>
          </p>
          <div className="mt-2 rounded border-l-[3px] border-ink-300 bg-ink-50/70 px-3 py-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
              What it means
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-800">
              A beverage distribution site this size winding down puts a sizable
              pallet arrangement in the metro into flux, and tends to work used
              pallets and cores back into the regional market as it ramps down.
            </p>
          </div>
          <div className="mt-2 rounded border-l-[3px] border-brand-500 bg-brand-50 px-3 py-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-700">
              Your move
            </p>
            <ul className="mt-1 space-y-1 text-xs font-semibold leading-snug text-ink-900">
              <li>
                · An account that was locked is entering the window where supply
                arrangements get rebid. If beverage and distribution accounts in
                this metro are ones you want, this is the moment to get a name in
                front of the right people.
              </li>
              <li>
                · Regional core and used-pallet buy prices tend to ease as that
                volume works through - worth factoring into what you pay over the
                next few weeks.
              </li>
            </ul>
          </div>
        </div>

        {/* Event 2 - FreshRealm Lancaster WARN (food production). */}
        <div className="mt-2.5 rounded-lg border border-ink-200 bg-white px-3.5 py-3">
          <p className="text-[15px] font-bold leading-snug text-ink-900">
            FreshRealm cutting 176 at its Lancaster food-production site
          </p>
          <p className="mt-1 text-[11px] text-ink-500">
            WARN filed Apr 27, 2026 · Lancaster, TX ·{" "}
            <a
              href="https://www.twc.texas.gov/data-reports/warn-notice"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand-700 underline underline-offset-2"
            >
              Source: Texas WARN filing
            </a>
          </p>
          <div className="mt-2 rounded border-l-[3px] border-ink-300 bg-ink-50/70 px-3 py-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
              What it means
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-800">
              A food-production site cutting volume usually shrinks or reopens its
              pallet program and adds some used-pallet supply locally as it winds
              down - both nudge the regional market.
            </p>
          </div>
          <div className="mt-2 rounded border-l-[3px] border-brand-500 bg-brand-50 px-3 py-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-700">
              Your move
            </p>
            <ul className="mt-1 space-y-1 text-xs font-semibold leading-snug text-ink-900">
              <li>
                · If food-production accounts in this metro are a segment you
                want, a volume cut like this is when those programs tend to
                reopen - a reason to make contact now.
              </li>
              <li>
                · Used-pallet supply tends to loosen locally as a site like this
                winds down, which can soften buy prices - worth knowing when
                you&apos;re quoting cores right now.
              </li>
            </ul>
          </div>
        </div>

        {/* Quiet category - the honesty mechanic, not an apology. */}
        <p className="mt-2.5 text-[11px] italic leading-relaxed text-ink-500">
          Expansions: quiet in the corridor that week. We don&apos;t manufacture
          news to fill space - a quiet category says quiet.
        </p>

        <p className="mt-3 border-t border-brand-100 pt-3 text-[11px] leading-relaxed text-ink-700">
          That is one real back-issue from another market. Yours covers{" "}
          {corridorName} - in your inbox every Tuesday.
        </p>
      </section>

      {/* 3. 30-DAY OUTLOOK - short. One line + a one-line read; methodology
          collapsed to a link. */}
      <section className="border-t border-ink-100 px-5 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-600">
            30-day outlook
          </span>
          <span className="rounded bg-brand-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-brand-700">
            AI forecast
          </span>
        </div>
        {fcHasValue ? (
          <>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-800">
              <span
                className={`font-bold ${
                  fcEasing
                    ? "text-emerald-600"
                    : fcClimbing
                      ? "text-red-600"
                      : "text-ink-700"
                }`}
              >
                {fcEasing ? "↓ Easing" : fcClimbing ? "↑ Climbing" : "→ Steady"}
              </span>{" "}
              {fcEasing
                ? `~${fcAbs}% over ${fcHorizon} days - new-pallet cost pressure is coming off; the market is softening, not tightening.`
                : fcClimbing
                  ? `~${fcAbs}% over ${fcHorizon} days - new-pallet, lumber, and freight inputs are firming up into the month ahead.`
                  : `holding roughly flat over the next ${fcHorizon} days - no real cost pressure either way.`}
            </p>
            <p className="mt-1 text-[10px] text-ink-400">
              Model projection, not a guarantee.{" "}
              <a
                href="https://palletsolutionsusa.com/methodology"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand-600 underline underline-offset-2"
              >
                How it works
              </a>
            </p>
          </>
        ) : (
          <p className="mt-1.5 text-[11px] leading-relaxed text-ink-500">
            A 30-day cost outlook lands here every week - which way pallet inputs
            are headed, and the move to make before they get there.
          </p>
        )}
      </section>

      {/* 4. NATIONAL PSCI - demoted to a small context strip at the bottom. It
          is free on the public site, so it is reference, not the headline. */}
      <section className="border-t border-ink-100 bg-ink-50/60 px-5 py-2.5">
        <p className="text-[11px] leading-relaxed text-ink-500">
          <span className="font-semibold text-ink-600">National context:</span>{" "}
          PSCI&trade; {psciDisplay}
          {wowDisplay ? ` (${wowDisplay})` : ""} - the federal cost index behind
          the read above. Free to check any time on the public PSCI&trade; page.
        </p>
      </section>

      {/* Honesty footer - what's live, what's a projection, what's verified. */}
      <div className="border-t border-ink-100 bg-ink-50/70 px-5 py-3">
        <p className="text-[10px] italic leading-relaxed text-ink-500">
          National PSCI&trade; is this week&apos;s live federal value; the 30-day
          outlook is a model projection, labeled as such. Events are verified and
          source-linked before they publish. We don&apos;t manufacture news;
          quiet weeks we say so.
        </p>
      </div>
    </div>
  );
}
