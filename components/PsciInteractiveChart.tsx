"use client";

import { useState, useMemo, useRef } from "react";

// ---------------------------------------------------------------------------
// PsciInteractiveChart - interactive PSCI trend with time-range toggles.
//
// Bloomberg / Yahoo Finance pattern: 3M | 6M | 1Y | 5Y | All time toggle
// across the top of the chart, hover anywhere on the line to see the value
// and date at that point.
//
// === DATA SOURCES ===
//
// Full historical series shipped from lib/psci.ts (PSCI_HISTORICAL_ALL),
// ~540 weekly closes back to Jan 2016. Read from data/psci_historical.csv
// at build time, baked into the client bundle (~11 KB JSON payload).
//
// === DEFAULT RANGE ===
//
// 6M (26 weeks). 3M is the procurement sweet spot but 6M shows enough
// context to read the trajectory at a glance. User can drop to 3M or
// stretch to 5Y / All as needed.
//
// === FORECAST OVERLAY ===
//
// When a real national 30-day projection is passed via the `forecast` prop
// (PSCI_FORECAST -> data/psci_forecast.json -> atlas_pspi_cache / TimesFM
// 2.5), the chart draws a GOLD dashed segment + a faint gold window on the
// right edge, from the last actual close to the projected value ~30 days
// out. Gold is direction-neutral (it just marks "this is the forecast"); the
// signed delta and its red/green meaning live in the value tile to the left.
// No forecast prop -> historical-only, exactly as before.
// ---------------------------------------------------------------------------

type Point = { readonly weekEnding: string; readonly value: number };

interface Props {
  data: ReadonlyArray<Point>;
  forecast?: {
    projected: number | null;
    changePct: number | null;
    horizonDays: number;
  } | null;
}

const RANGES = [
  { label: "1M", weeks: 5 },
  { label: "3M", weeks: 13 },
  { label: "6M", weeks: 26 },
  { label: "1Y", weeks: 52 },
  { label: "5Y", weeks: 260 },
  { label: "All", weeks: 0 }, // 0 = use entire dataset
] as const;

type Range = (typeof RANGES)[number];

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatTooltipDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

function formatAxisDate(iso: string, range: Range): string {
  const [year, month, day] = iso.split("-").map(Number);
  // Short range = "MMM D", long range = "MMM YYYY"
  if (range.weeks === 0 || range.weeks >= 260) {
    return `${MONTHS[month - 1]} ${year}`;
  }
  if (range.weeks >= 52) {
    return `${MONTHS[month - 1]} ${year.toString().slice(2)}`;
  }
  return `${MONTHS[month - 1]} ${day}`;
}

