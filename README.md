# Pallet Solutions USA - Web Platform

The public site and self-serve tooling for Pallet Solutions USA, a managed pallet sourcing company. Built solo on the Next.js App Router as a component-driven front end backed by a build-time data pipeline. Published here as a work sample.

Live (current production): https://palletsolutionsusa.com
This repo: an in-progress rebuild migrating those pages to a cleaner architecture. Not yet the production deployment.

## What it does

- **Vendor Network** - an interactive map of pallet vendors (Leaflet + react-simple-maps) with search, radius, and coverage views, rendered from a baked vendor index.
- **Market intelligence** - a published cost index and regional market "reads" generated from public federal data by a build-time pipeline, with interactive charts and forecast bands.
- **Market Pulse** - a single-region cost snapshot.
- **Lead capture / RFQ** - quote-request and contact flows posting to serverless endpoints.

## Tech stack

- **Framework:** Next.js 16 (App Router, static export)
- **Language:** TypeScript, end to end (~26k LOC)
- **UI:** React 19, Tailwind CSS 4
- **Maps / geo:** Leaflet, react-simple-maps, TopoJSON
- **Data:** Supabase and Airtable, via serverless functions and a build-time export
- **Hosting:** Netlify

## Architecture

- **Static export + serverless split.** Pages are pre-rendered for speed; dynamic actions (lead submission, vendor lookups) hit Netlify serverless functions. Nothing to keep warm.
- **Build-time data pipeline.** `scripts/` pulls source data from Supabase and bakes versioned JSON into `data/`, so published values are computed once at build rather than fetched on every request.
- **Single source of truth.** Every surface that shows a given number reads it from the same generated JSON, so the cost index can't disagree with itself from one page to the next.
- **Typed domain model.** Vendor records, regions, and index values are typed in `lib/` (for example `vendor-types.ts`, `zipToRegion.ts`) and shared across components.
- **Secrets via environment only.** All credentials are read from `process.env.*`; none are committed (see `.gitignore`).

## Running locally

Requires Node.js 20+ and npm.

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build / static export
```

### Environment variables

Create `.env.local` and supply your own values for the names below. No real values are stored in this repo.

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
AIRTABLE_API_KEY=
AIRTABLE_BASE_ID=
RESEND_API_KEY=
```

`.env*` files are gitignored and must never be committed.

## Project structure

```
app/          App Router routes (home, market-pulse, atlas, vendors, ...)
components/   React components - maps, charts, vendor finder, forms (34)
lib/          typed helpers - cost index, ZIP-to-region, lead submission
scripts/      build-time data pipeline (Supabase to JSON)
data/         generated JSON read at build time
public/       static assets and geo data
```

## Screenshots

The fastest way to see it running is the live site: https://palletsolutionsusa.com. This rebuild is migrating those pages; static screenshots to follow.

## License

(c) Pallet Solutions USA. Published as a work sample, not licensed for reuse.
