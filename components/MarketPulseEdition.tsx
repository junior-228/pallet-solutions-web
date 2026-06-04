import { type ReactNode } from "react";
import Link from "next/link";
import {
  PSCI_SNAPSHOT,
  PSCI_COMPONENTS,
  PSCI_FORECAST_BAND,
  formatAsOfDate,
} from "@/lib/psci";

// MarketPulseEdition - Section 4 of /market-pulse. A STATIC reference block
// (no charts, no toggles - the only interactivity on the page is the region
// selector in RegionalRead above). Everything reads from JSON:
//   - component "this week" cells from PSCI_COMPONENTS (psci_components_
//     historical.csv WoW + freshness_audit stale flag + observation date)
//   - the read narrative from PSCI_SNAPSHOT.narrativeHtml (psci_latest.json
//     narrative_override) - omitted entirely if absent
//   - the forecast band from PSCI_FORECAST_BAND (psci_latest.json.forecast)
// Series IDs, weights, cadence, and federal-source URLs are fixed text.
// Wages is CES (monthly), never QCEW/quarterly.

// Fixed display facts (labels, not data). Numbers come from the JSON above.
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

function signedPct(n: number, dp = 1): string {
  const s = n > 0 ? "+" : "";
  return `${s}${n.toFixed(dp)}%`;
}

export default function MarketPulseEdition() {
  const asOf = formatAsOfDate(PSCI_SNAPSHOT.asOf);
  const byKey = new Map(PSCI_COMPONENTS.map((c) => [c.key, c]));

  return (
    <section className="bg-white border-t border-ink-100">
      <div className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
        <h2 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
          This week&apos;s edition
          <span className="ml-2 text-base font-medium text-ink-500">
            {asOf}
          </span>
        </h2>
        <p className="mt-3 text-base text-ink-600">
          What goes into the number - and what moved.
        </p>

        {/* GROUP A - PSCI components */}
        <div className="mt-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            PSCI components
          </p>
          <p className="mt-1 text-sm text-ink-500">
            The five federal series, weighted. Four are national; diesel is your
            region.
          </p>

          <div className="mt-5 overflow-hidden rounded-xl border border-ink-200">
            {EDITION_ROWS.map((row, i) => {
              const m = byKey.get(row.key);
              // "This week" cell: status for held series, real delta for movers.
              let cell: ReactNode = null;
              if (m) {
                if (m.stale) {
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
                } else if (Math.abs(m.wowPct) < 0.05) {
                  cell = <span className="text-ink-500">Held, no new release</span>;
                } else if (row.key === "diesel") {
                  cell = (
                    <span className="font-semibold text-ink-900 tabular-nums">
                      {signedPct(m.wowPct)} WoW
                      <span className="ml-1.5 font-normal text-xs text-ink-400">
                        EIA {fmtDateShort(m.observationDate)}
                      </span>
                    </span>
                  );
                } else {
                  cell = (
                    <span className="font-semibold text-ink-900 tabular-nums">
                      {signedPct(m.wowPct)} on last release
                    </span>
                  );
                }
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
                      {row.name}
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

        {/* THE READ - real weekly narrative; omitted entirely if absent */}
        {PSCI_SNAPSHOT.narrativeHtml && (
          <div className="mt-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
              The read
            </p>
            <div
              className="mt-3 text-base leading-relaxed text-ink-800 [&_li]:mt-1.5 [&_strong]:font-semibold"
              dangerouslySetInnerHTML={{ __html: PSCI_SNAPSHOT.narrativeHtml }}
            />
          </div>
        )}

        {/* 30-day forecast - national, with the numeric CI band */}
        {PSCI_FORECAST_BAND &&
          PSCI_FORECAST_BAND.value != null &&
          PSCI_FORECAST_BAND.ciLow != null &&
          PSCI_FORECAST_BAND.ciHigh != null && (
            <p className="mt-8 text-sm text-ink-700">
              <span className="font-semibold text-ink-900">
                National 30-day forecast:
              </span>{" "}
              <span className="tabular-nums">
                {PSCI_FORECAST_BAND.value.toFixed(2)} · range{" "}
                {PSCI_FORECAST_BAND.ciLow.toFixed(2)}-
                {PSCI_FORECAST_BAND.ciHigh.toFixed(2)} ·{" "}
                {Math.round(PSCI_FORECAST_BAND.confidenceLevel * 100)}% CI ·{" "}
                {PSCI_FORECAST_BAND.model}
              </span>
            </p>
          )}

        {/* Footer line + go-deeper link to methodology */}
        <div className="mt-8 border-t border-ink-100 pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-ink-500">
            Every figure links to its federal source. Quiet weeks say quiet.
          </p>
          <Link
            href="/methodology"
            className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            See methodology &amp; history
            <span
              aria-hidden="true"
              className="transition-transform group-hover:translate-x-0.5"
            >
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
