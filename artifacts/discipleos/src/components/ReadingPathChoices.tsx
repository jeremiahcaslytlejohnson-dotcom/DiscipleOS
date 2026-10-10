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
    description: "A 27-day guided introduction that gradually layers Genesis, Matthew, Psalms, and Proverbs.",
    mobileDescription: "New readers: 27-day intro to Genesis, Matthew, Psalms & Proverbs.",
    action: "Start Guided Climb",
    icon: BookOpen,
    testId: "reading-path-guided",
  },
  {
    key: "mountain",
    title: "Mountain Rhythm",
    subtitle: "Build a lasting reading habit",
    description: "Establish consistency with structured climbs, reminders, and progress you can track.",
    mobileDescription: "For consistency: structured climbs, reminders & progress tracking.",
    action: "Choose a climb",
    icon: Mountain,
    testId: "reading-path-mountain-rhythm",
  },
  {
    key: "free",
    title: "Free Climb",
    subtitle: "Build a plan your way",
    description: "Choose, combine, and manage reading plans at your own pace.",
    mobileDescription: "For confident readers: choose, combine & manage reading plans.",
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
    ? "grid-cols-1 grid-rows-[repeat(3,min-content)] content-evenly gap-y-0"
    : "grid-cols-1 gap-2 md:grid-cols-3 md:gap-3";
  return (
    <section
      data-testid="reading-path-choices"
      aria-label="Reading paths"
      className="flex min-h-0 flex-1 flex-col space-y-2"
    >
      <h2 className="text-lg font-bold leading-6 tracking-[-0.02em] text-white sm:text-3xl sm:leading-tight">
        {title}
      </h2>
      {previewOnly ? (
        <p
          role="status"
          data-testid="first-launch-preview-notice"
          className="w-fit border border-[#D4A017]/20 bg-[#D4A017]/[0.04] px-2 py-1 text-[10px] leading-3 text-white/70"
        >
          Preview only · actions disabled · data unchanged
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
            `discipleos-path-card group flex min-h-[clamp(5.5rem,calc((100dvh-27rem)/3),10rem)] w-full min-w-0 flex-col items-stretch justify-center border border-white/12 bg-white/[0.04] p-2 text-left transition hover:border-[#D4A017]/45 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4D77A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#090d12] ${
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
                  <span className="block text-sm font-semibold leading-5 text-white md:text-lg md:leading-6">
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
                className={`mt-1.5 block text-[13px] leading-[18px] text-[#E2E8F0] sm:text-sm sm:leading-5 ${
                  onboardingLayout
                    ? "md:mt-0 md:min-w-0 md:flex-1 md:leading-5"
                    : "md:mt-2 md:leading-6"
                }`}
              >
                <span className="md:hidden">
                  {path.mobileDescription}
                </span>
                <span className="hidden md:inline">{path.description}</span>
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
