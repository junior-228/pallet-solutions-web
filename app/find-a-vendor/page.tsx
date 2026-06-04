import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import BuyerVendorFinder from "@/components/BuyerVendorFinder";
import DarkBarFx from "@/components/DarkBarFx";
import Reveal from "@/components/Reveal";
import FaqAccordion from "@/components/FaqAccordion";

// ---------------------------------------------------------------------------
// /find-a-vendor - buyer-facing interactive vendor search. Audience:
// procurement and supply-chain teams finding local pallet vendors directly.
//
// LAYOUT (locked 2026-06-01): hero -> SLIM color-key strip (so the gray/green/
// blue/gold map dots are legible instantly) -> the TOOL high on the page ->
// stat bar -> full four-tier explainer (depth) -> FAQ -> managed hand-off.
// The slim strip keeps the dot colors legible WITHOUT pushing the search tool
// down a full cards section.
//
// === HARD RULES (locked across the site) ===
//
// 1. NEUTRALITY WALL: the list ranks by DISTANCE (+ the buyer's own filter).
//    Enhanced / anything paid NEVER floats a vendor up. Tier is a dot color +
//    the explicit "verified only" filter the buyer chooses. (Sort enforced in
//    BuyerVendorFinder - tier is not a sort key, locked 2026-06-01.)
// 2. VERIFICATION != CAPABILITIES: PS verification is the four-marker check
//    (active insurance, 3+ years operating, clean dispute record, a direct
//    call). CTPAT / FSMA / ISPM-15 / HT are vendor capabilities, NOT what
//    "PS-verified" means.
// 3. CLAIMED = FREE AND FULL: a claimed listing is a complete, vendor-
//    controlled profile, free. Enhanced adds verification + first access to
//    the coming intelligence layer, NOT profile richness.
// 4. INTELLIGENCE IS FUTURE: future-framed only, never described as delivered.
// 5. Single hyphens. No "free forever." No delivery-date promises. Brand
//    #49a5c1.
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Find a Vendor - 7,500+ pallet vendors mapped | Pallet Solutions",
  description:
    "Search pallet recyclers, manufacturers, and lumber yards near every DC in your network. Map by ZIP, rank by distance, filter by capability, reveal 3 contacts free per visit. No login.",
};

const STATS = [
  { big: "7,500+", label: "Vendors mapped", sub: "US · CA · EU · MX" },
  {
    big: "Free",
    label: "To search and reach vendors",
    sub: "Pick 3 contact reveals per visit, no login",
  },
  {
    big: "Public records",
    label: "Source of base data",
    sub: "Vendors claim and control their own listing",
  },
  {
    big: "By distance",
    label: "How every search ranks",
    sub: "Paying never buys a higher spot",
  },
];

const TIERS = [
  {
    label: "Listed",
    dot: "Gray dot",
    short: "Public records only",
    color: "ink",
    pricing: "Default. Free.",
    body: "Auto-added from public records. A buyer sees the vendor exists at this address. Nothing more.",
  },
  {
    label: "Claimed",
    dot: "Green dot",
    short: "Vendor-controlled profile",
    color: "emerald",
    pricing: "Free, self-serve.",
    body: "The vendor confirmed ownership and filled out a full profile: what they do, capabilities, certifications, service radius, bio. Free to claim. A buyer can pre-qualify them from the listing - and these are the listings the capability filters read.",
  },
  {
    label: "Enhanced",
    dot: "Blue dot",
    short: "PS-verified diligence",
    color: "brand",
    pricing: "Paid, by application.",
    body: "The diligence a vendor chooses to go through: PS runs a four-part compliance check behind the scenes - insurance, operating history, dispute record, a direct call. The Enhanced dot tells a buyer that work is done before they call.",
    note: "Ranking is by distance only - Enhanced never buys a higher spot on the map.",
  },
  // Intelligence (gold) tier omitted on /find-a-vendor for now - future-only.
];

