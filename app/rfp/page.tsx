import type { Metadata } from "next";
import RfqForm from "@/components/RfqForm";
import DarkBarFx from "@/components/DarkBarFx";
import AnimatedChecklist from "@/components/AnimatedChecklist";

export const metadata: Metadata = {
  title: "Add us to your RFQ | Pallet Solutions",
  description:
    "Add Pallet Solutions to your next pallet RFQ. We respond inside your timeline with bids you can defend against PSCI, full compliance packet on request.",
};

const TRUST_BULLETS = [
  "Send the bid when you're ready - we respond inside your window",
  "Quotes for every site, US and Canada",
  "Pricing you can defend to finance - read against PSCI™, the public index",
  "Insurance, references, and operating history whenever you need them",
];

export default function RFQPage() {
  return (
    <>
      {/* HERO - same grounded depth as the sourcing hero: a faint single-hue
          grid (structure) under a low-opacity blue light source (support),
          grid edge-faded with a radial mask so it never hard-cuts at the nav
          or the dark form section below. Pure CSS - no fetch, no layout shift. */}
      <section className="relative overflow-hidden bg-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(73,165,193,0.13) 1px, transparent 1px), linear-gradient(to bottom, rgba(73,165,193,0.13) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(ellipse 80% 74% at 50% 44%, #000 46%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 74% at 50% 44%, #000 46%, transparent 100%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 -right-32 h-[680px] w-[680px] rounded-full bg-brand-500/[0.10] blur-[130px]"
        />
        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-14 sm:pt-28 sm:pb-16">
          <div className="max-w-4xl">
            <h1 className="text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl sm:leading-[1.08]">
              Add us to your next pallet RFQ
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-relaxed text-ink-600">
              Same RFQ process you already use. Every line we quote traces
              to PSCI™, so you can explain it to finance.
            </p>
          </div>
        </div>
      </section>

      {/* TRUST BULLETS */}
      <section className="bg-white border-t border-ink-100">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="mx-auto max-w-3xl rounded-2xl border border-brand-200 bg-white p-8 md:p-10">
            <AnimatedChecklist items={TRUST_BULLETS} />
          </div>
        </div>
      </section>

      {/* RFQ INTAKE FORM - intentionally minimal, just email + timeline */}
      <section className="relative overflow-hidden bg-ink-900 text-white border-y-2 border-brand-500">
        <DarkBarFx />
        <div className="relative z-10 mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Tell us when you're going to market
            </h2>
            <p className="mt-5 text-base leading-relaxed text-ink-300">
              Drop your work email and the rough timeline. We follow up with
              what we need to be included in your RFQ. No deck, no
              procurement consultant required.
            </p>

            <RfqForm source="rfp-page" />

            <p className="mt-8 text-xs text-ink-400">
              Going to market soon? Email us at{" "}
              <a
                href="mailto:info@palletsolutionsusa.com"
                className="text-brand-400 hover:text-brand-300 underline decoration-ink-600 underline-offset-2"
              >
                info@palletsolutionsusa.com
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
