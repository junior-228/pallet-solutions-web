// Shared vendor entry shape consumed by every surface that renders a
// public vendor card: /find-a-vendor (BuyerVendorFinder), /vendors
// (VendorJourneyPrototype's FoundRealView), and the shared
// VendorPublicCard component below.
//
// Sourced at bake time from public.vendor_public_read + the live
// overlay (see useLiveVendorOverlay) -- one record shape, one
// render path, no divergence between buyer + vendor surfaces.

export type VendorStatus = "listed" | "claimed" | "enhanced";

export type VendorPublicEntry = {
  id: string;
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  status: VendorStatus;
  // Capability arrays -- present on claimed/enhanced rows that filled
  // them on claim. Nullable because the live overlay can return JSON
  // null for un-set Supabase columns; call sites use length / falsy
  // guards so null and undefined are treated equivalently.
  classification?: string[];
  services?: string[];
  palletTypes?: string[];
  treatments?: string[];
  // Coverage fields -- emitted by the bake when the claimed vendor
  // submitted them; absent on Listed rows.
  serviceRadiusMi?: number | null;
  hoursOpen?: string | null;
  hoursClose?: string | null;
  daysOpen?: string[];
  // Founding-cohort marker -- when true, the dark header band renders
  // the gold "★ Founding Member" pill beside the trust badge (matches
  // the SAMPLE card on /vendors). Mirrors public.vendors.founding_member
  // on the data side; not yet exposed via vendor_public_read / bake
  // (future cleanup), so today the only producer is the /vendors
  // BrowsingPanel sample feeding the prop directly.
  foundingMember?: boolean;
  // Country of the listing. Absent / "" / "United States" = domestic and
  // runs the full buyer flow. Any other value (Canada, Mexico, an EU
  // country) marks an INTERNATIONAL listing: searchable + mappable, but
  // display-only -- no shortlist / reveal / RFQ, since those hit the
  // US-only email + Supabase paths. See isInternationalEntry().
  country?: string;
  region?: string;
};

// True for international listings (anything not US). Used to gate the
// shortlist/reveal/send actions so international rows stay display-only.
export function isInternationalEntry(v: { country?: string }): boolean {
  const c = (v.country || "").trim();
  return c !== "" && c !== "United States";
}

// Strings rendered next to each tier's dot/pill across every surface.
// Keep in sync with the pill copy in TrustBadge below.
export const STATUS_LABELS: Record<VendorStatus, string> = {
  enhanced: "Enhanced - PS Verified",
  claimed: "Claimed",
  listed: "Listed - public records",
};

// One-line honest-sparsity context shown under the header band.
export const STATUS_BLURBS: Record<VendorStatus, string> = {
  enhanced:
    "PS-verified via documentary check: active insurance, 3+ years operating, clean dispute record, and an onboarding call.",
  claimed:
    "Vendor-controlled profile. Capabilities are vendor-attested -- confirm specifics when you reach out.",
  listed:
    "Listed from public records. Capabilities below the buyer card live on claimed listings -- confirm specs when you reach out.",
};
