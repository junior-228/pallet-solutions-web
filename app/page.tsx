import Link from "next/link";
import {
  PSCI_SNAPSHOT,
  PSCI_FORECAST,
  PSCI_HISTORICAL_ALL,
  formatAsOfDate,
} from "@/lib/psci";
import PsciInteractiveChart from "@/components/PsciInteractiveChart";
import RfqForm from "@/components/RfqForm";
import VendorDensityMap from "@/components/VendorDensityMap";
import NetworkAmbientDots from "@/components/NetworkAmbientDots";
import DarkBarFx from "@/components/DarkBarFx";

// Custom thin-line card glyphs (all #49a5c1, 40x40, consistent stroke). Hand-
// drawn - NOT an icon pack, NOT photos. Subordinate to the card text.
const ICON_MANAGED = (
  <svg
    viewBox="0 0 40 40"
    width="36"
    height="36"
    fill="none"
    stroke="#49a5c1"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="20" cy="20" r="3.4" />
    <circle cx="8" cy="10" r="2.2" />
    <circle cx="32" cy="10" r="2.2" />
    <circle cx="8" cy="30" r="2.2" />
    <circle cx="32" cy="30" r="2.2" />
    <path d="M9.6 11.4 16.8 17.8" />
    <path d="M30.4 11.4 23.2 17.8" />
    <path d="M9.6 28.6 16.8 22.2" />
    <path d="M30.4 28.6 23.2 22.2" />
    <path d="M8 28 C2 22 2 18 8 12" strokeDasharray="2 2" opacity="0.55" />
  </svg>
);
const ICON_PULSE = (
  <svg
    viewBox="0 0 40 40"
    width="36"
    height="36"
    fill="none"
    stroke="#49a5c1"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 30 9 24 14 27 20 16 26 21 31 11" />
    <path d="M27.5 11 31 11 31 14.5" />
    <path d="M3 35 37 35" opacity="0.35" />
  </svg>
);
const ICON_FIND = (
  <svg
    viewBox="0 0 40 40"
    width="36"
    height="36"
    fill="none"
    stroke="#49a5c1"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M16 6 C12.7 6 10 8.7 10 12 C10 16.5 16 23 16 23 C16 23 22 16.5 22 12 C22 8.7 19.3 6 16 6 Z" />
    <circle cx="16" cy="12" r="2.1" />
    <path d="M28 16 C25.8 16 24 17.8 24 20 C24 23 28 27.5 28 27.5 C28 27.5 32 23 32 20 C32 17.8 30.2 16 28 16 Z" />
    <circle cx="28" cy="20" r="1.5" />
    <path d="M6 31 34 31" opacity="0.35" />
  </svg>
);

// The three homepage cards are the buyer ladder: do it yourself (Find a
// Vendor), watch the market (Market Pulse), or hand it off (Managed
// Programs). Vendors (claim a listing) enter through the "For Vendors" nav,
// not a homepage card - the hero leads with buyers.
const AUDIENCE_CARDS = [
  {
    question: "One source for pallets across every site.",
    proofBullets: [
      "One relationship across your whole footprint",
      "Consistent service and accountability at every site",
      "Bring us into your next RFP, or hand off the sites you're juggling now",
    ],
    cta: "See how we work",
    href: "/sourcing",
    audience: "Managed Programs",
    icon: ICON_MANAGED,
  },
  {
    question: "The cost intelligence behind our programs.",
    proofBullets: [
      "Know where your costs are heading - every week, by region",
      "See 30 days out, per region (80% confidence interval)",
      "Tuned to your DC footprint, not the national average",
    ],
    cta: "See what's moving",
    href: "/market-pulse",
    audience: "Cost Intelligence",
    icon: ICON_PULSE,
  },
  {
    question: "Need pallets at one or two sites? Find a vendor yourself.",
    proofBullets: [
      "Search 7,500+ pallet vendors mapped near each of your locations",
      "Send one structured need - we relay it, quotes come back to you",
      "Free. No managed program, no commitment.",
    ],
    cta: "Find vendors near you",
    href: "/find-a-vendor",
    audience: "Find a Vendor",
    icon: ICON_FIND,
  },
];

