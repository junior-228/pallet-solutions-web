import type { Metadata } from "next";
import type { CSSProperties } from "react";
import VendorJourneyPrototype from "@/components/VendorJourneyPrototype";
import DarkBarFx from "@/components/DarkBarFx";
import Reveal from "@/components/Reveal";
import FaqAccordion from "@/components/FaqAccordion";
import {
  PSCI_SNAPSHOT,
  PSCI_COMPONENTS,
  PSCI_FORECAST,
  formatAsOfDate,
} from "@/lib/psci";

export const metadata: Metadata = {
  title: "Claim your vendor listing | Pallet Solutions",
  description:
    "Pallet Solutions maps every pallet vendor in North America from public records. Find your business on the map, claim it free in 60 seconds, control what buyers see - service area, hours, capabilities, contact method.",
};

// ---------------------------------------------------------------------------
// /vendors - PRODUCTION vendor-facing page.
//
// Promoted 2026-05-23 from /vendors-prototype after design validation.
// Reuses the VendorJourneyPrototype component (map + search + claim
// wizard + corridor + market signals + Tuesday Report close) as the
// interactive centerpiece. The sandbox copy stays at /vendors-prototype
// for now in case parallel iteration is needed - both pages render the
// same component so they cannot drift visually.
//
// === BACKEND WIRING STATUS (live) ===
//
// The claim flow is built and live: vendor-claim.js (Supabase claim_vendor
// RPC, authoritative, with Airtable backfill) handles claim submit + Resend
// confirmation, and the tuesday_report_waitlist capture. Map rendering,
// real vendor typeahead (vendor-typeahead.js), the claim wizard, corridor
// visualization, and the Tuesday Report sign-up are all wired.
//
// === VENDOR-ONLY PAGE RULE (locked 2026-05-23) ===
//
// Per VendorJourneyPrototype.tsx header: only the searched vendor's
// own pin is rendered with a click target; neighbor pins are visible
// status-color context but not clickable. Browsing neighbor cards is
// buyer behavior and lives on the future Vendor Network (buyer) tab,
// not here. Do not re-wire neighbor clicks on this page.
// ---------------------------------------------------------------------------

