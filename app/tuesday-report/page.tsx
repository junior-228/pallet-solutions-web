import type { Metadata } from "next";
import Link from "next/link";
import TuesdayReportPreview from "@/components/TuesdayReportPreview";
import TuesdayReportReserveForm from "@/components/TuesdayReportReserveForm";
import TuesdayReportCorridorNote from "@/components/TuesdayReportCorridorNote";
import DarkBarFx from "@/components/DarkBarFx";
import {
  PSCI_SNAPSHOT,
  PSCI_COMPONENTS,
  PSCI_FORECAST,
  formatAsOfDate,
} from "@/lib/psci";

// ---------------------------------------------------------------------------
// /tuesday-report - standalone discovery page for the VENDOR Tuesday Report
// (the paid weekly intelligence brief tuned to a pallet vendor's corridor).
//
// This is NOT the buyer Tuesday Read at /tuesday-read (free buyer email).
// Two distinct products, two pages, two footer links. See CLAUDE.md
// "LANGUAGE RULES" section -- "Tuesday Read" stays the free buyer name;
// "Tuesday Report" is the paid vendor product.
//
// What lives here:
//   - A header explaining what the Tuesday Report is and who it's for.
//   - The same TuesdayReportPreview proof sample the in-flow WaitlistView
//     renders inside the claim wizard. Extracted so this page reuses the
//     exact component -- nothing duplicated, the sample never drifts.
//   - A founding-rate reservation form (TuesdayReportReserveForm) posting
//     to the existing web-lead Netlify function with form_type
//     "tuesday-report-reservation". Lands in public.web_leads.
//
// Findability: this page is linked from the /vendors FAQ ("What is the
// Tuesday Report?") and from the footer "For Vendors" group. It's also
// the URL we point Pallet Enterprise readers and LinkedIn audiences to.
//
// Honesty: no ship/delivery date, no fabricated scarcity. The product is
// not yet built -- "reserve your founding rate" is the action, "we'll
// email when the first edition is ready to ship" sets the expectation.
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Tuesday Report - weekly corridor intelligence for pallet vendors | Pallet Solutions",
  description:
    "Your corridor, watched for you. Every Tuesday: where your pallet and fuel costs are heading this week, plus any local moves worth acting on within 150 miles. We watch your corridor so you don't have to - quiet weeks we say so. Reservation now open.",
};

