"use client";

// ---------------------------------------------------------------------------
// VendorJourneyPrototype - DESIGN PROTOTYPE (2026-05-22)
//
// Clickable mock of the full vendor journey: see yourself on the map ->
// open public card -> claim -> confirm corridor -> select market signals
// -> Tuesday Report waitlist (optional) -> done.
//
// === MAP BEHAVIOR (updated 2026-05-22 follow-up) ===
//
// Blank on load - no pins shown on the national map. Vendor types their
// business name into the search box -> typeahead queries the real
// Airtable Vendors data (via the existing network-site vendor-typeahead.js
// function, CORS-allowed for localhost) -> on select, map centers and
// zooms to the vendor's state, and local mock-vendor pins in that state
// are revealed as neighbors. The persuasion beat: vendor sees their state
// surrounded by gray + green pins of other operators they could be
// alongside.
//
// === SEARCH WIRING (local dev only) ===
//
// Search uses real Airtable data via network-site typeahead. NO production
// deploys made for this prototype. The typeahead endpoint already accepts
// localhost:3000 as a CORS origin (added 2026-05-22 deploy). Public-card
// data for real vendors is limited to what typeahead returns (name, state,
// address, phone) - the full public card uses mock data for the
// prototype.
//
// Map DISPLAY rule (locked, unchanged): pins render LOCATION + STATUS
// COLOR only. NO names rendered on the map. Search uses names internally
// to locate; the map stays anonymous.
//
// === VENDOR-ONLY PAGE RULE (locked 2026-05-23) ===
//
// This page is for VENDORS ONLY. Buyers do not come here. Browsing
// neighbor cards / Pick-3 / compare-vendors all belong on the future
// Vendor Network (buyer) tab, NOT here.
//
// On the map: only the searched vendor's OWN pin is clickable. Neighbor
// pins stay visible for "you're gray, they're green" status context that
// drives the claim, but they cannot be opened. Cursor stays default on
// neighbor pins so the affordance matches the behavior.
//
// Do not re-wire neighbor clicks or add Pick-3 here. It is a separate page.
//
// === MOCK DATA ===
//
// All 30 mock vendors stay baked in for the neighbor display + the demo
// flow when no real Airtable record exists. A "Browse sample vendors"
// link gives Rob the no-search path back to the full mock map for
// demoing the flow without typing a real business name. Even on the
// mock map, only the vendor's own pin is clickable per the rule above.
//
// Built for /vendors-prototype page. The production /vendors page is
// untouched.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import "leaflet/dist/leaflet.css";
import {
  useLiveVendorOverlay,
  applyOverlay,
  type VendorOverlayEntry,
} from "@/lib/useLiveVendorOverlay";
import { VendorPublicCard } from "@/components/VendorPublicCard";
import type { VendorPublicEntry } from "@/lib/vendor-types";
import { FUNCTIONS_BASE } from "@/lib/functionsBase";
import {
  requestEditLink,
  verifyEditToken,
  saveEditFields,
  markTuesdayReportOffer,
  startTuesdayReportCheckout,
  type EditorPrefill,
} from "@/lib/vendorEditClient";

// Tuesday Report offer mode. Default "reserve" (no charge) so nothing can
// charge until Rob explicitly flips this to "checkout" AND the Report is a
// real shipping product with Stripe configured. See the build prompt's HARD
// PREREQUISITE / acceptance criterion 8.
const TR_OFFER_MODE: "reserve" | "checkout" =
  process.env.NEXT_PUBLIC_TR_OFFER_MODE === "checkout" ? "checkout" : "reserve";
// 2026-06-02 -- TuesdayReportPreview was inlined here. Extracted to its own
// file so the new standalone /tuesday-report page can render the same proof
// sample without duplicating the component.
import TuesdayReportPreview from "@/components/TuesdayReportPreview";
// Leaflet is dynamic-imported inside the map setup useEffect so SSR
// doesn't trip on its window/document references.

// (No topojson needed - Leaflet uses raster tile layers, not vector
// state outlines.)

// Netlify functions base. Defaults to the production network site so the
// prod deploy needs no extra env vars. For local end-to-end testing,
// set NEXT_PUBLIC_FUNCTIONS_BASE=http://localhost:8888 in .env.local so
// claim + waitlist POSTs hit the local `netlify dev` instance instead of
// production. The variable is read at build time (Next.js inlines
// NEXT_PUBLIC_* into the client bundle).
const CLAIM_URL = `${FUNCTIONS_BASE}/.netlify/functions/vendor-claim`;

// Status rank for the "don't downgrade" guard on the bulk overlay sync.
// Live data wins when it's >= local, but a stale overlay row saying
// "listed" must NOT clobber an optimistic post-claim "claimed" the
// user just set in the same view (the optimistic update lives in
// handleClaimSubmit and is the freshest source for the just-claimed
// vendor).
const STATUS_RANK: Record<string, number> = {
  listed: 0,
  claimed: 1,
  enhanced: 2,
};

type VendorStatus = "listed" | "claimed" | "enhanced";

type MockVendor = {
  id: string;
  name: string;
  status: VendorStatus;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  classification: string;
  serviceRadius: string;
  hours: string;
  capabilities: string[];
  treatments: string[];
  yearsInBusiness: number;
  generalServices: string[];
};

// 30 mock vendors: 18 listed (gray), 11 claimed (green), 1 enhanced (blue, KY).
// Names are clearly fictional to avoid confusion with real PS customers.
const MOCK_VENDORS: MockVendor[] = [
  // LISTED (gray) - 18
  {
    id: "v01",
    name: "Carolina Pallet Recyclers",
    status: "listed",
    city: "Durham",
    state: "NC",
    zip: "27705",
    lat: 35.99,
    lng: -78.9,
    classification: "Recycler",
    serviceRadius: "75 miles",
    hours: "Mon-Fri 7am-5pm",
    capabilities: ["48x40 #1s/#2s", "Recycled", "Custom sizes"],
    treatments: ["Heat-treated"],
    yearsInBusiness: 18,
    generalServices: ["Core removal", "Drop trailer"],
  },
  {
    id: "v02",
    name: "East Bay Pallet Co",
    status: "listed",
    city: "Oakland",
    state: "CA",
    zip: "94601",
    lat: 37.8,
    lng: -122.27,
    classification: "Recycler",
    serviceRadius: "60 miles",
    hours: "Mon-Fri 6am-4pm",
    capabilities: ["48x40 #2s", "Recycled", "Cores"],
    treatments: ["Heat-treated"],
    yearsInBusiness: 11,
    generalServices: ["Core removal"],
  },
  {
    id: "v03",
    name: "North Texas Pallets",
    status: "listed",
    city: "Dallas",
    state: "TX",
    zip: "75201",
    lat: 32.78,
    lng: -96.8,
    classification: "Recycler",
    serviceRadius: "100 miles",
    hours: "Mon-Fri 7am-5pm",
    capabilities: ["48x40 #1s/#2s", "Recycled"],
    treatments: [],
    yearsInBusiness: 22,
    generalServices: ["Drop trailer"],
  },
  {
    id: "v04",
    name: "Central Valley Pallet",
    status: "listed",
    city: "Fresno",
    state: "CA",
    zip: "93706",
    lat: 36.74,
    lng: -119.78,
    classification: "Recycler",
    serviceRadius: "80 miles",
    hours: "Mon-Fri 6am-3pm",
    capabilities: ["Recycled", "48x40 #2s"],
    treatments: [],
    yearsInBusiness: 9,
    generalServices: [],
  },
  {
    id: "v05",
    name: "Gulf Coast Pallet & Crate",
    status: "listed",
    city: "Houston",
    state: "TX",
    zip: "77002",
    lat: 29.76,
    lng: -95.37,
    classification: "Manufacturer",
    serviceRadius: "120 miles",
    hours: "Mon-Fri 7am-5pm, Sat 8am-12pm",
    capabilities: ["Custom sizes", "New build", "48x40 #1s"],
    treatments: ["HT/ISPM-15", "Kiln dried"],
    yearsInBusiness: 35,
    generalServices: ["Drop trailer"],
  },
  {
    id: "v06",
    name: "Show-Me Pallet Works",
    status: "listed",
    city: "St. Louis",
    state: "MO",
    zip: "63101",
    lat: 38.63,
    lng: -90.2,
    classification: "Recycler",
    serviceRadius: "90 miles",
    hours: "Mon-Fri 7am-5pm",
    capabilities: ["48x40 #2s", "Recycled", "Cores"],
    treatments: ["Heat-treated"],
    yearsInBusiness: 15,
    generalServices: ["Core removal"],
  },
  {
    id: "v07",
    name: "Bluegrass Pallet Recycling",
    status: "listed",
    city: "Lexington",
    state: "KY",
    zip: "40507",
    lat: 38.04,
    lng: -84.5,
    classification: "Recycler",
    serviceRadius: "70 miles",
    hours: "Mon-Fri 7am-5pm",
    capabilities: ["Recycled", "Cores"],
    treatments: [],
    yearsInBusiness: 8,
    generalServices: ["Core removal"],
  },
  {
    id: "v08",
    name: "Hill Country Pallets",
    status: "listed",
    city: "Austin",
    state: "TX",
    zip: "78701",
    lat: 30.27,
    lng: -97.74,
    classification: "Recycler",
    serviceRadius: "100 miles",
    hours: "Mon-Fri 7am-4pm",
    capabilities: ["48x40 #1s/#2s", "Recycled", "Custom sizes"],
    treatments: ["Heat-treated"],
    yearsInBusiness: 13,
    generalServices: ["Drop trailer", "Core removal"],
  },
  {
    id: "v09",
    name: "River City Pallet Co",
    status: "listed",
    city: "Memphis",
    state: "TN",
    zip: "38103",
    lat: 35.15,
    lng: -90.05,
    classification: "Recycler",
    serviceRadius: "85 miles",
    hours: "Mon-Fri 7am-5pm",
    capabilities: ["48x40 #2s", "Recycled"],
    treatments: [],
    yearsInBusiness: 20,
    generalServices: [],
  },
  {
    id: "v10",
    name: "Sunshine Pallet & Skid",
    status: "listed",
    city: "Orlando",
    state: "FL",
    zip: "32801",
    lat: 28.54,
    lng: -81.38,
    classification: "Manufacturer",
    serviceRadius: "150 miles",
    hours: "Mon-Fri 6am-5pm",
    capabilities: ["Custom sizes", "New build", "48x40 #1s"],
    treatments: ["HT/ISPM-15", "Kiln dried", "FDA compliant"],
    yearsInBusiness: 26,
    generalServices: ["Drop trailer"],
  },
  {
    id: "v11",
    name: "Pacific Crest Pallets",
    status: "listed",
    city: "Seattle",
    state: "WA",
    zip: "98101",
    lat: 47.61,
    lng: -122.33,
    classification: "Recycler",
    serviceRadius: "90 miles",
    hours: "Mon-Fri 7am-4pm",
    capabilities: ["Recycled", "48x40 #2s"],
    treatments: ["Heat-treated"],
    yearsInBusiness: 14,
    generalServices: ["Core removal"],
  },
  {
    id: "v12",
    name: "Mile High Pallet Co",
    status: "listed",
    city: "Denver",
    state: "CO",
    zip: "80202",
    lat: 39.74,
    lng: -104.99,
    classification: "Recycler",
    serviceRadius: "110 miles",
    hours: "Mon-Fri 7am-5pm",
    capabilities: ["48x40 #1s/#2s", "Recycled"],
    treatments: [],
    yearsInBusiness: 17,
    generalServices: ["Drop trailer"],
  },
  {
    id: "v13",
    name: "South Florida Pallets",
    status: "listed",
    city: "Miami",
    state: "FL",
    zip: "33101",
    lat: 25.76,
    lng: -80.19,
    classification: "Recycler",
    serviceRadius: "75 miles",
    hours: "Mon-Fri 7am-4pm",
    capabilities: ["Recycled", "48x40 #2s", "Cores"],
    treatments: [],
    yearsInBusiness: 10,
    generalServices: ["Core removal"],
  },
  {
    id: "v14",
    name: "Music City Pallet Mfg",
    status: "listed",
    city: "Nashville",
    state: "TN",
    zip: "37203",
    lat: 36.16,
    lng: -86.78,
    classification: "Manufacturer",
    serviceRadius: "130 miles",
    hours: "Mon-Fri 7am-5pm",
    capabilities: ["Custom sizes", "New build", "48x40 #1s"],
    treatments: ["HT/ISPM-15", "Kiln dried"],
    yearsInBusiness: 28,
    generalServices: ["Drop trailer"],
  },
  {
    id: "v15",
    name: "Lake Erie Pallet Works",
    status: "listed",
    city: "Cleveland",
    state: "OH",
    zip: "44114",
    lat: 41.5,
    lng: -81.69,
    classification: "Recycler",
    serviceRadius: "85 miles",
    hours: "Mon-Fri 7am-5pm",
    capabilities: ["48x40 #2s", "Recycled"],
    treatments: ["Heat-treated"],
    yearsInBusiness: 19,
    generalServices: ["Core removal"],
  },
  {
    id: "v16",
    name: "Southern Valley Pallet",
    status: "listed",
    city: "Bakersfield",
    state: "CA",
    zip: "93301",
    lat: 35.37,
    lng: -119.02,
    classification: "Recycler",
    serviceRadius: "70 miles",
    hours: "Mon-Fri 7am-4pm",
    capabilities: ["48x40 #2s", "Recycled"],
    treatments: [],
    yearsInBusiness: 7,
    generalServices: [],
  },
  {
    id: "v17",
    name: "Desert Sky Pallets",
    status: "listed",
    city: "Yuma",
    state: "AZ",
    zip: "85364",
    lat: 32.69,
    lng: -114.63,
    classification: "Recycler",
    serviceRadius: "100 miles",
    hours: "Mon-Fri 6am-3pm",
    capabilities: ["48x40 #2s", "Recycled", "Cores"],
    treatments: [],
    yearsInBusiness: 12,
    generalServices: ["Core removal"],
  },
  {
    id: "v18",
    name: "Wasatch Pallet Co",
    status: "listed",
    city: "Salt Lake City",
    state: "UT",
    zip: "84101",
    lat: 40.76,
    lng: -111.89,
    classification: "Recycler",
    serviceRadius: "120 miles",
    hours: "Mon-Fri 7am-5pm",
    capabilities: ["48x40 #1s/#2s", "Recycled"],
    treatments: [],
    yearsInBusiness: 16,
    generalServices: ["Drop trailer"],
  },

  // CLAIMED (green) - 11
  {
    id: "v19",
    name: "Tidewater Pallet Mfg",
    status: "claimed",
    city: "Elizabeth City",
    state: "NC",
    zip: "27909",
    lat: 36.3,
    lng: -76.25,
    classification: "Manufacturer",
    serviceRadius: "150 miles",
    hours: "Mon-Fri 6am-6pm, Sat 7am-12pm",
    capabilities: ["Custom sizes", "New build", "48x40 #1s"],
    treatments: ["HT/ISPM-15", "Kiln dried"],
    yearsInBusiness: 32,
    generalServices: ["Drop trailer"],
  },
  {
    id: "v20",
    name: "Will County Pallet Co",
    status: "claimed",
    city: "Joliet",
    state: "IL",
    zip: "60404",
    lat: 41.52,
    lng: -88.08,
    classification: "Recycler",
    serviceRadius: "90 miles",
    hours: "Mon-Fri 7am-5pm",
    capabilities: ["48x40 #1s/#2s", "Recycled", "Cores"],
    treatments: ["Heat-treated"],
    yearsInBusiness: 21,
    generalServices: ["Core removal", "Drop trailer"],
  },
  {
    id: "v21",
    name: "Peachtree Pallet Group",
    status: "claimed",
    city: "Atlanta",
    state: "GA",
    zip: "30303",
    lat: 33.75,
    lng: -84.39,
    classification: "Manufacturer",
    serviceRadius: "140 miles",
    hours: "Mon-Fri 7am-5pm",
    capabilities: ["Custom sizes", "New build", "48x40 #1s/#2s"],
    treatments: ["HT/ISPM-15", "Kiln dried"],
    yearsInBusiness: 29,
    generalServices: ["Drop trailer"],
  },
  {
    id: "v22",
    name: "Empire State Pallet Works",
    status: "claimed",
    city: "New York",
    state: "NY",
    zip: "10001",
    lat: 40.71,
    lng: -74.01,
    classification: "Recycler",
    serviceRadius: "70 miles",
    hours: "Mon-Fri 6am-5pm",
    capabilities: ["48x40 #1s/#2s", "Recycled", "Cores"],
    treatments: ["Heat-treated"],
    yearsInBusiness: 24,
    generalServices: ["Core removal"],
  },
  {
    id: "v23",
    name: "Great Lakes Skid Mfg",
    status: "claimed",
    city: "Grand Rapids",
    state: "MI",
    zip: "49503",
    lat: 42.96,
    lng: -85.66,
    classification: "Manufacturer",
    serviceRadius: "180 miles",
    hours: "Mon-Fri 6am-6pm",
    capabilities: ["Custom sizes", "New build", "48x40 #1s", "Skids"],
    treatments: ["HT/ISPM-15", "Kiln dried", "FDA compliant"],
    yearsInBusiness: 41,
    generalServices: ["Drop trailer"],
  },
  {
    id: "v24",
    name: "Garden State Pallet",
    status: "claimed",
    city: "Newark",
    state: "NJ",
    zip: "07102",
    lat: 40.73,
    lng: -74.17,
    classification: "Recycler",
    serviceRadius: "85 miles",
    hours: "Mon-Fri 7am-5pm",
    capabilities: ["48x40 #1s/#2s", "Recycled", "Custom sizes"],
    treatments: ["Heat-treated"],
    yearsInBusiness: 18,
    generalServices: ["Core removal", "Drop trailer"],
  },
  {
    id: "v25",
    name: "Twin Cities Pallet Co",
    status: "claimed",
    city: "Minneapolis",
    state: "MN",
    zip: "55401",
    lat: 44.98,
    lng: -93.27,
    classification: "Recycler",
    serviceRadius: "110 miles",
    hours: "Mon-Fri 7am-5pm",
    capabilities: ["48x40 #1s/#2s", "Recycled"],
    treatments: ["Heat-treated"],
    yearsInBusiness: 15,
    generalServices: ["Core removal"],
  },
  {
    id: "v26",
    name: "Queen City Skid Works",
    status: "claimed",
    city: "Charlotte",
    state: "NC",
    zip: "28202",
    lat: 35.23,
    lng: -80.84,
    classification: "Manufacturer",
    serviceRadius: "120 miles",
    hours: "Mon-Fri 7am-5pm",
    capabilities: ["Custom sizes", "New build", "48x40 #1s"],
    treatments: ["HT/ISPM-15", "Kiln dried"],
    yearsInBusiness: 23,
    generalServices: ["Drop trailer"],
  },
  {
    id: "v27",
    name: "Lake Country Pallet",
    status: "claimed",
    city: "Kenosha",
    state: "WI",
    zip: "53144",
    lat: 42.58,
    lng: -87.82,
    classification: "Recycler",
    serviceRadius: "80 miles",
    hours: "Mon-Fri 7am-5pm",
    capabilities: ["48x40 #1s/#2s", "Recycled", "Cores"],
    treatments: ["Heat-treated"],
    yearsInBusiness: 19,
    generalServices: ["Core removal", "Drop trailer"],
  },
  {
    id: "v28",
    name: "Cascadia Pallet Mfg",
    status: "claimed",
    city: "Portland",
    state: "OR",
    zip: "97201",
    lat: 45.51,
    lng: -122.68,
    classification: "Manufacturer",
    serviceRadius: "150 miles",
    hours: "Mon-Fri 6am-5pm",
    capabilities: ["Custom sizes", "New build", "48x40 #1s/#2s"],
    treatments: ["HT/ISPM-15", "Kiln dried"],
    yearsInBusiness: 27,
    generalServices: ["Drop trailer"],
  },
  {
    id: "v29",
    name: "Sonoran Pallet Group",
    status: "claimed",
    city: "Phoenix",
    state: "AZ",
    zip: "85003",
    lat: 33.45,
    lng: -112.07,
    classification: "Recycler",
    serviceRadius: "100 miles",
    hours: "Mon-Fri 6am-4pm",
    capabilities: ["48x40 #1s/#2s", "Recycled"],
    treatments: ["Heat-treated"],
    yearsInBusiness: 16,
    generalServices: ["Core removal"],
  },

  // ENHANCED (blue) - 1, the Kentucky vendor per the brief
  {
    id: "v30",
    name: "Derby City Pallet Mfg",
    status: "enhanced",
    city: "Louisville",
    state: "KY",
    zip: "40202",
    lat: 38.25,
    lng: -85.76,
    classification: "Manufacturer",
    serviceRadius: "200 miles",
    hours: "Mon-Fri 6am-6pm, Sat 7am-12pm",
    capabilities: [
      "Custom sizes",
      "New build",
      "48x40 #1s",
      "Skids",
      "Specialty crates",
    ],
    treatments: ["HT/ISPM-15", "Kiln dried", "FDA compliant"],
    yearsInBusiness: 44,
    generalServices: ["Drop trailer", "Core removal"],
  },
];

// (STATE_CENTERS lookup removed - prior fallback path for vendors
// without lat/lng. The vendor index now filters to records with
// lat/lng at export time, so the fallback is no longer needed.)

// === STATIC VENDOR INDEX (loaded once, searched client-side) ===
//
// Airtable is the system of record. /vendor-index.json is the system of
// search - a flat list of just the fields the map + search need
// (id, name, city, state, lat, lng, status). Loaded once on mount,
// searched in memory, sub-millisecond per keystroke. No live Airtable
// queries during the user flow.
//
// To refresh the index from Airtable, run:
//   AIRTABLE_API_KEY=patXXX AIRTABLE_BASE_ID=appQYT3aaMX1SzO7M \
//     node scripts/export-vendor-index.js
//
// Initial seed = the 30 mock vendors converted to the index shape, so
// the prototype works before the export script ever runs.
const VENDOR_INDEX_URL = "/vendor-index.json";

type VendorIndexEntry = {
  id: string;
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  status: VendorStatus;
  // Optional capability + coverage fields. Present when the source row
  // in vendor_public_read has them populated (i.e. the vendor claimed
  // and filled the chips). Nullable to accept the JSON null returned
  // by the live overlay endpoint when the Supabase column is null --
  // call sites use the existing nullish-falsy guards (length checks,
  // `||` fallbacks) so null and undefined are treated equivalently.
  classification?: string[];
  services?: string[];
  palletTypes?: string[];
  treatments?: string[];
  serviceRadiusMi?: number | null;
  hoursOpen?: string | null;
  hoursClose?: string | null;
  daysOpen?: string[];
};

