import { ArrowRight, BookOpen, Mountain, Sparkles } from "lucide-react";
import { Link } from "wouter";

type ReadingPathChoicesProps = {
  onStartGuidedClimb: () => void;
  onStartFreeClimb: () => void;
  activeMountainRhythmLabel?: string | null;
  title?: string;
  previewOnly?: boolean;
};

const paths = [
  {
    key: "guided",
    title: "Guided Climb",
    subtitle: "Discover Scripture",
    description: "A 27-day beginner plan with an easy start.",
    icon: BookOpen,
    testId: "reading-path-guided",
  },
  {
    key: "mountain",
    title: "Mountain Rhythm",
    subtitle: "Build a lasting reading habit",
    description: "Choose from the existing structured climbs.",
    icon: Mountain,
    testId: "reading-path-mountain-rhythm",
  },
  {
    key: "free",
    title: "Free Climb",
    subtitle: "Choose and layer your own reading plans",
    description: "Build one plan or combine several at your pace.",
    icon: Sparkles,
    testId: "reading-path-free-climb",
  },
] as const;

export default function ReadingPathChoices({
  onStartGuidedClimb,
  onStartFreeClimb,
  activeMountainRhythmLabel,
  title = "How would you like to start?",
  previewOnly = false,
}: ReadingPathChoicesProps) {
  return (
    <section
      data-testid="reading-path-choices"
      aria-label="Reading paths"
      className="space-y-3 sm:space-y-4"
    >
      <h2 className="text-2xl font-bold tracking-[-0.02em] text-white sm:text-3xl">
        {title}
      </h2>
      {previewOnly ? (
        <p
          role="status"
          data-testid="first-launch-preview-notice"
          className="border border-[#D4A017]/25 bg-[#D4A017]/[0.06] px-3 py-2 text-xs leading-5 text-white/75 sm:px-4 sm:py-3 sm:text-sm sm:leading-6"
        >
          Preview only. Path actions are disabled, and your saved data will not
          change.
        </p>
      ) : null}
      {activeMountainRhythmLabel ? (
        <p
          data-testid="active-mountain-rhythm-note"
          className="border border-[#D4A017]/25 bg-[#D4A017]/[0.06] px-3 py-2 text-xs leading-5 text-white/75 sm:px-4 sm:py-3 sm:text-sm sm:leading-6"
        >
          Your {activeMountainRhythmLabel} in Mountain Rhythm is still in
          progress. These choices won’t change it.
        </p>
      ) : null}
      <div className="grid gap-2 md:grid-cols-3 md:gap-3">
        {paths.map((path) => {
          const Icon = path.icon;
          const cardClass =
            "group flex min-h-[4.25rem] w-full min-w-0 items-center gap-3 border border-white/10 bg-white/[0.035] p-3 text-left transition hover:border-white/20 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4D77A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#090d12] md:min-h-0 md:flex-col md:items-start md:p-5";
          const Arrow = (
            <ArrowRight
              className="h-4 w-4 shrink-0 text-[#F4D77A] transition-transform group-hover:translate-x-0.5 md:hidden"
              aria-hidden="true"
            />
          );
          const MobileContent = (
            <>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#D4A017]/30 bg-[#D4A017]/10 text-[#F4D77A] md:h-10 md:w-10 md:rounded-xl">
                <Icon className="h-[18px] w-[18px] md:h-5 md:w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold leading-5 text-white md:mt-4 md:text-lg md:leading-6">
                  {path.title}
                </span>
                <span className="mt-0.5 block text-sm leading-5 text-[#F4D77A] md:mt-1 md:min-h-10 md:font-medium">
                  <span className="md:hidden">
                    {path.key === "guided"
                      ? "A 27-day starter plan"
                      : path.key === "mountain"
                        ? "Build a lasting habit"
                        : "Choose and combine plans"}
                  </span>
                  <span className="hidden md:inline">{path.subtitle}</span>
                </span>
                <span className="discipleos-secondary-copy mt-2 hidden flex-1 text-sm leading-6 md:block">
                  {path.description}
                </span>
                <span className="discipleos-action mt-5 hidden min-h-11 items-center justify-center gap-2 border border-[#D4A017]/40 bg-[#211A0D] px-3 text-sm font-semibold text-[#F4D77A] transition group-hover:bg-[#33280E] md:inline-flex">
                  {path.key === "guided"
                    ? "Start Guided Climb"
                    : path.key === "mountain"
                      ? activeMountainRhythmLabel
                        ? "Continue Mountain Rhythm"
                        : "Choose a climb"
                      : "Create a Free Climb"}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </span>
              {Arrow}
            </>
          );
          return (
            <article
              key={path.key}
              data-testid={path.testId}
              className="min-w-0"
            >
              {path.key === "mountain" ? (
                <Link
                  href="/mountain-rhythm"
                  data-testid="reading-path-mountain-rhythm-action"
                  aria-disabled={previewOnly}
                  tabIndex={previewOnly ? -1 : undefined}
                  onClick={(event) => {
                    if (previewOnly) event.preventDefault();
                  }}
                  className={`${cardClass} ${previewOnly ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  {MobileContent}
                </Link>
              ) : (
                <button
                  type="button"
                  data-testid={`${path.testId}-action`}
                  disabled={previewOnly}
                  onClick={
                    path.key === "guided"
                      ? onStartGuidedClimb
                      : onStartFreeClimb
                  }
                  className={`${cardClass} ${previewOnly ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  {MobileContent}
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