export default function TuesdayReportPage() {
  return (
    <>
      {/* HERO */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-6 pt-14 pb-6 sm:pt-20 sm:pb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            For pallet vendors
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl sm:leading-[1.05]">
            The <span className="text-brand-500">Tuesday Report</span>.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-ink-700">
            Your corridor, watched for you. Every Tuesday, a 60-second read
            built for your 150 miles: where your pallet and fuel costs are
            heading this week, plus any local moves worth acting on - a new DC
            to pitch, a closure freeing up cores, a competitor shift. We watch
            your corridor so you don&apos;t have to. Quiet week on moves? We say
            so - and the cost read still tells you where your margin&apos;s
            going.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ink-600">
            Built for pallet-yard operators - manufacturers, recyclers,
            sawmills, specialty crating shops - who need to know which
            corridor to push on before someone else does.
          </p>
          <TuesdayReportCorridorNote />
        </div>
      </section>

      {/* WHAT YOU GET - three-tier rundown, plain language */}
      <section className="bg-ink-50/60 border-y border-ink-100">
        <div className="mx-auto max-w-5xl px-6 py-14 sm:py-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            What lands in your inbox every Tuesday
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-ink-200 bg-white p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Tier 1 · always
              </p>
              <h3 className="mt-2 text-base font-bold text-ink-900">
                National cost data
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                PSCI&trade; - the federal composite of wood pallet, lumber,
                diesel, wages, and recycled cardboard (OCC). Live federal
                values, this week&apos;s prints.
              </p>
            </div>
            <div className="rounded-xl border border-ink-200 bg-white p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-700">
                Tier 2 · always
              </p>
              <h3 className="mt-2 text-base font-bold text-ink-900">
                30-day cost forecast
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                Where the model projects pallet inputs over the next month
                with an 80% confidence band. A projection, labeled as such -
                not a guarantee.
              </p>
            </div>
            <div className="rounded-xl border border-ink-200 bg-white p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-700">
                Tier 3 · when they happen
              </p>
              <h3 className="mt-2 text-base font-bold text-ink-900">
                Corridor events
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                New DCs, plant closures, WARN filings, competitor moves
                within your service radius. Source-linked - no link, no item.
                Quiet weeks we say so.
              </p>
            </div>
          </div>
          <p className="mt-8 max-w-3xl text-sm leading-relaxed text-ink-600">
            The cost tiers carry the read every week. The event tier
            differentiates - it&apos;s the one a buyer cannot rebuild from
            federal data alone, and it&apos;s where the next move comes from.
          </p>
        </div>
      </section>

      {/* PROOF SAMPLE - the exact in-flow preview the post-claim screen shows.
          Reused from components/TuesdayReportPreview.tsx so this page never
          drifts from the in-product sample. */}
      <section className="bg-white border-b border-ink-100">
        <div className="mx-auto max-w-3xl px-6 py-14 sm:py-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600 text-center">
            See the actual product
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 text-center sm:text-4xl">
            What a real edition looks like.
          </h2>
          <p className="mt-4 mx-auto max-w-2xl text-sm leading-relaxed text-ink-600 text-center">
            The Tier 1 + Tier 2 numbers below are this week&apos;s live
            federal values; the events tier is a real, source-linked
            back-issue from another corridor, shown so you see exactly what
            lands. Yours covers your corridor.
          </p>
          <div className="mt-8">
            <TuesdayReportPreview
              corridorLabel="Your corridor"
              serviceRadius="100 miles"
              psciValue={PSCI_SNAPSHOT.value}
              psciAsOf={formatAsOfDate(PSCI_SNAPSHOT.asOf)}
              psciWowPct={PSCI_SNAPSHOT.wowPct}
              psciComponents={PSCI_COMPONENTS}
              psciForecast={PSCI_FORECAST}
            />
          </div>
        </div>
      </section>

      {/* SIGN-UP - free for claimed vendors */}
      <section className="bg-ink-50/60 border-b border-ink-100">
        <div className="mx-auto max-w-3xl px-6 py-14 sm:py-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            Free for claimed vendors
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            Get the Tuesday Report.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-700">
            The Tuesday Report is in build, and it is free for claimed
            vendors. Add your email and we will send the first edition to your
            corridor the moment it ships. No card, no charge.
          </p>

          <div className="mt-8">
            <TuesdayReportReserveForm />
          </div>
        </div>
      </section>

      {/* FAQ - lightweight, the standalone-page questions vendors ask. */}
      <section className="bg-white">
        <div className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
          <h2 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            Common questions
          </h2>
          <div className="mt-10">
            {[
              {
                q: "Is there really something new every week?",
                a: "Yes - because two things are always in it. Your corridor's cost and fuel direction moves every week, so that read is never the same twice. On top of that, we flag local moves worth acting on within 150 miles - new DCs, closures, competitor shifts. Those don't happen every week, and when a category is quiet we say so plainly. We don't manufacture news to fill space. What you get is someone watching your corridor every week so you don't have to, and telling you when something matters.",
              },
              {
                q: "When does the first edition ship?",
                a: "We have not committed a ship date. The Tuesday Report is in build - signing up puts you first in line for the first edition to your corridor. It is free, no charge.",
              },
              {
                q: "Is this the same as the Tuesday Read I see in the footer?",
                a: "No. The Tuesday Read is the buyer email at /tuesday-read - national PSCI plus a plain-English read on what moved that week. The Tuesday Report is the VENDOR brief - a per-corridor sales-development read with events scoped to your yard. Both are free; two distinct products, two distinct audiences.",
              },
              {
                q: "Isn't this just industry news I could find elsewhere?",
                a: "No - it's tuned to one corridor, yours, not an industry-wide roundup. The cost tiers carry the read every week; the events tier is reported, every claim source-linked, quiet weeks said so. It's an intelligence brief built for your 150 miles, watched for you - not general commentary you'd skim and forget.",
              },
              {
                q: "Will my listing change if I sign up?",
                a: "Not without your action. Signing up is just an email - it doesn't claim or modify your listing on the network. You claim your listing separately on /vendors.",
              },
              {
                q: "Is it really free?",
                a: "Yes. The Tuesday Report is free for claimed vendors. No card, no charge. Stop anytime by replying unsubscribe.",
              },
            ].map((item, i) => (
              <details
                key={i}
                className="group border-b border-ink-200 py-6 first:border-t first:border-t-ink-200 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer items-start justify-between gap-6 list-none">
                  <span className="text-lg font-semibold text-ink-900 group-hover:text-brand-700 transition-colors text-left">
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
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CLOSE - claim cross-link */}
      <section className="relative overflow-hidden bg-ink-900 text-white border-y-2 border-brand-500">
        <DarkBarFx />
        <div className="relative z-10 mx-auto max-w-4xl px-6 py-14 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-300">
            Already on the network
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Claim your listing first.
          </h2>
          <p className="mt-4 mx-auto max-w-xl text-sm leading-relaxed text-ink-300">
            Your business is already on the Pallet Solutions Vendor Network
            from public records. Claim your listing - 60 seconds, free - so
            buyers find you established when they search your area.
          </p>
          <div className="mt-7">
            <Link
              href="/vendors"
              className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              Claim your listing
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