export default function VendorsPage() {
  return (
    <>
      {/* HERO - compressed 2026-05-23. The stats band that used to sit
          between hero and map was breaking the buyer's intent at exactly
          the moment they wanted to act. Hero shrunk + stats moved below
          the before/after section as social proof, not interruption. */}
      {/* HERO - flows straight into the search box below (no border, tight
          bottom padding). The old "Find and claim your listing" button was
          removed 2026-05-28: it only scrolled down to the search bar, which
          was redundant. The search bar IS the primary CTA now. */}
      <section className="relative overflow-hidden">
        {/* Grounded depth like the other heroes: single-hue grid + low-opacity
            blue glow, grid radial-masked so it fades at the edges. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(73,165,193,0.13) 1px, transparent 1px), linear-gradient(to bottom, rgba(73,165,193,0.13) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(ellipse 80% 80% at 50% 42%, #000 46%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 80% at 50% 42%, #000 46%, transparent 100%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 -right-32 h-[640px] w-[640px] rounded-full bg-brand-500/[0.10] blur-[130px]"
        />
        <div className="relative z-10 mx-auto max-w-6xl px-6 pt-12 pb-6 sm:pt-16 sm:pb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            For pallet vendors
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl sm:leading-[1.05]">
            Your business is in the{" "}
            <span className="text-brand-500">network</span>.
          </h1>
          {/* Three vendor paths - claim, get reached, stay in control. The
              third is an ongoing state, not a sequential step, so NO connecting
              line; the stagger carries it. */}
          <Reveal className="mt-6 max-w-2xl">
            <ol className="space-y-4">
              <li
                className="reveal-item flex items-start gap-3"
                style={{ "--i": 0 } as CSSProperties}
              >
                <span
                  className="reveal-pop shrink-0 mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white"
                  style={{ "--i": 0 } as CSSProperties}
                  aria-hidden="true"
                >
                  1
                </span>
                <span className="text-base leading-relaxed text-ink-700">
                  <span className="font-semibold text-ink-900">
                    Claim your listing
                  </span>{" "}
                  - claim in 60 seconds; we confirm and publish. Free, and you
                  control what buyers see.
                </span>
              </li>
              <li
                className="reveal-item flex items-start gap-3"
                style={{ "--i": 1 } as CSSProperties}
              >
                <span
                  className="reveal-pop shrink-0 mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white"
                  style={{ "--i": 1 } as CSSProperties}
                  aria-hidden="true"
                >
                  2
                </span>
                <span className="text-base leading-relaxed text-ink-700">
                  <span className="font-semibold text-ink-900">
                    Buyers reach you directly
                  </span>{" "}
                  - a claimed listing lets a buyer send their need straight to
                  you, instead of you chasing the lead.
                </span>
              </li>
              <li
                className="reveal-item flex items-start gap-3"
                style={{ "--i": 2 } as CSSProperties}
              >
                <span
                  className="reveal-pop shrink-0 mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white"
                  style={{ "--i": 2 } as CSSProperties}
                  aria-hidden="true"
                >
                  3
                </span>
                <span className="text-base leading-relaxed text-ink-700">
                  <span className="font-semibold text-ink-900">
                    You stay in control
                  </span>{" "}
                  - update your service area, hours, capabilities, and contact
                  info anytime.
                </span>
              </li>
            </ol>
          </Reveal>
          <p className="mt-5 text-sm font-medium text-ink-600">
            Claiming is free - no card, no contract.
          </p>

          {/* Free Tuesday Report value, surfaced at the claim decision so the
              vendor sees what claiming gets them before they search. */}
          <div className="mt-7 max-w-2xl rounded-xl border border-brand-200 bg-brand-50/50 p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-700">
              Claim free, get the Tuesday Report
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink-700">
              Claim your free listing and get the Tuesday Report - a free weekly
              read on what&apos;s moving in your corridor: pallet and fuel costs,
              new DCs, closures, and competitor moves, watched for you so you can
              spend your time selling.
            </p>
          </div>
        </div>
      </section>

      {/* SEE YOURSELF - THE INTERACTIVE CENTERPIECE.
          Full vendor journey client component: map + search + public card
          + claim wizard + corridor + market signals + Tuesday Report waitlist
          + confirmation. All in one continuous experience on the right-side
          detail panel beside the map.

          PSCI props passed from server -> client so the post-claim Tuesday
          Report section can show the real current value (lib/psci reads
          data/psci_latest.json at build time, server-only). */}
      <VendorJourneyPrototype
        psciValue={PSCI_SNAPSHOT.value}
        psciAsOf={formatAsOfDate(PSCI_SNAPSHOT.asOf)}
        psciWowPct={PSCI_SNAPSHOT.wowPct}
        psciComponents={PSCI_COMPONENTS}
        psciForecast={PSCI_FORECAST}
      />

      {/* BEFORE/AFTER section removed 2026-05-28: the live demonstration now
          carries this job. The default-state panel shows a rich sample
          claimed listing on first paint, and the claim step shows the live
          gray -> green transformation as the vendor fills fields. The
          static two-card before/after was redundant with both. */}

      {/* STATS BAND - three honest stats. Social proof of the network the
          vendor just saw, not a vanity counter blocking the path to
          action. */}
      <section className="relative overflow-hidden bg-ink-900 text-white border-y-2 border-brand-500">
        <DarkBarFx />
        <div className="relative z-10 mx-auto max-w-6xl px-6 py-12 sm:py-14">
          <Reveal className="grid gap-8 sm:grid-cols-3">
            <div className="reveal-item" style={{ "--i": 0 } as CSSProperties}>
              <p className="text-4xl font-bold tracking-tight text-brand-400 tabular-nums">
                7,500+
              </p>
              <p className="mt-3 text-base font-semibold text-white">
                Vendors mapped
              </p>
              <p className="mt-1 text-sm text-ink-400">
                US, Canada, Mexico, Europe
              </p>
            </div>
            <div className="reveal-item" style={{ "--i": 1 } as CSSProperties}>
              <p className="text-4xl font-bold tracking-tight text-brand-400 tabular-nums">
                60 sec
              </p>
              <p className="mt-3 text-base font-semibold text-white">
                To claim your listing
              </p>
              <p className="mt-1 text-sm text-ink-400">
                We confirm, then publish
              </p>
            </div>
            <div className="reveal-item" style={{ "--i": 2 } as CSSProperties}>
              <p className="text-4xl font-bold tracking-tight text-brand-400 tabular-nums">
                Free
              </p>
              <p className="mt-3 text-base font-semibold text-white">
                To claim and control your listing
              </p>
              <p className="mt-1 text-sm text-ink-400">
                No card, no contract
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* HOW-CLAIMING-WORKS and WHY-WE-MAP sections removed 2026-05-28 for
          Tesla-style simplicity. The interactive wizard already walks the
          vendor through the steps live, and the "this is where procurement
          finds you" motivation is folded into the hero subcopy. Page is now
          hero -> find/add/claim -> stats strip -> FAQ. */}

      {/* FAQ - claim-focused. */}
      <section className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <h2 className="text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
            Frequently asked questions
          </h2>
          <FaqAccordion
            items={[
              {
                q: "What if I'm not on the map yet?",
                a: "Most active pallet vendors are auto-listed from public business records. If yours doesn't appear when you search, hit \"Add my business\" right there - give us the basics and you go straight into claiming it. Takes seconds, no email back-and-forth.",
              },
              {
                q: "Do I have to commit to anything?",
                a: "No. Listed is automatic - nothing to sign. Claimed is free and you can update or remove your listing anytime by emailing info@palletsolutionsusa.com. No contract, no renewal email.",
              },
              {
                q: "What is the Tuesday Report?",
                a: "A free weekly read for claimed vendors. Each week it tells you where your pallet and fuel costs are heading, and flags any local moves worth acting on within 150 miles of your yard - new DCs, closures, competitor shifts. It's the outside view of your market, watched for you, so you spend your time selling instead of scanning. It's still in build. Claim your listing and you'll be on the list to receive it.",
                link: {
                  label: "See a sample edition",
                  href: "/tuesday-report",
                },
              },
              {
                q: "Is there really something new every week?",
                a: "Yes - because two things are always in it. Your corridor's cost and fuel direction moves every week, so that read is never the same twice. On top of that, we flag local moves worth acting on within 150 miles - new DCs, closures, competitor shifts. Those don't happen every week, and when a category is quiet we say so plainly. We don't manufacture news to fill space. What you're paying for is someone watching your corridor every week so you don't have to, and telling you when something matters.",
              },
              {
                q: "How does my contact info appear?",
                a: "However you set it when you claim - phone, email, or both. Contact info is never displayed openly on the map. A buyer reveals it only after picking you (up to 3 per search) and confirming their own email - one engagement at a time, never bulk-harvested or crawled.",
              },
              {
                q: "What happens after I submit my claim?",
                a: "We call within one business day to introduce ourselves and walk through the rest of your profile - service area, capabilities, hours, treatments. Your claimed listing publishes right after we connect.",
              },
              {
                q: "Can I remove my listing entirely?",
                a: "Yes. Email info@palletsolutionsusa.com to remove your listing - Listed or Claimed - and we'll take it down within one business day. No retention games.",
              },
            ]}
          />
        </div>
      </section>
    </>
  );
}
