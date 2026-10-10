import {
  GUIDED_CLIMB_SET_ONE,
  estimateGuidedClimbDraftDayMinutes,
  formatGuidedClimbDay,
  getGuidedClimbDayChapterCount,
} from "../lib/guided-climb";
import EstimatedReadingTime from "./EstimatedReadingTime";

type GuidedClimbPreviewProps = {
  open: boolean;
  onClose: () => void;
  onStart: () => void;
};

export default function GuidedClimbPreview({
  open,
  onClose,
  onStart,
}: GuidedClimbPreviewProps) {
  if (!open) return null;

  return (
    <div
      className="discipleos-guided-climb-preview-layer fixed inset-0 z-[80] flex items-end justify-center bg-black/80 p-2 sm:items-center sm:p-5"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="guided-climb-preview-title"
        data-testid="guided-climb-preview"
        className="discipleos-functional-surface flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden shadow-2xl"
      >
        <header className="shrink-0 border-b border-white/10 p-4 sm:p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#F4D77A]">
            Optional · Guided Climb Set 1 · 27 days
          </div>
          <h2
            id="guided-climb-preview-title"
            className="mt-2 text-2xl font-bold text-white sm:text-3xl"
          >
            {GUIDED_CLIMB_SET_ONE.name}
          </h2>
          <p className="discipleos-secondary-copy mt-2 max-w-xl text-sm leading-6">
            A complete beginner plan through Genesis 1–50 and Matthew 1–28,
            with the listed Psalms and Proverbs. It ends after Day 27; no future
            set is required.
          </p>
          <p className="mt-2 text-xs leading-5 text-white/55">
            Days marked “Heavier” have the highest chapter load in this
            schedule. Chapter references are shown below exactly as assigned.
          </p>
        </header>

        <ol
          data-testid="guided-climb-preview-days"
          className="min-h-0 flex-1 divide-y divide-white/[0.07] overflow-y-auto px-4 sm:px-6"
        >
          {GUIDED_CLIMB_SET_ONE.days.map((day) => {
            const chapterCount = getGuidedClimbDayChapterCount(day);
            const estimatedMinutes = estimateGuidedClimbDraftDayMinutes(day);
            const heavier = chapterCount >= 4;

            return (
              <li
                key={day.day}
                data-testid={`guided-climb-preview-day-${day.day}`}
                className="flex min-w-0 items-start justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#F4D77A]">
                    Day {day.day}
                  </div>
                  <div className="discipleos-safe-text mt-0.5 text-sm leading-5 text-white">
                    {formatGuidedClimbDay(day)}
                  </div>
                </div>
                <span className="mt-0.5 flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={`rounded-full border px-2 py-1 text-[10px] font-medium ${
                      heavier
                        ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
                        : "border-white/10 bg-white/[0.03] text-white/55"
                    }`}
                  >
                    {heavier ? "Heavier · " : ""}
                    {chapterCount} {chapterCount === 1 ? "chapter" : "chapters"}
                  </span>
                  <EstimatedReadingTime
                    minutes={estimatedMinutes}
                    testId={`guided-climb-estimated-reading-time-day-${day.day}`}
                    className="text-[10px]"
                  />
                </span>
              </li>
            );
          })}
        </ol>

        <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-white/10 p-4 sm:flex-row sm:justify-end sm:p-5">
          <button
            type="button"
            onClick={onClose}
            className="discipleos-action min-h-11 border border-white/15 px-4 text-white/75 hover:bg-white/10 hover:text-white"
          >
            Not now
          </button>
          <button
            type="button"
            data-testid="guided-climb-start"
            onClick={onStart}
            className="discipleos-action min-h-11 bg-[#C8921D] px-5 font-semibold text-black hover:bg-[#D4A017]"
          >
            Start Discover Scripture
          </button>
        </footer>
      </section>
    </div>
  );
}
