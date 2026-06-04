import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import DarkBarFx from "@/components/DarkBarFx";
import Reveal from "@/components/Reveal";
import FaqAccordion from "@/components/FaqAccordion";

export const metadata: Metadata = {
  title: "Procurement Intelligence | Pallet Solutions",
  description:
    "We publish PSCI, the only publicly-available reproducible pallet cost-input index - federal data, audit-ready citations. It is the read behind our managed pallet sourcing. See what's moving, or have us run your program end to end.",
};

// The three doors. Language reflects each one's actual scope: cost
// intelligence = YOUR regions (free, credibility halo), Tuesday Read =
// NATIONAL (free), Managed = run for you (the product we sell).
const DOORS: {
  eyebrow: string;
  heading: string;
  detail: string;
  cta: string;
  href: string;
  primary?: boolean;
}[] = [
  {
    eyebrow: "Free · your regions",
    heading: "See what's moving in your market",
    detail:
      "We publish PSCI™ weighted to the regions your DCs operate in - a per-region read, a 30-day forecast, and the federal sources behind every number. The cost intelligence we bring to a managed program.",
    cta: "See what's moving",
    href: "/market-pulse",
    primary: true,
  },
  {
    eyebrow: "Free · national",
    heading: "Just want what's moving nationally?",
    detail:
      "The Tuesday Read is a free weekly email - the national PSCI™ value and a plain-English read on what moved that week. No subscription, no regions to pick.",
    cta: "Get the Tuesday Read",
    href: "/tuesday-read",
  },
  {
    eyebrow: "Done-for-you",
    heading: "Want us to run it for you?",
    detail:
      "Managed Programs runs the sourcing lifecycle end-to-end across your DCs - sourcing, POs, BOLs, disputes, and consolidated invoicing. Quoted per engagement.",
    cta: "See Managed Programs",
    href: "/sourcing",
  },
];

const HEADER_STATS = [
  {
    label: "BLS · EIA",
    title: "Federal series tracked",
    detail: "Lumber, diesel, wages, OCC",
  },
  {
    label: "Weekly",
    title: "PSCI™ update cadence",
    detail: "Tuesdays, with the Tuesday Read",
  },
  {
    label: "30 days",
    title: "Forward projection",
    detail: "TimesFM 2.5 with 80% CI",
  },
  {
    label: "CC0",
    title: "Public-domain series",
    detail: "The full PSCI™ history is free to download",
  },
];

const VALUE_BULLETS = [
  {
    heading: "30-day forward projection per region",
    body: "TimesFM 2.5 with an 80% confidence band on lumber, diesel, labor, and OCC. The only published forward signal in the pallet cost category, in the regions you actually operate in.",
  },
  {
    heading: "Per-region read, every week",
    body: "Each region gets its own read - what is moving, what the 30-day forecast says, where the cost-basis trend is heading. Your team sees the signal and makes the call.",
  },
  {
    heading: "Audit-defensible citations on every value",
    body: "PSCI™ cites directly to BLS and EIA series IDs with the published formula and weights. Bring the federal source into your audit, your category review, your CFO briefing without reverse-engineering where the number came from.",
  },
];

