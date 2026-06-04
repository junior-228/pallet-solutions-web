import type { Metadata } from "next";
import Link from "next/link";
import {
  PSCI_SNAPSHOT,
  PSCI_HISTORICAL_ALL,
  formatAsOfDate,
} from "@/lib/psci";
import PsciInteractiveChart from "@/components/PsciInteractiveChart";

// /psci - the permanent, citable home for the Pallet Solutions Cost Index.
// This is a REFERENCE page, not a product page: it exists so press, RFQs,
// contracts, and LinkedIn posts have one durable URL to point at. It is not
// in the top nav by design (PSCI is a credential, not a buyer action); it is
// reached from the homepage PSCI section, the methodology page, and the
// footer. Reuses the same single-source-of-truth data the homepage reads
// (lib/psci) so the headline value never drifts between surfaces.

export const metadata: Metadata = {
  title: "PSCI - Pallet Solutions Cost Index | Pallet Solutions",
  description:
    "PSCI, the Pallet Solutions Cost Index, is the only publicly-reproducible cost-input index for pallets: a weighted geometric mean of five federal BLS and EIA series, published weekly and released CC0 public domain. Cite it in your RFQ, contract, or report.",
};

export default function PsciPage() {
  return (
    <>
      {/* HERO */}
      <section className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-6xl px-6 pt-16 pb-10 sm:pt-20">
          <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-brand-500">
            The pallet cost benchmark
          </p>
          <h1 className="mt-5 max-w-4xl text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
            PSCI™ - the Pallet Solutions Cost Index™
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-ink-700">
            The only publicly-reproducible cost-input index for pallets. A
            weighted geometric mean of five federal BLS and EIA series,
            published every Tuesday and released CC0 public domain. Cite it
            anywhere - it is built to be the category's reference number.
          </p>
        </div>
      </section>

      {/* VALUE + CHART - mirrors the homepage tile, same data source */}
      <section className="border-b border-ink-100">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-8 md:grid-cols-[1fr_2fr] items-start">
            <div className="rounded-lg border border-ink-200 bg-white p-7">
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
              <Link
                href="/methodology"
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
              >
                Read the full methodology
                <span aria-hidden="true">→</span>
              </Link>
            </div>
            <PsciInteractiveChart data={PSCI_HISTORICAL_ALL} />
          </div>
        </div>
      </section>

      {/* CITE PSCI - the reason this page exists */}
      <section className="border-b border-ink-100 bg-ink-50/50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
              Cite PSCI
            </p>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-ink-900">
              Reference it in your RFQ, contract, or report.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink-700">
              PSCI and its full historical series are public domain (CC0).
              Quote the value, name the version, and link this page - the
              number is reproducible from public federal data by anyone, so it
              holds up in an audit.
            </p>
            <pre className="mt-6 overflow-x-auto rounded-lg border border-ink-200 bg-white p-5 text-sm leading-relaxed text-ink-800">
{`Pallet Solutions Cost Index™ (PSCI)
${PSCI_SNAPSHOT.version} · ${PSCI_SNAPSHOT.value.toFixed(2)} as of ${formatAsOfDate(
                PSCI_SNAPSHOT.asOf,
              )} · base Jan 2024 = 100
Pallet Solutions USA · https://palletsolutionsusa.com/psci`}
            </pre>
            <p className="mt-3 text-xs text-ink-500">
              Select and copy the block above to cite this week's value.
            </p>
          </div>
        </div>
      </section>

      {/* QUIET CTA - the two free ways to keep up with PSCI */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid max-w-4xl gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-ink-200 bg-white p-7">
              <h3 className="text-lg font-semibold text-ink-900">
                Tuesday Read
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                Free weekly email - the new PSCI value and a plain-English read
                on what moved.
              </p>
              <Link
                href="/tuesday-read"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
              >
                Subscribe
                <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="rounded-xl border border-ink-200 bg-white p-7">
              <h3 className="text-lg font-semibold text-ink-900">
                Methodology
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                The full formula, weights, federal series IDs, and governance.
                Reproduce the index yourself.
              </p>
              <Link
                href="/methodology"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
              >
                Read the methodology
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
