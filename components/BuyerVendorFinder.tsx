"use client";

// ---------------------------------------------------------------------------
// BuyerVendorFinder - the buyer-side interactive vendor search for
// /find-a-vendor. Sibling of the vendor-side VendorJourneyPrototype, flipped
// to BUYER mode: a buyer qualifies (need type + ZIP) and lands in a live
// map + distance-ranked list + right-rail vendor card with loose filters and
// a native Pick 3 contact reveal.
//
// Built 2026-05-29 (Phase 0-6 of find-a-vendor-architecture-plan.md). Self-
// contained on purpose: it reuses the PROVEN patterns from
// VendorJourneyPrototype (Leaflet dynamic-import, haversine neighbor filter,
// OSM Nominatim geocode, status-dot markup, the vendor index) without
// refactoring that 4,000-line component, so the production /vendors page is
// untouched. DRY-ing the two onto one shared <VendorMap>/<VendorCard> layer
// is a deliberate follow-up once both are stable.
//
// === HARD RULES (locked across the site - breaking one is a regression) ===
//
// 1. NEUTRALITY WALL. The list ranks by DISTANCE. Enhanced verification, or
//    anything paid, NEVER floats a vendor up. The ONLY thing that re-ranks
//    is the BUYER'S OWN capability-filter choice (their query, not money).
//    Never write "top placement," "priority," "performance-scored placement."
// 2. VERIFICATION != CAPABILITIES. "Enhanced / PS-verified" = the four-marker
//    check (insurance, 3+ yrs same entity, clean 12-mo disputes, a 15-min
//    onboarding call). It is NOT ISPM-15/HT/CTPAT - those are capabilities.
// 3. CLAIMED = FREE AND FULL. Capability data lives on Claimed/Enhanced
//    listings. Most vendors are Listed (public records only) and carry none -
//    which is why FILTERS ARE LOOSE: they re-rank + annotate, never exclude,
//    never strand a buyer with an empty map.
// 4. PICK 3 IS AN ANTI-SCRAPE GATE. Contact is NEVER in the public bundle.
//    A buyer reveals one vendor's contact only after submitting their own
//    email, 3 per visit. Contact is fetched per-vendor from the reveal
//    endpoint (server-side), not baked into vendor-index.json.
// 5. LANGUAGE. No "broker"/"3PL" for PS. PSCI(TM) on first use. Single
//    hyphens only. Brand #49a5c1. No "free forever." No delivery-date
//    promises.
//
// Everything stays IN THIS SITE. The only network calls are background
// fetches (geocode + the reveal/lead endpoints). No user-facing redirect to
// network.palletsolutionsusa.com.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { RefObject } from "react";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import { useLiveVendorOverlay, applyOverlay } from "@/lib/useLiveVendorOverlay";
import { FUNCTIONS_BASE } from "@/lib/functionsBase";
import { VendorPublicCard, TrustBadge } from "@/components/VendorPublicCard";
import type { VendorPublicEntry, VendorStatus as SharedVendorStatus } from "@/lib/vendor-types";
import { isInternationalEntry } from "@/lib/vendor-types";

// === TYPES ===================================================================

type VendorStatus = SharedVendorStatus;

// VendorEntry is the in-page alias for the shared VendorPublicEntry type.
// Kept under the local name so existing call sites (ranked rows, filter
// computations, marker iteration) don't all have to be renamed; the
// structural shape is identical.
type VendorEntry = VendorPublicEntry;


type RankedVendor = {
  v: VendorEntry;
  dist: number;
  matched: string[]; // which active filter values this vendor satisfies
  isMatch: boolean; // satisfies the active filters (AND across dimensions)
};

type DC = {
  id: string;
  label: string; // resolved place label
  query: string; // what the buyer typed
  lat: number;
  lng: number;
};

type NeedType = "delivery" | "pickup" | "both";

type FilterDimension =
  | "classification"
  | "services"
  | "palletTypes"
  | "treatments";

type Filters = {
  classification: Set<string>;
  services: Set<string>;
  palletTypes: Set<string>;
  treatments: Set<string>;
  verifiedOnly: boolean;
};

type RevealedContact = {
  phone?: string;
  email?: string;
  connectOnly?: boolean; // backend unavailable: PS makes the intro instead
};

// === CONFIG ==================================================================

// Single tunable strictness flag for capability filters. "soft" = re-rank +
// annotate, never exclude (default, correct while claim density is low).
// "hard" = exclude non-matches. Flip this ONE line when claim density grows.
const CAPABILITY_FILTER_MODE: "soft" | "hard" = "hard";

// Expanding search radii (miles). We never strand a buyer: if 50mi is thin
// we widen, and if even the widest is empty we fall back to the nearest few.
const RADII_MI = [50, 100, 150, 250];
// Buyer-selectable search radius (the list caps to this; the map keeps
// broader context). Allowed set matches the audit guardrail {25,50,100,150}.
const RADIUS_OPTIONS = [25, 50, 100, 150];
const MIN_RESULTS = 6;

const VENDOR_INDEX_URL = "/vendor-index.json";
// International vendors (Canada / Mexico / EU). Loaded as a SEPARATE file and
// merged at runtime so the US index is never affected: a missing or empty
// file degrades to "US only" and never breaks the domestic finder.
const INTL_VENDOR_INDEX_URL = "/vendor-index-intl.json";

// Server-side endpoints on the network site (the only "backend" the buyer
// tool touches). Background fetch, not a redirect. If these are not yet
// deployed, the reveal degrades gracefully to a "PS will connect you" intro.
// Multi-vendor recap + invisible relay submit endpoint. Same FUNCTIONS_BASE
// pattern as the vendor-side claim endpoint so local netlify dev (set
// NEXT_PUBLIC_FUNCTIONS_BASE=http://localhost:8888) intercepts cleanly.
// Capture-only endpoint. Writes buyer_requests at wizard submit, returns
// requestId. The unified reveal/send screen drives sends and reveals
// individually after capture.
const SUBMIT_BUYER_REQUEST_URL = `${FUNCTIONS_BASE}/.netlify/functions/submit-buyer-request`;
// Booleans-only lookup. Anti-scrape: never returns the email or phone,
// just whether the vendor has a usable email. Drives "Send request" vs
// "Reveal phone" on the unified screen.
const HAS_EMAIL_LOOKUP_URL = `${FUNCTIONS_BASE}/.netlify/functions/has-email-lookup`;
// One vendor at a time. Fires the relay (info@ FROM, buyer reply-to) and
// stamps relay_results[vendor].status='sent'.
const SEND_VENDOR_REQUEST_URL = `${FUNCTIONS_BASE}/.netlify/functions/send-vendor-request`;
// Final buyer confirmation. Lists vendors with status='sent' only;
// phone-revealed vendors are not in the relay list (buyer calls those).
const SEND_BUYER_SUMMARY_URL = `${FUNCTIONS_BASE}/.netlify/functions/send-buyer-summary`;

// Recap form shape -- mirrors public.buyer_requests columns. Sized for
// scan-and-tap (chips/toggles first, free text last).
type RecapData = {
  firstName: string;
  lastName: string;
  company: string;
  palletTypes: string[];
  // Grade of pallet. "New" or "Recycled"; when Recycled, recycledGrade
  // narrows it (AA/A/B) since "recycled" alone is ambiguous to a vendor.
  // "Either" retained in the type for back-compat but no longer offered.
  condition: "" | "New" | "Recycled" | "Either";
  recycledGrade: "" | "AA" | "A" | "B";
  sizes: string[];
  sizeOther: string;
  quantity: string;
  frequency: "" | "One-time" | "Recurring";
  direction: "" | "Delivery" | "Pickup" | "Both";
  timeline: string;
  notes: string;
  wantsManaged: boolean;
};
const INITIAL_RECAP: RecapData = {
  firstName: "",
  lastName: "",
  company: "",
  palletTypes: [],
  condition: "",
  recycledGrade: "",
  sizes: [],
  sizeOther: "",
  quantity: "",
  frequency: "",
  direction: "",
  timeline: "",
  notes: "",
  wantsManaged: false,
};
const RECAP_PALLET_TYPES = [
  "GMA Stringer (48x40)",
  "Block Pallets",
  "Stringer Pallets (non-GMA)",
  "Plastic Pallets",
  "Custom / Specialty Pallets",
  "Crates",
];
const RECAP_SIZES = ['48"x40"', '48"x48"', '42"x42"', '36"x36"', "Other"];
const RECAP_QUANTITIES = [
  "Under 100",
  "100 - 500",
  "500 - 2,000",
  "2,000 - 10,000",
  "10,000+",
];
const RECAP_TIMELINES = ["ASAP", "2 - 4 weeks", "Flexible / planning"];

// Per-location need. The describe form is direction-driven and filled once
// PER DC: Delivery/Both shows the delivery questions (type/grade/size),
// Pickup/Both shows the pickup-type cards. Quantity is asked for any
// direction.
type PerDcNeed = {
  direction: "" | "Delivery" | "Pickup" | "Both";
  palletTypes: string[];
  condition: "" | "New" | "Recycled";
  recycledGrade: "" | "AA" | "A" | "B";
  sizes: string[];
  sizeOther: string;
  pickupType:
    | ""
    | "Standard pallets"
    | "Non-standard sizes"
    | "Mix of both"
    | "Scrap";
  quantity: string;
  frequency: "" | "One-time" | "Recurring";
  timeline: string;
  notes: string;
};
const EMPTY_NEED: PerDcNeed = {
  direction: "",
  palletTypes: [],
  condition: "",
  recycledGrade: "",
  sizes: [],
  sizeOther: "",
  pickupType: "",
  quantity: "",
  frequency: "",
  timeline: "",
  notes: "",
};
const PICKUP_TYPES: { key: PerDcNeed["pickupType"]; desc: string }[] = [
  { key: "Standard pallets", desc: "48x40 GMA - the most common size" },
  { key: "Non-standard sizes", desc: "Oversized, half pallets, custom dimensions" },
  { key: "Mix of both", desc: "Standard and odd sizes together" },
  { key: "Scrap", desc: "Broken, unrepairable, or end-of-life pallets" },
];
// A location's need is "complete" when direction + quantity + the
// direction-specific required fields are filled. Used for the per-tab
// progress check and the submit gate (applies to every submission now).
function needComplete(n?: PerDcNeed): boolean {
  if (!n || !n.direction || !n.quantity) return false;
  const wantsDelivery = n.direction === "Delivery" || n.direction === "Both";
  const wantsPickup = n.direction === "Pickup" || n.direction === "Both";
  if (wantsDelivery) {
    if (n.palletTypes.length === 0) return false;
    if (!n.condition) return false;
    if (n.condition === "Recycled" && !n.recycledGrade) return false;
    if (n.sizes.length === 0) return false;
  }
  if (wantsPickup && !n.pickupType) return false;
  return true;
}
// Response from POST submit-buyer-request (capture-only). The unified
// reveal/send screen needs requestId to thread per-vendor outcomes back
// to the same buyer_requests row.
type CaptureResponse = {
  ok: boolean;
  requestId?: string;
  error?: string;
};

// Response from POST has-email-lookup. Booleans ONLY -- the actual email
// is never returned (anti-scrape rule locked 2026-05-31).
type HasEmailResult = { vendor_id: string; has_email: boolean };

// Per-vendor outcome state tracked on the client during the reveal/send
// screen. Mirrors the server-side relay_results jsonb.
type VendorAction =
  | { kind: "sent" }
  | { kind: "phone_revealed"; contact: RevealedContact }
  | { kind: "pending"; error?: string };

const REVEAL_ENDPOINT =
  "https://network.palletsolutionsusa.com/.netlify/functions/reveal-vendor-contact";

const PICKS_PER_VISIT = 3;

// === CANONICAL TAXONOMY (Grok-locked 2026-05-28) - exact strings ============

const CLASSIFICATIONS = [
  "Pallet Manufacturer",
  "Pallet Recycler",
  "Sawmill / Lumber Supplier",
  "Broker / Reseller / Distributor",
  "Crate & Specialty Packaging Manufacturer",
];
const SERVICES = [
  "New Pallet Manufacturing",
  "Pallet Repair / Reconditioning",
  "Recycling / Remanufacturing",
  "Core Buyback / Scrap Removal",
  "Custom / Specialty Fabrication",
  "Crating & Export Packaging",
  "Drop Trailer / On-Site Service",
  "Distribution / Wholesale Resale",
];
const PALLET_TYPES = [
  "GMA Stringer (48x40)",
  "Block Pallets",
  "Stringer Pallets (non-GMA)",
  "Plastic Pallets",
  "Custom / Specialty Pallets",
  "Crates",
];
const TREATMENTS = [
  "Heat Treated (HT)",
  "ISPM-15 Certified",
  "Fumigated",
  "Kiln Dried (KD)",
  "Chemical Treated",
  "Food Grade / FDA Compliant",
];

const FILTER_GROUPS: { key: FilterDimension; label: string; options: string[] }[] =
  [
    { key: "classification", label: "Vendor type", options: CLASSIFICATIONS },
    { key: "services", label: "Services", options: SERVICES },
    { key: "palletTypes", label: "Pallet types", options: PALLET_TYPES },
    { key: "treatments", label: "Treatments & certs", options: TREATMENTS },
  ];

// === STATUS DISPLAY ==========================================================

const STATUS_LABELS: Record<VendorStatus, string> = {
  listed: "Listed",
  claimed: "Claimed",
  enhanced: "Enhanced",
};
const STATUS_BLURB: Record<VendorStatus, string> = {
  listed: "From public records. Confirm specifics when you reach out.",
  claimed: "Vendor-controlled profile. Capabilities below are vendor-attested.",
  enhanced:
    "PS-verified: insurance, 3+ years operating, clean disputes, a direct call.",
};

// === GEOMETRY ================================================================

function haversineMi(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// === MAP MARKER HTML (mirrors VendorJourneyPrototype.makeDotHtml) ===========

function makeDotHtml(
  status: VendorStatus,
  selected: boolean,
  pulse: boolean = false
): string {
  const tap = 34;
  const base = status === "enhanced" ? 18 : status === "claimed" ? 16 : 14;
  const dotSize = selected ? base + 4 : base;
  const ring =
    (selected
      ? `<div style="position:absolute;width:${dotSize + 14}px;height:${dotSize + 14}px;border-radius:50%;border:3px solid rgba(15,29,36,0.85);background:rgba(255,255,255,0.35);pointer-events:none;z-index:0;"></div>`
      : "") +
    // Just-added burst: a green ring expands twice, then the parent clears
    // the pulse flag (~2.6s) and the marker redraws without it.
    (pulse
      ? `<div style="position:absolute;width:${dotSize + 16}px;height:${dotSize + 16}px;border-radius:50%;background:rgba(0,200,83,0.5);animation:psAddPulse 1.2s ease-out 2;pointer-events:none;z-index:0;"></div>`
      : "");
  const open = `<div style="width:${tap}px;height:${tap}px;display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;">`;
  const close = `</div>`;
  if (status === "enhanced") {
    return (
      open +
      ring +
      `<div style="position:absolute;width:${dotSize + 14}px;height:${dotSize + 14}px;border-radius:50%;border:2px solid rgba(73,165,193,0.6);animation:proRing 2.5s ease-out infinite;pointer-events:none;z-index:1;"></div>` +
      `<div style="width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(130,210,235,1), #49a5c1);border:3px solid rgba(255,255,255,0.95);position:relative;z-index:2;"></div>` +
      close
    );
  }
  if (status === "claimed") {
    return (
      open +
      ring +
      `<div style="width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(100,230,140,1), #00C853);border:2px solid rgba(255,255,255,0.85);box-shadow:0 0 8px rgba(0,200,83,0.5);position:relative;z-index:1;"></div>` +
      close
    );
  }
  return (
    open +
    ring +
    `<div style="width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(190,200,210,1), #8a9bae);opacity:0.9;border:2px solid rgba(255,255,255,0.7);position:relative;z-index:1;"></div>` +
    close
  );
}

// DC (the buyer's facility) marker - a brand-blue location pin, visually
// distinct from the round vendor dots.
function makeDcPinHtml(label: string): string {
  return (
    `<div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translateY(-4px);">` +
    `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#49a5c1;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>` +
    `<div style="position:absolute;top:6px;width:8px;height:8px;border-radius:50%;background:#fff;"></div>` +
    `<div style="margin-top:3px;font:600 10px/1.1 system-ui,sans-serif;color:#1c2e38;background:rgba(255,255,255,0.92);padding:1px 5px;border-radius:6px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.2);">${label}</div>` +
    `</div>`
  );
}

// === GEOCODE (OSM Nominatim - same path the vendor side already uses) =======

// Countries Pallet Solutions covers. A typed place is resolved within these so it
// lands in the right country instead of silently defaulting to the US.
const SERVED_COUNTRY_CODES = "us,ca,mx,de,gb,pl,fr,es,it,nl,be,ie";

async function geocodePlace(query: string): Promise<DC | null> {
  const raw = query.trim();
  if (!raw) return null;
  // A bare US-style ZIP keeps the original, US-pinned path EXACTLY (zip codes collide
  // internationally - e.g. "30301" also matches Kraków "30-301"). Anything with letters
  // ("City, ST", "City, Country", "RG30 4QA") is resolved across all served countries:
  // we no longer force ", USA", which had turned "Edmonton, AB" into Edmonton, Kentucky.
  const isUsZip = /^\d{5}(-\d{4})?$/.test(raw);
  const q = encodeURIComponent(isUsZip ? `${raw}, USA` : raw);
  const countrycodes = isUsZip ? "us,ca,mx" : SERVED_COUNTRY_CODES;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=${countrycodes}`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const arr = await res.json();
    if (arr && arr[0] && arr[0].lat && arr[0].lon) {
      const display = String(arr[0].display_name || raw)
        .split(",")
        .slice(0, 2)
        .join(", ");
      return {
        id: `dc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        label: /^\d{4,}$/.test(raw) ? raw : display || raw,
        query: raw,
        lat: parseFloat(arr[0].lat),
        lng: parseFloat(arr[0].lon),
      };
    }
  } catch {
    // swallow - caller shows an inline error
  }
  return null;
}