// Great-circle distance in miles (Haversine). Used to filter the
// loaded index for vendors within ~50mi of the selected vendor.
function haversineMi(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Sample profile fields used to fill in the PUBLIC BUYER CARD for real
// Airtable vendors. The Airtable table only stores basic identity +
// location + status - the rich profile (capabilities, hours, treatments,
// services) is captured on the intro call. For the prototype, we use
// these sample defaults so the buyer card renders complete. The vendor
// seeing their own card understands "this is the structure; my real
// values land here once we talk."
const SAMPLE_PROFILE = {
  serviceRadius: "75 miles",
  hours: "Mon-Fri 7am-5pm",
  yearsInBusiness: 15,
  capabilities: ["48x40 #1s/#2s", "Recycled", "Custom sizes"],
  treatments: ["Heat-treated"],
  generalServices: ["Core removal", "Drop trailer"],
} as const;

// Convert a real Airtable vendor (typeahead or vendors-near result) into
// a MockVendor-shaped object so the existing PublicCardView can render
// it. Real basics + SAMPLE_PROFILE defaults for the rich fields.
// Convert a VendorIndexEntry into a MockVendor-shaped object so the
// existing PublicCardView can render it. Real basics from the index +
// SAMPLE_PROFILE defaults for rich fields (capabilities, hours,
// treatments, services) the index doesn't store. The vendor seeing
// their own card understands "this is the structure - my real values
// land here once we talk."
function indexEntryToMockShape(entry: VendorIndexEntry): MockVendor {
  const city = entry.city || entry.state || "";
  const state = (entry.state || "").toUpperCase();
  return {
    id: entry.id,
    name: entry.name || "Unnamed listing",
    status: safeStatus(entry.status),
    city,
    state,
    zip: "",
    lat: entry.lat,
    lng: entry.lng,
    classification: "Recycler",
    serviceRadius: SAMPLE_PROFILE.serviceRadius,
    hours: SAMPLE_PROFILE.hours,
    capabilities: [...SAMPLE_PROFILE.capabilities],
    treatments: [...SAMPLE_PROFILE.treatments],
    yearsInBusiness: SAMPLE_PROFILE.yearsInBusiness,
    generalServices: [...SAMPLE_PROFILE.generalServices],
  };
}

const STATUS_COLORS: Record<VendorStatus, string> = {
  listed: "#94a1ab", // ink-400 gray
  claimed: "#10b981", // emerald-500 green
  enhanced: "#49a5c1", // brand-500 blue
};

// Airtable Listing Status value "Verified" -> internal "enhanced" -> public label "Enhanced" (do not rename).
const STATUS_LABELS: Record<VendorStatus, string> = {
  listed: "Listed",
  claimed: "Claimed",
  enhanced: "Enhanced",
};

// safeStatus - normalize any string (or undefined / unknown value) to a
// valid VendorStatus. Real Airtable records can have blank Listing Status
// / Enhanced Tier fields, especially for the ~3,300+ unclaimed entries.
// The rest of the prototype assumes status is always defined; this helper
// is the boundary guard. Default is 'listed' (gray pin - the safe
// assumption for unclaimed records pulled from public records).
function safeStatus(value: unknown): VendorStatus {
  if (value === "claimed" || value === "enhanced" || value === "listed") {
    return value;
  }
  return "listed";
}

// === POST-CLAIM SECTION DATA ===
//
// Sample events for the "What's moving in your corridor" Beat 2 card.
// Only the Joliet IL entry is a real verified event (carried over from
// the prior Find-Verify-Link test brief). Other entries are clearly-
// labeled illustrative examples that mirror real event structure so
// the vendor can see what their real weekly Report would look like.
// For states without a sample, the card falls through to the honesty
// line: "We don't manufacture news - quiet weeks we say so."
type SampleCorridorEvent = {
  title: string;
  date: string;
  location: string;
  source: string;
  action: string;
  isReal: boolean;
};

function getSampleEventForState(state: string): SampleCorridorEvent | null {
  const r = (state || "").toUpperCase();
  // Great Lakes - real verified event from prior brief
  if (["IL", "IN", "MI", "OH", "WI"].includes(r)) {
    return {
      title: "Coda Resources signs 244,343 SF industrial lease in Joliet, IL",
      date: "May 21, 2026",
      location: "Joliet, IL",
      source: "REBusinessOnline / Cawley CRE",
      action:
        "Reach Coda Resources procurement before competitors - new fulfillment ramp = pallet demand starting Q3.",
      isReal: true,
    };
  }
  // California - illustrative, clearly labeled
  if (r === "CA") {
    return {
      title:
        "Major logistics operator announces 600,000 SF Inland Empire build-to-suit",
      date: "Illustrative example",
      location: "Riverside County, CA",
      source: "Illustrative - representative of what your real Report scans for",
      action:
        "Approach the announced tenant's logistics team before facility opening - multi-year pallet programs lock 60-90 days ahead.",
      isReal: false,
    };
  }
  // Northeast - illustrative
  if (["NY", "NJ", "PA", "MA", "CT"].includes(r)) {
    return {
      title:
        "Industrial occupier signs 200,000+ SF lease in Lehigh Valley",
      date: "Illustrative example",
      location: "Lehigh Valley, PA",
      source: "Illustrative - representative of what your real Report scans for",
      action:
        "Contact the tenant's procurement before move-in - new-build accounts are the cleanest new business to land.",
      isReal: false,
    };
  }
  // South Central - illustrative
  if (["TX", "OK", "LA", "AR"].includes(r)) {
    return {
      title: "Distributor announces 350,000 SF DC build in DFW corridor",
      date: "Illustrative example",
      location: "Dallas-Fort Worth, TX",
      source: "Illustrative - representative of what your real Report scans for",
      action:
        "Approach the operator now - pallet specs get locked 60-90 days before opening.",
      isReal: false,
    };
  }
  // Southeast - illustrative
  if (["GA", "FL", "NC", "SC", "TN", "KY", "AL", "MS"].includes(r)) {
    return {
      title: "National retailer expands Atlanta-metro DC by 400,000 SF",
      date: "Illustrative example",
      location: "Henry County, GA",
      source: "Illustrative - representative of what your real Report scans for",
      action:
        "Quote the existing operator of the DC before the ramp - volume jumps mean a renegotiation window.",
      isReal: false,
    };
  }
  // Plains/Mountain - illustrative
  if (["CO", "UT", "WY", "MT", "NM", "AZ", "NV", "ID", "ND", "SD", "NE", "KS"].includes(r)) {
    return {
      title: "E-commerce operator commits 250,000 SF in Denver metro",
      date: "Illustrative example",
      location: "Adams County, CO",
      source: "Illustrative - representative of what your real Report scans for",
      action:
        "Reach the tenant's regional procurement before opening - Denver metro is light on incumbent operators.",
      isReal: false,
    };
  }
  // Pacific NW - illustrative
  if (["OR", "WA"].includes(r)) {
    return {
      title:
        "Industrial REIT closes 180,000 SF lease in Portland industrial corridor",
      date: "Illustrative example",
      location: "Multnomah County, OR",
      source: "Illustrative - representative of what your real Report scans for",
      action:
        "Connect with the tenant's supply chain lead during fit-out - pre-opening is the procurement window.",
      isReal: false,
    };
  }
  return null;
}

// makeDotHtml - adapted from see-your-network-enterprise/index.html.
// The production network map sizes dots TINY (5/8/10 px) because the
// national view shows thousands of pins simultaneously - bigger dots
// would smother the country. This prototype only shows pins inside a
// single ~50mi corridor at zoom 10, where small dots vanish against
// the detailed street tiles. So we roughly double the sizes here.
//
// isOwn = true for the searched vendor's own pin - gets +4px and a
// dark ring so "this one is you" reads instantly. The current centered-
// pin treatment relied on map position alone; explicit ring makes it
// survive any zoom/pan.
function makeDotHtml(status: VendorStatus, isOwn = false): string {
  const tap = 36; // click target size (bumped from 30 to fit larger dots)
  // Corridor-zoom sizes (was 10/8/5 for national)
  const baseSize =
    status === "enhanced" ? 18 : status === "claimed" ? 16 : 14;
  const dotSize = isOwn ? baseSize + 4 : baseSize;
  // Own-pin ring: solid dark ring + soft white background halo
  const ringSize = dotSize + 12;
  const ownRing = isOwn
    ? `<div style="position:absolute;width:${ringSize}px;height:${ringSize}px;border-radius:50%;border:3px solid rgba(15,29,36,0.85);background:rgba(255,255,255,0.35);pointer-events:none;z-index:0;"></div>`
    : "";

  // VENDOR-ONLY PAGE: no pin is clickable. Pins are visual status
  // context only - the search dropdown is the only way into the
  // FoundRealView card. Cursor stays default so the affordance
  // matches the behavior.
  const wrapperOpen = `<div style="width:${tap}px;height:${tap}px;display:flex;align-items:center;justify-content:center;cursor:default;position:relative;">`;
  const wrapperClose = `</div>`;

  if (status === "enhanced") {
    // Verified Partner: bigger dot + white ring + expanding halo +
    // glow pulse. Enhanced has its own pulse rings; own-ring still
    // renders behind everything for "this is you" if applicable.
    const haloOuter = dotSize + 14;
    const haloInner = dotSize + 10;
    return (
      wrapperOpen +
      ownRing +
      `<div style="position:absolute;width:${haloOuter}px;height:${haloOuter}px;border-radius:50%;border:2px solid rgba(73,165,193,0.6);animation:proRing 2.5s ease-out infinite;pointer-events:none;z-index:1;"></div>` +
      `<div style="position:absolute;width:${haloInner}px;height:${haloInner}px;border-radius:50%;border:1.5px solid rgba(73,165,193,0.4);animation:proRing2 3s ease-out 1s infinite;pointer-events:none;z-index:1;"></div>` +
      `<div style="width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(130,210,235,1), #49a5c1);border:3px solid rgba(255,255,255,0.95);animation:proPulse 3s ease-in-out infinite;position:relative;z-index:2;"></div>` +
      wrapperClose
    );
  }
  if (status === "claimed") {
    return (
      wrapperOpen +
      ownRing +
      `<div style="width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(100,230,140,1), #00C853);border:2px solid rgba(255,255,255,0.85);box-shadow:0 0 8px rgba(0,200,83,0.5);position:relative;z-index:1;"></div>` +
      wrapperClose
    );
  }
  // Listed: bigger gray dot with higher opacity (0.85 not 0.65) and a
  // brighter white border so the color reads against street tiles.
  return (
    wrapperOpen +
    ownRing +
    `<div style="width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(190,200,210,1), #8a9bae);opacity:0.9;border:2px solid rgba(255,255,255,0.7);position:relative;z-index:1;"></div>` +
    wrapperClose
  );
}

// makeOwnDotHtml - the vendor's OWN pin, rendered as a circular progress
// ring that fills with listing strength (0-100). Gray/brand while Listed,
// green once Claimed. A word-ladder pill (Bare/Solid/Standout) sits under
// the dot, and the whole pin plays a one-shot pulse each time it re-renders
// (which only happens on a discrete strength gain - completing a field or a
// boost - so the pulse reads as positive feedback, not keystroke spam).
// Pulse keyframe psOwnPulse lives in globals.css.
function makeOwnDotHtml(strength: number, claimed: boolean): string {
  const pct = Math.max(0, Math.min(100, strength));
  const r = 19;
  const circ = 2 * Math.PI * r;
  // The ring fills with listing completeness (computeReadiness) and is full
  // only when every required field is set - certs/treatments excluded, so any
  // vendor can reach a full ring. No percentage number is shown.
  const offset = circ * (1 - pct / 100);
  const arc = claimed ? "#10b981" : "#49a5c1";
  const dot = claimed ? "#10b981" : "#8a9bae";
  const pill = claimed ? "#065f46" : "#334155";
  // Once claimed (green), the dot gets a gentle, continuous celebration
  // ring so it reads as "complete / active" on the map.
  const celebrate = claimed
    ? `<div style="position:absolute;left:21px;top:21px;width:42px;height:42px;border-radius:50%;border:2px solid rgba(16,185,129,0.55);animation:proRing 2.6s ease-out infinite;pointer-events:none;"></div>`
    : "";
  return `
    <div style="position:relative;width:84px;height:100px;transform-origin:42px 42px;animation:psOwnPulse 0.55s ease-out;">
      ${celebrate}
      <svg width="84" height="84" viewBox="0 0 84 84" style="position:absolute;top:0;left:0;overflow:visible;">
        <circle cx="42" cy="42" r="${r}" fill="none" stroke="rgba(255,255,255,0.95)" stroke-width="8"/>
        <circle cx="42" cy="42" r="${r}" fill="none" stroke="#e2e8f0" stroke-width="5"/>
        <circle cx="42" cy="42" r="${r}" fill="none" stroke="${arc}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}" transform="rotate(-90 42 42)"/>
        <circle cx="42" cy="42" r="9" fill="${dot}" stroke="#ffffff" stroke-width="2.5"/>
      </svg>
      <div style="position:absolute;top:73px;left:0;width:84px;text-align:center;">
        <span style="display:inline-block;background:${pill};color:#fff;font-size:11px;font-weight:700;letter-spacing:0.02em;padding:2px 10px;border-radius:999px;white-space:nowrap;box-shadow:0 2px 6px rgba(15,23,42,0.25);">${claimed ? "Claimed" : "Listed"}</span>
      </div>
    </div>`;
}

// === FLOW STATE ===
//
// One state machine for the whole journey. Drives the right-side detail panel.
type FlowStep =
  | "browsing" // viewing the map, no selection
  | "found-real" // real vendor found via Airtable typeahead, "found you" panel
  | "self-add" // vendor not in index - quick add-your-business form
  | "card" // viewing a mock vendor's public card
  | "claim" // filling the short claim form
  | "corridor" // confirming the ~50mi corridor
  | "configurator" // selecting market-signal preferences
  | "waitlist" // Tuesday Report waitlist offer
  | "done"; // confirmation

type ClaimFormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  classifications: string[];
};

const INITIAL_CLAIM: ClaimFormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  classifications: [],
};

type ConfiguratorData = {
  newFacilities: boolean;
  closures: boolean;
  costShifts: boolean;
  competitive: boolean;
};

const INITIAL_CONFIG: ConfiguratorData = {
  newFacilities: true,
  closures: true,
  costShifts: true,
  competitive: true,
};

// === VENDOR TAXONOMY (canonical, 2026-05-28) ===
// Cleaned + de-duplicated from the Airtable Vendors table via the Grok
// taxonomy pass. Five non-overlapping dimensions; no cross-dimension
// redundancy (a Pallet Recycler is never also shown a "Recycling" service
// chip - see CLASSIFICATION_IMPLIES_SERVICE). Sizes standardized to "x".
const CLASSIFICATIONS = [
  "Pallet Manufacturer",
  "Pallet Recycler",
  "Sawmill / Lumber Supplier",
  "Broker / Reseller / Distributor",
  "Crate & Specialty Packaging Manufacturer",
];

// === CLAIM ENRICHMENT (added 2026-05-28) ===
// Optional profile fields the vendor CAN add during the claim step so the
// live buyer's-view card visibly fills in as they act (the configurator
// dopamine). None are required - the 60-second claim is still just the
// contact fields. Anything ticked here pre-loads for the intro call. Sizes
// and the full spec are captured on the intro call to keep the claim quick.
type ClaimEnrichment = {
  services: string[];
  palletTypes: string[];
  treatments: string[];
  serviceRadius: string | null;
  hours: string | null;
  days: string[];
};

const INITIAL_ENRICH: ClaimEnrichment = {
  services: [],
  palletTypes: [],
  treatments: [],
  serviceRadius: null,
  hours: null,
  days: [],
};

// Services / capabilities - the verbs (canonical).
const ENRICH_SERVICES = [
  "New Pallet Manufacturing",
  "Pallet Repair / Reconditioning",
  "Recycling / Remanufacturing",
  "Core Buyback / Scrap Removal",
  "Custom / Specialty Fabrication",
  "Crating & Export Packaging",
  "Drop Trailer / On-Site Service",
  "Distribution / Wholesale Resale",
];

// Pallet types - the product category (canonical).
const ENRICH_PALLET_TYPES = [
  "GMA Stringer (48x40)",
  "Block Pallets",
  "Stringer Pallets (non-GMA)",
  "Plastic Pallets",
  "Custom / Specialty Pallets",
  "Crates",
];

// Treatments & certifications - real treatments/certs only. HT and ISPM-15
// are separate, selectable together (HT is the process; ISPM-15 is the
// export certification stamp that requires HT or fumigation).
const ENRICH_TREATMENTS = [
  "Heat Treated (HT)",
  "ISPM-15 Certified",
  "Fumigated",
  "Kiln Dried (KD)",
  "Chemical Treated",
  "Food Grade / FDA Compliant",
];

// When a classification already implies a service, drop that service from
// the chips so the vendor never sees redundant options (a Pallet Recycler
// shouldn't have to also tick "Recycling" - that's a given).
const CLASSIFICATION_IMPLIES_SERVICE: Record<string, string> = {
  "Pallet Manufacturer": "New Pallet Manufacturing",
  "Pallet Recycler": "Recycling / Remanufacturing",
};

// Example values shown in the live card before the vendor fills anything,
// so the listing looks valuable with zero work (clearly labeled examples;
// the real values are confirmed on the call).
const EXAMPLE_SERVICES = ["Pallet Repair / Reconditioning", "Custom / Specialty Fabrication"];
const EXAMPLE_PALLET_TYPES = ["GMA Stringer (48x40)", "Block Pallets"];
const EXAMPLE_TREATMENTS = ["Heat Treated (HT)", "ISPM-15 Certified"];

// Coverage & hours - service radius (single), open hours (single), and the
// days the yard is open (multi). Captured here or finalized on the call.
const ENRICH_RADII = ["25 mi", "50 mi", "75 mi", "100 mi", "150+ mi"];
const ENRICH_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Open / close time options for the Hours dropdowns (2026-05-29). Replaced
// the fixed window chips (7am-5pm / 6am-4pm) so we don't box vendors into a
// couple of presets - plenty open before 6 and stay past 4. Half-hour steps
// from 5 AM to 10 PM cover the realistic range without an endless list.
const HOUR_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let h = 5; h <= 22; h++) {
    for (const m of [0, 30]) {
      const ampm = h < 12 ? "AM" : "PM";
      const hr12 = h % 12 === 0 ? 12 : h % 12;
      out.push(`${hr12}:${m === 0 ? "00" : "30"} ${ampm}`);
    }
  }
  return out;
})();

// Approximate state geographic centroids [lat, lng] - used to place a
// believable pin + corridor when a vendor self-adds a business that isn't
// in the index yet. Precise geocoding happens server-side on submit
// (backend wiring pending, task #52). Fallback = US center.
const STATE_CENTROIDS: Record<string, [number, number]> = {
  AL: [32.8, -86.8], AK: [64.0, -152.0], AZ: [34.3, -111.7], AR: [34.9, -92.4],
  CA: [37.2, -119.5], CO: [39.0, -105.5], CT: [41.6, -72.7], DE: [39.0, -75.5],
  DC: [38.9, -77.0], FL: [28.6, -82.4], GA: [32.6, -83.4], HI: [20.3, -156.4],
  ID: [44.4, -114.6], IL: [40.0, -89.2], IN: [39.9, -86.3], IA: [42.0, -93.5],
  KS: [38.5, -98.4], KY: [37.5, -85.3], LA: [31.0, -92.0], ME: [45.4, -69.2],
  MD: [39.0, -76.8], MA: [42.3, -71.8], MI: [44.3, -85.4], MN: [46.3, -94.3],
  MS: [32.7, -89.7], MO: [38.4, -92.5], MT: [47.0, -109.6], NE: [41.5, -99.8],
  NV: [39.3, -116.6], NH: [43.7, -71.6], NJ: [40.1, -74.7], NM: [34.4, -106.1],
  NY: [42.9, -75.5], NC: [35.5, -79.4], ND: [47.5, -100.5], OH: [40.3, -82.8],
  OK: [35.6, -97.5], OR: [43.9, -120.6], PA: [40.9, -77.8], RI: [41.7, -71.6],
  SC: [33.9, -80.9], SD: [44.4, -100.2], TN: [35.9, -86.4], TX: [31.5, -99.3],
  UT: [39.3, -111.7], VT: [44.1, -72.7], VA: [37.5, -78.9], WA: [47.4, -120.5],
  WV: [38.6, -80.6], WI: [44.6, -89.9], WY: [43.0, -107.5],
};

// Self-add form shape - shared by the parent state, DetailPanel props, and
// the SelfAddView form.
type SelfAddData = {
  name: string;
  city: string;
  state: string;
  classification: string;
};

