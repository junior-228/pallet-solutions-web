"use client";

import { useEffect, useRef, useState } from "react";

// Generic scroll-reveal container - the shared engine behind the site's motion
// system (IntersectionObserver, fires ONCE, ease-out, 120ms stagger, brand
// blue). Wrap a content block in <Reveal> and tag descendants:
//   - `reveal-item` + style={{"--i": n}}  -> fade + slide up, staggered
//   - `reveal-pop`  + style={{"--i": n}}  -> scale-pop (numbers/checkmarks)
// Behavior is defined in globals.css (.reveal--armed / .reveal--in). Content is
// visible by DEFAULT; JS adds `reveal--armed` on mount to install the hidden
// start state, so no-JS / pre-hydration / a fast scroller never gate the read.
// Reduced-motion falls back to fully static.

export default function Reveal({
  children,
  className = "",
  threshold = 0.2,
}: {
  children: React.ReactNode;
  className?: string;
  threshold?: number;
}) {
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
            obs.unobserve(e.target);
          }
        });
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return (
    <div
      ref={ref}
      className={`reveal ${armed ? "reveal--armed" : ""} ${
        inView ? "reveal--in" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
