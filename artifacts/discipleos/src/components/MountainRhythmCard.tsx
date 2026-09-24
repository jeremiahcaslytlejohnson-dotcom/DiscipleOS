import { Mountain, TrendingUp } from "lucide-react";
import { RHYTHM_COPY, RHYTHM_LEVELS } from "../lib/mountain-rhythm";

const ASCENT_MARKERS = RHYTHM_LEVELS.map((level) => level.min);

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
    y: 236 - (Number(point.elevationPercent || 0) / 100) * 158,
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
  const traveledPoints = geometry.points.filter((point) => point.status !== "future");
  const traveledPath = traveledPoints
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
    .join("");
  const flagX = Math.max(7, Math.min(geometry.current.x - 5, 342));
  const flagY = Math.max(8, Math.min(geometry.current.y - 30, 246));

  return (
    <section data-testid="mountain-rhythm-panel" className="discipleos-functional-surface overflow-hidden border-[#D4A017]/25 bg-[linear-gradient(145deg,rgba(12,22,28,0.98),rgba(16,37,35,0.94),rgba(212,160,23,0.10))] p-4 shadow-[0_12px_32px_rgba(0,0,0,0.25)] sm:p-5">
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-lg font-semibold text-white">
            <Mountain className="h-5 w-5 text-[#D4A017]" />
            {title}
          </div>
          <div className="discipleos-secondary-copy discipleos-safe-text mt-1 text-sm">
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
              <div className="discipleos-field-label text-[10px] uppercase tracking-[0.16em]">Today’s reading</div>
              <div className="mt-1 text-base font-semibold text-white">{todayLabel(score)}</div>
              <div className="discipleos-meta-copy mt-1 text-xs">
                {score.todayPlanned
                   ? `${score.todayPercentage}% of today’s reading`
                   : "No reading assigned today"}
              </div>
            </div>
            <div data-testid="mountain-rhythm-metric-journey" className="min-w-0 border-l border-white/10 px-3 py-1">
              <div className="discipleos-field-label text-[10px] uppercase tracking-[0.16em]">Journey progress</div>
              <div className="mt-1 text-base font-semibold text-emerald-200">
                {score.journeyProgress}%
              </div>
              <div className="discipleos-meta-copy mt-1 text-xs">
                {score.completedDays} of {score.journeyDays} planned days
              </div>
            </div>
            {showRhythmMetric ? (
              <div data-testid="mountain-rhythm-metric-rhythm" className="min-w-0 border-l border-white/10 px-3 py-1">
                <div className="discipleos-field-label text-[10px] uppercase tracking-[0.16em]">Recent rhythm</div>
                <div className="mt-1 text-base font-semibold text-white">{score.rhythmProgress}%</div>
                <div className="discipleos-meta-copy mt-1 text-xs">{score.currentTrend} consistency</div>
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
                : `Current: ${currentLevel} · Next: ${nextLevel?.name || "Summit Rhythm"}`}
            </div>
          ) : null}

          {!summaryOnly ? (
            <>
            <div className="relative mt-5 h-[220px] overflow-hidden px-2 py-3 sm:h-[250px] sm:px-4 sm:py-3">
             <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-20 border-r border-white/[0.08] bg-[#0B1418]/25" />
            <svg
              data-testid="mountain-rhythm-mountain"
               className="absolute inset-y-0 left-20 h-full w-[calc(100%-5rem)]"
              viewBox="0 0 360 280"
              preserveAspectRatio="none"
              role="img"
               aria-label={`${score.journeyLabel} mountain showing ${score.journeyProgress}% journey progress`}
            >
              <defs>
                <linearGradient id="mountain-fill" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0" stopColor="#D4A017" stopOpacity="0.22" />
                  <stop offset="0.48" stopColor="#4F9D69" stopOpacity="0.15" />
                  <stop offset="1" stopColor="#091216" stopOpacity="0.05" />
                </linearGradient>
                <linearGradient id="earned-route" x1="0" x2="1" y1="1" y2="0">
                  <stop offset="0" stopColor="#4F9D69" />
                  <stop offset="1" stopColor="#86EFAC" />
                </linearGradient>
              </defs>
              <path
                d={`M0 242L48 211L85 224L128 178L165 201L217 124L257 159L306 ${peakY}L360 211V280H0Z`}
                fill="url(#mountain-fill)"
              />
              <path
                d={`M0 242L48 211L85 224L128 178L165 201L217 124L257 159L306 ${peakY}L360 211`}
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="1.5"
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
                stroke="rgba(255,255,255,0.2)"
                strokeDasharray="3 6"
                strokeLinecap="round"
                strokeWidth="2.5"
              />
              {traveledPath ? (
                <path
                  d={traveledPath}
                  fill="none"
                  stroke="url(#earned-route)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="4"
                />
              ) : null}
              {geometry.points.map((point, index) => (
                <circle
                  key={point.date}
                  data-testid={`mountain-rhythm-day-point-${index + 1}`}
                  cx={point.x}
                  cy={point.y}
                  r={point.status === "future" ? 3 : point.status === "missed" ? 4 : 4.5}
                  fill={
                    point.status === "future"
                      ? "rgba(255,255,255,0.2)"
                      : point.status === "missed"
                        ? "#94A3B8"
                        : point.status === "partial"
                          ? "#D4A017"
                          : "#86EFAC"
                  }
                  stroke={point.date === geometry.current.date ? "#F4D77A" : "rgba(8,16,18,0.9)"}
                  strokeWidth={point.date === geometry.current.date ? 2 : 1}
                  aria-label={`Day ${index + 1}, ${point.status}, ${point.elevationPercent}% current elevation, ${point.earnedPercent}% earned ascent`}
                />
              ))}
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
                      fill="rgba(255,255,255,0.48)"
                      fontSize="9"
                      textAnchor="middle"
                    >
                      {index + 1}
                    </text>
                  ) : null;
                })}
              </g>
              <g
                transform={`translate(${flagX} ${flagY})`}
                aria-label={`Current position at ${currentLevel}`}
              >
                <line
                  x1="5"
                  y1="30"
                  x2="5"
                  y2="3"
                  stroke="#F4D77A"
                  strokeLinecap="round"
                  strokeWidth="1.75"
                />
                <path
                  d="M6 4L19 8L6 13Z"
                  fill="#D4A017"
                  stroke="#F4D77A"
                  strokeLinejoin="round"
                  strokeWidth="0.75"
                />
              </g>
            </svg>

            {RHYTHM_LEVELS.map((level, index) => {
              const reached = score.currentElevationPercent >= ASCENT_MARKERS[index];
              return (
                <div
                  key={level.name}
                   className="absolute left-2 flex w-16 items-center gap-2 sm:left-3"
                  style={{ bottom: `${12 + index * 17}%` }}
                >
                  <span
                     className={`h-2.5 w-2.5 shrink-0 rounded-full border ${
                      index === currentIndex
                        ? "border-[#F4D77A] bg-[#D4A017]"
                        : reached
                          ? "border-emerald-200 bg-emerald-400"
                          : "border-white/25 bg-[#10171A]"
                    }`}
                  />
                   <span
                     className={`text-[10px] leading-[1.15] ${
                        reached ? "text-white/75" : "discipleos-meta-copy"
                     }`}
                   >
                    {level.name}
                  </span>
                </div>
              );
            })}

          </div>

          <div
            className="discipleos-safe-text mt-4 flex min-w-0 items-start gap-2 text-xs leading-5 text-[#F4D77A]"
            data-testid="mountain-rhythm-milestone-line"
          >
            <span>
              {score.journeyComplete
                ? `Current: ${currentLevel}`
                : `Current: ${currentLevel} · Next: ${nextLevel?.name || "Summit Rhythm"}`}
            </span>
          </div>
          <p className="discipleos-secondary-copy mt-3 text-xs leading-5">{RHYTHM_COPY}</p>
            </>
          ) : null}
        </>
      )}
    </section>
  );
}