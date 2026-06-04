import type { Metadata } from "next";
import Link from "next/link";
import VendorLivePreview from "@/components/VendorLivePreview";

export const metadata: Metadata = {
  title: "Claim your vendor listing | Pallet Solutions",
  description:
    "We mapped 7,500+ pallet vendors from public records. Claim your listing free in 60 seconds to control what it shows. Then, if you want it, get the Tuesday Report - the weekly intelligence brief tuned to your corridor.",
};

// ---------------------------------------------------------------------------
// /vendors-redesign - DESIGN DRAFT (2026-05-22)
//
// This is a redesign draft for Rob to review at localhost:3000/vendors-redesign.
// It does NOT replace the production /vendors page.
//
// === WHAT CHANGED FROM THE PRODUCTION PAGE ===
//
// 1. Tuesday Report woven into the spine. New section ("Information moves
//    in both directions") between the before/after preview and the how-
//    claiming-works steps. Frames the Report as the artifact of Layer 03
//    ("what you see"), editorially - not a pitch.
//
// 2. Hero CTA + Final CTA now point to the network-site map
//    (network.palletsolutionsusa.com/?action=claim). The in-page
//    ClaimSection component is dropped from this draft - the interactive
//    "see yourself + claim" experience moves to the network site (Option
//    B locked per the build brief). When this design ships, the CTA URL
//    must match the actual network-site route.
//
// 3. Stat bar updated. Replaced the "Free for life" stat with a Tuesday
//    Report waitlist anchor so the bar tells the full new story:
//    mapped depth + free claim + paid intel layer.
//
// 4. "How claiming works" Step 1 updated to "Find your business on the
//    map" with the network-site link. Steps 2-4 unchanged.
//
// 5. FAQ updated for the new model:
//    - Removed "What happens after October 31, 2026?" (no longer
//      time-limited offer).
//    - Replaced "Do I have to commit to anything?" framing.
//    - Added "What is the Tuesday Report?" and "Do I have to subscribe
//      to be on the network?" entries.
//
// 6. Enhanced footnote updated. Enhanced now bundles Tuesday Report +
//    four-marker verification at $49.99/mo, not "the only paid tier."
//
// === WHAT STAYED ===
//
// - The "Your business is in the network" hero copy and positional
//   thesis are untouched. Spine of the page.
// - The three-layer thesis section (what the world sees / what a buyer
//   sees / what you see) is the page's organizing argument. Kept.
// - VendorLivePreview (Sample Pallet Co before/after cards) kept as
//   the visual explainer for Layer 01 vs Layer 02. The "see yourself
//   for real" lives on the network site; the on-page demo stays as
//   the explainer.
// - The "How claiming works" 4-step (find, submit contact, intro call,
//   publishes) is the right rhythm. Kept.
// - The "Why we map every vendor" dark band (Layer-03-flavored, "this
//   is where procurement finds you") is the conversion moment. Kept,
//   CTA updated to network site.
// - Tone, voice, and editorial register held. No pitch language.
//
// === NETWORK-SITE LINK URL ===
//
// All CTAs use `https://network.palletsolutionsusa.com/?action=claim`
// as a placeholder route. The exact network-site URL depends on how
// the search-yourself + claim flow gets wired into the existing
// network site - confirm before this redesign ships to production.
// ---------------------------------------------------------------------------

const NETWORK_CLAIM_URL = "https://network.palletsolutionsusa.com/?action=claim";

