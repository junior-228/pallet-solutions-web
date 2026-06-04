import type { Metadata } from "next";
import VendorLivePreview from "@/components/VendorLivePreview";
import VendorJourneyPrototype from "@/components/VendorJourneyPrototype";
import { PSCI_SNAPSHOT, formatAsOfDate } from "@/lib/psci";

export const metadata: Metadata = {
  title: "Vendor journey prototype | Pallet Solutions",
  description:
    "Clickable design prototype of the full vendor journey -- see yourself on the map, claim, confirm corridor, select market signals, Tuesday Report close. Mock data only.",
  robots: { index: false, follow: false },
};

// ---------------------------------------------------------------------------
// /vendors-prototype -- DESIGN PROTOTYPE (2026-05-22)
//
// Clickable mock of the full vendor journey, end to end on one page.
// Built so Rob can walk hero -> see yourself (map) -> before/after ->
// how it works -> claim -> corridor -> configurator -> Tuesday Report
// close -- and critique the journey before any of it ships to production.
//
// === MOCK DATA ONLY ===
//
// All 30 vendors on the map are baked into VendorJourneyPrototype.tsx.
// No live Airtable/Supabase wiring. Submissions don't go anywhere --
// they just advance the wizard state. This is by design, not a TODO.
//
// === WHAT IS LIVE VS WHAT IS MOCK ===
//
// LIVE:
//   - Map rendering (react-simple-maps, US topojson from CDN)
//   - Pin interactivity (click -> open card, pulse animation)
//   - Search typeahead (filters mock vendors by name/city/state)
//   - Claim wizard state machine (advances steps, validates name/email)
//   - Corridor visualization (~50mi circle around selected pin)
//   - Configurator checkboxes
//   - Tuesday Report waitlist offer with skip path
//   - "Done" state flips the selected pin from gray to green
//
// MOCK:
//   - Vendor data (30 fictional vendors with realistic-feeling names)
//   - Claim submission (no Airtable write)
//   - Waitlist signup (no Supabase write, no Resend email)
//
// === WHEN THIS GOES TO PRODUCTION ===
//
// The map + flow logic from VendorJourneyPrototype.tsx can be lifted onto
// the network site (network.palletsolutionsusa.com) where the real
// Airtable data + Netlify functions live. The marketing /vendors page
// would link out to that production version. Per the build brief:
// "deferring this production decision; for designing the journey, a
// realistic mock is exactly right."
//
// === STATS BAND NOTE ===
//
// Kept the "Free for life if claimed before Oct 31, 2026" stat per the
// brief's explicit "keep" instruction. This CONFLICTS with the recent
// (2026-05-22) decision that Claimed is just free permanently, no
// time-limit. Flagged for Rob to reconcile before this design ships.
// ---------------------------------------------------------------------------

