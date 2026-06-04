/**
 * Headline fan graph SVG generator -- TypeScript port.
 *
 * MUST STAY IN SYNC with the CommonJS source at
 *   <workspace>/scripts/build-fan-graph-svg.js
 *
 * That source script is used by:
 *   - netlify/functions/send-tuesday-email.js (weekly Tuesday Read email)
 *   - scripts/build-market-pulse.js (the /market-pulse marketing page)
 *
 * This TS port is used by the Vercel rebuild homepage so it renders
 * the IDENTICAL SVG output as the marketing-site fan graph. Algorithm,
 * colors, dimensions, and structure are mirrored verbatim -- if you
 * change anything here, update the source script too, and vice versa.
 *
 * Reuse goal: this is not a "lookalike" -- it's the same algorithm
 * producing the same output. Both consumers read from canonical data
 * (data/psci_historical.csv for actuals; Supabase atlas_pspi_cache /
 * market_pulse_editions for the forecast).
 *
 * Inputs:
 *   series:    number[]  -- past PSCI values, oldest first (typically 12)
 *   forecast:  { median, ci50:[lo,hi], ci80:[lo,hi], ci95:[lo,hi] }
 *              -- omit or pass {} to render historical only with no
 *              forecast cones or projection line. This is the honest
 *              path when the forecast pipeline (Supabase) isn't yet
 *              wired to the build context.
 *   months:    string[]  -- labels matching series order
 *   events?:   { idx, when?, label?, detail? }[]  -- optional annotations
 *   yMin?, yMax?  -- if omitted, computed from series + forecast bounds
 *   title?, subtitle?
 *
 * Output: complete SVG string ready to embed via
 * `<div dangerouslySetInnerHTML={{ __html: svg }} />`.
 */

const VB_W = 1200;
const VB_H = 600;
const M_L = 80;
const M_R = 60;
const M_T = 60;
const M_B = 100;

export interface FanGraphForecast {
  median?: number;
  ci50?: [number, number];
  ci80?: [number, number];
  ci95?: [number, number];
}

export interface FanGraphEvent {
  idx: number;
  when?: string;
  label?: string;
  detail?: string;
}

export interface FanGraphInput {
  series: number[];
  forecast?: FanGraphForecast;
  months?: string[];
  events?: FanGraphEvent[];
  yMin?: number;
  yMax?: number;
  title?: string;
  subtitle?: string;
}

