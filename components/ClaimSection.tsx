"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// ClaimSection -the on-page claim form inside the dark closing band on
// /vendors. Replaces the "external link to network.palletsolutionsusa.com"
// pattern with an in-place form that POSTs directly to vendor-claim.js.
//
// 2026-05-21 -task #39. Built step 1 of the claim flow:
//
//   - Click "Claim your listing" button → button slides right + fades out,
//     form unfolds in its place. Pure CSS transitions, no Framer Motion.
//   - Company name field uses live typeahead against vendor-typeahead.js
//     (debounced 300ms). Results show name + state for disambiguation.
//   - Selecting a result stores vendorId so the claim links to the existing
//     Airtable record. "Don't see your business?" lets vendors type manually
//     without a vendorId match.
//   - Submit POSTs to vendor-claim.js with holdForReview=true. This creates
//     a Vendor Claims row in Airtable + sends Rob a [REVIEW] email, but
//     does NOT auto-flip the vendor record's Listing Status. Rob approves
//     manually before the listing goes live on the network map.
//
// === HOW THE OPEN-FORM TRIGGER WORKS ===
//
// The hero CTA and the Final CTA on /vendors both link to "#claim" so
// clicking them scroll-anchors to this section AND opens the form. The
// component listens for the URL hash on mount and on hashchange events,
// auto-opening when hash is "#claim". This avoids prop-drilling or context
// for a small interaction.
//
// === FIELDS CAPTURED (step 1) ===
//
//   Required: company, firstName, email
//   Optional: lastName, phone, businessType, website
//
// Step 2 (richer profile: capabilities, treatments, hours, service area,
// description, classification multi-select) is deferred -ship the minimum
// viable claim flow, learn what step 2 should look like from real traffic.
// Tracked separately as part of task #36.
//
// === CORS REALITY ===
//
// vendor-typeahead.js and vendor-claim.js (on network.palletsolutionsusa.com)
// gate cross-origin requests via an ALLOWED_ORIGINS array. As of 2026-05-21
// this array includes:
//   - http://localhost:3000          (dev, just added)
//   - https://palletsolutionsusa.com (marketing site, future home)
//   - the network site itself
//   - the marketing Netlify alias
//
// MISSING and required for the production deploy of this Vercel rebuild:
// add this rebuild's production deploy URL to ALLOWED_ORIGINS in BOTH
// see-your-network-enterprise/netlify/functions/vendor-typeahead.js AND
// see-your-network-enterprise/netlify/functions/vendor-claim.js, then
// deploy the network site:
//
//   cd see-your-network-enterprise
//   npx netlify deploy --prod --dir=. --functions=netlify/functions \
//     --site=33f5b8da-b159-4f63-a3ef-f101afdf59a7 \
//     --skip-functions-cache
//
// Without that step, the form works in dev but CORS-fails in prod.
// ---------------------------------------------------------------------------

const NETWORK_BASE = "https://network.palletsolutionsusa.com";
const TYPEAHEAD_URL = `${NETWORK_BASE}/.netlify/functions/vendor-typeahead`;
const CLAIM_URL = `${NETWORK_BASE}/.netlify/functions/vendor-claim`;

type TypeaheadResult = {
  id: string;
  name: string;
  state: string;
  address: string;
  phone: string;
};

type FormState = {
  company: string;
  vendorId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  businessType: string;
  website: string;
};

const INITIAL_FORM: FormState = {
  company: "",
  vendorId: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  businessType: "",
  website: "",
};

const CLASSIFICATIONS = [
  "Recycler",
  "Manufacturer",
  "Sawmill / Lumber",
  "Specialty / Crates",
  "Broker / Reseller",
];

