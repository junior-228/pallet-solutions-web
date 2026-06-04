import type { Metadata } from "next";
import Link from "next/link";
import type { SampleRegion } from "@/components/AtlasInteractive";
import RegionalRead from "@/components/RegionalRead";
import {
  PSCI_REGIONAL,
  PSCI_SNAPSHOT,
  PSCI_FORECAST,
  PSCI_COMPONENTS,
  formatAsOfDate,
} from "@/lib/psci";
import { MARKET_PULSE_EVENTS } from "@/lib/marketPulseEvents";

export const metadata: Metadata = {
  title: "Market Pulse | Pallet Solutions",
  description:
    "Pallet cost-input intelligence, federally sourced and published openly - a regional PSCI read for each of 6 US areas, every figure traceable to its federal source. The cost intelligence we run behind every managed pallet program.",
};

const FAQ_ITEMS: {
  q: string;
  a: string;
  link?: { label: string; href: string };
}[] = [
  {
    q: "What does Market Pulse show?",
    a: "The PSCI™ headline and week-over-week change, each of the 6 US regions' PSCI with the federal cost inputs behind it (regional diesel plus the national lumber, wages, and OCC series), and a national 30-day directional read. Every figure is traceable to its federal source ID, with the public methodology and CSV alongside so your team can verify it. The regional events layer - plant openings, WARN closures, port and weather disruptions, each source-linked - is planned for summer 2026.",
  },
  {
    q: "What regions does it cover?",
    a: "Six US regions: Northeast, Southeast, Great Lakes, Texas + South Central, Plains + Mountain, and West Coast. California and the Pacific Northwest currently share one West Coast read; a Pacific-Northwest-specific series will split them later. A Canada add-on is planned.",
  },
  {
    q: "Is Market Pulse something I buy?",
    a: "No. The cost index and the regional read are published as open proof of how we work - the same federally-anchored intelligence we bring to a managed pallet program. If you want us to run sourcing across your DCs, that is the managed program.",
    link: {
      label: "See managed programs",
      href: "/sourcing",
    },
  },
  {
    q: "How is this different from existing market reports?",
    a: "Lumber indices cover only lumber and diesel indices only diesel; trade publications report national averages with regional commentary, not a published regional composite. We publish a pallet cost-input composite broken out by region, with disclosed federal source IDs and a 30-day forecast, free to read.",
  },
];

// (ArrowRight removed - Section 5 deleted; remaining arrows are inline spans.)

// Map PSCI_REGIONAL.regions key -> slug used by AtlasInteractive's
// configurator state and AtlasRegionsMap. Six entries: West Coast is one
// region (PADD 5, CA + PNW merged) because EIA publishes one PADD-5 diesel
// series. Do not split.
const NAME_TO_SLUG: Record<string, string> = {
  Northeast: "northeast",
  Southeast: "southeast",
  "Great Lakes": "great-lakes",
  "Texas + South Central": "texas-south-central",
  "Plains + Mountain": "plains-mountain",
  "West Coast": "west-coast",
};

// PADD label expansion for the sample preview's regional-diesel tile.
const PADD_LABELS: Record<string, string> = {
  "1B": "PADD 1B Central Atlantic",
  "1C": "PADD 1C Lower Atlantic",
  "2": "PADD 2 Midwest",
  "3": "PADD 3 Gulf Coast",
  "4": "PADD 4 Rocky Mountain",
  "5": "PADD 5 West Coast",
};

function buildRegions(): SampleRegion[] {
  const reg = PSCI_REGIONAL;
  if (!reg) return [];
  const out: SampleRegion[] = [];
  for (const [name, r] of Object.entries(reg.regions)) {
    const slug = NAME_TO_SLUG[name];
    if (!slug || r.psciCurrent == null) continue;
    out.push({
      slug,
      name,
      psci: r.psciCurrent,
      diesel: r.dieselUsdGal,
      padd: PADD_LABELS[r.padd] ?? (r.padd ? `PADD ${r.padd}` : ""),
      wowPct: r.psciWowPct,
    });
  }
  return out;
}

