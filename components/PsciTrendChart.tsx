import { PSCI_HISTORICAL_LAST_8 } from "@/lib/psci";

// ---------------------------------------------------------------------------
// PsciTrendChart -PSCI trend (last 8 weeks) + AI Forecast Layer overlay.
//
// Replaces the prior "5-year trend sparkline (placeholder)" tile on the
// homepage. Same visual concept as the Tuesday Read fan graph on the
// marketing site (/market-pulse), scaled down for the homepage tile.
//
// === DATA SOURCES ===
//
// Historical line: REAL DATA from data/psci_historical.csv, read at build
//   time via lib/psci.ts. Renders as a brand-blue line with dots at each
//   weekly close. This is the canonical PSCI v1.3 series.
//
// Forecast region: PLACEHOLDER. The 30-day TimesFM forecast value lives
//   in Supabase atlas_pspi_cache (populated by the GCP Cloud Run job) and
//   is NOT currently exposed to this build context. So the area to the
//   right of "today" renders as a soft amber-tinted background with a
//   "wiring pending" label -no fake forecast line, no fake CI band.
//   Per CLAUDE.md, fabricated forecast numbers on public surfaces are
//   forbidden. Task #53 tracks the wire-up: either add `forecast_30d`
//   field to psci_latest.json or do a build-time Supabase fetch.
//
// Once the forecast is wired, the placeholder text + tinted area get
// replaced with:
//   - dashed amber line from today to today+30d using forecast values
//   - shaded CI band that widens with horizon (80% interval)
//   - dot at forecast endpoint with horizon-end value
// Until then, the chart shows real history and an honest empty future.
// ---------------------------------------------------------------------------

export default function PsciTrendChart() {
  const data = PSCI_HISTORICAL_LAST_8;
  if (data.length < 2) {
    // Need at least 2 points to draw a line
    return null;
  }

  // Chart dimensions (viewBox; the SVG scales responsively via width=100%)
  const W = 600;
  const H = 200;
  const pad = { top: 22, right: 24, bottom: 28, left: 36 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  // 12 time slots: 8 historical + 4 forecast (30 days ≈ 4 weekly closes).
  // Historical occupies slots 0..7, today marker sits at slot 7, forecast
  // placeholder area covers slots 7..11.
  const totalSlots = 12;
  const slotW = innerW / (totalSlots - 1);
  const xFor = (i: number) => pad.left + i * slotW;

  // Y range: pad above and below the observed min/max so the line doesn't
  // hug the chart edges
  const values = data.map((d) => d.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = Math.max(maxV - minV, 1);
  const yMin = Math.floor((minV - range * 0.4) * 10) / 10;
  const yMax = Math.ceil((maxV + range * 0.4) * 10) / 10;
  const yRange = yMax - yMin;
  const yFor = (v: number) => pad.top + (1 - (v - yMin) / yRange) * innerH;

  // Build the historical polyline points
  const linePoints = data
    .map((d, i) => `${xFor(i)},${yFor(d.value)}`)
    .join(" ");

  // Today marker sits at the end of the historical data (slot index data.length-1)
  const todayX = xFor(data.length - 1);
  const forecastEndX = pad.left + innerW;

  // Date label formatter (short, e.g. "May 19")
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
  function formatShort(iso: string): string {
    const [, m, d] = iso.split("-").map(Number);
    return `${MONTHS[m - 1]} ${d}`;
  }

  return (
    <div className="mt-6">
      <p className="text-[10px] font-mono uppercase tracking-wider text-ink-500 mb-2">
        // PSCI™ trend + AI forecast layer
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label="PSCI trend over the last 8 weeks with 30-day forecast area pending wiring"
      >
        {/* Forecast placeholder background -soft amber tint to mark
            where the real forecast line + CI band will render once
            task #53 ships. Sits BEHIND the today marker and historical
            line so they remain visually dominant. */}
        <rect
          x={todayX}
          y={pad.top}
          width={forecastEndX - todayX}
          height={innerH}
          fill="rgba(245, 158, 11, 0.07)"
        />

        {/* Y-axis frame -subtle top and bottom lines */}
        <line
          x1={pad.left}
          y1={pad.top}
          x2={W - pad.right}
          y2={pad.top}
          stroke="#eff2f4"
          strokeWidth="1"
        />
        <line
          x1={pad.left}
          y1={pad.top + innerH}
          x2={W - pad.right}
          y2={pad.top + innerH}
          stroke="#eff2f4"
          strokeWidth="1"
        />

        {/* Y-axis value labels at min/max */}
        <text
          x={pad.left - 6}
          y={pad.top + 4}
          fontSize="10"
          fill="#94a1ab"
          textAnchor="end"
        >
          {yMax.toFixed(1)}
        </text>
        <text
          x={pad.left - 6}
          y={pad.top + innerH + 4}
          fontSize="10"
          fill="#94a1ab"
          textAnchor="end"
        >
          {yMin.toFixed(1)}
        </text>

        {/* Today vertical marker -dashed line + label above */}
        <line
          x1={todayX}
          y1={pad.top}
          x2={todayX}
          y2={pad.top + innerH}
          stroke="#94a1ab"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <text
          x={todayX}
          y={pad.top - 8}
          fontSize="10"
          fill="#475866"
          textAnchor="middle"
        >
          today
        </text>

        {/* Historical PSCI line -brand blue. Polyline through the
            observed values, with a small dot at each weekly close. */}
        <polyline
          points={linePoints}
          fill="none"
          stroke="#49a5c1"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {data.map((d, i) => (
          <circle
            key={d.weekEnding}
            cx={xFor(i)}
            cy={yFor(d.value)}
            r={3}
            fill="#49a5c1"
          />
        ))}

        {/* Forecast placeholder label -centered in the future region */}
        <text
          x={(todayX + forecastEndX) / 2}
          y={pad.top + innerH / 2 - 4}
          fontSize="11"
          fill="#b45309"
          textAnchor="middle"
          fontStyle="italic"
          fontWeight="600"
        >
          30-day forecast
        </text>
        <text
          x={(todayX + forecastEndX) / 2}
          y={pad.top + innerH / 2 + 10}
          fontSize="9"
          fill="#94a1ab"
          textAnchor="middle"
          fontStyle="italic"
        >
          pipeline wiring pending
        </text>

        {/* X-axis labels -first historical date, today date */}
        <text x={pad.left} y={H - 6} fontSize="10" fill="#94a1ab">
          {formatShort(data[0].weekEnding)}
        </text>
        <text
          x={todayX}
          y={H - 6}
          fontSize="10"
          fill="#475866"
          textAnchor="middle"
          fontWeight="600"
        >
          {formatShort(data[data.length - 1].weekEnding)}
        </text>
      </svg>

      {/* Legend -matches the fan graph on /market-pulse */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-ink-600">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full bg-brand-500"
            aria-hidden="true"
          />
          Past 8 weeks
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full bg-amber-500"
            aria-hidden="true"
          />
          30-day forecast (pending)
        </span>
      </div>
    </div>
  );
}