export default function VendorsRedesignPage() {
  return (
    <>
      {/* HERO - present-state, records-correction framing. Tone matches
          production /vendors. CTA now drives to network-site map. */}
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
              href={NETWORK_CLAIM_URL}
              className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              Find your business on the map
              <span aria-hidden="true">→</span>
            </a>
            <span className="text-sm text-ink-600">
              Free to claim. Takes about a minute.
            </span>
          </div>
        </div>
      </section>

      {/* STAT BAR - three honest stats. New: replaced "Free for life if
          before Oct 31" stat with the Tuesday Report waitlist anchor so
          the bar tells the full new story. */}
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
                Free. Vendor-controlled. No sales call.
              </p>
            </div>
            <div>
              <p className="text-4xl font-bold tracking-tight text-brand-400 tabular-nums">
                Tuesday
              </p>
              <p className="mt-3 text-base font-semibold text-white">
                The intelligence brief
              </p>
              <p className="mt-1 text-sm text-ink-400">
                Founding-cohort waitlist open
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* THREE-LAYER SECTION - the page's organizing spine. Kept as-is
          from the production page. Layer 03 is the bridge into the new
          Tuesday Report section below. */}
      <section className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            What being in the network looks like
          </p>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            Being in this is a position, not a listing.
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-ink-700">
            Three views of the same one. What the world sees, what a buyer
            sees, what you see.
          </p>

          <div className="mt-14 space-y-14">
            {/* Layer 01 */}
            <div className="grid gap-6 md:grid-cols-[120px_1fr] md:gap-10 items-start">
              <div>
                <p className="text-6xl font-bold text-brand-500 tabular-nums leading-none">
                  01
                </p>
                <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">
                  What the world sees
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-ink-900 sm:text-2xl">
                  The default version, pulled from public records.
                </h3>
                <p className="mt-4 text-base leading-relaxed text-ink-700 max-w-2xl">
                  When the network mapped your business, it took what public
                  records had - a name, a rough address, a phone number if
                  one was on file. That&apos;s the default version of your
                  listing. It&apos;s what anyone searching your area finds,
                  if you haven&apos;t claimed it.
                </p>
              </div>
            </div>

            {/* Layer 02 */}
            <div className="grid gap-6 md:grid-cols-[120px_1fr] md:gap-10 items-start">
              <div>
                <p className="text-6xl font-bold text-brand-500 tabular-nums leading-none">
                  02
                </p>
                <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">
                  What a buyer sees
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-ink-900 sm:text-2xl">
                  The version you control, once you claim.
                </h3>
                <p className="mt-4 text-base leading-relaxed text-ink-700 max-w-2xl">
                  Once you claim, your listing carries what you set: service
                  area, hours, classification, capabilities, the contact
                  method you prefer. Buyers shortlist up to three vendors at
                  a time when they&apos;re ready to engage. Your contact
                  info reaches them then - not before. You stay reachable
                  on your terms.
                </p>
              </div>
            </div>

            {/* Layer 03 - now the bridge into Tuesday Report. Editorial
                tone preserved; no product naming inside the paragraph
                itself. The Tuesday Report section that follows IS this
                layer made concrete. */}
            <div className="grid gap-6 md:grid-cols-[120px_1fr] md:gap-10 items-start">
              <div>
                <p className="text-6xl font-bold text-brand-500 tabular-nums leading-none">
                  03
                </p>
                <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">
                  What you see
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-ink-900 sm:text-2xl">
                  Information moves in both directions.
                </h3>
                <p className="mt-4 text-base leading-relaxed text-ink-700 max-w-2xl">
                  The network is not a one-way directory. What we publish
                  about the category - cost indices, regional reads, local
                  movements - is for the vendors in it as much as for the
                  buyers. The next section is what that looks like in
                  practice for your corridor.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE PREVIEW - evidence for Layer 01 vs Layer 02. Subordinated
          to the three-layer section above, as in production. */}
      <section className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            01 alongside 02
          </p>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            Here&apos;s what the difference looks like.
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-ink-700">
            The default version on the left, the version you&apos;d control
            on the right. Sample vendor. The real version of this lives on
            the network map - find your own business and see your current
            card.
          </p>
          <div className="mt-10">
            <VendorLivePreview />
          </div>
        </div>
      </section>

      {/* TUESDAY REPORT - NEW. The Layer 03 thesis made concrete.
          Editorial tone, calm, no pitch. Three-tier guarantee surfaced
          with the honesty line. Waitlist CTA at the bottom, soft. */}
      <section className="border-b border-ink-100 bg-ink-50/60">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            The intelligence layer
          </p>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            The Tuesday Report.
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-ink-700">
            A weekly per-corridor intelligence brief tuned to the area
            around your yard. National cost data, regional movements, local
            events within ~50 miles. What&apos;s moving, when, who to call.
            The research arm of your selling, whether you have one
            salesperson or none.
          </p>

          {/* Three-tier guarantee - displayed as a clean grid, editorial
              tone, what's promised vs what's frequent-but-honest. */}
          <div className="mt-12 grid gap-6 md:grid-cols-2 max-w-5xl">
            <div className="rounded-xl border border-ink-200 border-t-4 border-t-brand-500 bg-white p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">
                Guaranteed every week
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-700">
                <li className="flex items-start gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
                  <span>
                    <strong className="font-semibold text-ink-900">National brief</strong> - federal cost data: lumber, diesel, wages, OCC. Anchored in PSCI&trade;.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
                  <span>
                    <strong className="font-semibold text-ink-900">Regional read</strong> - regional fuel, regional lumber, regional wages. Moves every week by definition.
                  </span>
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-ink-200 border-t-4 border-t-ink-400 bg-white p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-600">
                Frequent, not promised
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-700">
                <li className="flex items-start gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-400" aria-hidden="true" />
                  <span>
                    <strong className="font-semibold text-ink-900">Regional events</strong> - plant and DC activity across your region.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-400" aria-hidden="true" />
                  <span>
                    <strong className="font-semibold text-ink-900">Local corridor events</strong> - within ~50mi of your yard. A few times per month, not weekly.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Honesty line - the trust feature, set apart as a quote
              block so it lands. */}
          <blockquote className="mt-12 max-w-3xl border-l-4 border-brand-500 pl-6">
            <p className="text-lg leading-relaxed text-ink-800 italic">
              We don&apos;t manufacture news to fill space. Quiet weeks, we
              say so - a quiet corridor is itself signal.
            </p>
          </blockquote>

          {/* What's behind every item - the find-verify-link discipline,
              surfaced quietly so a procurement-savvy reader can recognize
              it. Not waved as a feature. */}
          <p className="mt-10 max-w-3xl text-base leading-relaxed text-ink-700">
            Every event in the Report links the source article. Every cost
            number traces to a public BLS or EIA series. If we can&apos;t
            verify it, it doesn&apos;t run. The discipline behind the brief
            is part of the brief.
          </p>

          {/* Waitlist CTA - soft, optional, no pricing on the headline.
              The conversation is the close, not this card. */}
          <div className="mt-12 max-w-2xl rounded-xl border border-ink-200 bg-white p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">
              Founding cohort
            </p>
            <h3 className="mt-3 text-xl font-semibold text-ink-900">
              The Report is in build. The waitlist is open.
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-700">
              Claim your listing on the map first. We call within one
              business day to walk through your profile - and the
              founding-cohort terms for the Report - on that call. Both
              steps free until you tell us to start the Report.
            </p>
            <a
              href={NETWORK_CLAIM_URL}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              Find your business on the map
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </section>

      {/* HOW CLAIMING WORKS - 4 steps, Step 1 updated to point to network
          map. Steps 2-4 unchanged from production. */}
      <section className="border-b border-ink-100 bg-white">
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
                  heading: "Find your business on the map",
                  body: (
                    <>
                      Search by company name on the{" "}
                      <a
                        href={NETWORK_CLAIM_URL}
                        className="font-semibold text-brand-700 hover:text-brand-800 underline decoration-brand-300 decoration-2 underline-offset-2"
                      >
                        network map
                      </a>{" "}
                      to pull up your listing. It&apos;s probably already
                      there - we&apos;ve mapped pallet vendors across North
                      America from public records.
                    </>
                  ),
                },
                {
                  n: "02",
                  heading: "Submit your primary contact",
                  body: (
                    <>
                      Add your name, email, phone, and classification - about
                      sixty seconds of typing. We capture the rest of your
                      profile (service area, capabilities, hours, treatments)
                      on the intro call.
                    </>
                  ),
                },
                {
                  n: "03",
                  heading: "Intro call",
                  body: (
                    <>
                      We call within one business day to introduce ourselves
                      and walk through the rest of your profile by phone.
                      The conversation is how every Pallet Solutions vendor
                      relationship starts.
                    </>
                  ),
                },
                {
                  n: "04",
                  heading: "Your listing publishes",
                  body: (
                    <>
                      Right after the intro call, your claimed version
                      replaces the default on the network map. Hours change
                      later or you add a pallet type, email
                      info@palletsolutionsusa.com and we update within one
                      business day.
                    </>
                  ),
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
                    <p className="mt-2 text-base leading-relaxed text-ink-700">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* WHY WE MAP EVERY VENDOR - dark band, the conversion moment.
          ClaimSection (in-page form) is REMOVED from this draft - the
          interactive search-yourself + claim lives on the network site.
          CTA in this dark band routes there. Enhanced footnote moved
          here as the quiet self-selector entry. */}
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
            Claiming your listing controls what they find - your real
            service area, hours, capabilities, and how they reach you.
            If Pallet Solutions sources a managed program in your area,
            we use this same network to find you and reach out directly
            to coordinate the program parameters.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-5">
            <a
              href={NETWORK_CLAIM_URL}
              className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              Find your business on the map
              <span aria-hidden="true">→</span>
            </a>
            <span className="text-sm text-ink-300">
              Free claim. Tuesday Report is the optional next step.
            </span>
          </div>

          {/* Enhanced footnote - now positioned as the verified tier
              that bundles the Tuesday Report and the four-marker check.
              Quiet, for self-selectors who are reading carefully. */}
          <p className="mt-12 max-w-2xl text-sm text-ink-400">
            Looking for PS-verified status? Enhanced bundles the Tuesday
            Report and our four-marker verification check at $49.99/mo,
            available once the Tuesday Report ships.{" "}
            <Link
              href="/enhanced"
              className="font-bold text-brand-300 hover:text-brand-200 underline decoration-brand-300 decoration-2 underline-offset-4"
            >
              View enhanced
            </Link>
            .
          </p>
        </div>
      </section>

      {/* FAQ - updated for new model. Removed Oct 31 entry. Added two
          Tuesday Report entries. */}
      <section className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <h2 className="text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
            Frequently asked questions
          </h2>
          <div className="mt-12">
            {[
              {
                q: "What if I'm not on the map yet?",
                a: "Most active pallet vendors are auto-listed from public business records. If yours doesn't appear when you search, email info@palletsolutionsusa.com with your company name and address - we'll add it to the network and confirm within one business day.",
              },
              {
                q: "Do I have to commit to anything?",
                a: "No. Listed is automatic - nothing to sign. Claimed is free and you can update or remove your listing anytime by emailing info@palletsolutionsusa.com. No contract, no renewal email. The Tuesday Report is a separate, optional subscription - claiming your listing never enrolls you in it.",
              },
              {
                q: "What is the Tuesday Report?",
                a: "A weekly per-corridor intelligence brief tuned to the area around your yard. Three tiers of content: national cost data (lumber, diesel, wages, OCC) and a regional cost read are guaranteed every week; regional and local events show up when they happen. Every event links the source article. Every cost number traces to a public BLS or EIA series. Quiet weeks say so - we don't manufacture news to fill space. Founding cohort waitlist is open; product ships once the cohort is filled.",
              },
              {
                q: "Do I have to subscribe to the Tuesday Report to be on the network?",
                a: "No. The Claimed listing on the map is free and self-contained. The Tuesday Report is a separate product that sits on top of the listing for vendors who want the weekly intelligence layer. The two are independent - subscribe to one without the other, or both, or neither.",
              },
              {
                q: "What data do you collect on me?",
                a: "Public-records data (state filings, business registration, BBB) populates the default Listed tier. Claimed adds whatever you choose to share - service area, hours, capabilities, contact info. We don't sell vendor data and we don't share Claimed data with our managed-programs team.",
              },
              {
                q: "How does my contact info appear?",
                a: "However you set it when you claim - phone, email, or both. Contact info is never displayed openly on the map. A buyer reveals it only after picking you (up to 3 per search) and confirming their own email - one engagement at a time, never bulk-harvested or crawled.",
              },
              {
                q: "What happens after I submit my claim?",
                a: "We call within one business day to introduce ourselves and walk through the rest of your profile - service area, capabilities, hours, treatments. Your claimed listing publishes right after we connect. If you're interested in the Tuesday Report, the same call covers founding-cohort terms; if not, the call ends with your listing live and nothing else to do.",
              },
              {
                q: "Can I remove my listing entirely?",
                a: "Yes. Email info@palletsolutionsusa.com to remove your listing - Listed or Claimed - and we'll take it down within one business day. No retention games.",
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
