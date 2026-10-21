import { Mountain, TrendingUp } from "lucide-react";
import { RHYTHM_COPY, RHYTHM_LEVELS } from "./rhythmConstants";

const PLANNED_TRAVERSE_Y = [240, 231, 235, 219, 223, 201, 190];
const PLOT_LEFT_SHORT = 132;
const PLOT_LEFT_LONG = 52;
const PLOT_RIGHT = 336;
const PLOT_TOP = 68;
const PLOT_BOTTOM = 248;

function elevationY(percent: number) {
  const clampedPercent = Math.max(0, Math.min(100, percent));
  return PLOT_BOTTOM - (clampedPercent / 100) * (PLOT_BOTTOM - PLOT_TOP);
}

function plannedTraverseY(index: number, pointCount: number) {
  if (pointCount <= 1) return PLANNED_TRAVERSE_Y[0];

  const anchorPosition =
    (index / (pointCount - 1)) * (PLANNED_TRAVERSE_Y.length - 1);
  const start = Math.floor(anchorPosition);
  const end = Math.min(start + 1, PLANNED_TRAVERSE_Y.length - 1);
  const progress = anchorPosition - start;

  return (
    PLANNED_TRAVERSE_Y[start] +
    (PLANNED_TRAVERSE_Y[end] - PLANNED_TRAVERSE_Y[start]) * progress
  );
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
  let currentIndex = -1;
  for (let index = sortedTrail.length - 1; index >= 0; index--) {
    if (sortedTrail[index].date <= today) {
      currentIndex = index;
      break;
    }
  }
  const projectedStart = Math.max(
    0,
    Number(currentElevationPercent || sortedTrail[currentIndex]?.elevationPercent || 0),
  );
  const projectedEnd = Math.min(70, Math.max(65, projectedStart + 22));
  const points = sortedTrail.map((point, index) => ({
    ...point,
    x: xForDate(point.date) ?? plotLeft,
    y:
      point.date <= today
        ? elevationY(
            point.date === sortedTrail[currentIndex]?.date
              ? projectedStart
              : Number(point.elevationPercent || 0),
          )
        : sortedTrail.length >= 20 && currentIndex >= 0
          ? elevationY(
              projectedStart +
                (projectedEnd - projectedStart) *
                  ((index - currentIndex) / Math.max(1, sortedTrail.length - 1 - currentIndex)),
            )
        : plannedTraverseY(index, sortedTrail.length),
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
  const earnedArea = hasEarnedProgress && elapsedPoints.length
    ? `${earnedRoute}L${elapsedPoints.at(-1)!.x} ${PLOT_BOTTOM}L${elapsedPoints[0].x} ${PLOT_BOTTOM}Z`
    : "";
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
    <section data-testid="mountain-rhythm-panel" className="discipleos-functional-surface overflow-hidden border-[#33424B] bg-[linear-gradient(145deg,rgba(5,13,19,0.98),rgba(8,18,23,0.97),rgba(10,22,23,0.96))] p-4 shadow-[0_18px_42px_rgba(0,0,0,0.32)] sm:p-6 lg:p-7">
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xl font-semibold text-white sm:text-2xl">
            <Mountain className="h-6 w-6 text-[#D4A017]" />
            {title}
          </div>
          <div className="discipleos-secondary-copy discipleos-safe-text mt-1 text-base leading-6 sm:text-lg">
            {hasJourney ? `${score.journeyLabel} · active reading climb` : "Choose a 7-, 20-, or 40-day reading climb"}
          </div>
        </div>
        <TrendingUp className="h-5 w-5 text-emerald-300/80" />
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
          <div className={`mt-5 grid ${showRhythmMetric ? "grid-cols-3" : "grid-cols-2"} gap-1 sm:gap-3`}>
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
             <div className="relative mt-5 h-[250px] overflow-hidden px-2 py-3 sm:h-[310px] sm:px-4 sm:py-3 lg:h-[420px]">
            <svg
              data-testid="mountain-rhythm-mountain"
               className="absolute inset-0 h-full w-full"
              viewBox="0 44 360 236"
              preserveAspectRatio="none"
              role="img"
                aria-label={`${score.journeyLabel} reading-rhythm trail; current elevation ${score.currentElevationPercent}%, journey progress ${score.journeyProgress}%`}
            >
              <defs>
                <linearGradient id="mountain-fill" x1="0" x2="0.15" y1="0" y2="1">
                  <stop offset="0" stopColor="#456B50" stopOpacity="0.66" />
                  <stop offset="0.6" stopColor="#284833" stopOpacity="0.58" />
                  <stop offset="1" stopColor="#0B1712" stopOpacity="0.34" />
                </linearGradient>
                <linearGradient id="earned-area-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#52D98B" stopOpacity="0.36" />
                  <stop offset="1" stopColor="#1A7650" stopOpacity="0.05" />
                </linearGradient>
              </defs>
              <g
                data-testid="mountain-rhythm-distant-ridges"
                className="opacity-60 sm:opacity-100"
                strokeLinejoin="round"
                strokeWidth="1.1"
              >
                <path
                  data-testid="mountain-rhythm-far-range"
                  d="M0 210 L28 196 L50 202 L82 177 L106 185 L132 194 L163 170 L188 182 L214 191 L246 164 L270 176 L304 148 L331 165 L360 158 V280 H0 Z"
                  fill="#34483A"
                  fillOpacity="0.15"
                  stroke="#526B55"
                  strokeOpacity="0.1"
                />
                <path
                  data-testid="mountain-rhythm-mid-range"
                  d="M0 224 L32 213 L56 219 L88 196 L111 205 L139 216 L170 191 L194 202 L218 214 L248 188 L273 198 L306 175 L334 190 L360 185 V280 H0 Z"
                  fill="#3E5943"
                  fillOpacity="0.11"
                  stroke="#5D765F"
                  strokeOpacity="0.08"
                />
              </g>
              <path
                d={`${mountainRidgePath} V280 H0 Z`}
                fill="url(#mountain-fill)"
                className="opacity-80 sm:opacity-100"
              />
              <path
                data-testid="mountain-rhythm-main-ridge"
                d={mountainRidgePath}
                fill="none"
                stroke="none"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <g
                data-testid="mountain-rhythm-forest-depth"
                transform="translate(0 -37)"
                fill="#0A1A17"
                fillOpacity="0.72"
                aria-hidden="true"
              >
                <path d="M8 302l7-19 7 19h-4l6 15H6l6-15zm26-8 6-17 7 17h-4l5 13H29l5-13zm23 8 7-20 7 20h-4l6 15H53l6-15zm23-12 6-17 7 17h-4l5 13H75l5-13zm27 17 7-21 7 21h-4l6 14h-18l6-14zm29-8 6-18 6 18h-4l5 14h-17l5-14zm30 12 7-19 7 19h-4l5 14h-18l5-14zm26-19 6-17 6 17h-4l5 13h-16l5-13zm29 18 7-20 7 20h-4l6 14h-18l6-14zm29-15 6-18 7 18h-4l5 14h-17l5-14zm28 16 7-21 7 21h-4l6 15h-18l6-15zm28-10 6-18 7 18h-4l5 14h-17l5-14zm28 15 7-20 7 20h-4l6 14h-18l6-14z" />
              </g>
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
                      stroke={level.current ? "#F4D77A" : "#D4DDCD"}
                      strokeOpacity={level.current ? "0.46" : "0.2"}
                      strokeWidth={level.current ? "1.35" : "0.9"}
                      strokeDasharray={level.current ? "4 5" : "2 6"}
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
                strokeOpacity="0.46"
                strokeWidth="0.8"
              />
              {earnedArea ? (
                <path
                  data-testid="mountain-rhythm-earned-area"
                  d={earnedArea}
                  fill="url(#earned-area-fill)"
                />
              ) : null}
              {earnedRoute ? (
                <path
                  data-testid="mountain-rhythm-earned-route"
                  data-chart-line="earned"
                  d={earnedRoute}
                  fill="none"
                  stroke="#8BE3A0"
                  strokeOpacity="0.96"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3.8"
                />
              ) : null}
              {projectedRoute ? (
                <path
                  data-testid="mountain-rhythm-projected-route"
                  data-chart-line="projected"
                  d={projectedRoute}
                  fill="none"
                  stroke="#B7C4C7"
                  strokeOpacity="0.58"
                  strokeWidth="2.2"
                  strokeDasharray="4 5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
              <g data-testid="mountain-rhythm-elevation-guides" aria-label="Elevation level labels">
                {levelGuides.map((level) => (
                  <g
                    key={level.name}
                    data-testid={`mountain-rhythm-elevation-guide-${level.min}`}
                    className={level.current || level.next ? undefined : "hidden sm:inline"}
                  >
                    <text
                      x={geometry.plotLeft === PLOT_LEFT_LONG ? 6 : 8}
                      y={level.y + 4}
                      textAnchor="start"
                      fill={level.current ? "#E8EEF0" : "#C9D3D7"}
                      fillOpacity={level.current ? "0.94" : "0.78"}
                      fontSize={geometry.plotLeft === PLOT_LEFT_LONG ? "8.5" : "11"}
                      fontWeight={level.current ? "650" : "500"}
                      stroke="#0B1418"
                      strokeWidth="3.5"
                      paintOrder="stroke"
                      data-testid={`mountain-rhythm-elevation-label-${level.min}`}
                      aria-label={`${level.current ? "Current stage" : level.next ? "Next milestone" : "Milestone"}: ${level.name}, ${level.min}% threshold`}
                    >
                      {level.name === "Gaining Elevation" ? (
                        <>
                          <tspan x={geometry.plotLeft === PLOT_LEFT_LONG ? 6 : 8} dy="-5">Gaining</tspan>
                          <tspan x={geometry.plotLeft === PLOT_LEFT_LONG ? 6 : 8} dy="10">Elevation</tspan>
                        </>
                      ) : level.name}
                    </text>
                  </g>
                ))}
              </g>
              {geometry.points.map((point, index) => {
                const rhythmStatus = point.rhythmStatus || point.status;
                const isToday = point.date === score?.windowEnd;
                const isFuture = rhythmStatus === "future";
                const isLongJourney = geometry.points.length >= 20;
                const projectedTickEvery = Math.max(1, Math.round((geometry.points.length - 1) / 6));
                const isProjectedTick =
                  index === geometry.points.length - 1 || index % projectedTickEvery === 0;
                if (isLongJourney && (!isFuture || !isProjectedTick)) return null;
                return (
                  <circle
                    key={point.date}
                    data-testid={`mountain-rhythm-day-point-${index + 1}`}
                    cx={point.x}
                    cy={point.y}
                    r={isToday ? 6 : isFuture ? 5 : rhythmStatus === "missed" ? 6 : 6.5}
                    fill={
                      isToday
                        ? "none"
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
                    stroke={isToday ? "#A9C0AE" : isFuture ? "#82968A" : "rgba(8,16,18,0.9)"}
                    strokeOpacity={isToday ? "0.55" : "1"}
                    strokeWidth={isToday ? 1.4 : isFuture ? 1.25 : 1}
                    aria-label={`Day ${index + 1}, ${rhythmStatus}, readings ${point.status}, ${point.elevationPercent}% current elevation, ${point.earnedPercent}% earned ascent`}
                  />
                );
              })}
              <g data-testid="mountain-rhythm-day-labels" aria-hidden="true">
                {geometry.points.map((point, index) => {
                  const tickEvery = Math.max(1, Math.round((geometry.points.length - 1) / 6));
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
                      y="272"
                      fill="#C9CDD3"
                      fontSize={geometry.points.length >= 20 ? "10" : "14"}
                      textAnchor="middle"
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
                <line
                  x1="5"
                  y1="22"
                  x2="5"
                  y2="3"
                  stroke="#F4D77A"
                  strokeLinecap="round"
                  strokeWidth="1.4"
                />
                <path
                  d="M6 4L15 7L6 10Z"
                  fill="#D4A017"
                  stroke="#F4D77A"
                  strokeLinejoin="round"
                  strokeWidth="0.65"
                />
                <circle
                  data-testid="mountain-rhythm-current-elevation-marker"
                  cx="5"
                  cy="22"
                  r="6"
                  fill="#F4D77A"
                  stroke="#0B1418"
                  strokeWidth="1.5"
                  aria-label={`Current elevation ${score.currentElevationPercent}%`}
                />
                <text
                  data-testid="mountain-rhythm-current-flag-label"
                  x={flagX > 300 ? -3 : 18}
                  y="12"
                  textAnchor={flagX > 300 ? "end" : "start"}
                  fill="#F4D77A"
                  fontSize="13"
                  fontWeight="600"
                  stroke="#0B1418"
                  strokeWidth="2"
                  paintOrder="stroke"
                >
                  {flagLabel}
                </text>
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
            className="discipleos-safe-text mt-3 break-words border-y border-white/15 py-3 text-sm font-medium leading-5 text-[#F4D77A] sm:text-base"
            data-testid="mountain-rhythm-current-status"
          >
            <span>{currentDateContext}</span>
            <span className="sr-only">
              Current elevation: {currentLevel} · {score.currentElevationPercent}% · {detailedDateContext}
            </span>
          </p>
          <div className="mt-2 border-t border-white/10 pt-2">
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