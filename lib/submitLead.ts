// Shared client helper: POST a marketing-form lead to the web-lead Netlify
// function on the network site. Mirrors the must-succeed pattern used by
// BuyerVendorFinder (capture is the durable artifact; only treat it as a
// success when the row actually landed). Every marketing form on the rebuild
// (RFQ, scoping, contact, Market Pulse reserve/waitlist) routes through here.
//
// The function base is the network site, which already CORS-allow-lists this
// rebuild's origin. Override with NEXT_PUBLIC_FUNCTIONS_BASE if needed.

import { FUNCTIONS_BASE } from "./functionsBase";

const WEB_LEAD_URL = `${FUNCTIONS_BASE}/.netlify/functions/web-lead`;

export type WebLeadResult = { ok: boolean; requestId?: string; error?: string };

export type WebLeadFormType =
  | "rfq"
  | "scoping"
  | "contact"
  | "market-pulse-reserve"
  | "market-pulse-waitlist"
  // Vendor-side Tuesday Report founding-rate reservation from
  // /tuesday-report (2026-06-02). Lands in public.web_leads with payload
  // jsonb carrying corridor + intent.
  | "tuesday-report-reservation";

export async function submitWebLead(
  payload: Record<string, unknown> & {
    form_type: WebLeadFormType;
    email: string;
  },
): Promise<WebLeadResult> {
  try {
    const res = await fetch(WEB_LEAD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({ ok: false }));
    if (!res.ok || !data.ok) {
      return {
        ok: false,
        error: data.error || `Submit failed (HTTP ${res.status})`,
      };
    }
    return { ok: true, requestId: data.requestId };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
