import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  Clock3,
  Sparkles,
  X,
} from "lucide-react";
import { Link } from "wouter";

type PlanForm = {
  selectedBooks: string[];
  dailyMinutes: number;
  startDate: string;
  endDate: string;
};

type PlanPreview = {
  totalChapters: number;
  totalDays: number;
  totalMinutes: number;
  actualEndDate: string;
};

type FirstPlanOnboardingProps = {
  form: PlanForm;
  step: number;
  planPreview: PlanPreview;
  formatDate: (value: string) => string;
  presetBooks: {
    newTestament: string[];
    gospels: string[];
  };
  books: Array<{ name: string; testament: "OT" | "NT"; chapters: number }>;
  isBookPickerOpen: boolean;
  onStepChange: (step: number) => void;
  onSelectPreset: (preset: "newTestament" | "gospels") => void;
  onChooseBooks: () => void;
  onToggleBook: (bookName: string) => void;
  onCloseBookPicker: () => void;
  onMinutesChange: (minutes: number) => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onUseSuggestedEndDate: () => void;
  onCreatePlan: () => void;
  isSignedIn: boolean;
};

const DAILY_MINUTES = [5, 10, 15, 20, 30];

function selectionIncludes(
  selectedBooks: string[],
  presetBooks: string[],
) {
  return (
    presetBooks.length > 0 &&
    presetBooks.length === selectedBooks.length &&
    presetBooks.every((book) => selectedBooks.includes(book))
  );
}

