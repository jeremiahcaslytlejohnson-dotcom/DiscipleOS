import { useState } from "react";
import { Mountain, TrendingUp } from "lucide-react";
import { RHYTHM_COPY, RHYTHM_LEVELS } from "../lib/mountain-rhythm";
import {
  buildMountainRhythmTerrainPoints,
  type RhythmChartSeries,
} from "../lib/mountain-rhythm-chart";

const ASCENT_MARKERS = RHYTHM_LEVELS.map((level) => level.min);

function trailGeometry(trail: any[]) {
  const points = (Array.isArray(trail) ? trail : []).map((point, index, all) => ({
    ...point,
    x: all.length === 1 ? 24 : 16 + (index / (all.length - 1)) * 328,
    y: 238 - (Number(point.earnedPercent || 0) / 100) * 145,
  }));
  return { points, current: [...points].reverse().find((point) => point.status !== "future") || points[0] };
}

function smoothPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return "";
  if (points.length === 1) return `M${points[0].x} ${points[0].y}`;
  let path = `M${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const midX = (previous.x + current.x) / 2;
    const midY = (previous.y + current.y) / 2;
    path += ` Q${previous.x} ${previous.y} ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  return `${path} T${last.x} ${last.y}`;
}

function seriesPath(series: RhythmChartSeries, points: any[]) {
  const plotted = series.values.flatMap((value, index) =>
    value === null || !points[index] ? [] : [{
      x: points[index].x,
      y: 236 - (value / 100) * 145,
      value,
      date: points[index].date,
      day: index + 1,
    }],
  );
  return { path: smoothPath(plotted), plotted };
}

function todayLabel(score: any) {
  if (!score?.todayPlanned) return "Nothing scheduled";
  if (score.todayPercentage >= 100) return "Complete";
  if (score.todayPercentage > 0) return "In progress";
  return "Ready for today";
}

