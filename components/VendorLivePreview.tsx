"use client";

// ---------------------------------------------------------------------------
// VendorLivePreview -two-card before/after STATIC FALLBACK.
//
// 2026-05-21 rev 2 (Path A, green-themed Claimed):
//   - Claimed card switched from brand-blue accent to emerald (green)
//     accent, matching the tier-color convention used elsewhere for
//     Claimed. Brand-blue is reserved for the page chrome (the "find it
//     on the live map" link in the Sample band) and for the page's
//     other surfaces; the Claimed card itself is green.
//   - Service area on Claimed = "Not specified". We do NOT have real
//     service-radius data from the public-records parse, so the sample
//     must not display a fabricated mileage. The Listed card keeps its
//     existing "approximate/public-records" framing.
//   - Heat-treated removed from Capabilities; lives only under
//     Treatments & Specialties (HT / ISPM-15). No tag appears in two
//     categories. Capabilities now show non-treatment items only:
//     Custom sizes, Recycled.
//   - All emojis stripped from detail rows. Replaced with plain
//     FieldRow (label / value) typography consistent with the rest of
//     the card and the Listed card. No icons, no glyphs.
//   - Contact section reframed to the buyer's-eye view: a button-styled
//     "Reveal contact info →" element (what a buyer would click in the
//     live tool), with subtext describing the Pick-3 reveal mechanic.
//
// Path A reminder: Claimed is the FULL rich listing. There is NO separate
// Enhanced card on this page. Enhanced status is conveyed elsewhere
// (badge / blue dot / weekly brief) and is out of scope for this surface.
//
// === LIVE-WIRE STATUS (unchanged) ===
//
// Still the STATIC fallback. The live read+write stack
// (vendor-typeahead.js + vendor-claim.js) is built and production-grade.
// Blocker: Vercel rebuild deploy URL not in ALLOWED_ORIGINS on the
// Netlify functions yet. Flipping to live is a future-session task.
//
// === DATA RULES (preserved for the live cutover) ===
//
//   - Airtable Vendors table (base appQYT3aaMX1SzO7M) is authoritative.
//   - No Airtable credentials in the client.
//   - Sample values are illustrative; the live cutover will pull real
//     vendor data via vendor-typeahead.js.
// ---------------------------------------------------------------------------

const SAMPLE_NAME = "Sample Pallet Co";
const SAMPLE_CITY = "Lancaster";
const SAMPLE_STATE = "PA";