// PSCI_COMPONENTS table removed from the homepage 2026-05-21. The full
// five-series breakdown (weights, federal series IDs, methodology) lives
// on /methodology -the canonical surface for the index composition.
// Homepage shows a one-line method claim + link instead.

export default function HomePage() {
  return (
    <>
      {/* HERO
          HEADLINE NOTE (visual pass 2026-06-01): the H1 below still leads with
          the intelligence layer ("...starts with real market data"). Per
          positioning, PS is a MANAGED pallet sourcing company and the index is
          the byproduct - the headline should lead managed-first (e.g. "Include
          us on your next RFQ" energy). That copy reframe is a SEPARATE,
          higher-priority task. This pass only added the real-data map backdrop
          + card icons; it did NOT change the headline copy. */}
      {/* Hero + cards share ONE continuous vendor-density backdrop, so the
          real map reads behind everything in the top zone (not just the hero
          corners). The veil is light - the faint dots stay visible behind the
          headline and cards; the dark text and white cards carry legibility. */}
      <div
        className="relative overflow-hidden"
        style={{ backgroundColor: "rgb(247, 251, 253)" }}
      >
        {/* Faint, REAL vendor-density backdrop from /vendor-index.json
            coordinates - proof of the 7,500+ network the instant the page
            loads. Static data, no Leaflet, headline never blocked. */}
        <VendorDensityMap opacity={1} />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(247,251,253,0.35) 0%, rgba(247,251,253,0.30) 55%, rgba(247,251,253,0.62) 100%)",
          }}
        />
        <section className="relative z-10">
        <div className="mx-auto max-w-6xl px-6 pt-16 pb-8 sm:pt-24 sm:pb-10 text-center">
          <p className="text-[13px] font-bold uppercase tracking-[0.22em] text-brand-700">
            Managed Sourcing · Cost Data · Vendor Network
          </p>
          <h1 className="mt-5 mx-auto max-w-4xl text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl sm:leading-[1.08]">
            One accountable source for pallets, across every DC.
          </h1>
          <p className="mt-6 mx-auto max-w-3xl text-lg leading-relaxed text-ink-700">
            We run your pallet program end to end - sourcing, POs, BOLs, PODs,
            disputes, core pickup, one consolidated invoice in your AP schema.
            Every quote is read against PSCI&trade;, the public cost index we
            publish, so you can defend the number to finance.
          </p>
          {/* Credibility strip - real nameable customers (GXO + Trinity) +
              the Pallet Enterprise credential. Honest scale proof for the
              enterprise buyer (Larry) and the regional manager (Priya). */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-ink-600">
            <span>
              Working with{" "}
              <span className="font-semibold text-ink-800">GXO</span> and{" "}
              <span className="font-semibold text-ink-800">
                Trinity Packaging
              </span>
            </span>
            <span aria-hidden="true" className="text-ink-300">
              ·
            </span>
            <span>Pallet Enterprise contributor</span>
          </div>
        </div>
      </section>

      {/* AUDIENCE ROUTING CARDS - transparent so the shared density backdrop
          shows behind the cards too. */}
      <section className="relative z-10 border-b border-ink-100">
        <div className="mx-auto max-w-6xl px-6 pt-4 pb-20 sm:pt-6 sm:pb-24">
          <div className="grid gap-6 md:grid-cols-3 items-start">
            {AUDIENCE_CARDS.map((card) => {
              const isManaged = card.audience === "Managed Programs";
              return (
              <Link
                key={card.href}
                href={card.href}
                className={
                  isManaged
                    ? "group flex flex-col rounded-xl border-2 border-brand-500 border-t-[6px] border-t-brand-500 bg-brand-50/40 p-7 shadow-xl ring-1 ring-brand-500/10 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 md:-mt-2"
                    : "group flex flex-col rounded-xl border border-ink-200 border-t-[6px] border-t-ink-300 bg-white p-7 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-t-brand-400 transition-all duration-300"
                }
              >
                <div className="mb-3" aria-hidden="true">
                  {card.icon}
                </div>
                {isManaged && (
                  <span className="mb-2 inline-flex w-fit rounded-full bg-brand-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                    What we run
                  </span>
                )}
                <p
                  className={
                    isManaged
                      ? "text-[13px] font-semibold uppercase tracking-[0.22em] text-brand-700"
                      : "text-[13px] font-semibold uppercase tracking-[0.22em] text-ink-500"
                  }
                >
                  {card.audience}
                </p>
                <h2 className="mt-3 text-xl font-semibold leading-snug text-ink-900">
                  {card.question}
                </h2>
                <ul className="mt-4 flex-1 space-y-2 text-sm leading-relaxed text-ink-700">
                  {card.proofBullets.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500"
                        aria-hidden="true"
                      />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
                <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 group-hover:text-brand-700">
                  {card.cta}
                  <span aria-hidden="true">→</span>
                </span>
              </Link>
              );
            })}
          </div>
        </div>
      </section>
      </div>

      {/* FOR VENDORS ENTRY - the homepage is buyer-first, so vendors get an
          explicit door here instead of only the nav. Covers pallet yards,
          recyclers, sawmills, and lumber suppliers (all real classifications). */}
      <section className="relative overflow-hidden border-y-2 border-brand-500 bg-ink-900 text-white">
        {/* Same real vendor-density map as the hero, used as a faint teaser
            (not a stock pallet-yard photo). Real density = honest proof. */}
        {/* Network ambient floating dots (no map) - the exact see-your-
            network effect: drift up, pulse, fade. */}
        <NetworkAmbientDots />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(15,29,36,0.82) 0%, rgba(15,29,36,0.35) 50%, rgba(15,29,36,0.7) 100%)",
          }}
        />
        <div className="relative z-10 mx-auto max-w-6xl px-6 py-16 sm:py-20 flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-300">
              For Vendors
            </p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl sm:leading-[1.05]">
              Run a pallet yard? You&apos;re already on the map.
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-200">
              Claim your listing free - buyers can reach out directly, and you
              control what they see.
            </p>
          </div>
          <Link
            href="/vendors"
            className="shrink-0 inline-flex items-center gap-2 rounded-full bg-brand-500 px-8 py-5 text-lg font-bold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-600 transition-colors"
          >
            Claim your free listing
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      {/* THE INTELLIGENCE BEHIND EVERY PATH */}
      <section className="border-b border-ink-100">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            The intelligence behind every path
          </p>
          <h2 className="mt-5 max-w-3xl text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            All three paths run on the same underlying cost index.
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-ink-700">
            Whether you came to find a vendor, subscribe to the weekly
            read, or hand off your whole program, the same public cost
            index - PSCI™ - is the reference underneath it all. Here is what
            it reads today, and how it is built.
          </p>

          {/* Value tile (left) + fan graph (right). Both read from the
              single source of truth: data/psci_latest.json for the
              headline value (via lib/psci.ts) and
              data/psci_historical.csv for the 12-month trend series.
              The forecast portion of the fan graph is omitted today
              because the Supabase atlas_pspi_cache forecast value isn't
              wired into this build context yet (task #53). When the
              forecast ships, pass it as the `forecast` prop and the
              same component renders the full fan with cones + dashed
              forecast line. NO fabricated forecast numbers. */}
          <div className="mt-10 grid gap-8 md:grid-cols-[1fr_2fr] items-start">
            {/* LEFT: Value tile -big PSCI number + WoW + as-of + gold
                forecast block + Tuesday Read link. */}
            <div className="rounded-lg border border-ink-200 bg-white p-7">
              {/* PSCI ACTUAL -backward-looking. Brand-blue. */}
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                PSCI™ - Pallet Solutions Cost Index™
              </p>
              <p className="mt-3 text-5xl font-semibold tracking-tight text-ink-900 tabular-nums">
                {PSCI_SNAPSHOT.value.toFixed(2)}
              </p>
              {PSCI_SNAPSHOT.wowPct !== null && (
                <p className="mt-2 text-sm font-medium text-brand-700">
                  {PSCI_SNAPSHOT.wowPct < 0 ? "↓" : "↑"}
                  {Math.abs(PSCI_SNAPSHOT.wowPct).toFixed(2)}% week-over-week
                </p>
              )}
              <p className="mt-1 text-xs text-ink-500">
                As of {formatAsOfDate(PSCI_SNAPSHOT.asOf)} ·{" "}
                {PSCI_SNAPSHOT.version} · Base: Jan 2024 = 100
              </p>

              {/* AI Forecast Layer - real national 30-day projection from
                  data/psci_forecast.json (atlas_pspi_cache / TimesFM 2.5).
                  Gold marks it as the forecast overlay; the delta arrow is
                  GREEN when the projection is down (cost relief, good for a
                  buyer) and RED when up. Hidden entirely if no forecast data,
                  so we never show an empty placeholder. */}
              {PSCI_FORECAST && PSCI_FORECAST.projected !== null && (
                <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50/60 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                    AI Forecast Layer · 30-day projection
                  </p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-semibold tabular-nums text-ink-900">
                      {PSCI_FORECAST.projected.toFixed(2)}
                    </span>
                    {PSCI_FORECAST.changePct !== null && (
                      <span
                        className={
                          PSCI_FORECAST.changePct < 0
                            ? "text-sm font-bold text-emerald-600"
                            : PSCI_FORECAST.changePct > 0
                              ? "text-sm font-bold text-red-600"
                              : "text-sm font-bold text-ink-500"
                        }
                      >
                        {PSCI_FORECAST.changePct < 0
                          ? "↓"
                          : PSCI_FORECAST.changePct > 0
                            ? "↑"
                            : "→"}
                        {Math.abs(PSCI_FORECAST.changePct).toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {Math.round(PSCI_FORECAST.confidenceLevel * 100)}% confidence ·{" "}
                    {PSCI_FORECAST.model} · projection, not the index
                  </p>
                </div>
              )}

              <Link
                href="/tuesday-read"
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
              >
                Read this week&apos;s Tuesday Read
                <span aria-hidden="true">→</span>
              </Link>
            </div>

            {/* RIGHT: Interactive PSCI chart - 3M / 6M / 1Y / 5Y / All
                time range toggles + hover state. Client component reads
                the full 540-week series passed in as a prop (server
                builds the data at compile time from psci_historical.csv;
                no runtime fetch). Default range is 6M. */}
            <PsciInteractiveChart data={PSCI_HISTORICAL_ALL} forecast={PSCI_FORECAST} />
          </div>

          {/* Methodology claim + link footer -replaces the prior
              weights table. The full five-series breakdown (BLS Wood
              Pallet PPI 40%, Softwood Lumber 20%, EIA Diesel 20%,
              Warehouse Wages 15%, Paper Containers PPI 5%, with all
              federal series IDs) lives on /methodology, the canonical
              surface for index composition. Homepage carries the
              one-line claim and the link. */}
          <div className="mt-10 max-w-4xl">
            <h3 className="text-lg font-semibold tracking-tight text-ink-900">
              The only publicly-reproducible cost index in the pallet
              category.
            </h3>
            <p className="mt-3 text-base leading-relaxed text-ink-700">
              PSCI is a weighted geometric mean of five federal series,
              reproducible from public BLS and EIA data alone. The full
              historical series is released CC0 public domain.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
              <Link
                href="/methodology"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
              >
                Read the methodology
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="/psci"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
              >
                Cite PSCI in your RFQ
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* RFQ INTAKE FORM */}
      <section
        id="rfq"
        className="relative overflow-hidden border-y-2 border-brand-500 bg-ink-900 text-white"
      >
        <DarkBarFx />
        <div className="relative z-10 mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-300">
              For Sourcing Teams
            </p>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
              Add us to your next pallet RFQ.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-ink-300">
              Two fields, 30 seconds. We come back with a per-pallet quote
              for every DC on your list, traceable to PSCI™ when finance
              asks. No follow-up calls until your RFQ window opens.
            </p>

            <RfqForm source="homepage-rfq" />
          </div>
        </div>
      </section>

      {/* CATCH-ALL ROUTING */}
      <section id="contact" className="border-b border-ink-100">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            Not sure which path is yours?
          </h2>
          <p className="mt-5 text-base leading-relaxed text-ink-700">
            Send a note. We will route you, no demo, no deck.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href="mailto:info@palletsolutionsusa.com"
              className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              Talk to us
              <span aria-hidden="true">→</span>
            </a>
            <Link
              href="/methodology"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              See the methodology
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
