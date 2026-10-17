import { Mountain, TrendingUp } from "lucide-react";
import { RHYTHM_COPY, RHYTHM_LEVELS } from "../lib/mountain-rhythm";

const ASCENT_MARKERS = RHYTHM_LEVELS.map((level) => level.min);
const PLANNED_TRAVERSE_Y = [240, 232, 236, 220, 224, 203, 211];

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

function trailGeometry(trail: any[]) {
  if (!Array.isArray(trail) || trail.length === 0) {
    return {
      path: "M24 236L336 78",
      points: [],
      current: { x: 24, y: 236 },
    };
  }

  const points = trail.map((point, index) => ({
    ...point,
    x: trail.length === 1 ? 24 : 24 + (index / (trail.length - 1)) * 312,
    y: plannedTraverseY(index, trail.length),
  }));
  const current =
    [...points].reverse().find((point) => point.status !== "future") ||
    points[0];

  return {
    path: points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join(""),
    points,
    current,
  };
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
  const mountainScale = Number(score?.mountainScale || 0.72);
  const peakY = Math.round(58 + (1 - mountainScale) * 74);
  const geometry = trailGeometry(score?.trail || []);
  const earnedRoute = geometry.points
    .map((point, index) => {
      if (point.status !== "complete" || Number(point.planned || 0) <= 0) {
        return "";
      }
      const previous = geometry.points[index - 1] || { x: 0, y: 234 };
      return `M${previous.x} ${previous.y}L${point.x} ${point.y}`;
    })
    .join("");
  const flagX = Math.max(7, Math.min(geometry.current.x - 5, 342));
  const flagY = Math.max(6, Math.min(geometry.current.y - 22, 252));
  const currentPointIsToday = geometry.current.date === score?.windowEnd;
  const flagLabel = currentPointIsToday ? "Today" : "Latest day";
  const mountainRidgePath =
    `M0 247 L22 241 L43 236 L60 235 L81 226 L101 220 L116 212 L132 203 L145 199 L156 203 L169 212 L184 218 L198 212 L213 201 L229 188 L244 178 L256 174 L266 177 L276 166 L283 149 L289 ${peakY} L296 ${peakY + 11} L304 ${peakY + 25} L313 ${peakY + 40} L323 ${peakY + 54} L335 163 L347 172 L360 180`;

  return (
    <section data-testid="mountain-rhythm-panel" className="discipleos-functional-surface overflow-hidden border-[#D4A017]/25 bg-[linear-gradient(145deg,rgba(12,22,28,0.98),rgba(16,37,35,0.94),rgba(212,160,23,0.10))] p-4 shadow-[0_12px_32px_rgba(0,0,0,0.25)] sm:p-5">
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-lg font-semibold text-white">
            <Mountain className="h-5 w-5 text-[#D4A017]" />
            {title}
          </div>
          <div className="discipleos-secondary-copy discipleos-safe-text mt-1 text-[15px] leading-6">
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
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div data-testid="mountain-rhythm-metric-today" className="min-w-0 border-l border-white/10 px-3 py-1 first:border-l-0">
              <div className="discipleos-field-label text-xs font-semibold uppercase tracking-[0.12em]">Today’s reading</div>
              <div className="mt-1 text-lg font-semibold leading-6 text-white">{todayLabel(score)}</div>
              <div className="discipleos-meta-copy mt-1 text-[13px] leading-5">
                {score.todayPlanned
                   ? `${score.todayPercentage}% of today’s reading`
                   : "No reading assigned today"}
              </div>
            </div>
            <div data-testid="mountain-rhythm-metric-journey" className="min-w-0 border-l border-white/10 px-3 py-1">
              <div className="discipleos-field-label text-xs font-semibold uppercase tracking-[0.12em]">Journey progress</div>
              <div className="mt-1 text-lg font-semibold leading-6 text-emerald-200">
                {score.journeyProgress}%
              </div>
              <div className="discipleos-meta-copy mt-1 text-[13px] leading-5">
                {score.completedDays} of {score.journeyDays} planned days
              </div>
            </div>
            {showRhythmMetric ? (
              <div data-testid="mountain-rhythm-metric-rhythm" className="min-w-0 border-l border-white/10 px-3 py-1">
                <div className="discipleos-field-label text-xs font-semibold uppercase tracking-[0.12em]">Consistency</div>
                <div className="mt-1 text-lg font-semibold leading-6 text-white">{score.rhythmProgress}%</div>
                <div className="discipleos-meta-copy mt-1 text-[13px] leading-5">{score.currentTrend} consistency</div>
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
             <div className="relative mt-3 h-[220px] overflow-hidden px-2 py-3 sm:h-[250px] sm:px-4 sm:py-3">
              <div
                data-testid="mountain-rhythm-stage-rail"
                className="pointer-events-none absolute inset-y-0 left-0 z-[1] flex w-28 flex-col border-r border-white/[0.12] bg-[#0B1418]/60 px-2 py-3"
              >
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/75">
                  Milestones
                </div>
                <div className="flex min-h-0 flex-1 flex-col-reverse justify-between gap-y-1">
                  {RHYTHM_LEVELS.map((level, index) => {
                    const reached = score.currentElevationPercent >= ASCENT_MARKERS[index];
                    const current = index === currentIndex;
                    const next = index === currentIndex + 1 && !score.journeyComplete;
                    return (
                      <div key={level.name} className="flex min-h-0 items-center gap-2.5">
                        <span
                          data-testid={`mountain-rhythm-stage-indicator-${index}`}
                          aria-label={`${level.name}: ${current ? "Current stage" : next ? "Next stage" : reached ? "Reached" : "Not reached"}`}
                          className={`h-3 w-3 shrink-0 rounded-full border ${
                            current
                              ? "border-[#F4D77A] bg-[#D4A017] shadow-[0_0_0_2px_rgba(212,160,23,0.16)]"
                              : next
                                ? "border-[#D4A017] bg-transparent"
                              : reached
                                ? "border-emerald-200 bg-emerald-400"
                                : "border-white/30 bg-[#10171A]"
                          }`}
                        />
                        <span
                          data-testid={`mountain-rhythm-stage-label-${index}`}
                            className={`min-w-0 text-xs font-medium leading-[1.25] ${
                            current
                              ? "text-[#F4D77A]"
                              : next
                                ? "text-[#E7C76A]"
                              : reached
                                ? "text-white/95"
                                : "text-white/80"
                          }`}
                        >
                          {level.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            <svg
              data-testid="mountain-rhythm-mountain"
               className="absolute inset-y-0 left-28 h-full w-[calc(100%-7rem)]"
              viewBox="0 0 360 280"
              preserveAspectRatio="none"
              role="img"
                aria-label={`${score.journeyLabel} recent seven-day reading-rhythm trail; current elevation ${score.currentElevationPercent}%, journey progress ${score.journeyProgress}%`}
            >
              <defs>
                <linearGradient id="mountain-fill" x1="0" x2="0.15" y1="0" y2="1">
                  <stop offset="0" stopColor="#456B50" stopOpacity="0.66" />
                  <stop offset="0.6" stopColor="#284833" stopOpacity="0.58" />
                  <stop offset="1" stopColor="#0B1712" stopOpacity="0.34" />
                </linearGradient>
              </defs>
              <g
                data-testid="mountain-rhythm-distant-ridges"
                strokeLinejoin="round"
                strokeWidth="1.1"
              >
                <path
                  data-testid="mountain-rhythm-far-range"
                  d="M0 191 L27 178 L48 184 L76 148 L96 157 L124 132 L148 151 L174 162 L202 139 L226 151 L253 119 L276 138 L301 111 L324 129 L346 143 L360 138 V280 H0 Z"
                  fill="#34483A"
                  fillOpacity="0.3"
                  stroke="#526B55"
                  strokeOpacity="0.32"
                />
                <path
                  data-testid="mountain-rhythm-mid-range"
                  d="M0 216 L30 200 L53 207 L82 182 L106 194 L132 173 L155 189 L180 207 L207 187 L230 197 L256 171 L280 185 L305 158 L328 175 L348 192 L360 187 V280 H0 Z"
                  fill="#3E5943"
                  fillOpacity="0.27"
                  stroke="#5D765F"
                  strokeOpacity="0.3"
                />
              </g>
              <path
                d={`${mountainRidgePath} V280 H0 Z`}
                fill="url(#mountain-fill)"
              />
              <path
                data-testid="mountain-rhythm-main-ridge"
                d={mountainRidgePath}
                fill="none"
                stroke="#A3B69A"
                strokeOpacity="0.58"
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
               <g
                 transform="translate(8 214)"
                opacity="0.42"
                aria-label="Basecamp cabin"
              >
                <path
                  d="M1 10L11 2L21 10V22H1Z"
                  fill="#0D181A"
                  stroke="#53645A"
                  strokeLinejoin="round"
                  strokeWidth="1.25"
                />
                <path
                  d="M0 10L11 1L22 10"
                  fill="none"
                  stroke="#6B704C"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.75"
                />
                <rect x="8.5" y="15" width="5" height="7" rx="0.75" fill="#53604D" />
                <rect x="3.75" y="14.25" width="3.25" height="3.25" rx="0.5" fill="#9B8747" />
                <rect x="15" y="14.25" width="3.25" height="3.25" rx="0.5" fill="#9B8747" />
              </g>
              <path
                data-testid="mountain-rhythm-day-path"
                d={geometry.path}
                fill="none"
                stroke="#A9C0AE"
                strokeOpacity="0.36"
                strokeDasharray="3.5 5"
                strokeLinecap="round"
                strokeWidth="2.7"
              />
              {earnedRoute ? (
                <path
                  data-testid="mountain-rhythm-earned-route"
                  d={earnedRoute}
                  fill="none"
                  stroke="#6DAE7B"
                  strokeOpacity="0.86"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3.1"
                />
              ) : null}
              {geometry.points.map((point, index) => {
                const rhythmStatus = point.rhythmStatus || point.status;
                const isToday = point.date === score?.windowEnd;
                const isFuture = rhythmStatus === "future";
                return (
                  <circle
                    key={point.date}
                    data-testid={`mountain-rhythm-day-point-${index + 1}`}
                    cx={point.x}
                    cy={point.y}
                    r={isToday ? 6 : isFuture ? 4.5 : rhythmStatus === "missed" ? 5 : 5.5}
                    fill={
                      isFuture
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
                    strokeWidth={isToday ? 2.2 : isFuture ? 1.25 : 1}
                    aria-label={`Day ${index + 1}, ${rhythmStatus}, readings ${point.status}, ${point.elevationPercent}% current elevation, ${point.earnedPercent}% earned ascent`}
                  />
                );
              })}
              <g data-testid="mountain-rhythm-day-labels" aria-hidden="true">
                {geometry.points.map((point, index) => {
                  const isShortJourney = geometry.points.length <= 10;
                  const showLabel =
                    isShortJourney ||
                    index === 0 ||
                    index === geometry.points.length - 1 ||
                    (index + 1) % 5 === 0;
                  return showLabel ? (
                    <text
                      key={`day-label-${point.date}`}
                      x={point.x}
                      y="272"
                      fill="#C9CDD3"
                      fontSize="12"
                      textAnchor="middle"
                    >
                      {index + 1}
                    </text>
                  ) : null;
                })}
              </g>
              <g
                transform={`translate(${flagX} ${flagY})`}
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
                <text
                  data-testid="mountain-rhythm-current-flag-label"
                  x={flagX > 300 ? -3 : 18}
                  y="8"
                  textAnchor={flagX > 300 ? "end" : "start"}
                  fill="#F4D77A"
                  fontSize="11"
                  fontWeight="600"
                  stroke="#0B1418"
                  strokeWidth="2"
                  paintOrder="stroke"
                >
                  {flagLabel}
                </text>
              </g>
            </svg>

          </div>

          <div
            className="discipleos-safe-text mt-3 flex min-w-0 items-center gap-2 text-[13px] leading-5"
            data-testid="mountain-rhythm-milestone-line"
          >
            <span className="text-[#F4D77A]">Current: {currentLevel}</span>
            {!score.journeyComplete ? (
              <span className="text-[#E7C76A]">· Next: {nextLevel?.name || "Summit"}</span>
            ) : null}
          </div>
          <div className="mt-2 border-t border-white/10 pt-2">
            <details className="group">
              <summary data-testid="mountain-rhythm-help-toggle" className="discipleos-secondary-copy cursor-pointer text-xs font-medium leading-5 marker:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4C542]">
                How Mountain Rhythm works
              </summary>
              <p data-testid="mountain-rhythm-help-copy" className="discipleos-secondary-copy mt-2 text-sm leading-6">{RHYTHM_COPY}</p>
            </details>
          </div>
            </>
          ) : null}
        </>
      )}
    </section>
  );
}