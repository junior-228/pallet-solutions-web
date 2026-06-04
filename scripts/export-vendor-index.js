/* eslint-disable no-console */
//
// export-vendor-index.js -- one-shot export of the Airtable Vendors
// table to a static JSON file the /vendors-prototype, /vendors, and
// /find-a-vendor pages use for instant client-side search.
//
// Usage:
//   AIRTABLE_API_KEY=patXXX AIRTABLE_BASE_ID=appQYT3aaMX1SzO7M \
//     node scripts/export-vendor-index.js
//
// Writes to: pallet-solutions-web/public/vendor-index.json
//
// === WHAT'S IN THE JSON (2026-05-29 Phase 0 expansion) ===
//
//   id, name, city, state, lat, lng, status        (always)
//   classification[]                                 (when present; ~all
//                                                     records carry it)
//   services[], palletTypes[], treatments[]          (when present; mostly
//                                                     Claimed/Enhanced)
//
// The capability arrays feed the buyer-side LOOSE FILTERS on
// /find-a-vendor. They re-rank and annotate results; they never exclude.
// Most records are Listed (public records only) and carry no capability
// data beyond classification, which is exactly why the filters are soft -
// see app/find-a-vendor (BuyerVendorFinder) honest-sparsity copy.
//
// === WHAT IS DELIBERATELY *NOT* IN THE JSON ===
//
//   Primary Phone / Primary Email / Website (contact info).
//
// Contact is NOT baked into this public file. The whole Pick 3 model is
// an anti-bulk-scrape gate: a buyer reveals one vendor's contact only
// after submitting their own email, 3 per visit. If contact lived in this
// publicly-served JSON, anyone could download it and scrape every vendor
// at once - defeating the gate. Contact is returned per-vendor, server-
// side, by the reveal endpoint (see-your-network-enterprise/netlify/
// functions/reveal-vendor-contact.js) after the email gate. Do NOT add
// phone/email/website here.
//
// === STATUS DERIVATION -- ONLY from the Listing Status single-select ===
//   Listing Status = 'Verified'  -> 'enhanced'  (blue pin, UI: "Enhanced")
//   Listing Status = 'Claimed'   -> 'claimed'   (green pin)
//   anything else / blank        -> 'listed'    (gray pin)
//
// IMPORTANT 2026-05-22: do NOT read the separate "Verified" CHECKBOX
// column. It's a different field, set on many Claimed vendors by prior
// ops work, and using it turns most of the map blue. The single-select
// "Listing Status" field is the SOLE tier signal. The UI displays the
// "Verified" tier as "Enhanced" -- field VALUE is "Verified", user-
// facing LABEL stays "Enhanced".
//
// Filter: only records with BOTH Latitude AND Longitude populated
// (per memory/airtable-vendors-schema.md, not all records are geocoded --
// the ones without lat/lng can't render as map pins).
//
// === FIELD NAMES (confirm against the live Vendors table) ===
//
// Confirmed present (memory/airtable-vendors-schema.md):
//   "Vendor Name", "Google Address", "Latitude", "Longitude",
//   "Listing Status", "Vendor Classification" (multi-select).
// Planned / sparse V2 fields (may not exist yet on every base - the
// export tolerates their absence and simply omits the array):
//   "Treatments", "Services", "Pallet Types".
// If your base names these differently, edit CAPABILITY_FIELDS below -
// that is the single place to adjust.
//
// Re-run this script to refresh the index after vendors are added or
// claim statuses / capabilities change. For the prototype: run on demand.

const fs = require("node:fs");
const path = require("node:path");

// VENDOR_SOURCE picks the read source. Default 'airtable' preserves prior
// behavior. Set VENDOR_SOURCE=supabase to bake from the public.vendor_public_read
// view (Phase B cutover; see PS_Site_Architecture.md / ps-data-layer skill).
const VENDOR_SOURCE = (process.env.VENDOR_SOURCE || "airtable").toLowerCase();

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (VENDOR_SOURCE === "supabase") {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "VENDOR_SOURCE=supabase requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
    process.exit(1);
  }
} else {
  if (!AIRTABLE_BASE_ID || !AIRTABLE_API_KEY) {
    console.error(
      "Missing required env vars. Run with:\n" +
        "  AIRTABLE_API_KEY=patXXX AIRTABLE_BASE_ID=appXXX node scripts/export-vendor-index.js\n" +
        "  (or set VENDOR_SOURCE=supabase + SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)"
    );
    process.exit(1);
  }
}

const OUTPUT_PATH = path.resolve(__dirname, "..", "public", "vendor-index.json");