export default function MountainRhythmCard({
  score,
  chartSeries = [],
  loading = false,
  summaryOnly = false,
  title = "Mountain Rhythm",
  showRhythmMetric = true,
}: any) {
  const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({});
  const hasJourney = Number(score?.journeyDays || 0) > 0;
  const currentLevel = hasJourney ? score?.level || "Basecamp" : "No active journey";
  const currentIndex = hasJourney
    ? Math.max(0, RHYTHM_LEVELS.findIndex((level) => level.name === currentLevel))
    : -1;
  const nextLevel = currentIndex >= 0 ? RHYTHM_LEVELS[currentIndex + 1] : undefined;
  const geometry = trailGeometry(score?.trail || []);
  const terrainPoints = buildMountainRhythmTerrainPoints(
    geometry.points.length || Number(score?.journeyDays || 7),
  );
  const terrainPath = smoothPath(terrainPoints);
  const terrainArea = terrainPath
    ? `${terrainPath} L344 280 L16 280 Z`
    : "";
  const visibleSeriesItems = (chartSeries as RhythmChartSeries[])
    .filter((series) => visibleSeries[series.key] !== false);
  const todayPoint = geometry.points.find((point) => point.date === score?.windowEnd);
  const currentPoint = todayPoint;
  let previousEarnedPercent = 0;
  const plottedDayPoints = geometry.points.map((point, index) => {
    const earned = point.date <= score?.windowEnd &&
      Number(point.earnedPercent || 0) > previousEarnedPercent;
    previousEarnedPercent = Math.max(previousEarnedPercent, Number(point.earnedPercent || 0));
    return { ...point, index, earned };
  });
  const traveledPath = smoothPath(
    plottedDayPoints
      .filter((point) => point.date <= score?.windowEnd)
      .map((point) => ({ x: point.x, y: point.y })),
  );

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
              <div className="relative mt-5 h-[240px] overflow-hidden px-2 py-2 sm:h-[270px] sm:px-4">
              <div
                data-testid="mountain-rhythm-stage-rail"
                className="pointer-events-none absolute inset-y-0 left-0 z-[1] flex w-28 flex-col border-r border-white/[0.12] bg-[#0B1418]/60 px-2 py-3"
              >
                <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/55">
                  Milestones
                </div>
                <div className="flex min-h-0 flex-1 flex-col-reverse justify-between">
                  {RHYTHM_LEVELS.map((level, index) => {
                    const reached = score.currentElevationPercent >= ASCENT_MARKERS[index];
                    const current = index === currentIndex;
                    const next = index === currentIndex + 1 && !score.journeyComplete;
                    return (
                      <div key={level.name} className="flex min-h-0 items-center gap-2">
                        <span
                          data-testid={`mountain-rhythm-stage-indicator-${index}`}
                          aria-label={`${level.name}: ${current ? "Current stage" : next ? "Next stage" : reached ? "Reached" : "Not reached"}`}
                          className={`h-3 w-3 shrink-0 rounded-full border ${
                            current
                              ? "border-[#F4D77A] bg-[#D4A017] shadow-[0_0_0_2px_rgba(212,160,23,0.15)]"
                              : next
                                ? "border-[#D4A017] bg-[#D4A017]/20"
                              : reached
                                ? "border-emerald-200 bg-emerald-400"
                                : "border-white/30 bg-[#10171A]"
                          }`}
                        />
                        <span
                          data-testid={`mountain-rhythm-stage-label-${index}`}
                          className={`min-w-0 text-[11px] font-medium leading-[1.15] ${
                            current
                              ? "text-[#F4D77A]"
                              : next
                                ? "text-[#E7C76A]"
                              : reached
                                ? "text-white/85"
                                : "text-white/65"
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
              role="group"
              aria-label={`${score.journeyLabel} planned mountain route and earned progress chart`}
            >
              <path
                d={terrainArea}
                fill="#52735F"
                fillOpacity="0.16"
              />
              <path
                data-testid="mountain-rhythm-planned-terrain"
                d={terrainPath}
                fill="none"
                stroke="#91A98E"
                strokeOpacity="0.45"
                strokeWidth="1.4"
                aria-label="Planned route terrain"
              />
              <path
                data-testid="mountain-rhythm-day-path"
                d={traveledPath}
                fill="none"
                stroke="#5E9A70"
                strokeOpacity="0.8"
                strokeLinecap="round"
                strokeWidth="2"
              />
              {visibleSeriesItems.map((series) => {
                const { path, plotted } = seriesPath(series, geometry.points);
                return path ? (
                  <g key={series.key} data-testid={`mountain-rhythm-series-${series.key}`}>
                    <path
                      d={path}
                      fill="none"
                      stroke={series.color}
                      strokeOpacity={series.key === "combined" ? 0.72 : 0.9}
                      strokeWidth={series.key === "scripture" ? 2.5 : 1.6}
                      strokeDasharray={series.key === "fasting" ? "4 3" : series.key === "combined" ? "2 3" : undefined}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      tabIndex={0}
                      aria-label={`${series.label} line, cumulative completion of scheduled commitments`}
                    >
                      <title>{series.label}: scheduled commitment completion over time</title>
                    </path>
                    {plotted.map((point) => (
                      <circle
                        key={`${series.key}-${point.date}`}
                        cx={point.x}
                        cy={point.y}
                        r="2.3"
                        fill={series.color}
                        stroke="#0B1418"
                        strokeWidth="1"
                        aria-label={`${series.label}, day ${point.day}, ${point.date}, ${point.value}% of scheduled commitments completed`}
                      >
                        <title>{`${series.label} · ${point.date} · ${point.value}%`}</title>
                      </circle>
                    ))}
                  </g>
                ) : null;
              })}
              {plottedDayPoints.map((point) => {
                const today = point.date === score?.windowEnd;
                const future = point.date > score?.windowEnd;
                return (
                  <circle
                    key={point.date}
                    data-testid={`mountain-rhythm-day-point-${point.index + 1}`}
                    cx={point.x}
                    cy={point.y}
                    r={today ? 5.5 : 3.5}
                    fill={today ? "#D4A017" : point.earned ? "#86EFAC" : "rgba(12,20,22,0.9)"}
                    stroke={today ? "#F4D77A" : future ? "rgba(255,255,255,0.28)" : point.earned ? "#C7F3D0" : "rgba(255,255,255,0.38)"}
                    strokeWidth={today ? 2 : 1}
                    tabIndex={today ? 0 : -1}
                    aria-label={`Day ${point.index + 1}, ${point.date}, ${today ? "Today" : future ? "Upcoming" : point.earned ? "Completed and earned" : "Scheduled"}${today ? `, ${todayLabel(score)}` : ""}`}
                  />
                );
              })}
              <g data-testid="mountain-rhythm-day-labels" aria-hidden="true">
                {geometry.points.map((point, index) => {
                  const interval = geometry.points.length <= 10 ? 1 : geometry.points.length <= 20 ? 4 : 5;
                  const showLabel = index === 0 || index === geometry.points.length - 1 || (index + 1) % interval === 0;
                  return showLabel ? (
                    <text
                      key={`day-label-${point.date}`}
                      x={point.x}
                      y="266"
                      fill={point.date === score?.windowEnd ? "#F4D77A" : "#C9CDD3"}
                      fontSize="12"
                      textAnchor="middle"
                    >
                      {index + 1}
                    </text>
                  ) : null;
                })}
                <text x="16" y="24" fill="#DDE6DF" fontSize="10">100%</text>
                <text x="16" y="235" fill="#AAB5AE" fontSize="10">0%</text>
              </g>
              {currentPoint ? (
                <text
                  data-testid="mountain-rhythm-current-flag-label"
                  x={currentPoint.x}
                  y={Math.max(38, currentPoint.y - 11)}
                  textAnchor="middle"
                  fill="#F4D77A"
                  fontSize="11"
                  fontWeight="600"
                >
                  Today
                </text>
              ) : null}
            </svg>

          </div>
          {chartSeries.length ? (
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Chart series">
              {(chartSeries as RhythmChartSeries[]).map((series) => {
                const visible = visibleSeries[series.key] !== false;
                return (
                  <button
                    key={series.key}
                    type="button"
                    aria-pressed={visible}
                    aria-label={`${visible ? "Hide" : "Show"} ${series.label} line. ${series.description}`}
                    data-testid={`mountain-rhythm-series-toggle-${series.key}`}
                    onClick={() => setVisibleSeries((current) => ({ ...current, [series.key]: !visible }))}
                    className="discipleos-control--touch inline-flex min-h-9 items-center gap-2 border border-white/10 bg-white/[0.025] px-2.5 py-1 text-xs text-white/80 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4D77A]"
                  >
                    <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: series.color }} aria-hidden="true" />
                    {series.label}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div
            className="discipleos-safe-text mt-4 flex min-w-0 items-start gap-2 text-sm leading-5"
            data-testid="mountain-rhythm-milestone-line"
          >
            <span className="text-[#F4D77A]">Current: {currentLevel}</span>
            {!score.journeyComplete ? (
              <span className="text-[#E7C76A]">· Next: {nextLevel?.name || "Summit"}</span>
            ) : null}
          </div>
          <div className="mt-3 border-t border-white/10 pt-3">
            <details className="group">
              <summary data-testid="mountain-rhythm-help-toggle" className="discipleos-secondary-copy cursor-pointer text-[13px] font-medium leading-5 marker:text-[#F4C542] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4C542]">
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