const FAQ = [
  {
    q: "How does the search work?",
    a: "Tell us whether you need delivery or pickup and enter a ZIP - we map the pallet vendors around that DC, ranked by distance. Got more facilities? Add each one and the same tool turns into a footprint coverage view: per-DC vendor density, redundancy, and gaps across your whole network. One tool, one ZIP or fifty.",
  },
  {
    q: "What do the capability filters actually do?",
    a: "They tune what floats to the top - pallet types, treatments, services, vendor type. They never hide vendors. Most listings come from public records and carry no capability data (that lives on claimed listings), so we always show the nearest regardless, float the matches up, and you confirm specifics when you reach out.",
  },
  {
    q: "What does Pick 3 actually do?",
    a: "Each visit, you can reveal contact info for up to 3 vendors. Their phone and email release to you after you submit your own email - that is how the network keeps vendor contacts from getting bulk-scraped while still letting real buyers reach them. One reveal at a time, three per visit, no login.",
  },
  {
    q: "What is the difference between Listed, Claimed, and Enhanced - for me as a buyer?",
    a: "Listed = the vendor exists, public records is all you see. Claimed = the vendor has filled in their own profile, so you can pre-qualify them and the filters can read their capabilities. Enhanced = PS has run a four-part diligence check on them (insurance, operating history, dispute record, a direct call) - the Enhanced dot tells you that work is done before you call. Ranking on the map is always by distance - Enhanced never moves a vendor up.",
  },
  {
    q: "Why are vendors in the network without signing up?",
    a: "The base data is sourced from public business records (state filings, business registration, BBB). That is how we have 7,500+ vendors mapped without a single vendor having to do anything. Vendors then claim their listings, fill in the details public records do not have, and control what shows up.",
  },
  {
    q: "What if PS just ran the sourcing for me?",
    a: "That is the managed-programs side - separate engagement, quoted per footprint. If you would rather hand off RFQs, vendor management, and consolidated invoicing across all your DCs instead of working vendors one at a time, start there. The finder stays free either way.",
  },
];

function tierClasses(color: string) {
  switch (color) {
    case "emerald":
      return { border: "border-emerald-500", eyebrow: "text-emerald-700", dot: "bg-emerald-500" };
    case "brand":
      return { border: "border-brand-500", eyebrow: "text-brand-700", dot: "bg-brand-500" };
    case "amber":
      return { border: "border-amber-500", eyebrow: "text-amber-700", dot: "bg-amber-500" };
    default:
      return { border: "border-ink-400", eyebrow: "text-ink-600", dot: "bg-ink-400" };
  }
}

