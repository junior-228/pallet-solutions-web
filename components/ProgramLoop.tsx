"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

// Companion to HowItWorksSteps - same motion system, different axis. Same
// engine (IntersectionObserver, fires ONCE), easing (ease-out), stagger
// (120ms), color (#49a5c1), and circle-pop. The DIFFERENCE: the steps draw a
// VERTICAL line once and rest; this loop assembles HORIZONTALLY then gently
// CYCLES forever (the "approve once, runs every cycle" story made literal).
//
// Safety mirrors the step component: content is visible by DEFAULT; JS adds
// `pl--armed` on mount to install the hidden start state, so no-JS /
// pre-hydration / a fast scroller never hit blank content. Reduced-motion
// falls back to fully static via globals.css.

type Stage = { label: string; detail: string; icon: ReactNode };

export default function ProgramLoop({ stages }: { stages: Stage[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setArmed(true);
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setInView(true);
            obs.unobserve(e.target); // animate once
          }
        });
      },
      { threshold: 0.25 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`pl mt-14 rounded-2xl bg-white px-4 py-12 shadow-xl shadow-ink-900/[0.06] ring-1 ring-ink-200/70 sm:px-10 ${
        armed ? "pl--armed" : ""
      } ${inView ? "pl--in" : ""}`}
    >
      <div className="flex flex-col md:flex-row md:items-start md:justify-between">
        {stages.map((stage, i) => (
          <Fragment key={stage.label}>
            <div
              className="pl__node flex flex-1 flex-row items-center gap-4 md:flex-col md:items-center md:gap-3 md:text-center"
              style={{ "--i": i } as CSSProperties}
            >
              <div className="pl__icon flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white shadow-md">
                {stage.icon}
              </div>
              <div className="md:px-1">
                <p className="text-sm font-semibold text-ink-900">
                  {stage.label}
                </p>
                <p className="mt-1 text-xs leading-snug text-ink-600">
                  {stage.detail}
                </p>
              </div>
            </div>
            {i < stages.length - 1 && (
              <div
                aria-hidden="true"
                className="pl__arrow flex items-center justify-center py-3 text-brand-300 md:px-1 md:pt-7"
                style={{ "--i": i } as CSSProperties}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="rotate-90 md:rotate-0"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </div>
            )}
          </Fragment>
        ))}
      </div>

      <div className="mt-10 flex justify-center">
        <span className="pl__pill inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide text-brand-700">
          <svg
            className="pl__pill-icon"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.36 2.64L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          Repeats every cycle - sourcing stays competitive year-round
        </span>
      </div>
    </div>
  );
}
