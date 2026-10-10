import { ArrowRight, BookOpen, Mountain, Sparkles } from "lucide-react";
import { Link } from "wouter";

type ReadingPathChoicesProps = {
  onStartGuidedClimb: () => void;
  onStartFreeClimb: () => void;
  activeMountainRhythmLabel?: string | null;
  title?: string;
  previewOnly?: boolean;
  layout?: "default" | "onboarding";
};

const paths = [
  {
    key: "guided",
    title: "Guided Climb",
    subtitle: "Discover Scripture",
    description:
      "New to reading the Bible? Start with a guided 27-day journey that introduces Scripture one step at a time.",
    action: "Start Guided Climb",
    icon: BookOpen,
    testId: "reading-path-guided",
  },
  {
    key: "mountain",
    title: "Mountain Rhythm",
    subtitle: "Build a lasting reading habit",
    description:
      "Struggling to read consistently? Build a lasting habit with structured climbs, reminders, and progress tracking.",
    action: "Choose a climb",
    icon: Mountain,
    testId: "reading-path-mountain-rhythm",
  },
  {
    key: "free",
    title: "Free Climb",
    subtitle: "Build a plan your way",
    description:
      "Already reading regularly? Choose and combine Bible reading plans that fit your interests and schedule.",
    action: "Create a Free Climb",
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
  layout = "default",
}: ReadingPathChoicesProps) {
  const onboardingLayout = layout === "onboarding";
  const gridClass = onboardingLayout
    ? "grid-cols-1 grid-rows-[repeat(3,min-content)] content-between gap-y-0"
    : "grid-cols-1 gap-2 md:grid-cols-3 md:gap-3";
  return (
    <section
      data-testid="reading-path-choices"
      aria-label="Reading paths"
      className={`flex min-h-0 flex-1 flex-col ${
        onboardingLayout ? "space-y-1" : "space-y-2"
      }`}
    >
      <h2 className="text-lg font-bold leading-6 tracking-[-0.02em] text-white sm:text-3xl sm:leading-tight">
        {title}
      </h2>
      {onboardingLayout ? (
        <p className="discipleos-onboarding-intro text-sm leading-5 text-[#F1F5F9]">
          Wherever you are in your Scripture journey, there’s a path for you.
        </p>
      ) : null}
      {previewOnly ? (
        <p
          role="status"
          data-testid="first-launch-preview-notice"
          className="w-fit border border-[#D4A017]/25 bg-[#D4A017]/[0.04] px-2 py-0.5 text-xs leading-4 text-[#F1F5F9]"
        >
          Preview only · actions disabled · data unchanged
        </p>
      ) : null}
      {activeMountainRhythmLabel ? (
        <p
          data-testid="active-mountain-rhythm-note"
          className="border border-[#D4A017]/25 bg-[#D4A017]/[0.06] px-3 py-2 text-sm leading-5 text-[#E2E8F0] sm:px-4 sm:py-3 sm:leading-6"
        >
          Your {activeMountainRhythmLabel} in Mountain Rhythm is still in
          progress. These choices won’t change it.
        </p>
      ) : null}
      <div
        className={`grid min-h-0 flex-1 ${gridClass} ${
          onboardingLayout
            ? ""
            : "md:grid-rows-1 md:content-start"
        }`}
      >
        {paths.map((path) => {
          const Icon = path.icon;
          const cardClass =
            `discipleos-path-card group flex ${
              onboardingLayout
                ? "min-h-[clamp(7.25rem,calc((100dvh-27rem)/3),10rem)]"
                : "min-h-[clamp(5.5rem,calc((100dvh-27rem)/3),10rem)]"
            } w-full min-w-0 flex-col items-stretch justify-center border border-white/12 bg-white/[0.04] p-1 text-left transition hover:border-[#D4A017]/45 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4D77A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#090d12] ${
              onboardingLayout ? "md:min-h-[5.5rem] md:p-4" : "md:min-h-0 md:p-5"
            }`;
          const MobileContent = (
            <span
              className={`block min-w-0 ${
                onboardingLayout ? "md:flex md:items-center md:gap-5" : ""
              }`}
            >
              <span
                className={`flex items-center gap-3 ${
                  onboardingLayout ? "md:w-64 md:shrink-0" : ""
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#D4A017]/35 bg-[#D4A017]/10 text-[#F4D77A] md:h-10 md:w-10 md:rounded-xl">
                  <Icon className="h-4 w-4 md:h-5 md:w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    data-testid={`${path.testId}-title`}
                    className="block text-base font-semibold leading-5 text-white md:text-lg md:leading-6"
                  >
                    {path.title}
                  </span>
                  <span className="discipleos-path-subtitle mt-1 hidden text-sm font-medium leading-5 text-[#F4D77A] md:block">
                    {path.subtitle}
                  </span>
                </span>
                <ArrowRight
                  className={`h-5 w-5 shrink-0 text-[#F4D77A] transition-transform group-hover:translate-x-0.5 ${
                    onboardingLayout ? "" : "md:hidden"
                  }`}
                  aria-hidden="true"
                />
              </span>
              <span
                data-testid={`${path.testId}-description`}
                className={`mt-1 block text-sm leading-5 text-[#E2E8F0] ${
                  onboardingLayout
                    ? "md:mt-0 md:min-w-0 md:flex-1 md:leading-5"
                    : "md:mt-2 md:leading-6"
                }`}
              >
                {path.description}
              </span>
              <span
                className={
                  onboardingLayout
                    ? "hidden"
                    : "hidden text-sm font-semibold text-[#F4D77A] md:mt-5 md:inline-flex md:min-h-11 md:items-center md:justify-center md:gap-2 md:border md:border-[#D4A017]/40 md:bg-[#211A0D] md:px-3 md:transition md:group-hover:bg-[#33280E]"
                }
              >
                {path.key === "mountain" && activeMountainRhythmLabel
                  ? "Continue Mountain Rhythm"
                  : path.action}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </span>
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
