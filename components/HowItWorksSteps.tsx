"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

// Scroll-triggered "How it works" step sequence for /sourcing. The motion
// reinforces progression: a brand-blue connector line draws in down the
// numbered circles, the four steps cascade up 01 -> 04, and each circle pops
// as its step lands. Fires ONCE.
//
// Safety: content is visible by DEFAULT. JS adds `hiw--armed` on mount, which
// is what enables the hidden start state - so no-JS, pre-hydration, and a fast
// scroller who outruns the observer always see readable steps. Honors
// prefers-reduced-motion (everything visible, no transforms) via globals.css.

type Step = { n: string; heading: string; body: string };

export default function HowItWorksSteps({ steps }: { steps: Step[] }) {
  const olRef = useRef<HTMLOListElement>(null);
  const lineRef = useRef<HTMLSpanElement>(null);
  const [armed, setArmed] = useState(false);
  const [inView, setInView] = useState(false);

  // Measure the connector so it runs from the first circle's center to the
  // last circle's center, no matter how the copy wraps at any width.
  useLayoutEffect(() => {
    const ol = olRef.current;
    const line = lineRef.current;
    if (!ol || !line) return;
    const measure = () => {
      const circles = ol.querySelectorAll<HTMLElement>(".hiw__circle");
      if (circles.length < 2) return;
      const olTop = ol.getBoundingClientRect().top;
      const first = circles[0].getBoundingClientRect();
      const last = circles[circles.length - 1].getBoundingClientRect();
      const top = first.top - olTop + first.height / 2;
      const bottom = last.top - olTop + last.height / 2;
      line.style.top = `${top}px`;
      line.style.height = `${Math.max(0, bottom - top)}px`;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(ol);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [steps]);

  useEffect(() => {
    const el = olRef.current;
    if (!el) return;
    // Arming enables the hidden start state. Done in JS so the no-JS / SSR
    // markup stays fully visible.
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
    <ol
      ref={olRef}
      className={`hiw__steps mt-12 ${armed ? "hiw--armed" : ""} ${
        inView ? "hiw--in" : ""
      }`}
    >
      <span ref={lineRef} className="hiw__line" aria-hidden="true" />
      {steps.map((s, i) => (
        <li
          key={s.n}
          className="hiw__step"
          style={{ "--i": i } as CSSProperties}
        >
          <span className="hiw__circle" aria-hidden="true">
            {s.n}
          </span>
          <div className="flex-1 pt-1">
            <h3 className="text-lg font-semibold text-ink-900">{s.heading}</h3>
            <p className="mt-2 text-base leading-relaxed text-ink-700">
              {s.body}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