export default function FirstPlanOnboarding({
  form,
  step,
  planPreview,
  formatDate,
  presetBooks,
  books,
  isBookPickerOpen,
  onStepChange,
  onSelectPreset,
  onChooseBooks,
  onToggleBook,
  onCloseBookPicker,
  onMinutesChange,
  onStartDateChange,
  onEndDateChange,
  onUseSuggestedEndDate,
  onCreatePlan,
  isSignedIn,
}: FirstPlanOnboardingProps) {
  const hasBooks = form.selectedBooks.length > 0;
  const canContinue =
    step === 0 ||
    (step === 1 && hasBooks) ||
    step === 2 ||
    Boolean(form.startDate) ||
    step === 5;
  const readingLabel = selectionIncludes(form.selectedBooks, presetBooks.gospels)
    ? "Gospels"
    : selectionIncludes(form.selectedBooks, presetBooks.newTestament)
      ? "New Testament"
      : "Selected books";

  const nextStep = () => {
    if (step === 1 && !hasBooks) return;
    onStepChange(Math.min(5, step + 1));
  };

  return (
    <>
      <main
        data-testid="first-plan-onboarding"
        className="mx-auto w-full max-w-2xl pb-24 pt-4 sm:pb-10 sm:pt-8"
      >
      <div className="mb-6 flex items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#F4D77A]">
          <Sparkles className="h-4 w-4" />
          {step === 0 ? "A simple place to begin" : `Step ${step} of 5`}
        </div>
        {step > 0 ? (
          <div className="text-xs text-white/45">
            {step === 5 ? "Ready to begin" : "Build your plan"}
          </div>
        ) : null}
      </div>

      <section className="discipleos-functional-surface overflow-hidden p-5 shadow-[0_18px_60px_rgba(0,0,0,0.3)] sm:p-8">
        {step === 0 ? (
          <div className="space-y-7">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#D4A017]/35 bg-[#D4A017]/12 text-[#F4D77A]">
              <BookOpen className="h-7 w-7" />
            </div>
            <div>
              <h2 className="max-w-xl text-3xl font-bold leading-tight tracking-[-0.03em] text-white sm:text-5xl">
                Let’s build a Bible reading plan that fits your life.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-white/70 sm:text-lg">
                We’ll help you choose what to read, find a daily pace you can
                keep, and set a clear finish line.
              </p>
            </div>
            <button
              type="button"
              data-testid="first-plan-create-action"
              onClick={() => onStepChange(1)}
              className="discipleos-action inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[#C8921D] px-5 text-base font-semibold text-black transition hover:bg-[#D4A017] active:translate-y-px sm:w-auto sm:min-w-64"
            >
              Create My Reading Plan
              <ArrowRight className="h-5 w-5" />
            </button>
            {!isSignedIn ? (
              <div className="max-w-xl text-sm leading-6 text-white/55">
                Want to keep your plan synced across devices?{" "}
                <Link
                  href="/sign-up"
                  data-testid="first-plan-sign-up-link"
                  className="font-semibold text-[#F4D77A] underline decoration-[#D4A017]/45 underline-offset-4 hover:text-white"
                >
                  Create a free account first
                </Link>
                {" "}or{" "}
                <Link
                  href="/sign-in"
                  data-testid="first-plan-sign-in-link"
                  className="font-semibold text-white/75 underline decoration-white/25 underline-offset-4 hover:text-white"
                >
                  sign in
                </Link>
                .
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                What would you like to read?
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/65">
                Start with a familiar path, or choose the books that speak to
                you right now.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  key: "newTestament" as const,
                  label: "New Testament",
                  detail: "Matthew through Revelation",
                  books: presetBooks.newTestament,
                },
                {
                  key: "gospels" as const,
                  label: "Gospels",
                  detail: "Matthew, Mark, Luke, and John",
                  books: presetBooks.gospels,
                },
              ].map((preset) => {
                const selected = selectionIncludes(form.selectedBooks, preset.books);
                return (
                  <button
                    key={preset.key}
                    type="button"
                    aria-pressed={selected}
                    data-testid={`first-plan-preset-${preset.key}`}
                    onClick={() => onSelectPreset(preset.key)}
                    className={`flex min-h-24 items-start justify-between gap-4 border p-4 text-left transition ${
                      selected
                        ? "border-[#D4A017]/55 bg-[#D4A017]/15 text-white"
                        : "border-white/12 bg-white/[0.03] text-white/80 hover:border-white/25 hover:bg-white/[0.07]"
                    }`}
                  >
                    <span>
                      <span className="block font-semibold">{preset.label}</span>
                      <span className="mt-1 block text-sm text-white/55">
                        {preset.detail}
                      </span>
                    </span>
                    {selected ? (
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#F4D77A]" />
                    ) : null}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              data-testid="first-plan-choose-books"
              onClick={onChooseBooks}
              className={`flex min-h-14 w-full items-center justify-between gap-4 border px-4 py-3 text-left transition ${
                !selectionIncludes(form.selectedBooks, presetBooks.newTestament) &&
                !selectionIncludes(form.selectedBooks, presetBooks.gospels) &&
                hasBooks
                  ? "border-[#D4A017]/55 bg-[#D4A017]/12"
                  : "border-white/12 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.07]"
              }`}
            >
              <span>
                <span className="block font-semibold text-white">
                  Choose Books
                </span>
                <span className="mt-1 block text-sm text-white/55">
                  Build a plan from the books you want to read.
                </span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 text-[#F4D77A]" />
            </button>

            {hasBooks ? (
              <div className="border-l-2 border-[#D4A017]/45 pl-3 text-sm text-white/70">
                <span className="font-medium text-white">
                  {form.selectedBooks.length}{" "}
                  {form.selectedBooks.length === 1 ? "book" : "books"} selected
                </span>
                <span className="mt-1 block leading-6">
                  {form.selectedBooks.join(", ")}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                How much time can you set aside?
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/65">
                Choose a daily commitment that feels realistic. We’ll fit the
                reading to your time.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {DAILY_MINUTES.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  aria-pressed={form.dailyMinutes === minutes}
                  data-testid={`first-plan-minutes-${minutes}`}
                  onClick={() => onMinutesChange(minutes)}
                  className={`min-h-16 border px-3 py-3 text-center transition ${
                    form.dailyMinutes === minutes
                      ? "border-[#D4A017]/55 bg-[#D4A017]/15 text-[#F4D77A]"
                      : "border-white/12 bg-white/[0.03] text-white/75 hover:border-white/25 hover:bg-white/[0.07]"
                  }`}
                >
                  <Clock3 className="mx-auto mb-1 h-4 w-4" />
                  <span className="font-semibold">{minutes} min</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                When would you like to begin?
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/65">
                Today is ready by default, but you can choose another day.
              </p>
            </div>
            <label className="block max-w-sm text-sm font-medium text-white">
              Start date
              <span className="relative mt-2 block">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#D4A017]" />
                <input
                  type="date"
                  aria-label="Start date"
                  value={form.startDate}
                  onChange={(event) => onStartDateChange(event.target.value)}
                  className="discipleos-form-control w-full border border-white/12 bg-black/30 pl-11 pr-3 outline-none"
                />
              </span>
            </label>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                When would you like to finish?
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/65">
                We suggested a finish date using your books, start date, and
                daily time. Change it if you prefer.
              </p>
            </div>
            <label className="block max-w-sm text-sm font-medium text-white">
              Finish date
              <span className="relative mt-2 block">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#D4A017]" />
                <input
                  type="date"
                  aria-label="Finish date"
                  min={form.startDate}
                  value={form.endDate}
                  onChange={(event) => onEndDateChange(event.target.value)}
                  className="discipleos-form-control w-full border border-white/12 bg-black/30 pl-11 pr-3 outline-none"
                />
              </span>
            </label>
            <button
              type="button"
              onClick={onUseSuggestedEndDate}
              className="text-left text-sm text-[#F4D77A] underline decoration-[#D4A017]/45 underline-offset-4 hover:text-white"
            >
              Use the suggested finish date: {formatDate(planPreview.actualEndDate)}
            </button>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                Your plan is ready.
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/65">
                Here’s what your first step with Scripture will look like.
              </p>
            </div>
            <div className="divide-y divide-white/10 border-y border-white/10">
              <div className="flex items-start justify-between gap-4 py-4">
                <span className="text-sm text-white/55">Reading</span>
                <span className="max-w-[70%] text-right text-sm font-medium text-white">
                  <span className="block">{readingLabel}</span>
                  <span className="mt-1 block text-xs font-normal text-white/55">
                    {form.selectedBooks.join(", ")}
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 py-4">
                <span className="text-sm text-white/55">Daily time</span>
                <span className="text-sm font-medium text-white">
                  {form.dailyMinutes} minutes
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 py-4">
                <span className="text-sm text-white/55">Dates</span>
                <span className="text-right text-sm font-medium text-white">
                  {formatDate(form.startDate)} – {formatDate(planPreview.actualEndDate)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 py-4">
                <span className="text-sm text-white/55">Plan size</span>
                <span className="text-sm font-medium text-white">
                  {planPreview.totalChapters} chapters · {planPreview.totalDays} days
                </span>
              </div>
            </div>
            <p className="text-sm leading-6 text-white/60">
              You can adjust the plan later. For now, we’ll take you straight
              to Today’s Walk.
            </p>
          </div>
        ) : null}

        {step > 0 ? (
          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => onStepChange(Math.max(1, step - 1))}
              className="inline-flex min-h-11 items-center justify-center gap-2 px-3 text-sm text-white/60 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            {step < 5 ? (
              <button
                type="button"
                disabled={!canContinue}
                onClick={nextStep}
                className="discipleos-action inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[#C8921D] px-5 text-base font-semibold text-black transition hover:bg-[#D4A017] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:min-w-48"
              >
                Continue
                <ArrowRight className="h-5 w-5" />
              </button>
            ) : (
              <button
                type="button"
                data-testid="first-plan-save-action"
                onClick={onCreatePlan}
                disabled={!hasBooks}
                className="discipleos-action inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[#C8921D] px-5 text-base font-semibold text-black transition hover:bg-[#D4A017] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:min-w-56"
              >
                Start My Plan
                <ArrowRight className="h-5 w-5" />
              </button>
            )}
          </div>
        ) : null}
      </section>
      </main>
      {isBookPickerOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 p-3 sm:items-center"
          onClick={onCloseBookPicker}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="first-plan-book-picker-title"
            className="relative flex max-h-[90dvh] w-full max-w-2xl flex-col border border-white/15 bg-[#0B1115] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 p-4 sm:p-5">
              <div>
                <h2 id="first-plan-book-picker-title" className="text-lg font-semibold text-white">
                  Choose individual books
                </h2>
                <p className="discipleos-secondary-copy mt-1 text-sm leading-5">
                  Select the books you want in your first plan.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close book picker"
                onClick={onCloseBookPicker}
                className="discipleos-control--icon border border-white/10 p-2 text-white/60 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
              {(["OT", "NT"] as const).map((testament) => (
                <section key={testament} className={testament === "NT" ? "mt-5" : undefined}>
                  <div className="discipleos-field-label mb-2 text-xs">
                    {testament === "OT" ? "Old Testament" : "New Testament"}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {books
                      .filter((book) => book.testament === testament)
                      .map((book) => {
                        const selected = form.selectedBooks.includes(book.name);
                        return (
                          <button
                            key={book.name}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => onToggleBook(book.name)}
                            className={`flex items-center justify-between border px-3 py-2.5 text-left text-sm transition ${
                              selected
                                ? "border-[#D4A017]/45 bg-[#D4A017]/12 text-[#F4D77A]"
                                : "border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.08]"
                            }`}
                          >
                            <span>{book.name}</span>
                            <span className="text-xs opacity-60">{book.chapters} ch</span>
                          </button>
                        );
                      })}
                  </div>
                </section>
              ))}
            </div>
            <div className="flex flex-col gap-3 border-t border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="discipleos-secondary-copy text-sm">
                {form.selectedBooks.length}{" "}
                {form.selectedBooks.length === 1 ? "book" : "books"} selected
              </div>
              <button
                type="button"
                onClick={onCloseBookPicker}
                className="discipleos-action bg-[#C8921D] px-5 font-medium text-black hover:bg-[#D4A017]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}