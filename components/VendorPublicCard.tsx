"use client";

// Shared vendor card -- the ONE polished card every public-facing
// surface renders through:
//   - /vendors      -- the SAMPLE "what a claimed listing looks like"
//                      panel + the FoundRealView returning-claimed
//                      vendor surface
//   - /find-a-vendor -- the right-rail detail card for the buyer
//
// Visual spec (the SAMPLE card on /vendors is canonical, approved by
// Rob 2026-05-31):
//   - dark ink-900 header band
//   - trust pill (solid bg, white text) + optional gold "Founding
//     Member" pill in the same row
//   - vendor name (white) + location (ink-300) on the band
//   - white body
//   - chip palette:
//       Classification         small green pills (uppercase)
//       Services               larger green pills (Title Case)
//       Pallet types           larger green pills (Title Case)
//       Treatments & certs     small amber pills
//   - Coverage row: 3-col grid (Service area / Hours / Days)
//   - footerSlot for the caller's surface-specific action (the
//     sample's "Reveal contact info" pill on /vendors, the buyer
//     side's dual-action Contact + Add-to-send footer on /find-a-vendor)
//
// Pure presentation. Footer is a slot, never opinionated.

import { useState, type ReactNode } from "react";
import type { VendorPublicEntry, VendorStatus } from "@/lib/vendor-types";

