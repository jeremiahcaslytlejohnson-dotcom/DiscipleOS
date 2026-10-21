import { useEffect, useRef, useState } from "react";
import { Mountain, TrendingUp } from "lucide-react";
import { RHYTHM_COPY, RHYTHM_LEVELS } from "../lib/mountain-rhythm";

const PLOT_LEFT_SHORT = 132;
const PLOT_LEFT_LONG = 120;
const PLOT_RIGHT = 336;
const PLOT_TOP = 68;
const PLOT_BOTTOM = 220;
const SUMMIT_ELEVATION_PERCENT =
  RHYTHM_LEVELS.find((level) => level.name === "Summit")?.min ?? 100;

function elevationY(percent: number) {
  const clampedPercent = Math.max(0, Math.min(100, percent));
  return PLOT_BOTTOM - (clampedPercent / 100) * (PLOT_BOTTOM - PLOT_TOP);
}

function plannedWaypointY(
  index: number,
  pointCount: number,
  currentIndex: number,
  currentElevationPercent: number,
) {
  const anchorIndex = currentIndex >= 0 ? currentIndex : 0;
  const remainingDays = pointCount - 1 - anchorIndex;
  if (remainingDays <= 0) return elevationY(currentElevationPercent);

  const progress = Math.max(0, Math.min(1, (index - anchorIndex) / remainingDays));
  const easedProgress = 0.7 * progress + 0.3 * progress * progress;
  const startElevation = Math.max(0, Math.min(100, currentElevationPercent));
  const targetElevation = Math.max(startElevation, SUMMIT_ELEVATION_PERCENT);
  return elevationY(startElevation + (targetElevation - startElevation) * easedProgress);
}

function trailGeometry(trail: any[], today: string, currentElevationPercent = 0) {
  if (!Array.isArray(trail) || trail.length === 0) {
    return {
      points: [],
      current: null,
      next: null,
      todayX: null,
      plotLeft: PLOT_LEFT_SHORT,
    };
  }

  const sortedTrail = [...trail].sort((left, right) => left.date.localeCompare(right.date));
  const plotLeft = sortedTrail.length >= 20 ? PLOT_LEFT_LONG : PLOT_LEFT_SHORT;
  const startDate = Date.parse(`${sortedTrail[0].date}T12:00:00Z`);
  const endDate = Date.parse(`${sortedTrail.at(-1)!.date}T12:00:00Z`);
  const xForDate = (date: string) => {
    const dateTime = Date.parse(`${date}T12:00:00Z`);
    if (dateTime < startDate || dateTime > endDate) return null;
    if (startDate === endDate) return (plotLeft + PLOT_RIGHT) / 2;
    return plotLeft + ((dateTime - startDate) / (endDate - startDate)) * (PLOT_RIGHT - plotLeft);
  };
  const currentIndex = sortedTrail.findLastIndex((point) => point.date <= today);
  const points = sortedTrail.map((point, index) => ({
    ...point,
    x: xForDate(point.date) ?? plotLeft,
    y:
      point.date <= today
        ? elevationY(
            point.date === sortedTrail[currentIndex]?.date
              ? currentElevationPercent
              : Number(point.elevationPercent || 0),
          )
        : elevationY(currentElevationPercent),
  }));
  const current = [...points].reverse().find((point) => point.date <= today) || null;
  const next = points.find((point) => point.date > today) || null;

  return {
    points,
    current,
    next,
    todayX: xForDate(today),
    plotLeft,
  };
}

function formatDate(date: string) {
  if (!date) return "";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    new Date(`${date}T12:00:00`),
  );
}

function textScaleTransform(x: number, scaleX: number) {
  return `translate(${x} 0) scale(${scaleX} 1) translate(${-x} 0)`;
}

function todayLabel(score: any) {
  if (!score?.todayPlanned) return "Nothing scheduled";
  if (score.todayPercentage >= 100) return "Complete";
  if (score.todayPercentage > 0) return "In progress";
  return "Ready for today";
}