// Listing completeness 0-100, driving the dot ring fill. A pass/fail checklist:
// the ring is FULL only when every REQUIRED field is set. Certs/treatments are
// deliberately EXCLUDED from the list - a vendor who doesn't do export or
// food-grade work can still reach 100%, so they never read as "incomplete" for
// something they can't offer. Required to be filled all the way: contact +
// classification (the claim minimum) + at least 1 service + at least 1 pallet
// type + service area + hours (open AND close) + at least 3 days open.
function computeReadiness(
  data: ClaimFormData,
  enrich: ClaimEnrichment
): number {
  const checks = [
    Boolean(data.email.trim()), // contact (claim minimum)
    data.classifications.length > 0, // what they are (claim minimum)
    enrich.services.length >= 1, // at least 1 service
    enrich.palletTypes.length >= 1, // at least 1 pallet type
    Boolean(enrich.serviceRadius), // service area
    Boolean(enrich.hours && enrich.hours.includes(" - ")), // hours: open AND close
    enrich.days.length >= 3, // at least 3 days open
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

// The "minimum to read as Claimed" - email + classification. Below this
// the live card stays in its gray Listed state and the map dot's ring is
// brand-blue/empty; at or above it both flip to the green Claimed state.
function claimMinimumMet(data: ClaimFormData): boolean {
  return Boolean(data.email.trim()) && data.classifications.length > 0;
}

// Real PSCI component mover - one of the five federal cost-input series with
// its actual week-over-week move + carry-forward flag. Shape mirrors
// lib/psci.ts PsciComponentMover (passed in from the server page; defined
// locally here because this is a client component and can't import the
// server-only lib).
type PsciComponentMover = {
  key: string;
  label: string;
  weightPct: number;
  wowPct: number;
  stale: boolean;
};

// National 30-day forecast (passed from the server page; mirrors
// lib/psci.ts PsciForecast). NATIONAL ONLY by design - a regional composite
// index reopens the "region 144 vs national 113" base-confusion landmine, so
// the vendor read carries only the national forecast. The forecast is an
// OVERLAY on PSCI; it never modifies the index. changePct is the model's own
// current -> projected move, so it never mixes baselines with the backward
// PSCI headline. Null until scripts/backfill-psci-regional.js has produced
// data/psci_forecast.json.
type PsciForecast = {
  asOf: string;
  model: string;
  confidenceLevel: number;
  horizonDays: number;
  current: number | null;
  projected: number | null;
  changePct: number | null;
};

// PSCI snapshot props - passed from the server-rendered page so the
// post-claim section can show real current values without dynamic-
// importing lib/psci (which uses readFileSync). Optional so the
// component still works in isolation / older callers.
interface VendorJourneyPrototypeProps {
  psciValue?: number;
  psciAsOf?: string;
  psciWowPct?: number | null;
  psciComponents?: ReadonlyArray<PsciComponentMover>;
  psciForecast?: PsciForecast | null;
}

export default function VendorJourneyPrototype({
  psciValue,
  psciAsOf,
  psciWowPct,
  psciComponents,
  psciForecast,
}: VendorJourneyPrototypeProps = {}) {
  // === FLOW + SELECTION STATE ===
  // selected = mock vendor (clicked pin, full mock card available)
  // selectedReal = vendor from the loaded index (basic data + sample card)
  const [selected, setSelected] = useState<MockVendor | null>(null);
  const [selectedReal, setSelectedReal] = useState<VendorIndexEntry | null>(
    null
  );
  const [step, setStep] = useState<FlowStep>("browsing");
  const [claimData, setClaimData] = useState<ClaimFormData>(INITIAL_CLAIM);
  const [enrich, setEnrich] = useState<ClaimEnrichment>(INITIAL_ENRICH);
  // Self-add: when a vendor can't find their business in the index, they
  // add it here and drop straight into the same claim wizard.
  const [selfAdd, setSelfAdd] = useState<SelfAddData>({
    name: "",
    city: "",
    state: "",
    classification: "",
  });
  const [config, setConfig] = useState<ConfiguratorData>(INITIAL_CONFIG);
  const [joinedWaitlist, setJoinedWaitlist] = useState(false);
  // In-flight guards for the two POSTs. useRef avoids the re-render race
  // where a fast double-click fires the second submit before the first
  // setState commits.
  const claimInFlight = useRef(false);
  const waitlistInFlight = useRef(false);
  // Drives the indeterminate <SubmitBar> on the claim/edit submit button while
  // the POST is in flight. (claimInFlight is a ref and doesn't re-render; this
  // state does.) (2026-06-02)
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  // Tuesday Report offer (success panel). trReserving drives the button busy
  // state; trReserveDone flips the panel to the inline "reserved" confirmation.
  const [trReserving, setTrReserving] = useState(false);
  const [trReserveDone, setTrReserveDone] = useState(false);
  // Stripe checkout (live offer mode). checkoutBusy disables the button while
  // the session is created; trSuccessBanner shows after Stripe redirects back.
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [trSuccessBanner, setTrSuccessBanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  // === EDIT-AFTER-CLAIM STATE (magic-link flow, 2026-06-01) ===
  // editMode: when set, the claim modal is in EDIT mode -- the same form
  // component, pre-filled with current saved values, that on Save calls
  // vendor-edit-save (UPDATE, with token consume) instead of vendor-claim
  // (the original CREATE-claim path).
  // editLinkError: shown when ?edit=<token> is in the URL but the token is
  // invalid / expired / already used. Calm message + email-entry CTA so the
  // vendor can request a fresh link.
  // emailEntryOpen / emailEntryStatus: small inline panel that lets a
  // returning vendor type their email to request a magic link. Status is
  // the neutral "if that email is on a claimed listing, we sent a link"
  // message that the server always returns.
  const [editMode, setEditMode] = useState<{
    token: string;
    recordId: string;
    initial: EditorPrefill;
  } | null>(null);
  // MULTI-LOCATION (2026-06-02): one company (e.g. Tree Brand) can claim
  // several listings with the same email. verifyEditToken returns every
  // location; editLocations holds them, activeLocationIdx is the one being
  // edited. The tab strip in JourneyModal switches between them. Each saves to
  // its OWN record (editMode.recordId) - independent data, independent
  // subscribe. Empty / single-element = the ordinary single-location flow.
  const [editLocations, setEditLocations] = useState<EditorPrefill[]>([]);
  const [activeLocationIdx, setActiveLocationIdx] = useState(0);
  // Label of the most recently saved location (multi-location only) -> shows a
  // transient "Saved" note in the tab strip. Cleared on tab switch.
  const [savedLocationLabel, setSavedLocationLabel] = useState<string | null>(
    null
  );
  // After a multi-location save, show a confirmation panel ("saved to X ONLY")
  // with a back-to-locations button + a go-to-Tuesday-Report button, instead
  // of silently leaving the form up. Multi-location only.
  const [showMultiSaveConfirm, setShowMultiSaveConfirm] = useState(false);
  const [editLinkError, setEditLinkError] = useState<string | null>(null);
  const [emailEntryOpen, setEmailEntryOpen] = useState(false);
  const [emailEntryValue, setEmailEntryValue] = useState("");
  const [emailEntryStatus, setEmailEntryStatus] = useState<{
    message: string;
    sent: boolean;
  } | null>(null);

  // === MAP DISPLAY STATE ===
  // visibleVendors = mock-shaped pins currently rendered. Empty on load
  // (blank map). Filled after a search-select (real index entries
  // converted to mock shape) or after "Browse sample vendors" (the 30
  // baked-in mock vendors).
  //
  // mapCenter stored as [lng, lat] for backwards-compat with prior
  // react-simple-maps wiring. Leaflet wants [lat, lng] so we flip
  // when calling flyTo() in the view-update effect below.
  // mapZoom uses LEAFLET scale: 4 = full US, 7 = state, 10 = ~50mi
  // metro, 14 = neighborhood. Set 10 on real-vendor select.
  const [visibleVendors, setVisibleVendors] = useState<MockVendor[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-96, 38]);
  const [mapZoom, setMapZoom] = useState(4);

  // === LEAFLET REFS ===
  // The map instance, the markers LayerGroup, the L module reference,
  // and the corridor circle (only present during the corridor-confirm
  // wizard step) live in refs - not state - because Leaflet objects
  // mutate in place and don't play well with React re-renders.
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const markersLayerRef = useRef<unknown>(null);
  const corridorCircleRef = useRef<unknown>(null);
  // Ambient backdrop layer (2026-06-02): a separate layer-group of small
  // gray dots covering the FULL ~7,500-vendor mapped network. Active in
  // the pre-search browsing state to make the map feel populated, serious,
  // and national rather than empty. Cleared when the user selects a vendor
  // (handleSelectRealVendor / handleStartSelfAdd / handleBrowseSamples)
  // because visibleVendors becomes non-empty and ambientMode flips off.
  // Distinct ref from markersLayerRef so the two layer-managers do not
  // fight over the same set of markers.
  const ambientLayerRef = useRef<unknown>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null);
  const [leafletReady, setLeafletReady] = useState(false);

  // === STATIC VENDOR INDEX (loaded once on mount) ===
  // Replaces the prior live typeahead + vendors-near network fetches.
  // ~80KB JSON, fetched once, searched + Haversine-filtered in memory.
  // Sub-millisecond per keystroke; selection is instant.
  //
  // CROSS-SURFACE LIVE STATUS: raw static index is fast but stale the
  // moment any vendor claims. useLiveVendorOverlay fetches the small
  // set of claimed+enhanced rows from vendor_public_read and we merge
  // by id. Same mechanism used on /find-a-vendor -- one source for
  // both pages. Listed vendors continue to load from the static
  // snapshot for speed.
  const [rawVendorIndex, setRawVendorIndex] = useState<VendorIndexEntry[]>([]);
  const { overlay: liveOverlay } = useLiveVendorOverlay();
  const vendorIndex = useMemo<VendorIndexEntry[]>(
    () => applyOverlay(rawVendorIndex, liveOverlay),
    [rawVendorIndex, liveOverlay]
  );
  const [indexLoading, setIndexLoading] = useState(true);
  const [indexError, setIndexError] = useState<string | null>(null);

  // === DENSITY-ADAPTIVE COPY ===
  // Count of claimed (green) + enhanced (blue) neighbors within ~50mi of
  // the searched vendor. Drives which framing the FoundRealView panel
  // shows: 3+ = "dense" = competitive-pressure copy ("you're the gray
  // dot"). 0-2 = "sparse" = first-mover copy ("this corridor is wide
  // open"). The threshold matches what's actually on the map - never
  // tell a sparse-market vendor his competitors are claiming when they
  // obviously aren't.
  const [claimedNeighborCount, setClaimedNeighborCount] = useState(0);

  // Vendors that have been "claimed" via the prototype this session.
  // Used to flip the pin color on the map after the journey completes.
  const [sessionClaimedIds, setSessionClaimedIds] = useState<Set<string>>(
    new Set()
  );

  // Hydrate the claim form from one editor prefill (used by the URL handler
  // AND by the multi-location tab switch). Sets the form fields, a synthetic
  // map anchor, and editMode.recordId to THIS location so a save routes to the
  // right record. Plain function (setters are stable; the URL effect runs once
  // and the tab handler uses the current render's copy).
  function applyEditor(ed: EditorPrefill, token: string) {
    setClaimData({
      firstName: ed.firstName,
      lastName: ed.lastName,
      email: ed.email,
      phone: ed.phone,
      classifications: ed.classifications,
    });
    setEnrich({
      services: ed.services,
      palletTypes: ed.palletTypes,
      treatments: ed.treatments,
      serviceRadius:
        ed.serviceRadiusMi != null ? String(ed.serviceRadiusMi) : null,
      hours:
        ed.hoursOpen && ed.hoursClose
          ? `${ed.hoursOpen} - ${ed.hoursClose}`
          : ed.hoursOpen || "",
      days: ed.daysOpen,
    });
    // Synthesize a "real vendor" anchor so the JourneyModal renders with the
    // right name/location. Lat/lng are a national center fallback; the editor
    // is name-anchored, not map-anchored.
    const synthReal: VendorIndexEntry = {
      id: ed.recordId,
      name: ed.vendorName || "your listing",
      city: ed.city || "",
      state: ed.state || "",
      lat: 39.5,
      lng: -98.5,
      status: "claimed",
    };
    setSelectedReal(synthReal);
    setEditMode({ token, recordId: ed.recordId, initial: ed });
  }

  // Switch the active location tab. Loads that location's saved values into
  // the form. (Unsaved edits in the current tab are not carried over - the
  // vendor saves a location before switching; the strip shows a hint.)
  function handleSwitchLocation(idx: number) {
    if (!editMode || idx < 0 || idx >= editLocations.length) return;
    setSavedLocationLabel(null);
    setShowMultiSaveConfirm(false);
    setActiveLocationIdx(idx);
    applyEditor(editLocations[idx], editMode.token);
    setStep("claim");
  }

  // === EDIT-LINK URL HANDLER (?edit=<token>) ===
  // Runs once on mount: if the URL carries an edit token, verify it. On
  // success, hydrate the claim form with the saved values and open the
  // claim modal in EDIT mode. On failure, show a calm "this link expired"
  // message that links into the email-entry mini-form.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("edit");
    if (!token) return;
    let cancelled = false;
    (async () => {
      const result = await verifyEditToken(token);
      if (cancelled) return;
      if (result.ok) {
        setEditLocations(result.editors);
        setActiveLocationIdx(0);
        applyEditor(result.editors[0], token);
        setStep("claim");
      } else {
        setEditLinkError(result.message);
        // Strip the bad token from the URL so a refresh does not re-verify.
        const url = new URL(window.location.href);
        url.searchParams.delete("edit");
        window.history.replaceState({}, "", url.toString());
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // === STRIPE CHECKOUT RETURN (?tr=success) ===
  // After Stripe Checkout, the success_url returns the vendor to /vendors?tr=success
  // (a full reload, so modal state is gone). Show a confirmation banner and strip
  // the param. The webhook is what actually sets tuesday_report_subscribed; this
  // is just the human-facing acknowledgement.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tr = params.get("tr");
    if (tr === "success") setTrSuccessBanner(true);
    if (tr === "success" || tr === "cancel") {
      const url = new URL(window.location.href);
      url.searchParams.delete("tr");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  // === LOAD THE STATIC INDEX ONCE ===
  useEffect(() => {
    let cancelled = false;
    fetch(VENDOR_INDEX_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: unknown) => {
        if (cancelled) return;
        if (!Array.isArray(data)) {
          setIndexError("Vendor index format unexpected.");
          setIndexLoading(false);
          return;
        }
        // Normalize defensively - any missing fields get safe defaults
        // so downstream code never sees undefined.
        const normalized: VendorIndexEntry[] = data
          .filter(
            (d) =>
              d &&
              typeof d.lat === "number" &&
              typeof d.lng === "number"
          )
          .map((d) => {
            const e: VendorIndexEntry = {
              id: String(d.id || ""),
              name: String(d.name || "Unnamed listing"),
              city: String(d.city || ""),
              state: String(d.state || "").toUpperCase(),
              lat: d.lat,
              lng: d.lng,
              status: safeStatus(d.status),
            };
            // Carry the BAKED capability/coverage fields when present.
            // The index is baked from vendor_public_read (export-vendor-
            // index.js Supabase path), so a CLAIMED vendor's status AND its
            // capabilities come from the SAME canonical source - they can't
            // disagree. Previously these were stripped here and the card
            // depended entirely on the live overlay, so a claimed vendor the
            // overlay didn't return (slow fetch, fetch failure, or a record
            // the view excludes) rendered as "Claimed" with a blank body.
            // The live overlay still wins on top via applyOverlay for
            // freshness; this is the first-paint / overlay-miss floor.
            if (Array.isArray(d.classification) && d.classification.length)
              e.classification = d.classification.map(String);
            if (Array.isArray(d.services) && d.services.length)
              e.services = d.services.map(String);
            if (Array.isArray(d.palletTypes) && d.palletTypes.length)
              e.palletTypes = d.palletTypes.map(String);
            if (Array.isArray(d.treatments) && d.treatments.length)
              e.treatments = d.treatments.map(String);
            if (typeof d.serviceRadiusMi === "number")
              e.serviceRadiusMi = d.serviceRadiusMi;
            if (d.hoursOpen) e.hoursOpen = String(d.hoursOpen);
            if (d.hoursClose) e.hoursClose = String(d.hoursClose);
            if (Array.isArray(d.daysOpen) && d.daysOpen.length)
              e.daysOpen = d.daysOpen.map(String);
            return e;
          });
        setRawVendorIndex(normalized);
        setIndexLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setIndexError(`Could not load vendor index: ${err.message}`);
        setIndexLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // === LEAFLET MAP SETUP (mount once) ===
  // Dynamic-imports Leaflet so SSR doesn't break on its window/document
  // references. Tile layer + zoom control + empty markers LayerGroup
  // initialized here. Markers themselves get added in a separate effect
  // that depends on visibleVendors.
  useEffect(() => {
    let cancelled = false;
    let mapInstance: { remove: () => void } | null = null;
    (async () => {
      const Lmod = await import("leaflet");
      if (cancelled || !mapContainerRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (Lmod as any).default || Lmod;
      const map = L.map(mapContainerRef.current, {
        center: [39.5, -98.5],
        zoom: 4,
        zoomControl: false,
      });
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        {
          maxZoom: 14,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attribution">CARTO</a>',
        }
      ).addTo(map);
      L.control.zoom({ position: "bottomleft" }).addTo(map);
      const markersLayer = L.layerGroup().addTo(map);
      mapRef.current = map;
      markersLayerRef.current = markersLayer;
      leafletRef.current = L;
      mapInstance = map;
      setLeafletReady(true);
    })();
    return () => {
      cancelled = true;
      if (mapInstance) mapInstance.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      corridorCircleRef.current = null;
      ambientLayerRef.current = null;
    };
  }, []);

  // === AMBIENT BACKDROP LAYER (2026-06-02) ===
  // Pre-search browsing state: render the FULL ~7,500-vendor mapped
  // network as small gray dots. Density = "the network is wanted and
  // serious." The "be early" feeling comes from the hero copy ("the
  // network's filling in fast"), NOT from showing emptiness. We
  // deliberately render every vendor as listed-gray here -- no green
  // claimed pins, no count -- because surfacing how few have claimed
  // makes the network look dead and contradicts the messaging. Green
  // pins turn on later when claimed density looks like a crowd.
  //
  // PERF: ~7,500 circleMarkers on Leaflet's canvas renderer (L.canvas())
  // paints in a single canvas pass instead of 7,500 SVG nodes -- this is
  // the standard pattern for ambient density layers and stays smooth on
  // a mid-range laptop.
  const ambientMode =
    step === "browsing" &&
    visibleVendors.length === 0 &&
    !indexLoading &&
    !indexError &&
    vendorIndex.length > 0;

  useEffect(() => {
    if (!leafletReady || !mapRef.current || !leafletRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = leafletRef.current;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = mapRef.current as any;

    // Always tear down any existing ambient layer first -- whether we are
    // turning it off (selection / leave browsing) or rebuilding it (the
    // vendor index loaded with new data).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prev = ambientLayerRef.current as any;
    if (prev) {
      map.removeLayer(prev);
      ambientLayerRef.current = null;
    }

    if (!ambientMode) return;

    // One shared canvas renderer for the whole layer keeps the per-dot
    // overhead down to a single fill-circle call.
    const canvasRenderer = L.canvas({ padding: 0.5 });
    const layer = L.layerGroup();
    for (const v of vendorIndex) {
      if (typeof v.lat !== "number" || typeof v.lng !== "number") continue;
      const dot = L.circleMarker([v.lat, v.lng], {
        radius: 2.5,
        color: STATUS_COLORS.listed,
        fillColor: STATUS_COLORS.listed,
        fillOpacity: 0.55,
        weight: 0,
        interactive: false, // ambient backdrop -- not clickable
        renderer: canvasRenderer,
      });
      layer.addLayer(dot);
    }
    layer.addTo(map);
    ambientLayerRef.current = layer;
    // No cleanup function: the next run of this effect (when ambientMode
    // or vendorIndex changes) handles teardown via the `prev` removal at
    // the top. Unmount teardown lives in the LEAFLET MAP SETUP effect.
  }, [ambientMode, vendorIndex, leafletReady]);

  // Own-pin listing strength (drives the progress ring on the dot) and
  // claimed state. Recomputed each render; the markers effect lists them
  // in deps so the own pin re-draws (and pulses) on each discrete gain.
  // ownClaimed drives the green dot + "Claimed" pill on the own pin; ownStrength
  // fills the progress ring. A vendor who is ALREADY claimed/enhanced (selected
  // from search, not actively re-editing) must read as Claimed with a full ring.
  // Previously this looked ONLY at the in-progress claim FORM, so selecting an
  // already-claimed vendor mislabeled its pin "Listed" with a near-empty ring.
  // Now: the pin reflects the vendor's real saved status, and the form-progress
  // animation still takes over once they actually start editing/claiming.
  // (fix 2026-06-02)
  const ownVendorStatus = selectedReal
    ? safeStatus(selectedReal.status)
    : selected
      ? safeStatus(selected.status)
      : "listed";
  const ownAlreadyLive = ownVendorStatus !== "listed";
  const formMinMet = claimMinimumMet(claimData);
  const ownClaimed = ownAlreadyLive || formMinMet;
  const ownStrength =
    ownAlreadyLive && !formMinMet ? 100 : computeReadiness(claimData, enrich);

  // === LEAFLET MARKERS (re-render when visibleVendors / strength changes) ===
  useEffect(() => {
    if (!leafletReady || !markersLayerRef.current || !leafletRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = leafletRef.current;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const layer = markersLayerRef.current as any;
    layer.clearLayers();
    // The subject pin is whichever vendor we're claiming - a real search
    // result (selectedReal) or a mock / self-added vendor (selected).
    const ownId = selectedReal?.id ?? selected?.id ?? null;
    visibleVendors.forEach((v) => {
      const status = effectiveStatus(v);
      const isOwn = ownId !== null && v.id === ownId;
      const tapSize = 36;
      // Own pin gets the strength ring + word-ladder pill; neighbors get
      // the plain status dot.
      const icon = isOwn
        ? L.divIcon({
            html: makeOwnDotHtml(ownStrength, ownClaimed),
            iconSize: [84, 100],
            iconAnchor: [42, 42],
            className: "",
          })
        : L.divIcon({
            html: makeDotHtml(status, false),
            iconSize: [tapSize, tapSize],
            iconAnchor: [tapSize / 2, tapSize / 2],
            className: "",
          });
      const marker = L.marker([v.lat, v.lng], {
        icon,
        // Own pin gets highest z-index so its ring always sits above
        // neighbors. Enhanced > Claimed > Listed below that.
        zIndexOffset: isOwn
          ? 1000
          : status === "enhanced"
            ? 500
            : status === "claimed"
              ? 200
              : 0,
      });
      // VENDOR-ONLY PAGE RULE: no pin is clickable on this page. The
      // search dropdown is the ONLY way into the found-vendor card -
      // type your business, select from the list, the FoundRealView
      // renders on the right with the claim CTA. Neighbor pins stay
      // visible for "you're gray, they're green" status context, but
      // can't be opened (browsing neighbor cards is buyer behavior
      // and lives on the future Vendor Network buyer tab). The own
      // pin also has no click handler - the card is already showing
      // on the right, and re-firing handleSelectVendor would wipe
      // selectedReal and swap into the mock card view by mistake.
      // Do not re-wire pin clicks here.
      layer.addLayer(marker);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleVendors, selectedReal, selected, leafletReady, ownStrength, ownClaimed]);

  // === MAP VIEW UPDATE (flyTo when center/zoom change) ===
  useEffect(() => {
    if (!leafletReady || !mapRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = mapRef.current as any;
    // mapCenter is [lng, lat]; Leaflet wants [lat, lng]
    map.flyTo([mapCenter[1], mapCenter[0]], mapZoom, { duration: 0.8 });
  }, [mapCenter, mapZoom, leafletReady]);

  // === MAP RESIZE FIT ===
  // The map column stretches to the detail panel's height (items-stretch),
  // so when the panel swaps steps and changes height, the map container
  // resizes. Leaflet needs invalidateSize() to re-fit its tiles to the new
  // box, otherwise the map paints gray gaps. Run it shortly after each
  // step / pin change so layout has settled.
  useEffect(() => {
    if (!leafletReady || !mapRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = mapRef.current as any;
    const id = setTimeout(() => map.invalidateSize(), 80);
    return () => clearTimeout(id);
  }, [step, visibleVendors, leafletReady]);

  // ---- SYNC selectedReal TO BULK OVERLAY ----
  // The shared live overlay (useLiveVendorOverlay) updates the merged
  // vendorIndex when claimed+enhanced rows arrive. selectedReal is a
  // separate snapshot the user picked from the index; if the overlay
  // promotes a vendor to claimed/enhanced or adds capability fields
  // AFTER the user already selected, sync selectedReal to the live
  // version so the right-rail card reflects current status without a
  // re-selection. STATUS_RANK guards against downgrading an optimistic
  // post-claim update that the same-session handler set locally before
  // the next overlay refresh propagates.
  //
  // This replaces the per-selection ?id= refetch from the prior round
  // -- the bulk overlay supplies the same data once per page load,
  // shared with /find-a-vendor, no per-click network call.
  useEffect(() => {
    if (!selectedReal?.id) return;
    const live = liveOverlay.get(selectedReal.id) as
      | VendorOverlayEntry
      | undefined;
    if (!live) return;
    const localRank = STATUS_RANK[selectedReal.status] ?? 0;
    const liveRank = STATUS_RANK[live.status] ?? 0;
    if (liveRank < localRank) return; // don't downgrade
    // Only update if SOMETHING actually changed (avoid render loops).
    if (
      live.status === selectedReal.status &&
      (live.classification || []).join("|") ===
        (selectedReal.classification || []).join("|") &&
      (live.services || []).join("|") ===
        (selectedReal.services || []).join("|") &&
      (live.palletTypes || []).join("|") ===
        (selectedReal.palletTypes || []).join("|") &&
      (live.treatments || []).join("|") ===
        (selectedReal.treatments || []).join("|")
    ) {
      return;
    }
    // Strip lat/lng from the overlay before merging -- those are
    // non-null in the static index but nullable on the overlay type,
    // and the static row's coordinates are the canonical pin position.
    const { lat: _ignoreLat, lng: _ignoreLng, ...liveSafe } = live;
    void _ignoreLat;
    void _ignoreLng;
    setSelectedReal((prev) =>
      prev && prev.id === selectedReal.id ? { ...prev, ...liveSafe } : prev
    );
  }, [selectedReal, liveOverlay]);

  // === CORRIDOR CIRCLE (only during corridor-confirm step) ===
  useEffect(() => {
    if (!leafletReady || !mapRef.current || !leafletRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = leafletRef.current;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = mapRef.current as any;
    if (corridorCircleRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.removeLayer(corridorCircleRef.current as any);
      corridorCircleRef.current = null;
    }
    if (step === "corridor") {
      const lat = selected ? selected.lat : mapCenter[1];
      const lng = selected ? selected.lng : mapCenter[0];
      const circle = L.circle([lat, lng], {
        radius: 50 * 1609.34, // 50 miles in meters
        color: "#49a5c1",
        fillColor: "#49a5c1",
        fillOpacity: 0.1,
        weight: 2,
        dashArray: "5 5",
      }).addTo(map);
      corridorCircleRef.current = circle;
    }
  }, [step, selected, mapCenter, leafletReady]);

  // === CLIENT-SIDE SEARCH ===
  // Substring match on name + city + state, case-insensitive. Instant.
  // No debounce needed - filter runs against in-memory array, takes
  // <1ms for thousands of records.
  const searchResults: VendorIndexEntry[] = (() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2 || vendorIndex.length === 0) return [];
    const matches: VendorIndexEntry[] = [];
    for (const entry of vendorIndex) {
      if (
        entry.name.toLowerCase().includes(q) ||
        entry.city.toLowerCase().includes(q) ||
        entry.state.toLowerCase().includes(q)
      ) {
        matches.push(entry);
        if (matches.length >= 8) break;
      }
    }
    return matches;
  })();

  // Effective status - if the user has claimed this vendor via the
  // prototype, show it green. Otherwise, original status.
  function effectiveStatus(v: MockVendor): VendorStatus {
    if (sessionClaimedIds.has(v.id) && v.status === "listed") return "claimed";
    return v.status;
  }

  // === HANDLERS ===

  // Select a vendor from the search dropdown. Everything happens
  // synchronously against the loaded in-memory index - no network
  // fetches, no waiting, instant zoom + neighbor reveal.
  function handleSelectRealVendor(entry: VendorIndexEntry) {
    setSelectedReal(entry);
    setSelected(null);
    setStep("found-real");
    setSearchQuery("");
    setSearchOpen(false);
    setClaimData(INITIAL_CLAIM);

    // Center on exact lat/lng, zoom tight to ~50mi view (Leaflet scale)
    setMapCenter([entry.lng, entry.lat]);
    setMapZoom(10);

    // Build the visible-pin set: the selected vendor + all index
    // entries within 50mi (true Haversine circle, not bounding box).
    const RADIUS_MI = 50;
    const own = indexEntryToMockShape(entry);
    const neighborShapes: MockVendor[] = [];
    for (const candidate of vendorIndex) {
      if (candidate.id === entry.id) continue;
      const dist = haversineMi(
        entry.lat,
        entry.lng,
        candidate.lat,
        candidate.lng
      );
      if (dist <= RADIUS_MI) {
        neighborShapes.push(indexEntryToMockShape(candidate));
      }
    }
    setVisibleVendors([own, ...neighborShapes]);
    // Count claimed + enhanced neighbors for density-adaptive copy.
    // Both signal "this vendor is ready in buyers' eyes" - so both
    // count toward the dense / sparse framing decision.
    const greenLikeCount = neighborShapes.filter(
      (n) => n.status === "claimed" || n.status === "enhanced"
    ).length;
    setClaimedNeighborCount(greenLikeCount);
  }

  // Mock-pin selection helper. CURRENTLY UNUSED on the live page per
  // the vendor-only rule (2026-05-23) - pins are non-clickable now,
  // so this handler has no call site. Kept in the file because the
  // claim/configurator flow downstream still references the `selected`
  // state it would set, and re-enabling demo-mode pin clicks in the
  // future would re-wire to this function.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleSelectVendor(v: MockVendor) {
    setSelected(v);
    setSelectedReal(null);
    setStep("card");
    setSearchQuery("");
    setSearchOpen(false);
    // Pre-fill claim form classification if vendor has one (seed array
    // from MockVendor's single classification field)
    setClaimData({
      ...INITIAL_CLAIM,
      classifications: v.classification ? [v.classification] : [],
    });
  }

  // "Browse sample vendors" - reveals all 30 mock pins at national zoom
  // so Rob can walk the prototype flow without typing a real business.
  function handleBrowseSamples() {
    setVisibleVendors(MOCK_VENDORS);
    setMapCenter([-96, 38]);
    setMapZoom(4);
    setStep("browsing");
    setSelected(null);
    setSelectedReal(null);
    setSearchQuery("");
    setSearchOpen(false);
    setClaimedNeighborCount(0);
  }

  function handleStartClaim() {
    setStep("claim");
  }

  // === EDIT-LINK HANDLERS (2026-06-01) =====================================
  // handleOpenEmailEntry: opens the small inline panel where a returning
  // vendor types their email to request a magic link.
  // handleSubmitEmailEntry: POSTs the email to vendor-edit-request and
  // shows the neutral "if that email is on a claimed listing, we sent a
  // link" message no matter what the server found (anti-fishing).
  // handleDismissEmailEntry: closes the panel + clears status.
  function handleOpenEmailEntry() {
    setEditLinkError(null);
    setEmailEntryStatus(null);
    setEmailEntryOpen(true);
  }
  async function handleSubmitEmailEntry(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = emailEntryValue.trim();
    if (!email || !email.includes("@") || !email.includes(".")) {
      setEmailEntryStatus({
        message: "Enter a valid email and we'll try to send a link.",
        sent: false,
      });
      return;
    }
    const result = await requestEditLink(email);
    setEmailEntryStatus({
      message: result.message || "Request submitted.",
      sent: true,
    });
  }
  function handleDismissEmailEntry() {
    setEmailEntryOpen(false);
    setEmailEntryValue("");
    setEmailEntryStatus(null);
  }

  // Self-add: open the quick add form (prefilled with whatever they typed).
  function handleStartSelfAdd() {
    setSelfAdd({
      name: searchQuery.trim(),
      city: "",
      state: "",
      classification: "",
    });
    // Clear the search so the no-match dropdown disappears once they're in
    // the add flow (the name carries over into the self-add form above).
    setSearchQuery("");
    setSearchOpen(false);
    setStep("self-add");
  }

  // Self-add submit: geocode the city/state for an accurate pin, build a
  // Listed vendor there, drop it on the map, and route into the claim
  // wizard. Geocoding runs client-side (OSM Nominatim); on any failure we
  // fall back to the state centroid so placement still works. The real
  // record is created server-side on claim submit (backend pending, #52).
  async function handleSelfAddSubmit() {
    const name = selfAdd.name.trim();
    const state = selfAdd.state.trim().toUpperCase();
    const city = selfAdd.city.trim();
    if (!name || !state) return;

    let coords: [number, number] = STATE_CENTROIDS[state] || [38, -96];
    try {
      const q = encodeURIComponent(`${city ? city + ", " : ""}${state}, USA`);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
        { headers: { Accept: "application/json" } }
      );
      if (res.ok) {
        const arr = await res.json();
        if (arr && arr[0] && arr[0].lat && arr[0].lon) {
          coords = [parseFloat(arr[0].lat), parseFloat(arr[0].lon)];
        }
      }
    } catch {
      // keep the state-centroid fallback
    }

    const mock: MockVendor = {
      id: "self-add",
      name,
      status: "listed",
      city,
      state,
      zip: "",
      lat: coords[0],
      lng: coords[1],
      classification: selfAdd.classification,
      serviceRadius: "",
      hours: "",
      capabilities: [],
      treatments: [],
      yearsInBusiness: 0,
      generalServices: [],
    };
    setSelected(mock);
    setSelectedReal(null);
    setVisibleVendors([mock]);
    setMapCenter([coords[1], coords[0]]); // stored [lng, lat]
    setMapZoom(11);
    setClaimData({
      ...INITIAL_CLAIM,
      classifications: selfAdd.classification ? [selfAdd.classification] : [],
    });
    setSearchQuery("");
    setSearchOpen(false);
    setStep("claim");
  }

  async function handleClaimSubmit() {
    // Validation - just require name and email
    if (!claimData.firstName.trim() || !claimData.email.trim()) {
      return;
    }
    // Block double-submit while the previous attempt is in flight.
    if (claimInFlight.current) return;
    // Fresh success panel each submit -- don't carry a prior reserve confirm.
    setTrReserveDone(false);

    // === EDIT MODE BRANCH (2026-06-01) ===
    // When the modal opened via a magic-link token, Save updates the
    // existing Supabase vendor row + Airtable mirror via vendor-edit-save
    // (which consumes the token). Same fields, different endpoint -- no
    // duplicate row, no re-claim.
    if (editMode) {
      claimInFlight.current = true;
      setClaimSubmitting(true);
      try {
        const radius = enrich.serviceRadius
          ? parseInt(enrich.serviceRadius, 10) || null
          : null;
        const [hoursOpen, hoursClose] = enrich.hours
          ? enrich.hours.split(" - ")
          : ["", ""];
        const result = await saveEditFields(
          editMode.token,
          {
            firstName: claimData.firstName,
            lastName: claimData.lastName,
            email: claimData.email,
            phone: claimData.phone,
            classifications: claimData.classifications,
            services: enrich.services,
            palletTypes: enrich.palletTypes,
            treatments: enrich.treatments,
            serviceRadiusMi: radius,
            hoursOpen: hoursOpen || "",
            hoursClose: hoursClose || "",
            daysOpen: enrich.days,
          },
          // Route the save to the location currently being edited (multi-
          // location). For single-location this equals the token's own vendor.
          editMode.recordId
        );
        if (!result.ok) {
          if (typeof window !== "undefined") {
            window.alert(
              `Save failed: ${result.message}\n\nThe page is intentionally NOT advancing. Request a new edit link if the token expired.`
            );
          }
          return;
        }
        // Overlay the new values onto the in-session selectedReal so the
        // scorecard reflects the save when the modal closes.
        if (selectedReal) {
          const overlay: VendorIndexEntry = {
            ...selectedReal,
            status: "claimed",
            classification:
              claimData.classifications.length > 0
                ? [...claimData.classifications]
                : selectedReal.classification,
            services:
              enrich.services.length > 0
                ? [...enrich.services]
                : selectedReal.services,
            palletTypes:
              enrich.palletTypes.length > 0
                ? [...enrich.palletTypes]
                : selectedReal.palletTypes,
            treatments:
              enrich.treatments.length > 0
                ? [...enrich.treatments]
                : selectedReal.treatments,
            serviceRadiusMi: radius ?? selectedReal.serviceRadiusMi,
            hoursOpen: hoursOpen || selectedReal.hoursOpen,
            hoursClose: hoursClose || selectedReal.hoursClose,
            daysOpen:
              enrich.days.length > 0 ? [...enrich.days] : selectedReal.daysOpen,
          };
          setSelectedReal(overlay);
        }
        if (editLocations.length > 1) {
          // MULTI-LOCATION: update this location's saved baseline so switching
          // back shows the new values, keep the session (token is NOT consumed
          // server-side now), and stay on the editor so they can save other
          // tabs. A small "Saved" note confirms it.
          setEditLocations((prev) =>
            prev.map((l, i) =>
              i === activeLocationIdx
                ? {
                    ...l,
                    firstName: claimData.firstName,
                    lastName: claimData.lastName,
                    email: claimData.email,
                    phone: claimData.phone,
                    classifications: claimData.classifications,
                    services: enrich.services,
                    palletTypes: enrich.palletTypes,
                    treatments: enrich.treatments,
                    serviceRadiusMi: radius,
                    hoursOpen: hoursOpen || "",
                    hoursClose: hoursClose || "",
                    daysOpen: enrich.days,
                  }
                : l
            )
          );
          const cur = editLocations[activeLocationIdx];
          setSavedLocationLabel(
            [cur?.city, cur?.state].filter(Boolean).join(", ") ||
              cur?.vendorName ||
              "this location"
          );
          setShowMultiSaveConfirm(true);
          setStep("claim");
        } else {
          // SINGLE-LOCATION: clear edit mode + strip ?edit= from the URL so a
          // refresh does not re-verify the link.
          setEditMode(null);
          if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            url.searchParams.delete("edit");
            window.history.replaceState({}, "", url.toString());
          }
          // Skip the Tuesday Report waitlist branch on edits -- the vendor
          // came back to update fields, not be pitched again. Go straight to
          // the done confirmation.
          setJoinedWaitlist(false);
          setStep("done");
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("vendor-edit-save threw:", msg);
        if (typeof window !== "undefined") {
          window.alert(
            `Save failed: ${msg}\n\nThe page is intentionally NOT advancing.`
          );
        }
      } finally {
        claimInFlight.current = false;
        setClaimSubmitting(false);
      }
      return;
    }

    const vendorId = selectedReal?.id ?? selected?.id ?? null;
    const vendorName = selectedReal?.name ?? selected?.name ?? "";
    // When a real vendor is selected, the claim POST is must-succeed: do
    // NOT advance to the success screen unless the backend confirms the
    // write. Anything less than that produces the "page says claimed but
    // Supabase says Listed" lie. Demo path with no vendor selected
    // (vendorId null) still advances locally for the UI walkthrough.
    if (vendorId) {
      claimInFlight.current = true;
      setClaimSubmitting(true);
      try {
        const res = await fetch(CLAIM_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vendorId,
            company: vendorName,
            firstName: claimData.firstName,
            lastName: claimData.lastName,
            email: claimData.email,
            phone: claimData.phone,
            classifications: claimData.classifications,
            services: enrich.services,
            palletTypes: enrich.palletTypes,
            treatments: enrich.treatments,
            serviceRadiusMi: enrich.serviceRadius
              ? parseInt(enrich.serviceRadius, 10) || null
              : null,
            hoursOpen: enrich.hours ? enrich.hours.split(" - ")[0] || null : null,
            hoursClose: enrich.hours ? enrich.hours.split(" - ")[1] || null : null,
            daysOpen: enrich.days,
            source: "vendors-prototype",
            // address omitted -- server allows when source is set
          }),
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          console.error("vendor-claim POST failed:", res.status, txt);
          if (typeof window !== "undefined") {
            window.alert(
              `Claim failed: HTTP ${res.status}. ${txt.slice(0, 200) || "(no body)"}\n\nThe page is intentionally NOT advancing -- the write didn't reach Supabase. Fix the backend (is netlify dev on :8888 running?) and resubmit.`
            );
          }
          return; // <-- do not advance
        }
        // ---- OPTIMISTIC POST-CLAIM UPDATE ----
        // Backend confirmed the claim. Synthesize a "claimed" entry from
        // the exact payload we just submitted (== what landed in Supabase)
        // and overlay it onto selectedReal + visibleVendors. The
        // FoundRealView card switches to ClaimedListingCard with the
        // vendor's REAL configured fields the instant they finish the
        // journey -- no re-bake, no extra fetch. The live useEffect
        // refetch is gated by STATUS_RANK so it won't downgrade this.
        if (selectedReal) {
          const radiusMi = enrich.serviceRadius
            ? parseInt(enrich.serviceRadius, 10) || undefined
            : undefined;
          const [open, close] = enrich.hours
            ? enrich.hours.split(" - ")
            : [undefined, undefined];
          const overlay: VendorIndexEntry = {
            ...selectedReal,
            status: "claimed",
            classification:
              claimData.classifications.length > 0
                ? [...claimData.classifications]
                : selectedReal.classification,
            services:
              enrich.services.length > 0
                ? [...enrich.services]
                : selectedReal.services,
            palletTypes:
              enrich.palletTypes.length > 0
                ? [...enrich.palletTypes]
                : selectedReal.palletTypes,
            treatments:
              enrich.treatments.length > 0
                ? [...enrich.treatments]
                : selectedReal.treatments,
            serviceRadiusMi: radiusMi ?? selectedReal.serviceRadiusMi,
            hoursOpen: open || selectedReal.hoursOpen,
            hoursClose: close || selectedReal.hoursClose,
            daysOpen:
              enrich.days.length > 0 ? [...enrich.days] : selectedReal.daysOpen,
          };
          setSelectedReal(overlay);
          // Sync the map dot too (the OWN pin renders via makeOwnDotHtml,
          // but the surrounding pin set tracks status for color).
          setVisibleVendors((prev) =>
            prev.map((v) =>
              v.id === overlay.id ? { ...v, status: "claimed" } : v
            )
          );
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("vendor-claim POST threw:", msg);
        if (typeof window !== "undefined") {
          window.alert(
            `Claim failed: ${msg}\n\nMost likely the functions server (netlify dev on :8888) isn't running. The page is intentionally NOT advancing.`
          );
        }
        return; // <-- do not advance
      } finally {
        claimInFlight.current = false;
        setClaimSubmitting(false);
      }
    }
    // Backend confirmed (or no vendor selected -- demo path). Advance.
    setStep("waitlist");
  }

  function handleCorridorConfirm() {
    // Corridor is no longer a required step (the corridor is shown inside the
    // read). Kept for safety; routes forward to the read.
    setStep("waitlist");
  }

  // Reached only as the OPTIONAL post-read tune-up now. Returns to the read.
  function handleConfiguratorContinue() {
    setStep("waitlist");
  }

  // === TUESDAY REPORT OFFER (success panel) ===
  // The public vendor id the success panel acts on (the RPC resolves rec / ps_
  // / uuid forms the same way claim_vendor does).
  function successVendorId(): string | null {
    return selectedReal?.id ?? selected?.id ?? null;
  }
  // Fired once when the offer is actually SHOWN -> marks it seen so the vendor
  // is never pitched twice (next edit just confirms). Fire-and-forget.
  function handleTuesdayReportSeen() {
    const vid = successVendorId();
    if (vid) markTuesdayReportOffer(vid, "seen").catch(() => {});
  }
  // Deliberate "Reserve my founding rate" click. Captures the reservation
  // server-side (no payment) and flips the panel to the inline confirmation.
  async function handleReserveTuesdayReport() {
    const vid = successVendorId();
    if (!vid || trReserving) return;
    setTrReserving(true);
    try {
      const result = await markTuesdayReportOffer(vid, "reserve");
      if (result.ok) {
        setTrReserveDone(true);
        setJoinedWaitlist(true);
      } else if (typeof window !== "undefined") {
        window.alert(
          "Could not reserve right now. Try again in a minute - your listing change is already saved."
        );
      }
    } finally {
      setTrReserving(false);
    }
  }
  // Live "Start the Tuesday Report" -> Stripe Checkout. Redirects the browser
  // to the hosted checkout; the webhook flips tuesday_report_subscribed on
  // payment. No card data touches our code.
  async function handleStartTuesdayCheckout() {
    const vid = successVendorId();
    if (!vid || checkoutBusy) return;
    setCheckoutBusy(true);
    const email = (editMode ? editMode.initial.email : claimData.email) || "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const result = await startTuesdayReportCheckout(vid, email, origin);
    if (result.ok && result.url && typeof window !== "undefined") {
      window.location.href = result.url; // leaving the SPA for Stripe
      return;
    }
    setCheckoutBusy(false);
    if (typeof window !== "undefined") {
      window.alert(
        "Could not start checkout right now. Try again in a minute - your listing change is already saved."
      );
    }
  }

  async function handleJoinWaitlist() {
    // Block double-submit while in flight.
    if (waitlistInFlight.current) return;
    // POST a waitlistOnly reservation to vendor-claim. Server skips
    // claim_vendor (no duplicate vendor_claims row) and just inserts
    // into tuesday_report_waitlist + notifies Rob via Resend.
    // The waitlist POST is must-succeed for the same reason claim is --
    // don't show "you're on the list" unless the row actually landed.
    const vendorId = selectedReal?.id ?? selected?.id ?? null;
    if (vendorId && claimData.email.trim()) {
      waitlistInFlight.current = true;
      try {
        const res = await fetch(CLAIM_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            waitlistOnly: true,
            vendorId,
            email: claimData.email,
            source: "vendors-prototype",
          }),
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          console.error("waitlist POST failed:", res.status, txt);
          if (typeof window !== "undefined") {
            window.alert(
              `Reservation failed: HTTP ${res.status}. ${txt.slice(0, 200) || "(no body)"}\n\nThe page is intentionally NOT showing success -- the waitlist row didn't land.`
            );
          }
          return; // <-- do not flip joinedWaitlist or finish
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("waitlist POST threw:", msg);
        if (typeof window !== "undefined") {
          window.alert(
            `Reservation failed: ${msg}\n\nIs the functions server (netlify dev on :8888) running? Page not advancing.`
          );
        }
        return;
      } finally {
        waitlistInFlight.current = false;
      }
    }
    // Backend confirmed (or demo path with no vendor) -- now safe to
    // flip the success state and finish.
    setJoinedWaitlist(true);
    finishJourney();
  }

  function handleSkipWaitlist() {
    setJoinedWaitlist(false);
    finishJourney();
  }

  function finishJourney() {
    if (selected) {
      setSessionClaimedIds((prev) => {
        const next = new Set(prev);
        next.add(selected.id);
        return next;
      });
    }
    setStep("done");
  }

  function resetJourney() {
    setSelected(null);
    setSelectedReal(null);
    setStep("browsing");
    setClaimData(INITIAL_CLAIM);
    setEnrich(INITIAL_ENRICH);
    setSelfAdd({ name: "", city: "", state: "", classification: "" });
    setConfig(INITIAL_CONFIG);
    setJoinedWaitlist(false);
    // Reset map back to blank state (no pins, default center/zoom)
    setVisibleVendors([]);
    setMapCenter([-96, 38]);
    setMapZoom(4);
    setClaimedNeighborCount(0);
  }

  return (
    <>
    <section
      id="see-yourself"
      className="border-b border-ink-100 bg-white"
    >
      <div className="mx-auto max-w-6xl px-6 pt-2 pb-12 sm:pt-3 sm:pb-14">
        {/* While the journey modal is open (claim through done) the whole
            search + map + panel grid is HIDDEN (kept mounted so Leaflet isn't
            torn down); the popped-up JourneyModal renders the flow instead. */}
        <div
          className={
            step === "claim" ||
            step === "corridor" ||
            step === "configurator" ||
            step === "waitlist" ||
            step === "done"
              ? "hidden"
              : ""
          }
        >
        {/* Two-column layout (2026-05-29): LEFT = search box + map stacked;
            RIGHT = detail panel, top-aligned with the search bar so the
            "We found you" panel sits level with the search input rather than
            starting below the map. */}
        {trSuccessBanner && (
          <div className="fixed inset-x-0 top-0 z-[2000] flex justify-center px-4 pt-4">
            <div className="flex max-w-xl items-start gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 shadow-lg">
              <span className="mt-0.5 font-bold text-emerald-600" aria-hidden="true">
                ✓
              </span>
              <div className="text-sm text-emerald-900">
                <p className="font-semibold">
                  You&apos;re in - your Tuesday Report is on the way.
                </p>
                <p className="mt-0.5 text-emerald-800">
                  Your first edition covers your corridor. Cancel anytime from
                  the link in any edition.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTrSuccessBanner(false)}
                className="ml-2 text-lg leading-none text-emerald-700 hover:text-emerald-900"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <div
          className={`grid gap-6 lg:grid-cols-[1.7fr_1fr] items-start${
            step === "found-real" ? " lg:items-stretch" : ""
          }`}
        >
          {/* LEFT COLUMN - search box on top, map below it */}
          <div>
        {/* Search box - the single, prominent entry point. Merged with the
            former hero "Find and claim your listing" button (removed
            2026-05-28): that button only scrolled down to this bar, which
            was redundant. The search bar carries the CTA verb itself now
            and flows straight out of the hero above. */}
        <div className="relative max-w-2xl">
          <label
            htmlFor="vendor-search"
            className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600 mb-2"
          >
            Find, claim, or edit your listing
          </label>
          <div className="relative">
            <span
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400"
              aria-hidden="true"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <input
              id="vendor-search"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Start typing your business name..."
              className="w-full rounded-xl border-[1.5px] border-ink-200 bg-white pl-12 pr-4 py-4 text-base text-ink-900 shadow-sm shadow-ink-900/5 focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-200/60 transition-shadow"
            />
          </div>
          {/* Search dropdown - instant, client-side filter against the
              loaded vendor index. No backend names exposed to the user. */}
          {indexError && (
            <p className="mt-2 text-xs text-red-700">{indexError}</p>
          )}
          {searchOpen && indexLoading && (
            <div className="absolute z-[1100] mt-1 w-full rounded-md border border-ink-200 bg-white shadow-lg p-4">
              <p className="text-sm text-ink-500">Loading vendor index...</p>
            </div>
          )}
          {searchOpen && !indexLoading && searchResults.length > 0 && (
            <div className="absolute z-[1100] mt-1 w-full rounded-md border border-ink-200 bg-white shadow-lg max-h-72 overflow-auto">
              {searchResults.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => handleSelectRealVendor(v)}
                  className="w-full text-left px-4 py-2.5 hover:bg-brand-50 border-b border-ink-100 last:border-b-0 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-ink-900 truncate">
                      {v.name}
                    </div>
                    <div className="text-xs text-ink-500 truncate">
                      {v.city ? `${v.city}, ${v.state}` : v.state}
                    </div>
                  </div>
                  <span
                    className="shrink-0 inline-block h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: STATUS_COLORS[safeStatus(v.status)],
                    }}
                    aria-label={STATUS_LABELS[safeStatus(v.status)]}
                  />
                </button>
              ))}
            </div>
          )}
          {searchOpen &&
            !indexLoading &&
            searchQuery.trim().length >= 2 &&
            searchResults.length === 0 && (
              <div className="absolute z-[1100] mt-1 w-full rounded-md border border-ink-200 bg-white shadow-lg p-4">
                <p className="text-sm text-ink-700">
                  No match for{" "}
                  <span className="font-semibold text-ink-900">
                    &ldquo;{searchQuery.trim()}&rdquo;
                  </span>
                  . Not on the map yet? Add it - takes seconds.
                </p>
                <button
                  type="button"
                  onClick={handleStartSelfAdd}
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
                >
                  Add my business
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            )}

          {/* Already-claimed entry point (2026-06-01). A returning vendor
              who claimed previously can request a magic link to edit their
              listing without re-searching. */}
          <p className="mt-3 text-xs text-ink-500">
            Already claimed your listing?{" "}
            <button
              type="button"
              onClick={handleOpenEmailEntry}
              className="font-semibold text-brand-600 hover:text-brand-700 underline underline-offset-2"
            >
              Edit your listing
            </button>
            .
          </p>

          {/* Invalid / expired magic-link banner (2026-06-01). Shown when
              the page mounted with ?edit=<token> but verify failed. Calm
              message + the email-entry CTA is one click away. */}
          {editLinkError && !emailEntryOpen && (
            <div
              role="alert"
              className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              <p className="font-semibold">{editLinkError}</p>
              <button
                type="button"
                onClick={handleOpenEmailEntry}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-900"
              >
                Request a new edit link
                <span aria-hidden="true">→</span>
              </button>
            </div>
          )}

          {/* Inline email-entry panel for the magic-link request. Stays
              visible after submit with the neutral server message so the
              vendor knows the request landed even if no email exists on a
              claimed listing (anti-fishing). */}
          {emailEntryOpen && (
            <div className="mt-3 rounded-xl border border-ink-200 bg-ink-50/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">
                    Edit your listing
                  </p>
                  <p className="mt-1 text-xs text-ink-600 leading-relaxed">
                    Enter the email on your claimed listing and we&apos;ll send
                    a one-time link. The link works once and expires in 30
                    minutes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDismissEmailEntry}
                  aria-label="Close email entry"
                  className="text-ink-400 hover:text-ink-600 text-lg leading-none"
                >
                  ×
                </button>
              </div>
              {emailEntryStatus?.sent ? (
                <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                  {emailEntryStatus.message}
                  <span className="mt-1 block text-xs text-emerald-800">
                    It can take a minute - check your spam or junk folder if
                    it&apos;s not in your inbox.
                  </span>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmitEmailEntry}
                  className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch"
                >
                  <input
                    type="email"
                    autoComplete="email"
                    value={emailEntryValue}
                    onChange={(e) => setEmailEntryValue(e.target.value)}
                    placeholder="you@yourcompany.com"
                    aria-label="Email on your claimed listing"
                    className="flex-1 rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200/60"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
                  >
                    Send link
                  </button>
                </form>
              )}
              {emailEntryStatus && !emailEntryStatus.sent && (
                <p className="mt-2 text-xs text-amber-800">
                  {emailEntryStatus.message}
                </p>
              )}
            </div>
          )}
        </div>

            {/* Map - Leaflet, ported from the real network-site rendering
                (see-your-network-enterprise/index.html). CARTO light tiles,
                divIcon dots with radial-gradient backgrounds + per-tier
                sizing, enhanced pins pulse via globals.css keyframes. Sits
                below the search bar in the left column. */}
            <div className="mt-8 rounded-xl border border-ink-200 bg-ink-50/30 overflow-hidden">
            <div className="relative w-full aspect-[5/4] sm:aspect-[3/2] lg:aspect-[8/7]">
              {/* Ambient-state hero (2026-06-02). Rendered over the dense
                  gray vendor-network backdrop in the pre-search browsing
                  state. Confident, forward-looking: the words carry the
                  "be early" feeling; the dense backdrop carries the
                  "the network is serious / national" feeling. Together
                  they read as "I'm early to a real thing, I want in,"
                  not "the network is empty, why bother."
                  No counts shown on purpose -- surfacing the small
                  claimed number undercuts the messaging.
                  z-[1000] sits above Leaflet's tile pane (z-200) and
                  control pane (z-800); the search dropdown at z-[1100]
                  still wins when the user starts typing, as intended. */}
              {step === "browsing" && visibleVendors.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1000] px-4">
                  <div className="bg-white/95 rounded-xl border border-ink-200 shadow-md px-7 py-6 max-w-md text-center">
                    <p className="text-xl font-bold text-ink-900 leading-tight">
                      You&apos;re already on the map.
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-ink-700">
                      Every dot is a real pallet vendor we&apos;ve mapped. Type
                      your business name above to find your listing.
                    </p>
                  </div>
                </div>
              )}
              <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
            </div>

            {/* Legend - a plain color key. Counts were removed 2026-05-28:
                near a single vendor the live numbers ("Claimed 1, Enhanced 0")
                made the network look empty and undercut the value, and the
                prototype index is only partial anyway. */}
            <div className="border-t border-ink-200 bg-white px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-ink-700">
              <span className="font-semibold uppercase tracking-wider text-ink-500">
                Legend:
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS.listed }}
                />
                Listed
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS.claimed }}
                />
                Claimed
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS.enhanced }}
                />
                Enhanced
              </span>
              <span className="ml-auto text-[10px] text-ink-400 uppercase tracking-wider">
                {ambientMode
                  ? "Every dot is a mapped vendor"
                  : visibleVendors.length === 0
                    ? "Search above to reveal pins"
                    : selectedReal
                      ? `Showing neighbors in ${selectedReal.state}`
                      : "Sample data"}
              </span>
            </div>
          </div>

          </div>{/* /LEFT COLUMN */}

          {/* RIGHT COLUMN - detail panel, top-aligned with the search bar.
              Swaps content based on flow step. */}
          <div
            className={`rounded-xl border border-ink-200 bg-white min-h-[400px]${
              step === "found-real" ? " lg:relative lg:min-h-0" : ""
            }`}
          >
            <div
              className={
                step === "found-real"
                  ? "p-6 lg:absolute lg:inset-0 lg:flex lg:flex-col lg:overflow-hidden"
                  : "p-6"
              }
            >
            <DetailPanel
              step={step}
              vendor={selected}
              vendorReal={selectedReal}
              claimedNeighborCount={claimedNeighborCount}
              claimData={claimData}
              setClaimData={setClaimData}
              enrich={enrich}
              setEnrich={setEnrich}
              selfAdd={selfAdd}
              setSelfAdd={setSelfAdd}
              onSelfAddSubmit={handleSelfAddSubmit}
              config={config}
              setConfig={setConfig}
              joinedWaitlist={joinedWaitlist}
              psciValue={psciValue}
              psciAsOf={psciAsOf}
              psciWowPct={psciWowPct}
              onStartClaim={handleStartClaim}
              onStartEdit={handleOpenEmailEntry}
              onClaimSubmit={handleClaimSubmit}
              onCorridorConfirm={handleCorridorConfirm}
              onConfiguratorContinue={handleConfiguratorContinue}
              onJoinWaitlist={handleJoinWaitlist}
              onSkipWaitlist={handleSkipWaitlist}
              onReset={resetJourney}
              onBackToCard={() => setStep("card")}
              onBackToClaim={() => setStep("claim")}
              onBackToCorridor={() => setStep("corridor")}
              onBackToConfigurator={() => setStep("configurator")}
            />
            </div>
          </div>
        </div>
        </div>{/* /claim-hide wrapper */}

        {/* JOURNEY MODAL - one continuous popped-up box for the whole claim
            journey (claim -> corridor -> what matters -> waitlist -> done).
            Before 2026-05-29 only the claim step lived in the modal and the
            corridor/configurator/waitlist steps dumped back to the page panel,
            which broke the flow. Now the box stays up the whole way: the live
            card + map persist on the left through the form steps, and the
            waitlist payoff goes full-width inside the same box, so momentum
            carries straight into the Tuesday Report offer. */}
        {(step === "claim" ||
          step === "corridor" ||
          step === "configurator" ||
          step === "waitlist" ||
          step === "done") && (
          <JourneyModal
            step={step}
            displayName={vendorDisplayName(selected, selectedReal)}
            displayLocation={vendorDisplayLocation(selected, selectedReal)}
            city={selected?.city || selectedReal?.city || ""}
            lat={selected?.lat ?? selectedReal?.lat ?? 39.5}
            lng={selected?.lng ?? selectedReal?.lng ?? -98.35}
            data={claimData}
            setData={setClaimData}
            enrich={enrich}
            setEnrich={setEnrich}
            config={config}
            setConfig={setConfig}
            zipFallback={selectedReal ? `state-level (${selectedReal.state})` : ""}
            corridorLabel={
              vendorDisplayLocation(selected, selectedReal) ||
              selected?.state ||
              selectedReal?.state ||
              "your corridor"
            }
            stateCode={selected?.state || selectedReal?.state || ""}
            claimEmail={claimData.email}
            psciValue={psciValue}
            psciAsOf={psciAsOf}
            psciWowPct={psciWowPct}
            psciComponents={psciComponents}
            psciForecast={psciForecast}
            joinedWaitlist={joinedWaitlist}
            isEditMode={editMode !== null}
            editLocations={editLocations}
            activeLocationIdx={activeLocationIdx}
            onSwitchLocation={handleSwitchLocation}
            savedLocationLabel={savedLocationLabel}
            showMultiSaveConfirm={showMultiSaveConfirm}
            onEditAnotherLocation={() => setShowMultiSaveConfirm(false)}
            onGoToTuesdayReport={() => {
              if (typeof window === "undefined") return;
              // Carry the corridor + vendor of the location they just saved so
              // /tuesday-report can acknowledge it (and tie the reservation to
              // it once the product is live), instead of a generic landing.
              const loc = editLocations[activeLocationIdx];
              const corridor =
                [loc?.city, loc?.state].filter(Boolean).join(", ") || "";
              const params = new URLSearchParams({ from: "edit" });
              if (corridor) params.set("corridor", corridor);
              if (editMode?.recordId) params.set("vendor", editMode.recordId);
              window.location.assign(`/tuesday-report?${params.toString()}`);
            }}
            submitting={claimSubmitting}
            offerMode={TR_OFFER_MODE}
            offerEligible={
              editMode
                ? !editMode.initial.tuesdayReportSubscribed &&
                  !editMode.initial.tuesdayReportReserved &&
                  !editMode.initial.tuesdayReportSeen
                : true
            }
            alreadyReserved={
              trReserveDone ||
              (editMode ? editMode.initial.tuesdayReportReserved : false)
            }
            subscribed={editMode ? editMode.initial.tuesdayReportSubscribed : false}
            trReserving={trReserving}
            trReserveDone={trReserveDone}
            checkoutBusy={checkoutBusy}
            onReserveTuesdayReport={handleReserveTuesdayReport}
            onStartTuesdayCheckout={handleStartTuesdayCheckout}
            onTuesdayReportSeen={handleTuesdayReportSeen}
            onClaimSubmit={handleClaimSubmit}
            onCorridorConfirm={handleCorridorConfirm}
            onConfiguratorContinue={handleConfiguratorContinue}
            onJoinWaitlist={handleJoinWaitlist}
            onSkipWaitlist={handleSkipWaitlist}
            onBackToClaim={() => setStep("claim")}
            onClose={() => {
              // In edit mode, closing the modal exits the edit session
              // entirely (clear ?edit= from URL, drop editMode state)
              // and returns to the search-blank state, so a refresh does
              // not re-open the form on a used / partially-edited token.
              if (editMode) {
                setEditMode(null);
                if (typeof window !== "undefined") {
                  const url = new URL(window.location.href);
                  url.searchParams.delete("edit");
                  window.history.replaceState({}, "", url.toString());
                }
                setStep("browsing");
                setSelectedReal(null);
              } else {
                setStep(selectedReal ? "found-real" : "browsing");
              }
            }}
          />
        )}
      </div>
    </section>

    {/* The post-claim Tuesday Report pitch used to live here as a big
        separate scroll section. It was folded into the claim wizard's
        final step (WaitlistView) 2026-05-28 so the journey is self-
        contained - the vendor never has to scroll to be pitched. The
        corridor sample + offer is now the climax of the in-panel flow. */}

    {/* STICKY LISTING-STATUS CHIP (added 2026-05-28).
        Mirrors the Atlas+ price chip - a persistent progress affordance
        that follows the vendor through the claim sub-flow. Shows status
        only - "Listed" then "Claimed" - never a completion percentage, so a
        vendor who legitimately doesn't offer every service never reads as
        "incomplete." Only
        shows once the vendor is actually claiming (claim/corridor/
        configurator/waitlist); hidden while browsing or once done so it
        never competes with the confirmation panel. Clicking scrolls
        back to the configurator. */}
    {(step === "claim" ||
      step === "corridor" ||
      step === "configurator" ||
      step === "waitlist") && (
      <a
        href="#see-yourself"
        className="group fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-full bg-ink-900 px-5 py-3 text-white shadow-xl shadow-ink-900/30 hover:bg-ink-800 transition-colors border border-ink-700 max-w-[calc(100vw-3rem)]"
        aria-label={`Your listing is ${ownClaimed ? "claimed" : "listed"}`}
      >
        <div className="flex flex-col leading-tight min-w-0">
          <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-brand-300">
            Your listing
          </span>
          <span className="text-xs font-semibold truncate">
            {ownClaimed ? (
              <span className="text-emerald-400">Claimed</span>
            ) : (
              <span className="text-brand-300">Listed</span>
            )}
          </span>
        </div>
        <span
          aria-hidden="true"
          className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-white text-base font-bold transition-transform group-hover:translate-x-0.5"
        >
          →
        </span>
      </a>
    )}
    </>
  );
}

