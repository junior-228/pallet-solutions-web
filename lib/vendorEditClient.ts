// vendorEditClient.ts -- client-side helpers for the vendor edit-after-claim
// flow. POST endpoints live on the network site (Netlify functions); this
// rebuild is a static export with no server runtime, so all server logic
// runs there. The functions' CORS allowlist includes this origin.
//
// Three calls, mirroring the three Netlify functions:
//   - requestEditLink({ email })      -> always { ok: true } neutral
//   - verifyEditToken({ token })      -> { ok, editor? }     (no consume)
//   - saveEditFields({ token, fields }) -> { ok, fields? }   (consumes token)
//
// Created 2026-06-01 alongside vendor-edit-request.js / verify.js / save.js.

import { FUNCTIONS_BASE } from "./functionsBase";

const REQUEST_URL = `${FUNCTIONS_BASE}/.netlify/functions/vendor-edit-request`;
const VERIFY_URL = `${FUNCTIONS_BASE}/.netlify/functions/vendor-edit-verify`;
const SAVE_URL = `${FUNCTIONS_BASE}/.netlify/functions/vendor-edit-save`;
const TR_OFFER_URL = `${FUNCTIONS_BASE}/.netlify/functions/vendor-tr-offer`;
const TR_CHECKOUT_URL = `${FUNCTIONS_BASE}/.netlify/functions/vendor-tr-checkout`;

// Shape returned by vendor-edit-verify.js. Matches the editor prefill the
// claim modal (in edit mode) consumes.
export type EditorPrefill = {
  recordId: string;
  vendorRowId?: string;
  vendorName: string;
  city?: string;
  state?: string;
  address: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  classifications: string[];
  services: string[];
  palletTypes: string[];
  treatments: string[];
  serviceRadiusMi: number | null;
  hoursOpen: string;
  hoursClose: string;
  daysOpen: string[];
  website: string;
  listingStatus: string;
  // Tuesday Report offer gate (2026-06-02). Drives whether the success panel
  // shows the offer: show ONLY if both are false.
  tuesdayReportReserved: boolean;
  tuesdayReportSeen: boolean;
  tuesdayReportSubscribed: boolean;
};

// Start a LIVE Tuesday Report subscription checkout. POSTs to vendor-tr-checkout
// which creates a Stripe Checkout session ($9.99/mo) server-side and returns the
// hosted checkout URL. The caller redirects the browser to it. No card data ever
// touches our code. Returns { ok, url? }.
export async function startTuesdayReportCheckout(
  vendorId: string,
  email: string,
  returnOrigin: string
): Promise<{ ok: boolean; url?: string }> {
  try {
    const res = await fetch(TR_CHECKOUT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorId, email, returnOrigin }),
    });
    const data = await res.json().catch(() => ({ ok: false }));
    return { ok: !!data?.ok && !!data?.url, url: data?.url };
  } catch {
    return { ok: false };
  }
}

// Mark the Tuesday Report offer "seen" (when shown) or "reserve" it (deliberate
// click). Reserve also captures the founding-cohort reservation server-side.
// Best-effort: on any failure we resolve falsy so the UI degrades gracefully.
export async function markTuesdayReportOffer(
  vendorId: string,
  action: "seen" | "reserve"
): Promise<{ ok: boolean }> {
  try {
    const res = await fetch(TR_OFFER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorId, action }),
    });
    const data = await res.json().catch(() => ({ ok: false }));
    return { ok: !!data?.ok };
  } catch {
    return { ok: false };
  }
}

// Shape submitted by the editor on save. Matches buildAirtablePatch on the
// server side. All fields optional -- omitted fields keep their existing
// Airtable values.
export type EditorPatch = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  website?: string;
  classifications?: string[];
  services?: string[];
  palletTypes?: string[];
  treatments?: string[];
  serviceRadiusMi?: number | null;
  hoursOpen?: string;
  hoursClose?: string;
  daysOpen?: string[];
};

export type RequestResult = { ok: boolean; message?: string };

export async function requestEditLink(email: string): Promise<RequestResult> {
  try {
    const res = await fetch(REQUEST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({ ok: false }));
    // The server ALWAYS returns 200 + a neutral message on this endpoint
    // (anti-fishing). Trust it.
    return {
      ok: !!data?.ok,
      message:
        data?.message ||
        "If that email is on a claimed listing, we sent a link. Check your inbox.",
    };
  } catch {
    // Even on a network error, surface the neutral message so the UI does
    // not give a different signal for "couldn't reach server" vs "no match
    // on file." The user can retry.
    return {
      ok: true,
      message:
        "If that email is on a claimed listing, we sent a link. Check your inbox.",
    };
  }
}

export type VerifyResult =
  | { ok: true; editor: EditorPrefill; editors: EditorPrefill[] }
  | { ok: false; error: string; message: string };

export async function verifyEditToken(token: string): Promise<VerifyResult> {
  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.ok && data?.editor) {
      // editors[] is the multi-location array (one company, several listings
      // claimed with the same email). Older server builds only send `editor`;
      // fall back to a one-element array so the client always has editors[].
      const editors: EditorPrefill[] = Array.isArray(data.editors)
        ? (data.editors as EditorPrefill[])
        : [data.editor as EditorPrefill];
      return { ok: true, editor: data.editor as EditorPrefill, editors };
    }
    return {
      ok: false,
      error: typeof data?.error === "string" ? data.error : "invalid_token",
      message:
        typeof data?.message === "string"
          ? data.message
          : "This edit link is not valid. Request a new one and try again.",
    };
  } catch (e) {
    return {
      ok: false,
      error: "network",
      message:
        e instanceof Error
          ? `Could not reach the server (${e.message}). Try again in a minute.`
          : "Could not reach the server. Try again in a minute.",
    };
  }
}

export type SaveResult =
  | { ok: true; recordId: string; fields: Record<string, unknown> }
  | { ok: false; error: string; message: string };

export async function saveEditFields(
  token: string,
  fields: EditorPatch,
  recordId?: string
): Promise<SaveResult> {
  try {
    const res = await fetch(SAVE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // recordId tells the server WHICH location to save (multi-location).
      // Omitted -> server falls back to the token's own vendor.
      body: JSON.stringify({ token, fields, recordId }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.ok && data?.recordId) {
      return {
        ok: true,
        recordId: String(data.recordId),
        fields: (data.fields as Record<string, unknown>) || {},
      };
    }
    return {
      ok: false,
      error: typeof data?.error === "string" ? data.error : "save_failed",
      message:
        typeof data?.message === "string"
          ? data.message
          : "Could not save right now. Try again in a minute.",
    };
  } catch (e) {
    return {
      ok: false,
      error: "network",
      message:
        e instanceof Error
          ? `Could not reach the server (${e.message}). Try again in a minute.`
          : "Could not reach the server. Try again in a minute.",
    };
  }
}
