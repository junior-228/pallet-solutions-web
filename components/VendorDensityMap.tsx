"use client";

import { useEffect, useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { geoAlbersUsa } from "d3-geo";

// Real US map (state outlines) + REAL vendor points. No binning, no grid:
// every dot is an ACTUAL vendor coordinate from /vendor-index.json, projected
// through the SAME geoAlbersUsa instance as the outline so it lands where the
// vendor really is. Dense metros darken naturally from overlapping dots.
// Every dot is STATIC (no animation) - static SVG composites to one layer and
// scrolls smoothly even at a few thousand nodes; the scroll jank was the
// animations, not the dot count. Lively animated dots live in the "For
// Vendors" section (NetworkAmbientDots) instead.

const VB_W = 960;
const VB_H = 560;

type Pt = { x: number; y: number };

export default function VendorDensityMap({
  className,
  opacity = 1,
  dark = false,
}: {
  className?: string;
  opacity?: number;
  dark?: boolean;
}) {
  const [pts, setPts] = useState<Pt[]>([]);

  const projection = useMemo(
    () =>
      geoAlbersUsa()
        .translate([VB_W / 2, VB_H / 2])
        .scale(1020),
    []
  );

  useEffect(() => {
    let alive = true;
    fetch("/vendor-index.json", { cache: "force-cache" })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: unknown) => {
        if (!alive || !Array.isArray(rows)) return;
        const seen = new Set<string>();
        const out: Pt[] = [];
        for (const v of rows as Array<{ lat?: number; lng?: number }>) {
          const la = v.lat;
          const ln = v.lng;
          if (typeof la !== "number" || typeof ln !== "number") continue;
          // Dedupe exact-identical coordinates only (saves nodes without
          // touching real spread). Real distinct locations all render.
          const key = `${la.toFixed(3)},${ln.toFixed(3)}`;
          if (seen.has(key)) continue;
          const p = projection([ln, la]);
          if (!p) continue; // outside the US (PR, far Canada) - skip
          seen.add(key);
          out.push({ x: p[0], y: p[1] });
        }
        setPts(out);
      })
      .catch(() => {
        /* decorative proof; failing silently is fine */
      });
    return () => {
      alive = false;
    };
  }, [projection]);

  const stateStroke = dark
    ? "rgba(160,172,182,0.45)"
    : "rgba(148,161,171,0.4)";
  const stateFill = "rgba(148,161,171,0.05)";
  const dotColor = dark ? "#aeb7bf" : "#7c8a96";
  // Low per-dot opacity so dense metros build up via overlap rather than
  // every dot screaming. Real cluster = darker, sparse = faint.
  const dotOpacity = dark ? 0.3 : 0.26;

  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        opacity,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%" }}>
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{ scale: 1020 }}
          width={VB_W}
          height={VB_H}
          style={{ width: "100%", height: "auto" }}
        >
          <Geographies geography="/maps/us-states-10m.json">
            {({ geographies }: { geographies: { rsmKey: string }[] }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  style={{
                    default: {
                      fill: stateFill,
                      stroke: stateStroke,
                      strokeWidth: 0.5,
                      outline: "none",
                    },
                    hover: {
                      fill: stateFill,
                      stroke: stateStroke,
                      strokeWidth: 0.5,
                      outline: "none",
                    },
                    pressed: {
                      fill: stateFill,
                      stroke: stateStroke,
                      strokeWidth: 0.5,
                      outline: "none",
                    },
                  }}
                />
              ))
            }
          </Geographies>
          {pts.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={1.5}
              fill={dotColor}
              opacity={dotOpacity}
            />
          ))}
        </ComposableMap>
      </div>
    </div>
  );
}
