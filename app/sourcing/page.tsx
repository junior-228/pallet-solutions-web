import Link from "next/link";
import ProgramLoop from "@/components/ProgramLoop";
import ScopingForm from "@/components/ScopingForm";
import DarkBarFx from "@/components/DarkBarFx";
import HowItWorksSteps from "@/components/HowItWorksSteps";
import WorkTransferTable from "@/components/WorkTransferTable";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title:
    "Sourcing | Pallet sourcing that works for multi-DC operations",
  description:
    "One accountable operator across your full footprint. Every bid traceable to PSCI, the only public pallet cost index.",
};

const STAT_BAR = [
  {
    value: "2 weeks",
    label: "MSA to first shipment",
    descriptor: "Typical onboarding",
  },
  {
    value: "5+ hrs",
    label: "Weekly work transferred",
    descriptor: "Per managed engagement",
  },
  {
    value: "National",
    label: "Coverage",
    descriptor: "US and Canadian DC footprints",
  },
  {
    value: "PSCI™",
    label: "The cost backdrop behind every quote",
    descriptor: "Federal-sourced, independent",
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    n: "01",
    heading: "Tell us what you're trying to achieve",
    body: "Spend, consolidation, coverage, audit-defensibility - email it over, we work backwards.",
  },
  {
    n: "02",
    heading: "We source the corridor",
    body: "Local vendors within ~150 miles of each DC, each one verified - every quote traceable to the corridor PSCI™.",
  },
  {
    n: "03",
    heading: "You approve the proposal",
    body: "Per-pallet price per DC, methodology one click away. Approve, reject, or counter line by line.",
  },
  {
    n: "04",
    heading: "We run the program",
    body: "Then it's hands-off - the operating cycle below runs every period.",
  },
];

// The recurring operating cycle a buyer hands off once they approve the
// proposal. Rendered as a horizontal stepper (the program-loop diagram)
// so "we run the program" is shown, not described. Acronyms are spelled
// out in the detail line per the first-use rule (BOL, POD, PO).
const PROGRAM_LOOP = [
  {
    label: "Source",
    detail: "Corridor vendors, quotes traceable to PSCI™",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    label: "Purchase orders",
    detail: "Cut against the approved proposal",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M9 13h6" />
        <path d="M9 17h6" />
      </svg>
    ),
  },
  {
    label: "Bills of lading",
    detail: "Filed per shipment",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="8" y="2" width="8" height="4" rx="1" />
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <path d="M9 12h6" />
        <path d="M9 16h6" />
      </svg>
    ),
  },
  {
    label: "Proofs of delivery",
    detail: "Collected and matched to each load",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <path d="m22 4-10 10.01-3-3" />
      </svg>
    ),
  },
  {
    label: "Disputes & cores",
    detail: "Worked and picked up for you",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 18V6a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h1" />
        <path d="M14 9h4l4 4v4a1 1 0 0 1-1 1h-1" />
        <circle cx="6.5" cy="18.5" r="2.5" />
        <circle cx="17.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    label: "Invoice",
    detail: "One consolidated bill in your AP schema",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" />
        <path d="M8 7h8" />
        <path d="M8 11h8" />
        <path d="M8 15h5" />
      </svg>
    ),
  },
];

const WORK_TRANSFER_ROWS = [
  {
    task: "PO and BOL coordination",
    hours: "1.0 - 1.5",
    detail: "POs cut against the approved proposal, BOLs filed per shipment",
  },
  {
    task: "Delivery and dock coordination",
    hours: "1.0 - 1.5",
    detail: "Trailer arrivals, dock door assignments, late-delivery escalation, wrong-address resolution",
  },
  {
    task: "Proof-of-delivery tracking",
    hours: "0.5 - 1.0",
    detail: "PODs collected and matched against the corresponding BOL and invoice",
  },
  {
    task: "Damage, shortage, and quality disputes",
    hours: "1.0 - 2.0",
    detail: "Per-incident documentation, vendor escalation, credit recovery",
  },
  {
    task: "Core (return-pallet) pickup",
    hours: "0.5 - 1.0",
    detail: "Pickup scheduling, reverse-logistics coordination, condition grading",
  },
  {
    task: "Monthly invoice consolidation",
    hours: "1.5 - 2.0",
    detail: "One consolidated invoice in your AP schema. Vendor-invoice discrepancies resolved before they reach your books.",
  },
];

const WORK_TRANSFER_TOTAL = {
  hours: "5.5 - 9.0",
  detail: "~ one working day reclaimed",
};

