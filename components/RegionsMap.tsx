"use client";

import { useState, useCallback } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ComposableMap,
  Geographies,
  Geography,
} from "react-simple-maps";

export type Region = {
  name: string;
  states: string;
  color: string;
};

// State name (matches us-atlas properties.name) -> index into the regions array.
const STATE_NAME_TO_REGION_IDX: Record<string, number> = {
  // Northeast (0)
  Maine: 0,
  "New Hampshire": 0,
  Vermont: 0,
  Massachusetts: 0,
  "Rhode Island": 0,
  Connecticut: 0,
  "New York": 0,
  "New Jersey": 0,
  Pennsylvania: 0,
  Maryland: 0,
  Delaware: 0,
  // Southeast (1)
  Virginia: 1,
  "West Virginia": 1,
  "North Carolina": 1,
  "South Carolina": 1,
  Georgia: 1,
  Florida: 1,
  Alabama: 1,
  Tennessee: 1,
  // Great Lakes (2)
  Ohio: 2,
  Michigan: 2,
  Indiana: 2,
  Illinois: 2,
  Wisconsin: 2,
  Kentucky: 2,
  // Texas + South Central (3)
  Texas: 3,
  Oklahoma: 3,
  Louisiana: 3,
  Arkansas: 3,
  Mississippi: 3,
  // Plains + Mountain (4)
  Minnesota: 4,
  Iowa: 4,
  Missouri: 4,
  Kansas: 4,
  Nebraska: 4,
  "North Dakota": 4,
  "South Dakota": 4,
  Colorado: 4,
  Utah: 4,
  Nevada: 4,
  Arizona: 4,
  "New Mexico": 4,
  Idaho: 4,
  Wyoming: 4,
  Montana: 4,
  // California (5)
  California: 5,
  // Pacific Northwest (6)
  Washington: 6,
  Oregon: 6,
  Alaska: 6,
  // Hawaii + DC intentionally unassigned.
  // Canada (7) shown as a chip below the map; no Canadian topojson included.
};

const REGION_SLUGS = [
  "northeast",
  "southeast",
  "great-lakes",
  "texas-south-central",
  "plains-mountain",
  "california",
  "pacific-northwest",
  "canada",
];

// Pre-computed state counts per region so the tooltip can show "11 states" etc.
const STATE_COUNT_PER_REGION: number[] = REGION_SLUGS.map((_, idx) =>
  Object.values(STATE_NAME_TO_REGION_IDX).filter((v) => v === idx).length
);

// Canada's state count is descriptive (provinces), set manually for the chip.
const CANADA_DESCRIPTOR = "All provinces, opt-in";

const FOUNDING_PRICE = "$19.99/mo founding";

type GeoFeature = {
  rsmKey: string;
  properties: { name: string };
};