export default function VendorsPrototypePage() {
  return (
    <>
      {/* PROTOTYPE BANNER -- visible at the very top so Rob knows
          immediately that this is the design prototype, not production. */}
      <div className="bg-amber-500 text-white text-center py-2 text-xs font-semibold tracking-wide">
        DESIGN PROTOTYPE -- mock data only. Click any pin to walk the
        journey. The production /vendors page is unchanged.
      </div>

      {/* HERO -- present-state, records-correction framing. One CTA. */}
      <section className="border-b border-ink-100">
        <div className="mx-auto max-w-6xl px-6 pt-16 pb-16 sm:pt-24 sm:pb-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            For pallet vendors
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl sm:leading-[1.08]">
            Your business is in the network.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-ink-700">
            Pallet Solutions maps every pallet vendor in North America from
            public records. Yours is one of them. What anyone searching
            finds depends on whether you&apos;ve taken 60 seconds to claim it.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a
              href="#see-yourself"
              className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              Find and claim your listing
              <span aria-hidden="true">→</span>
            </a>
            <span className="text-sm text-ink-600">
              Free for life if claimed before Oct 31, 2026.
            </span>
          </div>
        </div>
      </section>

      {/* STATS BAND -- three honest stats. NOTE: "Free for life" stat
          kept per the brief's explicit instruction, even though it
          conflicts with the more recent permanent-free-claim decision.
          See header comment for the conflict flag. */}
      <section className="bg-ink-900 text-white">
        <div className="mx-auto max-w-6xl px-6 py-12 sm:py-14">
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
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
            <div>
              <p className="text-4xl font-bold tracking-tight text-brand-400 tabular-nums">
                60 sec
              </p>
              <p className="mt-3 text-base font-semibold text-white">
                To claim your listing
              </p>
              <p className="mt-1 text-sm text-ink-400">
                Self-serve, no sales call
              </p>
            </div>
            <div>
              <p className="text-4xl font-bold tracking-tight text-brand-400 tabular-nums">
                Free for life
              </p>
              <p className="mt-3 text-base font-semibold text-white">
                If claimed before{" "}
                <span className="text-brand-300">Oct 31, 2026</span>
              </p>
              <p className="mt-1 text-sm text-ink-400">
                Founding period -- lock in your free spot
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SEE YOURSELF -- THE INTERACTIVE CENTERPIECE.
          Full vendor journey client component: map + search + public card
          + claim wizard + corridor + configurator + Tuesday Report waitlist
          + confirmation. All in one continuous experience on the right-side
          detail panel beside the map.

          PSCI props passed from server -> client so the post-claim
          section can show the real current value (lib/psci reads
          data/psci_latest.json at build time, server-only). */}
      <VendorJourneyPrototype
        psciValue={PSCI_SNAPSHOT.value}
        psciAsOf={formatAsOfDate(PSCI_SNAPSHOT.asOf)}
        psciWowPct={PSCI_SNAPSHOT.wowPct}
      />

      {/* BEFORE/AFTER -- the explainer. The "see yourself" section above
          is the real demonstration; this section is the visual reference
          for what claiming changes about the public card. */}
      <section className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            What claiming changes
          </p>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            Here&apos;s what the difference looks like.
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-ink-700">
            The default listing on the left (public records only), the
            version you&apos;d control on the right. Sample vendor. The
            same swap happens to your card when you claim above.
          </p>
          <div className="mt-10">
            <VendorLivePreview />
          </div>
        </div>
      </section>

      {/* HOW CLAIMING WORKS -- 4 steps. Kept from production /vendors
          (the brief said this is correct). */}
      <section className="border-b border-ink-100 bg-ink-50/60">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="max-w-4xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
              How claiming works
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
              From finding your listing to controlling what it shows.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-ink-700">
              No sales call to start. Four steps, sixty seconds for the
              basics, and an intro call to walk through the rest.
            </p>

            <ol className="mt-12 space-y-8">
              {[
                {
                  n: "01",
                  heading: "Find your business",
                  body: "Search by name on the map above. We&apos;ve mapped pallet vendors across North America from public records -- it&apos;s probably already there.",
                },
                {
                  n: "02",
                  heading: "Submit your primary contact",
                  body: "Add your name, email, phone, and classification -- about sixty seconds of typing. We capture the rest of your profile (service area, capabilities, hours, treatments) on the intro call.",
                },
                {
                  n: "03",
                  heading: "Intro call",
                  body: "We call within one business day to introduce ourselves and walk through the rest of your profile by phone. The conversation is how every Pallet Solutions vendor relationship starts.",
                },
                {
                  n: "04",
                  heading: "Your listing publishes",
                  body: "Right after the intro call, your claimed version replaces the default on the map. Hours change later or you add a pallet type, email info@palletsolutionsusa.com and we update within one business day.",
                },
              ].map((step) => (
                <li key={step.n} className="flex items-start gap-5">
                  <span
                    className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white"
                    aria-hidden="true"
                  >
                    {step.n}
                  </span>
                  <div className="flex-1 pt-1">
                    <h3 className="text-lg font-semibold text-ink-900">
                      {step.heading}
                    </h3>
                    <p
                      className="mt-2 text-base leading-relaxed text-ink-700"
                      dangerouslySetInnerHTML={{ __html: step.body }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* WHY WE MAP EVERY VENDOR -- the buyer-side note, brief, dark band. */}
      <section className="bg-ink-900 text-white">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-300">
            Why we map every vendor
          </p>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            This is where procurement finds you.
          </h2>
          <p className="mt-6 max-w-3xl text-base leading-relaxed text-ink-200">
            Procurement and supply-chain teams use this network to find
            local pallet vendors directly when they have a sourcing need.
            Claiming your listing controls what they find -- your real
            service area, hours, capabilities, and how they reach you.
          </p>

          <div className="mt-10">
            <a
              href="#see-yourself"
              className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              Find your business on the map
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </section>

      {/* FAQ -- claim-focused. Kept from production /vendors. */}
      <section className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <h2 className="text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
            Frequently asked questions
          </h2>
          <div className="mt-12">
            {[
              {
                q: "What if I'm not on the map yet?",
                a: "Most active pallet vendors are auto-listed from public business records. If yours doesn't appear when you search, email info@palletsolutionsusa.com with your company name and address -- we'll add it to the network and confirm within one business day.",
              },
              {
                q: "Do I have to commit to anything?",
                a: "No. Listed is automatic -- nothing to sign. Claimed is free and you can update or remove your listing anytime by emailing info@palletsolutionsusa.com. No contract, no renewal email.",
              },
              {
                q: "What is the Tuesday Report?",
                a: "A weekly per-corridor intelligence brief tuned to the area around your yard. National cost data (lumber, diesel, wages, OCC) and a regional cost read are guaranteed every week; regional and local events show up when they happen. Every event links the source article. Quiet weeks say so -- we don't manufacture news to fill space. Optional add-on, founding cohort waitlist now open.",
              },
              {
                q: "How does my contact info appear?",
                a: "However you set it when you claim -- phone, email, or both. Contact info is never displayed openly on the map. A buyer reveals it only after picking you (up to 3 per search) and confirming their own email -- one engagement at a time, never bulk-harvested or crawled.",
              },
              {
                q: "What happens after I submit my claim?",
                a: "We call within one business day to introduce ourselves and walk through the rest of your profile -- service area, capabilities, hours, treatments. Your claimed listing publishes right after we connect.",
              },
              {
                q: "Can I remove my listing entirely?",
                a: "Yes. Email info@palletsolutionsusa.com to remove your listing -- Listed or Claimed -- and we'll take it down within one business day. No retention games.",
              },
            ].map((item, i) => (
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