const FAQ_ITEMS = [
  {
    q: "What happens to our existing vendors?",
    a: "We understand these relationships are critical. How we handle existing vendors depends on your goals for the program. Some buyers want us to go to market for fresh pricing. Others want to keep their current vendors in scope. We figure that out together at the start.",
  },
  {
    q: "How is this different from outsourcing the whole category?",
    a: "Our pricing model is per-pallet, not a monthly retainer. You see one number per pallet on your existing spreadsheet line item. No separate retainer to track, no new AP category to set up.",
  },
  {
    q: "What happens when a vendor fails?",
    a: "We document the failure, escalate to the vendor for resolution, and activate an alternate vendor in the corridor within 24 hours. If the alternate has a different rate, we surface the price delta to you for approval before it lands on an invoice.",
  },
  {
    q: "Can we start with one DC?",
    a: "Yes. Managed programs are sized for multi-DC operations, but a single-DC engagement is workable if the volume fits. For smaller-scale needs, the vendor network and direct RFQ paths may serve you better.",
  },
  {
    q: "Where does our data go?",
    a: "Operational data stays inside the engagement. We use anonymized aggregates to refine PSCI methodology. NDA covered before the first PO. Your vendor pricing and operational records never get resold.",
  },
  {
    q: "What does it cost?",
    a: "Quoted per engagement, scoped to your footprint, volume, and complexity. We discuss specifics when we scope the program.",
  },
  {
    q: "How fast can we start?",
    a: "Most programs are live within two weeks of agreement.",
  },
];

