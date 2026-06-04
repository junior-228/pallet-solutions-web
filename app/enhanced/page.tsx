import type { Metadata } from "next";
import Link from "next/link";
import DarkBarFx from "@/components/DarkBarFx";

// ---------------------------------------------------------------------------
// /enhanced -hidden page reachable ONLY from the Enhanced footnote on
// /vendors. Not in the nav, not in the footer. Reframed 2026-05-21 (rev 3)
// around a new spine that leads with the intelligence vision + founding
// position rather than verification.
//
// === HONESTY RULE (the line that cannot be crossed) ===
//
// The intelligence/briefing product is NOT built. The page may sell the
// FUTURE intelligence and the founding position, but must NEVER describe
// a briefing, corridor read, or intelligence product as something the
// vendor receives today. Future references are always framed:
//   - "as it ships" / "as it's released"
//   - "first in line for what gets released"
//   - "what you're locking in early"
// Never "you receive," "you get every Tuesday," "your weekly briefing."
//
// VERIFICATION is the only thing described in present tense. It's the
// only thing that exists.
//
// === STRUCTURE (top to bottom) ===
//
//   1. Hero -vision + founding position. Verified now, intelligence as
//      it ships, founding rate locked.
//   2. Founding-rate mechanic -$49.99/mo locked for life, urgency.
//   3. What you get today -verification as the immediate floor (4
//      markers + the listing benefits).
//   4. What's coming -intelligence layer, future-framed only.
//   5. Velocity proof -placeholder until real shipping timeline is
//      sourced from git history (task #47).
//   6. The wall -what Enhanced does NOT buy. Trust mechanic.
//   7. Apply -dark closing band, email/call.
//
// === VISIBILITY ===
//
// Page metadata sets robots: { index: false, follow: false }. Not in
// nav (components/header.tsx). Not in footer (components/footer.tsx).
// Only reachable from the "View enhanced" link in the dark band on
// /vendors. Intentionally a self-select page, not a promoted one.
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Enhanced - the founding cohort | Pallet Solutions",
  description:
    "Enhanced vendors are the founding cohort of the network's intelligence layer. Lock $49.99/month founding pricing for life, get four-marker verification immediately, and receive corridor intelligence as it ships.",
  robots: { index: false, follow: false },
};

// MARKERS describe what the blue PS-verified DOT stands for -the
// published four-part standard behind a single generic verified mark.
// Each body is written from the BUYER's point of view: what does a
// procurement team conclude when they see the dot? The verification
// work is the input; what the buyer reads from the dot is the value.
//
// Hard rule (factual): buyers do NOT see the COI, do NOT see individual
// marker badges, do NOT see the documents PS pulled. They see one dot.
// The dot's published meaning is the four markers below. Do not write
// copy that says or implies "buyers see your coverage / cert / record"
// on the listing -the buyer sees the dot; the dot has published
// meaning.
const MARKERS = [
  {
    n: "01",
    heading: "Active business insurance",
    body: "A procurement team's first diligence question is almost always whether the vendor carries current coverage. The dot answers it before they ask. PS confirms active coverage directly with your carrier, on a cadence - the verified mark stands for it.",
  },
  {
    n: "02",
    heading: "3+ years operating, same legal entity",
    body: "Procurement teams screen out vendors who can't show consistent operating history under the same legal entity. The dot tells a buyer you cleared that bar. PS pulls public state records - zero work from you.",
  },
  {
    n: "03",
    heading: "Clean dispute record, last 12 months",
    body: "Buyers won't bring an unknown vendor into an RFQ without checking the public dispute record first. The dot means PS already looked - court records, judgments, BBB complaints, public business records search. If anything turns up, we ask about it before we mark you.",
  },
  {
    n: "04",
    heading: "Fifteen-minute intro call",
    body: "Buyers know that whoever PS stands behind, PS has actually talked to. Direct conversation with Pallet Solutions - not a reference call to your customers, not a survey form. You answer the phone, we talk through your operation, the partnership starts on that call.",
  },
];