// Trust pill -- solid color, white text on tier-bg. Works on the dark
// header band AND any other surface that wants a strong status read.
// `dark` controls the Listed variant only (subdued white-on-dark vs
// ink-grey-on-light).
export function TrustBadge({
  status,
  dark = true,
}: {
  status: VendorStatus;
  dark?: boolean;
}) {
  if (status === "enhanced") {
    return (
      <span className="inline-flex items-center rounded-md bg-[#49a5c1] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
        ✓ Enhanced - PS Verified
      </span>
    );
  }
  if (status === "claimed") {
    return (
      <span className="inline-flex items-center rounded-md bg-emerald-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
        ✓ Claimed
      </span>
    );
  }
  if (dark) {
    return (
      <span className="inline-flex items-center rounded-md bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink-200">
        Listed - public records
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-ink-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink-600">
      Listed - public records
    </span>
  );
}

// Founding Member -- amber outlined pill the sample carries beside the
// trust pill on the dark header band. Renders ONLY when the caller
// passes vendor.foundingMember === true (a vendor data flag, future
// wired via the bake; for the sample it's set in props).
export function FoundingMemberBadge() {
  return (
    <span className="inline-flex items-center rounded-md border border-amber-300/60 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-300">
      ★ Founding Member
    </span>
  );
}

// One chip section. Two chip sizes match the SAMPLE card's hierarchy:
// the "primary" capability dimensions (Services + Pallet Types) get
// bigger, Title-Case chips; the "secondary" labels (Classification +
// Treatments) get smaller uppercase chips. The Treatments palette
// flips to amber to differentiate certification-flavoured signals
// from capability ones.
type ChipPalette = "green-small" | "green-large" | "amber-small";

const CHIP_CLASS: Record<ChipPalette, string> = {
  "green-small":
    "rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700",
  "green-large":
    "rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800",
  "amber-small":
    "rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700",
};

// Show the first COLLAPSE_AT chips; anything beyond that hides behind a
// caret toggle ("+N more" / "Show less"). Keeps a long dimension (e.g. ZZ's
// 5 classifications or 8 services) from blowing out the card, and reads the
// same on /vendors and /find-a-vendor since both render through here.
const COLLAPSE_AT = 2;

function CardSection({
  label,
  values,
  palette,
}: {
  label: string;
  values?: string[];
  palette: ChipPalette;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!values || values.length === 0) return null;
  const collapsible = values.length > COLLAPSE_AT;
  const shown = collapsible && !expanded ? values.slice(0, COLLAPSE_AT) : values;
  const hiddenCount = values.length - COLLAPSE_AT;
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-ink-600">
        {label}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {shown.map((v) => (
          <span key={v} className={CHIP_CLASS[palette]}>
            {v}
          </span>
        ))}
        {collapsible && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            className="inline-flex items-center gap-1 rounded-md border border-ink-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-ink-600 transition-colors hover:bg-ink-50"
          >
            {expanded ? "Show less" : `+${hiddenCount} more`}
            <span
              aria-hidden="true"
              className={`text-[8px] leading-none transition-transform ${
                expanded ? "rotate-180" : ""
              }`}
            >
              ▾
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

export type VendorPublicCardProps = {
  vendor: VendorPublicEntry;
  // Optional miles-from-origin readout shown under the vendor name
  // on the dark band. Buyer surface passes "12 mi from {DC label}";
  // /vendors omits it.
  distance?: number | null;
  originLabel?: string;
  // Buyer-side: capability values the buyer's filters matched.
  // Surfaces a "Matches what you're sourcing" callout at the top of
  // the white body.
  matched?: string[];
  // Optional back button (rendered as a thin white bar ABOVE the dark
  // header). Buyer surface wires it; /vendors omits.
  onBack?: () => void;
  backLabel?: string;
  // Surface-specific action footer:
  //   /vendors sample = "Reveal contact info" pill
  //   /find-a-vendor  = Contact CTA + Add-to-send toggle
  footerSlot?: ReactNode;
};

export function VendorPublicCard({
  vendor,
  distance,
  originLabel,
  matched,
  onBack,
  backLabel = "Back to results",
  footerSlot,
}: VendorPublicCardProps) {
  const location =
    [vendor.city, vendor.state].filter(Boolean).join(", ") || "Location not on file";

  const hasAnyCap =
    (vendor.classification && vendor.classification.length > 0) ||
    (vendor.services && vendor.services.length > 0) ||
    (vendor.palletTypes && vendor.palletTypes.length > 0) ||
    (vendor.treatments && vendor.treatments.length > 0);

  const radiusFact = vendor.serviceRadiusMi
    ? `${vendor.serviceRadiusMi} mi`
    : null;
  const hoursFact =
    vendor.hoursOpen || vendor.hoursClose
      ? `${vendor.hoursOpen || "?"} - ${vendor.hoursClose || "?"}`
      : null;
  const daysFact =
    vendor.daysOpen && vendor.daysOpen.length ? vendor.daysOpen.join(", ") : null;

  return (
    <div className="flex h-full flex-col">
      {onBack && (
        <div className="border-b border-ink-100 bg-white px-5 py-2">
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-medium text-ink-500 hover:text-brand-600"
          >
            &larr; {backLabel}
          </button>
        </div>
      )}

      {/* Dark header band -- the SAMPLE card's visual anchor. */}
      <div className="bg-ink-900 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <TrustBadge status={vendor.status} dark />
          {vendor.foundingMember && <FoundingMemberBadge />}
        </div>
        <h3 className="mt-3 text-lg font-semibold leading-tight text-white">
          {vendor.name || "Unnamed listing"}
        </h3>
        <p className="mt-0.5 text-xs text-ink-300">
          {location}
          {typeof distance === "number" && (
            <span className="text-ink-400">
              {" "}
              &middot; {distance} mi
              {originLabel ? ` from ${originLabel}` : ""}
            </span>
          )}
        </p>
      </div>

      {/* White body -- ORDERED LABELED sections.
          Each capability dimension renders as its OWN labeled group
          (small uppercase grey label + chips beneath) with breathing
          room. Never merged into a single chip wall. Sections without
          data are suppressed; Coverage always renders so the buyer
          sees em-dashes for what isn't on file. */}
      <div className="flex-1 space-y-5 bg-white px-5 py-5">
        {matched && matched.length > 0 && (
          <div className="rounded-lg border border-brand-200 bg-brand-50/60 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-800">
              Matches what you are sourcing
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {matched.map((m) => (
                <span
                  key={m}
                  className="rounded-md border border-brand-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}

        {hasAnyCap ? (
          <>
            <CardSection
              label="Classification"
              values={vendor.classification}
              palette="green-small"
            />
            <CardSection
              label="Services"
              values={vendor.services}
              palette="green-large"
            />
            <CardSection
              label="Pallet types"
              values={vendor.palletTypes}
              palette="green-large"
            />
            <CardSection
              label="Treatments & certifications"
              values={vendor.treatments}
              palette="amber-small"
            />
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-ink-200 p-4 text-sm leading-relaxed text-ink-600">
            This vendor is listed from public records, so we don&apos;t have
            their capabilities on file yet. Reach out to confirm service area,
            pallet types, treatments, and pricing vendor-to-buyer.
          </div>
        )}

        {/* Coverage row -- ALWAYS rendered. Missing fields display
            as em-dashes so a buyer instantly sees the gaps, not a
            collapsed row that looks like the data isn't tracked. */}
        <div className="grid grid-cols-3 gap-3 border-t border-ink-100 pt-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-600">
              Service area
            </p>
            <p className="mt-0.5 text-sm text-ink-800">{radiusFact || "—"}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-600">
              Hours
            </p>
            <p className="mt-0.5 text-sm text-ink-800">{hoursFact || "—"}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-600">
              Days
            </p>
            <p className="mt-0.5 text-sm text-ink-800">{daysFact || "—"}</p>
          </div>
        </div>
      </div>

      {footerSlot}
    </div>
  );
}