// Airtable field -> index key. Edit here if your base uses other names.
const CAPABILITY_FIELDS = {
  classification: "Vendor Classification",
  services: "Services",
  palletTypes: "Pallet Types",
  treatments: "Treatments",
};

// Normalize raw Airtable option strings to the canonical taxonomy the
// /find-a-vendor filter UI uses (Grok-locked taxonomy, 2026-05-28). Only
// classification has a known legacy/short option set on the live base; the
// other dimensions are passed through as-is (already authored against the
// canonical strings on Claimed records). Unmapped values pass through
// unchanged so nothing is silently dropped.
const CLASSIFICATION_CANON = {
  recycler: "Pallet Recycler",
  "pallet recycler": "Pallet Recycler",
  manufacturer: "Pallet Manufacturer",
  "pallet manufacturer": "Pallet Manufacturer",
  "sawmill/lumber": "Sawmill / Lumber Supplier",
  "sawmill / lumber": "Sawmill / Lumber Supplier",
  "sawmill / lumber supplier": "Sawmill / Lumber Supplier",
  "specialty / crates": "Crate & Specialty Packaging Manufacturer",
  "specialty/crates": "Crate & Specialty Packaging Manufacturer",
  "crate & specialty packaging manufacturer": "Crate & Specialty Packaging Manufacturer",
  "broker / reseller": "Broker / Reseller / Distributor",
  "broker/reseller": "Broker / Reseller / Distributor",
  "broker / reseller / distributor": "Broker / Reseller / Distributor",
};

function canonClassification(value) {
  const key = String(value || "").trim().toLowerCase();
  return CLASSIFICATION_CANON[key] || String(value || "").trim();
}

// Coerce an Airtable field that may be a single string, an array of
// strings, or blank into a clean string[] (deduped, no empties).
function toArray(value) {
  if (value == null) return [];
  const arr = Array.isArray(value) ? value : [value];
  const out = [];
  for (const v of arr) {
    const s = String(v || "").trim();
    if (s && !out.includes(s)) out.push(s);
  }
  return out;
}

function parseCity(address) {
  if (!address) return "";
  const m = String(address).match(/,\s*([^,]+),\s*[A-Z]{2}\s+\d{5}/);
  return m ? m[1].trim() : "";
}

function parseState(address) {
  if (!address) return "";
  const m = String(address).match(/[, ]([A-Z]{2})[ ,]+\d{5}/);
  return m ? m[1] : "";
}

function deriveStatus(fields) {
  const ls = fields["Listing Status"];
  if (ls === "Verified") return "enhanced";
  if (ls === "Claimed") return "claimed";
  return "listed";
}