function CardHeader({
  tier,
}: {
  tier: "listed" | "claimed";
}) {
  const meta =
    tier === "listed"
      ? {
          label: "Listed - default",
          borderTop: "border-t-ink-400",
          eyebrow: "text-ink-500",
        }
      : {
          label: "Claimed - what you'd build",
          borderTop: "border-t-emerald-500",
          eyebrow: "text-emerald-700",
        };
  return (
    <div className={`border-b border-ink-100 px-5 py-4 ${meta.borderTop}`}>
      <p
        className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${meta.eyebrow}`}
      >
        {meta.label}
      </p>
      <h4 className="mt-1 text-base font-semibold text-ink-900 leading-tight">
        {SAMPLE_NAME}
      </h4>
      <p className="mt-0.5 text-[11px] text-ink-500">
        {SAMPLE_CITY}, {SAMPLE_STATE}
      </p>
    </div>
  );
}

function FieldRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
        {label}
      </p>
      <p
        className={`mt-0.5 text-sm leading-snug ${
          muted ? "text-ink-400 italic" : "text-ink-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SampleListedCard() {
  // The before-state: sparse public-records data. Fields the parse
  // didn't yield are explicitly marked "Not specified."
  return (
    <article className="rounded-xl border border-ink-200 border-t-4 border-t-ink-400 bg-white flex flex-col opacity-95">
      <CardHeader tier="listed" />
      <div className="px-5 py-5 space-y-3.5 flex-1">
        <FieldRow
          label="Classification"
          value="Recycler (from public records)"
        />
        <FieldRow label="Service area" value="Not specified" muted />
        <FieldRow label="Hours" value="Not specified" muted />
        <FieldRow label="Years in business" value="Not specified" muted />
        <FieldRow label="Capabilities" value="Not specified" muted />
        <FieldRow label="Treatments" value="Not specified" muted />
        <FieldRow
          label="Contact"
          value="Public-records phone only (often outdated)"
          muted
        />
      </div>
      <div className="border-t border-ink-100 px-5 py-3 bg-ink-50/60">
        <p className="text-[11px] text-ink-500 leading-snug">
          What the auto-generated default version shows when nothing&apos;s
          been claimed.
        </p>
      </div>
    </article>
  );
}

function SampleClaimedCard() {
  // The after-state: green-themed (Claimed tier color). Mirrors the live
  // rich vendor card structure (classification + capabilities + treatments
  // + detail rows + about + contact) without emojis and without a
  // verified badge.
  return (
    <article className="rounded-xl border-2 border-emerald-500 bg-white flex flex-col ring-2 ring-emerald-500/15">
      <CardHeader tier="claimed" />
      <div className="px-5 py-5 space-y-4 flex-1">
        {/* Tier badges -CLAIMED is the primary status (solid emerald, bigger),
            Founding Member is the secondary marker (outline amber, smaller).
            Mirrors the live pro popup's badge hierarchy: primary tier badge
            is solid-fill prominent, founding-member is tinted/outline. */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white">
            ✓ Claimed
          </span>
          <span className="inline-flex items-center rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-700">
            ★ Founding Member
          </span>
        </div>

        {/* Classification chips -emerald-tinted, multi-tag */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
            Classification
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
              Recycler
            </span>
            <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
              Manufacturer
            </span>
          </div>
        </div>

        {/* Capabilities -non-treatment items only. Heat-treated lives
            under Treatments, not here. */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
            Capabilities
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
              Custom sizes
            </span>
            <span className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
              Recycled
            </span>
          </div>
        </div>

        {/* Treatments & specialties -HT / ISPM-15 lives here only.
            Amber palette to differentiate from capabilities visually. */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
            Treatments &amp; specialties
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              HT / ISPM-15
            </span>
            <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              Kiln dried
            </span>
            <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              FDA compliant
            </span>
          </div>
        </div>

        {/* Detail rows -plain FieldRow typography, no emojis. Service
            area is a vendor-set value (75 miles in the sample) because
            the Claimed card represents what a vendor fills in themselves
            once they claim. The public-records parse doesn't yield
            radius data, which is why the Listed card shows "Not
            specified" for the same field. */}
        <div className="border-t border-ink-100 pt-4 space-y-3.5">
          <FieldRow label="Service area" value="75 miles" />
          <FieldRow
            label="Years in business"
            value="12 years (since 2014)"
          />
          <FieldRow label="Hours" value="Mon-Fri, 7:00 AM - 5:00 PM" />
          <FieldRow label="Services" value="Drop trailer, core removal" />
        </div>

        {/* About blurb -mirror live "vp-about" section */}
        <div className="border-t border-ink-100 pt-4">
          <p className="text-sm leading-relaxed text-ink-700 italic">
            Third-generation pallet operation supplying retail,
            manufacturing, and food-grade customers across the Mid-Atlantic.
          </p>
        </div>

        {/* Contact -buyer's-eye view. The button-styled "Reveal contact
            info" element is what a buyer would click in the live tool;
            subtext describes the Pick-3 reveal mechanic accurately. */}
        <div className="border-t border-ink-100 pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
            Contact
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm">
            Reveal contact info <span aria-hidden="true">→</span>
          </div>
          <p className="mt-2.5 text-[11px] text-ink-600 leading-snug">
            Phone and email are never displayed on the map. A buyer
            reveals them only after picking you (up to 3 per search) and
            confirming their own email - one reveal at a time,
            rate-limited, never bulk-harvested or crawled.
          </p>
        </div>
      </div>
      <div className="border-t border-emerald-200 px-5 py-3 bg-emerald-50/60">
        <p className="text-[11px] text-emerald-800 font-medium leading-snug">
          What your listing shows when you control it. Claim is free and
          takes 60 seconds.
        </p>
      </div>
    </article>
  );
}

export default function VendorLivePreview() {
  return (
    <div>
      {/* Sample label band -explicit "this is a sample, not your real
          listing" so no vendor thinks they're seeing themselves. */}
      <div className="rounded-lg border border-ink-200 bg-ink-50/60 px-4 py-3 mb-6 flex items-start gap-3">
        <span className="inline-flex items-center rounded-full bg-ink-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-700 shrink-0 mt-0.5">
          Sample
        </span>
        <p className="text-sm text-ink-700 leading-snug">
          Here&apos;s a sample before/after for a fictional vendor. To see
          your actual listing,{" "}
          <a
            href="https://network.palletsolutionsusa.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-brand-600 hover:text-brand-700 underline underline-offset-2"
          >
            find it on the live map
          </a>
          .
        </p>
      </div>

      {/* Explainer paragraph sits ABOVE the cards as the framing lead-in
          rather than below them. The Listed card is much shorter than the
          Claimed card, so a paragraph below the grid sat in dead space
          off the bottom of the Listed card. */}
      <p className="mb-6 text-sm text-ink-700 max-w-2xl">
        The default version on the left is what shows when nothing&apos;s
        been claimed. The version on the right is what shows when you take
        60 seconds to claim and fill in the basics. Same listing, two
        states - you pick which one buyers see.
      </p>

      <div className="grid gap-5 md:grid-cols-2 items-start">
        <SampleListedCard />
        <SampleClaimedCard />
      </div>
    </div>
  );
}
