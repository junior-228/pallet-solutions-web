import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "PSCI Methodology v1.4 | Pallet Solutions",
  description:
    "Public methodology of the Pallet Solutions Cost Index (PSCI v1.4) - national composition, regional composition, calculation, source licensing, AI Forecast Layer governance, and audit-defensible recommended use. All values reproducible from public federal data.",
};

// ---------------------------------------------------------------------------
// Methodology page -single long page, sticky ToC, procurement audit focus.
//
// Content anchored to Netlify production (landing-overhaul-methodology-
// preview.html) so language stays consistent. v1.4 formalizes the regional
// calculation method that Market Pulse already runs (per CLAUDE.md PSCI regional
// calculation subsection, 2026-05-19 entry).
// ---------------------------------------------------------------------------

const VERSION = "PSCI v1.4";
const LAST_MODIFIED = "2026-05-20";
const FIRST_PUBLISHED = "2026-04-30";

const TOC = [
  { id: "purpose", label: "Purpose & posture" },
  { id: "only-claim", label: "The four-qualifier disclosure" },
  { id: "licensing", label: "Source licensing" },
  { id: "psci-national", label: "PSCI v1.4 - national composition" },
  { id: "psci-calc", label: "PSCI calculation" },
  { id: "psci-regional", label: "PSCI v1.4 - regional composition" },
  { id: "publication", label: "Publication discipline" },
  { id: "carry-forward", label: "Carry-forward + outage" },
  { id: "restatement", label: "Restatement protocol" },
  { id: "forecast-layer", label: "AI Forecast Layer overlay" },
  { id: "use-cases", label: "Recommended use & anti-use" },
  { id: "validation", label: "Validation & first-mover" },
  { id: "release-calendar", label: "Release calendar & footer" },
  { id: "appendix", label: "Appendix: PSPI" },
];

const PSCI_COMPONENTS = [
  {
    component: "Wood Pallet PPI",
    detail: "Direct producer-price index for wood pallets and pallet containers.",
    series: "PCU321920321920",
    publisher: "BLS",
    license: "Public domain",
    weight: "40%",
  },
  {
    component: "Softwood Lumber PPI",
    detail: "Primary raw material cost. Captures upstream wood movement.",
    series: "WPU0811",
    publisher: "BLS",
    license: "Public domain",
    weight: "20%",
  },
  {
    component: "Diesel (US weekly retail)",
    detail:
      "Freight cost-input. Affects inbound lumber and outbound delivery. Headline PSCI uses the EIA national US weekly retail diesel average; regional PSCI uses the per-PADD breakdown (see §06).",
    series: "EPD2D NUS (weekly)",
    publisher: "EIA",
    license: "Public domain",
    weight: "20%",
  },
  {
    component: "Warehouse Worker Earnings",
    detail: "Labor cost component for pallet manufacturing and recycling.",
    series: "CES4349300008",
    publisher: "BLS",
    license: "Public domain",
    weight: "15%",
  },
  {
    component: "Paper Containers PPI (OCC proxy)",
    detail:
      "Old corrugated container price proxy for hybrid pallet-and-packaging procurement.",
    series: "WPU09150301",
    publisher: "BLS",
    license: "Public domain",
    weight: "5%",
  },
];

const PSCI_REGIONS = [
  {
    region: "Northeast",
    diesel: "PADD 1B (Central Atlantic) diesel",
    wages: "National (CES4349300008)",
    other: "National Wood Pallet PPI, Softwood Lumber PPI, OCC proxy",
  },
  {
    region: "Southeast",
    diesel: "PADD 1C (Lower Atlantic) diesel",
    wages: "National (CES4349300008)",
    other: "National Wood Pallet PPI, Softwood Lumber PPI, OCC proxy",
  },
  {
    region: "Great Lakes",
    diesel: "PADD 2 (Midwest) diesel",
    wages: "National (CES4349300008)",
    other: "National Wood Pallet PPI, Softwood Lumber PPI, OCC proxy",
  },
  {
    region: "Texas + South Central",
    diesel: "PADD 3 (Gulf Coast) diesel",
    wages: "National (CES4349300008)",
    other: "National Wood Pallet PPI, Softwood Lumber PPI, OCC proxy",
  },
  {
    region: "Plains + Mountain",
    diesel: "PADD 4 (Rocky Mountain) diesel",
    wages: "National (CES4349300008)",
    other: "National Wood Pallet PPI, Softwood Lumber PPI, OCC proxy",
  },
  {
    region: "West Coast (CA + PNW)",
    diesel: "PADD 5 (West Coast) diesel",
    wages: "National (CES4349300008)",
    other: "National Wood Pallet PPI, Softwood Lumber PPI, OCC proxy",
  },
];