// PostClaimSection was removed 2026-05-28. Its rich corridor sample +
// Tuesday Report offer were folded into the claim wizard's final step
// (WaitlistView) so the journey is self-contained. The
// getSampleEventForState helper it used lives above and is now consumed
// by WaitlistView.

// === DETAIL PANEL ===
//
// Right-side panel that swaps content based on which flow step the user
// is in. Lives in a fixed-position panel beside the map.

interface DetailPanelProps {
  step: FlowStep;
  vendor: MockVendor | null;
  vendorReal: VendorIndexEntry | null;
  claimedNeighborCount: number;
  claimData: ClaimFormData;
  setClaimData: (d: ClaimFormData) => void;
  enrich: ClaimEnrichment;
  setEnrich: (e: ClaimEnrichment) => void;
  selfAdd: SelfAddData;
  setSelfAdd: (d: SelfAddData) => void;
  onSelfAddSubmit: () => void;
  config: ConfiguratorData;
  setConfig: (c: ConfiguratorData) => void;
  joinedWaitlist: boolean;
  // PSCI snapshot - threaded to the waitlist step so its corridor sample
  // can show the real current value (no invented numbers).
  psciValue?: number;
  psciAsOf?: string;
  psciWowPct?: number | null;
  onStartClaim: () => void;
  // Returning-vendor edit flow (2026-06-01). Opens the email-entry panel
  // that issues a magic-link via vendor-edit-request.
  onStartEdit: () => void;
  onClaimSubmit: () => void;
  onCorridorConfirm: () => void;
  onConfiguratorContinue: () => void;
  onJoinWaitlist: () => void;
  onSkipWaitlist: () => void;
  onReset: () => void;
  onBackToCard: () => void;
  onBackToClaim: () => void;
  onBackToCorridor: () => void;
  onBackToConfigurator: () => void;
}

