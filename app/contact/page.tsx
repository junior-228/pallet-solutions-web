import type { Metadata } from "next";
import Link from "next/link";
import ContactForm from "@/components/ContactForm";

// ---------------------------------------------------------------------------
// /contact -intent-routing contact page. Built 2026-05-21 from the
// deployed-Vercel screenshots Rob provided, with the following fixes
// baked in vs the deployed version:
//
//   1. HQ city: Seaford, DE (not Wilmington). Matched in footer.tsx
//      same turn.
//   2. Email address: info@palletsolutionsusa.com (not hello@). All
//      direct lines, all mailto links.
//   3. Phone: 951-821-0364 (the canonical office line, updated across
//      the rebuild in a prior turn).
//   4. Market Pulse "founding seats remain" countdown REMOVED. Replaced with
//      "Founding rates open now" -a scarcity count we cannot
//      maintain is worse than no count.
//   5. "Same business day" appears ONCE -in the hero subhead. Removed
//      from the form intro and from below the Send button. No "within a
//      few hours" promise anywhere.
//   6. Press card relabeled from "Email press desk" to "Email us" since
//      there's no dedicated press desk staffed. Routes to mailto to the
//      general info@ inbox with a subject prefix for triage.
//
// Page structure (unchanged from the deployed version):
//   Hero -> Four-card "Pick the door" grid -> Catch-all form ->
//   Direct lines + Wire/ACH fraud notice (sidebar to the form).
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Contact - talk to us | Pallet Solutions",
  description:
    "Tell us which door you came through and we route to the right person. Same business day response on every inbound.",
};

const CONTACT_EMAIL = "info@palletsolutionsusa.com";
const CONTACT_PHONE_DISPLAY = "951-821-0364";
const CONTACT_PHONE_TEL = "tel:19518210364";

interface IntentCard {
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  href: string;
  external?: boolean;
  icon: React.ReactNode;
}

const INTENT_CARDS: IntentCard[] = [
  {
    eyebrow: "Sourcing",
    title: "Multi-DC pallet RFQ",
    body: "Add us to your next pallet RFQ - the same process you already run. Every line traceable to PSCI, no scoping call required.",
    ctaLabel: "Open the inquiry form",
    href: "/rfp",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 21h18" />
        <path d="M5 21V7l7-4 7 4v14" />
        <path d="M9 9h1" />
        <path d="M14 9h1" />
        <path d="M9 13h1" />
        <path d="M14 13h1" />
        <path d="M9 17h6" />
      </svg>
    ),
  },
  {
    eyebrow: "Procurement",
    title: "Cost intelligence",
    body: "The PSCI cost index, regional reads, and the 30-day forecast - published free as the intelligence behind our managed programs.",
    ctaLabel: "See what's moving",
    href: "/market-pulse",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 3v18h18" />
        <path d="M7 14l4-4 4 4 5-6" />
      </svg>
    ),
  },
  {
    eyebrow: "Vendors",
    title: "List my pallet company",
    body: "Claim or upgrade your listing in the 7,500-vendor network.",
    ctaLabel: "See listing tiers",
    href: "/vendors",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 17h2l1-2h8l1 2h2" />
        <path d="M3 17V8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9" />
        <circle cx="7.5" cy="17" r="1.5" />
        <circle cx="16.5" cy="17" r="1.5" />
      </svg>
    ),
  },
  {
    eyebrow: "Press & Analysts",
    title: "Press, analysts, partnerships",
    body: "PSCI methodology questions, interviews, partnership inquiries, brand assets.",
    ctaLabel: "Email us",
    href: `mailto:${CONTACT_EMAIL}?subject=Press%20or%20partnership%20inquiry`,
    external: true,
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6" />
        <path d="M9 17h6" />
      </svg>
    ),
  },
];

const FORM_TOPICS = [
  "Multi-DC pallet sourcing",
  "Market Pulse subscription",
  "Vendor listing",
  "Press / analysts",
  "Something else",
];