export default function FindAVendorPage() {
  return (
    <>
      {/* HERO - mirrors the For Vendors numbered-path framing. Three buyer
          paths in plain order: search the map, reach vendors directly on your
          own terms, or hand the whole thing to a managed program. */}
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
            Find a vendor
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl sm:leading-[1.05]">
            Every pallet vendor near your DCs, in one{" "}
            <span className="text-brand-500">network</span>.
          </h1>
          {/* Three buyer paths - ALTERNATIVES, not a sequence, so NO connecting
              line (a line would imply "do all three in order"). The stagger
              carries it; managed is the "or". */}
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
                    Search the map
                  </span>{" "}
                  - 7,500+ pallet recyclers, manufacturers, and lumber yards
                  across the US, Canada, Europe, and Mexico, ranked by distance
                  to each DC. Free, no login.
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
                    Request a quote directly
                  </span>{" "}
                  - shortlist who you like and send your need straight to them,
                  or reveal a phone and call. Handle it on your own terms.
                </span>
              </li>
              <li
                className="reveal-item flex items-start gap-3"
                style={{ "--i": 2 } as CSSProperties}
              >
                <span
                  className="reveal-pop shrink-0 mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink-900 text-sm font-bold text-white"
                  style={{ "--i": 2 } as CSSProperties}
                  aria-hidden="true"
                >
                  3
                </span>
                <span className="text-base leading-relaxed text-ink-700">
                  <span className="font-semibold text-ink-900">
                    Or let us run it
                  </span>{" "}
                  - hand off RFQs, vendor management, and consolidated invoicing
                  across every facility to a{" "}
                  <Link
                    href="/sourcing"
                    className="font-semibold text-brand-600 hover:text-brand-700 underline underline-offset-2"
                  >
                    managed program
                  </Link>
                  .
                </span>
              </li>
            </ol>
          </Reveal>
          <p className="mt-5 text-sm font-medium text-ink-600">
            Searching is free - no card, no login, no sales call.
          </p>
        </div>
      </section>

      {/* SLIM COLOR-KEY STRIP - one row under the hero so the dot colors are
          legible before the tool. The TOOL stays full-width (it renders a
          full-screen map overlay; it must NOT be wrapped in a constraining
          grid or the overlay/scroll breaks). The map's own top-left "Map
          legend" is the vertical dot key beside the actual dots. */}
      <section className="border-y border-ink-100 bg-ink-50/70">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500">
              The dots on the map
            </span>
            {TIERS.map((t) => {
              const c = tierClasses(t.color);
              return (
                <span key={t.label} className="inline-flex items-center gap-2">
                  <span
                    className={`h-3 w-3 rounded-full ${c.dot} ring-2 ring-white shadow`}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-semibold text-ink-900">
                    {t.label}
                  </span>
                  <span className="text-sm text-ink-500">- {t.short}</span>
                </span>
              );
            })}
          </div>
          <p className="mt-2.5 text-center text-sm font-medium text-ink-600">
            Ranked by distance only - paying never buys a higher spot.
          </p>
        </div>
      </section>

      {/* THE TOOL - full-width. Do not wrap in a grid/column. */}
      <BuyerVendorFinder />

      {/* STAT ROW - dark band. The Enhanced stat names the four-marker check
          explicitly so verification is never confused with vendor
          capabilities (CTPAT/FSMA/ISPM-15). */}
      <section className="relative overflow-hidden border-y-2 border-brand-500 bg-ink-900 text-white">
        <DarkBarFx />
        <div className="relative z-10 mx-auto max-w-6xl px-6 py-12 sm:py-14">
          <Reveal className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            {STATS.map((s, i) => (
              <div
                key={s.label}
                className="reveal-item"
                style={{ "--i": i } as CSSProperties}
              >
                <p className="text-3xl sm:text-4xl font-bold tracking-tight text-brand-400 tabular-nums">
                  {s.big}
                </p>
                <p className="mt-3 text-base font-semibold text-white">
                  {s.label}
                </p>
                <p className="mt-1 text-sm text-ink-400 leading-snug">
                  {s.sub}
                </p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* FOUR-TIER EXPLAINER - the depth, now below the tool. Color stays the
          dominant visual; each card maps 1:1 to a map dot. */}
      <section className="border-b border-ink-100 bg-ink-50/60">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
                The tiers
              </p>
              <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
                What each dot on the map means.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-ink-600">
              The map ranks by distance. The dot color tells you how much you
              already know about a vendor before you reach out - it does not
              change their position.
            </p>
          </div>

          <Reveal className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
            {TIERS.map((t, i) => {
              const c = tierClasses(t.color);
              return (
                <div
                  key={t.label}
                  className="reveal-item h-full"
                  style={{ "--i": i } as CSSProperties}
                >
                <article
                  className={`flex h-full flex-col rounded-xl border border-ink-200 border-t-4 ${c.border} bg-white p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-ink-900/10`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`reveal-pop h-3.5 w-3.5 rounded-full ${c.dot} ring-2 ring-white shadow`}
                      style={{ "--i": i } as CSSProperties}
                      aria-hidden="true"
                    />
                    <span className={`text-base font-bold ${c.eyebrow}`}>
                      {t.label}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                    {t.dot} · {t.pricing}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-ink-700 flex-1">
                    {t.body}
                  </p>
                  {t.note && (
                    <p className="mt-3 pt-3 border-t border-ink-100 text-xs font-semibold text-ink-800">
                      {t.note}
                    </p>
                  )}
                </article>
                </div>
              );
            })}
          </Reveal>
        </div>
      </section>

      {/* FAQ - buyer-focused. */}
      <section className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <h2 className="text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
            Frequently asked questions
          </h2>
          <FaqAccordion items={FAQ} />
        </div>
      </section>

      {/* CLOSING - managed hand-off + vendor cross-link. */}
      <section className="bg-white">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            Search it yourself, or let us run it.
          </h2>
          <p className="mt-5 max-w-2xl mx-auto text-base leading-relaxed text-ink-700">
            The finder is free - one ZIP or a whole DC footprint, no login. When
            you would rather hand off the sourcing entirely, managed programs
            run RFQs, vendor management, and consolidated invoicing across every
            facility.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/sourcing"
              className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              See managed programs
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          <p className="mt-10 text-sm text-ink-500">
            Looking to claim your own listing as a vendor?{" "}
            <Link
              href="/vendors"
              className="font-semibold text-brand-600 hover:text-brand-700 underline underline-offset-2"
            >
              That&apos;s here
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
