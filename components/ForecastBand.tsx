"use client";

import { useEffect, useRef, useState } from "react";

// Signature animation for the Tuesday Read forecast: the 80% confidence band
// fills left-to-right on scroll into view, then the median marker settles in.
// It EXPRESSES a range (like the program loop expresses a cycle). Subtle, once.
// The numbers (median, lower, upper) stay STATIC - only the bar draws, because
// this is a credibility surface. Reduced-motion: fully drawn, no animation.

export default function ForecastBand({
  lower,
  upper,
}: {
  lower: number;
  upper: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
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
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className={`fcb ${inView ? "fcb--in" : ""}`}>
      <div className="mt-3 relative h-2 rounded-full bg-ink-100 overflow-hidden">
        <div className="fcb__band absolute inset-y-0 left-[15%] right-[15%] bg-brand-200 rounded-full" />
        <div
          className="fcb__median absolute top-0 bottom-0 w-0.5 bg-brand-700"
          style={{ left: "50%" }}
          aria-label="Forecast median"
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-ink-400 tabular-nums">
        <span>{lower.toFixed(1)}</span>
        <span>{upper.toFixed(1)}</span>
      </div>
    </div>
  );
}