export default function PsciInteractiveChart({ data, forecast }: Props) {
  const [range, setRange] = useState<Range>(RANGES[0]); // default 3M (near-term, shows the forecast window)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Slice the data to the selected range
  const filtered = useMemo(() => {
    if (range.weeks === 0) return data;
    return data.slice(-range.weeks);
  }, [data, range]);

  // SVG geometry
  const W = 900;
  const H = 360;
  const pad = { top: 32, right: 56, bottom: 40, left: 56 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  // Y scale - pad above/below the observed range so the line doesn't
  // hug the chart edges
  // Forecast point sits ~horizonDays/7 index-steps to the RIGHT of the last
  // actual close. Only when a real projection is passed in.
  const hasForecast =
    !!forecast &&
    typeof forecast.projected === "number" &&
    filtered.length > 0;
  const fcSteps = hasForecast
    ? Math.max(1, Math.round((forecast!.horizonDays || 30) / 7))
    : 0;
  const lastIdx = filtered.length - 1;
  const fcIdx = lastIdx + fcSteps;

  const values = filtered.map((d) => d.value);
  if (hasForecast) values.push(forecast!.projected as number);
  const minV = values.length > 0 ? Math.min(...values) : 100;
  const maxV = values.length > 0 ? Math.max(...values) : 120;
  const span = Math.max(maxV - minV, 1);
  const yMin = Math.floor((minV - span * 0.08) * 10) / 10;
  const yMax = Math.ceil((maxV + span * 0.08) * 10) / 10;
  const yRange = yMax - yMin;
  const yFor = (v: number) => pad.top + (1 - (v - yMin) / yRange) * innerH;

  // X scale - distribute actual points across the inner width, reserving room
  // on the right for the forecast window when present.
  const xSpan = Math.max(lastIdx + fcSteps, 1);
  const xFor = (i: number) => {
    if (filtered.length <= 1 && !hasForecast) return pad.left;
    return pad.left + (i / xSpan) * innerW;
  };

  // Line path (actuals only)
  const linePath = filtered
    .map((d, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(d.value)}`)
    .join(" ");

  // Forecast geometry: gold dashed segment from the last actual to the
  // projection, plus a faint gold band over the forecast region.
  const lastX = xFor(lastIdx);
  const lastY = filtered.length > 0 ? yFor(filtered[lastIdx].value) : 0;
  const fcX = hasForecast ? xFor(fcIdx) : 0;
  const fcY = hasForecast ? yFor(forecast!.projected as number) : 0;

  // Build an area path for a subtle brand-blue fill under the line
  const areaPath =
    filtered.length > 0
      ? [
          `M ${xFor(0)} ${pad.top + innerH}`,
          ...filtered.map((d, i) => `L ${xFor(i)} ${yFor(d.value)}`),
          `L ${xFor(filtered.length - 1)} ${pad.top + innerH}`,
          "Z",
        ].join(" ")
      : "";

  // Y-axis tick values (4 evenly spaced)
  const yTicks: number[] = [];
  for (let i = 0; i <= 4; i++) {
    yTicks.push(yMin + (yRange * i) / 4);
  }

  // X-axis tick positions - show 4-6 labels evenly distributed
  const labelCount = filtered.length >= 26 ? 5 : Math.min(filtered.length, 4);
  const xTickIndices: number[] = [];
  if (filtered.length > 0) {
    for (let i = 0; i < labelCount; i++) {
      const idx = Math.round((i / (labelCount - 1)) * (filtered.length - 1));
      xTickIndices.push(idx);
    }
  }

  // Hover detection: convert mouse X to data index
  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current || filtered.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    // Convert client X to SVG viewBox X
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * W;
    // Clamp to inner chart area
    const xRatio = (svgX - pad.left) / innerW;
    if (xRatio < 0 || xRatio > 1) {
      setHoverIdx(null);
      return;
    }
    // Map across the full span (actuals + forecast room); clamp to actuals so
    // the forecast region itself is not hoverable.
    const idx = Math.round(xRatio * xSpan);
    if (idx > lastIdx) {
      setHoverIdx(null);
      return;
    }
    setHoverIdx(Math.max(0, Math.min(lastIdx, idx)));
  }

  const hoverPoint = hoverIdx !== null ? filtered[hoverIdx] : null;
  const hoverX = hoverIdx !== null ? xFor(hoverIdx) : 0;
  const hoverY = hoverPoint !== null ? yFor(hoverPoint.value) : 0;

  return (
    <div className="rounded-lg border border-ink-200 bg-white p-6">
      {/* Header row: title + range toggles (no value here - the tile to
          the left of this chart owns the current-value display) */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">
          PSCI&trade; trajectory
        </p>
        {/* Range toggle pills */}
        <div className="flex gap-1">
          {RANGES.map((r) => {
            const active = r.label === range.label;
            return (
              <button
                key={r.label}
                onClick={() => {
                  setRange(r);
                  setHoverIdx(null);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  active
                    ? "bg-brand-500 text-white"
                    : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* SVG chart */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
        role="img"
        aria-label={`PSCI weekly closes over the last ${range.label === "All" ? "ten years" : range.label}`}
      >
        {/* Horizontal grid lines + Y-axis labels */}
        {yTicks.map((tickValue, i) => {
          const y = yFor(tickValue);
          return (
            <g key={i}>
              <line
                x1={pad.left}
                y1={y}
                x2={W - pad.right}
                y2={y}
                stroke="#eff2f4"
                strokeWidth="1"
              />
              <text
                x={pad.left - 8}
                y={y + 4}
                fontSize="11"
                fill="#94a1ab"
                textAnchor="end"
                className="tabular-nums"
              >
                {tickValue.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Area fill under the line */}
        {areaPath && (
          <path d={areaPath} fill="rgba(73, 165, 193, 0.08)" />
        )}

        {/* Trend line */}
        <path
          d={linePath}
          fill="none"
          stroke="#49a5c1"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Forecast overlay: faint gold window + gold dashed projection */}
        {hasForecast && (
          <g pointerEvents="none">
            <rect
              x={lastX}
              y={pad.top}
              width={Math.max(fcX - lastX, 0)}
              height={innerH}
              fill="rgba(202, 162, 58, 0.08)"
            />
            <line
              x1={lastX}
              y1={lastY}
              x2={fcX}
              y2={fcY}
              stroke="#caa23a"
              strokeWidth="2"
              strokeDasharray="4 4"
              strokeLinecap="round"
            />
            <circle
              cx={fcX}
              cy={fcY}
              r="4.5"
              fill="#caa23a"
              stroke="white"
              strokeWidth="2"
            />
            <text
              x={(lastX + fcX) / 2}
              y={pad.top - 16}
              fontSize="9"
              fill="#a07f1e"
              textAnchor="middle"
              className="uppercase tracking-wider font-semibold"
            >
              30-day forecast
            </text>
          </g>
        )}

        {/* X-axis labels */}
        {xTickIndices.map((idx, i) => {
          const point = filtered[idx];
          if (!point) return null;
          const x = xFor(idx);
          return (
            <text
              key={`x-${i}`}
              x={x}
              y={H - 12}
              fontSize="11"
              fill="#94a1ab"
              textAnchor={
                i === 0
                  ? "start"
                  : i === xTickIndices.length - 1
                    ? "end"
                    : "middle"
              }
            >
              {formatAxisDate(point.weekEnding, range)}
            </text>
          );
        })}

        {/* Hover indicator: vertical dashed line + filled circle */}
        {hoverPoint && (
          <g pointerEvents="none">
            <line
              x1={hoverX}
              y1={pad.top}
              x2={hoverX}
              y2={pad.top + innerH}
              stroke="#94a1ab"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle
              cx={hoverX}
              cy={hoverY}
              r="5"
              fill="#49a5c1"
              stroke="white"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>

      {/* Hover tooltip - rendered below the SVG so it never gets clipped */}
      <div className="mt-3 min-h-[24px] flex items-center justify-between text-sm">
        {hoverPoint ? (
          <>
            <span className="font-bold text-ink-900 tabular-nums">
              {hoverPoint.value.toFixed(2)}
            </span>
            <span className="text-ink-500">
              Week ending {formatTooltipDate(hoverPoint.weekEnding)}
            </span>
          </>
        ) : (
          <span className="text-xs text-ink-500">
            Hover the line for weekly values &middot; Source: BLS, EIA
            &middot; CC0 public domain
          </span>
        )}
      </div>
    </div>
  );
}
