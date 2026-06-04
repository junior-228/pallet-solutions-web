"use client";

import { ComposableMap, Geographies, Geography } from "react-simple-maps";

/* State name (matches us-atlas properties.name) -> PS region slug. */
const STATE_TO_REGION: Record<string, string> = {
  // Northeast
  Maine: "northeast",
  "New Hampshire": "northeast",
  Vermont: "northeast",
  Massachusetts: "northeast",
  "Rhode Island": "northeast",
  Connecticut: "northeast",
  "New York": "northeast",
  "New Jersey": "northeast",
  Pennsylvania: "northeast",
  Maryland: "northeast",
  Delaware: "northeast",
  // Southeast
  Virginia: "southeast",
  "West Virginia": "southeast",
  "North Carolina": "southeast",
  "South Carolina": "southeast",
  Georgia: "southeast",
  Florida: "southeast",
  Alabama: "southeast",
  Tennessee: "southeast",
  // Great Lakes
  Ohio: "great-lakes",
  Michigan: "great-lakes",
  Indiana: "great-lakes",
  Illinois: "great-lakes",
  Wisconsin: "great-lakes",
  Kentucky: "great-lakes",
  // Texas + South Central
  Texas: "texas-south-central",
  Oklahoma: "texas-south-central",
  Louisiana: "texas-south-central",
  Arkansas: "texas-south-central",
  Mississippi: "texas-south-central",
  // Plains + Mountain
  Minnesota: "plains-mountain",
  Iowa: "plains-mountain",
  Missouri: "plains-mountain",
  Kansas: "plains-mountain",
  Nebraska: "plains-mountain",
  "North Dakota": "plains-mountain",
  "South Dakota": "plains-mountain",
  Colorado: "plains-mountain",
  Utah: "plains-mountain",
  Nevada: "plains-mountain",
  Arizona: "plains-mountain",
  "New Mexico": "plains-mountain",
  Idaho: "plains-mountain",
  Wyoming: "plains-mountain",
  Montana: "plains-mountain",
  // West Coast (CA + PNW merged - PADD 5 is one EIA diesel series, so the
  // regional pipeline carries a single West Coast composite).
  California: "west-coast",
  Washington: "west-coast",
  Oregon: "west-coast",
  Alaska: "west-coast",
  // Hawaii + DC intentionally unassigned
};

/* Two-tier coloring: unselected = neutral gray, selected = each region's
   distinctive color. Which region is currently being viewed in the sample
   is indicated by the sample preview header + tab strip, not the map. */
const DEFAULT_FILL = "#e7eaee";

const REGION_COLORS: Record<string, string> = {
  northeast: "#1e4d6b",
  southeast: "#2d8a8a",
  "great-lakes": "#49a5c1",
  "texas-south-central": "#a8704f",
  "plains-mountain": "#c4a062",
  "west-coast": "#5c7d5c",
};

type GeoFeature = {
  rsmKey: string;
  properties: { name: string };
};

type Props = {
  selectedRegions: string[];
  // viewingRegion is accepted but not used for map fill anymore.
  // Kept in the prop signature for future use (e.g., subtle highlight
  // if we ever want to indicate the viewing region on the map again).
  viewingRegion?: string;
  onRegionClick?: (slug: string) => void;
};

export default function AtlasRegionsMap({
  selectedRegions,
  onRegionClick,
}: Props) {
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-3 sm:p-4">
      <ComposableMap
        projection="geoAlbersUsa"
        projectionConfig={{ scale: 720 }}
        width={520}
        height={320}
        style={{ width: "100%", height: "auto" }}
      >
        <Geographies geography="https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json">
          {({ geographies }: { geographies: GeoFeature[] }) =>
            geographies.map((geo) => {
              const stateName = geo.properties.name;
              const regionSlug = STATE_TO_REGION[stateName];
              const isAssigned = regionSlug !== undefined;
              const isSelected =
                isAssigned && selectedRegions.includes(regionSlug);

              const fillColor =
                isSelected && isAssigned
                  ? REGION_COLORS[regionSlug]
                  : DEFAULT_FILL;

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  style={{
                    default: {
                      fill: fillColor,
                      stroke: "#ffffff",
                      strokeWidth: 0.5,
                      outline: "none",
                      cursor: isAssigned ? "pointer" : "default",
                      transition: "fill 150ms ease-out",
                    },
                    hover: {
                      fill: fillColor,
                      opacity: isAssigned ? 0.85 : 1,
                      outline: "none",
                      cursor: isAssigned ? "pointer" : "default",
                    },
                    pressed: {
                      fill: fillColor,
                      outline: "none",
                    },
                  }}
                  onClick={() =>
                    isAssigned && onRegionClick?.(regionSlug)
                  }
                  aria-label={
                    isAssigned
                      ? `${stateName}, ${regionSlug.replace(/-/g, " ")} region`
                      : stateName
                  }
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>

      {/* Tiny legend */}
      <div className="mt-3 flex items-center justify-center gap-5 text-[11px] text-ink-600">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ backgroundColor: "#49a5c1" }}
            aria-hidden="true"
          />
          Your selected regions
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ backgroundColor: DEFAULT_FILL }}
            aria-hidden="true"
          />
          Not selected
        </span>
      </div>
    </div>
  );
}