export default function ClaimSection() {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [results, setResults] = useState<TypeaheadResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionRef = useRef<HTMLDivElement | null>(null);

  // Form stays collapsed on page load and only opens when the vendor
  // clicks the "Claim your listing" button on this section. The auto-open-
  // from-hash behavior was removed 2026-05-21 -per Rob, the form should
  // require an explicit click to expand, even when arriving via an anchor
  // link from elsewhere on the page. The #claim id on this container still
  // works as a scroll anchor (browsers handle that), but doesn't trigger
  // auto-open.

  // Typeahead -debounced 300ms. Fires GET against vendor-typeahead.js.
  //
  // Race-condition guard (added 2026-05-22): each effect run creates an
  // AbortController. When the effect re-runs because form.company changed,
  // the cleanup aborts any in-flight fetch from the previous query.
  // Without this, a slower fetch for an older query (e.g. "ab") could
  // resolve AFTER a faster fetch for a newer query (e.g. "abc") and
  // overwrite the correct results -- producing the "abc returns vendors
  // matching ab" bug caught in production testing.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = form.company.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const ac = new AbortController();
    debounceRef.current = setTimeout(async () => {
      try {
        const resp = await fetch(
          `${TYPEAHEAD_URL}?q=${encodeURIComponent(q)}`,
          { signal: ac.signal }
        );
        if (!resp.ok) {
          setResults([]);
          return;
        }
        const data = await resp.json();
        setResults(Array.isArray(data.results) ? data.results : []);
      } catch (e: unknown) {
        // AbortError fires when a newer query supersedes this one --
        // don't clear results in that case (the newer query is in flight
        // and will populate its own results when it resolves). Any other
        // error (network failure, JSON parse error, etc.) clears results
        // so the dropdown doesn't show stale matches from a prior query.
        if (e instanceof Error && e.name === "AbortError") return;
        setResults([]);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      ac.abort();
    };
  }, [form.company]);

  function handleSelectVendor(v: TypeaheadResult) {
    setForm((f) => ({ ...f, company: v.name, vendorId: v.id }));
    setSearchOpen(false);
    setResults([]);
  }

  function handleManualEntry() {
    setForm((f) => ({ ...f, vendorId: "" }));
    setSearchOpen(false);
  }

  function handleField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    // If the user edits the company name after picking a typeahead match,
    // drop the vendorId (it no longer corresponds to what they typed).
    if (key === "company") {
      setForm((f) => ({ ...f, vendorId: "" }));
      setSearchOpen(true);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.company.trim()) {
      setError("Company name is required.");
      return;
    }
    if (!form.firstName.trim()) {
      setError("First name is required.");
      return;
    }
    if (!form.email.trim()) {
      setError("Email is required.");
      return;
    }
    setSubmitting(true);
    try {
      const resp = await fetch(CLAIM_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: form.company.trim(),
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          businessType: form.businessType.trim(),
          website: form.website.trim(),
          vendorId: form.vendorId,
          source: "vendors_page_claim_form",
          holdForReview: true,
          region: "us",
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setError(
          data?.error ||
            "Something went wrong submitting your claim. Please try again or email info@palletsolutionsusa.com."
        );
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
      setSubmitting(false);
    } catch {
      setError(
        "Couldn't reach the network. Check your connection and try again, or email info@palletsolutionsusa.com."
      );
      setSubmitting(false);
    }
  }

  // === SUCCESS STATE ===
  if (submitted) {
    return (
      <div className="mt-9 max-w-2xl rounded-xl bg-white p-7 sm:p-9">
        <div className="flex items-start gap-4">
          <span className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white">
            <svg
              width="20"
              height="20"
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
          <div>
            <h3 className="text-xl font-semibold text-ink-900">
              Claim submitted.
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-700">
              Thanks,{" "}
              <span className="font-semibold">{form.firstName}</span>.
              We&apos;ll call within one business day to introduce
              ourselves and walk through the rest of your profile --
              service area, capabilities, hours, treatments. Your claimed
              listing publishes right after we connect.
            </p>
            <p className="mt-3 text-sm text-ink-700">
              We&apos;ll be in touch at{" "}
              <span className="font-semibold">{form.email}</span>
              {form.phone && (
                <>
                  {" "}or{" "}
                  <span className="font-semibold">{form.phone}</span>
                </>
              )}
              .
            </p>
            <p className="mt-3 text-xs text-ink-500">
              Founding-period free-for-life pricing is locked in as of now.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={sectionRef} id="claim" className="mt-9 scroll-mt-24">
      {/* CTA button -visible when the form is closed. Slides right + fades
          out on click. */}
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`
            inline-flex items-center gap-2 rounded-full bg-brand-500 px-6
            py-3 text-sm font-semibold text-white hover:bg-brand-600
            transition-all duration-300
            ${
              isOpen
                ? "translate-x-12 opacity-0 pointer-events-none"
                : "translate-x-0 opacity-100"
            }
          `}
        >
          Claim your listing
          <span aria-hidden="true">→</span>
        </button>
        {!isOpen && (
          <span className="text-sm text-ink-400">
            Free for life if claimed before Oct 31, 2026.
          </span>
        )}
      </div>

      {/* Form -hidden until isOpen. Expands height + fades in. */}
      <div
        className={`
          overflow-hidden transition-all
          ${
            isOpen
              ? "max-h-[1600px] opacity-100 duration-500 delay-150"
              : "max-h-0 opacity-0 duration-200"
          }
        `}
      >
        <form
          onSubmit={handleSubmit}
          className="mt-2 max-w-2xl rounded-xl bg-white p-6 sm:p-8 space-y-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-ink-900">
                Claim your listing
              </h3>
              <p className="mt-1.5 text-sm text-ink-600">
                Fill in your primary contact. We&apos;ll call within one
                business day to introduce ourselves and walk through the
                rest of your profile, then publish your claimed listing.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-ink-400 hover:text-ink-700 text-2xl leading-none"
              aria-label="Close form"
            >
              ×
            </button>
          </div>

          {/* Company name with typeahead */}
          <div className="relative">
            <label
              htmlFor="claim-company"
              className="block text-xs font-semibold uppercase tracking-wider text-ink-500 mb-1.5"
            >
              Company name
            </label>
            <input
              id="claim-company"
              type="text"
              required
              autoComplete="organization"
              value={form.company}
              onChange={(e) => {
                handleField("company", e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Start typing your business name..."
              className="w-full rounded-md border border-ink-200 bg-white px-4 py-2.5 text-sm text-ink-900 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
            />
            {form.vendorId && (
              <p className="mt-1.5 text-xs text-emerald-700">
                ✓ Matched to existing listing
              </p>
            )}
            {searchOpen && results.length > 0 && !form.vendorId && (
              <div className="absolute z-10 mt-1 w-full rounded-md border border-ink-200 bg-white shadow-lg max-h-60 overflow-auto">
                {results.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSelectVendor(r)}
                    className="w-full text-left px-4 py-2.5 hover:bg-brand-50 border-b border-ink-100 last:border-b-0"
                  >
                    <div className="text-sm font-semibold text-ink-900">
                      {r.name}{" "}
                      {r.state && (
                        <span className="text-xs font-normal text-ink-500">
                          ({r.state})
                        </span>
                      )}
                    </div>
                    {r.address && (
                      <div className="text-xs text-ink-500 truncate">
                        {r.address}
                      </div>
                    )}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleManualEntry}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold text-brand-600 hover:bg-brand-50"
                >
                  Don&apos;t see your business? Use what I typed →
                </button>
              </div>
            )}
          </div>

          {/* Name fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="claim-first"
                className="block text-xs font-semibold uppercase tracking-wider text-ink-500 mb-1.5"
              >
                First name
              </label>
              <input
                id="claim-first"
                type="text"
                required
                autoComplete="given-name"
                value={form.firstName}
                onChange={(e) => handleField("firstName", e.target.value)}
                className="w-full rounded-md border border-ink-200 bg-white px-4 py-2.5 text-sm text-ink-900 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
              />
            </div>
            <div>
              <label
                htmlFor="claim-last"
                className="block text-xs font-semibold uppercase tracking-wider text-ink-500 mb-1.5"
              >
                Last name <span className="text-ink-400 normal-case font-normal">(optional)</span>
              </label>
              <input
                id="claim-last"
                type="text"
                autoComplete="family-name"
                value={form.lastName}
                onChange={(e) => handleField("lastName", e.target.value)}
                className="w-full rounded-md border border-ink-200 bg-white px-4 py-2.5 text-sm text-ink-900 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="claim-email"
                className="block text-xs font-semibold uppercase tracking-wider text-ink-500 mb-1.5"
              >
                Email
              </label>
              <input
                id="claim-email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => handleField("email", e.target.value)}
                className="w-full rounded-md border border-ink-200 bg-white px-4 py-2.5 text-sm text-ink-900 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
              />
            </div>
            <div>
              <label
                htmlFor="claim-phone"
                className="block text-xs font-semibold uppercase tracking-wider text-ink-500 mb-1.5"
              >
                Phone <span className="text-ink-400 normal-case font-normal">(optional)</span>
              </label>
              <input
                id="claim-phone"
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => handleField("phone", e.target.value)}
                className="w-full rounded-md border border-ink-200 bg-white px-4 py-2.5 text-sm text-ink-900 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
              />
            </div>
          </div>

          {/* Classification + Website */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="claim-classification"
                className="block text-xs font-semibold uppercase tracking-wider text-ink-500 mb-1.5"
              >
                Classification <span className="text-ink-400 normal-case font-normal">(optional)</span>
              </label>
              <select
                id="claim-classification"
                value={form.businessType}
                onChange={(e) => handleField("businessType", e.target.value)}
                className="w-full rounded-md border border-ink-200 bg-white px-4 py-2.5 text-sm text-ink-900 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
              >
                <option value="">Choose one...</option>
                {CLASSIFICATIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="claim-website"
                className="block text-xs font-semibold uppercase tracking-wider text-ink-500 mb-1.5"
              >
                Website <span className="text-ink-400 normal-case font-normal">(optional)</span>
              </label>
              <input
                id="claim-website"
                type="url"
                autoComplete="url"
                placeholder="https://..."
                value={form.website}
                onChange={(e) => handleField("website", e.target.value)}
                className="w-full rounded-md border border-ink-200 bg-white px-4 py-2.5 text-sm text-ink-900 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
              />
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "Submit claim"}
              {!submitting && <span aria-hidden="true">→</span>}
            </button>
            <p className="text-xs text-ink-500 leading-snug max-w-sm">
              Quick intro call within one business day to walk through your
              full profile. Your listing publishes right after we connect.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