export default function ContactPage() {
  return (
    <>
      {/* HERO -"same business day" promise lives here ONLY (deduped
          from form intro + send button per Rob 2026-05-21). */}
      <section
        style={{
          backgroundColor: "rgb(247, 251, 253)",
          backgroundImage: `
            linear-gradient(to bottom, transparent 25%, rgb(247, 251, 253) 60%),
            linear-gradient(to right, rgba(73, 165, 193, 0.10) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(73, 165, 193, 0.10) 1px, transparent 1px)
          `,
          backgroundSize: "100% 100%, 48px 48px, 48px 48px",
          backgroundRepeat: "no-repeat, repeat, repeat",
        }}
      >
        <div className="mx-auto max-w-6xl px-6 pt-20 pb-20 sm:pt-28 sm:pb-24">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            Talk to us
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl sm:leading-[1.08]">
            Start the conversation.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-ink-700">
            Tell us which door you came through. We route to the right
            person and respond the same business day.
          </p>
        </div>
      </section>

      {/* PICK THE DOOR -four intent cards, 2x2 grid */}
      <section className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            Route by intent
          </p>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            Pick the door that matches what you need.
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-ink-700">
            We split inbound by intent so the right person responds, not
            the wrong one half a day later. Pick a door and we will route
            accordingly.
          </p>

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {INTENT_CARDS.map((card) =>
              card.external ? (
                <a
                  key={card.eyebrow}
                  href={card.href}
                  className="group flex flex-col rounded-xl border border-ink-200 bg-white p-7 hover:border-brand-300 hover:shadow-sm transition-all"
                >
                  <IntentCardInner card={card} />
                </a>
              ) : (
                <Link
                  key={card.eyebrow}
                  href={card.href}
                  className="group flex flex-col rounded-xl border border-ink-200 bg-white p-7 hover:border-brand-300 hover:shadow-sm transition-all"
                >
                  <IntentCardInner card={card} />
                </Link>
              )
            )}
          </div>
        </div>
      </section>

      {/* CATCH-ALL FORM + DIRECT LINES + WIRE NOTICE */}
      <section className="border-b border-ink-100 bg-ink-50/60">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
            {/* Form column */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
                Send a note
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
                Not sure where to start? Use the form.
              </h2>
              {/* Form intro -de-duped per Rob 2026-05-21. The "same
                  business day" promise lives ONCE on this page, in the
                  hero. The intro just says we read everything. */}
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-700">
                Anything that does not fit the routes above. We read every
                message and reply.
              </p>

              <ContactForm topics={FORM_TOPICS} />
            </div>

            {/* Direct lines + wire/ACH notice */}
            <aside className="flex flex-col gap-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
                  Direct lines
                </p>

                <ul className="mt-6 space-y-5">
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 text-brand-500" aria-hidden="true">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="5" width="18" height="14" rx="2" />
                        <path d="M3 7l9 6 9-6" />
                      </svg>
                    </span>
                    <div>
                      <a
                        href={`mailto:${CONTACT_EMAIL}`}
                        className="text-base font-semibold text-ink-900 hover:text-brand-700"
                      >
                        {CONTACT_EMAIL}
                      </a>
                      <p className="mt-0.5 text-xs text-ink-600">
                        General inbox, monitored 8am-6pm ET
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 text-brand-500" aria-hidden="true">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </span>
                    <div>
                      <a
                        href={CONTACT_PHONE_TEL}
                        className="text-base font-semibold text-ink-900 hover:text-brand-700"
                      >
                        {CONTACT_PHONE_DISPLAY}
                      </a>
                      <p className="mt-0.5 text-xs text-ink-600">
                        Office line, Mon-Fri 8am-6pm ET
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 text-brand-500" aria-hidden="true">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-base font-semibold text-ink-900">
                        Seaford, DE
                      </p>
                      <p className="mt-0.5 text-xs text-ink-600">
                        Headquarters
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Wire/ACH fraud notice -kept verbatim from the deployed
                  version. This is the trust block buyers cross-check
                  against when they get a phishing email pretending to be
                  us. Do not soften the language. */}
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                  Wire / ACH notice
                </p>
                <p className="mt-2 text-sm leading-relaxed text-amber-900">
                  Our office never makes changes to wire or ACH
                  transactions via email. If you receive an email
                  purporting to be from us with banking-change
                  instructions, call the office line above to verify
                  before acting.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}

function IntentCardInner({ card }: { card: IntentCard }) {
  return (
    <>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-50 text-brand-600">
          {card.icon}
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500">
          {card.eyebrow}
        </p>
      </div>
      <h3 className="mt-4 text-xl font-semibold text-ink-900">
        {card.title}
      </h3>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-700">
        {card.body}
      </p>
      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 group-hover:text-brand-700">
        {card.ctaLabel}
        <span aria-hidden="true">→</span>
      </span>
    </>
  );
}