export default function MarketPulsePage() {
  const regions = buildRegions();
  const asOfIso = PSCI_REGIONAL?.asOf || PSCI_SNAPSHOT.asOf;
  const asOfLabel = asOfIso ? formatAsOfDate(asOfIso) : "May 26, 2026";

  // Serializable component rows for the report's "what moved" table.
  // (lib/psci reads JSON server-side; the client report receives plain props.)
  const componentRows = PSCI_COMPONENTS.map((c) => ({
    key: c.key,
    wowPct: c.wowPct,
    stale: c.stale,
    observationDate: c.observationDate,
  }));

  return (
    <>
      {/* RETURN-TO-MANAGED bar - quiet navigation back to the managed page for
          a reader who arrived from it (new tab) or landed cold. Not a CTA, no
          pitch; text + one link, low contrast so it never competes with the
          report. */}
      <div className="sticky top-0 z-20 border-b border-ink-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-2">
          <span className="text-xs text-ink-500">
            From Pallet Solutions&apos; managed programs
          </span>
          <Link
            href="/sourcing"
            className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
          >
            Back to managed programs <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>

      {/* HERO - action copy + warm-lead bypass top right */}
      <section className="relative overflow-hidden bg-white">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] rounded-full bg-brand-500/5 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-12 sm:pt-24 sm:pb-12">
          <div className="max-w-3xl">
            <p className="text-base font-semibold uppercase tracking-[0.22em] text-brand-500">
              Your regional cost read
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
              When costs move,{" "}
              <span className="text-brand-500">see it for yourself</span>.
            </h1>
            <ul className="mt-5 max-w-2xl space-y-3">
              <li className="flex gap-3 text-base leading-relaxed text-ink-600">
                <span
                  aria-hidden="true"
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500"
                />
                <span>
                  See this week&apos;s PSCI&trade; number, personalized for your
                  regions.
                </span>
              </li>
              <li className="flex gap-3 text-base leading-relaxed text-ink-600">
                <span
                  aria-hidden="true"
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500"
                />
                <span>
                  Have a regional benchmark ready the moment finance asks why
                  pallet costs changed.
                </span>
              </li>
              <li className="flex gap-3 text-base font-semibold leading-relaxed text-ink-900">
                <span
                  aria-hidden="true"
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-900"
                />
                <span>
                  Select where you operate on the map below to see this
                  week&apos;s read.
                </span>
              </li>
            </ul>
            <p className="mt-4 text-sm text-ink-400">
              Free. No signup to look.
            </p>
          </div>

          <RegionalRead
            regions={regions}
            nationalPsci={PSCI_SNAPSHOT.value}
            nationalWowPct={PSCI_SNAPSHOT.wowPct}
            forecastPct={PSCI_FORECAST?.changePct ?? null}
            asOfLabel={asOfLabel}
            componentRows={componentRows}
            eventsByRegion={MARKET_PULSE_EVENTS.regions}
            housing={MARKET_PULSE_EVENTS.housing}
          />
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white border-t border-ink-100">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <h2 className="text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
            Frequently asked questions
          </h2>

          <div className="mt-12">
            {FAQ_ITEMS.map((item, i) => (
              <details
                key={i}
                className="group border-b border-ink-200 py-6 first:border-t first:border-t-ink-200 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer items-start justify-between gap-6 list-none">
                  <span className="text-xl font-semibold text-ink-900 group-hover:text-brand-700 transition-colors text-left">
                    {item.q}
                  </span>
                  <span
                    aria-hidden="true"
                    className="mt-1 shrink-0 text-ink-500 text-2xl leading-none transition-transform duration-200 group-open:rotate-45 group-hover:text-brand-500"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-4 text-base leading-relaxed text-ink-700">
                  {item.a}
                </p>
                {item.link && (
                  <Link
                    href={item.link.href}
                    className="group mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                  >
                    {item.link.label}
                    <span
                      aria-hidden="true"
                      className="transition-transform group-hover:translate-x-0.5"
                    >
                      →
                    </span>
                  </Link>
                )}
              </details>
            ))}
          </div>
        </div>
      </section>

    </>
  );
}
