"use client";

import { useEffect, useState } from "react";

// Ambient floating dots - a faithful port of the generator on
// network.palletsolutionsusa.com (see-your-network-enterprise/index.html):
// 60 dots, size 3-13px, gray/green/teal by weight, glow on the bigger ones,
// random position/delay/duration, animated by the .bg-dot / dotFloat CSS
// (fade in, drift up, fade out). Generated on the client to avoid an SSR
// hydration mismatch from Math.random.

type Dot = {
  size: number;
  color: string;
  glow: string;
  left: number;
  top: number;
  delay: number;
  dur: number;
};

// Exact tier weighting from the network: T1 unclaimed common, T2 claimed,
// T3 pro rare.
const DOT_COLORS = [
  { c: "#8a9bae", glow: "rgba(138,155,174,0.3)", weight: 5 },
  { c: "#00C853", glow: "rgba(0,200,83,0.4)", weight: 2 },
  { c: "#49a5c1", glow: "rgba(73,165,193,0.5)", weight: 1 },
];

export default function NetworkAmbientDots({
  className,
}: {
  className?: string;
}) {
  const [dots, setDots] = useState<Dot[]>([]);

  useEffect(() => {
    const pool: typeof DOT_COLORS = [];
    DOT_COLORS.forEach((dc) => {
      for (let w = 0; w < dc.weight; w++) pool.push(dc);
    });
    const out: Dot[] = [];
    for (let i = 0; i < 60; i++) {
      const size = 3 + Math.random() * 10;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      out.push({
        size,
        color: pick.c,
        glow: pick.glow,
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 10,
        dur: 5 + Math.random() * 8,
      });
    }
    setDots(out);
  }, []);

  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {dots.map((d, i) => (
        <div
          key={i}
          className="bg-dot"
          style={{
            width: `${d.size}px`,
            height: `${d.size}px`,
            background: d.color,
            boxShadow: d.size > 8 ? `0 0 ${d.size * 2}px ${d.glow}` : undefined,
            left: `${d.left}%`,
            top: `${d.top}%`,
            animationDelay: `${d.delay}s`,
            animationDuration: `${d.dur}s`,
          }}
        />
      ))}
    </div>
  );
}