// Helper to get a display name for the current vendor (mock or index)
// for use in shared sub-views (corridor / waitlist / done) that work
// for either flow.
function vendorDisplayName(
  mock: MockVendor | null,
  real: VendorIndexEntry | null
): string {
  if (mock) return mock.name;
  if (real) return real.name;
  return "your business";
}

function vendorDisplayLocation(
  mock: MockVendor | null,
  real: VendorIndexEntry | null
): string {
  if (mock) return `${mock.city}, ${mock.state} ${mock.zip}`.trim();
  if (real) {
    const parts = [real.city, real.state].filter(Boolean);
    return parts.join(", ");
  }
  return "";
}

function DetailPanel(props: DetailPanelProps) {
  const { step, vendor, vendorReal } = props;

  if (step === "browsing") {
    return <BrowsingPanel />;
  }
  if (step === "found-real" && vendorReal) {
    return (
      <FoundRealView
        vendor={vendorReal}
        onStartClaim={props.onStartClaim}
      />
    );
  }
  if (step === "self-add") {
    return (
      <SelfAddView
        data={props.selfAdd}
        setData={props.setSelfAdd}
        onSubmit={props.onSelfAddSubmit}
        onBack={props.onReset}
      />
    );
  }
  if (step === "card" && vendor) {
    return <PublicCardView vendor={vendor} onStartClaim={props.onStartClaim} />;
  }
  // claim / corridor / configurator / waitlist / done all render inside the
  // popped-up JourneyModal now (2026-05-29), and the page grid is hidden for
  // those steps - so the detail panel shows nothing for any of them. Kept as
  // an explicit guard so a stale step never falls through to BrowsingPanel.
  if (
    step === "claim" ||
    step === "corridor" ||
    step === "configurator" ||
    step === "waitlist" ||
    step === "done"
  ) {
    return null;
  }
  return <BrowsingPanel />;
}

// === SUB-VIEWS ===

// BrowsingPanel - the default (pre-search) state of the detail panel.
// Renders the canonical SAMPLE claimed-listing card via the shared
// VendorPublicCard component -- same code path the /find-a-vendor right-rail
// card uses, so the SAMPLE and the real cards can't drift visually.
function BrowsingPanel() {
  const sample: VendorPublicEntry = {
    id: "sample",
    name: "Sample Pallet Co",
    city: "Lancaster",
    state: "PA",
    lat: 40.0379,
    lng: -76.3055,
    status: "claimed",
    // Founding Member badge retired with the paid cohort (2026-06-03
    // reposition). Sample shows the Claimed badge only.
    foundingMember: false,
    classification: ["Pallet Recycler", "Pallet Manufacturer"],
    services: ["Pallet Repair / Reconditioning", "Custom / Specialty Fabrication"],
    palletTypes: ["GMA Stringer (48x40)", "Block Pallets"],
    treatments: ["Heat Treated (HT)", "ISPM-15 Certified"],
    serviceRadiusMi: 75,
    hoursOpen: "7am",
    hoursClose: "5pm",
    daysOpen: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  };
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200 shadow-xl shadow-ink-900/10 ring-1 ring-ink-900/5">
      {/* Amber sample bar -- sample-only chrome that wraps the shared
          card. Same caution treatment as the Atlas sample edition. */}
      <div className="bg-amber-400 px-4 py-2 flex items-center gap-2 border-b-2 border-amber-500">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-amber-900 shrink-0"
          aria-hidden="true"
        >
          <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-900">
          Sample - what a claimed listing looks like
        </span>
      </div>

      <VendorPublicCard
        vendor={sample}
        footerSlot={
          <div className="border-t border-ink-100 bg-white px-5 py-3 flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
              Contact
            </p>
            <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
              Reveal contact info <span aria-hidden="true">→</span>
            </div>
          </div>
        }
      />

      {/* Sample-only call-to-find footer. */}
      <div className="bg-emerald-50/70 border-t border-emerald-200 px-5 py-2.5">
        <p className="text-[11px] text-emerald-800 font-medium leading-snug">
          This is a sample. Search above to find your real listing - free,
          60 seconds.
        </p>
      </div>
    </div>
  );
}