export default function MountainRhythmCard({
  score,
  loading = false,
  summaryOnly = false,
  title = "Mountain Rhythm",
  showRhythmMetric = true,
}: any) {
  const chartRef = useRef<SVGSVGElement | null>(null);
  const [svgTextScaleX, setSvgTextScaleX] = useState(1);
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const updateTextScale = () => {
      const { width, height } = chart.getBoundingClientRect();
      if (!width || !height) return;
      const scaleX = Math.min(1, (height * 360) / (width * 250));
      setSvgTextScaleX((current) => (
        Math.abs(current - scaleX) < 0.01 ? current : scaleX
      ));
    };

    const observer = new ResizeObserver(updateTextScale);
    observer.observe(chart);
    updateTextScale();
    return () => observer.disconnect();
  }, []);

  const hasJourney = Number(score?.journeyDays || 0) > 0;
  const currentLevel = hasJourney ? score?.level || "Basecamp" : "No active journey";
  const currentIndex = hasJourney
    ? Math.max(0, RHYTHM_LEVELS.findIndex((level) => level.name === currentLevel))
    : -1;
  const nextLevel = currentIndex >= 0 ? RHYTHM_LEVELS[currentIndex + 1] : undefined;
  const geometry = trailGeometry(
    score?.trail || [],
    score?.windowEnd || "",
    Number(score?.currentElevationPercent || 0),
  );
  const currentPointIndex = geometry.current ? geometry.points.indexOf(geometry.current) : -1;
  const elapsedPoints = geometry.points.filter((point) => point.date <= score?.windowEnd);
  const hasEarnedProgress = elapsedPoints.some(
    (point) => Number(point.elevationPercent || 0) > 0,
  );
  const earnedRoute = hasEarnedProgress ? elapsedPoints
    .map((point, index) => {
      const elevationPercent =
        index === elapsedPoints.length - 1
          ? Number(score?.currentElevationPercent || 0)
          : Number(point.elevationPercent || 0);
      return `${index === 0 ? "M" : "L"}${point.x} ${elevationY(elevationPercent)}`;
    })
    .join("") : "";
  const projectedPoints =
    hasEarnedProgress && geometry.current && geometry.next && geometry.points.length >= 20
      ? [geometry.current, ...geometry.points.filter((point) => point.date > geometry.current.date)]
      : [];
  const projectedRoute = projectedPoints
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
    .join("");
  const flagX =
    geometry.todayX ??
    geometry.current?.x ??
    geometry.next?.x ??
    (geometry.plotLeft + PLOT_RIGHT) / 2;
  const flagElevationY = elevationY(Number(score?.currentElevationPercent || 0));
  const flagY = flagElevationY;
  const flagLabel = geometry.todayX !== null ? "Today" : geometry.current ? "Latest" : "Next";
  const todayPointIndex = geometry.points.findIndex((point) => point.date === score?.windowEnd);
  const detailedDateContext =
    geometry.todayX !== null
      ? todayPointIndex >= 0
        ? `Today, ${formatDate(score.windowEnd)} · Day ${todayPointIndex + 1}`
        : `Today, ${formatDate(score.windowEnd)} · no assignment${geometry.current ? ` · Latest: Day ${geometry.points.indexOf(geometry.current) + 1} ${formatDate(geometry.current.date)}` : ""}${geometry.next ? ` · Next: Day ${geometry.points.indexOf(geometry.next) + 1} ${formatDate(geometry.next.date)}` : ""}`
      : geometry.current
        ? `Latest · Day ${geometry.points.indexOf(geometry.current) + 1} · ${formatDate(geometry.current.date)}`
        : geometry.next
          ? `Next · Day ${geometry.points.indexOf(geometry.next) + 1} · ${formatDate(geometry.next.date)}`
          : "No scheduled dates";
  const currentDateContext = nextLevel
    ? `Current: ${currentLevel} · Next: ${nextLevel.name}`
    : `Current: ${currentLevel}`;
  const levelGuides = RHYTHM_LEVELS.map((level) => ({
    ...level,
    y: elevationY(level.min),
    current: level.name === currentLevel,
    next: level.name === nextLevel?.name,
  }));
  const mountainRidgePath =
    "M0 248 L35 239 L68 226 Q96 212 125 204 Q146 205 165 215 L190 200 Q202 192 215 187 L238 169 Q250 157 260 149 L274 125 L283 105 Q288 96 293 97 L307 115 L326 142 L344 157 L360 167";

  return (
    <section data-testid="mountain-rhythm-panel" className="discipleos-functional-surface overflow-hidden p-4 sm:p-5 lg:p-6">
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-lg font-semibold text-white">
            <Mountain className="h-5 w-5 text-[#D4A017]" />
            {title}
          </div>
          <div className="discipleos-secondary-copy discipleos-safe-text mt-1 text-sm leading-5">
            {hasJourney ? `${score.journeyLabel} · active reading climb` : "Choose a 7-, 20-, or 40-day reading climb"}
          </div>
        </div>
        <TrendingUp className="h-4 w-4 text-emerald-300/80" />
      </div>

      {loading ? (
        <div className="mt-6 h-32 animate-pulse rounded-2xl bg-white/5" />
      ) : !hasJourney ? (
            <div className="mt-6 border-t border-dashed border-white/15 pt-6 text-center">
          <Mountain className="mx-auto h-8 w-8 text-white/30" />
          <div className="mt-3 text-base font-semibold text-white">No current elevation yet</div>
           <p className="discipleos-secondary-copy mt-2 text-sm leading-6">{score?.message}</p>
        </div>
      ) : (
        <>
           <div className={`mt-4 grid ${showRhythmMetric ? "grid-cols-3" : "grid-cols-2"} gap-1 sm:gap-3`}>
            <div data-testid="mountain-rhythm-metric-today" className="min-w-0 border-l border-white/10 px-1.5 py-1 first:border-l-0 sm:px-3">
              <div className="discipleos-field-label text-[10px] font-semibold uppercase leading-3 tracking-[0.04em] sm:text-xs sm:leading-4 sm:tracking-[0.12em]">Today’s reading</div>
              <div className="mt-1 break-words text-[14px] font-semibold leading-5 text-white sm:text-lg sm:leading-6">{todayLabel(score)}</div>
              <div className="discipleos-meta-copy mt-1 text-[10px] leading-4 sm:text-[13px] sm:leading-5">
                {score.todayPlanned
                   ? <><span className="sm:hidden">{score.todayPercentage}% read</span><span className="hidden sm:inline">{score.todayPercentage}% of today’s reading</span></>
                   : "No reading assigned today"}
              </div>
            </div>
            <div data-testid="mountain-rhythm-metric-journey" className="min-w-0 border-l border-white/10 px-1.5 py-1 sm:px-3">
              <div className="discipleos-field-label text-[10px] font-semibold uppercase leading-3 tracking-[0.04em] sm:text-xs sm:leading-4 sm:tracking-[0.12em]">Journey progress</div>
              <div className="mt-1 text-[14px] font-semibold leading-5 text-emerald-200 sm:text-lg sm:leading-6">
                  {summaryOnly ? score.journeyProgress : Number(score.journeyProgress).toFixed(1)}%
              </div>
              <div className="discipleos-meta-copy mt-1 text-[10px] leading-4 sm:text-[13px] sm:leading-5">
                <span className="sm:hidden">{score.completedDays}/{score.journeyDays} days</span>
                <span className="hidden sm:inline">{score.completedDays} of {score.journeyDays} planned days</span>
              </div>
            </div>
            {showRhythmMetric ? (
              <div data-testid="mountain-rhythm-metric-rhythm" className="min-w-0 border-l border-white/10 px-1.5 py-1 sm:px-3">
                <div className="discipleos-field-label text-[10px] font-semibold uppercase leading-3 tracking-[0.04em] sm:text-xs sm:leading-4 sm:tracking-[0.12em]">Consistency</div>
                <div className="mt-1 text-[14px] font-semibold leading-5 text-white sm:text-lg sm:leading-6">{score.rhythmProgress}%</div>
                <div className="discipleos-meta-copy mt-1 text-[10px] leading-4 sm:text-[13px] sm:leading-5">
                  <span className="sm:hidden">{score.currentTrend}</span>
                  <span className="hidden sm:inline">{score.currentTrend} consistency</span>
                </div>
              </div>
            ) : null}
          </div>

          {summaryOnly ? (
            <div
              data-testid="mountain-rhythm-summary"
              className="discipleos-safe-text mt-4 border-t border-white/10 pt-3 text-xs leading-5 text-[#F4D77A]"
            >
              {score.journeyComplete
                ? `Current: ${currentLevel}`
                : `Current: ${currentLevel} · Next: ${nextLevel?.name || "Summit"}`}
            </div>
          ) : null}

          {!summaryOnly ? (
            <>
              <div className="relative mt-4 h-[240px] overflow-hidden px-2 py-3 sm:h-[290px] sm:px-4 sm:py-3 lg:h-[360px]">
            <svg
              data-testid="mountain-rhythm-mountain"
              ref={chartRef}
               className="absolute inset-0 h-full w-full"
              viewBox="0 44 360 250"
              preserveAspectRatio="none"
              role="img"
                aria-label={`${score.journeyLabel} reading-rhythm trail; current elevation ${score.currentElevationPercent}%, journey progress ${score.journeyProgress}%`}
            >
              <defs>
                <clipPath id="rhythm-forest-clip">
                  <rect x="0" y="246" width="360" height="48" />
                </clipPath>
                <path
                  id="rhythm-pine"
                  d="M0 0L-1.1 5L-.5 4.7L-2.4 10L-1.4 9.5L-3.6 16L-2.4 15L-4.8 23L-3.1 22L-5.8 30L-.7 29L-.7 34L.7 34L.7 29L5.8 30L3.1 22L4.8 23L2.4 15L3.6 16L1.4 9.5L2.4 10L.5 4.7L1.1 5Z"
                />
              </defs>
              <g
                data-chart-layer="scenery"
                data-testid="mountain-rhythm-scenery"
                aria-hidden="true"
              >
              <g
                data-testid="mountain-rhythm-distant-ridges"
                strokeLinejoin="round"
                strokeWidth="1.1"
              >
                <path
                  data-testid="mountain-rhythm-far-range"
                  d="M0 222 L28 204 L50 212 L82 180 L106 191 L132 202 L163 169 L188 184 L214 196 L246 163 L270 177 L304 146 L331 166 L360 154 V340 H0 Z"
                  fill="#263E3D"
                  fillOpacity="0.38"
                  stroke="#78938A"
                  strokeOpacity="0.2"
                />
                <path
                  data-testid="mountain-rhythm-mid-range"
                  d="M0 247 L32 226 L56 235 L88 205 L111 214 L139 229 L170 196 L194 211 L218 228 L248 194 L273 208 L306 179 L334 197 L360 189 V340 H0 Z"
                  fill="#1C3433"
                  fillOpacity="0.56"
                  stroke="#6B877B"
                  strokeOpacity="0.19"
                />
              </g>
              <path
                d={`${mountainRidgePath} V340 H0 Z`}
                fill="#102923"
                fillOpacity="0.88"
              />
              <path
                data-testid="mountain-rhythm-main-ridge"
                d={mountainRidgePath}
                fill="none"
                stroke="#809786"
                strokeOpacity="0.26"
                strokeWidth="0.9"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              <g
                data-testid="mountain-rhythm-forest-depth"
                clipPath="url(#rhythm-forest-clip)"
              >
                <g fill="#3B5946" fillOpacity="0.48">
                  {[3, 16, 24, 39, 53, 61, 78, 93, 105, 124, 136, 143, 161, 178, 187, 204, 219, 231, 249, 257, 276, 291, 307, 316, 338, 351].map((x, index) => (
                    <use
                      key={x}
                      href="#rhythm-pine"
                      transform={`translate(${x} ${266 - x * 0.045 + (index % 4) * 2}) scale(${0.48 + (index % 3) * 0.09} ${0.65 + (index % 5) * 0.06})`}
                    />
                  ))}
                </g>
                <g fill="#203C2E" fillOpacity="0.88">
                  {[7, 20, 34, 48, 69, 85, 99, 117, 132, 152, 168, 181, 199, 214, 238, 253, 269, 285, 301, 327, 345, 358].map((x, index) => (
                    <use
                      key={x}
                      href="#rhythm-pine"
                      transform={`translate(${x} ${271 - x * 0.045 + (index % 3) * 2}) scale(${0.54 + (index % 4) * 0.08} ${0.8 + (index % 3) * 0.1})`}
                    />
                  ))}
                </g>
              </g>
              </g>
              <g data-chart-layer="chart-overlay">
              <g data-testid="mountain-rhythm-elevation-guide-lines" aria-label="Elevation guide lines">
                {levelGuides.map((level) => (
                  <g
                    key={level.name}
                    className={level.current || level.next ? undefined : "hidden sm:inline"}
                  >
                    <line
                      x1="0"
                      x2="360"
                      y1={level.y}
                      y2={level.y}
                      stroke={level.current ? "#E1C66F" : "#C5D0CB"}
                      strokeOpacity={level.current ? "0.3" : "0.19"}
                      strokeWidth={level.current ? "1.1" : "0.8"}
                      strokeDasharray="3 5"
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                ))}
              </g>
              <line
                data-testid="mountain-rhythm-x-axis"
                x1={geometry.plotLeft}
                x2={PLOT_RIGHT}
                y1={PLOT_BOTTOM}
                y2={PLOT_BOTTOM}
                stroke="#AAB6BC"
                strokeOpacity="0.34"
                strokeWidth="0.8"
                vectorEffect="non-scaling-stroke"
              />
              {earnedRoute ? (
                <path
                  data-testid="mountain-rhythm-earned-route"
                  data-chart-line="earned"
                  d={earnedRoute}
                  fill="none"
                  stroke="#78E2A1"
                  strokeOpacity="0.96"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.7"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}
              {projectedRoute ? (
                <path
                  data-testid="mountain-rhythm-projected-route"
                  data-chart-line="projected"
                  d={projectedRoute}
                  fill="none"
                  stroke="#B7C4C7"
                  strokeOpacity="0.42"
                  strokeWidth="1.3"
                  strokeDasharray="3 5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}
              <g data-testid="mountain-rhythm-elevation-guides" aria-label="Elevation level labels">
                {levelGuides.map((level) => (
                  <g
                    key={level.name}
                    data-testid={`mountain-rhythm-elevation-guide-${level.min}`}
                    data-chart-layer="typography"
                  >
                    <g transform={textScaleTransform(8, svgTextScaleX)}>
                    <text
                      x="8"
                      y={level.y + 3.5}
                      textAnchor="start"
                      fill="#C2CDD1"
                      fillOpacity={level.current ? "0.9" : "0.78"}
                      fontSize="9.5"
                      fontFamily="DM Sans, sans-serif"
                      fontWeight="500"
                      letterSpacing="0.1"
                      stroke="#0B1418"
                      strokeWidth="2.2"
                      paintOrder="stroke"
                      data-testid={`mountain-rhythm-elevation-label-${level.min}`}
                      aria-label={`${level.current ? "Current stage" : level.next ? "Next milestone" : "Milestone"}: ${level.name}, ${level.min}% threshold`}
                    >
                      {level.name}
                    </text>
                    </g>
                  </g>
                ))}
              </g>
              {geometry.points.map((point, index) => {
                const rhythmStatus = point.rhythmStatus || point.status;
                const isToday = point.date === score?.windowEnd;
                const isFuture = rhythmStatus === "future";
                const markerY = isFuture
                  ? plannedWaypointY(
                      index,
                      geometry.points.length,
                      currentPointIndex,
                      Number(score?.currentElevationPercent || 0),
                    )
                  : point.y;
                const isLongJourney = geometry.points.length >= 20;
                const projectedTickEvery = Math.max(1, Math.ceil((geometry.points.length - 1) / 6));
                const isProjectedTick =
                  index === geometry.points.length - 1 || index % projectedTickEvery === 0;
                if (isLongJourney && !isToday && !isProjectedTick) return null;
                return (
                  <circle
                    key={point.date}
                    data-testid={`mountain-rhythm-day-point-${index + 1}`}
                    cx={point.x}
                    cy={markerY}
                    r={isToday ? 6.2 : isFuture ? 4.2 : 4.8}
                    fill={
                      isToday
                        ? point.status === "partial"
                          ? "#D4A017"
                          : point.status === "complete"
                            ? "#86EFAC"
                            : "none"
                        : isFuture
                        ? "#14201C"
                        : rhythmStatus === "complete"
                          ? "#86EFAC"
                          : rhythmStatus === "partial"
                            ? "#D4A017"
                            : rhythmStatus === "missed"
                              ? "#94A3B8"
                              : "#14201C"
                    }
                    stroke={isToday
                      ? point.status === "partial"
                        ? "#F4D77A"
                        : point.status === "complete"
                          ? "#B8F0C9"
                          : "#A9C0AE"
                      : isFuture ? "#82968A" : "rgba(8,16,18,0.9)"}
                    strokeOpacity={isToday ? "0.9" : "1"}
                    strokeWidth={isToday ? 1.15 : isFuture ? 0.9 : 0.8}
                    vectorEffect="non-scaling-stroke"
                    transform={`translate(${point.x} 0) scale(${svgTextScaleX} 1) translate(${-point.x} 0)`}
                    aria-label={`Day ${index + 1}, ${rhythmStatus}, readings ${point.status}, ${point.elevationPercent}% current elevation, ${point.earnedPercent}% earned ascent`}
                  />
                );
              })}
              <g data-testid="mountain-rhythm-day-labels" aria-hidden="true">
                {geometry.points.map((point, index) => {
                  const tickEvery = Math.max(1, Math.ceil((geometry.points.length - 1) / 6));
                  const showLabel =
                    geometry.points.length <= 10 ||
                    index === 0 ||
                    index === geometry.points.length - 1 ||
                    ((index % tickEvery === 0) &&
                      geometry.points.length - 1 - index > 1);
                  return showLabel ? (
                    <g key={`day-tick-${point.date}`}>
                    <line
                      x1={point.x}
                      x2={point.x}
                      y1={PLOT_BOTTOM}
                      y2={PLOT_BOTTOM + 4}
                      stroke="#AAB6BC"
                      strokeOpacity="0.5"
                      strokeWidth="0.8"
                    />
                    <text
                      key={`day-label-${point.date}`}
                      x={point.x}
                      y={PLOT_BOTTOM + 18}
                      fill={point.date === score?.windowEnd ? "#E7C968" : "#9FAEB5"}
                      fontSize={geometry.points.length >= 20 ? "8" : "9.5"}
                      fontFamily="DM Sans, sans-serif"
                      fontWeight={point.date === score?.windowEnd ? "600" : "500"}
                      textAnchor="middle"
                      stroke="#0B1418"
                      strokeWidth="1.8"
                      paintOrder="stroke"
                      data-chart-layer="typography"
                      transform={textScaleTransform(point.x, svgTextScaleX)}
                    >
                      {index + 1}
                    </text>
                    </g>
                  ) : null;
                })}
              </g>
              <g
                transform={`translate(${flagX - 5} ${flagY - 22})`}
                 aria-label={`${flagLabel}'s position at ${currentLevel}`}
              >
                <g transform={`translate(5 0) scale(${svgTextScaleX} 1) translate(-5 0)`}>
                <line
                  x1="5"
                  y1="22"
                  x2="5"
                  y2="3"
                  stroke="#F4D77A"
                  strokeLinecap="round"
                  strokeWidth="1.15"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d="M6 4L15 7L6 10Z"
                  fill="#D4A017"
                  stroke="#F4D77A"
                  strokeLinejoin="round"
                  strokeWidth="0.6"
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  data-testid="mountain-rhythm-current-elevation-marker"
                  cx="5"
                  cy="22"
                  r="4.4"
                  fill="#F4D77A"
                  stroke="#0B1418"
                  strokeWidth="1.2"
                  vectorEffect="non-scaling-stroke"
                  aria-label={`Current elevation ${score.currentElevationPercent}%`}
                />
                </g>
                <g
                  data-chart-layer="typography"
                  transform={textScaleTransform(flagX > 300 ? -3 : 14, svgTextScaleX)}
                >
                <text
                  data-testid="mountain-rhythm-current-flag-label"
                  x={flagX > 300 ? -3 : 14}
                  y="12"
                  textAnchor={flagX > 300 ? "end" : "start"}
                  fill="#F4D77A"
                  fontSize="8.5"
                  fontFamily="DM Sans, sans-serif"
                  fontWeight="600"
                  letterSpacing="0.1"
                  stroke="#0B1418"
                  strokeWidth="1.8"
                  paintOrder="stroke"
                  vectorEffect="non-scaling-stroke"
                >
                  {flagLabel}
                </text>
                </g>
              </g>
              </g>
            </svg>
            <ul
              className="sr-only"
              data-testid="mountain-rhythm-accessible-milestones"
              aria-label="Elevation milestones"
            >
              {RHYTHM_LEVELS.map((level) => (
                <li key={level.name}>{level.name}: {level.min}%</li>
              ))}
            </ul>

          </div>

          <p
            className="discipleos-safe-text mt-2 break-words border-t border-white/10 pt-2 text-sm font-medium leading-5 text-[#F4D77A]"
            data-testid="mountain-rhythm-current-status"
          >
            <span>{currentDateContext}</span>
            <span className="sr-only">
              Current elevation: {currentLevel} · {score.currentElevationPercent}% · {detailedDateContext}
            </span>
          </p>
          <div className="mt-1 border-t border-white/10 pt-2">
            <details className="group">
              <summary data-testid="mountain-rhythm-help-toggle" className="discipleos-secondary-copy cursor-pointer text-xs font-medium leading-5 marker:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4C542]">
                How Mountain Rhythm works
              </summary>
              <p data-testid="mountain-rhythm-help-copy" className="discipleos-secondary-copy mt-2 text-sm leading-6">
                {RHYTHM_COPY} Elevation milestones: {RHYTHM_LEVELS.map((level) => `${level.name} ${level.min}%`).join(" · ")}.
              </p>
            </details>
          </div>
            </>
          ) : null}
        </>
      )}
    </section>
  );
}