// === RANKING + LOOSE FILTERING ==============================================

function vendorValuesFor(v: VendorEntry, dim: FilterDimension): string[] {
  return (v[dim] as string[] | undefined) || [];
}

// Compute which active filter values a vendor satisfies + whether it matches
// the active filter set (AND across dimensions that have selections; OR
// within a dimension). Vendors with no capability data simply don't match -
// they are NOT excluded in soft mode, they just don't float up.
function computeMatch(v: VendorEntry, filters: Filters): {
  matched: string[];
  isMatch: boolean;
  anyActive: boolean;
} {
  const matched: string[] = [];
  let anyActive = false;
  let satisfiesAll = true;
  for (const group of FILTER_GROUPS) {
    const sel = filters[group.key];
    if (sel.size === 0) continue;
    anyActive = true;
    const vals = vendorValuesFor(v, group.key);
    let dimHit = false;
    for (const s of sel) {
      if (vals.includes(s)) {
        matched.push(s);
        dimHit = true;
      }
    }
    if (!dimHit) satisfiesAll = false;
  }
  return { matched, isMatch: anyActive && satisfiesAll, anyActive };
}

// === MAIN COMPONENT ==========================================================

export default function BuyerVendorFinder() {
  // ---- data ----
  // Raw static index loaded once from /vendor-index.json. The MERGED
  // version (raw + live overlay for claimed+enhanced) is derived below
  // via useMemo and used as the read source for distance ranking,
  // filtering, and rendering. Do NOT read rawVendorIndex directly --
  // always use vendorIndex (the merged value).
  const [rawVendorIndex, setRawVendorIndex] = useState<VendorEntry[]>([]);
  const { overlay: liveOverlay } = useLiveVendorOverlay();
  const vendorIndex = useMemo<VendorEntry[]>(
    () => applyOverlay(rawVendorIndex, liveOverlay),
    [rawVendorIndex, liveOverlay]
  );
  // Fast-path lookup for the recap overlay's "what each vendor sees"
  // preview and for any code that needs a vendor by id without
  // re-scanning the index.
  const vendorById = useMemo<Map<string, VendorEntry>>(() => {
    const m = new Map<string, VendorEntry>();
    for (const v of vendorIndex) m.set(v.id, v);
    return m;
  }, [vendorIndex]);
  const [indexLoading, setIndexLoading] = useState(true);
  const [indexError, setIndexError] = useState<string | null>(null);

  // ---- phase ----
  const [phase, setPhase] = useState<"wizard" | "results">("wizard");

  // Body scroll lock REMOVED 2026-06-01: the results view is now an in-page
  // bounded section (Zillow-pattern floating panel), not a fixed inset-0
  // takeover. The page must scroll normally so the hero/stats/FAQ above
  // and below the tool remain reachable.

  // ---- wizard ----
  const [wizardStep, setWizardStep] = useState(1);
  const [needType, setNeedType] = useState<NeedType | null>(null);
  const [zipInput, setZipInput] = useState("");
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // ---- results ----
  const [dcs, setDcs] = useState<DC[]>([]);
  const [activeDcId, setActiveDcId] = useState<string | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  // The vendor whose map dot should play the one-shot "just added" pulse.
  // Set when a buyer adds from the detail card; cleared after the animation.
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  // Map-list sync: hovering a row highlights its pin and vice versa.
  // null when neither surface has hover focus. Distinct from
  // selectedVendorId (the click target that opens the detail card).
  const [hoveredVendorId, setHoveredVendorId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    classification: new Set(),
    services: new Set(),
    palletTypes: new Set(),
    treatments: new Set(),
    verifiedOnly: false,
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Buyer-selectable search radius for the LIST (map keeps broader context).
  const [radiusMi, setRadiusMi] = useState<number>(50);
  const [addZip, setAddZip] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // ---- Pick 3 reveal (escape-hatch path; preserved unchanged so buyers
  //      can still get contacts one-at-a-time without filling a recap) ----
  // EMAIL ONCE PER VISIT: lazy-init from sessionStorage so a page refresh
  // inside the same visit doesn't re-prompt. Mirrors the network site's
  // Pick-3 contract (one entry unlocks the visit's reveals; the recap
  // form and the per-card "Contact this vendor" CTA share the same
  // store so all three reveal-paths see the captured email).
  const [buyerEmail, setBuyerEmailState] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      return window.sessionStorage.getItem("ps_buyer_email") || "";
    } catch {
      return "";
    }
  });
  const setBuyerEmail = (next: string) => {
    setBuyerEmailState(next);
    if (typeof window !== "undefined") {
      try {
        if (next) window.sessionStorage.setItem("ps_buyer_email", next);
        else window.sessionStorage.removeItem("ps_buyer_email");
      } catch {
        /* private mode etc -- in-memory state still works */
      }
    }
  };
  // Reveal budget is PER LOCATION (3 per DC), not 3 total. Keyed by dcId.
  const [picksByDc, setPicksByDc] = useState<Record<string, number>>({});
  const [revealed, setRevealed] = useState<Record<string, RevealedContact>>({});
  // Synchronous mirror of `revealed`. revealVendorFromUnified needs to
  // read the latest contact bytes IMMEDIATELY after performReveal sets
  // them -- React state setters are async, so reading `revealed` right
  // after the await would still see the previous render's value.
  const revealedRef = useRef<Record<string, RevealedContact>>({});
  const [revealBusyId, setRevealBusyId] = useState<string | null>(null);
  const [emailModalFor, setEmailModalFor] = useState<VendorEntry | null>(null);
  const [emailDraft, setEmailDraft] = useState("");
  const [emailErr, setEmailErr] = useState<string | null>(null);

  // Per-location reveal helpers. dcForVendor resolves which DC a vendor
  // belongs to (its shortlist DC, else the active DC); picksLeftForDc is
  // that location's remaining reveals (3 per location).
  const dcForVendor = (id: string) =>
    selectionDc[id] || activeDcId || dcs[0]?.id || "";
  const picksLeftForDc = (dcId: string) =>
    Math.max(0, PICKS_PER_VISIT - (picksByDc[dcId] || 0));

  // ---- Multi-select shortlist + describe + reveal/send ----
  // The new flow (locked 2026-05-31):
  //   1. Buyer selects up to 5 vendors per DC (5 * dcs.length total).
  //   2. Tray button "Request quotes ->" opens the Describe overlay.
  //   3. Describe overlay collects need + email, captures to
  //      buyer_requests (capture-only), returns requestId.
  //   4. Reveal/Send overlay: per-vendor "Send request" (usable email)
  //      or "Reveal phone" (Pick 3 capped) + call script for no-email
  //      vendors. The "3 of 3" cap message lives ONLY on phone reveal.
  // Selection cap math: 3 per DC (aligned to the "Pick 3" model so the
  // shortlist and the contact-reveal budget read as one number). Browse mode
  // (no DCs picked) treats it as a single virtual DC -> cap 3. Buyer's nudge
  // on a 4th: "Pick the 3 you most want quotes from."
  const PER_DC_CAP = 3;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Which DC each shortlisted vendor was picked under (vendorId -> dcId).
  // Drives the per-DC tabs on the reveal/send screen for multi-DC buyers.
  const [selectionDc, setSelectionDc] = useState<Record<string, string>>({});
  // Per-location need (dcId -> PerDcNeed). The describe form is filled per
  // DC (direction-driven). Single-DC buyers use this too (one entry).
  const [dcNeeds, setDcNeeds] = useState<Record<string, PerDcNeed>>({});
  const [selectionNudge, setSelectionNudge] = useState<string | null>(null);
  const [flowStep, setFlowStep] = useState<"none" | "describe" | "reveal" | "managed">(
    "none"
  );
  // requestId is set by the capture endpoint at the END of the Describe
  // step. The Reveal/Send screen needs it to thread per-vendor sends and
  // reveals back to the same buyer_requests row.
  const [requestId, setRequestId] = useState<string | null>(null);
  // Per-vendor action state on the Reveal/Send screen. Mirrors server
  // relay_results jsonb but client-side only (we don't re-fetch).
  const [vendorActions, setVendorActions] = useState<
    Record<string, VendorAction>
  >({});
  // has-email-lookup results for the shortlisted vendors; populated when
  // the reveal/send screen mounts.
  const [hasEmailMap, setHasEmailMap] = useState<Record<string, boolean>>({});
  const [hasEmailLoading, setHasEmailLoading] = useState(false);
  // Shared session state for the buyer's need profile. Same data drives:
  //  - the wizard's optional "Add sourcing details" step
  //  - the recap form on send
  //  - persists across multiple sends in the same visit (sessionStorage)
  // The buyer never enters the same field twice in one session.
  const [recapData, setRecapDataState] = useState<RecapData>(() => {
    if (typeof window === "undefined") return INITIAL_RECAP;
    try {
      const raw = window.sessionStorage.getItem("ps_buyer_recap");
      if (raw) return { ...INITIAL_RECAP, ...JSON.parse(raw) };
    } catch {
      /* ignore */
    }
    return INITIAL_RECAP;
  });
  const setRecapData = useCallback((next: RecapData) => {
    setRecapDataState(next);
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem("ps_buyer_recap", JSON.stringify(next));
      } catch {
        /* private mode etc -- in-memory state still works */
      }
    }
  }, []);
  const [recapError, setRecapError] = useState<string | null>(null);

  // The active-shortlist cap = 5 per DC (browse mode counts as 1 virtual
  // DC). The buyer is free to distribute across DCs as they like;
  // server cap mirrors this at 5 * max-realistic-DCs.
  const shortlistCap = PER_DC_CAP * Math.max(1, dcs.length);

  function toggleSelect(id: string) {
    // International listings are display-only: block them from the shortlist,
    // which is the single gateway to reveal / send / RFQ (all keyed off
    // selectedIds). This keeps the US-only email + Supabase paths untouched.
    if (internationalIdsRef.current.has(id)) {
      setSelectionNudge(
        "International listings are display-only for now - direct contact is rolling out."
      );
      if (typeof window !== "undefined") {
        window.setTimeout(() => setSelectionNudge(null), 4000);
      }
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setSelectionNudge(null);
        setSelectionDc((m) => {
          const n = { ...m };
          delete n[id];
          return n;
        });
        return next;
      }
      // Cap is per LOCATION (3 per DC), NOT a flat total. Count how many
      // are already shortlisted under the active DC.
      const dcId = activeDc?.id || dcs[0]?.id || "";
      const countInDc = Array.from(next).filter(
        (vid) => (selectionDc[vid] || dcs[0]?.id || "") === dcId
      ).length;
      if (countInDc >= PER_DC_CAP) {
        setSelectionNudge(
          `Up to ${PER_DC_CAP} vendors per location - pick the ${PER_DC_CAP} you most want quotes from${
            dcs.length > 1 ? " for this location" : ""
          }.`
        );
        // Auto-clear the nudge after a few seconds so it doesn't camp.
        if (typeof window !== "undefined") {
          window.setTimeout(() => setSelectionNudge(null), 4000);
        }
        return prev;
      }
      next.add(id);
      setSelectionNudge(null);
      // Record which DC this vendor was shortlisted under (for the tabs).
      if (dcId) setSelectionDc((m) => ({ ...m, [id]: dcId }));
      return next;
    });
  }
  function clearSelection() {
    setSelectedIds(new Set());
    setSelectionDc({});
    setSelectionNudge(null);
  }

  // Capture-only at wizard submit. Writes buyer_requests, returns
  // requestId, transitions to the reveal/send screen. No relays fire
  // here -- those happen one vendor at a time on the next screen.
  async function captureRequest(): Promise<boolean> {
    setRecapError(null);
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      setRecapError("Pick at least one vendor before continuing.");
      return false;
    }
    if (ids.length > shortlistCap) {
      setRecapError(`Shortlist over the ${shortlistCap}-vendor cap.`);
      return false;
    }
    if (!buyerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail.trim())) {
      setRecapError("A valid email is required so vendors can reach you.");
      return false;
    }
    if (!recapData.firstName.trim()) {
      setRecapError("Your first name lets the vendor see who's reaching out.");
      return false;
    }
    // Required for EVERY submission now: each location's need must be
    // complete (direction + quantity + the direction-specific fields).
    const locs = dcs.length
      ? dcs
      : [{ id: "", label: activeDc?.label || "" }];
    const incomplete = locs.filter((d) => !needComplete(dcNeeds[d.id]));
    if (incomplete.length > 0) {
      setRecapError(
        dcs.length > 1
          ? `Finish each location: ${incomplete
              .map((d) => d.label)
              .join(", ")}. Set delivery/pickup, quantity, and the matching details.`
          : "Set delivery or pickup, quantity, and the matching details before continuing."
      );
      return false;
    }
    // Helpers: collapse a need's grade + sizes for the wire.
    const sizesOf = (n: PerDcNeed) =>
      n.sizes.includes("Other") && n.sizeOther.trim()
        ? [...n.sizes.filter((s) => s !== "Other"), n.sizeOther.trim()]
        : n.sizes;
    const conditionOf = (n: PerDcNeed) =>
      n.condition === "Recycled" && n.recycledGrade
        ? `Recycled - Grade ${n.recycledGrade}`
        : n.condition || null;
    // Flat fields carry the PRIMARY location's need (the deployed backend
    // still reads these); dc_needs carries the full per-location detail for
    // the backend update.
    const primary = dcNeeds[locs[0].id] || EMPTY_NEED;
    const payload = {
      email: buyerEmail.trim(),
      first_name: recapData.firstName.trim(),
      last_name: recapData.lastName.trim(),
      company: recapData.company.trim(),
      zip: activeDc?.label || locs[0].label || "",
      locations: dcs.map((d) => d.label),
      pallet_types: primary.palletTypes,
      condition: conditionOf(primary) || undefined,
      sizes: sizesOf(primary),
      quantity: primary.quantity || undefined,
      frequency: primary.frequency || undefined,
      direction: primary.direction || undefined,
      timeline: primary.timeline || undefined,
      notes: primary.notes.trim() || undefined,
      dc_needs: locs.map((d) => {
        const n = dcNeeds[d.id] || EMPTY_NEED;
        return {
          dc: d.label,
          direction: n.direction || null,
          pallet_types: n.palletTypes,
          condition: conditionOf(n),
          sizes: sizesOf(n),
          pickup_type: n.pickupType || null,
          quantity: n.quantity || null,
          frequency: n.frequency || null,
          timeline: n.timeline || null,
          notes: n.notes.trim() || null,
        };
      }),
      vendor_ids: ids,
      // Which location (label) each vendor was shortlisted under, so the
      // relay can show that vendor the need for THEIR corridor.
      vendor_dc: Object.fromEntries(
        ids.map((id) => {
          const dcId = selectionDc[id] || dcs[0]?.id || "";
          const label =
            dcs.find((d) => d.id === dcId)?.label || activeDc?.label || "";
          return [id, label];
        })
      ),
      wants_managed: recapData.wantsManaged,
      source: "find-a-vendor",
      session_id:
        typeof window !== "undefined"
          ? window.sessionStorage.getItem("ps_session_id") || ""
          : "",
    };
    try {
      const res = await fetch(SUBMIT_BUYER_REQUEST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data: CaptureResponse = await res.json().catch(() => ({ ok: false }));
      if (!res.ok || !data.ok || !data.requestId) {
        setRecapError(data.error || `Submit failed (HTTP ${res.status})`);
        return false;
      }
      setRequestId(data.requestId);
      // Reset per-vendor action state for this capture; the reveal/send
      // screen renders based on hasEmailMap + vendorActions.
      setVendorActions({});
      // Managed path: the buyer asked PS to run the sourcing. Do NOT advance
      // to the direct send/reveal screen - handing the vendor the buyer's
      // contact would cut PS out of the middle. The managed lead is already
      // captured (scoping_requests); just confirm PS will handle it.
      setFlowStep(recapData.wantsManaged ? "managed" : "reveal");
      return true;
    } catch (e) {
      setRecapError(
        `Submit failed: ${e instanceof Error ? e.message : String(e)}. The page didn't advance - nothing was lost.`
      );
      return false;
    }
  }

  // Per-vendor send relay (only for vendors with a usable email).
  // Server validates the email is usable; if it isn't, the unified
  // screen wouldn't have offered "Send request" anyway.
  async function sendVendorRequest(vendorId: string): Promise<void> {
    if (!requestId) return;
    setVendorActions((prev) => ({ ...prev, [vendorId]: { kind: "pending" } }));
    try {
      const res = await fetch(SEND_VENDOR_REQUEST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, vendor_id: vendorId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setVendorActions((prev) => ({
          ...prev,
          [vendorId]: {
            kind: "pending",
            error: data.error || `Send failed (HTTP ${res.status})`,
          },
        }));
        return;
      }
      setVendorActions((prev) => ({ ...prev, [vendorId]: { kind: "sent" } }));
    } catch (e) {
      setVendorActions((prev) => ({
        ...prev,
        [vendorId]: {
          kind: "pending",
          error: `Send failed: ${e instanceof Error ? e.message : String(e)}`,
        },
      }));
    }
  }

  // Per-vendor phone reveal from the unified screen. Pick 3 capped via
  // existing requestReveal flow + adds requestId so reveal-vendor-
  // contact also stamps relay_results[vendor].status='phone_revealed'.
  async function revealVendorFromUnified(v: VendorEntry): Promise<void> {
    // Reveal is now INDEPENDENT of send - a vendor can be both sent AND
    // revealed. requestReveal populates the `revealed` map (and respects the
    // 3-per-visit cap); the reveal/send screen reads `revealed[v.id]`
    // directly, so send state in vendorActions is left untouched.
    await requestReveal(v, requestId || undefined);
  }

  // Buyer clicks "Done" on the unified screen. Fires the buyer
  // confirmation email listing only vendors with status='sent'. Phone-
  // revealed vendors are NOT in the relay list (buyer calls those).
  // Best-effort: a failed confirmation does NOT undo the captured demand
  // signal or the per-vendor outcomes already in relay_results.
  async function doneAndSummary(): Promise<void> {
    if (requestId) {
      try {
        await fetch(SEND_BUYER_SUMMARY_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId }),
        });
      } catch (e) {
        console.error("buyer-summary best-effort failed:", e);
      }
    }
    // Reset to results-list state; need fields persist for the next
    // session per the wizard <-> describe shared-state design.
    setFlowStep("none");
    setRequestId(null);
    setVendorActions({});
    setHasEmailMap({});
    setRecapData({ ...recapData, wantsManaged: false });
    clearSelection();
  }

  // has-email lookup runs once when the unified screen opens. The
  // booleans decide per-vendor which button to show.
  useEffect(() => {
    if (flowStep !== "reveal") return;
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    let cancelled = false;
    setHasEmailLoading(true);
    fetch(HAS_EMAIL_LOOKUP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendor_ids: ids }),
    })
      .then((r) => r.json())
      .then((data: { results: HasEmailResult[] }) => {
        if (cancelled) return;
        const map: Record<string, boolean> = {};
        for (const r of data.results || []) map[r.vendor_id] = !!r.has_email;
        setHasEmailMap(map);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error("has-email-lookup failed:", e);
        // Conservative fallback: treat as no-email so the buyer gets
        // the phone-reveal path (which still works) instead of clicking
        // Send and hitting a server validation error.
        const map: Record<string, boolean> = {};
        for (const id of ids) map[id] = false;
        setHasEmailMap(map);
      })
      .finally(() => {
        if (!cancelled) setHasEmailLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Intentionally exclude selectedIds from deps -- the lookup runs
    // once per unified-screen open. Selections are frozen at capture
    // time (vendor_ids[] is already written to buyer_requests).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowStep]);

  // ---- map refs ----
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersLayerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null);
  const [leafletReady, setLeafletReady] = useState(false);

  // Ids of international (display-only) vendors, populated when the intl index
  // loads. Read by the shortlist/reveal/RFQ gate so those US-only flows never
  // fire for an international listing.
  const internationalIdsRef = useRef<Set<string>>(new Set());

  // ---- load the index (US required; international merged in, best-effort) ----
  useEffect(() => {
    let cancelled = false;
    const cleanRows = (data: unknown): VendorEntry[] =>
      (Array.isArray(data) ? (data as VendorEntry[]) : []).filter(
        (v) => typeof v.lat === "number" && typeof v.lng === "number"
      );
    // US index is required. The international index is OPTIONAL: a missing,
    // empty, or failed fetch degrades to an empty list, so the domestic finder
    // is never affected by the international layer.
    const usP = fetch(VENDOR_INDEX_URL).then((r) => {
      if (!r.ok) throw new Error(`index HTTP ${r.status}`);
      return r.json();
    });
    const intlP = fetch(INTL_VENDOR_INDEX_URL)
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []);
    Promise.all([usP, intlP])
      .then(([usData, intlData]) => {
        if (cancelled) return;
        // US rows that predate the country field are tagged domestic.
        const us = cleanRows(usData).map((v) =>
          v.country ? v : { ...v, country: "United States" }
        );
        const seen = new Set(us.map((v) => v.id));
        const intl = cleanRows(intlData).filter((v) => !seen.has(v.id));
        internationalIdsRef.current = new Set(
          intl.filter(isInternationalEntry).map((v) => v.id)
        );
        setRawVendorIndex([...us, ...intl]);
        setIndexLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setIndexError(String(e.message || e));
        setIndexLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- init Leaflet once we're in results phase ----
  useEffect(() => {
    if (phase !== "results") return;
    if (mapRef.current) return; // already initialized
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let instance: any = null;
    (async () => {
      const Lmod = await import("leaflet");
      if (cancelled || !mapContainerRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (Lmod as any).default || Lmod;
      const map = L.map(mapContainerRef.current, {
        center: [39.5, -98.5],
        zoom: 4,
        zoomControl: false,
        scrollWheelZoom: true,
      });
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        {
          maxZoom: 16,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attribution">CARTO</a>',
        }
      ).addTo(map);
      // Top-left avoids the floating results panel (right side) and the
      // horizontal legend bar (bottom). 2026-06-01 in-page rebuild.
      L.control.zoom({ position: "topleft" }).addTo(map);
      markersLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      leafletRef.current = L;
      instance = map;
      setLeafletReady(true);
    })();
    return () => {
      cancelled = true;
      if (instance) instance.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      leafletRef.current = null;
      setLeafletReady(false);
    };
  }, [phase]);

  // ---- map: react to container size changes (mobile <-> desktop transition,
  // window resize). Without this, Leaflet keeps its initial tile grid and the
  // map looks cropped after a viewport break. 2026-06-01 in-page rebuild.
  useEffect(() => {
    if (!leafletReady || !mapRef.current || !mapContainerRef.current) return;
    const map = mapRef.current;
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(mapContainerRef.current);
    return () => observer.disconnect();
  }, [leafletReady, mapContainerRef]);

  const activeDc = useMemo(
    () => dcs.find((d) => d.id === activeDcId) || dcs[0] || null,
    [dcs, activeDcId]
  );

  // ---- nearby vendors for a DC (expanding radius, never empty) ----
  const nearbyFor = useCallback(
    (dc: DC): { items: { v: VendorEntry; dist: number }[]; radius: number } => {
      const withDist = vendorIndex.map((v) => ({
        v,
        dist: haversineMi(dc.lat, dc.lng, v.lat, v.lng),
      }));
      withDist.sort((a, b) => a.dist - b.dist);
      for (const r of RADII_MI) {
        const hits = withDist.filter((x) => x.dist <= r);
        if (hits.length >= MIN_RESULTS) return { items: hits, radius: r };
      }
      const widest = RADII_MI[RADII_MI.length - 1] ?? 250;
      const within = withDist.filter((x) => x.dist <= widest);
      if (within.length > 0) return { items: within, radius: widest };
      // Truly nothing in 250mi (rare) - show the nearest handful anyway.
      return { items: withDist.slice(0, 8), radius: widest };
    },
    [vendorIndex]
  );

  // ---- ranked + filtered list for the active DC ----
  const ranked: RankedVendor[] = useMemo(() => {
    if (!activeDc) return [];
    // The list caps to the buyer's chosen radius (the map still shows the
    // broader nearby pins, so the map is never empty and the neutrality
    // wall holds). Distance-sorted; ranking below is distance-only.
    const within = vendorIndex
      .map((v) => ({
        v,
        dist: haversineMi(activeDc.lat, activeDc.lng, v.lat, v.lng),
      }))
      .filter((x) => x.dist <= radiusMi)
      .sort((a, b) => a.dist - b.dist);
    let rows: RankedVendor[] = within.map(({ v, dist }) => {
      const m = computeMatch(v, filters);
      return { v, dist, matched: m.matched, isMatch: m.isMatch };
    });

    // verifiedOnly is an explicit "filter into the verified pool" choice.
    // It filters the LIST (the map still shows all nearby pins, so the map
    // is never empty and the neutrality wall holds).
    if (filters.verifiedOnly) {
      rows = rows.filter((r) => r.v.status === "enhanced");
    }

    // Capability filters: soft by default (re-rank + annotate, never
    // exclude); hard mode (one config flip) excludes non-matches.
    const anyActive = FILTER_GROUPS.some((g) => filters[g.key].size > 0);
    if (anyActive && CAPABILITY_FILTER_MODE === "hard") {
      rows = rows.filter((r) => r.isMatch);
    }

    // RANKING (sort priority, highest first):
    //   1. Buyer's own filter match -- if the buyer typed filters, a match
    //      beats a non-match. Their query wins. (Only when filters active.)
    //   2. Distance ascending.
    // TRUST TIER IS NEVER A SORT KEY (locked 2026-06-01). Enhanced is paid, so
    // ranking by tier would be pay-for-placement -- exactly what the neutrality
    // wall forbids, and what /find-a-vendor promises ("ranks by distance only,
    // paying never buys a higher spot"). Tier is a dot color + the explicit
    // "verified only" filter the buyer chooses; it never moves a vendor up.
    rows.sort((a, b) => {
      if (anyActive && a.isMatch !== b.isMatch) return a.isMatch ? -1 : 1;
      return a.dist - b.dist;
    });
    return rows;
  }, [activeDc, vendorIndex, radiusMi, filters]);

  // pins to render = union of nearby vendors across ALL dcs (so footprint
  // mode shows everyone), plus every DC pin.
  const allPins: VendorEntry[] = useMemo(() => {
    if (dcs.length === 0) return [];
    const seen = new Set<string>();
    const out: VendorEntry[] = [];
    for (const dc of dcs) {
      for (const { v } of nearbyFor(dc).items) {
        if (!seen.has(v.id)) {
          seen.add(v.id);
          out.push(v);
        }
      }
    }
    return out;
  }, [dcs, nearbyFor]);

  const selectedVendor = useMemo(
    () => allPins.find((v) => v.id === selectedVendorId) || null,
    [allPins, selectedVendorId]
  );

  // keep a fresh select handler for the leaflet markers (avoid stale closure)
  const selectRef = useRef<(id: string) => void>(() => {});
  selectRef.current = (id: string) => {
    setSelectedVendorId(id);
  };
  const focusDcRef = useRef<(id: string) => void>(() => {});
  focusDcRef.current = (id: string) => {
    setActiveDcId(id);
    setSelectedVendorId(null);
  };

  // Add-to-shortlist from the detail card. On a real ADD (not a remove, and
  // only if under the cap), close the card back to the results + map, scroll
  // the vendor's row into view, and pulse its map dot so the pick registers.
  // A remove just toggles and stays on the card.
  const addFromCard = (id: string) => {
    const wasSelected = selectedIds.has(id);
    const willAdd = !wasSelected && selectedIds.size < shortlistCap;
    toggleSelect(id);
    if (!willAdd) return;
    setSelectedVendorId(null); // back to the results list + map
    setJustAddedId(id); // trigger the one-shot dot pulse
    // NOTE: intentionally NOT scrolling the row into view - scrollIntoView
    // was bubbling to the page/map and repositioning it on add.
    if (typeof window !== "undefined") {
      window.setTimeout(() => setJustAddedId(null), 2600);
    }
  };

  // ---- draw markers whenever pins / selection change ----
  useEffect(() => {
    if (!leafletReady || !markersLayerRef.current || !leafletRef.current)
      return;
    const L = leafletRef.current;
    const layer = markersLayerRef.current;
    layer.clearLayers();

    // vendor dots -- map-list sync: a hovered row in the list highlights
    // its pin via the same `selected` styling (ring + bump). Selection
    // wins over hover so an open card always shows the strongest pin.
    allPins.forEach((v) => {
      const isSelected = v.id === selectedVendorId;
      const isHovered = !isSelected && v.id === hoveredVendorId;
      const icon = L.divIcon({
        html: makeDotHtml(
          v.status,
          isSelected || isHovered,
          v.id === justAddedId
        ),
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        className: "",
      });
      const marker = L.marker([v.lat, v.lng], {
        icon,
        zIndexOffset:
          isSelected
            ? 900
            : isHovered
              ? 700
              : v.status === "enhanced"
                ? 500
                : v.status === "claimed"
                  ? 200
                  : 0,
      });
      marker.on("click", () => selectRef.current(v.id));
      // Hover the row when the pin is hovered (the inverse of the
      // row→pin sync). Pure UI feedback; doesn't change state machine.
      marker.on("mouseover", () => setHoveredVendorId(v.id));
      marker.on("mouseout", () => setHoveredVendorId(null));
      layer.addLayer(marker);
    });

    // DC pins on top
    dcs.forEach((dc) => {
      const icon = L.divIcon({
        html: makeDcPinHtml(dc.label),
        iconSize: [80, 48],
        iconAnchor: [40, 44],
        className: "",
      });
      const marker = L.marker([dc.lat, dc.lng], { icon, zIndexOffset: 1000 });
      marker.on("click", () => focusDcRef.current(dc.id));
      layer.addLayer(marker);
    });
  }, [allPins, dcs, selectedVendorId, hoveredVendorId, justAddedId, leafletReady, setHoveredVendorId]);

  // ---- fit map to the active DC + its nearby vendors ----
  useEffect(() => {
    if (!leafletReady || !mapRef.current || !leafletRef.current) return;
    const L = leafletRef.current;
    const map = mapRef.current;
    const id = setTimeout(() => {
      map.invalidateSize();
      if (dcs.length === 0) return;
      // Always focus the ACTIVE DC + its nearby vendors (never a wide
      // all-DCs overview - that zoomed out to the whole country for far-
      // apart footprints). Switching/adding a DC re-runs this and flies in.
      const pts: [number, number][] = [];
      if (activeDc) {
        pts.push([activeDc.lat, activeDc.lng]);
        ranked.slice(0, 12).forEach((r) => pts.push([r.v.lat, r.v.lng]));
      }
      if (pts.length === 1) {
        map.setView(pts[0], 10, { animate: true });
      } else if (pts.length > 1) {
        map.fitBounds(L.latLngBounds(pts), { padding: [50, 50], maxZoom: 11 });
      }
    }, 90);
    return () => clearTimeout(id);
  }, [activeDc, dcs, ranked, leafletReady]);

  // ---- wizard: launch search from a ZIP ----
  async function launchFromZip(query: string) {
    setGeoError(null);
    const raw = query.trim();
    if (!raw) {
      setGeoError("Enter a ZIP code or city to search.");
      return;
    }
    setGeoBusy(true);
    const dc = await geocodePlace(raw);
    setGeoBusy(false);
    if (!dc) {
      setGeoError(
        "Could not find that location. Try a 5-digit ZIP or 'City, ST'."
      );
      return;
    }
    setDcs([dc]);
    setActiveDcId(dc.id);
    setSelectedVendorId(null);
    setPhase("results");
  }

  // ---- skip wizard into browse mode (national map, ZIP prompt up top) ----
  function skipWizard() {
    setDcs([]);
    setActiveDcId(null);
    setPhase("results");
  }

  // ---- start over: back to the wizard, clear the search ----
  function restart() {
    setPhase("wizard");
    setWizardStep(1);
    setDcs([]);
    setActiveDcId(null);
    setSelectedVendorId(null);
    setAddZip("");
    setAddError(null);
    setGeoError(null);
    // Also drop the active flow + shortlist so a fresh wizard run
    // doesn't carry over half-finished state.
    setFlowStep("none");
    setRequestId(null);
    setVendorActions({});
    clearSelection();
  }

  // ---- add another DC (footprint mode) ----
  async function addDc(query: string) {
    setAddError(null);
    const raw = query.trim();
    if (!raw) return;
    setAddBusy(true);
    const dc = await geocodePlace(raw);
    setAddBusy(false);
    if (!dc) {
      setAddError("Could not find that location.");
      return;
    }
    setDcs((prev) => [...prev, dc]);
    setActiveDcId(dc.id);
    setSelectedVendorId(null);
    setAddZip("");
  }

  function removeDc(id: string) {
    setDcs((prev) => {
      const next = prev.filter((d) => d.id !== id);
      if (activeDcId === id) setActiveDcId(next[0]?.id || null);
      return next;
    });
  }

  // ---- filters ----
  function toggleFilter(dim: FilterDimension, value: string) {
    setFilters((prev) => {
      const next = new Set(prev[dim]);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return { ...prev, [dim]: next };
    });
  }
  function clearFilters() {
    setFilters({
      classification: new Set(),
      services: new Set(),
      palletTypes: new Set(),
      treatments: new Set(),
      verifiedOnly: false,
    });
  }
  const activeFilterCount =
    filters.classification.size +
    filters.services.size +
    filters.palletTypes.size +
    filters.treatments.size +
    (filters.verifiedOnly ? 1 : 0);

  // ---- Pick 3 reveal flow ----
  // The optional buyerRequestId is passed by the unified reveal/send
  // screen so the reveal also stamps relay_results[vendor].status=
  // 'phone_revealed' on the parent buyer_requests row. Older call sites
  // (the standalone escape-hatch reveal) omit it and the server just
  // records the lead in buyer_contacts as before.
  function requestReveal(v: VendorEntry, buyerRequestId?: string) {
    if (revealed[v.id]) return; // already revealed
    if (picksLeftForDc(dcForVendor(v.id)) <= 0) return; // per-location gate
    if (!buyerEmail) {
      setEmailDraft("");
      setEmailErr(null);
      setEmailModalFor(v);
      return;
    }
    return performReveal(v, buyerEmail, buyerRequestId);
  }

  function submitEmailGate() {
    const email = emailDraft.trim();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!ok) {
      setEmailErr("Enter a valid email so the vendor can reach you back.");
      return;
    }
    setBuyerEmail(email);
    const v = emailModalFor;
    setEmailModalFor(null);
    if (v) performReveal(v, email);
  }

  async function performReveal(v: VendorEntry, email: string, buyerRequestId?: string) {
    setRevealBusyId(v.id);
    // Count the pick up front, against THIS vendor's location budget.
    const dcId = dcForVendor(v.id);
    setPicksByDc((m) => ({
      ...m,
      [dcId]: Math.min(PICKS_PER_VISIT, (m[dcId] || 0) + 1),
    }));

    let contact: RevealedContact = { connectOnly: true };
    try {
      const res = await fetch(REVEAL_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: v.id,
          vendorName: v.name,
          buyerEmail: email,
          dc: activeDc
            ? { label: activeDc.label, lat: activeDc.lat, lng: activeDc.lng }
            : null,
          // When provided, the reveal endpoint also stamps
          // relay_results[vendor].status='phone_revealed' on the
          // existing buyer_requests row.
          ...(buyerRequestId ? { requestId: buyerRequestId } : {}),
        }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data && (data.phone || data.email)) {
          contact = {
            phone: data.phone || undefined,
            email:
              data.email && data.email !== "No" ? data.email : undefined,
          };
        }
      }
    } catch {
      // network/endpoint unavailable - fall through to connect-only. The
      // reveal endpoint records the buyer lead server-side on success; when
      // it is unreachable we still mark the pick used and show the
      // "PS will connect you" path so the buyer's intent is never lost.
    }

    setRevealed((prev) => ({ ...prev, [v.id]: contact }));
    revealedRef.current = { ...revealedRef.current, [v.id]: contact };
    setRevealBusyId(null);
  }

  // === RENDER ================================================================

  return (
    <div>
      {phase === "wizard" ? (
        <WizardView
          step={wizardStep}
          setStep={setWizardStep}
          needType={needType}
          setNeedType={setNeedType}
          zipInput={zipInput}
          setZipInput={setZipInput}
          geoBusy={geoBusy}
          geoError={geoError}
          onLaunch={() => launchFromZip(zipInput)}
          onSkip={skipWizard}
          recap={recapData}
          setRecap={setRecapData}
          indexLoading={indexLoading}
        />
      ) : (
        <ResultsView
          indexLoading={indexLoading}
          indexError={indexError}
          mapContainerRef={mapContainerRef}
          dcs={dcs}
          activeDc={activeDc}
          activeDcId={activeDc?.id || null}
          setActiveDcId={setActiveDcId}
          removeDc={removeDc}
          addZip={addZip}
          setAddZip={setAddZip}
          addBusy={addBusy}
          addError={addError}
          onAddDc={() => addDc(addZip)}
          onLaunchFirst={(z) => launchFromZip(z)}
          needType={needType}
          ranked={ranked}
          nearbyFor={nearbyFor}
          selectedVendor={selectedVendor}
          selectedVendorId={selectedVendorId}
          setSelectedVendorId={setSelectedVendorId}
          filters={filters}
          toggleFilter={toggleFilter}
          clearFilters={clearFilters}
          activeFilterCount={activeFilterCount}
          filtersOpen={filtersOpen}
          setFiltersOpen={setFiltersOpen}
          setVerifiedOnly={(b: boolean) =>
            setFilters((p) => ({ ...p, verifiedOnly: b }))
          }
          radiusMi={radiusMi}
          setRadiusMi={setRadiusMi}
          revealed={revealed}
          onRestart={restart}
          selectedIds={selectedIds}
          toggleSelect={toggleSelect}
          hoveredVendorId={hoveredVendorId}
          setHoveredVendorId={setHoveredVendorId}
          maxSelect={shortlistCap}
          selectionNudge={selectionNudge}
          showTray={selectedIds.size > 0 && flowStep === "none"}
          onSendStart={() => setFlowStep("describe")}
          onClearSelection={clearSelection}
          onAddFromCard={addFromCard}
        />
      )}

      {/* email gate modal (escape-hatch Pick 3 path) */}
      {emailModalFor && (
        <EmailGateModal
          vendor={emailModalFor}
          email={emailDraft}
          setEmail={setEmailDraft}
          error={emailErr}
          onCancel={() => setEmailModalFor(null)}
          onSubmit={submitEmailGate}
          picksLeft={picksLeftForDc(dcForVendor(emailModalFor.id))}
        />
      )}

      {/* Selection tray is rendered INSIDE the ResultsView shell as
          a docked flex child at the bottom (no longer fixed). It's
          part of the workspace, not floating over the page. See the
          tray render at the end of ResultsView's return. */}

      {/* Step 2 (Describe) -- need + email form, single source of truth
          shared with the wizard's "Add sourcing details" step. On
          submit, captures the demand signal to buyer_requests BEFORE
          any reveal/send so the data survives even if the buyer
          leaves. Continue advances to the unified reveal/send screen. */}
      {flowStep === "describe" && (
        <DescribeOverlay
          recap={recapData}
          setRecap={setRecapData}
          buyerEmail={buyerEmail}
          setBuyerEmail={setBuyerEmail}
          error={recapError}
          selectedCount={selectedIds.size}
          dcs={dcs}
          dcNeeds={dcNeeds}
          setDcNeeds={setDcNeeds}
          onBack={() => {
            setFlowStep("none");
            setRecapError(null);
          }}
          onSubmit={captureRequest}
        />
      )}

      {/* Step 3 (Reveal/Send) -- the unified screen. Per vendor: "Send
          request" if has_email, "Reveal phone (X of 3 left)" + call
          script if not. Done button at the bottom fires the buyer
          confirmation email and closes. */}
      {flowStep === "reveal" && (
        <RevealSendOverlay
          selectedIds={Array.from(selectedIds)}
          vendorsById={vendorById}
          recap={recapData}
          buyerEmail={buyerEmail}
          hasEmailMap={hasEmailMap}
          hasEmailLoading={hasEmailLoading}
          vendorActions={vendorActions}
          revealed={revealed}
          picksByDc={picksByDc}
          revealBusyId={revealBusyId}
          activeDcLabel={activeDc?.label || ""}
          dcs={dcs}
          selectionDc={selectionDc}
          dcNeeds={dcNeeds}
          onSend={sendVendorRequest}
          onReveal={revealVendorFromUnified}
          onDone={doneAndSummary}
        />
      )}

      {/* Managed path confirmation - shown INSTEAD of the send/reveal screen
          when the buyer asked PS to source it. No vendor relay fires (that
          would cut PS out of the middle); the managed lead is already
          captured server-side. */}
      {flowStep === "managed" && (
        <div className="fixed inset-0 z-[2000] flex items-stretch justify-center bg-ink-900/60 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="flex h-full w-full max-w-md flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:rounded-2xl">
            <div className="flex-1 px-6 py-10 text-center sm:py-12">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  className="h-7 w-7"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="mt-5 text-2xl font-bold tracking-tight text-ink-900">
                We&apos;re on it.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-600">
                Pallet Solutions will source this for you - we&apos;ll reach out
                to vendors, gather pricing, and follow up at{" "}
                <strong>{buyerEmail}</strong> with a single quote. No need to
                chase{" "}
                {selectedIds.size} {selectedIds.size === 1 ? "vendor" : "vendors"}{" "}
                yourself.
              </p>
              <p className="mt-3 text-xs leading-relaxed text-ink-500">
                Your details stay with us - they are not sent to the vendors
                directly.
              </p>
            </div>
            <div className="border-t border-ink-100 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setFlowStep("none");
                  clearSelection();
                  setRecapData({ ...recapData, wantsManaged: false });
                }}
                className="w-full rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-600"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// WIZARD
// ===========================================================================

function WizardView(props: {
  step: number;
  setStep: (n: number) => void;
  needType: NeedType | null;
  setNeedType: (n: NeedType) => void;
  zipInput: string;
  setZipInput: (s: string) => void;
  geoBusy: boolean;
  geoError: string | null;
  onLaunch: () => void;
  onSkip: () => void;
  recap: RecapData;
  setRecap: (r: RecapData) => void;
  indexLoading: boolean;
}) {
  const {
    step,
    setStep,
    needType,
    setNeedType,
    zipInput,
    setZipInput,
    geoBusy,
    geoError,
    onLaunch,
    onSkip,
    recap,
    setRecap,
  } = props;

  // Step 1's need-type pre-fills recap.direction (single shared state).
  // If the buyer later changes direction in the recap form (or in Step 3
  // below), that wins. Bidirectional by virtue of one state.
  const NEED_TO_DIRECTION: Record<NeedType, RecapData["direction"]> = {
    delivery: "Delivery",
    pickup: "Pickup",
    both: "Both",
  };

  const NEEDS: { key: NeedType; title: string; body: string }[] = [
    {
      key: "delivery",
      title: "Delivered",
      body: "A vendor brings pallets to my DC.",
    },
    {
      key: "pickup",
      title: "Pickup",
      body: "I collect, or they stage for pickup.",
    },
    {
      key: "both",
      title: "Both / not sure",
      body: "Show me everything nearby.",
    },
  ];

  return (
    <section className="relative bg-gradient-to-b from-brand-50/40 via-ink-50/30 to-white">
      <div className="mx-auto max-w-3xl px-6 pt-8 pb-14 sm:pt-10 sm:pb-20">
        {/* progress dots */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={`h-1.5 rounded-full transition-all ${
                n === step
                  ? "w-8 bg-brand-500"
                  : n < step
                    ? "w-8 bg-brand-300"
                    : "w-4 bg-ink-200"
              }`}
            />
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-ink-200 bg-white p-7 shadow-sm sm:p-10">
          {step === 1 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-600">
                Step 1 of 3
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
                How do you need pallets handled?
              </h2>
              <p className="mt-3 text-base text-ink-600">
                This just tunes the order of results. You can change it later -
                nothing is hidden either way.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {NEEDS.map((n) => {
                  const on = needType === n.key;
                  return (
                    <button
                      key={n.key}
                      type="button"
                      onClick={() => {
                        setNeedType(n.key);
                        // Pre-fill recap.direction from Step 1's choice.
                        // The buyer can override later in Step 3 or in the
                        // recap form -- shared state, last write wins.
                        setRecap({ ...recap, direction: NEED_TO_DIRECTION[n.key] });
                        setStep(2);
                      }}
                      className={`text-left rounded-xl border p-5 transition-all ${
                        on
                          ? "border-brand-500 bg-brand-50/60 ring-1 ring-brand-500"
                          : "border-ink-200 bg-white hover:border-brand-300 hover:bg-ink-50/50"
                      }`}
                    >
                      <p className="text-base font-semibold text-ink-900">
                        {n.title}
                      </p>
                      <p className="mt-1.5 text-sm leading-snug text-ink-600">
                        {n.body}
                      </p>
                    </button>
                  );
                })}
              </div>
              <div className="mt-7 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onSkip}
                  className="text-sm font-medium text-ink-500 hover:text-brand-600"
                >
                  Skip - just show me the map
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-800"
                >
                  Next <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-600">
                Step 2 of 3
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
                Where is your DC?
              </h2>
              <p className="mt-3 text-base text-ink-600">
                Enter a ZIP or city. We will map the pallet vendors around it,
                ranked by distance. Got more than one facility? You can add the
                rest on the next screen.
              </p>
              <form
                className="mt-6 flex flex-col gap-3 sm:flex-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  onLaunch();
                }}
              >
                <input
                  type="text"
                  inputMode="text"
                  value={zipInput}
                  onChange={(e) => setZipInput(e.target.value)}
                  placeholder="e.g. 30303 or Atlanta, GA"
                  className="flex-1 rounded-lg border border-ink-300 px-4 py-3 text-base text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={geoBusy}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
                >
                  {geoBusy ? "Locating..." : "Find vendors"}
                  {!geoBusy && <span aria-hidden="true">→</span>}
                </button>
              </form>
              {geoError && (
                <p className="mt-3 text-sm text-red-600">{geoError}</p>
              )}
              <div className="mt-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-sm font-medium text-ink-500 hover:text-brand-600"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="text-sm font-medium text-ink-500 hover:text-brand-600"
                >
                  Add sourcing details (optional) →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-600">
                Step 3 of 3 - optional
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
                Add sourcing details
              </h2>
              <p className="mt-3 text-base text-ink-600">
                All optional. We pre-fill the request form with these details
                so you confirm-and-send instead of retyping. They stick for
                this session - sending to vendors near another DC reuses the
                same need.
              </p>

              <div className="mt-7 space-y-5">
                <RecapChipGroup
                  label="Pallet type"
                  options={RECAP_PALLET_TYPES}
                  selected={recap.palletTypes}
                  onToggle={(v) => {
                    const cur = recap.palletTypes;
                    const next = cur.includes(v)
                      ? cur.filter((x) => x !== v)
                      : [...cur, v];
                    setRecap({ ...recap, palletTypes: next });
                  }}
                />
                <RecapToggleGroup
                  label="Grade"
                  options={["New", "Recycled"]}
                  value={recap.condition}
                  onChange={(v) =>
                    setRecap({
                      ...recap,
                      condition: v as RecapData["condition"],
                      recycledGrade:
                        v === "Recycled" ? recap.recycledGrade : "",
                    })
                  }
                />
                {recap.condition === "Recycled" && (
                  <RecapSelect
                    label="Recycled grade"
                    options={["", "AA", "A", "B"]}
                    value={recap.recycledGrade}
                    onChange={(v) =>
                      setRecap({
                        ...recap,
                        recycledGrade: v as RecapData["recycledGrade"],
                      })
                    }
                    placeholder="Choose a grade (AA / A / B)"
                  />
                )}
                <div>
                  <RecapChipGroup
                    label="Size"
                    options={RECAP_SIZES}
                    selected={recap.sizes}
                    onToggle={(v) => {
                      const cur = recap.sizes;
                      const next = cur.includes(v)
                        ? cur.filter((x) => x !== v)
                        : [...cur, v];
                      setRecap({ ...recap, sizes: next });
                    }}
                  />
                  {recap.sizes.includes("Other") && (
                    <div className="mt-3">
                      <RecapTextField
                        label="Other size"
                        placeholder='e.g. 45"x48"'
                        value={recap.sizeOther}
                        onChange={(v) => setRecap({ ...recap, sizeOther: v })}
                      />
                    </div>
                  )}
                </div>
                <RecapSelect
                  label="Quantity"
                  options={["", ...RECAP_QUANTITIES]}
                  value={recap.quantity}
                  onChange={(v) => setRecap({ ...recap, quantity: v })}
                  placeholder="Choose a range"
                />
                <RecapToggleGroup
                  label="Frequency"
                  options={["One-time", "Recurring"]}
                  value={recap.frequency}
                  onChange={(v) =>
                    setRecap({
                      ...recap,
                      frequency: v as RecapData["frequency"],
                    })
                  }
                />
                <RecapToggleGroup
                  label="Delivery or pickup"
                  options={["Delivery", "Pickup", "Both"]}
                  value={recap.direction}
                  onChange={(v) =>
                    setRecap({
                      ...recap,
                      direction: v as RecapData["direction"],
                    })
                  }
                />
                <RecapChipGroup
                  label="Timeline"
                  options={RECAP_TIMELINES}
                  selected={recap.timeline ? [recap.timeline] : []}
                  onToggle={(v) =>
                    setRecap({
                      ...recap,
                      timeline: recap.timeline === v ? "" : v,
                    })
                  }
                  single
                />
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                    Notes (optional)
                  </label>
                  <textarea
                    value={recap.notes}
                    onChange={(e) =>
                      setRecap({ ...recap, notes: e.target.value })
                    }
                    rows={3}
                    placeholder="Anything specific - certifications, packaging, dock constraints."
                    className="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  />
                </div>
              </div>

              <div className="mt-7 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-sm font-medium text-ink-500 hover:text-brand-600"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={onLaunch}
                  disabled={geoBusy}
                  className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
                >
                  {geoBusy ? "Locating..." : "Find vendors"}
                  {!geoBusy && <span aria-hidden="true">→</span>}
                </button>
              </div>
              {geoError && (
                <p className="mt-3 text-right text-sm text-red-600">
                  {geoError}
                </p>
              )}
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-ink-500">
          7,500+ pallet vendors mapped. Free to search. Pick 3 free contact
          reveals per visit, no login.
        </p>
      </div>
    </section>
  );
}

// Shared filter body rendered in BOTH the desktop left panel and the
// mobile collapsible panel, so the two can never drift. Radius selector +
// capability chips. The PS-verified (Enhanced-only) toggle is intentionally
// omitted for now - to be added back later.
function FilterControls(props: {
  filters: Filters;
  toggleFilter: (dim: FilterDimension, value: string) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  radiusMi: number;
  setRadiusMi: (n: number) => void;
  onClose?: () => void;
}) {
  const {
    filters,
    toggleFilter,
    clearFilters,
    activeFilterCount,
    radiusMi,
    setRadiusMi,
    onClose,
  } = props;
  return (
    <div>
      <div className="flex items-center justify-between gap-3 border-b border-ink-200 pb-3">
        <p className="text-base font-bold tracking-tight text-ink-900">
          Filters
        </p>
        <div className="flex items-center gap-3">
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Clear all
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close filters"
              className="flex h-7 w-7 items-center justify-center rounded-full text-ink-500 hover:bg-ink-200 hover:text-ink-800"
            >
              <span aria-hidden="true" className="text-lg leading-none">
                &times;
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Search radius */}
      <div className="mt-4">
        <p className="mb-1.5 text-[13px] font-bold uppercase tracking-[0.1em] text-ink-800">
          Search radius
        </p>
        <div className="flex flex-wrap gap-1.5">
          {RADIUS_OPTIONS.map((r) => {
            const on = radiusMi === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRadiusMi(r)}
                aria-pressed={on}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  on
                    ? "border-brand-500 bg-brand-500 text-white"
                    : "border-ink-300 bg-white text-ink-700 hover:border-brand-400 hover:text-brand-700"
                }`}
              >
                {r} mi
              </button>
            );
          })}
        </div>
      </div>

      {/* Capability filters */}
      <div className="mt-1">
        {FILTER_GROUPS.map((g) => (
          <FilterChips
            key={g.key}
            title={g.label}
            options={g.options}
            selected={filters[g.key]}
            onToggle={(v) => toggleFilter(g.key, v)}
          />
        ))}
      </div>

      <p className="mt-5 text-[11px] leading-relaxed text-ink-500">
        Filters apply to every listing. Listed (public-records) classifications
        are best-effort and may be incomplete - claimed listings carry
        vendor-confirmed data. Clear a filter to widen the pool.
      </p>
    </div>
  );
}

function FilterChips(props: {
  title: string;
  options: string[];
  selected: Set<string>;
  onToggle: (v: string) => void;
}) {
  return (
    <div className="mt-6">
      <p className="text-[13px] font-bold uppercase tracking-[0.1em] text-ink-800">
        {props.title}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {props.options.map((opt) => {
          const on = props.selected.has(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => props.onToggle(opt)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                on
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-ink-300 bg-white text-ink-700 hover:border-brand-400 hover:text-brand-700"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ===========================================================================
// RESULTS
// ===========================================================================

function ResultsView(props: {
  indexLoading: boolean;
  indexError: string | null;
  mapContainerRef: RefObject<HTMLDivElement | null>;
  dcs: DC[];
  activeDc: DC | null;
  activeDcId: string | null;
  setActiveDcId: (id: string) => void;
  removeDc: (id: string) => void;
  addZip: string;
  setAddZip: (s: string) => void;
  addBusy: boolean;
  addError: string | null;
  onAddDc: () => void;
  onLaunchFirst: (z: string) => void;
  needType: NeedType | null;
  ranked: RankedVendor[];
  nearbyFor: (dc: DC) => { items: { v: VendorEntry; dist: number }[]; radius: number };
  selectedVendor: VendorEntry | null;
  selectedVendorId: string | null;
  setSelectedVendorId: (id: string | null) => void;
  filters: Filters;
  toggleFilter: (dim: FilterDimension, value: string) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  filtersOpen: boolean;
  setFiltersOpen: (b: boolean) => void;
  setVerifiedOnly: (b: boolean) => void;
  radiusMi: number;
  setRadiusMi: (n: number) => void;
  revealed: Record<string, RevealedContact>;
  onRestart: () => void;
  // Multi-select state owned by parent -- threaded through so the list
  // checkboxes + map dot highlight stay in sync.
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  hoveredVendorId: string | null;
  setHoveredVendorId: (id: string | null) => void;
  // Tray docks at the bottom of the shell as a flex child. Parent
  // owns the selection state + the "start the describe step" callback;
  // this view just controls visibility + renders the bar.
  maxSelect: number;
  selectionNudge: string | null;
  showTray: boolean;
  onSendStart: () => void;
  onClearSelection: () => void;
  onAddFromCard: (id: string) => void;
}) {
  const {
    indexLoading,
    indexError,
    mapContainerRef,
    dcs,
    activeDc,
    activeDcId,
    setActiveDcId,
    removeDc,
    addZip,
    setAddZip,
    addBusy,
    addError,
    onAddDc,
    onLaunchFirst,
    needType,
    ranked,
    nearbyFor,
    selectedVendor,
    setSelectedVendorId,
    filters,
    toggleFilter,
    clearFilters,
    activeFilterCount,
    filtersOpen,
    setFiltersOpen,
    radiusMi,
    setRadiusMi,
    revealed,
    onRestart,
    selectedIds,
    toggleSelect,
    hoveredVendorId,
    setHoveredVendorId,
    maxSelect,
    selectionNudge,
    showTray,
    onSendStart,
    onClearSelection,
    onAddFromCard,
  } = props;

  const needLabel =
    needType === "delivery"
      ? "vendors that can deliver to you"
      : needType === "pickup"
        ? "vendors you can pick up from"
        : "pallet vendors";

  const matchCount = ranked.filter((r) => r.isMatch).length;

  return (
    // ============================================================
    // IN-PAGE TOOL SHELL (Zillow-pattern floating panel) -
    // REBUILT 2026-06-01
    // ============================================================
    // The results view is an IN-PAGE section, not a viewport takeover.
    // The page scrolls normally above (hero, color strip) and below
    // (stats, four-tier explainer, FAQ) the tool. The tool itself:
    //   - A normal-flow top bar (DC tags, filters) above the map.
    //   - On desktop: a bounded h-[78vh] section holding the Leaflet
    //     map full-bleed with the vendor results as a floating panel
    //     anchored to the right side. The panel scrolls internally so
    //     the map stays put.
    //   - On mobile: the map renders at h-[45vh] in normal flow and
    //     the results list stacks below it. The PAGE handles the scroll.
    //   - Horizontal legend bar pinned to the bottom of the map. On
    //     desktop the bar's right edge is pulled in (lg:right-[440px])
    //     so it does not slide under the floating results panel.
    //   - Selection tray uses position: sticky bottom-0 so it stays
    //     visible while the buyer is on the tool, and scrolls away
    //     naturally when they move past it.
    //
    // The fixed inset-0 takeover + body scroll lock are GONE; the
    // page scroll is unblocked.
    //
    // TODO (later): an "Expand map" button that re-enters a full-screen
    // viewport view for buyers who want it. Out of scope this pass.
    <section className="relative bg-white">
      {/* TOP BAR ZONE - in normal page flow above the map. Goes dark once a
          DC footprint is set (results mode) so the DC controls read as a
          deliberate command bar. */}
      <div
        className={`border-b ${
          dcs.length > 0 ? "border-ink-800 bg-ink-900" : "border-ink-100 bg-white"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          {dcs.length === 0 ? (
            // browse mode (wizard skipped): ZIP prompt front and center
            <form
              className="flex flex-col gap-2 sm:flex-row sm:items-center"
              onSubmit={(e) => {
                e.preventDefault();
                onLaunchFirst(addZip);
              }}
            >
              <span className="text-sm font-medium text-ink-700">
                Enter a DC location to begin:
              </span>
              <input
                type="text"
                value={addZip}
                onChange={(e) => setAddZip(e.target.value)}
                placeholder="ZIP or City, ST"
                className="flex-1 rounded-lg border border-ink-300 px-3.5 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:max-w-xs"
              />
              <button
                type="submit"
                disabled={addBusy}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {addBusy ? "Locating..." : "Search"}
              </button>
              {addError && (
                <span className="text-sm text-red-600">{addError}</span>
              )}
            </form>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold uppercase tracking-wide text-white">
                {dcs.length === 1 ? "Your DC" : "Your footprint"}:
              </span>
              {dcs.map((dc) => {
                const on = dc.id === activeDcId;
                return (
                  <span
                    key={dc.id}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${
                      on
                        ? "border-brand-500 bg-brand-50 text-brand-800"
                        : "border-ink-200 bg-white text-ink-700"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveDcId(dc.id)}
                      className="font-medium"
                    >
                      {dc.label}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeDc(dc.id)}
                      aria-label={`Remove ${dc.label}`}
                      className="text-ink-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
              {/* add another DC */}
              <form
                className="inline-flex items-center gap-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  onAddDc();
                }}
              >
                <input
                  type="text"
                  value={addZip}
                  onChange={(e) => setAddZip(e.target.value)}
                  placeholder="+ add a DC (up to 5)"
                  className="w-44 rounded-full border border-dashed border-ink-600 bg-ink-800 px-3 py-1 text-sm text-white placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
                {addZip.trim() && (
                  <button
                    type="submit"
                    disabled={addBusy}
                    className="rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
                  >
                    {addBusy ? "..." : "Add"}
                  </button>
                )}
              </form>
              {addError && (
                <span className="text-sm text-red-600">{addError}</span>
              )}

              {/* right cluster: start over + filters */}
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={onRestart}
                  className="text-sm font-semibold text-ink-300 hover:text-white"
                >
                  Start over
                </button>
                <button
                  type="button"
                  onClick={() => setFiltersOpen(!filtersOpen)}
                  className="inline-flex items-center gap-2 rounded-full border border-ink-600 px-3.5 py-1.5 text-sm font-semibold text-ink-100 hover:border-brand-400 hover:text-white lg:hidden"
                >
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 text-xs font-bold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* MOBILE filter panel (collapsible via the Filters button).
            Desktop uses the left floating panel on the map instead. The
            PS-verified toggle is omitted for now. */}
        {filtersOpen && dcs.length > 0 && (
          <div className="border-t border-ink-100 bg-ink-50/60 lg:hidden">
            <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
              <FilterControls
                filters={filters}
                toggleFilter={toggleFilter}
                clearFilters={clearFilters}
                activeFilterCount={activeFilterCount}
                radiusMi={radiusMi}
                setRadiusMi={setRadiusMi}
              />
            </div>
          </div>
        )}
      </div>

      {/* MAP + RESULTS SECTION.
          Desktop (lg+): the outer wrapper is a bounded h-[78vh] container.
          The map fills it (absolute inset-0). The results panel floats
          on the right side and scrolls internally so the map stays put.
          Mobile: the wrapper has no fixed height. The map takes h-[45vh]
          in normal flow; the results panel follows below it and the page
          scrolls naturally. */}
      <div className="relative lg:h-[78vh] lg:min-h-[560px]">
        {/* MAP wrapper.
            Mobile: relative + sized.
            Desktop: absolute inset-0 fills the bounded section behind
            everything.
            Hidden on mobile when a vendor detail is open so the detail
            card takes over the visible area on narrow screens. */}
        <div
          className={`relative h-[45vh] min-h-[320px] lg:absolute lg:inset-0 lg:h-auto lg:min-h-0 ${
            selectedVendor ? "hidden lg:block" : ""
          }`}
        >
          <div
            ref={mapContainerRef}
            className="absolute inset-0 bg-ink-50"
          />
          {indexLoading && (
            <div className="absolute inset-0 z-[401] flex items-center justify-center bg-white/70 text-sm font-medium text-ink-600">
              Loading the vendor network...
            </div>
          )}
          {/* Legend - horizontal bar at the bottom of the map. Slim row.
              On desktop the right edge is pulled in (lg:right-[440px])
              so the bar does not slide under the floating results panel. */}
          <div
            className={`pointer-events-none absolute bottom-3 left-3 right-3 ${
              filtersOpen ? "lg:left-[274px]" : "lg:left-3"
            } lg:right-[440px] z-[400] flex flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-lg border border-ink-200 bg-white/95 px-3 py-1.5 text-xs shadow-sm`}
          >
            <LegendDot color="#8a9bae" label="Listed" />
            <span aria-hidden="true" className="text-ink-300">·</span>
            <LegendDot color="#00C853" label="Claimed" />
            <span aria-hidden="true" className="text-ink-300">·</span>
            <LegendDot color="#49a5c1" label="Enhanced" />
            <span aria-hidden="true" className="text-ink-300">·</span>
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block h-3 w-3 rotate-45 rounded-sm border border-white"
                style={{ background: "#49a5c1" }}
              />
              <span className="text-ink-600">Your DC</span>
            </div>
          </div>
        </div>

        {/* DESKTOP "Filters" toggle - floats at the top-left of the map.
            The panel starts collapsed; this button opens it. Hidden once
            the panel is open (the panel's own X closes it). */}
        {dcs.length > 0 && !filtersOpen && (
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="absolute left-16 top-4 z-[460] hidden items-center gap-2 rounded-full border border-ink-300 bg-white px-4 py-2 text-sm font-semibold text-ink-800 shadow-md hover:border-brand-400 hover:text-brand-700 lg:inline-flex"
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M3 4h14l-5.5 6.5V16l-3 1.5v-7L3 4z" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 text-xs font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}

        {/* LEFT FILTER PANEL - desktop, collapsible. Opens from the Filters
            button above and floats over the left of the map. Mobile uses the
            collapsible panel near the top instead. */}
        {filtersOpen && dcs.length > 0 && (
          <div className="hidden lg:flex lg:flex-col lg:absolute lg:left-4 lg:top-4 lg:bottom-4 lg:w-[250px] lg:overflow-y-auto lg:rounded-xl lg:border lg:border-ink-300 lg:bg-ink-50 lg:p-4 lg:shadow-xl lg:z-[460]">
            <FilterControls
              filters={filters}
              toggleFilter={toggleFilter}
              clearFilters={clearFilters}
              activeFilterCount={activeFilterCount}
              radiusMi={radiusMi}
              setRadiusMi={setRadiusMi}
              onClose={() => setFiltersOpen(false)}
            />
          </div>
        )}

        {/* RESULTS PANEL - Zillow-pattern.
            Mobile: in normal flow below the map, full width.
            Desktop: floating panel anchored to the top-right of the map
            section, scrolls internally so the map stays put. z-[450] keeps
            it above the Leaflet panes (max ~1000 in container, but our map
            here is the underlying inset-0 element; 450 is safely above). */}
        <div className="relative w-full bg-white lg:absolute lg:right-4 lg:top-4 lg:bottom-4 lg:w-[400px] lg:rounded-xl lg:border lg:border-ink-200 lg:shadow-xl lg:overflow-y-auto lg:z-[450]">
          {indexError ? (
            <div className="p-6 text-sm text-red-600">
              Could not load the vendor network ({indexError}). Please refresh.
            </div>
          ) : selectedVendor ? (
            <VendorCard
              v={selectedVendor}
              dc={activeDc}
              onBack={() => setSelectedVendorId(null)}
              reveal={revealed[selectedVendor.id]}
              matched={
                ranked.find((r) => r.v.id === selectedVendor.id)?.matched || []
              }
              isSelected={selectedIds.has(selectedVendor.id)}
              onToggleSelect={() => onAddFromCard(selectedVendor.id)}
            />
          ) : (
            <ResultsList
              dcs={dcs}
              activeDc={activeDc}
              needLabel={needLabel}
              ranked={ranked}
              nearbyFor={nearbyFor}
              radiusMi={radiusMi}
              matchCount={matchCount}
              activeFilterCount={activeFilterCount}
              onSelect={(id) => setSelectedVendorId(id)}
              revealed={revealed}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              hoveredId={hoveredVendorId}
              onHover={setHoveredVendorId}
            />
          )}
          {/* Request-quotes footer pinned to the bottom of the vendor
              panel once the buyer has a shortlist. Sticky within the
              panel's own scroll area (desktop) / page flow (mobile) so the
              CTA travels with the vendor cards instead of sitting in a
              detached full-width strip below the map. */}
          {showTray && (
            <div className="sticky bottom-0 z-10">
              <SelectionTray
                count={selectedIds.size}
                max={maxSelect}
                nudge={selectionNudge}
                onRequestQuotes={onSendStart}
                onClear={onClearSelection}
              />
            </div>
          )}
        </div>
      </div>

      {/* SELECTION TRAY moved into the vendor panel above (sticky footer)
          so the Request-quotes CTA travels with the vendor cards. */}
    </section>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="inline-block h-3 w-3 rounded-full border border-white"
        style={{ background: color }}
      />
      <span className="text-ink-600">{label}</span>
    </div>
  );
}

// ===========================================================================
// RESULTS LIST + coverage read
// ===========================================================================

function densityTag(count: number): { tag: string; cls: string } {
  if (count >= 8)
    return { tag: "HIGH", cls: "bg-emerald-100 text-emerald-800" };
  if (count >= 3)
    return { tag: "MODERATE", cls: "bg-amber-100 text-amber-800" };
  return { tag: "LIMITED", cls: "bg-red-100 text-red-700" };
}

function ResultsList(props: {
  dcs: DC[];
  activeDc: DC | null;
  needLabel: string;
  ranked: RankedVendor[];
  nearbyFor: (dc: DC) => { items: { v: VendorEntry; dist: number }[]; radius: number };
  radiusMi: number;
  matchCount: number;
  activeFilterCount: number;
  onSelect: (id: string) => void;
  revealed: Record<string, RevealedContact>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  hoveredId?: string | null;
  onHover?: (id: string | null) => void;
}) {
  const {
    dcs,
    activeDc,
    needLabel,
    ranked,
    nearbyFor,
    radiusMi,
    activeFilterCount,
    onSelect,
    revealed,
    selectedIds,
    onToggleSelect,
    hoveredId,
    onHover,
  } = props;

  if (!activeDc) {
    return (
      <div className="p-6 text-sm text-ink-600">
        Enter a DC location above to see the pallet vendors around it.
      </div>
    );
  }

  const within50 = ranked.filter((r) => r.dist <= 50).length;
  const limitedDcs = dcs.filter(
    (dc) => nearbyFor(dc).items.filter((x) => x.dist <= 50).length < 3
  );

  return (
    <div className="divide-y divide-ink-100">
      {/* header */}
      <div className="p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">
          {ranked.length} {needLabel} near {activeDc.label}
        </p>
        <p className="mt-1 text-sm text-ink-600">
          Ranked by distance, within {radiusMi} mi.
        </p>
        {activeFilterCount > 0 && (
          <p className="mt-2 rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-800">
            Filtered to vendors matching your selections. Capability data lives
            on claimed listings, so listed vendors without it are hidden while
            filters are active - clear a filter to see everyone nearby.
          </p>
        )}
      </div>

      {/* empty state - filters or radius left nothing to show */}
      {ranked.length === 0 && (
        <div className="px-5 py-10 text-center">
          <p className="text-sm font-semibold text-ink-900">
            No vendors match {activeFilterCount > 0 ? "these filters" : "this search"} within {radiusMi} mi.
          </p>
          <p className="mt-1.5 text-sm text-ink-600">
            {activeFilterCount > 0
              ? "Clear a filter or widen the radius to see more vendors."
              : "Widen the radius to pull in more vendors."}
          </p>
        </div>
      )}

      {/* footprint coverage read (only when >1 DC) */}
      {dcs.length > 1 && (
        <div className="bg-ink-50/60 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">
            Footprint coverage
          </p>
          <div className="mt-3 space-y-2">
            {dcs.map((dc) => {
              const n = nearbyFor(dc).items.filter((x) => x.dist <= 50).length;
              const d = densityTag(n);
              return (
                <div
                  key={dc.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="font-medium text-ink-800">{dc.label}</span>
                  <span className="flex items-center gap-2 text-ink-600">
                    {n} within 50 mi
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${d.cls}`}
                    >
                      {d.tag}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink-500">
            HIGH = redundant local supply. LIMITED = a coverage gap worth a
            managed look. Click a DC pin on the map to focus its vendors.
          </p>
        </div>
      )}

      {/* the list -- Thomasnet-style: trust badge first, name + distance,
          city/state, grouped capability chips. Multi-select checkbox is
          the primary action; clicking the row body opens the detail card. */}
      {ranked.map((r, idx) => {
        const isRevealed = !!revealed[r.v.id];
        const isSelected = selectedIds.has(r.v.id);
        const isHovered = hoveredId === r.v.id;
        // Between-vendor divider: 1px #e8ebee border-bottom on every
        // row EXCEPT the last, so every vendor reads as its own block.
        // last:border-b-0 won't work here because the dark "managed
        // hand-off" band is the parent's last child, not the last row;
        // index-based check is the clean answer.
        const isLast = idx === ranked.length - 1;
        // Claimed rows get a persistent faint-green wash (not just the
        // badge) so a buyer can spot vendor-controlled listings while
        // scanning. Hover deepens it; map-hover (isHovered) deepens it a
        // touch more. Non-claimed rows keep the neutral hover behavior.
        const isClaimedRow = r.v.status === "claimed";
        const rowBg = isClaimedRow
          ? isHovered
            ? "bg-emerald-100/70"
            : "bg-emerald-50/70 hover:bg-emerald-100/60"
          : isHovered
            ? "bg-brand-50/40"
            : "hover:bg-ink-50/70";
        return (
          <div
            key={r.v.id}
            id={`vrow-${r.v.id}`}
            role="button"
            tabIndex={0}
            // Whole row body opens the detail card. Checkbox + caret
            // buttons inside the row stop propagation so they don't
            // also trigger this onSelect. Two independent actions:
            //   - checkbox click  -> toggle selection only
            //   - row body click  -> open VendorPublicCard detail
            // Selection state lives in selectedIds (separate from the
            // detail's selectedVendorId), so a vendor checked in the
            // list stays checked across opening + closing the detail.
            onClick={() => onSelect(r.v.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(r.v.id);
              }
            }}
            onMouseEnter={() => onHover && onHover(r.v.id)}
            onMouseLeave={() => onHover && onHover(null)}
            className={`group flex cursor-pointer items-start gap-3 px-5 py-4 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-inset ${
              isLast ? "" : "border-b border-[#e8ebee]"
            } ${rowBg}`}
          >
            <label
              className="mt-1 flex shrink-0 cursor-pointer items-center"
              // Stop the click from bubbling into the row's onClick --
              // the checkbox is a selection toggle, NOT a detail-open.
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect(r.v.id)}
                aria-label={`Select ${r.v.name || "this vendor"}`}
                className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-400"
              />
            </label>
            <div className="min-w-0 flex-1">
              <div className="mb-1.5">
                <TrustBadge status={r.v.status} dark={false} />
              </div>
              <p className="truncate text-base font-semibold leading-snug text-ink-900">
                {r.v.name || "Unnamed listing"}
                <span className="ml-2 text-sm font-medium text-ink-600">
                  · {Math.round(r.dist)} mi
                </span>
              </p>
              <p className="mt-0.5 text-xs text-ink-500">
                {[r.v.city, r.v.state].filter(Boolean).join(", ") || "Location not on file"}
              </p>
              <GroupedCapChips vendor={r.v} matched={r.matched} />
            </div>
            {/* "View →" is always visible (no longer hover-gated) so
                the affordance is clear on touch surfaces too. It is
                visually a hint; the entire row body is the click
                target, so no separate onClick is needed here. */}
            <span className="ml-2 mt-1 shrink-0 text-[11px] font-semibold text-brand-600">
              {isRevealed ? "Revealed" : "View →"}
            </span>
          </div>
        );
      })}

      {/* honest sparsity / managed hand-off - footprint-aware */}
      <div className="bg-ink-900 p-5 text-white">
        <p className="text-sm font-semibold">
          {dcs.length > 1 && limitedDcs.length > 0
            ? `${limitedDcs.length} of your ${dcs.length} DCs have limited local supply.`
            : within50 < 3
              ? "Thin coverage around this DC."
              : "Want this run for your whole footprint?"}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-300">
          {dcs.length > 1 && limitedDcs.length > 0
            ? `The gaps - ${limitedDcs
                .map((d) => d.label)
                .slice(0, 3)
                .join(", ")}${
                limitedDcs.length > 3 ? ", and more" : ""
              } - are exactly where a managed program earns its keep. We source the thin corridors for you and run them end to end.`
            : within50 < 3
              ? "Only a few vendors sit close to this location. That is exactly where a managed program earns its keep - we source the corridor for you and run it end to end."
              : "If you would rather have Pallet Solutions run the sourcing - RFQs, vendor management, consolidated invoicing across every DC - that is the managed-programs side."}
        </p>
        <Link
          href="/sourcing"
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          See managed programs <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}

function StatusPip({ status }: { status: VendorStatus }) {
  const color =
    status === "enhanced"
      ? "#49a5c1"
      : status === "claimed"
        ? "#00C853"
        : "#8a9bae";
  return (
    <span
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ background: color }}
      aria-hidden="true"
    />
  );
}

// TrustBadge moved to components/VendorPublicCard.tsx for cross-surface
// reuse. Imported at the top of this file.

// Grouped capability chips for the result row. Compresses the four
// dimensions into a scannable strip of ~6 with a "+N more" overflow
// behind a chip. Buyer's filter matches (`matched`) bubble to the
// front in the brand colour. The full grouped breakdown lives in
// the right-rail VendorCard.
// Row capability summary -- stacked labeled blocks, one per dimension.
// Layout per category: small uppercase label on its OWN line, then
// first 2 chips on the next line, with a caret (▼) at the end of the
// chip line when more exist. Caret expands inline to reveal the rest;
// click again to collapse. Section order matches the detail card:
// Classification -> Services -> Pallet types -> Treatments. Palette
// also matches the card: green for the first three, amber for
// treatments. The full chip set still renders in full on the card;
// the row collapses to a calm 2 + caret per category so the list
// reads top-to-bottom without a dense chip wrap.
function GroupedCapChips({
  vendor,
  matched,
}: {
  vendor: VendorEntry;
  matched: string[];
}) {
  // Expanded state is per-row-instance, per-section. Plain useState
  // here since each row renders its own GroupedCapChips component
  // instance -- no need to lift this state.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (label: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  type Group = {
    label: string;
    values: string[];
    chipClass: string;
  };
  const greenChip =
    "rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800";
  const amberChip =
    "rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700";
  const matchRing = "ring-1 ring-brand-300";
  const groups: Group[] = [
    { label: "Classification", values: vendor.classification || [], chipClass: greenChip },
    { label: "Services",       values: vendor.services       || [], chipClass: greenChip },
    { label: "Pallet types",   values: vendor.palletTypes    || [], chipClass: greenChip },
    { label: "Treatments",     values: vendor.treatments     || [], chipClass: amberChip },
  ].filter((g) => g.values.length > 0);
  if (groups.length === 0) {
    if (vendor.status === "listed") {
      return (
        <p className="mt-2 text-[11px] italic text-ink-400">
          Capability data lives on claimed listings - confirm specifics when you reach out.
        </p>
      );
    }
    return null;
  }
  const matchedSet = new Set(matched);
  const SHOWN_PER_GROUP = 2;
  return (
    <div className="mt-2 space-y-2.5">
      {groups.map((g) => {
        // Bubble buyer-filter matches to the front of their own group
        // so they're the first chips visible per dimension.
        const ordered = [
          ...g.values.filter((v) => matchedSet.has(v)),
          ...g.values.filter((v) => !matchedSet.has(v)),
        ];
        const isExpanded = expanded.has(g.label);
        const visible = isExpanded ? ordered : ordered.slice(0, SHOWN_PER_GROUP);
        const hasMore = ordered.length > SHOWN_PER_GROUP;
        return (
          <div key={g.label}>
            <p className="text-[9px] font-bold uppercase tracking-wider text-ink-500">
              {g.label}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {visible.map((val) => (
                <span
                  key={val}
                  className={`${g.chipClass} ${
                    matchedSet.has(val) ? matchRing : ""
                  }`}
                >
                  {val}
                </span>
              ))}
              {hasMore && (
                <button
                  type="button"
                  // Row body is a button that opens the detail card.
                  // Stop propagation so toggling the caret does NOT
                  // also fire the row's onSelect (browser bubbles the
                  // click up through the parent <button>).
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(g.label);
                  }}
                  aria-expanded={isExpanded}
                  aria-label={`${isExpanded ? "Hide" : "Show"} more ${g.label}`}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-ink-200 bg-white text-[10px] text-ink-500 hover:border-brand-400 hover:text-brand-600"
                >
                  <span aria-hidden="true">{isExpanded ? "▲" : "▼"}</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ===========================================================================
// VENDOR CARD (right rail detail)
// ===========================================================================

function VendorCard(props: {
  v: VendorEntry;
  dc: DC | null;
  onBack: () => void;
  // reveal carries through from the unified reveal/send screen so a
  // buyer who already revealed this vendor's phone sees it here too.
  // The card has NO reveal button -- the unified screen owns that.
  reveal?: RevealedContact;
  matched: string[];
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  const { v, dc, onBack, reveal, matched, isSelected, onToggleSelect } = props;
  const dist = dc ? Math.round(haversineMi(dc.lat, dc.lng, v.lat, v.lng)) : null;

  // Card footer. Single action: "Add to shortlist". The reveal-or-send
  // decision is made later, per-vendor, on the unified reveal/send
  // screen (driven by the server-side has-email lookup). The card
  // surface is selection-only -- no "3 of 3" Pick-3 counter here.
  // RevealedPanel still renders when `reveal` is populated (e.g. the
  // buyer revealed this vendor's phone on the unified screen and is
  // now re-opening its detail card) -- nice continuity, no new
  // action surface.
  const footer = (
    <div className="border-t border-ink-100 bg-ink-50/50 p-5">
      {isInternationalEntry(v) ? (
        <>
          <div className="w-full rounded-lg border border-ink-200 bg-white px-4 py-3 text-center text-sm font-semibold text-ink-500">
            International listing{v.country ? ` - ${v.country}` : ""}
          </div>
          <p className="mt-2 text-center text-xs leading-relaxed text-ink-500">
            Searchable and mappable now. Direct contact for international
            vendors is rolling out.
          </p>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={onToggleSelect}
            aria-pressed={isSelected}
            className={`w-full rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
              isSelected
                ? "border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                : "bg-brand-500 text-white hover:bg-brand-600"
            }`}
          >
            {isSelected
              ? "Added to shortlist ✓ - tap to remove"
              : "Add to shortlist"}
          </button>
          <p className="mt-2 text-center text-xs leading-relaxed text-ink-500">
            {isSelected
              ? 'Click "Request quotes" in the tray below when your shortlist is ready. We send to vendors with email on file and surface phone numbers for the rest.'
              : "Build a shortlist (up to 3 per DC), then describe your need once. We send where we can and surface phones where we can't."}
          </p>
        </>
      )}

      {/* Revealed contact carries through if the buyer revealed this
          vendor on the unified screen and circled back to the card. */}
      {reveal && (
        <div className="mt-4">
          <RevealedPanel v={v} reveal={reveal} />
        </div>
      )}
    </div>
  );

  return (
    <VendorPublicCard
      vendor={v}
      distance={dist}
      originLabel={dc?.label}
      matched={matched}
      onBack={onBack}
      backLabel="Back to results"
      footerSlot={footer}
    />
  );
}

function RevealedPanel({
  v,
  reveal,
}: {
  v: VendorEntry;
  reveal: RevealedContact;
}) {
  if (reveal.connectOnly) {
    return (
      <div className="rounded-lg border border-brand-200 bg-white p-4">
        <p className="text-sm font-semibold text-ink-900">
          You are on the list to connect with {v.name || "this vendor"}.
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
          We have logged your request and will make the introduction directly.
          The relationship is yours to build from there.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-emerald-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
        Contact revealed
      </p>
      <div className="mt-2 space-y-1.5 text-sm">
        {reveal.phone && (
          <p className="text-ink-800">
            <span className="text-ink-500">Phone:</span>{" "}
            <a
              href={`tel:${reveal.phone}`}
              className="font-semibold text-brand-700 hover:underline"
            >
              {reveal.phone}
            </a>
          </p>
        )}
        {reveal.email && (
          <p className="text-ink-800">
            <span className="text-ink-500">Email:</span>{" "}
            <a
              href={`mailto:${reveal.email}`}
              className="font-semibold text-brand-700 hover:underline"
            >
              {reveal.email}
            </a>
          </p>
        )}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-ink-500">
        Pallet Solutions made the introduction. Response time and fit get
        worked out directly between you and the vendor.
      </p>
    </div>
  );
}

// ===========================================================================
// EMAIL GATE MODAL
// ===========================================================================

function EmailGateModal(props: {
  vendor: VendorEntry;
  email: string;
  setEmail: (s: string) => void;
  error: string | null;
  onCancel: () => void;
  onSubmit: () => void;
  picksLeft: number;
}) {
  const { vendor, email, setEmail, error, onCancel, onSubmit, picksLeft } =
    props;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-ink-900/50 p-4"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">
          Reveal {picksLeft} of 3
        </p>
        <h3 className="mt-2 text-xl font-semibold tracking-tight text-ink-900">
          Confirm your email to reach {vendor.name || "this vendor"}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          One vendor at a time, 3 per visit. Your email lets the vendor reach
          you back - and keeps contacts from being bulk-scraped. No spam, no
          account.
        </p>
        <form
          className="mt-5"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoFocus
            className="w-full rounded-lg border border-ink-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="text-sm font-medium text-ink-500 hover:text-ink-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Reveal contact
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ===========================================================================
// SELECTION TRAY  +  RECAP/PREVIEW OVERLAY
// ===========================================================================

// Sticky-bottom strip that appears as soon as the buyer multi-selects.
// The primary conversion CTA for the redesigned flow. Collapses to a
// full-width bar on mobile (380px). Solid opaque background; sits above
// the map but not the recap overlay (which has its own z-stack).
function SelectionTray(props: {
  count: number;
  max: number;
  nudge: string | null;
  onRequestQuotes: () => void;
  onClear: () => void;
}) {
  const { count, max, nudge, onRequestQuotes, onClear } = props;
  // Docks at the bottom of the app shell as a regular flex child --
  // shrink-0 keeps it at natural height. The primary CTA reads
  // "Request quotes ->" -- the next screen (Describe) collects need +
  // email and captures to buyer_requests before any send happens.
  return (
    <div className="shrink-0 border-t border-ink-200 bg-white px-4 py-3 shadow-[0_-6px_16px_rgba(15,29,36,0.08)] sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-900">
            {count} selected{count >= max ? ` of ${max} (shortlist full)` : ` of ${max}`}
          </p>
          <p className="hidden text-[11px] leading-snug text-ink-500 sm:block">
            Continue to describe your need once - we'll send to the vendors with email and surface phone numbers for the rest.
          </p>
          {nudge && (
            <p className="mt-1 text-[11px] font-medium leading-snug text-amber-700">
              {nudge}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onClear}
            className="rounded-md px-3 py-2 text-xs font-semibold text-ink-500 hover:bg-ink-100 hover:text-ink-700"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onRequestQuotes}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Request quotes <span aria-hidden="true">&rarr;</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Recap form + preview overlay. Full-screen, single-column, chips
// first / free-text last. Always offers the "or just get their contacts"
// escape (Pick 3 path) so the recap never reads as a tollbooth.
// ============================================================
// STEP 2: DescribeOverlay -- the need + email form.
// ============================================================
// One form per session, filled once. Shared state with the wizard's
// "Add sourcing details" step so a buyer who already filled it on
// the way in sees pre-populated values. On submit, calls
// captureRequest in the parent which writes buyer_requests and
// returns requestId; on success the parent flips flowStep to
// "reveal" and this overlay unmounts.
function DescribeOverlay(props: {
  recap: RecapData;
  setRecap: (r: RecapData) => void;
  buyerEmail: string;
  setBuyerEmail: (s: string) => void;
  error: string | null;
  selectedCount: number;
  dcs: DC[];
  dcNeeds: Record<string, PerDcNeed>;
  setDcNeeds: (m: Record<string, PerDcNeed>) => void;
  onBack: () => void;
  onSubmit: () => Promise<boolean>;
}) {
  const {
    recap,
    setRecap,
    buyerEmail,
    setBuyerEmail,
    error,
    selectedCount,
    dcs,
    dcNeeds,
    setDcNeeds,
    onBack,
    onSubmit,
  } = props;
  const [submitting, setSubmitting] = useState(false);
  // Active location tab. Single-DC buyers still have one (its id, or "").
  const [locTab, setLocTab] = useState<string>(dcs[0]?.id || "");
  const activeLoc = dcs.some((d) => d.id === locTab) ? locTab : dcs[0]?.id || "";
  const need: PerDcNeed = dcNeeds[activeLoc] || EMPTY_NEED;
  const updateNeed = (patch: Partial<PerDcNeed>) =>
    setDcNeeds({ ...dcNeeds, [activeLoc]: { ...need, ...patch } });
  const toggleNeedChip = (key: "palletTypes" | "sizes", val: string) => {
    const cur = need[key];
    const nextArr = cur.includes(val)
      ? cur.filter((v) => v !== val)
      : [...cur, val];
    updateNeed({ [key]: nextArr } as Partial<PerDcNeed>);
  };
  const wantsDelivery =
    need.direction === "Delivery" || need.direction === "Both";
  const wantsPickup = need.direction === "Pickup" || need.direction === "Both";

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-stretch justify-center bg-ink-900/60 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="flex h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[calc(100vh-3rem)] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">
            Describe your need
          </p>
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-semibold text-ink-500 hover:text-ink-700"
          >
            &larr; Back
          </button>
        </div>

        <div className="border-b border-ink-100 bg-ink-50/60 px-5 py-3 text-xs text-ink-600">
          Fill this once. We&apos;ll use it for your shortlist of{" "}
          <strong>{selectedCount}</strong>{" "}
          {selectedCount === 1 ? "vendor" : "vendors"} - send to the ones with
          email on file, and surface phone numbers for the rest. Capture
          happens now, before the next screen.
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-5">
            <RecapTextField
              label="Email"
              required
              placeholder="your@company.com"
              value={buyerEmail}
              onChange={setBuyerEmail}
              hint="Where vendors reach you."
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <RecapTextField
                label="First name"
                required
                value={recap.firstName}
                onChange={(v) => setRecap({ ...recap, firstName: v })}
              />
              <RecapTextField
                label="Last name"
                value={recap.lastName}
                onChange={(v) => setRecap({ ...recap, lastName: v })}
              />
            </div>
            <RecapTextField
              label="Company"
              value={recap.company}
              onChange={(v) => setRecap({ ...recap, company: v })}
            />

            {/* LOCATION TABS - pick which DC you're configuring. A check +
                progress bar show how many locations are complete. */}
            {dcs.length > 1 && (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                  Set your need for each location
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {dcs.map((dc) => {
                    const on = activeLoc === dc.id;
                    const done = needComplete(dcNeeds[dc.id]);
                    return (
                      <button
                        key={dc.id}
                        type="button"
                        onClick={() => setLocTab(dc.id)}
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                          on
                            ? "bg-ink-900 text-white"
                            : "bg-ink-100 text-ink-800 hover:bg-ink-200"
                        }`}
                      >
                        {dc.label}
                        {done && (
                          <span
                            aria-hidden
                            className={on ? "text-emerald-300" : "text-emerald-600"}
                          >
                            &#x2713;
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all"
                      style={{
                        width: `${
                          (dcs.filter((d) => needComplete(dcNeeds[d.id]))
                            .length /
                            dcs.length) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-ink-500">
                    {dcs.filter((d) => needComplete(dcNeeds[d.id])).length} of{" "}
                    {dcs.length} locations complete
                  </p>
                </div>
              </div>
            )}

            {/* DIRECTION first - it drives which questions show below. */}
            <RecapToggleGroup
              label={
                dcs.length > 1 && dcs.find((d) => d.id === activeLoc)
                  ? `Delivery or pickup - ${
                      dcs.find((d) => d.id === activeLoc)!.label
                    }`
                  : "Delivery or pickup"
              }
              options={["Delivery", "Pickup", "Both"]}
              value={need.direction}
              onChange={(v) =>
                updateNeed({ direction: v as PerDcNeed["direction"] })
              }
            />

            {!need.direction && (
              <p className="rounded-md bg-ink-50 px-3 py-2 text-xs text-ink-500">
                Choose delivery or pickup to see the rest of the questions for
                this location.
              </p>
            )}

            {/* DELIVERY questions (Delivery or Both) */}
            {wantsDelivery && (
              <>
                <RecapChipGroup
                  label="Pallet type"
                  options={RECAP_PALLET_TYPES}
                  selected={need.palletTypes}
                  onToggle={(v) => toggleNeedChip("palletTypes", v)}
                />
                <div>
                  <RecapToggleGroup
                    label="Grade"
                    options={["New", "Recycled"]}
                    value={need.condition}
                    onChange={(v) =>
                      updateNeed({
                        condition: v as PerDcNeed["condition"],
                        recycledGrade:
                          v === "Recycled" ? need.recycledGrade : "",
                      })
                    }
                  />
                  {need.condition === "Recycled" && (
                    <div className="mt-3">
                      <RecapSelect
                        label="Recycled grade"
                        options={["", "AA", "A", "B"]}
                        value={need.recycledGrade}
                        onChange={(v) =>
                          updateNeed({
                            recycledGrade: v as PerDcNeed["recycledGrade"],
                          })
                        }
                        placeholder="Choose a grade (AA / A / B)"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <RecapChipGroup
                    label="Size"
                    options={RECAP_SIZES}
                    selected={need.sizes}
                    onToggle={(v) => toggleNeedChip("sizes", v)}
                  />
                  {need.sizes.includes("Other") && (
                    <div className="mt-3">
                      <RecapTextField
                        label="Other size"
                        placeholder={'e.g. 45"x48"'}
                        value={need.sizeOther}
                        onChange={(v) => updateNeed({ sizeOther: v })}
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* PICKUP questions (Pickup or Both) - the four-card selector */}
            {wantsPickup && (
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                  What needs pickup?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {PICKUP_TYPES.map((pt) => {
                    const on = need.pickupType === pt.key;
                    return (
                      <button
                        key={pt.key}
                        type="button"
                        onClick={() => updateNeed({ pickupType: pt.key })}
                        className={`rounded-lg border p-3 text-left transition-colors ${
                          on
                            ? "border-brand-500 bg-brand-50/60 ring-1 ring-brand-500"
                            : "border-ink-200 bg-white hover:border-brand-300 hover:bg-ink-50/50"
                        }`}
                      >
                        <p className="text-sm font-semibold text-ink-900">
                          {pt.key}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-snug text-ink-500">
                          {pt.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* shown for any direction once one is picked */}
            {need.direction && (
              <>
                <RecapSelect
                  label="Quantity"
                  options={["", ...RECAP_QUANTITIES]}
                  value={need.quantity}
                  onChange={(v) => updateNeed({ quantity: v })}
                  placeholder="Choose a range"
                />
                <RecapToggleGroup
                  label="Frequency"
                  options={["One-time", "Recurring"]}
                  value={need.frequency}
                  onChange={(v) =>
                    updateNeed({ frequency: v as PerDcNeed["frequency"] })
                  }
                />
                <RecapChipGroup
                  label="Timeline"
                  options={RECAP_TIMELINES}
                  selected={need.timeline ? [need.timeline] : []}
                  onToggle={(v) =>
                    updateNeed({ timeline: need.timeline === v ? "" : v })
                  }
                  single
                />
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                    Notes (optional)
                  </label>
                  <textarea
                    value={need.notes}
                    onChange={(e) => updateNeed({ notes: e.target.value })}
                    rows={3}
                    placeholder="Anything specific - certifications, packaging, dock constraints."
                    className="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  />
                </div>
              </>
            )}

            <label className="flex items-start gap-2 rounded-md border border-ink-200 bg-ink-50/40 px-3 py-2.5 text-xs text-ink-700">
              <input
                type="checkbox"
                checked={recap.wantsManaged}
                onChange={(e) =>
                  setRecap({ ...recap, wantsManaged: e.target.checked })
                }
                className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-400"
              />
              <span>
                <strong>Or have Pallet Solutions source this for you.</strong>{" "}
                Skip contacting vendors yourself - we run the outreach, gather
                pricing, and come back with a single quote. One point of
                contact; your details stay with us, not the vendors.
              </span>
            </label>
          </div>
        </div>

        <div className="border-t border-ink-100 px-5 py-3">
          {error && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? "Submitting..."
              : recap.wantsManaged
                ? "Submit to Pallet Solutions"
                : "Continue to send / reveal"}{" "}
            {!submitting && <span aria-hidden>&rarr;</span>}
          </button>
          <p className="mt-2 text-center text-[11px] leading-relaxed text-ink-500">
            {recap.wantsManaged
              ? "We'll source this for you and follow up with a quote - your details are not sent to vendors directly."
              : "We capture your need now - whether you send or reveal phones on the next screen, the request is logged."}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STEP 3: RevealSendOverlay -- the unified end screen.
// ============================================================
// One row per shortlisted vendor. Per row, the action is decided by
// the server-side has-email lookup:
//   - has_email=true  -> "Send request" (PS relay from info@, reply
//                        to buyer)
//   - has_email=false -> "Reveal phone (X of 3 left this visit)" +
//                        call script with the buyer's filled need
//                        rendered first-person and natural.
// "Done" at the bottom fires the buyer confirmation email and clears
// the flow back to the results list.
function RevealSendOverlay(props: {
  selectedIds: string[];
  vendorsById: Map<string, VendorEntry>;
  recap: RecapData;
  buyerEmail: string;
  hasEmailMap: Record<string, boolean>;
  hasEmailLoading: boolean;
  vendorActions: Record<string, VendorAction>;
  revealed: Record<string, RevealedContact>;
  picksByDc: Record<string, number>;
  revealBusyId: string | null;
  activeDcLabel: string;
  dcs: DC[];
  selectionDc: Record<string, string>;
  dcNeeds: Record<string, PerDcNeed>;
  onSend: (vendorId: string) => void;
  onReveal: (v: VendorEntry) => void;
  onDone: () => void;
}) {
  const {
    selectedIds,
    vendorsById,
    buyerEmail,
    hasEmailMap,
    hasEmailLoading,
    vendorActions,
    revealed,
    picksByDc,
    revealBusyId,
    activeDcLabel,
    dcs,
    selectionDc,
    dcNeeds,
    onSend,
    onReveal,
    onDone,
  } = props;

  // Group the shortlist by the DC each vendor was picked under. When the
  // buyer has more than one DC with picks, the right column shows tabs
  // (one per DC) and only that DC's vendors at a time.
  const dcOf = (id: string) => selectionDc[id] || dcs[0]?.id || "";
  // Show a tab for EVERY footprint DC when multi-DC, so the buyer can toggle
  // between locations and see each one's recap - even a location with no
  // shortlisted vendors. Single-DC = no tabs.
  const showTabs = dcs.length > 1;
  const tabsDcs = showTabs ? dcs : [];
  const firstWithSel =
    dcs.find((dc) => selectedIds.some((id) => dcOf(id) === dc.id))?.id ||
    dcs[0]?.id ||
    "";
  const [activeTabDc, setActiveTabDc] = useState<string>(firstWithSel);
  const effectiveTabDc =
    showTabs && dcs.some((d) => d.id === activeTabDc)
      ? activeTabDc
      : firstWithSel;
  // Reveal budget for the ACTIVE location (3 per location, not 3 total).
  const picksLeft = Math.max(
    0,
    PICKS_PER_VISIT - (picksByDc[effectiveTabDc] || 0)
  );
  const visibleIds = showTabs
    ? selectedIds.filter((id) => dcOf(id) === effectiveTabDc)
    : selectedIds;
  const vendors = visibleIds
    .map((id) => vendorsById.get(id))
    .filter((v): v is VendorEntry => !!v);
  const activeLabel = showTabs
    ? dcs.find((d) => d.id === effectiveTabDc)?.label || activeDcLabel
    : activeDcLabel;

  // The active tab's per-location need drives the call script + summary.
  const tabNeed: PerDcNeed = dcNeeds[effectiveTabDc] || EMPTY_NEED;

  // Build the call-script line from the buyer's filled need for this DC.
  function buildCallScript(): string {
    const parts: string[] = [];
    if (tabNeed.quantity) parts.push(tabNeed.quantity);
    if (tabNeed.condition === "Recycled") {
      parts.push(
        tabNeed.recycledGrade
          ? `grade ${tabNeed.recycledGrade} recycled`
          : "recycled"
      );
    } else if (tabNeed.condition) {
      parts.push(tabNeed.condition.toLowerCase());
    }
    if (tabNeed.palletTypes.length) parts.push(tabNeed.palletTypes.join(", "));
    const sz =
      tabNeed.sizes.includes("Other") && tabNeed.sizeOther.trim()
        ? [
            ...tabNeed.sizes.filter((s) => s !== "Other"),
            tabNeed.sizeOther.trim(),
          ]
        : tabNeed.sizes;
    if (sz.length) parts.push(sz.join(" / "));
    if (tabNeed.pickupType)
      parts.push(`pickup: ${tabNeed.pickupType.toLowerCase()}`);
    if (tabNeed.direction && tabNeed.direction !== "Both")
      parts.push(tabNeed.direction.toLowerCase());
    if (tabNeed.frequency) parts.push(tabNeed.frequency.toLowerCase());
    if (activeLabel) parts.push(`to ${activeLabel}`);
    const summary = parts.length ? parts.join(", ") : "pallets";
    return (
      `Hi, I found you on the Pallet Solutions vendor network. ` +
      `I'm looking for ${summary}. My email is ${buyerEmail} if you want to follow up.`
    );
  }
  const callScript = buildCallScript();

  // Left-summary rows - only the fields filled for the active location.
  const sizesOut =
    tabNeed.sizes.includes("Other") && tabNeed.sizeOther.trim()
      ? [...tabNeed.sizes.filter((s) => s !== "Other"), tabNeed.sizeOther.trim()]
      : tabNeed.sizes;
  const gradeLabel =
    tabNeed.condition === "Recycled"
      ? tabNeed.recycledGrade
        ? `Recycled - Grade ${tabNeed.recycledGrade}`
        : "Recycled"
      : tabNeed.condition;
  const summaryRows: { label: string; value: string }[] = [];
  if (activeLabel) summaryRows.push({ label: "Location", value: activeLabel });
  if (tabNeed.direction)
    summaryRows.push({ label: "Delivery / pickup", value: tabNeed.direction });
  if (tabNeed.palletTypes.length)
    summaryRows.push({ label: "Pallet type", value: tabNeed.palletTypes.join(", ") });
  if (gradeLabel) summaryRows.push({ label: "Grade", value: gradeLabel });
  if (sizesOut.length) summaryRows.push({ label: "Size", value: sizesOut.join(" / ") });
  if (tabNeed.pickupType)
    summaryRows.push({ label: "Pickup type", value: tabNeed.pickupType });
  if (tabNeed.quantity)
    summaryRows.push({ label: "Quantity", value: tabNeed.quantity });
  if (tabNeed.frequency)
    summaryRows.push({ label: "Frequency", value: tabNeed.frequency });
  if (tabNeed.timeline)
    summaryRows.push({ label: "Timeline", value: tabNeed.timeline });
  if (tabNeed.notes.trim())
    summaryRows.push({ label: "Notes", value: tabNeed.notes.trim() });

  const sentCount = Object.values(vendorActions).filter(
    (a) => a && a.kind === "sent"
  ).length;
  const revealedCount = selectedIds.filter((id) => !!revealed[id]).length;

  return (
    <div className="fixed inset-0 z-[2000] flex items-stretch justify-center bg-ink-900/60 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="flex h-full w-full max-w-4xl flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[calc(100vh-3rem)] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">
            Reach out
          </p>
          <span className="text-[11px] text-ink-500">
            {sentCount > 0 ? `${sentCount} sent` : ""}
            {sentCount > 0 && revealedCount > 0 ? " - " : ""}
            {revealedCount > 0 ? `${revealedCount} revealed` : ""}
          </span>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden sm:flex-row">
          {/* LEFT: the buyer's request summary (what they configured) */}
          <aside className="shrink-0 border-b border-ink-100 bg-ink-50/60 px-5 py-4 sm:w-60 sm:overflow-y-auto sm:border-b-0 sm:border-r">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-800">
              Your request
            </p>
            <dl className="mt-3 space-y-2.5">
              {summaryRows.map((r) => (
                <div key={r.label}>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                    {r.label}
                  </dt>
                  <dd className="text-sm text-ink-800">{r.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 border-t border-ink-200 pt-3 text-[11px] leading-relaxed text-ink-500">
              Replies go to{" "}
              <strong className="text-ink-700">{buyerEmail}</strong>.
            </p>
          </aside>

          {/* RIGHT: vendor actions (send + reveal, independent) */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {showTabs && (
              <div className="flex gap-1 overflow-x-auto border-b border-ink-100 px-3 py-2">
                {tabsDcs.map((dc) => {
                  const on = dc.id === effectiveTabDc;
                  const n = selectedIds.filter(
                    (id) => dcOf(id) === dc.id
                  ).length;
                  return (
                    <button
                      key={dc.id}
                      type="button"
                      onClick={() => setActiveTabDc(dc.id)}
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                        on
                          ? "bg-brand-500 text-white"
                          : "bg-ink-100 text-ink-700 hover:bg-ink-200"
                      }`}
                    >
                      {dc.label} ({n})
                    </button>
                  );
                })}
              </div>
            )}
            <div className="border-b border-ink-100 px-5 py-2.5 text-xs text-ink-600">
              Send a request (the reply comes straight to you) or reveal
              contact info to call. {picksLeft} of 3 reveals left{" "}
              {showTabs ? "for this location" : "this visit"}.
            </div>
            <div className="flex-1 overflow-y-auto">
              {hasEmailLoading ? (
                <p className="px-5 py-8 text-center text-sm text-ink-500">
                  Checking vendor contact info...
                </p>
              ) : vendors.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-ink-500">
                  No vendors shortlisted for this location. Switch tabs, or go
                  back and add vendors near this DC.
                </p>
              ) : (
                <ul className="divide-y divide-[#e8ebee]">
                  {vendors.map((v) => {
                    const action = vendorActions[v.id];
                    const hasEmail = !!hasEmailMap[v.id];
                    const isSendPending =
                      action && action.kind === "pending" && !action.error;
                    const isSent = !!action && action.kind === "sent";
                    const contact = revealed[v.id];
                    const isRevealed = !!contact;
                    const revealBusy = revealBusyId === v.id;
                    return (
                      <li key={v.id} className="px-5 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-ink-900">
                              {v.name || "Unnamed listing"}
                            </p>
                            <p className="mt-0.5 text-xs text-ink-500">
                              {[v.city, v.state].filter(Boolean).join(", ") ||
                                "Location not on file"}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            {hasEmail &&
                              (isSent ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                                  <span aria-hidden>&#x2713;</span> Request sent
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onSend(v.id)}
                                  disabled={isSendPending}
                                  className="rounded-full bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isSendPending ? "Sending..." : "Send request"}
                                </button>
                              ))}
                            {!isRevealed && (
                              <button
                                type="button"
                                onClick={() => onReveal(v)}
                                disabled={revealBusy || picksLeft <= 0}
                                className="rounded-full border border-brand-500 bg-white px-4 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {revealBusy
                                  ? "Revealing..."
                                  : picksLeft > 0
                                    ? `Reveal contact (${picksLeft} of 3 left)`
                                    : "No reveals left"}
                              </button>
                            )}
                          </div>
                        </div>

                        {action &&
                          action.kind === "pending" &&
                          action.error && (
                            <p className="mt-2 text-xs text-red-600">
                              {action.error}
                            </p>
                          )}

                        {isRevealed && (
                          <div className="mt-3 space-y-3">
                            <div className="rounded-md border border-emerald-200 bg-white p-3 text-sm">
                              {contact.phone ? (
                                <p className="text-ink-800">
                                  <span className="text-ink-500">Phone:</span>{" "}
                                  <a
                                    href={`tel:${contact.phone}`}
                                    className="font-semibold text-brand-700 hover:underline"
                                  >
                                    {contact.phone}
                                  </a>
                                </p>
                              ) : null}
                              {contact.email ? (
                                <p className="mt-1 text-ink-800">
                                  <span className="text-ink-500">Email:</span>{" "}
                                  <a
                                    href={`mailto:${contact.email}`}
                                    className="font-semibold text-brand-700 hover:underline"
                                  >
                                    {contact.email}
                                  </a>
                                </p>
                              ) : null}
                              {!contact.phone && !contact.email && (
                                <p className="text-ink-600">
                                  No direct line on file - we&apos;ll make the
                                  introduction for you.
                                </p>
                              )}
                            </div>
                            {(contact.phone || contact.email) && (
                              <div className="rounded-md border border-ink-200 bg-ink-50/60 p-3">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                                  Here&apos;s a quick way to say it
                                </p>
                                <p className="mt-2 text-sm italic leading-relaxed text-ink-700">
                                  &ldquo;{callScript}&rdquo;
                                </p>
                                <p className="mt-2 text-[11px] text-ink-500">
                                  Adapt the wording - this is a starting point,
                                  not a script.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-ink-100 px-5 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs leading-relaxed text-ink-500">
              {sentCount === 0 && revealedCount === 0
                ? "Take action on any vendor above when you're ready."
                : "Done sends you a confirmation email listing the vendors you sent to."}
            </p>
            <button
              type="button"
              onClick={onDone}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecapTextField(props: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  required?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-500">
        {props.label}
        {props.required && <span className="ml-1 text-brand-600">*</span>}
      </label>
      <input
        type="text"
        required={props.required}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
      />
      {props.hint && (
        <p className="mt-1 text-[11px] text-ink-500">{props.hint}</p>
      )}
    </div>
  );
}

function RecapChipGroup(props: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  single?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-500">
        {props.label}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {props.options.map((opt) => {
          const active = props.selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => props.onToggle(opt)}
              aria-pressed={active}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-200"
                  : "border-ink-200 bg-white text-ink-700 hover:border-brand-400 hover:bg-brand-50/30"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RecapToggleGroup(props: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-500">
        {props.label}
      </label>
      <div className="inline-flex overflow-hidden rounded-full border border-ink-200">
        {props.options.map((opt) => {
          const active = props.value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => props.onChange(active ? "" : opt)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "bg-brand-500 text-white"
                  : "bg-white text-ink-700 hover:bg-brand-50"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RecapSelect(props: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-500">
        {props.label}
      </label>
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
      >
        {props.options.map((opt) =>
          opt === "" ? (
            <option key="placeholder" value="">
              {props.placeholder || "Select..."}
            </option>
          ) : (
            <option key={opt} value={opt}>
              {opt}
            </option>
          )
        )}
      </select>
    </div>
  );
}