// SelfAddView - the quick "add your business" form for vendors not yet in
// the index. Minimal fields (name + city + state + classification); on
// submit we place them at the state centroid and route straight into the
// claim wizard. Everything else is captured on the intro call. The real
// Airtable record is created server-side at claim submit (task #52).
function SelfAddView({
  data,
  setData,
  onSubmit,
  onBack,
}: {
  data: SelfAddData;
  setData: (d: SelfAddData) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const canSubmit = Boolean(data.name.trim() && data.state.trim());
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">
        Add your business
      </p>
      <h3 className="mt-3 text-lg font-semibold text-ink-900">
        Not on the map yet? Add it in seconds.
      </h3>
      <p className="mt-2 text-xs leading-relaxed text-ink-600">
        Give us the basics - we&apos;ll put you on the map and walk you
        straight into claiming it. The full profile we capture on the
        intro call.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="mt-5 space-y-4"
      >
        <FormField
          id="sa-name"
          label="Business name"
          required
          value={data.name}
          onChange={(v) => setData({ ...data, name: v })}
        />
        <FormField
          id="sa-city"
          label="City"
          value={data.city}
          onChange={(v) => setData({ ...data, city: v })}
        />
        <FormField
          id="sa-state"
          label="State (2-letter, e.g. PA)"
          required
          value={data.state}
          onChange={(v) => setData({ ...data, state: v })}
        />
        <div>
          <label
            htmlFor="sa-class"
            className="block text-[10px] font-semibold uppercase tracking-wider text-ink-500 mb-1.5"
          >
            Classification
          </label>
          <select
            id="sa-class"
            value={data.classification}
            onChange={(e) =>
              setData({ ...data, classification: e.target.value })
            }
            className="w-full rounded-lg border-[1.5px] border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 shadow-sm shadow-ink-900/5 focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-200/50 transition-shadow"
          >
            <option value="">Choose one...</option>
            {CLASSIFICATIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-semibold text-ink-500 hover:text-ink-700"
          >
            ← Back
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            Add and claim →
          </button>
        </div>
      </form>
    </div>
  );
}

// BareListingCard - the vendor's CURRENT public-records listing exactly as
// buyers see it today: bare, mostly "Not specified." Shown in the found
// view as the frame of reference - the "before" that claiming transforms.
function BareListingCard({
  name,
  location,
}: {
  name: string;
  location: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-ink-200 bg-white">
      <div className="border-b border-ink-100 px-4 pt-3.5 pb-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: STATUS_COLORS.listed }}
          />
          Listed - public records
        </span>
        <h4 className="mt-2.5 text-base font-semibold leading-snug text-ink-900">
          {name}
        </h4>
        <p className="mt-0.5 text-xs text-ink-500">{location}</p>
      </div>
      <div className="px-4 py-3 space-y-2.5 text-xs">
        <CardField label="Classification" value="From public records" />
        <CardField label="Services" value={null} />
        <CardField label="Pallet types" value={null} />
        <CardField label="Treatments" value={null} />
        <CardField label="Service area" value={null} />
        <CardField label="Hours" value={null} />
        <CardField
          label="Contact"
          value={null}
          placeholder="Public-records phone only"
        />
      </div>
      <div className="border-t border-ink-100 bg-ink-50/60 px-4 py-2.5">
        <p className="text-[10px] leading-relaxed text-ink-500">
          Every blank is a reason a buyer scrolls past. Claiming fills them
          in - you&apos;ll watch it happen on the next screen.
        </p>
      </div>
    </div>
  );
}

// ClaimedListingCard was retired 2026-05-31. Its job is now done by the
// shared components/VendorPublicCard component used on BOTH /vendors and
// /find-a-vendor. The FoundRealView claimed branch above renders that
// component directly. Single source of card visuals -- the prior dual
// design was exactly the divergence the brief called out.

// FoundRealView - shown after the vendor selects their business from
// the search dropdown. Shows their basics + status. Per the vendor-only
// page rule, neighbor pins on the map are non-clickable context dots -
// only this vendor's own pin opens this card. "Claim this listing" CTA
// drops them into the same claim wizard used by mock pins.
function FoundRealView({
  vendor,
  onStartClaim,
}: {
  vendor: VendorIndexEntry;
  onStartClaim: () => void;
}) {
  // Null-safe everywhere - real records can have blank fields.
  const status = safeStatus(vendor.status);
  const isUnclaimed = status === "listed";
  const displayName = vendor.name || "Unnamed listing";
  const locationParts = [vendor.city, vendor.state].filter(Boolean);
  const displayAddress =
    locationParts.join(", ") || "Location not on file";

  // Control / value framing (replaced the corridor-density copy 2026-05-28).
  // This page is about controlling your own listing, not competing on how
  // crowded the corridor is.
  //
  // 2026-05-29 reorder: the bare card LEADS as the buyer's-eye reveal -
  // "this is the card a buyer pulls up when they click your dot." The
  // listing the vendor sees is exactly what a buyer sees today. The
  // Claim CTA follows the card (off the map, clearly visible) as the
  // "take control of this" action, instead of the bare card sitting
  // buried under the button.
  const adaptiveBody =
    "That is the card a buyer pulls up when they click your dot on the network - built from public records only, so most of it is blank. Claim it (free, about 20 seconds) and you control every line: your services, capabilities, hours, and how a buyer reaches you.";
  const adaptiveStakes =
    "An unclaimed listing reads like an unverified record. A claimed one looks ready to do business.";

  // Inline edit-email box (2026-06-02). "Edit your listing" reveals an email
  // field IN the card; the vendor enters the email they claimed with and we
  // send a one-time magic link (vendor-edit-request) that reopens /vendors in
  // edit mode. Self-contained here so it doesn't collide with the secondary
  // "Already claimed?" entry near the search box.
  const [editEmailOpen, setEditEmailOpen] = useState(false);
  const [editEmail, setEditEmail] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editStatus, setEditStatus] = useState<{
    sent: boolean;
    message: string;
  } | null>(null);

  async function submitEditEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = editEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEditStatus({ sent: false, message: "Enter a valid email address." });
      return;
    }
    setEditSubmitting(true);
    const result = await requestEditLink(value);
    setEditSubmitting(false);
    setEditStatus({ sent: result.ok, message: result.message || "" });
  }

  return (
    <div className="lg:flex lg:flex-1 lg:min-h-0 lg:flex-col">
      {/* HEADER - fixed; name + status stay visible while the card body
          scrolls under them at lg (so the Edit/Claim button can pin to the
          bottom of the panel, level with the bottom of the map). */}
      <div className="lg:shrink-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
          We found you on the network
        </p>
        <h3 className="mt-3 text-lg font-semibold text-ink-900 leading-snug">
          {displayName}
        </h3>
        <p className="mt-1 text-xs text-ink-500">{displayAddress}</p>
        <div className="mt-4">
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Adaptive block - only for unclaimed vendors (the conversion
          target). Claimed/Enhanced vendors get a different message
          at the bottom. */}
      {isUnclaimed && (
        <>
          {/* SCROLL BODY - grows to fill, scrolls at lg if it overflows. */}
          <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
            {/* Buyer's-eye reveal FIRST. This is the card framed exactly
                as a buyer experiences it when they select the dot. */}
            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500">
              What a buyer sees when they select your dot
            </p>
            <div className="mt-2">
              <BareListingCard name={displayName} location={displayAddress} />
            </div>

            {/* The take-control action, off the map, directly under the
                card it acts on. */}
            <p className="mt-5 text-sm leading-relaxed text-ink-700">
              {adaptiveBody}
            </p>
          </div>
          {/* PINNED FOOTER - sits at the bottom of the panel, level with
              the bottom of the map. */}
          <div className="lg:shrink-0 lg:pt-4">
            <button
              type="button"
              onClick={onStartClaim}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-bold text-white shadow-md shadow-brand-500/30 transition-all hover:scale-[1.01] hover:bg-brand-600 lg:mt-0"
            >
              Claim this listing
              <span aria-hidden="true">→</span>
            </button>
            <p className="mt-2 text-center text-[11px] text-ink-500">
              Free · about 20 seconds · no sales call
            </p>
            <p className="mt-4 border-l-2 border-brand-500 pl-3 text-sm leading-relaxed italic text-brand-800">
              {adaptiveStakes}
            </p>
          </div>
        </>
      )}

      {!isUnclaimed && (
        <>
          {/* SCROLL BODY - the buyer card + scorecard scroll; the Edit
              button below stays pinned to the bottom of the panel. */}
          <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500">
              What a buyer sees when they select your dot
            </p>
            <div className="mt-2 overflow-hidden rounded-xl border border-ink-200 bg-white">
              {/* Shared VendorPublicCard -- identical render path the
                  buyer side uses on /find-a-vendor. The card above IS the
                  "what we have on file" view (long dimensions collapse
                  behind a caret), so the separate scorecard was removed
                  2026-06-02 as redundant. */}
              <VendorPublicCard vendor={vendor} />
            </div>
          </div>
          {/* PINNED FOOTER - level with the bottom of the map.
              "Edit your listing" reveals an inline email box. The vendor
              enters the email they CLAIMED with; we send a one-time magic
              link (vendor-edit-request) that reopens /vendors?edit=<token>
              and drops them into the claim wizard in edit mode. (2026-06-02) */}
          <div className="lg:shrink-0 lg:pt-4">
            {!editEmailOpen && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditEmailOpen(true);
                    setEditStatus(null);
                  }}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-bold text-white shadow-md shadow-brand-500/30 transition-all hover:scale-[1.01] hover:bg-brand-600 lg:mt-0"
                >
                  Edit your listing
                  <span aria-hidden="true">→</span>
                </button>
                <p className="mt-2 text-center text-[11px] text-ink-500">
                  One-time email link · about 20 seconds
                </p>
              </>
            )}

            {editEmailOpen && editStatus?.sent && (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900 lg:mt-0">
                {editStatus.message}
                <span className="mt-1 block text-xs text-emerald-800">
                  It can take a minute - check your spam or junk folder if
                  it&apos;s not in your inbox.
                </span>
              </div>
            )}

            {editEmailOpen && !editStatus?.sent && (
              <form onSubmit={submitEditEmail} className="mt-4 lg:mt-0">
                <p className="text-xs leading-relaxed text-ink-600">
                  Enter the email you used to claim this listing. We&apos;ll
                  send a one-time link - it opens your listing in edit mode and
                  expires in 30 minutes.
                </p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="email"
                    autoComplete="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="you@yourcompany.com"
                    aria-label="Email you used to claim this listing"
                    className="flex-1 rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200/60"
                  />
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    {editSubmitting ? "Sending..." : "Send link"}
                  </button>
                </div>
                {editSubmitting && (
                  <div className="mt-2">
                    <SubmitBar active />
                  </div>
                )}
                {editStatus && !editStatus.sent && (
                  <p className="mt-2 text-xs text-amber-800">
                    {editStatus.message}
                  </p>
                )}
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// === CLAIMED SCORECARD =====================================================
// Lists the fields we hold for a Claimed vendor + flags blanks as
// "complete these." Mirrors the grayed-field treatment from the unclaimed
// card ("every blank is a reason a buyer scrolls past") so the vendor
// reads the gaps as actionable, not just neutral state. Reused as the
// "what you can edit" preview above the Edit button on the FoundRealView
// claimed branch.

function ClaimedScorecard({ vendor }: { vendor: VendorIndexEntry }) {
  type Row = {
    label: string;
    value: string;
    filled: boolean;
  };
  const fmtArr = (arr: string[] | undefined): string =>
    arr && arr.length ? arr.join(", ") : "";
  const fmtHours = (
    open: string | null | undefined,
    close: string | null | undefined
  ): string => {
    if (open && close) return `${open} - ${close}`;
    if (open || close) return open || close || "";
    return "";
  };
  const fmtRadius = (mi: number | null | undefined): string =>
    mi && mi > 0 ? `${mi} mi` : "";

  const rows: Row[] = [
    {
      label: "Classification",
      value: fmtArr(vendor.classification),
      filled: !!(vendor.classification && vendor.classification.length),
    },
    {
      label: "Services",
      value: fmtArr(vendor.services),
      filled: !!(vendor.services && vendor.services.length),
    },
    {
      label: "Pallet types",
      value: fmtArr(vendor.palletTypes),
      filled: !!(vendor.palletTypes && vendor.palletTypes.length),
    },
    {
      label: "Treatments",
      value: fmtArr(vendor.treatments),
      filled: !!(vendor.treatments && vendor.treatments.length),
    },
    {
      label: "Service area",
      value: fmtRadius(vendor.serviceRadiusMi),
      filled: !!(vendor.serviceRadiusMi && vendor.serviceRadiusMi > 0),
    },
    {
      label: "Hours",
      value: fmtHours(vendor.hoursOpen, vendor.hoursClose),
      filled: !!(vendor.hoursOpen || vendor.hoursClose),
    },
    {
      label: "Days open",
      value: fmtArr(vendor.daysOpen),
      filled: !!(vendor.daysOpen && vendor.daysOpen.length),
    },
  ];
  const filledCount = rows.filter((r) => r.filled).length;
  const missingCount = rows.length - filledCount;

  return (
    <div className="mt-5 rounded-xl border border-ink-200 bg-white">
      <div className="border-b border-ink-100 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
          What we have on file
        </p>
        <p className="mt-1 text-xs text-ink-500">
          {missingCount === 0
            ? "Your full profile is complete -- every field is showing to buyers."
            : `${missingCount} of ${rows.length} fields ${missingCount === 1 ? "is" : "are"} blank. Every blank is a reason a buyer scrolls past.`}
        </p>
      </div>
      <ul className="divide-y divide-ink-100">
        {rows.map((r) => (
          <li
            key={r.label}
            className="flex items-start justify-between gap-3 px-4 py-2.5"
          >
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-500 shrink-0 w-28">
              {r.label}
            </span>
            {r.filled ? (
              <span className="text-sm text-ink-800 text-right break-words">
                {r.value}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                <span aria-hidden="true" className="text-amber-600">
                  +
                </span>
                Complete this
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusBadge({ status }: { status: VendorStatus | string | undefined }) {
  const safe = safeStatus(status);
  const color = STATUS_COLORS[safe];
  const label = STATUS_LABELS[safe];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
      style={{
        backgroundColor: `${color}20`,
        color,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

function PublicCardView({
  vendor,
  onStartClaim,
}: {
  vendor: MockVendor;
  onStartClaim: () => void;
}) {
  const isUnclaimed = vendor.status === "listed";
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <StatusBadge status={vendor.status} />
          <h3 className="mt-3 text-lg font-semibold text-ink-900 leading-snug">
            {vendor.name}
          </h3>
          <p className="mt-1 text-xs text-ink-500">
            {vendor.city}, {vendor.state} {vendor.zip}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3 text-sm">
        <CardRow label="Classification" value={vendor.classification} />
        <CardRow label="Service area" value={vendor.serviceRadius} />
        {!isUnclaimed && (
          <>
            <CardRow label="Hours" value={vendor.hours} />
            <CardRow
              label="Years in business"
              value={`${vendor.yearsInBusiness}`}
            />
          </>
        )}
      </div>

      {!isUnclaimed && vendor.capabilities.length > 0 && (
        <div className="mt-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
            Capabilities
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {vendor.capabilities.map((c) => (
              <span
                key={c}
                className="inline-block rounded-md bg-ink-100 px-2 py-1 text-[11px] text-ink-700"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {!isUnclaimed && vendor.treatments.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
            Treatments
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {vendor.treatments.map((t) => (
              <span
                key={t}
                className="inline-block rounded-md bg-ink-100 px-2 py-1 text-[11px] text-ink-700"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {!isUnclaimed && vendor.generalServices.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
            Services
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {vendor.generalServices.map((s) => (
              <span
                key={s}
                className="inline-block rounded-md bg-ink-100 px-2 py-1 text-[11px] text-ink-700"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {isUnclaimed && (
        <p className="mt-5 text-xs text-ink-500 leading-relaxed italic">
          This is the default listing pulled from public records. The
          vendor hasn&apos;t claimed it yet, so capabilities, hours, and
          services aren&apos;t set.
        </p>
      )}

      <div className="mt-6 pt-6 border-t border-ink-100">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500 mb-2">
          Contact
        </p>
        <p className="text-xs text-ink-600 leading-relaxed">
          Buyer reveals contact through Pick 3 on the Find a Vendor page.
          One reveal at a time, never a bulk list.
        </p>
      </div>

      {isUnclaimed && (
        <button
          type="button"
          onClick={onStartClaim}
          className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
        >
          Claim this listing
          <span aria-hidden="true">→</span>
        </button>
      )}
      {!isUnclaimed && (
        <p className="mt-6 text-xs text-ink-500 italic">
          This listing has already been claimed by the vendor.
        </p>
      )}
    </div>
  );
}

function CardRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-500 shrink-0">
        {label}
      </span>
      <span className="text-sm text-ink-800 text-right">{value}</span>
    </div>
  );
}

// === LIVE BUYER'S-VIEW CARD (added 2026-05-28) ===
// The coupled artifact. Renders the vendor's listing exactly as a buyer
// would see it, and updates live as the claim form is filled. Starts in
// the gray Listed state; once email + classification are entered it flips
// to the green Claimed-preview treatment. This is the build-up moment the
// flow was missing - the vendor watches their own card come alive instead
// of typing into a form that changes nothing visible.
//
// HONESTY: clearly labeled a PREVIEW that publishes after the intro call,
// so it is never mistaken for a live, published listing.
function LiveListingCard({
  displayName,
  displayLocation,
  data,
  enrich,
  claimed,
}: {
  displayName: string;
  displayLocation: string;
  data: ClaimFormData;
  enrich: ClaimEnrichment;
  claimed: boolean;
}) {
  // Does the card show any example fallbacks right now? (Drives the footer
  // note so the examples are always clearly labeled.)
  const showingExamples =
    data.classifications.length === 0 ||
    enrich.services.length === 0 ||
    enrich.palletTypes.length === 0 ||
    enrich.treatments.length === 0 ||
    !enrich.serviceRadius ||
    !enrich.hours;

  return (
    <div
      className={`rounded-xl bg-white overflow-hidden transition-all duration-300 ${
        claimed
          ? "border-2 border-emerald-400 shadow-sm shadow-emerald-500/10"
          : "border border-ink-200"
      }`}
    >
      {/* Header: status badge flips Listed -> Claimed preview */}
      <div className="px-4 pt-4 pb-3 border-b border-ink-100">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
              claimed
                ? "bg-emerald-50 text-emerald-700"
                : "bg-ink-100 text-ink-500"
            }`}
          >
            <span
              className="h-1.5 w-1.5 rounded-full transition-colors"
              style={{
                backgroundColor: claimed
                  ? STATUS_COLORS.claimed
                  : STATUS_COLORS.listed,
              }}
            />
            {claimed ? "Claimed - preview" : "Listed - public records"}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-600">
            Buyer&apos;s view
          </span>
        </div>
        <h4 className="mt-3 text-base font-semibold text-ink-900 leading-snug">
          {displayName}
        </h4>
        <p className="mt-0.5 text-xs text-ink-500">
          {displayLocation || "Location on file"}
        </p>
      </div>

      {/* Fields - real values once entered, otherwise muted EXAMPLE values
          so the listing looks rich and valuable with zero work. */}
      <div className="px-4 py-3 space-y-2.5 text-xs">
        <CardTagField
          label="Classification"
          tags={data.classifications}
          example={["Pallet Recycler"]}
        />
        <CardTagField
          label="Services"
          tags={enrich.services}
          example={EXAMPLE_SERVICES}
        />
        <CardTagField
          label="Pallet types"
          tags={enrich.palletTypes}
          example={EXAMPLE_PALLET_TYPES}
        />
        <CardTagField
          label="Treatments"
          tags={enrich.treatments}
          example={EXAMPLE_TREATMENTS}
        />
        <CardField
          label="Service area"
          value={enrich.serviceRadius}
          example="75 mi"
        />
        <CardField label="Hours" value={enrich.hours} example="7am-5pm" />
        <CardField
          label="Days open"
          value={enrich.days.length > 0 ? enrich.days.join(", ") : null}
          example="Mon-Fri"
        />
        <CardField
          label="Contact"
          value={data.email.trim() ? "Gated reveal enabled" : null}
          placeholder="Public-records phone only"
        />
      </div>

      <div className="px-4 py-2.5 bg-ink-50/60 border-t border-ink-100">
        <p className="text-[10px] leading-relaxed text-ink-500">
          {showingExamples
            ? "Grayed fields are examples of how a complete listing looks - we confirm yours on the call. Publishes after we connect."
            : "Preview only - your claimed listing publishes after the intro call."}
        </p>
      </div>
    </div>
  );
}

function CardField({
  label,
  value,
  example,
  placeholder = "Not specified",
}: {
  label: string;
  value: string | null;
  example?: string;
  placeholder?: string;
}) {
  const showExample = !value && Boolean(example);
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 shrink-0">
        {label}
      </span>
      <span
        className={`text-right font-medium transition-colors ${
          value ? "text-ink-800" : "text-ink-300 italic"
        }`}
      >
        {value || (showExample ? example : placeholder)}
      </span>
    </div>
  );
}

function CardTagField({
  label,
  tags,
  example = [],
}: {
  label: string;
  tags: string[];
  example?: string[];
}) {
  const showExample = tags.length === 0 && example.length > 0;
  const display = tags.length > 0 ? tags : showExample ? example : [];
  // Keep the card clean: show at most the first 2, collapse the rest into a
  // "+N more" caret so a long selection never floods the preview.
  const MAX_VISIBLE = 2;
  const shown = display.slice(0, MAX_VISIBLE);
  const extra = display.length - shown.length;
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 shrink-0">
        {label}
      </span>
      {display.length === 0 ? (
        <span className="text-right font-medium text-ink-300 italic">
          Not specified
        </span>
      ) : (
        <span className="inline-flex flex-wrap justify-end gap-1">
          {shown.map((t) => (
            <span
              key={t}
              className={
                showExample
                  ? "rounded bg-ink-50 px-1.5 py-0.5 text-[10px] font-medium italic text-ink-400"
                  : "rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700"
              }
            >
              {t}
            </span>
          ))}
          {extra > 0 && (
            <span className="rounded bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold text-ink-500">
              +{extra} more
            </span>
          )}
        </span>
      )}
    </div>
  );
}

// Small toggle-chip used for the optional enrichment selectors.
function EnrichChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
        active
          ? "border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-200"
          : "border-ink-200 bg-white text-ink-600 hover:border-brand-400 hover:bg-brand-50/40 cursor-pointer"
      }`}
    >
      {label}
    </button>
  );
}

// === SCROLLY CLAIM (added 2026-05-28) ===
// Apple / Tesla-style scrollytelling for the claim step: a pinned left
// visual that cross-fades through three stages as the right rail scrolls -
//   1. stylized map + strength ring   ("you're on the map")
//   2. the live buyer's-view listing card ("here's your listing")
//   3. a buyer search mock            ("this is how buyers find you")
// The right rail is the real interactive (ClaimFormView, minus its inline
// card). Active stage is driven by how far the section has scrolled (thirds),
// which is robust without fragile per-element observers. The pinned visual is
// desktop-only; mobile gets the live card inline above the form.
function ClaimRing({
  strength,
  claimed,
}: {
  strength: number;
  claimed: boolean;
}) {
  const r = 46;
  const circ = 2 * Math.PI * r;
  // Fills with listing completeness; full only when every required field is set
  // (certs/treatments excluded), so any vendor can reach a full ring.
  const offset = circ * (1 - Math.max(0, Math.min(100, strength)) / 100);
  const arc = claimed ? "#10b981" : "#49a5c1";
  const dot = claimed ? "#10b981" : "#8a9bae";
  return (
    <svg width="150" height="150" viewBox="0 0 150 150" aria-hidden="true">
      <circle cx="75" cy="75" r={r} fill="none" stroke="#ffffff" strokeWidth="12" />
      <circle cx="75" cy="75" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
      <circle
        cx="75"
        cy="75"
        r={r}
        fill="none"
        stroke={arc}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circ}
        transform="rotate(-90 75 75)"
        style={{
          strokeDashoffset: offset,
          transition: "stroke-dashoffset 0.6s ease, stroke 0.4s ease",
        }}
      />
      <circle
        cx="75"
        cy="75"
        r="20"
        fill={dot}
        stroke="#ffffff"
        strokeWidth="4"
        style={{ transition: "fill 0.4s ease" }}
      />
    </svg>
  );
}

// StaticTileMap - a real map of the vendor's location, built from CARTO
// raster tiles (same basemap as the live Leaflet map) without a Leaflet
// instance. Computes the slippy-tile grid for lat/lng at a fixed zoom and
// offsets the tile layer so the exact point sits dead-center, where the
// ClaimRing/pin is overlaid. No pan/zoom - it's a backdrop, not a tool.
function StaticTileMap({ lat, lng }: { lat: number; lng: number }) {
  const z = 11;
  const n = Math.pow(2, z);
  const safeLat = Number.isFinite(lat) ? lat : 39.5;
  const safeLng = Number.isFinite(lng) ? lng : -98.35;
  const x = ((safeLng + 180) / 360) * n;
  const latRad = (safeLat * Math.PI) / 180;
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  const xi0 = Math.floor(x);
  const yi0 = Math.floor(y);
  const px = (x - xi0) * 256;
  const py = (y - yi0) * 256;
  const R = 2; // 5x5 tile grid (1280px) - covers a 520px panel comfortably
  const tiles: { key: string; dx: number; dy: number; xi: number; yi: number }[] =
    [];
  for (let dy = -R; dy <= R; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      const yi = yi0 + dy;
      if (yi < 0 || yi >= n) continue;
      const xi = (((xi0 + dx) % n) + n) % n;
      tiles.push({ key: `${dx}_${dy}`, dx, dy, xi, yi });
    }
  }
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute"
        style={{
          left: `calc(50% - ${R * 256 + px}px)`,
          top: `calc(50% - ${R * 256 + py}px)`,
          width: `${(2 * R + 1) * 256}px`,
          height: `${(2 * R + 1) * 256}px`,
        }}
      >
        {tiles.map((t) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={t.key}
            src={`https://a.basemaps.cartocdn.com/light_all/${z}/${t.xi}/${t.yi}.png`}
            alt=""
            width={256}
            height={256}
            style={{
              position: "absolute",
              left: `${(t.dx + R) * 256}px`,
              top: `${(t.dy + R) * 256}px`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// JourneyModal - the WHOLE claim journey in one focused dialog over a
// dimmed page (claim -> corridor -> what matters -> waitlist -> done).
// Rebuilt 2026-05-29: previously only the claim step lived in the modal and
// the later steps fell back to the page panel, which broke the flow and
// killed momentum right before the Tuesday Report pitch. Now the box stays
// up the whole way.
//   - Form steps (claim / corridor / configurator): two columns - the
//     vendor's location (map + strength ring) and their live buyer's-view
//     card persist on the LEFT, filling in real time; the step content
//     (form / corridor confirm / what-matters) is on the RIGHT.
//   - Payoff steps (waitlist / done): full-width inside the same box so the
//     claimed reveal + Tuesday Report offer get room to land.
function JourneyModal({
  step,
  displayName,
  displayLocation,
  city,
  lat,
  lng,
  data,
  setData,
  enrich,
  setEnrich,
  config,
  setConfig,
  zipFallback,
  corridorLabel,
  stateCode,
  claimEmail,
  psciValue,
  psciAsOf,
  psciWowPct,
  psciComponents,
  psciForecast,
  joinedWaitlist,
  isEditMode = false,
  editLocations = [],
  activeLocationIdx = 0,
  onSwitchLocation,
  savedLocationLabel = null,
  showMultiSaveConfirm = false,
  onEditAnotherLocation,
  onGoToTuesdayReport,
  submitting = false,
  offerMode = "reserve",
  offerEligible = false,
  alreadyReserved = false,
  subscribed = false,
  trReserving = false,
  trReserveDone = false,
  checkoutBusy = false,
  onReserveTuesdayReport,
  onStartTuesdayCheckout,
  onTuesdayReportSeen,
  onClaimSubmit,
  onCorridorConfirm,
  onConfiguratorContinue,
  onJoinWaitlist,
  onSkipWaitlist,
  onBackToClaim,
  onClose,
}: {
  step: FlowStep;
  displayName: string;
  displayLocation: string;
  city: string;
  lat: number;
  lng: number;
  data: ClaimFormData;
  setData: (d: ClaimFormData) => void;
  enrich: ClaimEnrichment;
  setEnrich: (e: ClaimEnrichment) => void;
  config: ConfiguratorData;
  setConfig: (c: ConfiguratorData) => void;
  zipFallback: string;
  corridorLabel: string;
  stateCode: string;
  claimEmail: string;
  psciValue?: number;
  psciAsOf?: string;
  psciWowPct?: number | null;
  psciComponents?: ReadonlyArray<PsciComponentMover>;
  psciForecast?: PsciForecast | null;
  joinedWaitlist: boolean;
  // Edit-after-claim mode -- passed through to the claim form so its
  // heading, intro copy, and submit button label adapt. The form fields
  // themselves are unchanged.
  isEditMode?: boolean;
  // Multi-location tabs: every listing tied to the edit email, the active
  // index, and the switch handler. Length <= 1 hides the strip.
  editLocations?: EditorPrefill[];
  activeLocationIdx?: number;
  onSwitchLocation?: (idx: number) => void;
  savedLocationLabel?: string | null;
  showMultiSaveConfirm?: boolean;
  onEditAnotherLocation?: () => void;
  onGoToTuesdayReport?: () => void;
  // Indeterminate submit-bar state, threaded to the claim form CTA.
  submitting?: boolean;
  // Tuesday Report offer gate + state for the success panel.
  offerMode?: "reserve" | "checkout";
  offerEligible?: boolean;
  alreadyReserved?: boolean;
  subscribed?: boolean;
  trReserving?: boolean;
  trReserveDone?: boolean;
  checkoutBusy?: boolean;
  onReserveTuesdayReport?: () => void;
  onStartTuesdayCheckout?: () => void;
  onTuesdayReportSeen?: () => void;
  onClaimSubmit: () => void;
  onCorridorConfirm: () => void;
  onConfiguratorContinue: () => void;
  onJoinWaitlist: () => void;
  onSkipWaitlist: () => void;
  onBackToClaim: () => void;
  onClose: () => void;
}) {
  const claimed = claimMinimumMet(data);
  const strength = computeReadiness(data, enrich);
  const isPayoff = step === "waitlist" || step === "done";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6">
      {/* Backdrop - dims the page behind the journey */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 cursor-default bg-ink-900/60 backdrop-blur-[2px]"
      />
      {/* Dialog - wider on the payoff steps so the reveal has room */}
      <div
        className={`relative z-10 mx-auto my-6 w-full ${
          isPayoff ? "max-w-2xl" : "max-w-4xl"
        } overflow-hidden rounded-2xl bg-white shadow-2xl shadow-ink-900/40 animate-[fadeUp_0.3s_ease-out]`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-ink-100 text-ink-500 transition-colors hover:bg-ink-200 hover:text-ink-700"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        {isPayoff ? (
          /* SUCCESS - confirm the free claim/edit FIRST (left: their buyer
             card), then the gated Tuesday Report offer (right). New claim
             (step "waitlist") and edit (step "done") share one panel; the copy
             + gate differ by mode. (2026-06-02 rebuild per Rob's spec) */
          <div className="max-h-[90vh] overflow-y-auto p-6 sm:p-8">
            <SuccessOfferView
              mode={step === "waitlist" ? "claim" : "edit"}
              offerMode={offerMode}
              displayName={displayName}
              displayLocation={displayLocation}
              data={data}
              enrich={enrich}
              offerEligible={offerEligible}
              alreadyReserved={alreadyReserved}
              subscribed={subscribed}
              reserving={trReserving}
              reserveDone={trReserveDone}
              checkoutBusy={checkoutBusy}
              onReserve={onReserveTuesdayReport}
              onStartCheckout={onStartTuesdayCheckout}
              onOfferShown={onTuesdayReportSeen}
              onDismiss={onClose}
              corridorLabel={corridorLabel}
              stateCode={stateCode}
              psciValue={psciValue}
              psciAsOf={psciAsOf}
              psciWowPct={psciWowPct}
              psciComponents={psciComponents}
              psciForecast={psciForecast}
            />
          </div>
        ) : (
          /* FORM STEPS - persistent live card on the left, step content right */
          <div className="grid lg:grid-cols-2">
            {/* LEFT - their spot on the map + the live card (persists across
                claim / corridor / configurator) */}
            <div className="hidden lg:flex flex-col gap-4 bg-ink-50/60 p-6">
              <div className="relative h-36 overflow-hidden rounded-xl border border-ink-200 bg-ink-100">
                <StaticTileMap lat={lat} lng={lng} />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <ClaimRing strength={strength} claimed={claimed} />
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white/95 to-transparent px-3 pb-2 pt-6">
                  <p className="text-xs font-semibold text-ink-900">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-ink-600">
                    {city || displayLocation || "Your area"}
                  </p>
                </div>
              </div>
              <LiveListingCard
                displayName={displayName}
                displayLocation={displayLocation}
                data={data}
                enrich={enrich}
                claimed={claimed}
              />
              <p className="text-[11px] leading-relaxed text-ink-500">
                This is what buyers see when they find you. Every field you add
                fills it in live - the rest we capture on a quick call.
              </p>
            </div>

            {/* RIGHT - the active step */}
            <div className="max-h-[88vh] overflow-y-auto p-6">
              {/* Mobile card (desktop shows it on the left) */}
              <div className="lg:hidden mb-5">
                <LiveListingCard
                  displayName={displayName}
                  displayLocation={displayLocation}
                  data={data}
                  enrich={enrich}
                  claimed={claimed}
                />
              </div>
              {/* MULTI-LOCATION TABS - one company, several listings claimed
                  with the same email. Each tab is its OWN record: edit + save
                  + subscribe independently. Only shown in edit mode with 2+
                  locations. */}
              {step === "claim" &&
                isEditMode &&
                editLocations.length > 1 && (
                  <div className="mb-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">
                      Your locations
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {editLocations.map((loc, i) => {
                        const label =
                          [loc.city, loc.state].filter(Boolean).join(", ") ||
                          loc.vendorName ||
                          `Location ${i + 1}`;
                        const active = i === activeLocationIdx;
                        return (
                          <button
                            key={loc.recordId || i}
                            type="button"
                            onClick={() => onSwitchLocation?.(i)}
                            aria-current={active ? "true" : undefined}
                            className={
                              active
                                ? "rounded-full bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white"
                                : "rounded-full border border-ink-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-600 hover:border-brand-300 hover:text-brand-700"
                            }
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-ink-400">
                      Each location is separate - save this one before switching
                      tabs. Hours, contact, capabilities, and any Tuesday Report
                      subscription are unique to each.
                    </p>
                    {savedLocationLabel && !showMultiSaveConfirm && (
                      <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700">
                        Saved {savedLocationLabel}. Switch tabs to update another
                        location.
                      </p>
                    )}
                  </div>
                )}
              {/* MULTI-LOCATION SAVE CONFIRMATION - replaces the form right
                  after a save so it's unmistakable that the change hit ONE
                  location only, with a back-to-locations path + a Tuesday
                  Report jump. */}
              {step === "claim" && showMultiSaveConfirm && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
                  <p className="text-base font-bold text-emerald-800">
                    Saved {savedLocationLabel || "this location"} only
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-700">
                    This update applied to your{" "}
                    <strong>{savedLocationLabel || "selected"}</strong> listing
                    only.{" "}
                    {editLocations.length > 1 && (
                      <>
                        Your other {editLocations.length - 1} location
                        {editLocations.length - 1 === 1 ? "" : "s"} are
                        unchanged - open any tab above to edit them next.
                      </>
                    )}
                  </p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={onEditAnotherLocation}
                      className="inline-flex items-center justify-center rounded-full border border-ink-300 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:border-brand-300 hover:text-brand-700"
                    >
                      ← Edit another location
                    </button>
                    <button
                      type="button"
                      onClick={onGoToTuesdayReport}
                      className="inline-flex flex-1 items-center justify-center rounded-full bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
                    >
                      See the Tuesday Report →
                    </button>
                  </div>
                </div>
              )}
              {step === "claim" && !showMultiSaveConfirm && (
                <ClaimFormView
                  displayName={displayName}
                  data={data}
                  setData={setData}
                  enrich={enrich}
                  setEnrich={setEnrich}
                  onSubmit={onClaimSubmit}
                  onBack={onClose}
                  isEditMode={isEditMode}
                  submitting={submitting}
                />
              )}
              {step === "corridor" && (
                <CorridorView
                  displayLocation={displayLocation}
                  zipFallback={zipFallback}
                  stateCode={stateCode}
                  onConfirm={onCorridorConfirm}
                  onBack={onBackToClaim}
                />
              )}
              {step === "configurator" && (
                <ConfiguratorView
                  config={config}
                  setConfig={setConfig}
                  corridorLabel={corridorLabel}
                  onContinue={onConfiguratorContinue}
                  onBack={onConfiguratorContinue}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Indeterminate submit progress bar -- a brand-blue segment sweeps left to
// right while a form submission is in flight. Driven by `submitting` on the
// claim/edit POST so the vendor sees the claim is working. (2026-06-02)
function SubmitBar({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div
      role="progressbar"
      aria-label="Submitting"
      className="h-1 w-full overflow-hidden rounded-full bg-brand-500/20"
    >
      <div
        className="h-full w-2/5 rounded-full bg-brand-500"
        style={{ animation: "psBarSlide 1.1s ease-in-out infinite" }}
      />
    </div>
  );
}

function ClaimFormView({
  displayName,
  data,
  setData,
  enrich,
  setEnrich,
  onSubmit,
  onBack,
  isEditMode = false,
  submitting = false,
}: {
  displayName: string;
  data: ClaimFormData;
  setData: (d: ClaimFormData) => void;
  enrich: ClaimEnrichment;
  setEnrich: (e: ClaimEnrichment) => void;
  onSubmit: () => void;
  onBack: () => void;
  // When true, the modal opened via a magic-link token (vendor is editing
  // an existing claimed listing). Adapts the heading, intro copy, and the
  // sticky submit button without changing the form fields.
  isEditMode?: boolean;
  // Drives the indeterminate submit bar + disabled/label state on the CTA.
  submitting?: boolean;
}) {
  // Which boost is expanded (one at a time keeps the panel compact, not a
  // wall of chips).
  const [openBoost, setOpenBoost] = useState<string | null>(null);

  // Hide any service that an active classification already implies (no
  // "Recycling" chip for a Pallet Recycler - that's a given). With
  // multi-select classifications, hide ANY implied service from ANY
  // selected classification.
  const impliedServices = new Set(
    data.classifications
      .map((c) => CLASSIFICATION_IMPLIES_SERVICE[c])
      .filter(Boolean) as string[]
  );
  const offeredServices = ENRICH_SERVICES.filter((s) => !impliedServices.has(s));

  function toggleService(val: string) {
    setEnrich({
      ...enrich,
      services: enrich.services.includes(val)
        ? enrich.services.filter((c) => c !== val)
        : [...enrich.services, val],
    });
  }
  function toggleType(val: string) {
    setEnrich({
      ...enrich,
      palletTypes: enrich.palletTypes.includes(val)
        ? enrich.palletTypes.filter((c) => c !== val)
        : [...enrich.palletTypes, val],
    });
  }
  function toggleTreatment(val: string) {
    setEnrich({
      ...enrich,
      treatments: enrich.treatments.includes(val)
        ? enrich.treatments.filter((t) => t !== val)
        : [...enrich.treatments, val],
    });
  }
  function setRadius(val: string) {
    setEnrich({
      ...enrich,
      serviceRadius: enrich.serviceRadius === val ? null : val,
    });
  }
  // Hours is stored as one string ("6:00 AM - 5:00 PM"). The two dropdowns
  // read/write the open and close halves. " - " (single hyphen) is the join,
  // per the no-em-dash / no-double-hyphen house rule.
  const hoursParts = enrich.hours ? enrich.hours.split(" - ") : [];
  const openTime = hoursParts[0] || "";
  const closeTime = hoursParts.length > 1 ? hoursParts[1] : "";
  function composeHours(open: string, close: string): string | null {
    if (open && close) return `${open} - ${close}`;
    if (open || close) return open || close;
    return null;
  }
  function setOpenTime(val: string) {
    setEnrich({ ...enrich, hours: composeHours(val, closeTime) });
  }
  function setCloseTime(val: string) {
    setEnrich({ ...enrich, hours: composeHours(openTime, val) });
  }
  function toggleDay(val: string) {
    setEnrich({
      ...enrich,
      days: enrich.days.includes(val)
        ? enrich.days.filter((d) => d !== val)
        : [...enrich.days, val],
    });
  }
  const coverageCount =
    (enrich.serviceRadius ? 1 : 0) +
    (enrich.hours ? 1 : 0) +
    (enrich.days.length > 0 ? 1 : 0);

  // Three optional "boosts." Each is a collapsed row by default; opening
  // one reveals its chips; selecting any fires a reward line and fills the
  // pin's strength ring. Service area / hours / sizes stay for the call.
  const boosts: {
    key: string;
    title: string;
    hint: string;
    options: string[];
    selected: string[];
    toggle: (v: string) => void;
    reward: string;
  }[] = [
    {
      key: "services",
      title: "What you do",
      hint: "Services buyers can filter by",
      options: offeredServices,
      selected: enrich.services,
      toggle: toggleService,
      reward: "Buyers can now filter to the work you do.",
    },
    {
      key: "types",
      title: "What you make",
      hint: "Pallet types you build or stock",
      options: ENRICH_PALLET_TYPES,
      selected: enrich.palletTypes,
      toggle: toggleType,
      reward: "Buyers searching these pallet types will find you.",
    },
    {
      key: "certs",
      title: "Certifications & treatments",
      hint: "Export and food-grade credentials",
      options: ENRICH_TREATMENTS,
      selected: enrich.treatments,
      toggle: toggleTreatment,
      reward: "Export and food-grade buyers can now find you.",
    },
  ];

  return (
    <div>
      <StepIndicator step={1} total={2} />
      <h3 className="mt-3 text-lg font-semibold text-ink-900">
        {isEditMode ? `Edit ${displayName}` : `Claim ${displayName}`}
      </h3>
      <p className="mt-2 text-xs leading-relaxed text-ink-600">
        {isEditMode
          ? "Your current values are pre-filled below. Change anything and click Save changes - the edit replaces your old values instantly."
          : "Free, about 20 seconds. Add your contact below and you're claimed - we get the rest on a quick call. Watch your pin grow on the map as you go."}
      </p>
      {!isEditMode && (
        <p className="mt-2 text-xs leading-relaxed text-ink-500">
          The network is growing fast - claiming now means buyers find you
          established and reachable, not a blank public-records entry.
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="mt-6 space-y-4"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">
          {isEditMode ? "Your listing" : "The 60-second claim"}
        </p>
        <div className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm shadow-ink-900/5 space-y-4">
        <FormField
          id="claim-first"
          label="First name"
          required
          value={data.firstName}
          onChange={(v) => setData({ ...data, firstName: v })}
        />
        <FormField
          id="claim-email"
          label="Email"
          required
          type="email"
          value={data.email}
          onChange={(v) => setData({ ...data, email: v })}
        />
        <FormField
          id="claim-phone"
          label="Phone (optional)"
          type="tel"
          value={data.phone}
          onChange={(v) => setData({ ...data, phone: v })}
        />
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-500 mb-1.5">
            Classification <span className="text-ink-400 font-normal normal-case tracking-normal">(check all that apply)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {CLASSIFICATIONS.map((c) => {
              const active = data.classifications.includes(c);
              return (
                <EnrichChip
                  key={c}
                  label={c}
                  active={active}
                  onClick={() =>
                    setData({
                      ...data,
                      classifications: active
                        ? data.classifications.filter((x) => x !== c)
                        : [...data.classifications, c],
                    })
                  }
                />
              );
            })}
          </div>
        </div>
        </div>{/* /60-second claim panel */}

        {/* OPTIONAL BOOSTS - three collapsed rows, not a wall of chips.
            Each one filled grows the pin's strength ring and fires a
            reward line. The rest is captured on the intro call. */}
        <div className="pt-4 mt-2 border-t border-ink-100">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
            Make your listing stronger (optional)
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
            Each one fills your pin on the map and helps the right buyers
            find you. Skip any - we finish the rest on the call.
          </p>

          <div className="mt-4 space-y-2.5">
            {boosts.map((b) => {
              const isOpen = openBoost === b.key;
              const count = b.selected.length;
              const done = count > 0;
              return (
                <div
                  key={b.key}
                  className={`rounded-xl border overflow-hidden transition-colors ${
                    done
                      ? "border-emerald-300 bg-emerald-50/30"
                      : "border-ink-200 bg-white"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenBoost(isOpen ? null : b.key)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                          done
                            ? "bg-emerald-500 text-white"
                            : "bg-ink-100 text-ink-500"
                        }`}
                      >
                        {done ? "✓" : "+"}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink-900">
                          {b.title}
                        </span>
                        <span className="block text-[11px] text-ink-500">
                          {done ? `${count} added` : b.hint}
                        </span>
                      </span>
                    </span>
                    <span
                      className={`shrink-0 text-ink-400 text-xs transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    >
                      ▾
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4">
                      <div className="flex flex-wrap gap-2">
                        {b.options.map((o) => (
                          <EnrichChip
                            key={o}
                            label={o}
                            active={b.selected.includes(o)}
                            onClick={() => b.toggle(o)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {done && (
                    <div className="px-4 pb-3 -mt-1">
                      <p className="text-[11px] font-medium text-emerald-700">
                        ✓ {b.reward}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Coverage & hours - radius (single), hours (single), days (multi) */}
            <div
              className={`rounded-xl border overflow-hidden transition-colors ${
                coverageCount > 0
                  ? "border-emerald-300 bg-emerald-50/30"
                  : "border-ink-200 bg-white"
              }`}
            >
              <button
                type="button"
                onClick={() =>
                  setOpenBoost(openBoost === "coverage" ? null : "coverage")
                }
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                aria-expanded={openBoost === "coverage"}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                      coverageCount > 0
                        ? "bg-emerald-500 text-white"
                        : "bg-ink-100 text-ink-500"
                    }`}
                  >
                    {coverageCount > 0 ? "✓" : "+"}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink-900">
                      Coverage &amp; hours
                    </span>
                    <span className="block text-[11px] text-ink-500">
                      {coverageCount > 0
                        ? `${coverageCount} added`
                        : "Service area, hours, days open"}
                    </span>
                  </span>
                </span>
                <span
                  className={`shrink-0 text-ink-400 text-xs transition-transform ${
                    openBoost === "coverage" ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                >
                  ▾
                </span>
              </button>
              {openBoost === "coverage" && (
                <div className="px-4 pb-4 space-y-4">
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                      Service area
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ENRICH_RADII.map((r) => (
                        <EnrichChip
                          key={r}
                          label={r}
                          active={enrich.serviceRadius === r}
                          onClick={() => setRadius(r)}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                      Hours
                    </p>
                    <div className="flex items-center gap-2">
                      <select
                        value={openTime}
                        onChange={(e) => setOpenTime(e.target.value)}
                        aria-label="Opens"
                        className="flex-1 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200/60"
                      >
                        <option value="">Opens...</option>
                        {HOUR_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <span className="text-xs text-ink-400">to</span>
                      <select
                        value={closeTime}
                        onChange={(e) => setCloseTime(e.target.value)}
                        aria-label="Closes"
                        className="flex-1 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200/60"
                      >
                        <option value="">Closes...</option>
                        {HOUR_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                      Days open
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ENRICH_DAYS.map((d) => (
                        <EnrichChip
                          key={d}
                          label={d}
                          active={enrich.days.includes(d)}
                          onClick={() => toggleDay(d)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {coverageCount > 0 && (
                <div className="px-4 pb-3 -mt-1">
                  <p className="text-[11px] font-medium text-emerald-700">
                    ✓ Buyers see your coverage and when you&apos;re open.
                  </p>
                </div>
              )}
            </div>
          </div>

          <p className="mt-3 text-[10px] leading-relaxed text-ink-400">
            ISPM-15 is the export certification stamp (requires heat
            treatment or fumigation). Sizes and anything else we capture on
            the call.
          </p>
        </div>

        {/* Scroll-buffer spacer. The CTA bar below is sticky-bottom; without
            this clearance, the last content section ("Make your listing
            stronger" panels, "Coverage & hours" block) would sit visually
            under the stuck bar at maximum scroll. Spacer height matches the
            bar's ~72px so scrolling all the way down leaves the last content
            cleanly above the bar's natural position. */}
        <div className="h-20" aria-hidden="true" />

        {/* Sticky CTA bar - pins to the bottom of the scrolling modal pane so
            the submit button is always reachable on a phone without scrolling
            past the optional boosts. Solid opaque bg, z-20 to win over any
            in-form stacking context, and a soft top edge so the boundary
            with scrolled content reads as a hard division, not a fade. */}
        <div
          className="sticky bottom-0 z-20 -mx-6 mt-2 border-t border-ink-200 bg-white px-6 py-3 shadow-[0_-6px_16px_rgba(15,29,36,0.08)]"
          style={{ backgroundColor: "#ffffff" }}
        >
          {/* Indeterminate progress bar -- the blue bar sweeps right while the
              claim/edit POST is in flight. */}
          <SubmitBar active={submitting} />
          <div className={`flex items-center gap-3${submitting ? " mt-2.5" : ""}`}>
            <button
              type="button"
              onClick={onBack}
              disabled={submitting}
              className="text-xs font-semibold text-ink-500 hover:text-ink-700 disabled:opacity-50"
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors disabled:cursor-not-allowed disabled:opacity-80"
            >
              {submitting
                ? isEditMode
                  ? "Saving your changes..."
                  : "Claiming your listing..."
                : isEditMode
                  ? "Save changes →"
                  : "See this week's read for my area →"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function FormField({
  id,
  label,
  type = "text",
  required = false,
  value,
  onChange,
}: {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[10px] font-semibold uppercase tracking-wider text-ink-500 mb-1.5"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
      />
    </div>
  );
}

function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i < step ? "w-6 bg-brand-500" : "w-3 bg-ink-200"
          }`}
        />
      ))}
      <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
        Step {step} of {total}
      </span>
    </div>
  );
}

function CorridorView({
  displayLocation,
  zipFallback,
  stateCode,
  onConfirm,
  onBack,
}: {
  displayLocation: string;
  zipFallback: string;
  stateCode: string;
  onConfirm: () => void;
  onBack: () => void;
}) {
  // FOMO foreshadow (2026-05-29): show a signal already moving in this
  // corridor so the vendor sees what they're missing before the pitch. We
  // reveal the SIGNAL (the event) but gate the actionable "your move" behind
  // the Report - honest, because the move IS the paid product. Real events
  // are badged "Recent example"; representative ones "Illustrative", exactly
  // like the Tuesday Report preview. Never invented as this-week-live news.
  const sampleEvent = getSampleEventForState(stateCode);

  return (
    <div>
      <StepIndicator step={2} total={4} />
      <h3 className="mt-3 text-lg font-semibold text-ink-900">
        Confirm your corridor
      </h3>
      <p className="mt-2 text-xs text-ink-600">
        We&apos;ll watch the area around your yard for events that affect
        demand and cost.
      </p>

      <div className="mt-5 rounded-md border border-ink-200 bg-ink-50/50 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
          Your corridor
        </p>
        <p className="mt-1 text-base font-semibold text-ink-900">
          {displayLocation}
        </p>
        <p className="mt-1 text-xs text-ink-600">
          {zipFallback
            ? `Centered ${zipFallback}; we'll refine to your exact ZIP on the intro call.`
            : "Covering ~50 miles in every direction"}
        </p>
      </div>

      {/* What we already watch here - the teaser that builds appetite */}
      {sampleEvent && (
        <div className="mt-4 overflow-hidden rounded-xl border border-brand-200 bg-brand-50/50">
          <div className="flex items-center justify-between gap-2 border-b border-brand-100 px-4 py-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-700">
              Already moving in your corridor
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                sampleEvent.isReal
                  ? "bg-amber-100 text-amber-800"
                  : "bg-ink-100 text-ink-500"
              }`}
            >
              {sampleEvent.isReal ? "Recent example" : "Illustrative"}
            </span>
          </div>
          <div className="px-4 py-3">
            <p className="text-sm font-semibold leading-snug text-ink-900">
              {sampleEvent.title}
            </p>
            <p className="mt-1 text-[11px] text-ink-500">
              {sampleEvent.date} · {sampleEvent.location} · Source:{" "}
              {sampleEvent.source}
            </p>
            {/* The move is gated - that's the paid value, and the gate is
                the FOMO. Honest: we're not hiding that it exists, we're
                saying it ships with the Report. */}
            <div className="mt-2.5 rounded-lg border-l-[3px] border-brand-300 bg-white px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-700">
                Your move
              </p>
              <p className="mt-0.5 text-xs italic leading-relaxed text-ink-400">
                Who to call and when - unlocked in your Tuesday Report.
              </p>
            </div>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs leading-relaxed text-ink-700">
        That&apos;s one signal. But the promise is simpler: we watch your
        corridor so you don&apos;t have to. Every Tuesday you get where your
        pallet and fuel costs are heading - a read that&apos;s never the same
        twice - plus any local moves worth acting on within 150 miles, each
        with the move to make. Quiet week on moves? We say so, and the cost
        read still tells you where your margin&apos;s going.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-semibold text-ink-500 hover:text-ink-700"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
        >
          Next: pick your signals →
        </button>
      </div>
    </div>
  );
}

function ConfiguratorView({
  config,
  setConfig,
  corridorLabel,
  onContinue,
  onBack,
}: {
  config: ConfiguratorData;
  setConfig: (c: ConfiguratorData) => void;
  corridorLabel: string;
  onContinue: () => void;
  onBack: () => void;
}) {
  function toggle(key: keyof ConfiguratorData) {
    setConfig({ ...config, [key]: !config[key] });
  }

  // FOMO reframe (2026-05-29): each toggle is an ARMED WATCH, not a
  // preference. The live count and the "you'll be alerted" sub-copy make
  // arming a signal feel like loading the Report up before the reveal.
  const options: Array<{
    key: keyof ConfiguratorData;
    label: string;
    sub: string;
  }> = [
    {
      key: "newFacilities",
      label: "New facilities and DCs opening",
      sub: "Get the tenant before a competitor does - the procurement window opens 60-90 days before they open.",
    },
    {
      key: "closures",
      label: "Plant closures and WARN filings",
      sub: "Catch softening accounts early - used-pallet dumps and core supply spike when they wind down.",
    },
    {
      key: "costShifts",
      label: "Cost shifts: diesel, lumber, wages",
      sub: "See diesel, lumber, and wage moves coming - which way your input costs are headed each week.",
    },
    {
      key: "competitive",
      label: "Competitive moves",
      sub: "See other operators expanding or pulling out of your corridor before the gap opens.",
    },
  ];

  const armed = options.filter((o) => config[o.key]).length;

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">
        Optional · fine-tune your read
      </p>
      <h3 className="mt-2 text-lg font-semibold text-ink-900">
        What should we flag for you?
      </h3>
      <p className="mt-2 text-xs text-ink-600">
        Each one you arm becomes a weekly watch on your corridor. All on by
        default - leave them on and the Report does the hunting. You can change
        this anytime; your read is already waiting.
      </p>

      <div className="mt-4 flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50/60 px-3 py-2">
        <span className="text-sm font-bold tabular-nums text-brand-700">
          {armed}/4
        </span>
        <span className="text-xs font-medium text-ink-700">
          signals armed for {corridorLabel}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {options.map((opt) => {
          const on = config[opt.key];
          return (
            <label
              key={opt.key}
              className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
                on
                  ? "border-brand-300 bg-brand-50/40"
                  : "border-ink-200 hover:border-brand-400"
              }`}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggle(opt.key)}
                className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-400"
              />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-ink-900">
                    {opt.label}
                  </p>
                  {on && (
                    <span className="rounded bg-brand-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-700">
                      Armed
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-ink-600 leading-snug">
                  {opt.sub}
                </p>
              </div>
            </label>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-semibold text-ink-500 hover:text-ink-700"
        >
          ← Back to my read
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
        >
          Save - back to my read →
        </button>
      </div>
    </div>
  );
}


// SuccessOfferView - the post-claim / post-edit success panel (2026-06-02,
// per Rob's spec). Confirms the FREE action first (left: the vendor's
// buyer-facing card), then surfaces the Tuesday Report as an optional, GATED
// bonus on the right. Honesty rules baked in: the reserve is a deliberate
// button (no pre-check), no urgency / lock / countdown, no ship date, and the
// offer is shown at most once per vendor (gate via tuesday_report_seen /
// _reserved). New claim and edit share this panel; only the copy + gate differ.
function SuccessOfferView({
  mode,
  offerMode,
  displayName,
  displayLocation,
  data,
  enrich,
  offerEligible,
  alreadyReserved,
  subscribed,
  reserving,
  reserveDone,
  checkoutBusy,
  onReserve,
  onStartCheckout,
  onOfferShown,
  onDismiss,
  corridorLabel,
  stateCode,
  psciValue,
  psciAsOf,
  psciWowPct,
  psciComponents,
  psciForecast,
}: {
  mode: "claim" | "edit";
  offerMode: "reserve" | "checkout";
  displayName: string;
  displayLocation: string;
  data: ClaimFormData;
  enrich: ClaimEnrichment;
  offerEligible: boolean;
  alreadyReserved: boolean;
  subscribed: boolean;
  reserving: boolean;
  reserveDone: boolean;
  checkoutBusy: boolean;
  onReserve?: () => void;
  onStartCheckout?: () => void;
  onOfferShown?: () => void;
  onDismiss: () => void;
  corridorLabel: string;
  stateCode?: string;
  psciValue?: number;
  psciAsOf?: string;
  psciWowPct?: number | null;
  psciComponents?: ReadonlyArray<PsciComponentMover>;
  psciForecast?: PsciForecast | null;
}) {
  const showOffer = offerEligible && !reserveDone;
  // Mark the offer "seen" exactly once, the moment it is actually shown.
  const seenFired = useRef(false);
  useEffect(() => {
    if (showOffer && !seenFired.current) {
      seenFired.current = true;
      onOfferShown?.();
    }
  }, [showOffer, onOfferShown]);

  const header =
    mode === "claim"
      ? "Your listing is now live and searchable."
      : "Your changes are live.";
  const sub =
    mode === "claim"
      ? "Buyers see exactly what's shown here when they find you on the map."
      : "Here's what buyers see now.";

  return (
    /* Single column, stacked: confirmation + wide listing on top, the Tuesday
       Report directly below (scroll to read), buttons in a row at the bottom. */
    <div>
      {/* Confirmation header */}
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"
          style={{ animation: "psPop 0.5s ease-out" }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 13 L9 17 L19 7" />
          </svg>
        </span>
        <h3 className="text-xl font-bold tracking-tight text-ink-900">
          {header}
        </h3>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-600">{sub}</p>

      {/* Listing preview - full width, confirms the free action. */}
      <div className="mt-5">
        <LiveListingCard
          displayName={displayName}
          displayLocation={displayLocation}
          data={data}
          enrich={enrich}
          claimed
        />
        <p className="mt-2 text-[11px] leading-relaxed text-ink-500">
          This is exactly what a buyer sees when they pull up your dot on the
          network.
        </p>
      </div>

      {reserveDone ? (
        /* Inline reserve confirmation - no payment was taken, reservation
           only, no fabricated ship date. */
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-semibold text-emerald-900">
            You&apos;re on the list - the Tuesday Report is free.
          </p>
          <p className="mt-1 text-sm text-emerald-800">
            We&apos;ll let you know when it&apos;s ready.
          </p>
          <button
            type="button"
            onClick={onDismiss}
            className="mt-4 w-full rounded-full bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink-800"
          >
            Done
          </button>
        </div>
      ) : showOffer ? (
        /* The optional offer, directly below the listing. Lead with the REAL
           sample edition (what they receive each Tuesday), then a free sign-up.
           2026-06-03 reposition: the Tuesday Report is FREE for claimed vendors.
           Both offerMode branches now sign the vendor up at no charge; the old
           "checkout" Stripe path ($9.99/mo) is retired at the copy level. FLAG:
           if offerMode can still be "checkout", disable onStartCheckout / the
           Stripe charge in the handler so the button never charges. */
        <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50/40 p-5">
          <p className="text-base font-bold text-ink-900">
            {offerMode === "checkout"
              ? "The Tuesday Report"
              : "Want the Tuesday Report?"}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-700">
            {offerMode === "checkout"
              ? "Your corridor, watched for you. Every Tuesday, a 60-second read built for your 150 miles: where your pallet and fuel costs are heading this week, plus any local moves worth acting on - a new DC to pitch, a closure freeing up cores, a competitor shift. We watch your corridor so you don't have to. Quiet week on moves? We say so - and the cost read still tells you where your margin's going."
              : "Your corridor, watched for you. Every Tuesday, a 60-second read for your 150 miles: where your pallet and fuel costs are heading this week, plus any local moves worth acting on. We watch your corridor so you don't have to. Quiet week on moves? We say so - and the cost read still tells you where your margin's going."}
          </p>

          {/* Proof-of-quality framing - turns "that's not my data" into "that's
              the quality I'll get." Checkout mode only. */}
          {offerMode === "checkout" && (
            <p className="mt-3 rounded-lg bg-ink-50 px-3 py-2 text-xs leading-relaxed text-ink-700">
              This is an actual Tuesday Report from the Dallas-Fort Worth
              corridor. Yours will look exactly like this - same format, same
              local events within ~150 miles of your yard, same &quot;your
              move&quot; actions.
            </p>
          )}
          {/* The actual sample edition - so they see exactly what they get. */}
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">
              Sample edition
            </p>
            <div className="mt-2">
              <TuesdayReportPreview
                corridorLabel={corridorLabel}
                stateCode={stateCode}
                serviceRadius={enrich.serviceRadius || null}
                psciValue={psciValue}
                psciAsOf={psciAsOf}
                psciWowPct={psciWowPct}
                psciComponents={psciComponents}
                psciForecast={psciForecast}
              />
            </div>
          </div>

          <p className="mt-4 text-sm font-semibold text-ink-900">
            Free for claimed vendors. No card, no charge.
          </p>

          {/* Action row: "Not now" (gray, left) + primary (blue, right, fills). */}
          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={onDismiss}
              className="shrink-0 rounded-full px-4 py-3 text-sm font-medium text-ink-500 transition-colors hover:text-ink-700"
            >
              Not now
            </button>
            {offerMode === "checkout" ? (
              <button
                type="button"
                onClick={onStartCheckout}
                disabled={checkoutBusy}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-bold text-white shadow-md shadow-brand-500/30 transition-all hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {checkoutBusy
                  ? "Signing up..."
                  : "Get the Tuesday Report (free) →"}
              </button>
            ) : (
              <button
                type="button"
                onClick={onReserve}
                disabled={reserving}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-bold text-white shadow-md shadow-brand-500/30 transition-all hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {reserving ? "Signing up..." : "Get the Tuesday Report (free) →"}
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Already subscribed / reserved / shown once - confirm only, no re-pitch. */
        <div className="mt-6">
          {(subscribed || alreadyReserved) && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
              {subscribed
                ? "You're subscribed to the Tuesday Report."
                : "Your Tuesday Report is active."}
            </p>
          )}
          <button
            type="button"
            onClick={onDismiss}
            className="mt-4 w-full rounded-full bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink-800"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}

// WaitlistView - the claimed reveal + Tuesday Report offer. Rewritten
// 2026-05-28 to break out of the narrow panel into a full-width payoff:
// a celebration, the vendor's COMPLETED listing (the "after"), and a
// prominent Tuesday Report next to a strong waitlist CTA.
function WaitlistView({
  displayName,
  displayLocation,
  corridorLabel,
  stateCode,
  claimEmail,
  psciValue,
  psciAsOf,
  psciWowPct,
  psciComponents,
  psciForecast,
  data,
  enrich,
  onJoin,
  onSkip,
  onBack,
}: {
  displayName: string;
  displayLocation: string;
  corridorLabel: string;
  stateCode: string;
  claimEmail: string;
  psciValue?: number;
  psciAsOf?: string;
  psciWowPct?: number | null;
  psciComponents?: ReadonlyArray<PsciComponentMover>;
  psciForecast?: PsciForecast | null;
  data: ClaimFormData;
  enrich: ClaimEnrichment;
  onJoin: () => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const claimed = claimMinimumMet(data);
  return (
    /* Rebuilt 2026-05-29 (Grok conversion dissection, honest version):
       single-column and product-led. The free claim is a tight confirmation
       at top; the Tuesday Report value block dominates; an ACTIVE offer
       follows; the claimed listing is demoted to a "what buyers see now"
       confirmation below. No fabricated delivery date ("ships Tuesday") and
       no invented lock term - founding-rate language only. */
    <div className="mx-auto max-w-2xl">
      {/* Tight confirmation - reassure the claim worked without making the
          free win the whole event. */}
      <div className="text-center">
        <div className="flex justify-center">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
            style={{ animation: "psPop 0.5s ease-out" }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 13 L9 17 L19 7" />
            </svg>
          </span>
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          You&apos;re claimed and on the map.
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-ink-600">
          {displayName} is yours. Now the one thing the best vendors do next -
          the Tuesday Report for {corridorLabel}.
        </p>
      </div>

      {/* THE READ - the dominant value block. Lead with the product. */}
      <div className="mt-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">
          A sample read
        </p>
        <p className="mt-1 text-sm leading-relaxed text-ink-700">
          Your outsourced sales brief - what&apos;s moving on your cost basis
          and the leads opening in your corridor, with the move to make on
          each. This is a sample; the best vendors get it every Tuesday before
          their competitor does.
        </p>
        <div className="mt-3">
          <TuesdayReportPreview
            corridorLabel={corridorLabel}
            stateCode={stateCode}
            serviceRadius={enrich.serviceRadius}
            psciValue={psciValue}
            psciAsOf={psciAsOf}
            psciWowPct={psciWowPct}
            psciComponents={psciComponents}
            psciForecast={psciForecast}
          />
        </div>
      </div>

      {/* Free-vs-paid bridge - the one line that says what the $9.99 adds
          beyond the free claim they just did. */}
      <p className="mx-auto mt-6 max-w-md text-center text-xs leading-relaxed text-ink-600">
        Claiming is free - that&apos;s how buyers find{" "}
        <span className="font-semibold text-ink-900">you</span>. The Tuesday
        Report is how{" "}
        <span className="font-semibold text-ink-900">you</span> find the lead
        first.
      </p>

      {/* THE OFFER - free for claimed vendors, primary CTA. */}
      <div className="mt-3 rounded-2xl border-2 border-brand-300 bg-brand-50/50 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand-700">
            Tuesday Report · for claimed vendors
          </p>
          <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
            Free
          </span>
        </div>
        <p className="mt-2 text-lg font-bold text-ink-900">
          Free for claimed vendors.
        </p>
        <p className="mt-1.5 text-sm font-semibold leading-snug text-ink-800">
          One local lead is worth more than a year of watching for it yourself.
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
          No card, no charge. Stop anytime.
        </p>
        <button
          type="button"
          onClick={onJoin}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-3.5 text-base font-bold text-white shadow-md shadow-brand-500/30 transition-all hover:scale-[1.01] hover:bg-brand-600"
        >
          Get the Tuesday Report
          <span aria-hidden="true">→</span>
        </button>
        <p className="mt-2 text-center text-[11px] text-ink-500">
          You&apos;ll be first to get it the moment it ships.
          {claimEmail.trim()
            ? ` We'll use ${claimEmail.trim()} - the email from your claim.`
            : ""}
        </p>
      </div>

      {/* Demoted - the claimed listing collapsed behind a disclosure. They
          watched it fill live in the modal, so it doesn't need to compete with
          the ask; it's here for reassurance, one click away. */}
      <details className="group mt-8 border-t border-ink-100 pt-6 [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex cursor-pointer items-center justify-between gap-3 list-none">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
            What buyers now see when they pull up your dot
          </span>
          <span
            aria-hidden="true"
            className="shrink-0 text-lg leading-none text-ink-400 transition-transform group-open:rotate-45"
          >
            +
          </span>
        </summary>
        <div className="mt-3">
          <LiveListingCard
            displayName={displayName}
            displayLocation={displayLocation}
            data={data}
            enrich={enrich}
            claimed={claimed}
          />
        </div>
      </details>

      {/* Secondary actions */}
      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={onSkip}
          className="text-xs font-medium text-ink-400 hover:text-ink-600"
        >
          My claim is enough for now
        </button>
        <span className="text-ink-300">·</span>
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-semibold text-ink-500 hover:text-ink-700"
        >
          ← Edit my listing
        </button>
      </div>
    </div>
  );
}

function DoneView({
  displayName,
  joinedWaitlist,
}: {
  displayName: string;
  joinedWaitlist: boolean;
}) {
  // Renders full-width inside the JourneyModal payoff branch, right after the
  // celebratory read/offer reveal - so it's centered and scaled to match,
  // not the small left-panel block it used to be. Headline adapts to whether
  // they joined the Tuesday Report or just claimed.
  return (
    <div className="mx-auto max-w-md text-center">
      {/* Confirmation badge */}
      <div className="flex justify-center">
        <span
          className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
          style={{ animation: "psPop 0.5s ease-out" }}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 13 L9 17 L19 7" />
          </svg>
        </span>
      </div>

      <h3 className="mt-5 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
        {joinedWaitlist ? "You're claimed - and on the list." : "You're set."}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-ink-600">
        {joinedWaitlist
          ? `${displayName} is claimed, and you're signed up for the free Tuesday Report.`
          : `${displayName} is claimed.`}
      </p>

      <div className="mt-6 rounded-xl border border-ink-200 bg-ink-50/50 p-5 text-left">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
          What happens next
        </p>
        <ol className="mt-3 space-y-2.5 text-xs leading-relaxed text-ink-700">
          <li className="flex gap-2.5">
            <span className="shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
              1
            </span>
            <span>We call within one business day to introduce ourselves.</span>
          </li>
          <li className="flex gap-2.5">
            <span className="shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
              2
            </span>
            <span>
              We walk through your full profile together - service area, hours,
              capabilities, treatments.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
              3
            </span>
            <span>Right after that call, your listing publishes on the map.</span>
          </li>
          {joinedWaitlist && (
            <li className="flex gap-2.5">
              <span className="shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                +
              </span>
              <span>
                You&apos;re on the list for the free Tuesday Report - we&apos;ll
                send the first edition for your corridor when it ships.
              </span>
            </li>
          )}
        </ol>
      </div>

      <p className="mt-5 text-xs text-ink-500 italic leading-relaxed">
        No deck. No demo. No follow-up emails until you tell us to start.
      </p>
    </div>
  );
}