export default function RegionsMap({ regions }: { regions: Region[] }) {
  const router = useRouter();
  const [hoveredRegionIdx, setHoveredRegionIdx] = useState<number | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  const handleEnter = useCallback(
    (regionIdx: number, e: ReactMouseEvent) => {
      setHoveredRegionIdx(regionIdx);
      setCursor({ x: e.clientX, y: e.clientY });
    },
    []
  );

  const handleMove = useCallback((e: ReactMouseEvent) => {
    setCursor({ x: e.clientX, y: e.clientY });
  }, []);

  const handleLeave = useCallback(() => {
    setHoveredRegionIdx(null);
    setCursor(null);
  }, []);

  const handleClick = useCallback(
    (regionIdx: number) => {
      router.push(`/atlas?region=${REGION_SLUGS[regionIdx]}`);
    },
    [router]
  );

  const hoveredRegion =
    hoveredRegionIdx !== null ? regions[hoveredRegionIdx] : null;

  return (
    <div className="relative">
      <div className="rounded-2xl border border-ink-200 bg-white p-3 sm:p-6">
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{ scale: 1000 }}
          width={960}
          height={560}
          style={{ width: "100%", height: "auto" }}
        >
          <Geographies geography="/maps/us-states-10m.json">
            {({ geographies }: { geographies: GeoFeature[] }) =>
              geographies.map((geo) => {
                const stateName = geo.properties.name;
                const regionIdx = STATE_NAME_TO_REGION_IDX[stateName];
                const isAssigned = regionIdx !== undefined;
                const region = isAssigned ? regions[regionIdx] : null;
                const isHovered =
                  isAssigned && hoveredRegionIdx === regionIdx;
                const baseFill = region ? region.color : "#e0e5e9"; // ink-200
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    style={{
                      default: {
                        fill: baseFill,
                        stroke: isHovered ? "#0f1d24" : "#ffffff",
                        strokeWidth: isHovered ? 1.25 : 0.5,
                        outline: "none",
                        opacity: isAssigned ? 1 : 0.35,
                        filter: isHovered
                          ? "brightness(0.92)"
                          : undefined,
                        cursor: isAssigned ? "pointer" : "default",
                        transition: "all 150ms ease-out",
                      },
                      hover: {
                        fill: baseFill,
                        outline: "none",
                      },
                      pressed: {
                        fill: baseFill,
                        outline: "none",
                      },
                    }}
                    onMouseEnter={(e: ReactMouseEvent) =>
                      isAssigned && handleEnter(regionIdx, e)
                    }
                    onMouseMove={handleMove}
                    onMouseLeave={handleLeave}
                    onClick={() => isAssigned && handleClick(regionIdx)}
                    aria-label={
                      isAssigned
                        ? `${stateName}, ${regions[regionIdx].name} region`
                        : stateName
                    }
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>

        {/* Canada chip: 8th region. Not on the topojson; shown as an */}
        {/* interactive chip so it still gets hover + click + tooltip. */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 border-t border-ink-100 pt-4">
          <span className="text-xs uppercase tracking-[0.14em] text-ink-500">
            Add-on
          </span>
          <button
            type="button"
            onMouseEnter={(e) => handleEnter(7, e)}
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            onClick={() => handleClick(7)}
            className="inline-flex items-center gap-2 rounded-md border border-ink-200 px-4 py-2 text-sm font-medium text-ink-800 transition-colors hover:border-brand-400 hover:bg-brand-50"
            style={{
              borderLeftColor: regions[7]?.color ?? "#94a1ab",
              borderLeftWidth: "4px",
            }}
          >
            {regions[7]?.name ?? "Canada"}
          </button>
        </div>

        {/* Legend */}
        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          {regions.slice(0, 7).map((r, idx) => (
            <button
              key={r.name}
              type="button"
              onMouseEnter={(e) => handleEnter(idx, e)}
              onMouseMove={handleMove}
              onMouseLeave={handleLeave}
              onClick={() => handleClick(idx)}
              className={`flex items-center gap-2 rounded px-2 py-1 text-left text-xs transition-colors ${
                hoveredRegionIdx === idx
                  ? "bg-brand-50 text-ink-900"
                  : "text-ink-700 hover:bg-ink-50"
              }`}
            >
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: r.color }}
                aria-hidden="true"
              />
              <span className="font-medium truncate">{r.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Cursor-anchored tooltip */}
      {hoveredRegion && cursor && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-50 w-[240px] rounded-lg border border-ink-200 bg-white p-4 shadow-xl"
          style={{
            top: Math.max(8, cursor.y - 120),
            left: Math.min(
              typeof window !== "undefined"
                ? window.innerWidth - 248
                : cursor.x + 16,
              cursor.x + 16
            ),
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: hoveredRegion.color }}
              aria-hidden="true"
            />
            <p className="text-sm font-semibold text-brand-700">
              {hoveredRegion.name}
            </p>
          </div>
          <p className="mt-2 text-xs text-ink-600">
            {hoveredRegionIdx === 7
              ? CANADA_DESCRIPTOR
              : `${STATE_COUNT_PER_REGION[hoveredRegionIdx ?? 0]} states`}
            {" · "}
            PSCI region{" "}
            {String((hoveredRegionIdx ?? 0) + 1).padStart(2, "0")}
          </p>
          <p className="mt-3 text-sm font-semibold text-ink-900">
            {FOUNDING_PRICE}
          </p>
          <p className="mt-3 text-xs text-ink-500">
            Click to subscribe →
          </p>
        </div>
      )}
    </div>
  );
}
