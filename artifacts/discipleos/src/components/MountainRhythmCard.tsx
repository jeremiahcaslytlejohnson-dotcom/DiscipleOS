import { Mountain, TrendingUp } from "lucide-react";
import { RHYTHM_COPY, RHYTHM_LEVELS } from "../lib/mountain-rhythm";

const PLOT_LEFT = 76;
const PLOT_RIGHT = 352;
const PLOT_TOP = 58;
const PLOT_BOTTOM = 238;

function elevationY(percent: number) {
  const clampedPercent = Math.max(0, Math.min(100, percent));
  return PLOT_BOTTOM - (clampedPercent / 100) * (PLOT_BOTTOM - PLOT_TOP);
}

function trailGeometry(trail: any[], today: string) {
  if (!Array.isArray(trail) || trail.length === 0) {
    return {
      points: [],
      current: null,
      next: null,
      todayX: null,
    };
  }

  const sortedTrail = [...trail].sort((left, right) => left.date.localeCompare(right.date));
  const startDate = Date.parse(`${sortedTrail[0].date}T12:00:00Z`);
  const endDate = Date.parse(`${sortedTrail.at(-1)!.date}T12:00:00Z`);
  const xForDate = (date: string) => {
    const dateTime = Date.parse(`${date}T12:00:00Z`);
    if (dateTime < startDate || dateTime > endDate) return null;
    if (startDate === endDate) return (PLOT_LEFT + PLOT_RIGHT) / 2;
    return PLOT_LEFT + ((dateTime - startDate) / (endDate - startDate)) * (PLOT_RIGHT - PLOT_LEFT);
  };
  const points = sortedTrail.map((point) => ({
    ...point,
    x: xForDate(point.date) ?? PLOT_LEFT,
    y: elevationY(Number(point.elevationPercent || 0)),
  }));
  const current = [...points].reverse().find((point) => point.date <= today) || null;
  const next = points.find((point) => point.date > today) || null;

  return {
    points,
    current,
    next,
    todayX: xForDate(today),
  };
}

function smoothPath(points: Array<{ x: number; y: number }>) {
  if (points.length < 2) {
    return points.length ? `M${points[0].x} ${points[0].y}` : "";
  }
  return points.reduce((path, point, index) => {
    if (index === 0) return `M${point.x} ${point.y}`;
    const previous = points[index - 1];
    const midpoint = (previous.x + point.x) / 2;
    return `${path} Q${midpoint} ${previous.y} ${midpoint} ${(previous.y + point.y) / 2} T${point.x} ${point.y}`;
  }, "");
}

function formatDate(date: string) {
  if (!date) return "";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    new Date(`${date}T12:00:00`),
  );
}

