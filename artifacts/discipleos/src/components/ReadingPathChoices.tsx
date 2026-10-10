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
      className="space-y-4"
    >
      <h2 className="text-2xl font-bold tracking-[-0.02em] text-white sm:text-3xl">
        {title}
      </h2>
      {previewOnly ? (
        <p
          role="status"
          data-testid="first-launch-preview-notice"
          className="border border-[#D4A017]/25 bg-[#D4A017]/[0.06] px-4 py-3 text-sm leading-6 text-white/75"
        >
          Preview only. Path actions are disabled, and your saved data will not
          change.
        </p>
      ) : null}
      {activeMountainRhythmLabel ? (
        <p
          data-testid="active-mountain-rhythm-note"
          className="border border-[#D4A017]/25 bg-[#D4A017]/[0.06] px-4 py-3 text-sm leading-6 text-white/75"
        >
          Your {activeMountainRhythmLabel} in Mountain Rhythm is still in
          progress. These choices won’t change it.
        </p>
      ) : null}
      <div className="grid gap-3 md:grid-cols-3">
        {paths.map((path) => {
          const Icon = path.icon;
          const cardClass =
            "flex min-w-0 flex-col border border-white/10 bg-white/[0.035] p-4 sm:p-5";
          return (
            <article
              key={path.key}
              data-testid={path.testId}
              className={cardClass}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4A017]/30 bg-[#D4A017]/10 text-[#F4D77A]">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-lg font-semibold leading-6 text-white">
                {path.title}
              </h3>
              <p className="mt-1 min-h-10 text-sm font-medium leading-5 text-[#F4D77A]">
                {path.subtitle}
              </p>
              <p className="discipleos-secondary-copy mt-2 flex-1 text-sm leading-6">
                {path.description}
              </p>
              {path.key === "mountain" ? (
                <Link
                  href="/mountain-rhythm"
                  data-testid="reading-path-mountain-rhythm-action"
                  aria-disabled={previewOnly}
                  tabIndex={previewOnly ? -1 : undefined}
                  onClick={(event) => {
                    if (previewOnly) event.preventDefault();
                  }}
                  className={`discipleos-action mt-5 inline-flex min-h-11 items-center justify-center gap-2 border border-[#D4A017]/40 bg-[#211A0D] px-3 text-sm font-semibold text-[#F4D77A] transition hover:bg-[#33280E] ${previewOnly ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  {activeMountainRhythmLabel
                    ? "Continue Mountain Rhythm"
                    : "Choose a climb"}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
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
                  className="discipleos-action mt-5 inline-flex min-h-11 items-center justify-center gap-2 border border-[#D4A017]/40 bg-[#211A0D] px-3 text-sm font-semibold text-[#F4D77A] transition hover:bg-[#33280E]"
                >
                  {path.key === "guided"
                    ? "Start Guided Climb"
                    : "Create a Free Climb"}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