function escapeXml(s: string | number): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildFanGraphSvg(input: FanGraphInput): string {
  const series = input.series;
  if (!Array.isArray(series) || series.length === 0) {
    throw new Error("series must be a non-empty array");
  }
  const fc: FanGraphForecast = input.forecast || {};
  const months = input.months || [];
  const events = input.events || [];
  const title = input.title || "PSCI Trajectory";
  const subtitle =
    input.subtitle || "12 months past · 30-day forecast";

  // Auto-range Y
  const allVals = [...series];
  if (fc.median != null) allVals.push(fc.median);
  if (fc.ci95) allVals.push(...fc.ci95);
  const dataMin = Math.min(...allVals);
  const dataMax = Math.max(...allVals);
  const pad = Math.max(1, (dataMax - dataMin) * 0.15);
  const yMin =
    input.yMin != null ? input.yMin : Math.floor(dataMin - pad);
  const yMax =
    input.yMax != null ? input.yMax : Math.ceil(dataMax + pad);

  const totalPoints = series.length + (fc.median != null ? 1 : 0);

  function sx(i: number): number {
    const plotW = VB_W - M_L - M_R;
    return M_L + (i / (totalPoints - 1)) * plotW;
  }
  function sy(v: number): number {
    const plotH = VB_H - M_T - M_B;
    return M_T + (1 - (v - yMin) / (yMax - yMin)) * plotH;
  }

  // Y gridlines + labels
  const yTicks = 5;
  const gridLines: string[] = [];
  const yLabels: string[] = [];
  for (let t = 0; t < yTicks; t++) {
    const v = yMin + (yMax - yMin) * (1 - t / (yTicks - 1));
    const y = M_T + (t / (yTicks - 1)) * (VB_H - M_T - M_B);
    gridLines.push(
      `<line x1="${M_L}" y1="${y}" x2="${VB_W - M_R}" y2="${y}"/>`
    );
    yLabels.push(
      `<text x="${M_L - 12}" y="${y + 4}" text-anchor="end" font-family="ui-monospace, monospace" font-size="12" fill="#6b7280">${v.toFixed(1)}</text>`
    );
  }

  // Past polyline
  const actualPts = series
    .map((v, i) => `${sx(i).toFixed(1)},${sy(v).toFixed(1)}`)
    .join(" ");

  // CI cones + forecast line + forecast dot (only when forecast.median present)
  let cones = "";
  let forecastLine = "";
  let forecastDot = "";
  if (fc.median != null) {
    const curX = sx(series.length - 1);
    const curY = sy(series[series.length - 1]);
    const fcX = sx(series.length);
    const fcY = sy(fc.median);
    const cone = (
      loVal: number,
      hiVal: number,
      fill: string
    ): string => {
      const loY = sy(loVal);
      const hiY = sy(hiVal);
      return `<path d="M ${curX.toFixed(1)},${curY.toFixed(1)} L ${fcX.toFixed(1)},${hiY.toFixed(1)} L ${fcX.toFixed(1)},${loY.toFixed(1)} Z" fill="${fill}"/>`;
    };
    if (fc.ci95)
      cones += cone(fc.ci95[0], fc.ci95[1], "rgba(214, 166, 72, 0.18)");
    if (fc.ci80)
      cones += cone(fc.ci80[0], fc.ci80[1], "rgba(214, 166, 72, 0.32)");
    if (fc.ci50)
      cones += cone(fc.ci50[0], fc.ci50[1], "rgba(214, 166, 72, 0.50)");
    forecastLine = `<line x1="${curX.toFixed(1)}" y1="${curY.toFixed(1)}" x2="${fcX.toFixed(1)}" y2="${fcY.toFixed(1)}" stroke="#d6a648" stroke-width="3" stroke-dasharray="7 5" stroke-linecap="round"/>`;
    forecastDot = `<circle cx="${fcX.toFixed(1)}" cy="${fcY.toFixed(1)}" r="5" fill="#d6a648" stroke="#ffffff" stroke-width="2"/>`;
  }

  // Today marker
  const todayX = sx(series.length - 1);
  const todayLine = `<line x1="${todayX.toFixed(1)}" y1="${M_T}" x2="${todayX.toFixed(1)}" y2="${VB_H - M_B}" stroke="#9ca3af" stroke-width="1" stroke-dasharray="3 3"/>`;
  const todayLabel = `<text x="${todayX.toFixed(1)}" y="${VB_H - M_B + 30}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="11" fill="#6b7280">// TODAY</text>`;

  // Current value marker
  const cx = sx(series.length - 1);
  const cy = sy(series[series.length - 1]);
  const currentDot = `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="6" fill="#49a5c1" stroke="#ffffff" stroke-width="2.5"/>`;
  const currentLabel = `<text x="${(cx + 10).toFixed(1)}" y="${(cy - 8).toFixed(1)}" font-family="ui-monospace, monospace" font-size="13" font-weight="700" fill="#171a20">${series[series.length - 1].toFixed(2)}</text>`;

  // X-axis labels (special-cased for 12-month series)
  const xLabelTicks =
    months.length === 12
      ? [0, 2, 4, 6, 8, 10, 11]
      : Array.from({ length: months.length }, (_, i) => i);
  const xLabels = xLabelTicks
    .filter((i) => i < months.length)
    .map(
      (i) =>
        `<text x="${sx(i).toFixed(1)}" y="${VB_H - 60}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="11" fill="#9ca3af">${escapeXml(months[i])}</text>`
    )
    .join("");
  const fcLabel =
    fc.median != null
      ? `<text x="${sx(series.length).toFixed(1)}" y="${VB_H - 60}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="11" fill="#d6a648">+30D</text>`
      : "";

  // Event annotations (optional)
  let eventMarkers = "";
  for (const ev of events) {
    if (ev.idx == null || ev.idx < 0 || ev.idx >= series.length) continue;
    const ex = sx(ev.idx);
    const ey = sy(series[ev.idx]);
    eventMarkers += `<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="4" fill="#b08323" stroke="#ffffff" stroke-width="1.5"/>`;
  }

  return `<svg viewBox="0 0 ${VB_W} ${VB_H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" aria-label="${escapeXml(title)} fan graph: ${series.length} months past plus 30-day forecast" role="img" style="width:100%;height:auto;display:block;">
  <title>${escapeXml(title)} -- ${escapeXml(subtitle)}</title>
  <g stroke="#e3e7eb" stroke-width="1" stroke-dasharray="2 4">${gridLines.join("")}</g>
  <g>${yLabels.join("")}</g>
  ${todayLine}
  ${todayLabel}
  ${cones}
  <polyline points="${actualPts}" fill="none" stroke="#49a5c1" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  ${forecastLine}
  ${currentDot}
  ${currentLabel}
  ${forecastDot}
  ${eventMarkers}
  <g>${xLabels}${fcLabel}</g>
</svg>`;
}