async function fetchPage(offset) {
  const fields = [
    "Vendor Name",
    "Google Address",
    "Latitude",
    "Longitude",
    "Listing Status",
    CAPABILITY_FIELDS.classification,
    CAPABILITY_FIELDS.services,
    CAPABILITY_FIELDS.palletTypes,
    CAPABILITY_FIELDS.treatments,
  ];
  const params = new URLSearchParams();
  // Dedupe field list and drop undefined/empty entries (CAPABILITY_FIELDS
  // values can be deleted at runtime when a 422 reports them missing).
  [...new Set(fields.filter((f) => typeof f === "string" && f))].forEach((f) =>
    params.append("fields[]", f)
  );
  params.set("pageSize", "100");
  params.set(
    "filterByFormula",
    "AND({Latitude} != BLANK(), {Longitude} != BLANK())"
  );
  if (offset) params.set("offset", offset);
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Vendors?${params}`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    // 422 with UNKNOWN_FIELD_NAME means an optional CAPABILITY_FIELDS entry
    // does not exist on the live base. Strip the missing field and retry
    // instead of failing the whole bake -- the Airtable path is the
    // dual-source diff partner during the Phase B validation window, and
    // a hard fail blocks validation. The Supabase path is the canonical
    // home for capability arrays anyway.
    if (resp.status === 422) {
      const match = txt.match(/Unknown field name:\s*\\?"([^"\\]+)/);
      const missingField = match ? match[1] : null;
      if (missingField) {
        const droppedKey = Object.keys(CAPABILITY_FIELDS).find(
          (k) => CAPABILITY_FIELDS[k] === missingField
        );
        if (droppedKey) {
          console.warn(
            `[warn] Airtable Vendors table has no '${missingField}' field; ` +
              `dropping CAPABILITY_FIELDS.${droppedKey} for this run.`
          );
          delete CAPABILITY_FIELDS[droppedKey];
          return fetchPage(offset);
        }
      }
      throw new Error(
        `Airtable HTTP 422 (unknown field name). Raw: ${txt.slice(0, 300)}`
      );
    }
    throw new Error(`Airtable HTTP ${resp.status}: ${txt.slice(0, 300)}`);
  }
  return resp.json();
}

async function main() {
  console.log("Exporting vendor index from Airtable...");
  const all = [];
  let offset = null;
  let page = 0;
  let withCapabilities = 0;
  do {
    page++;
    const data = await fetchPage(offset);
    const records = data.records || [];
    process.stdout.write(`  page ${page}: +${records.length} records ... `);
    let kept = 0;
    for (const r of records) {
      const address = r.fields["Google Address"] || "";
      const lat = r.fields["Latitude"];
      const lng = r.fields["Longitude"];
      if (typeof lat !== "number" || typeof lng !== "number") continue;

      const entry = {
        id: r.id,
        name: r.fields["Vendor Name"] || "",
        city: parseCity(address),
        state: parseState(address),
        lat,
        lng,
        status: deriveStatus(r.fields),
      };

      // Capability arrays - omit empty ones to keep the file small.
      const classification = toArray(
        r.fields[CAPABILITY_FIELDS.classification]
      ).map(canonClassification);
      const services = toArray(r.fields[CAPABILITY_FIELDS.services]);
      const palletTypes = toArray(r.fields[CAPABILITY_FIELDS.palletTypes]);
      const treatments = toArray(r.fields[CAPABILITY_FIELDS.treatments]);
      if (classification.length) entry.classification = classification;
      if (services.length) entry.services = services;
      if (palletTypes.length) entry.palletTypes = palletTypes;
      if (treatments.length) entry.treatments = treatments;
      if (
        services.length ||
        palletTypes.length ||
        treatments.length
      ) {
        withCapabilities++;
      }

      all.push(entry);
      kept++;
    }
    console.log(`kept ${kept}`);
    offset = data.offset;
    // Mild rate-limiting -- Airtable allows 5 req/sec per base
    if (offset) await new Promise((r) => setTimeout(r, 250));
  } while (offset);

  console.log(`\nTotal vendors with lat/lng: ${all.length}`);
  console.log(
    `  listed:   ${all.filter((v) => v.status === "listed").length}`
  );
  console.log(
    `  claimed:  ${all.filter((v) => v.status === "claimed").length}`
  );
  console.log(
    `  enhanced: ${all.filter((v) => v.status === "enhanced").length}`
  );
  console.log(
    `  with classification: ${all.filter((v) => v.classification).length}`
  );
  console.log(`  with services/types/treatments: ${withCapabilities}`);

  // Compact JSON (no whitespace)
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(all));
  const sizeKb = Math.round(fs.statSync(OUTPUT_PATH).size / 1024);
  console.log(`\nWrote ${OUTPUT_PATH} (${sizeKb} KB)`);
}

// Supabase path: one query against the canonical vendor_public_read view.
// View shape: id (text, airtable_record_id or ps_<8> synthetic), name,
// city, state, lat, lng, status, classifications[], services[],
// pallet_types[], treatments[], plus other fields the index does not bake.
// Status is already derived in-view (Verified->enhanced, Claimed->claimed,
// else listed) so this path inherits the same tier rule the Airtable path
// computes client-side.
//
// TEST RECORDS: as of 2026-06-01 the vendor_public_read view filters
// vendors.record_status = 'live'. The name-pattern hiding ("zz test", "ps
// qa", "delete after test", ...) we used to do here was retired -- the
// flag is the single mechanism now, applied uniformly to every surface
// that reads the view (this export, the network-site map, BuyerVendorFinder).
//
// To include test records (local dev / QA): flip the row's record_status
// from 'test' to 'live' in Supabase, re-bake, flip back.
function isPublicVendor() {
  return true;
}

async function mainSupabase() {
  console.log("Exporting vendor index from Supabase (vendor_public_read)...");
  // city is only populated on ~6/3,379 rows in vendor_public_read because
  // vendors.city was never parsed from the combined address string. We
  // request address + google_address from the view (added in migration
  // vendor_public_read_add_address_columns_v2) and derive city/state at
  // bake time via the same parseCity/parseState helpers the Airtable path
  // uses. address is 100% populated in the geocoded view; google_address
  // is a secondary fallback for the rare miss. Without this derivation,
  // buyer cards display "FL" instead of "Clearwater, FL" and the in-app
  // city-substring search silently matches nothing.
  const select =
    "id,name,city,state,lat,lng,status,classifications,services,pallet_types,treatments,service_radius_mi,hours_open,hours_close,days_open,address,google_address";
  // PostgREST defaults to a 1000-row max per request. Paginate with the
  // Range header until a short page comes back.
  const PAGE_SIZE = 1000;
  const base =
    `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/vendor_public_read` +
    `?select=${encodeURIComponent(select)}&order=id`;
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const rangeEnd = offset + PAGE_SIZE - 1;
    const resp = await fetch(base, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Accept: "application/json",
        Range: `${offset}-${rangeEnd}`,
        "Range-Unit": "items",
      },
    });
    if (!resp.ok && resp.status !== 206) {
      const txt = await resp.text().catch(() => "");
      throw new Error(`Supabase HTTP ${resp.status}: ${txt.slice(0, 300)}`);
    }
    const page = await resp.json();
    if (!Array.isArray(page)) {
      throw new Error(`Supabase: expected array, got ${typeof page}`);
    }
    rows.push(...page);
    process.stdout.write(
      `  fetched ${rows.length} rows (this page: ${page.length})\n`
    );
    if (page.length < PAGE_SIZE) break;
  }

  const all = [];
  let withCapabilities = 0;
  for (const r of rows) {
    if (typeof r.lat !== "number" || typeof r.lng !== "number") continue;
    // Test-record filter lives in the view (vendor_public_read filters
    // vendors.record_status = 'live'). 2026-06-01 -- isPublicVendor is now
    // a no-op kept only for the call site; see its definition above.
    if (!isPublicVendor(r.name)) continue;
    // Bake-time city/state derivation -- see comment above the select list.
    // Prefer the parsed column when present; otherwise parse from address,
    // then google_address. Same regex the Airtable path uses.
    const addressForParse = r.address || r.google_address || "";
    const city =
      (r.city && r.city.trim()) ||
      (addressForParse ? parseCity(addressForParse) : "") ||
      "";
    const state =
      (r.state && r.state.trim()) ||
      (addressForParse ? parseState(addressForParse) : "") ||
      "";
    const entry = {
      id: r.id,
      name: r.name || "",
      city,
      state,
      lat: r.lat,
      lng: r.lng,
      status: r.status || "listed",
    };
    // View arrays are already canonical strings (seeded from
    // CLASSIFICATION_CANON in the Phase A migration). Map view column
    // names to the index JSON's existing key naming: classifications ->
    // classification (singular, kept for client-side filter compat),
    // pallet_types -> palletTypes (camelCase).
    const classification = toArray(r.classifications);
    const services = toArray(r.services);
    const palletTypes = toArray(r.pallet_types);
    const treatments = toArray(r.treatments);
    const daysOpen = toArray(r.days_open);
    if (classification.length) entry.classification = classification;
    if (services.length) entry.services = services;
    if (palletTypes.length) entry.palletTypes = palletTypes;
    if (treatments.length) entry.treatments = treatments;
    // Coverage / hours -- added to the bake so the /vendors "WE FOUND
    // YOU" card can show a returning claimed vendor their REAL stored
    // values instead of "Not specified" placeholders. Only emitted when
    // present so unclaimed listings stay lean.
    if (Number.isFinite(r.service_radius_mi) && r.service_radius_mi > 0) {
      entry.serviceRadiusMi = r.service_radius_mi;
    }
    if (r.hours_open) entry.hoursOpen = r.hours_open;
    if (r.hours_close) entry.hoursClose = r.hours_close;
    if (daysOpen.length) entry.daysOpen = daysOpen;
    if (services.length || palletTypes.length || treatments.length) {
      withCapabilities++;
    }
    all.push(entry);
  }

  console.log(`\nTotal vendors with lat/lng: ${all.length}`);
  console.log(`  listed:   ${all.filter((v) => v.status === "listed").length}`);
  console.log(`  claimed:  ${all.filter((v) => v.status === "claimed").length}`);
  console.log(`  enhanced: ${all.filter((v) => v.status === "enhanced").length}`);
  console.log(
    `  with classification: ${all.filter((v) => v.classification).length}`
  );
  console.log(`  with services/types/treatments: ${withCapabilities}`);
  // Test-record skips are now done by the vendor_public_read view, not
  // by this export -- no per-row counter to report.

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(all));
  const sizeKb = Math.round(fs.statSync(OUTPUT_PATH).size / 1024);
  console.log(`\nWrote ${OUTPUT_PATH} (${sizeKb} KB)`);
}

const entry = VENDOR_SOURCE === "supabase" ? mainSupabase : main;
entry().catch((err) => {
  console.error("\nExport failed:");
  console.error(err);
  process.exit(1);
});