function ArrowRight() {
  return (
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
      className="transition-transform group-hover:translate-x-1"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export default function SourcingPage() {
  return (
    <>
      {/* SECTION 1 - HERO (empathetic opener serves as the hero) */}
      <section className="relative overflow-hidden bg-white">
        {/* Engineered depth, single hue. STRUCTURE first: a faint brand-blue
            thin-line grid (reads as a precise drafting surface, never an
            "AI gradient"). It fades out toward the bottom so there's no hard
            edge. Pure CSS - no fetch, no layout shift, never blocks the text. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(73,165,193,0.13) 1px, transparent 1px), linear-gradient(to bottom, rgba(73,165,193,0.13) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(ellipse 80% 74% at 50% 44%, #000 46%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 74% at 50% 44%, #000 46%, transparent 100%)",
          }}
        />
        {/* SUPPORT: one soft light source, brand blue only, ~7% opacity,
            heavily blurred and offset upper-right so it never resolves into a
            visible circle. If it ever reads as a blob, drop the opacity. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 -right-32 h-[680px] w-[680px] rounded-full bg-brand-500/[0.10] blur-[130px]"
        />
        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-20 sm:pt-28 sm:pb-24">
          <div className="max-w-4xl">
            <p className="text-base font-semibold uppercase tracking-[0.22em] text-brand-500">
              For Sourcing Teams
            </p>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl sm:leading-[1.08]">
              Twelve DCs, twelve vendors, twelve invoices? Sound familiar?
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-relaxed text-ink-600">
              Twelve vendors become one - billed the way your AP needs, with
              disputes, core pickup, and BOL chasing on us.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-600">
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
        </div>
      </section>

      {/* DARK STAT BAR */}
      <section className="relative overflow-hidden border-y-2 border-brand-500 bg-ink-900 text-white">
        <DarkBarFx />
        <div className="relative z-10 mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
            {STAT_BAR.map((stat) => (
              <div key={stat.label} className="flex flex-col">
                <p className="text-4xl font-bold tracking-tight text-brand-400">
                  {stat.value}
                </p>
                <p className="mt-3 text-base font-semibold text-white">
                  {stat.label}
                </p>
                <p className="mt-1 text-sm text-ink-400">
                  {stat.descriptor}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST / TRANSPARENCY / PARTNERSHIP - the cost story is verifiable,
          not "because of the market." Frames PSCI as the federal backdrop you
          point to (never derived from), and tees up /market-pulse as the
          weekly regional read. Proof of how we operate, not a product. */}
      <section className="bg-white border-t border-ink-100">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            Trust. Transparency. Partnership.
          </p>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            You&apos;ll never hear &quot;because of the market&quot; from us.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-700">
            That&apos;s the standard we hold ourselves to. Most pallet pricing
            comes down to taking a vendor&apos;s word for it - you shouldn&apos;t
            have to. So we publish the federal cost data behind every program we
            run, openly, as PSCI&trade;. When something moves, you see it for
            yourself, from a source that isn&apos;t ours to spin. It&apos;s just
            how we operate.
          </p>
          <Link
            href="/market-pulse"
            target="_blank"
            rel="noopener"
            className="group mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            See your region&apos;s read
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        </div>
      </section>

      {/* RFQ STRIP - early transactional off-ramp for the buyer who just
          wants to add us to a bid, not be sold a managed program. */}
      <section className="bg-white border-t border-ink-100">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <div className="rounded-xl border border-ink-200 bg-ink-50/70 px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 justify-between">
            <div className="flex-1">
              <h3 className="text-base font-semibold text-ink-900">
                Just need us on your bid list?
              </h3>
              <p className="mt-1 text-sm text-ink-700">
                Add us to your next RFQ - we respond inside your window
                with bids you can defend against PSCI™. No managed program
                required.
              </p>
            </div>
            <Link
              href="/rfp"
              className="group shrink-0 inline-flex items-center gap-2 rounded-md bg-brand-500 px-5 py-3 text-sm font-medium text-white transition-transform hover:scale-[1.02] hover:bg-brand-600"
            >
              Add us to the RFQ
              <ArrowRight />
            </Link>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS - the engagement process */}
      <section className="bg-white border-t border-ink-100">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-4xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
              How It Works
            </p>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
              From first call to ongoing program
            </h2>
            <p className="mt-5 text-base leading-relaxed text-ink-600">
              Four steps. No deck, no demo. We learn your operation, then
              we run the program with you.
            </p>

            <HowItWorksSteps steps={HOW_IT_WORKS_STEPS} />
          </div>
        </div>
      </section>

      {/* THE PROGRAM LOOP - horizontal stepper diagram. Visual replacement
          for prose describing what "we run the program" means day to day.
          Banded barely-off-white (white -> #FAFBFC -> white down this stretch)
          so the white loop card lifts off it instead of blending. */}
      <section className="bg-[#FAFBFC] border-t border-ink-100">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
              The Program Loop
            </p>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
              Approve once. This runs every cycle.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-ink-600">
              One number per pallet, billing that fits your AP. Everything
              between is on us.
            </p>
          </div>

          <ProgramLoop stages={PROGRAM_LOOP} />
        </div>
      </section>

      {/* WHAT TRANSFERS OFF YOUR TEAM - time-based value comparison */}
      <section className="bg-white border-t border-ink-100">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-4xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
              Work Transferred
            </p>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
              What transfers off your team
            </h2>
            <p className="mt-5 text-base leading-relaxed text-ink-700">
              Typical weekly operational work that moves from your team to
              ours. Aggregate range:{" "}
              <strong className="font-semibold text-ink-900">
                {WORK_TRANSFER_TOTAL.hours} hours per week
              </strong>{" "}
              for a mid-sized multi-DC engagement. RFQ cycles, contract
              management, and category strategy stay on your side.
            </p>

            <WorkTransferTable
              rows={WORK_TRANSFER_ROWS}
              total={WORK_TRANSFER_TOTAL}
            />

            <p className="mt-4 text-xs text-ink-500">
              Hours scale with your DC count and pallet grade mix. Smaller
              engagements come in at the bottom of the range; F500-scale
              programs at the top.
            </p>
          </div>
        </div>
      </section>

      {/* GET STARTED / SCOPING FORM - placed ABOVE the FAQ so the managed CTA
          is reachable before the long Q&A scroll (conversion fix 2026-06-01). */}
      <section className="relative overflow-hidden border-y-2 border-brand-500 bg-ink-900 text-white">
        <DarkBarFx />
        <div className="relative z-10 mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-400">
              Get Started
            </p>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Tell us what you're trying to solve
            </h2>
            <p className="mt-5 text-base leading-relaxed text-ink-300">
              We respond same business day with a real read on how we
              would run the engagement, what a typical timeline looks
              like, and pricing for your scope. No deck, no procurement
              consultant required.
            </p>

            <ScopingForm />

            <p className="mt-8 text-xs text-ink-400">
              Prefer email? Reach us directly at{" "}
              <a
                href="mailto:info@palletsolutionsusa.com"
                className="text-brand-400 hover:text-brand-300 underline decoration-ink-600 underline-offset-2"
              >
                info@palletsolutionsusa.com
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white border-t border-ink-100">
        <div className="mx-auto max-w-5xl px-6 py-20">
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
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