const FAQ_ITEMS = [
  {
    q: "Is the cost intelligence something I pay for?",
    a: "No. PSCI™, the regional read, the 30-day forecast, and the published methodology are open - the composite formula, the weights, and the federal source IDs are all disclosed so you can verify or rebuild every number yourself. We publish it as proof of how we work. What we sell is the managed program: running your pallet sourcing end-to-end across your DCs.",
  },
  {
    q: "How is the regional read different from the free Tuesday Read?",
    a: "The Tuesday Read is national - one PSCI™ value for the whole country, plus a plain-English read on what moved. The regional read weights PSCI to the individual regions your DCs operate in, with a 30-day forecast. Both are free and federally cited; the regional read is the deeper cut.",
  },
  {
    q: "How does this connect to your managed programs?",
    a: "It is the same intelligence we bring to a managed engagement. We publish it openly because publishing the math is what makes our managed sourcing audit-defensible. If you want us to run sourcing across your DCs, that is the managed program.",
    link: {
      label: "See managed programs",
      href: "/sourcing",
    },
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

export default function ProcurementPage() {
  return (
    <>
      {/* HERO - "why we publish the math" proof lead. Same grounded depth as the sourcing
          and RFP heroes: single-hue grid (structure) under a low-opacity blue
          light source (support), grid radial-masked so it fades at the edges.
          No AI-gradient look. Pure CSS - no fetch, no layout shift. */}
      <section className="relative overflow-hidden bg-white">
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
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 -right-32 h-[680px] w-[680px] rounded-full bg-brand-500/[0.10] blur-[130px]"
        />
        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-12 sm:pt-28 sm:pb-12">
          <div className="max-w-4xl">
            <p className="text-base font-semibold uppercase tracking-[0.22em] text-brand-500">
              Why we publish the math
            </p>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl sm:leading-[1.05]">
              We publish the cost math. It&apos;s what makes our managed
              sourcing audit-defensible.
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-relaxed text-ink-600">
              PSCI™ is the only publicly-available, reproducible cost-input
              index for pallets - federal data, a published formula, audit-ready
              citations. It is the read we bring to a managed program, not a
              product you buy.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/sourcing"
                className="group inline-flex items-center gap-2 rounded-md bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02] hover:bg-brand-600"
              >
                See how we run managed programs
                <ArrowRight />
              </Link>
              <Link
                href="/rfp"
                className="group inline-flex items-center gap-2 rounded-md border border-ink-300 bg-white px-6 py-3 text-sm font-semibold text-ink-800 transition-colors hover:border-brand-400 hover:text-brand-700"
              >
                Add us to your RFQ
                <ArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* THE DOORS - moved to the top. One clear start per buyer, language
          matched to scope (your market / national / run for you). */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 pb-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            Where do you want to start?
          </p>
          <Reveal className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-5">
            {DOORS.map((d, i) => (
              <div
                key={d.heading}
                className="reveal-item h-full"
                style={{ "--i": i } as CSSProperties}
              >
                <Link
                  href={d.href}
                  className={
                    d.primary
                      ? "group flex h-full flex-col rounded-2xl border-2 border-brand-500 bg-brand-50/50 p-6 transition-all duration-200 hover:-translate-y-1 hover:bg-brand-50 hover:shadow-lg hover:shadow-ink-900/10"
                      : "group flex h-full flex-col rounded-2xl border border-ink-200 bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-brand-400 hover:bg-brand-50/30 hover:shadow-lg hover:shadow-ink-900/10"
                  }
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
                    {d.eyebrow}
                  </p>
                  <h2 className="mt-3 text-lg font-bold text-ink-900 leading-snug">
                    {d.heading}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-ink-700 flex-1">
                    {d.detail}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 group-hover:text-brand-700 transition-colors">
                    {d.cta}
                    <ArrowRight />
                  </span>
                </Link>
              </div>
            ))}
          </Reveal>

          {/* Larry: proof-first. Dana: single-DC off-ramp. */}
          <p className="mt-7 text-sm leading-relaxed text-ink-600">
            Need the proof first?{" "}
            <Link
              href="/methodology"
              className="font-semibold text-brand-600 hover:text-brand-700 underline underline-offset-2"
            >
              Read the PSCI™ methodology
            </Link>{" "}
            or{" "}
            <Link
              href="/psci"
              className="font-semibold text-brand-600 hover:text-brand-700 underline underline-offset-2"
            >
              cite PSCI in your RFQ
            </Link>
            . Sourcing a single DC?{" "}
            <Link
              href="/find-a-vendor"
              className="font-semibold text-brand-600 hover:text-brand-700 underline underline-offset-2"
            >
              Find vendors near you
            </Link>{" "}
            or{" "}
            <Link
              href="/rfp"
              className="font-semibold text-brand-600 hover:text-brand-700 underline underline-offset-2"
            >
              add us to your RFQ
            </Link>
            . Running a large or multi-region program?{" "}
            <Link
              href="/contact"
              className="font-semibold text-brand-600 hover:text-brand-700 underline underline-offset-2"
            >
              Talk to us
            </Link>
            .
          </p>
        </div>
      </section>

      {/* WHAT MARKET PULSE DELIVERS - value statement + 4-bullet grid.
          Moved directly under the doors so the Market Pulse door isn't
          abstract; stat bar now follows this. Banded off-white to break the
          white-on-white blend down this stretch. */}
      <section className="bg-[#FAFBFC] border-t border-ink-100">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="max-w-4xl">
            <h2 className="text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl sm:leading-[1.05]">
              What the cost intelligence shows.
            </h2>
            <p className="mt-7 max-w-3xl text-lg leading-relaxed text-ink-700">
              It answers three questions a procurement team needs, in a format
              an auditor can cite. The same read we bring to a managed program,
              published openly as proof of how we work.
            </p>

            <div className="mt-9 max-w-3xl rounded-2xl border border-brand-200 bg-brand-50/60 p-7 sm:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-700">
                Three questions, every week
              </p>
              <Reveal className="mt-5 space-y-4">
                {[
                  "What is changing in your cost inputs this week",
                  "What is coming over the next 30 days",
                  "How to defend the number to your auditor",
                ].map((q, i) => (
                  <div
                    key={i}
                    className="reveal-item flex items-start gap-4"
                    style={{ "--i": i } as CSSProperties}
                  >
                    <span
                      className="reveal-pop shrink-0 mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white"
                      style={{ "--i": i } as CSSProperties}
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>
                    <span className="text-base sm:text-lg text-ink-800 leading-snug">
                      {q}
                    </span>
                  </div>
                ))}
              </Reveal>
            </div>
          </div>

          <Reveal className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 max-w-5xl">
            {VALUE_BULLETS.map((b, i) => (
              <div
                key={i}
                className="reveal-item flex items-start gap-4"
                style={{ "--i": i } as CSSProperties}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="reveal-pop shrink-0 mt-1 text-brand-500"
                  style={{ "--i": i } as CSSProperties}
                  aria-hidden="true"
                >
                  <path d="M5 13 L9 17 L19 7" />
                </svg>
                <div>
                  <h3 className="text-lg font-semibold text-ink-900">
                    {b.heading}
                  </h3>
                  <p className="mt-2 text-base leading-relaxed text-ink-700">
                    {b.body}
                  </p>
                </div>
              </div>
            ))}
          </Reveal>

          <div className="mt-12 flex flex-wrap items-center gap-4">
            <Link
              href="/market-pulse"
              className="group inline-flex items-center gap-2 rounded-md border border-ink-300 bg-white px-6 py-3 text-sm font-semibold text-ink-800 transition-colors hover:border-brand-400 hover:text-brand-700"
            >
              See what&apos;s moving
              <ArrowRight />
            </Link>
            <Link
              href="/sourcing"
              className="group inline-flex items-center gap-2 rounded-md bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02] hover:bg-brand-600"
            >
              See managed programs
              <ArrowRight />
            </Link>
          </div>
        </div>
      </section>

      {/* CREDENTIALING STAT BAR - the "how it works" facts, now after the
          reader knows what the product is. */}
      <section className="bg-ink-50 border-y border-ink-200">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-8">
            {HEADER_STATS.map((s) => (
              <div key={s.label}>
                <p className="text-sm font-semibold text-brand-600">
                  {s.label}
                </p>
                <p className="mt-2 text-base font-semibold text-ink-900">
                  {s.title}
                </p>
                <p className="mt-1 text-sm text-ink-600">{s.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY WE PUBLISH THE MATH - credibility halo. The cost index is free,
          published proof of how we work; it ladders back to the managed
          program, which is what we sell. No pricing, no competitor table. */}
      <section className="bg-white border-t border-ink-100">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-5xl rounded-2xl bg-ink-900 p-8 sm:p-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-300">
              Why we publish the math
            </p>
            <h2 className="mt-5 text-3xl sm:text-4xl font-bold tracking-tight text-white">
              The cost index is free. It is what makes our managed sourcing
              audit-defensible.
            </h2>

            <p className="mt-6 text-base leading-relaxed text-ink-300 max-w-3xl">
              Most pallet companies cannot show their work. We publish PSCI™ -
              the composite, the weights, the federal source IDs, the regional
              read, and the methodology - openly, so a procurement team can
              trace every number we put in front of them. That is the same
              intelligence we bring to a managed program. The index is proof of
              caliber; the managed program is what we run for you.
            </p>

            <div className="mt-10 pt-8 border-t-2 border-brand-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
              <p className="text-base leading-relaxed text-ink-200 max-w-xl">
                If you run pallets across multiple DCs, this is the read we
                bring to the program - sourcing, POs, BOLs, disputes, and
                consolidated invoicing, run end-to-end.
              </p>
              <Link
                href="/sourcing"
                className="group inline-flex items-center gap-2 rounded-md bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02] hover:bg-brand-600 whitespace-nowrap shrink-0"
              >
                See managed programs
                <ArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ - last objection-handler before final CTA */}
      <section className="bg-[#FAFBFC] border-t border-ink-100">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <h2 className="text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
            Frequently asked questions
          </h2>

          <FaqAccordion items={FAQ_ITEMS} />
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden bg-ink-900 text-white border-y-2 border-brand-500">
        <DarkBarFx />
        <div className="relative z-10 mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            See how we would run it.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-ink-300 max-w-2xl mx-auto">
            Twenty-minute call: we walk through the methodology and the cost
            read for your category, and how a managed program runs across your
            DCs. No obligation.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/sourcing"
              className="group inline-flex items-center gap-2 rounded-md bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02] hover:bg-brand-600"
            >
              See managed programs
              <ArrowRight />
            </Link>
            <Link
              href="/methodology"
              className="group inline-flex items-center gap-2 rounded-md border border-ink-700 bg-ink-900 px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02] hover:border-ink-500"
            >
              Read the methodology
              <ArrowRight />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