// What's in here today must be true today. Anything in flight or aspirational
// goes in the "What's coming" section below, framed as direction not
// deliverable. This is a paid page -features sold as present-tense perks
// have to be live the day a vendor pays. See task #45 for the vendor
// corridor briefing (not built; do NOT add as a perk until it ships).
const WHAT_VERIFICATION_GETS_YOU = [
  "Verified mark on your map dot and listing card - buyers see at a glance that PS has checked you out",
  "Inclusion in the verified pool that buyers filter for in vendor search - ranking inside the pool is still by distance, but unverified vendors are filtered out",
  "Annual re-verification at no extra cost - we re-run the documentary checks every 12 months",
  "Direct support line with Rob, not the general queue",
];

export default function EnhancedPage() {
  return (
    <>
      {/* HERO -leads with founding cohort + intelligence vision.
          Verification is the floor; the intelligence layer is the hook. */}
      <section className="border-b border-ink-100">
        <div className="mx-auto max-w-6xl px-6 pt-16 pb-16 sm:pt-24 sm:pb-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            Enhanced
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl sm:leading-[1.08]">
            Founding cohort. Verified now, intelligence as it ships.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-ink-700">
            Enhanced is the founding cohort of the network&apos;s
            intelligence layer. You lock $49.99/month founding pricing for
            life, get four-marker verification immediately, and are first
            in line for corridor intelligence as it ships. Verification is
            the floor. The intelligence layer is what you&apos;re locking
            in early.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a
              href="mailto:info@palletsolutionsusa.com?subject=Enhanced%20verification%20application&body=Company%20name%3A%20%0AYour%20name%3A%20%0APhone%3A%20%0ABest%20time%20to%20talk%3A%20%0A"
              className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              Apply for Enhanced
              <span aria-hidden="true">→</span>
            </a>
            <span className="text-sm text-ink-600">
              Founding pricing locked for the life of your subscription.
            </span>
          </div>
        </div>
      </section>

      {/* FOUNDING-RATE MECHANIC -brand-tinted background to mark this as
          the key urgency moment. $49.99/mo founding pricing, locked for
          life of subscription. The honest pitch: you're paying founding
          pricing on a product being actively built. Verification is real
          day one; the intelligence layer is what you're locking in early. */}
      <section className="border-b border-ink-100 bg-brand-50/40">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            The founding position
          </p>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            Founding rate, locked for life.
          </h2>

          {/* Founding-rate stats -the three numbers that anchor the offer */}
          <div className="mt-9 grid gap-8 sm:grid-cols-3 max-w-4xl">
            <div>
              <p className="text-4xl font-bold tracking-tight text-brand-600 tabular-nums">
                $49.99
              </p>
              <p className="mt-2 text-sm font-semibold text-ink-900">
                Per month, founding rate
              </p>
              <p className="mt-1 text-xs text-ink-600">
                Locked for the life of your subscription
              </p>
            </div>
            <div>
              <p className="text-4xl font-bold tracking-tight text-brand-600 tabular-nums">
                No contract
              </p>
              <p className="mt-2 text-sm font-semibold text-ink-900">
                Month-to-month
              </p>
              <p className="mt-1 text-xs text-ink-600">
                Cancel anytime
              </p>
            </div>
            <div>
              <p className="text-4xl font-bold tracking-tight text-brand-600 tabular-nums">
                5 days
              </p>
              <p className="mt-2 text-sm font-semibold text-ink-900">
                To schedule the call
              </p>
              <p className="mt-1 text-xs text-ink-600">
                Documentary checks happen on our side
              </p>
            </div>
          </div>

          <div className="mt-10 max-w-3xl space-y-5 text-base leading-relaxed text-ink-700">
            <p>
              Enhanced is in its founding period. Vendors who join now lock
              the founding rate for the life of their subscription - no
              rate increases as the product deepens, no contract, cancel
              anytime. Founding pricing is the current rate; it moves up
              for new subscribers as the network and the product mature.
            </p>
            <p>
              You&apos;re locking founding pricing on a product being
              actively built. The verification piece is real and delivered
              the day you sign - that&apos;s the floor. The intelligence
              layer (corridor reads, category dynamics, vendor-relevant
              signals) is what you&apos;re paying to be first in line for
              as it ships.
            </p>
          </div>
        </div>
      </section>

      {/* WHAT YOU GET TODAY -verification, the immediate floor.
          Reframed from "the headline product" to "the day-one value that
          makes the founding bet not-nothing." Contains the four markers
          and the listing benefits, both present-tense and true today. */}
      <section className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            What you get today
          </p>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            When buyers see the dot, they know PS already ran the diligence.
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-ink-700">
            The blue PS-verified dot on your listing is one mark. It means
            the same thing to every buyer who sees it: Pallet Solutions
            already ran a four-part diligence check on this vendor -
            insurance, operating history, dispute record, a direct call -
            before they reached out. The four markers below are what that
            check covers, the standard the dot stands for. Buyers see the
            dot. They don&apos;t see the documents behind it; they
            don&apos;t need to.
          </p>

          {/* The four markers -buyer-POV. Each marker describes what
              the buyer concludes when they see the dot, not what the
              vendor sent us. Insurance specifically: do NOT describe the
              COI as something buyers see -the dot stands for it. */}
          <div className="mt-14">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">
              What&apos;s behind the dot
            </p>
            <div className="mt-6 space-y-12">
              {MARKERS.map((m) => (
                <div
                  key={m.n}
                  className="grid gap-6 md:grid-cols-[100px_1fr] md:gap-10 items-start"
                >
                  <div>
                    <p className="text-5xl font-bold text-brand-500 tabular-nums leading-none">
                      {m.n}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-ink-900 sm:text-2xl">
                      {m.heading}
                    </h3>
                    <p className="mt-3 text-base leading-relaxed text-ink-700 max-w-2xl">
                      {m.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* What verification gets you on the listing */}
          <div className="mt-16 max-w-4xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">
              What that gets you on the listing
            </p>
            <ul className="mt-6 space-y-4">
              {WHAT_VERIFICATION_GETS_YOU.map((item, i) => (
                <li key={i} className="flex items-start gap-4">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0 mt-0.5 text-brand-500"
                    aria-hidden="true"
                  >
                    <path d="M5 13 L9 17 L19 7" />
                  </svg>
                  <p className="text-base leading-relaxed text-ink-800">
                    {item}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* WHAT'S COMING -the intelligence layer, future-framed.
          Every reference here is "as it ships," "first in line," "what
          you're locking in early." Nothing describes a delivered briefing.
          Task #45 tracks the actual product build. */}
      <section className="border-b border-ink-100 bg-ink-50/60">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            What&apos;s coming
          </p>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            The intelligence layer is what you&apos;re locking in early.
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-ink-700">
            The network&apos;s public intelligence - the cost-input
            methodology, the published index, the weekly read - is free to
            anyone, vendor or buyer. The vendor-flavored layer (corridor
            reads, category dynamics scoped to your vendor type,
            forward-looking signals on your service area) is what&apos;s
            being built. Enhanced vendors are first in line for what gets
            released. We won&apos;t put dates on it. We&apos;ll build it,
            ship it, and Enhanced sees it first.
          </p>

          <div className="mt-12 max-w-3xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">
              The directions being built
            </p>
            <ul className="mt-6 space-y-5">
              <li className="border-l-2 border-brand-300 pl-5">
                <h3 className="text-base font-semibold text-ink-900">
                  Corridor reads
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-700">
                  How active your service area is and where the activity is
                  trending. Vendor-scoped, anonymized from network traffic.
                </p>
              </li>
              <li className="border-l-2 border-brand-300 pl-5">
                <h3 className="text-base font-semibold text-ink-900">
                  Category dynamics
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-700">
                  Cost-input pressure and capacity signals scoped to your
                  vendor type - recycler, manufacturer, sawmill - not the
                  generic national read.
                </p>
              </li>
              <li className="border-l-2 border-brand-300 pl-5">
                <h3 className="text-base font-semibold text-ink-900">
                  Forward signals
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-700">
                  Early indicators on where category demand is heading in
                  your corridor over the next 30-60 days. The same
                  forecasting methodology PS uses for the public index,
                  scoped down.
                </p>
              </li>
            </ul>
          </div>

          <p className="mt-10 max-w-3xl text-sm italic text-ink-600">
            Direction, not deliverable: these describe where Enhanced is
            going, not products you receive today. Enhanced subscribers
            see what gets released first as each layer ships.
          </p>
        </div>
      </section>

      {/* WHY THIS IS CREDIBLE -replaces the prior "How fast we ship /
          shipping timeline placeholder" section 2026-05-21. Reasoning:
          shipping cadence and git history is developer/investor language,
          and pallet vendors don't read it as a trust signal. The real
          proof is the public intelligence operation PS already runs --
          PSCI, the Tuesday Read, the methodology page -all live, all
          citable, all free to read today. The vendor intelligence layer
          (the future part of Enhanced) is that same operation scoped to
          the vendor's corridor. So the vendor isn't betting on a
          promise; they're looking at the machine already running. */}
      <section className="relative overflow-hidden border-b border-ink-100 bg-white">
        {/* Decorative ambient glow -Vercel-style brand-blue orb filling
            the right-side whitespace next to the left-aligned content.
            Pure decoration, aria-hidden, pointer-events-none so it can't
            intercept clicks. Two overlapping orbs for depth: a large soft
            primary at brand-400 + a smaller brighter secondary at
            brand-300. The result is an ambient electric-blue presence
            on the right side of the section without competing with the
            content. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute right-[-8%] top-1/2 h-[560px] w-[560px] -translate-y-1/2 rounded-full bg-brand-400 opacity-25 blur-3xl" />
          <div className="absolute right-[8%] top-[35%] h-[280px] w-[280px] -translate-y-1/2 rounded-full bg-brand-300 opacity-30 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            Why this is credible
          </p>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            We already publish the intelligence. This points it at you.
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-ink-700">
            Pallet Solutions already runs a public intelligence operation
            - the Pallet Solutions Cost Index&trade;, the weekly Tuesday
            Read, and a full published methodology cited to federal data.
            It is live right now and anyone can read it. The vendor
            intelligence layer is that same operation, scoped to your
            corridor. You are not betting on a promise - you are looking
            at the machine that is already running, and locking your spot
            before it points at your market.
          </p>

          {/* Three live-surface link cards -the proof in three clicks.
              All link targets exist today: /psci is the public reference
              page, /tuesday-read matches the nav and footer route used
              elsewhere on the site, /methodology is the published
              disclosure page. */}
          <div className="mt-10 grid gap-4 md:grid-cols-3 max-w-5xl">
            <Link
              href="/psci"
              className="group rounded-xl border border-ink-200 bg-white p-5 hover:border-brand-300 hover:bg-brand-50/40 transition-colors"
            >
              <p className="text-[10px] font-mono uppercase tracking-wider text-brand-600">
                Read the index
              </p>
              <p className="mt-2 text-base font-semibold text-ink-900 group-hover:text-brand-700">
                PSCI&trade;
              </p>
              <p className="mt-1.5 text-sm text-ink-600 leading-snug">
                Weighted index of pallet cost inputs, refreshed weekly.
                Federal data sources, fully reproducible.
              </p>
              <span className="mt-3 inline-flex items-center text-xs font-semibold text-brand-600">
                <span aria-hidden="true">→</span>
              </span>
            </Link>
            <Link
              href="/tuesday-read"
              className="group rounded-xl border border-ink-200 bg-white p-5 hover:border-brand-300 hover:bg-brand-50/40 transition-colors"
            >
              <p className="text-[10px] font-mono uppercase tracking-wider text-brand-600">
                Read the newsletter
              </p>
              <p className="mt-2 text-base font-semibold text-ink-900 group-hover:text-brand-700">
                The Tuesday Read
              </p>
              <p className="mt-1.5 text-sm text-ink-600 leading-snug">
                Weekly read on pallet category dynamics in plain English,
                with every number traceable to a federal source.
              </p>
              <span className="mt-3 inline-flex items-center text-xs font-semibold text-brand-600">
                <span aria-hidden="true">→</span>
              </span>
            </Link>
            <Link
              href="/methodology"
              className="group rounded-xl border border-ink-200 bg-white p-5 hover:border-brand-300 hover:bg-brand-50/40 transition-colors"
            >
              <p className="text-[10px] font-mono uppercase tracking-wider text-brand-600">
                Read the methodology
              </p>
              <p className="mt-2 text-base font-semibold text-ink-900 group-hover:text-brand-700">
                Methodology
              </p>
              <p className="mt-1.5 text-sm text-ink-600 leading-snug">
                Full published methodology - weights, sources,
                calculation. Every input traceable to a federal series.
              </p>
              <span className="mt-3 inline-flex items-center text-xs font-semibold text-brand-600">
                <span aria-hidden="true">→</span>
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* THE WALL -what Enhanced does NOT buy. Trust mechanic, kept as-is
          from the prior /enhanced rev. The honest version of pricing is
          the one that says what it doesn't cover too. */}
      <section className="border-b border-ink-100 bg-ink-50/60">
        <div className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            What Enhanced does NOT buy
          </p>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
            We&apos;re explicit about this.
          </h2>
          <ul className="mt-6 space-y-2 text-base leading-relaxed text-ink-800">
            <li>-Higher ranking on the map for the same distance from a buyer</li>
            <li>-Priority over equally-qualified competitors</li>
            <li>-Automatic inclusion in our managed-programs vendor pool</li>
            <li>-Any access to buyer sourcing data</li>
          </ul>
          <p className="mt-7 text-sm leading-relaxed text-ink-700 max-w-3xl">
            The map ranks by distance and verification tier in that order.
            Verification gets you into the verified pool, not to the top of
            it. Buyers who filter for verified vendors see all verified
            vendors near them; ranking inside that pool is still distance.
          </p>
        </div>
      </section>

      {/* APPLY -dark closing band. Email + call CTAs, kept as-is. */}
      <section className="relative overflow-hidden border-y-2 border-brand-500 bg-ink-900 text-white">
        <DarkBarFx />
        <div className="relative z-10 mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-300">
            Apply for Enhanced
          </p>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Email or call. We schedule the fifteen-minute conversation.
          </h2>
          <p className="mt-6 max-w-3xl text-base leading-relaxed text-ink-200">
            We process applications within five business days. The
            fifteen-minute call is the only thing on your plate - the
            documentary checks (insurance, operating history, disputes)
            happen on our side. After the call, your listing carries the
            verified mark within one business day, and founding pricing
            locks for the life of your subscription.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a
              href="mailto:info@palletsolutionsusa.com?subject=Enhanced%20verification%20application&body=Company%20name%3A%20%0AYour%20name%3A%20%0APhone%3A%20%0ABest%20time%20to%20talk%3A%20%0A"
              className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              Apply by email
              <span aria-hidden="true">→</span>
            </a>
            <a
              href="tel:19518210364"
              className="inline-flex items-center gap-2 rounded-full border border-ink-700 px-6 py-3 text-sm font-semibold text-white hover:border-brand-400 hover:text-brand-300 transition-colors"
            >
              Or call 951-821-0364
            </a>
          </div>

          <p className="mt-10 text-sm text-ink-400">
            Not ready for Enhanced?{" "}
            <Link
              href="/vendors"
              className="font-semibold text-brand-300 hover:text-brand-200 underline underline-offset-2"
            >
              Claim your free listing first
            </Link>
            {" "}- you can add Enhanced later anytime.
          </p>
        </div>
      </section>
    </>
  );
}
