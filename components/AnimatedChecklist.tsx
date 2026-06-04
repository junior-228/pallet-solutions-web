"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

// Part of the /sourcing + /rfp motion system (with HowItWorksSteps,
// ProgramLoop, WorkTransferTable). Same engine (IntersectionObserver, fires
// ONCE), easing (ease-out), stagger (120ms), color (#49a5c1): the list
// assembles top-to-bottom, each checkmark pops in as its line appears, then it
// sits static. Visible by default; JS adds `ckl--armed` to install the hidden
// start state, so no-JS / pre-hydration / a fast scroller never gate the read.
// Reduced-motion falls back to fully static via globals.css.

export default function AnimatedChecklist({ items }: { items: string[] }) {
  const ref = useRef<HTMLUListElement>(null);
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
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <ul
      ref={ref}
      className={`ckl space-y-5 ${armed ? "ckl--armed" : ""} ${
        inView ? "ckl--in" : ""
      }`}
    >
      {items.map((item, i) => (
        <li
          key={i}
          className="ckl__item flex items-start gap-3"
          style={{ "--i": i } as CSSProperties}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ckl__check shrink-0 mt-0.5 text-brand-500"
            aria-hidden="true"
          >
            <path d="M5 13 L9 17 L19 7" />
          </svg>
          <span className="text-base leading-relaxed text-ink-700">{item}</span>
        </li>
      ))}
    </ul>
  );
}