function compactLevelName(name: string) {
  const shortNames: Record<string, string> = {
    "On the Trail": "Trail",
    "Gaining Elevation": "Gaining",
    Ridgeline: "Ridge",
  };
  return shortNames[name] || name;
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
  const geometry = trailGeometry(score?.trail || [], score?.windowEnd || "");
  const elapsedPoints = geometry.points.filter((point) => point.date <= score?.windowEnd);
  const todayPointIndex = geometry.points.findIndex((point) => point.date === score?.windowEnd);
  const currentElevation = Number(score?.currentElevationPercent || 0);
  const todayX =
    geometry.todayX ??
    geometry.current?.x ??
    geometry.next?.x ??
    (PLOT_LEFT + PLOT_RIGHT) / 2;
  const todayPosition = { x: todayX, y: elevationY(currentElevation) };
  const earnedPoints = [...elapsedPoints];
  if (geometry.todayX !== null && !earnedPoints.some((point) => point.date === score?.windowEnd)) {
    earnedPoints.push({ ...todayPosition, date: score?.windowEnd || "", elevationPercent: currentElevation });
    earnedPoints.sort((left, right) => left.date.localeCompare(right.date));
  } else if (earnedPoints.length) {
    const last = earnedPoints[earnedPoints.length - 1];
    if (last.date === score?.windowEnd) earnedPoints[earnedPoints.length - 1] = { ...last, ...todayPosition };
  }
  const earnedLine = smoothPath(earnedPoints);
  const earnedArea = earnedLine
    ? `${earnedLine} L${earnedPoints[earnedPoints.length - 1].x} ${PLOT_BOTTOM} L${earnedPoints[0].x} ${PLOT_BOTTOM} Z`
    : "";
  const futurePoints = geometry.points.filter((point) => point.date > score?.windowEnd);
  const plannedFuturePoints = futurePoints.map((point, index) => ({
    ...point,
    y: elevationY(
      currentElevation +
        ((index + 1) / futurePoints.length) * (100 - currentElevation),
    ),
  }));
  const futureLine = futurePoints.length
    ? smoothPath([todayPosition, ...plannedFuturePoints])
    : "";
  const flagX = todayPointIndex >= 0 ? geometry.points[todayPointIndex].x : todayX;
  const flagY = todayPosition.y;
  const flagLabel =
    geometry.todayX !== null ? "Today" : geometry.current ? "Latest" : "Next";
  const labelInterval = Math.max(1, Math.ceil(geometry.points.length / 7));
  const todayMarkerIsScheduled = todayPointIndex >= 0;
  const currentDateContext =
    geometry.todayX !== null
      ? todayPointIndex >= 0
        ? `Today, ${formatDate(score.windowEnd)} · Day ${todayPointIndex + 1}`
        : `Today, ${formatDate(score.windowEnd)} · no assignment${geometry.current ? ` · Latest: Day ${geometry.points.indexOf(geometry.current) + 1} ${formatDate(geometry.current.date)}` : ""}${geometry.next ? ` · Next: Day ${geometry.points.indexOf(geometry.next) + 1} ${formatDate(geometry.next.date)}` : ""}`
      : geometry.current
        ? `Latest · Day ${geometry.points.indexOf(geometry.current) + 1} · ${formatDate(geometry.current.date)}`
        : geometry.next
          ? `Next · Day ${geometry.points.indexOf(geometry.next) + 1} · ${formatDate(geometry.next.date)}`
          : "No scheduled dates";
  const levelGuides = RHYTHM_LEVELS.map((level) => ({
    ...level,
    y: elevationY(level.min),
    current: level.name === currentLevel,
    next: level.name === nextLevel?.name,
  }));
  const milestoneStatus = score.journeyComplete
    ? `Current: ${currentLevel} · Summit reached`
    : nextLevel
      ? `Current: ${currentLevel} · Next: ${nextLevel.name}`
      : `Current: ${currentLevel} · Final milestone`;
  const mountainRidgePath =
    "M0 248 L35 239 L68 226 Q96 212 125 204 Q146 205 165 215 L190 200 Q202 192 215 187 L238 169 Q250 157 260 149 L274 125 L283 105 Q288 96 293 97 L307 115 L326 142 L344 157 L360 167";

  return (
    <section data-testid="mountain-rhythm-panel" className="discipleos-functional-surface overflow-hidden border-white/10 bg-[linear-gradient(145deg,rgba(12,22,30,0.94),rgba(17,34,38,0.88))] p-4 shadow-[0_12px_32px_rgba(0,0,0,0.25)] sm:p-5">
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-base font-semibold tracking-tight text-white sm:text-lg">
            <Mountain className="h-5 w-5 text-[#D4A017]" strokeWidth={1.6} />
            {title}
          </div>
          <div className="discipleos-secondary-copy discipleos-safe-text mt-0.5 text-xs leading-5 sm:text-sm">
            {hasJourney ? `${score.journeyLabel} · active reading climb` : "Choose a 7-, 20-, or 40-day reading climb"}
          </div>
        </div>
        <TrendingUp aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300/70" strokeWidth={1.7} />
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
          <div className={`mt-4 grid ${showRhythmMetric ? "grid-cols-3" : "grid-cols-2"} gap-0 sm:mt-5`}>
            <div data-testid="mountain-rhythm-metric-today" className="min-w-0 border-l border-white/10 px-2 py-1 first:border-l-0 sm:px-4">
              <div className="discipleos-field-label text-[10px] font-semibold uppercase leading-3 tracking-[0.04em] sm:text-xs sm:leading-4 sm:tracking-[0.12em]">Today’s reading</div>
              <div className="mt-1 break-words text-[14px] font-semibold leading-5 text-white sm:text-lg sm:leading-6">{todayLabel(score)}</div>
              <div className="discipleos-meta-copy mt-1 text-[10px] leading-4 sm:text-[13px] sm:leading-5">
                {score.todayPlanned
                   ? <><span className="sm:hidden">{score.todayPercentage}% read</span><span className="hidden sm:inline">{score.todayPercentage}% of today’s reading</span></>
                   : "No reading assigned today"}
              </div>
            </div>
            <div data-testid="mountain-rhythm-metric-journey" className="min-w-0 border-l border-white/10 px-2 py-1 sm:px-4">
              <div className="discipleos-field-label text-[10px] font-semibold uppercase leading-3 tracking-[0.04em] sm:text-xs sm:leading-4 sm:tracking-[0.12em]">Journey progress</div>
              <div className="mt-1 text-[14px] font-semibold leading-5 text-emerald-200 sm:text-lg sm:leading-6">
                {score.journeyProgress}%
              </div>
              <div className="discipleos-meta-copy mt-1 text-[10px] leading-4 sm:text-[13px] sm:leading-5">
                <span className="sm:hidden">{score.completedDays}/{score.journeyDays} days</span>
                <span className="hidden sm:inline">{score.completedDays} of {score.journeyDays} planned days</span>
              </div>
            </div>
            {showRhythmMetric ? (
              <div data-testid="mountain-rhythm-metric-rhythm" className="min-w-0 border-l border-white/10 px-2 py-1 sm:px-4">
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
              <div className="relative mt-3 h-[232px] overflow-hidden px-1 sm:h-[260px] sm:px-2">
            <svg
              data-testid="mountain-rhythm-mountain"
               className="absolute inset-0 h-full w-full"
              viewBox="0 35 360 255"
              preserveAspectRatio="none"
              role="img"
                aria-label={`${score.journeyLabel} scheduled reading climb. Current elevation ${currentElevation}%, journey progress ${score.journeyProgress}%, consistency ${score.rhythmProgress}%.`}
            >
              <defs>
                <linearGradient id="mountain-rhythm-earned-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#50B878" stopOpacity="0.28" />
                  <stop offset="1" stopColor="#2D7551" stopOpacity="0.025" />
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
              <path d={`${mountainRidgePath} V280 H0 Z`} fill="#16352D" fillOpacity="0.22" />
              <path
                data-testid="mountain-rhythm-main-ridge"
                d={mountainRidgePath}
                fill="none"
                stroke="#A3B69A"
                strokeOpacity="0.48"
                strokeWidth="1.4"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <g data-testid="mountain-rhythm-elevation-guide-lines" aria-label="Elevation guide lines">
                {levelGuides.map((level) => (
                  <g
                    key={level.name}
                  className="inline"
                  >
                    <line
                      x1={PLOT_LEFT - 4}
                      x2="358"
                      y1={level.y}
                      y2={level.y}
                      stroke={level.current ? "#F4D77A" : "#B7C5C0"}
                      strokeOpacity={level.current ? "0.43" : "0.19"}
                      strokeWidth={level.current ? "1.2" : "0.85"}
                      strokeDasharray="3 5"
                    />
                  </g>
                ))}
              </g>
              {earnedArea ? <path data-testid="mountain-rhythm-earned-area" d={earnedArea} fill="url(#mountain-rhythm-earned-fill)" /> : null}
              {earnedLine ? (
                <path
                  data-testid="mountain-rhythm-earned-route"
                  d={earnedLine}
                  fill="none"
                  stroke="#66D18A"
                  strokeOpacity="0.96"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={geometry.points.length > 40 ? "2.3" : "3.2"}
                />
              ) : null}
              {futureLine ? (
                <path
                  data-testid="mountain-rhythm-day-path"
                  d={futureLine}
                  fill="none"
                  stroke="#A9C0AE"
                  strokeOpacity="0.45"
                  strokeDasharray="3 5"
                  strokeLinecap="round"
                  strokeWidth="1.8"
                  aria-label="Planned route after today; future elevation is not earned"
                />
              ) : null}
              <g data-testid="mountain-rhythm-elevation-guides" aria-label="Elevation level labels">
                {levelGuides.map((level) => (
                  <g
                    key={level.name}
                    data-testid={`mountain-rhythm-elevation-guide-${level.min}`}
                    className="inline"
                  >
                    <text
                      x="4"
                      y={level.y + 3}
                      textAnchor="start"
                      fill={level.current ? "#F4D77A" : "#BAC7C6"}
                      fillOpacity={level.current ? "0.98" : "0.78"}
                      fontSize="9.5"
                      fontWeight={level.current ? "650" : "500"}
                      stroke="#0B1418"
                      strokeWidth="2.5"
                      paintOrder="stroke"
                      data-testid={`mountain-rhythm-elevation-label-${level.min}`}
                      aria-label={`${level.current ? "Current stage" : level.next ? "Next milestone" : "Milestone"}: ${level.name}, ${level.min}% threshold`}
                    >
                      <tspan className="sm:hidden">
                        {compactLevelName(level.name)} {level.min}%
                      </tspan>
                      <tspan className="hidden sm:inline">
                        {level.name} {level.min}%
                      </tspan>
                    </text>
                  </g>
                ))}
              </g>
              {geometry.points.map((point, index) => {
                const rhythmStatus = point.rhythmStatus || point.status;
                const isToday =
                  point.date === score?.windowEnd ||
                  (!todayMarkerIsScheduled && geometry.todayX === null && point.date === geometry.current?.date);
                const isFuture = rhythmStatus === "future";
                return (
                  <circle
                    key={point.date}
                    data-testid={`mountain-rhythm-day-point-${index + 1}`}
                    cx={point.x}
                    cy={
                      isToday
                        ? todayPosition.y
                        : isFuture
                          ? plannedFuturePoints.find((futurePoint) => futurePoint.date === point.date)?.y
                          : elevationY(Number(point.elevationPercent || 0))
                    }
                    r={geometry.points.length > 100 ? (isToday ? 3.4 : 1.4) : geometry.points.length > 40 ? (isToday ? 4.2 : 2) : (isToday ? 5.5 : 3.6)}
                    fill={
                      isToday
                        ? "#F4D77A"
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
                    stroke={isToday ? "#F4D77A" : isFuture ? "#82968A" : "rgba(8,16,18,0.9)"}
                    strokeOpacity={isToday ? "1" : "0.9"}
                    strokeWidth={isToday ? 1.5 : isFuture ? 1.1 : 0.8}
                    aria-label={`Day ${index + 1}, ${formatDate(point.date)}, ${rhythmStatus}, readings ${point.status}, ${point.elevationPercent}% rhythm elevation, ${point.earnedPercent}% earned journey progress`}
                  />
                );
              })}
              {!todayMarkerIsScheduled && (geometry.todayX !== null || geometry.points.length === 0) ? (
                <circle
                  cx={todayX}
                  cy={todayPosition.y}
                  r="5.5"
                  fill="#F4D77A"
                  stroke="#0B1418"
                  strokeWidth="1.5"
                  aria-label={`Today, current elevation ${currentElevation}%`}
                />
              ) : null}
              <g data-testid="mountain-rhythm-day-labels" aria-hidden="true">
                {geometry.points.map((point, index) => {
                  const showLabel =
                    index === 0 ||
                    index === geometry.points.length - 1 ||
                    (
                      (index + 1) % labelInterval === 0 &&
                      (todayPointIndex < 0 ||
                        Math.abs(index - todayPointIndex) >= labelInterval)
                    ) ||
                    point.date === score?.windowEnd;
                  return showLabel ? (
                    <text
                      key={`day-label-${point.date}`}
                      x={point.x}
                      y="270"
                      fill={point.date === score?.windowEnd ? "#F4D77A" : "#AAB8BA"}
                      fontSize={geometry.points.length > 40 ? "8.5" : "9.5"}
                      textAnchor={
                        index === 0
                          ? "start"
                          : index === geometry.points.length - 1
                            ? "end"
                            : "middle"
                      }
                    >
                      Day {index + 1}
                    </text>
                  ) : null;
                })}
              </g>
              <g
                data-testid="mountain-rhythm-current-elevation-marker"
                transform={`translate(${flagX - 5} ${flagY - 22})`}
                 aria-label={`${flagLabel}'s position at ${currentLevel}, ${currentElevation}%`}
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
                <text
                  data-testid="mountain-rhythm-current-flag-label"
                  x={flagX > 310 ? -7 : 18}
                  y={flagY > 185 ? "1" : "12"}
                  textAnchor={flagX > 300 ? "end" : "start"}
                  fill="#F4D77A"
                  fontSize="10.5"
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
            className="discipleos-safe-text mt-2 break-words text-[13px] leading-5 text-[#F4D77A] sm:hidden"
            data-testid="mountain-rhythm-current-status-mobile"
          >
            {milestoneStatus}
            <span className="sr-only"> · {currentDateContext}</span>
          </p>
          <p
            className="discipleos-safe-text mt-2 hidden text-[14px] leading-5 text-[#F4D77A] sm:block"
            data-testid="mountain-rhythm-current-status"
          >
            {milestoneStatus}
            <span className="sr-only"> · {score.currentElevationPercent}% elevation · {currentDateContext}</span>
          </p>
          <div className="mt-2 border-t border-white/10 pt-2">
            <details className="group">
              <summary data-testid="mountain-rhythm-help-toggle" className="discipleos-secondary-copy cursor-pointer text-xs font-medium leading-5 marker:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4C542]">
                How Mountain Rhythm works
              </summary>
              <p data-testid="mountain-rhythm-help-copy" className="discipleos-secondary-copy mt-2 text-sm leading-6">
                The solid line and shaded area show recorded elevation through today. The dashed line is the planned route; future days are not earned. {RHYTHM_COPY} Elevation milestones: {RHYTHM_LEVELS.map((level) => `${level.name} ${level.min}%`).join(" · ")}.
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