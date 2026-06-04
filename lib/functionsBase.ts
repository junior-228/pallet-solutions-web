// functionsBase.ts -- single source of truth for the Netlify functions origin.
//
// This rebuild is a STATIC export with no server runtime, so every server call
// goes to the network site's Netlify functions. NEXT_PUBLIC_FUNCTIONS_BASE is
// BAKED into the bundle at build time. The foot-gun: a localhost value left in
// .env.local ships to production and makes EVERY function call fail with
// "Failed to fetch" - an https page cannot call http://localhost (browsers
// block it as mixed content).
//
// resolveFunctionsBase() guards against that: if the baked value points at
// localhost/127.0.0.1 but the page is actually served from a real (non-local)
// host, it ignores the baked value and uses production. So even a bad build
// can't break the live site. Local `netlify dev` (page on localhost) still
// honors the localhost base.
//
// Import FUNCTIONS_BASE from here everywhere instead of reading
// process.env.NEXT_PUBLIC_FUNCTIONS_BASE directly.
//
// Created 2026-06-02.

export const PROD_FUNCTIONS_BASE = "https://network.palletsolutionsusa.com";

export function resolveFunctionsBase(): string {
  const baked = process.env.NEXT_PUBLIC_FUNCTIONS_BASE || "";
  const isLocalBase = /localhost|127\.0\.0\.1/i.test(baked);
  if (typeof window !== "undefined") {
    const onLocalHost = /localhost|127\.0\.0\.1/i.test(
      window.location.hostname
    );
    if (isLocalBase && !onLocalHost) return PROD_FUNCTIONS_BASE;
  }
  return baked || PROD_FUNCTIONS_BASE;
}

export const FUNCTIONS_BASE = resolveFunctionsBase();