const ONLY_QUALIFIERS = [
  {
    label: "Publicly available",
    detail:
      "PSCI value, components, weights, methodology, and historical series are public. No paywall, no NDA. Compare against subscription-only benchmarks (Fastmarkets RISI, Argus, Pallet Profile Weekly).",
  },
  {
    label: "Pallet cost-input composite",
    detail:
      "Composite of five federal series specifically chosen to track upstream pallet manufacturer cost basis. Compare against single-component series (Random Lengths lumber, EIA diesel alone) which cover one input.",
  },
  {
    label: "Individual region level",
    detail:
      "PSCI v1.4 publishes values at six US regions using PADD-aligned diesel, each region rebased to Jan-2024 = 100. Compare against national-only indices and against single-corridor regional reads. (Per-region wages and a California / Pacific Northwest split are roadmap.)",
  },
  {
    label: "Intelligence layer, not raw data",
    detail:
      "Plain-English read, source citations, carry-forward disclosure, AI forecast overlay - the published product is interpretation plus reproducibility, not just numbers in a CSV.",
  },
];

function formatDate(isoDate: string): string {
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

function SectionNum({ n }: { n: string }) {
  return (
    <span className="inline-block mr-3 text-[11px] font-mono uppercase tracking-wider text-brand-600 tabular-nums align-middle">
      §{n}
    </span>
  );
}

export default function MethodologyPage() {
  return (
    <>
      {/* MASTHEAD */}
      <section className="border-b border-ink-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 pt-16 pb-12 sm:pt-20 sm:pb-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-600">
            Public methodology · {VERSION}
          </p>
          <h1 className="mt-6 text-5xl font-bold tracking-tight text-ink-900 sm:text-6xl sm:leading-[1.02]">
            PSCI™ methodology.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-ink-700">
            Composition, calculation, source licensing, regional methodology,
            and AI Forecast Layer governance. All values reproducible from
            public federal data by anyone who reads this document.
          </p>

          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2 text-xs text-ink-500">
            <span>
              Version{" "}
              <span className="font-mono text-ink-700">{VERSION}</span>
            </span>
            <span>
              First published{" "}
              <span className="font-mono text-ink-700">
                {formatDate(FIRST_PUBLISHED)}
              </span>
            </span>
            <span>
              Last modified{" "}
              <span className="font-mono text-ink-700">
                {formatDate(LAST_MODIFIED)}
              </span>
            </span>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="https://palletsolutionsusa.com/data/psci_historical.csv"
              className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              Download historical CSV (CC0)
            </a>
            <a
              href="https://palletsolutionsusa.com/psci-methodology-brief-v1.3.html"
              className="inline-flex items-center gap-2 rounded-full border border-ink-200 px-5 py-2.5 text-sm font-semibold text-ink-700 hover:border-brand-400 hover:text-brand-700 transition-colors"
            >
              Download methodology brief (PDF)
            </a>
          </div>
        </div>
      </section>

      {/* CONTENT WITH STICKY TOC */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
          <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-14">
            {/* Sticky ToC (desktop) / inline (mobile) */}
            <nav
              aria-label="Table of contents"
              className="lg:sticky lg:top-8 lg:self-start mb-12 lg:mb-0"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500 mb-4">
                Contents
              </p>
              <ol className="space-y-1.5 text-sm">
                {TOC.map((item, i) => (
                  <li key={item.id} className="leading-snug">
                    <a
                      href={`#${item.id}`}
                      className="group flex gap-2 text-ink-700 hover:text-brand-700 transition-colors"
                    >
                      <span className="font-mono text-[11px] text-ink-400 tabular-nums shrink-0 mt-0.5">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>{item.label}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            {/* Sections */}
            <div className="max-w-3xl space-y-20">
              {/* §01 PURPOSE & POSTURE */}
              <section id="purpose" className="scroll-mt-8">
                <h2 className="text-3xl font-semibold tracking-tight text-ink-900">
                  <SectionNum n="01" />
                  Purpose &amp; posture
                </h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-ink-800">
                  <p>
                    This document specifies the methodology, composition,
                    calculation, source licensing, and governance of the{" "}
                    <strong>Pallet Solutions Cost Index™ (PSCI)</strong>, a
                    weekly composite of cost-input variables that drive pallet
                    pricing. The PSPI demand-pressure index methodology lives
                    in the appendix at the end of this document.
                  </p>
                  <p>
                    PSCI is a <strong>reference index</strong>. It is not an
                    investment product, not a contract, and not a financial
                    benchmark regulated by IOSCO. Pallet Solutions is the
                    publisher; the underlying federal data is in the public
                    domain. Any party may construct an equivalent index using
                    the same public sources - we disclose the formula and the
                    source licensing so any user may reproduce or audit our
                    calculation.
                  </p>
                  <p>
                    Production code paths fetch directly from BLS, EIA, and
                    Census public APIs (
                    <code className="font-mono text-sm text-ink-700">
                      api.bls.gov
                    </code>
                    ,{" "}
                    <code className="font-mono text-sm text-ink-700">
                      api.eia.gov
                    </code>
                    ,{" "}
                    <code className="font-mono text-sm text-ink-700">
                      api.census.gov
                    </code>
                    ). FRED is research-only and never appears in production
                    calculations or citations.
                  </p>
                </div>
              </section>

              {/* §02 FOUR-QUALIFIER ONLY CLAIM */}
              <section id="only-claim" className="scroll-mt-8">
                <h2 className="text-3xl font-semibold tracking-tight text-ink-900">
                  <SectionNum n="02" />
                  The four-qualifier disclosure
                </h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-ink-800">
                  <p>
                    Pallet Solutions describes PSCI as{" "}
                    <em>
                      &ldquo;the only publicly-available pallet cost-input
                      intelligence published at the individual region
                      level.&rdquo;
                    </em>{" "}
                    That claim depends on four qualifiers, all of which must
                    hold for the claim to be defensible. We list each qualifier
                    and the comparison it survives:
                  </p>
                </div>
                <ol className="mt-6 space-y-4">
                  {ONLY_QUALIFIERS.map((q, i) => (
                    <li
                      key={q.label}
                      className="rounded-lg border border-ink-200 bg-ink-50/40 p-5"
                    >
                      <p className="text-[11px] font-mono uppercase tracking-wider text-brand-600 tabular-nums">
                        Qualifier {String(i + 1).padStart(2, "0")}
                      </p>
                      <p className="mt-2 text-base font-semibold text-ink-900">
                        {q.label}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-ink-700">
                        {q.detail}
                      </p>
                    </li>
                  ))}
                </ol>
                <p className="mt-6 text-sm leading-relaxed text-ink-700">
                  A reader who finds an alternative source that satisfies all
                  four qualifiers simultaneously has found a counter-example
                  and should email{" "}
                  <a
                    href="mailto:info@palletsolutionsusa.com"
                    className="text-brand-700 hover:text-brand-800 font-medium"
                  >
                    info@palletsolutionsusa.com
                  </a>
                  . Pallet Solutions will publish the correction in the next
                  methodology revision.
                </p>
              </section>

              {/* §03 LICENSING */}
              <section id="licensing" className="scroll-mt-8">
                <h2 className="text-3xl font-semibold tracking-tight text-ink-900">
                  <SectionNum n="03" />
                  Source licensing posture
                </h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-ink-800">
                  <p>
                    Procurement audiences and competitors will examine our
                    sources. We make our licensing posture explicit upfront.
                  </p>
                  <h3 className="mt-6 text-lg font-semibold text-ink-900">
                    Public-domain federal data
                  </h3>
                  <p>
                    All five PSCI components are sourced directly from US
                    federal agencies (BLS, EIA). These are public-domain
                    datasets. Pallet Solutions ingests, transforms, and
                    republishes these data in derivative composite form with
                    full source attribution. No license fees apply. No
                    third-party permission is required. Citation includes the
                    agency name and series identifier on every published value.
                  </p>
                  <h3 className="mt-6 text-lg font-semibold text-ink-900">
                    Licensed third-party sources (cite-and-link only)
                  </h3>
                  <p>
                    Several authoritative industry sources are referenced by
                    name in this methodology -DAT, Cass, ATA, ISM, Random
                    Lengths, Fastmarkets RISI, CBRE, JLL, Cushman, Bloomberg.
                    Pallet Solutions does <strong>not</strong> ingest, store,
                    redistribute, or recreate the data series of any of these
                    sources. Where we mention them, we link to their free
                    public-facing pages and identify them as the source for
                    buyers seeking that specific data.
                  </p>
                  <div className="mt-5 rounded-lg border-l-2 border-brand-500 bg-brand-50/40 px-5 py-4">
                    <p className="text-sm leading-relaxed text-ink-800">
                      <span className="font-semibold text-ink-900">
                        Why this matters:
                      </span>{" "}
                      publishing reference indices on copyrighted data series
                      we don&apos;t license would expose them to
                      misappropriation claims. By building exclusively on
                      public-domain federal data, the PS indices are legally
                      defensible by anyone who reads this document.
                    </p>
                  </div>
                </div>
              </section>

              {/* §04 PSCI NATIONAL COMPOSITION */}
              <section id="psci-national" className="scroll-mt-8">
                <h2 className="text-3xl font-semibold tracking-tight text-ink-900">
                  <SectionNum n="04" />
                  PSCI v1.4 - national composition
                </h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-ink-800">
                  <p>
                    PSCI measures the weighted movement of cost inputs that
                    determine pallet manufacturer prices. A 1% increase in
                    PSCI corresponds to approximately 1% upward pressure on
                    pallet prices, holding other variables constant.
                  </p>
                </div>
                <div className="mt-7 overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b-2 border-ink-300">
                        <th className="text-left py-3 pr-4 font-semibold text-ink-900">
                          Component
                        </th>
                        <th className="text-left py-3 pr-4 font-semibold text-ink-900">
                          Series
                        </th>
                        <th className="text-left py-3 pr-4 font-semibold text-ink-900">
                          Publisher
                        </th>
                        <th className="text-right py-3 font-semibold text-ink-900">
                          Weight
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {PSCI_COMPONENTS.map((c) => (
                        <tr key={c.series} className="border-b border-ink-100">
                          <td className="py-4 pr-4 align-top">
                            <p className="font-semibold text-ink-900">
                              {c.component}
                            </p>
                            <p className="mt-1 text-xs text-ink-600 leading-relaxed">
                              {c.detail}
                            </p>
                          </td>
                          <td className="py-4 pr-4 align-top font-mono text-xs text-ink-700">
                            {c.series}
                          </td>
                          <td className="py-4 pr-4 align-top text-xs text-ink-700">
                            {c.publisher}
                          </td>
                          <td className="py-4 align-top text-right font-semibold tabular-nums text-brand-700">
                            {c.weight}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-6 text-sm leading-relaxed text-ink-700">
                  Weights sum to 100%.{" "}
                  <strong className="text-ink-900">
                    Weights are fixed at publication.
                  </strong>{" "}
                  Rebalancing requires a versioned methodology release with
                  90-day advance notice.
                </p>
              </section>

              {/* §05 PSCI CALCULATION */}
              <section id="psci-calc" className="scroll-mt-8">
                <h2 className="text-3xl font-semibold tracking-tight text-ink-900">
                  <SectionNum n="05" />
                  PSCI calculation
                </h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-ink-800">
                  <p>
                    Each component is normalized to a base period (January
                    2024 = 100). Weekly component values are computed by:
                  </p>
                  <ul className="space-y-2 text-base text-ink-800 pl-5 list-disc">
                    <li>
                      For monthly series (BLS), the most recent published value
                      is held constant for all weeks in the month following the
                      release date.
                    </li>
                    <li>
                      For weekly series (EIA diesel), the released value is
                      used for the corresponding week.
                    </li>
                    <li>
                      <strong>Component normalization:</strong>{" "}
                      <code className="font-mono text-sm text-ink-700">
                        ComponentIndex_t = (ComponentValue_t /
                        ComponentValue_base) × 100
                      </code>
                    </li>
                  </ul>
                  <p>
                    PSCI is calculated as the weighted geometric mean of
                    normalized components:
                  </p>
                </div>
                <div className="mt-5 rounded-lg bg-ink-900 text-white px-6 py-5 font-mono text-sm leading-relaxed overflow-x-auto">
                  <p className="text-brand-300">
                    PSCI_t = (PPI_pallet^0.40) × (PPI_lumber^0.20) ×
                    (Diesel^0.20) × (Wages^0.15) × (OCC^0.05)
                  </p>
                  <p className="mt-3 text-[11px] text-ink-400">
                    {/* */}// Weighted geometric mean. Prevents disproportionate
                    influence from any single high-velocity component.
                  </p>
                </div>
                <p className="mt-5 text-base leading-relaxed text-ink-800">
                  Geometric mean is used over arithmetic mean because component
                  series are themselves indices (compounding inputs), and
                  geometric weighting prevents disproportionate influence from
                  any single high-velocity component.
                </p>
              </section>

              {/* §06 PSCI REGIONAL COMPOSITION -v1.4 NEW */}
              <section id="psci-regional" className="scroll-mt-8">
                <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 border border-brand-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-700">
                  New in v1.4
                </div>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink-900">
                  <SectionNum n="06" />
                  PSCI v1.4 - regional composition
                </h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-ink-800">
                  <p>
                    PSCI v1.4 publishes values at the individual region level
                    for six US regions. The base formula and weights
                    (40-20-20-15-5) are constant across regions; in the current
                    method, only the diesel input is localized to the region&apos;s
                    PADD - every other input is national. Per-region wages and a
                    California / Pacific Northwest split are on the roadmap (see
                    note below).
                  </p>
                  <p>
                    Market Pulse subscribers receive their subscribed regions
                    individually. The Tuesday Read publication and PSCI
                    headline value remain national.
                  </p>
                </div>

                <h3 className="mt-8 text-lg font-semibold text-ink-900">
                  Regional proxy mapping
                </h3>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b-2 border-ink-300">
                        <th className="text-left py-3 pr-4 font-semibold text-ink-900">
                          Region
                        </th>
                        <th className="text-left py-3 pr-4 font-semibold text-ink-900">
                          Diesel proxy
                        </th>
                        <th className="text-left py-3 pr-4 font-semibold text-ink-900">
                          Wage proxy
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {PSCI_REGIONS.map((r) => (
                        <tr key={r.region} className="border-b border-ink-100">
                          <td className="py-4 pr-4 align-top font-semibold text-ink-900">
                            {r.region}
                          </td>
                          <td className="py-4 pr-4 align-top text-xs text-ink-700 leading-relaxed">
                            {r.diesel}
                          </td>
                          <td className="py-4 pr-4 align-top text-xs text-ink-700 leading-relaxed">
                            {r.wages}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-5 text-sm leading-relaxed text-ink-700">
                  Wood Pallet PPI, Softwood Lumber PPI, OCC proxy, and warehouse
                  wages (CES4349300008) all remain national across every
                  regional calculation - federal PPI series are not published at
                  sub-national granularity, and the current method does not yet
                  localize wages. Diesel is the only localized input, using EIA
                  per-PADD breakdowns. West Coast covers both California and the
                  Pacific Northwest because EIA publishes one PADD-5 diesel
                  series; a PNW-specific series and state-level wages are
                  roadmap items, disclosed here as future, not current.
                </p>
                <p className="mt-4 text-sm leading-relaxed text-ink-700">
                  Each regional series is independently normalized so January
                  2024 = 100 for that region, preserving both cross-region
                  comparability and over-time comparability within a region.
                </p>
              </section>

              {/* §07 PUBLICATION DISCIPLINE */}
              <section id="publication" className="scroll-mt-8">
                <h2 className="text-3xl font-semibold tracking-tight text-ink-900">
                  <SectionNum n="07" />
                  Publication discipline
                </h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-ink-800">
                  <ul className="space-y-2 pl-5 list-disc">
                    <li>
                      Released every Tuesday at{" "}
                      <strong>10:00 AM Eastern</strong>, reflecting the prior
                      week&apos;s data.
                    </li>
                    <li>
                      Published values are final at release; restatement only
                      for source-data revisions per §09.
                    </li>
                    <li>
                      Tuesday Read newsletter (free, national) and Market Pulse
                      regional editions (paid, per-region) both publish from
                      the same canonical{" "}
                      <code className="font-mono text-sm text-ink-700">
                        data/psci_latest.json
                      </code>{" "}
                      snapshot. No parallel pipelines.
                    </li>
                  </ul>
                </div>

                <h3 className="mt-8 text-lg font-semibold text-ink-900">
                  Display and attribution
                </h3>
                <ul className="mt-4 space-y-2 text-base leading-relaxed text-ink-800 pl-5 list-disc">
                  <li>Headline value: PSCI to two decimal places.</li>
                  <li>Week-over-week change: percentage to one decimal place.</li>
                  <li>
                    Every component value links directly to its publishing
                    agency&apos;s source page (BLS, EIA).
                  </li>
                  <li>
                    Carry-forward and restatement status visible on every
                    published value per §08 and §09.
                  </li>
                </ul>
              </section>

              {/* §08 CARRY-FORWARD + OUTAGE */}
              <section id="carry-forward" className="scroll-mt-8">
                <h2 className="text-3xl font-semibold tracking-tight text-ink-900">
                  <SectionNum n="08" />
                  Component carry-forward &amp; outage handling
                </h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-ink-800">
                  <p>
                    When a BLS or EIA component does not publish a fresh
                    observation by its scheduled cadence, PSCI applies the
                    following protocol rather than suppressing the index
                    outright. This rule formalizes practice first applied on
                    May 19, 2026 when BLS had not yet released the April
                    observation for CES4349300008 (Warehouse Worker Earnings,
                    15% weight).
                  </p>
                </div>

                <h3 className="mt-8 text-lg font-semibold text-ink-900">
                  Carry-forward criteria
                </h3>
                <div className="mt-3 space-y-3 text-base leading-relaxed text-ink-800">
                  <p>
                    A component&apos;s most recent observation may be carried
                    forward into the current week&apos;s PSCI calculation IF
                    both:
                  </p>
                  <ul className="space-y-2 pl-5 list-disc">
                    <li>
                      The component&apos;s observation age is at or below its
                      calibrated maximum (typically ≤90 days for monthly BLS
                      series, ≤14 days for EIA weekly diesel)
                    </li>
                    <li>
                      The total weight of all carried-forward components does
                      not exceed 30% of the index
                    </li>
                  </ul>
                </div>

                <h3 className="mt-8 text-lg font-semibold text-ink-900">
                  Disclosure requirement
                </h3>
                <p className="mt-3 text-base leading-relaxed text-ink-800">
                  When a component is carried forward, the published Tuesday
                  Read narrative paragraph names the affected component by
                  title and source series ID, states explicitly that the most
                  recent observation is being carried forward, and references
                  the next expected release date. The published JSON snapshot
                  carries{" "}
                  <code className="font-mono text-sm text-ink-700">
                    freshness_audit.[component].stale=true
                  </code>{" "}
                  so any reader can verify carry-forward state without reading
                  the narrative.
                </p>

                <h3 className="mt-8 text-lg font-semibold text-ink-900">
                  Indeterminate threshold
                </h3>
                <p className="mt-3 text-base leading-relaxed text-ink-800">
                  PSCI publishes as &ldquo;indeterminate&rdquo; only when
                  either ≥30% of total index weight is uncomputable, OR the
                  underlying federal source has been silent past its
                  calibrated maximum age (e.g., government shutdown affecting
                  BLS for 90+ days). Below this threshold, PSCI is always
                  published with carry-forward and disclosure rather than
                  suppressed.
                </p>
              </section>

              {/* §09 RESTATEMENT PROTOCOL */}
              <section id="restatement" className="scroll-mt-8">
                <h2 className="text-3xl font-semibold tracking-tight text-ink-900">
                  <SectionNum n="09" />
                  Restatement protocol
                </h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-ink-800">
                  <p>
                    Restatements of previously-published values appear as{" "}
                    <strong>separate publications, not silent corrections</strong>
                    , with the following format:
                  </p>
                </div>
                <div className="mt-5 rounded-lg bg-ink-900 text-white px-6 py-5 font-mono text-sm leading-relaxed overflow-x-auto">
                  <p>PSCI [date] -RESTATEMENT</p>
                  <p>Original value: X.XX</p>
                  <p>Restated value: Y.YY</p>
                  <p>Trigger: [BLS/EIA revision link with date and series]</p>
                </div>
                <p className="mt-5 text-base leading-relaxed text-ink-800">
                  Restatements are normal data hygiene, not error. Backfilled
                  values for periods prior to PSCI&apos;s first live
                  publication carry an explicit{" "}
                  <em>&ldquo;computed retrospectively&rdquo;</em> caveat:
                  weights were chosen in 2026 with knowledge of the period
                  being backfilled, which introduces look-ahead bias.
                  Backfilled values are useful for directional comparison but
                  are not equivalent to live publications. Live values are
                  date-stamped and immutable except via this restatement
                  protocol.
                </p>
              </section>

              {/* §10 AI FORECAST LAYER */}
              <section id="forecast-layer" className="scroll-mt-8">
                <h2 className="text-3xl font-semibold tracking-tight text-ink-900">
                  <SectionNum n="10" />
                  AI Forecast Layer governance (optional overlay)
                </h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-ink-800">
                  <p>
                    The AI Forecast Layer is an optional forecasting overlay
                    applied to PSCI cost inputs. It produces probabilistic
                    30-day forward projections with confidence intervals.{" "}
                    <strong className="text-ink-900">
                      The Forecast Layer is not a separate index, and the
                      underlying PSCI is unaffected by this overlay.
                    </strong>{" "}
                    It is published alongside PSCI as a procurement timing
                    signal, not as a substitute for vendor quotes and not as a
                    price prediction.
                  </p>
                </div>

                <h3 className="mt-8 text-lg font-semibold text-ink-900">
                  Model
                </h3>
                <p className="mt-3 text-base leading-relaxed text-ink-800">
                  The overlay is powered by{" "}
                  <strong>TimesFM 2.5</strong>, an open-source time-series
                  foundation model published by Google Research. Approximately
                  200M parameters, decoder-only architecture, zero-shot
                  forecasting, Apache 2.0 license. Pallet Solutions does not
                  train, fine-tune, or modify the model - it uses published
                  checkpoints unchanged.
                </p>

                <h3 className="mt-8 text-lg font-semibold text-ink-900">
                  Deployment
                </h3>
                <p className="mt-3 text-base leading-relaxed text-ink-800">
                  The forecast pipeline runs via{" "}
                  <strong>
                    BigQuery ML&apos;s{" "}
                    <code className="font-mono text-sm text-ink-700">
                      AI.FORECAST
                    </code>{" "}
                    function
                  </strong>
                  . Each of the five PSCI cost-input series is projected 30
                  days forward. The series-level projections are then composed
                  via the published PSCI weights to produce a forecast PSCI
                  value with a confidence band.
                </p>

                <h3 className="mt-8 text-lg font-semibold text-ink-900">
                  Reproducibility
                </h3>
                <p className="mt-3 text-base leading-relaxed text-ink-800">
                  Any party with BigQuery access can run the same{" "}
                  <code className="font-mono text-sm text-ink-700">
                    AI.FORECAST
                  </code>{" "}
                  query against the same federal data with the pinned model
                  version and obtain the same forecast range, within minor
                  model nondeterminism (typically &lt;0.1% on horizon-end
                  values). The reproducibility check is the integrity check,
                  identical to the principle that governs PSCI itself.
                </p>

                <h3 className="mt-8 text-lg font-semibold text-ink-900">
                  Confidence intervals
                </h3>
                <p className="mt-3 text-base leading-relaxed text-ink-800">
                  Every published forecast value carries a{" "}
                  <strong>standard 80% confidence interval</strong>. The CI
                  represents model uncertainty, not measurement uncertainty.
                  Procurement teams reading a forecast value should treat the
                  CI as the truth-telling mechanism: when the band is wide,
                  the model is uncertain. Forecasts published without CIs are
                  non-compliant with this methodology and should be flagged.
                </p>

                <h3 className="mt-8 text-lg font-semibold text-ink-900">
                  What the AI Forecast Layer does not do
                </h3>
                <ul className="mt-3 space-y-2 text-base leading-relaxed text-ink-800 pl-5 list-disc">
                  <li>
                    <strong>Not a price prediction.</strong> The overlay
                    projects cost-input INDEX movement, not pallet prices.
                  </li>
                  <li>
                    <strong>Does not modify PSCI.</strong> PSCI is
                    methodology-locked. The overlay never alters published PSCI
                    values.
                  </li>
                  <li>
                    <strong>Not a tradable benchmark.</strong> Same posture as
                    PSCI -a reference forecast, not a regulated derivative.
                  </li>
                  <li>
                    <strong>Not a substitute for vendor quotes.</strong> The
                    forecast informs procurement timing decisions; it does not
                    price contracts.
                  </li>
                  <li>
                    <strong>Not PSPI.</strong> PSPI is a separate
                    forward-looking demand-pressure index. The AI Forecast
                    Layer projects cost inputs (the same federal series PSCI
                    uses); PSPI tracks demand-side leading indicators. They
                    are different objects.
                  </li>
                </ul>
              </section>

              {/* §11 USE CASES */}
              <section id="use-cases" className="scroll-mt-8">
                <h2 className="text-3xl font-semibold tracking-tight text-ink-900">
                  <SectionNum n="11" />
                  Recommended use &amp; anti-use cases
                </h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-ink-800">
                  <p>
                    If a procurement team is going to defend a sourcing
                    decision against an internal challenge, they should be
                    able to cite this section.
                  </p>
                </div>

                <div className="mt-8 grid gap-6 md:grid-cols-2">
                  {/* Recommended use */}
                  <div className="rounded-lg border-t-2 border-brand-500 pt-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">
                      Appropriate for
                    </p>
                    <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-800">
                      <li>
                        <strong className="text-ink-900">
                          Budget setting.
                        </strong>{" "}
                        Year-over-year PSCI movement is a defensible input to
                        next-year pallet-spend forecasting.
                      </li>
                      <li>
                        <strong className="text-ink-900">
                          Procurement timing signals.
                        </strong>{" "}
                        Significant PSCI movement (&gt;5% WoW or &gt;10% MoM)
                        is a signal to revisit vendor agreements ahead of
                        cycle.
                      </li>
                      <li>
                        <strong className="text-ink-900">
                          Quote evaluation.
                        </strong>{" "}
                        When a vendor proposes a price increase, PSCI movement
                        over the same period gives the buyer a reference for
                        how much is cost-input-driven vs. other factors.
                      </li>
                      <li>
                        <strong className="text-ink-900">
                          Internal escalation.
                        </strong>{" "}
                        Cite PSCI movement as a public, audit-defensible
                        reason when defending a vendor change to finance.
                      </li>
                      <li>
                        <strong className="text-ink-900">
                          Cross-period comparison.
                        </strong>{" "}
                        Q1 2025 vs. Q1 2026 across changing vendor mixes.
                      </li>
                    </ul>
                  </div>

                  {/* Anti-use cases */}
                  <div className="rounded-lg border-t-2 border-ink-400 pt-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-600">
                      Not appropriate for
                    </p>
                    <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-800">
                      <li>
                        <strong className="text-ink-900">
                          Pricing pallet quotes off the index.
                        </strong>{" "}
                        Quote vendors, not PSCI.
                      </li>
                      <li>
                        <strong className="text-ink-900">
                          Settling disputes.
                        </strong>{" "}
                        PSCI is not a market price; it cannot be the basis for
                        resolving a vendor-buyer pricing dispute.
                      </li>
                      <li>
                        <strong className="text-ink-900">
                          Forward contracting.
                        </strong>{" "}
                        PSCI is not a tradeable instrument and has no
                        associated derivatives.
                      </li>
                      <li>
                        <strong className="text-ink-900">
                          Cross-industry comparison.
                        </strong>{" "}
                        PSCI is a pallet-industry composite. Not directly
                        comparable to single-component indices (Random
                        Lengths, CME), commodity composites (Bloomberg
                        Commodity Index, S&amp;P GSCI), or trucking indices
                        (Cass, DAT).
                      </li>
                    </ul>
                  </div>
                </div>

                <h3 className="mt-10 text-lg font-semibold text-ink-900">
                  Known sources of divergence between PSCI and observed prices
                </h3>
                <p className="mt-3 text-base leading-relaxed text-ink-800">
                  Procurement teams will observe pallet prices that diverge
                  from PSCI movement. The most common reasons: demand-side
                  factors (PSCI is cost-input only), regional supply
                  imbalances (pallet recyclers operate within ~150 miles),
                  vendor-specific pricing strategy (capacity utilization vs.
                  cost basis), contract terms (fixed-price contracts vs. spot),
                  and quality/certification differentials (heat-treated,
                  ISPM-15, food-grade carry adders not in the PPI series).
                </p>
              </section>

              {/* §12 VALIDATION + FIRST-MOVER */}
              <section id="validation" className="scroll-mt-8">
                <h2 className="text-3xl font-semibold tracking-tight text-ink-900">
                  <SectionNum n="12" />
                  Empirical validation &amp; first-mover disclosure
                </h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-ink-800">
                  <p>
                    PSCI v1.4 weights and composition were chosen from
                    input-cost shares for NAICS 321920 (wood pallet
                    manufacturing) as documented in BLS PPI methodology and
                    published industry-cost-structure analyses. The weights
                    are reasoned approximations, not the output of a
                    regression analysis against observed pallet pricing.
                  </p>
                  <p>
                    As Pallet Solutions accumulates buyer-side transaction
                    data through OMS managed-programs operations, future
                    methodology versions may publish empirical correlation
                    between PSCI and observed pallet pricing across managed
                    corridors, weight refinements informed by observed price
                    elasticity, and regional sub-indices for buyers with
                    concentrated regional footprints. We call this approach{" "}
                    <strong>operator-grounded forecasting</strong> -forecasts
                    published by entities that operate within the system being
                    forecasted, using proprietary ground truth to validate
                    model output.
                  </p>
                  <div className="rounded-lg border-l-2 border-brand-500 bg-brand-50/40 px-5 py-4">
                    <p className="text-sm leading-relaxed text-ink-800">
                      <strong className="text-ink-900">
                        Until such validation is published, PSCI is positioned
                        as a theoretical cost-input composite, not an
                        empirically validated price tracker.
                      </strong>{" "}
                      The reproducibility of the calculation from public data
                      is the integrity check, not empirical correlation to
                      observed prices.
                    </p>
                  </div>
                </div>

                <h3 className="mt-8 text-lg font-semibold text-ink-900">
                  First-mover disclosure
                </h3>
                <p className="mt-3 text-base leading-relaxed text-ink-800">
                  PSCI is the only publicly-available, reproducible composite
                  cost-input index in the pallet industry. Pallet Solutions is
                  aware that publishing an index in a category that has not
                  previously had one carries first-mover risk: the methodology
                  will be scrutinized by procurement audiences, by
                  competitors, by industry trade press, and by source-data
                  publishers. Pallet Solutions is committed to: transparent
                  methodology publication (this document), reproducibility
                  from public data, versioning with advance notice on changes,
                  restatement protocol on source-data revisions, and honest
                  disclosure of limitations.
                </p>
              </section>

              {/* §13 RELEASE CALENDAR + FOOTER */}
              <section id="release-calendar" className="scroll-mt-8">
                <h2 className="text-3xl font-semibold tracking-tight text-ink-900">
                  <SectionNum n="13" />
                  Release calendar &amp; disclosure footer
                </h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-ink-800">
                  <ul className="space-y-2 pl-5 list-disc">
                    <li>
                      <strong>PSCI:</strong> every Tuesday, 10:00 AM ET.
                      Tuesday Read newsletter sends after federal data drops.
                    </li>
                    <li>
                      <strong>PSPI:</strong> second Friday of each month, 10:00
                      AM ET (see appendix).
                    </li>
                    <li>
                      <strong>BLS PPI release:</strong> typically 11th-14th of
                      each month.
                    </li>
                    <li>
                      <strong>EIA weekly diesel:</strong> Mondays, 5:00 PM ET.
                    </li>
                  </ul>
                </div>

                <h3 className="mt-8 text-lg font-semibold text-ink-900">
                  Every published value carries this disclosure footer
                </h3>
                <div className="mt-4 rounded-lg bg-ink-900 text-white px-6 py-5 font-mono text-xs leading-relaxed overflow-x-auto">
                  <p>PSCI™ {VERSION} -methodology: palletsolutionsusa.com/methodology</p>
                  <p>sources: BLS, EIA (PCU321920321920, WPU0811, EPD2D, CES4349300008, WPU09150301)</p>
                  <p>calculated: [timestamp ET] -final at release except per restatement protocol</p>
                  <p>forecast overlay (when present): AI Forecast Layer v1.0 - TimesFM 2.5 - 80% CI</p>
                </div>
              </section>

              {/* APPENDIX -PSPI placeholder */}
              <section id="appendix" className="scroll-mt-8 border-t border-ink-200 pt-12">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
                  Appendix
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink-900">
                  PSPI -Pallet Solutions Pressure Index
                </h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-ink-800">
                  <p>
                    PSPI is a separate index from PSCI -it tracks
                    forward-looking demand pressure, not cost inputs.
                    Procurement teams reading this document for PSCI
                    verification can stop at §13. PSPI methodology is
                    preserved on the canonical Netlify methodology surface for
                    completeness.
                  </p>
                </div>
                <a
                  href="https://palletsolutionsusa.com/methodology#pspi"
                  className="group mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-800"
                >
                  Read the PSPI appendix
                  <ArrowRight />
                </a>
              </section>
            </div>
          </div>
        </div>
      </section>

      {/* QUIET CTA - link back to Tuesday Read + Market Pulse */}
      <section className="border-t border-ink-200 bg-ink-50/60">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="grid gap-6 md:grid-cols-2">
            <Link
              href="/tuesday-read"
              className="group flex flex-col rounded-xl border border-ink-200 bg-white p-7 hover:border-brand-400 transition-colors"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">
                Free · National
              </p>
              <h3 className="mt-3 text-xl font-semibold text-ink-900">
                The Tuesday Read
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-700 flex-1">
                See the methodology in practice. National PSCI value, 30-day
                forecast, plain-English read on what moved this week.
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 group-hover:text-brand-800">
                Read this week&apos;s edition
                <ArrowRight />
              </span>
            </Link>

            <Link
              href="/market-pulse"
              className="group flex flex-col rounded-xl border border-ink-200 bg-white p-7 hover:border-brand-400 transition-colors"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">
                Paid · Per region
              </p>
              <h3 className="mt-3 text-xl font-semibold text-ink-900">
                Market Pulse
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-700 flex-1">
                The same methodology, weighted to your specific regions. Per-DC
                drill-down, per-region 30-day forecasts, audit-defensible
                export.
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 group-hover:text-brand-800">
                See Market Pulse
                <ArrowRight />
              </span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
