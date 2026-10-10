type GuidedClimbPreviewProps = {
  open: boolean;
  existingPlan?: boolean;
  readingTime: string;
  reminderEnabled: boolean;
  onReadingTimeChange: (time: string) => void;
  onReminderChange: (enabled: boolean) => void;
  onClose: () => void;
  onStart: () => void;
};

const BOOKS = [
  ["Genesis", "Beginnings: creation, the first families, and the patriarchs."],
  ["Matthew", "Jesus’ life, teachings, death, and resurrection."],
  ["Psalms", "Poems and prayers for worship, grief, gratitude, and trust."],
  ["Proverbs", "Practical wisdom for everyday choices and relationships."],
];

export default function GuidedClimbPreview({
  open,
  existingPlan = false,
  readingTime,
  reminderEnabled,
  onReadingTimeChange,
  onReminderChange,
  onClose,
  onStart,
}: GuidedClimbPreviewProps) {
  if (!open) return null;

  return (
    <section
      data-testid="guided-climb-preview"
      aria-labelledby="guided-climb-preview-title"
      className="discipleos-guided-climb-intro w-full space-y-5 py-3 sm:space-y-6 sm:py-5"
    >
      <header className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#F4D77A]">
          Guided Climb · 27 days
        </div>
        <h2 id="guided-climb-preview-title" className="text-2xl font-bold text-white sm:text-3xl">
          Discover Scripture
        </h2>
        <p className="discipleos-secondary-copy max-w-3xl text-sm leading-6 sm:text-base">
          Start gently, then add a little more reading as you go. By Day 27,
          you’ll finish Genesis and Matthew, with selected Psalms and Proverbs
          along the way.
        </p>
      </header>

      <div className="space-y-5">
        <section aria-labelledby="guided-climb-books-heading">
          <h3 id="guided-climb-books-heading" className="text-base font-semibold text-white">
            Meet the books
          </h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {BOOKS.map(([book, context]) => (
              <li key={book} className="border border-white/10 bg-white/[0.035] p-3">
                <div className="text-sm font-semibold text-[#F4D77A]">{book}</div>
                <p className="mt-1 text-sm leading-5 text-white/75">{context}</p>
              </li>
            ))}
          </ul>
        </section>

        <p className="border-l-2 border-[#D4A017]/60 pl-3 text-sm leading-5 text-white/75">
          Open a physical Bible or your preferred Bible app for each passage.
          DiscipleOS organizes and tracks your reading; it doesn’t include the
          full Bible text.
        </p>

        {existingPlan ? (
          <p className="border border-emerald-300/20 bg-emerald-300/[0.04] p-3 text-sm leading-5 text-emerald-100/80">
            Your journey and progress are saved. Your daily reading time is {readingTime}.
          </p>
        ) : (
          <section className="border border-white/10 bg-white/[0.035] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-white">When would you like to read?</h3>
                <p className="mt-1 text-xs leading-5 text-white/60">
                  Choose a time for this plan, or skip it for now.
                </p>
              </div>
              <label className="flex shrink-0 items-center gap-2 text-sm text-white">
                <span className="sr-only">Daily reading time</span>
                <input
                  data-testid="guided-climb-reading-time"
                  type="time"
                  value={readingTime}
                  onChange={(event) => onReadingTimeChange(event.target.value)}
                  className="min-h-11 border border-white/15 bg-[#10171A] px-3 text-white"
                />
              </label>
            </div>
            <label className="mt-4 flex items-start gap-3 text-sm leading-5 text-white/80">
              <input
                data-testid="guided-climb-reminder-toggle"
                type="checkbox"
                checked={reminderEnabled}
                onChange={(event) => onReminderChange(event.target.checked)}
                className="mt-1 h-4 w-4 accent-[#D4A017]"
              />
              <span>
                Set a daily reminder at this time
                <span className="mt-1 block text-xs leading-5 text-white/55">
                  Push reminders require you to be signed in, grant notification
                  permission, and enable this device. You can still start without them.
                </span>
              </span>
            </label>
          </section>
        )}

        <footer className="flex flex-col-reverse gap-2 border-t border-white/10 pt-4 sm:flex-row sm:justify-end">
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
            {existingPlan ? "Return to Today’s Walk" : "Start Reading"}
          </button>
        </footer>
      </div>
    </section>
  );
}
