"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

// Third piece of the /sourcing motion system (with HowItWorksSteps +
// ProgramLoop). Same engine (IntersectionObserver, fires ONCE), easing
// (ease-out), stagger (120ms), color (#49a5c1). Here the motion is a TABLE
// ASSEMBLING: rows fade + slide in top-to-bottom, the blue "Total per week"
// row lands a beat last so the eye ends on the payoff, then everything sits
// perfectly still.
//
// Hard rule: the DATA never animates - no count-ups, no filling bars. The only
// motion is the row ENTERING; once in, it's static and instantly readable.
// Visible by default; JS adds `wtt--armed` to install the hidden start state,
// so no-JS / pre-hydration / a fast scroller always see the full table.

type Row = { task: string; hours: string; detail: string };
type Total = { hours: string; detail: string };

export default function WorkTransferTable({
  rows,
  total,
}: {
  rows: Row[];
  total: Total;
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
            obs.unobserve(e.target); // animate once
          }
        });
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`wtt mt-12 overflow-x-auto rounded-2xl border border-ink-200 ${
        armed ? "wtt--armed" : ""
      } ${inView ? "wtt--in" : ""}`}
    >
      <table className="w-full text-left">
        <thead className="bg-ink-50 border-b border-ink-200">
          <tr>
            <th className="p-5 text-sm font-semibold text-ink-700">Task</th>
            <th className="p-5 text-sm font-semibold text-ink-700 whitespace-nowrap">
              Hours / week
            </th>
            <th className="p-5 text-sm font-semibold text-ink-700">Detail</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="wtt__row border-t border-ink-100 hover:bg-ink-50/60"
              style={{ "--i": i } as CSSProperties}
            >
              <td className="p-5 text-sm font-medium text-ink-900 align-top">
                {row.task}
              </td>
              <td className="p-5 text-sm text-ink-900 tabular-nums whitespace-nowrap align-top">
                {row.hours}
              </td>
              <td className="p-5 text-sm text-ink-700 align-top">
                {row.detail}
              </td>
            </tr>
          ))}
          <tr
            className="wtt__row wtt__total border-t-2 border-ink-200 bg-ink-50/30 hover:bg-brand-50/50"
            style={{ "--i": rows.length } as CSSProperties}
          >
            <td className="p-5 text-sm font-semibold text-ink-900">
              Total per week
            </td>
            <td className="p-5 text-sm font-semibold text-brand-600 tabular-nums whitespace-nowrap">
              {total.hours}
            </td>
            <td className="p-5 text-sm text-ink-700">{total.detail}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
