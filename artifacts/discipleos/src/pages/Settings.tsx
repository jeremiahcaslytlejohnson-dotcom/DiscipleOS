import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, BookOpen, Clock3, Cloud, Inbox, LoaderCircle, LogOut, Save, Shuffle, UserRound } from "lucide-react";
import { Link } from "wouter";
import FeedbackInbox from "@/components/FeedbackInbox";
import {
  type ReadingDefaults,
  type ReadingOrder,
  type ReadingPaceMode,
} from "../lib/reading-settings";

export type SettingsPaceMode = ReadingPaceMode;
export type SettingsReadingOrder = ReadingOrder;
export type { ReadingDefaults };

export interface SettingsIdentity {
  name?: string | null;
  email?: string | null;
  imageUrl?: string | null;
  initials?: string | null;
}

export interface SettingsProps extends ReadingDefaults {
  identity: SettingsIdentity | null;
  isFeedbackOwner?: boolean;
  syncStatus: string;
  isLoading?: boolean;
  isSaving?: boolean;
  onSave: (defaults: ReadingDefaults) => void | Promise<void>;
  onSignOut: () => void | Promise<void>;
}

const paceOptions: Array<{ value: SettingsPaceMode; label: string; speedLabel: string; detail: string }> = [
  {
    value: "relaxed",
    label: "Relaxed",
    speedLabel: "120–160 wpm",
    detail: "About 120–160 words/min; fewer chapters fit in the same daily budget",
  },
  {
    value: "standard",
    label: "Standard",
    speedLabel: "180–220 wpm",
    detail: "About 180–220 words/min; an average reading estimate",
  },
  {
    value: "fast",
    label: "Fast",
    speedLabel: "250–300 wpm",
    detail: "About 250–300 words/min; more chapters fit in the same daily budget",
  },
  {
    value: "custom",
    label: "Custom",
    speedLabel: "per chapter",
    detail: "Set minutes per average chapter; daily minutes stay separate",
  },
];

const orderOptions: Array<{ value: SettingsReadingOrder; label: string; detail: string }> = [
  { value: "consecutive", label: "Consecutive", detail: "Move through each book in order" },
  { value: "randomized", label: "Randomized", detail: "Receive a varied selection each day" },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getInitials(identity: SettingsIdentity | null) {
  if (identity?.initials) return identity.initials.slice(0, 2).toUpperCase();
  const name = identity?.name?.trim();
  if (name) {
    return name
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return identity?.email?.[0]?.toUpperCase() || "D";
}

function formatSyncStatus(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "synced" || normalized === "online") return "Synced";
  if (normalized === "syncing") return "Syncing";
  if (normalized === "offline") return "Offline";
  if (normalized === "error" || normalized === "failed") return "Needs attention";
  return status || "Not connected";
}

function SettingsSkeleton() {
  return (
    <main className="discipleos-content discipleos-page-main" aria-busy="true" aria-label="Loading settings">
      <div className="discipleos-functional-surface mx-auto max-w-4xl animate-pulse p-5 sm:p-8">
        <div className="h-3 w-20 rounded bg-white/10" />
        <div className="mt-4 h-10 max-w-sm rounded bg-white/10" />
        <div className="mt-3 h-4 max-w-lg rounded bg-white/10" />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="h-52 rounded bg-white/[0.06]" />
          <div className="h-52 rounded bg-white/[0.06]" />
        </div>
      </div>
    </main>
  );
}

function SectionHeading({
  icon: Icon,
  eyebrow,
  title,
  description,
}: {
  icon: typeof BookOpen;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#D4A017]">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span>{eyebrow}</span>
      </div>
      <h2 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-white">{title}</h2>
      <p className="discipleos-section-description max-w-2xl">{description}</p>
    </div>
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="discipleos-field-label mb-2 block text-xs font-semibold uppercase tracking-[0.1em]">
      {children}
    </label>
  );
}

export default function Settings({
  identity,
  isFeedbackOwner = false,
  syncStatus,
  paceMode,
  customMinutesPerChapter,
  dailyReadingBudget,
  preferredReadingTime,
  readingOrder,
  isLoading = false,
  isSaving = false,
  onSave,
  onSignOut,
}: SettingsProps) {
  const [draft, setDraft] = useState<ReadingDefaults>({
    paceMode,
    customMinutesPerChapter,
    dailyReadingBudget,
    preferredReadingTime,
    readingOrder,
  });
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    setDraft({
      paceMode,
      customMinutesPerChapter,
      dailyReadingBudget,
      preferredReadingTime,
      readingOrder,
    });
  }, [paceMode, customMinutesPerChapter, dailyReadingBudget, preferredReadingTime, readingOrder]);

  const displayName = identity?.name || identity?.email || "Your account";
  const initials = useMemo(() => getInitials(identity), [identity]);
  const syncLabel = formatSyncStatus(syncStatus);
  const syncTone = syncLabel === "Synced" ? "text-emerald-300" : syncLabel === "Offline" ? "text-[#F4D77A]" : "text-slate-200";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveMessage("");
    try {
      await onSave(draft);
      setSaveMessage("Reading defaults saved.");
    } catch {
      setSaveMessage("Could not save your reading defaults. Try again.");
    }
  }

  if (isLoading) return <SettingsSkeleton />;

  return (
    <div className="discipleos-shell min-h-[100dvh]">
      <header className="discipleos-content flex items-center justify-between gap-4 pb-2 pt-5 sm:pt-7">
        <Link
          href="/"
          className="discipleos-action inline-flex items-center gap-2 border border-white/10 bg-[#111820]/80 px-3 text-sm font-medium text-white/75 transition hover:border-[#D4A017]/40 hover:bg-[#211A0D] hover:text-[#F4D77A]"
          aria-label="Back to dashboard"
          data-testid="settings-back"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Dashboard</span>
        </Link>
        <div className="flex items-center gap-2 text-right">
          <div className="hidden text-xs text-white/45 sm:block">DiscipleOS</div>
          <div className="h-1 w-1 rounded-full bg-[#D4A017]" aria-hidden="true" />
          <div className="text-xs uppercase tracking-[0.14em] text-white/55">Settings</div>
        </div>
      </header>

      <main className="discipleos-content discipleos-page-main pb-[calc(4rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 max-w-2xl sm:mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D4A017]">Your rhythm</p>
            <h1 className="discipleos-page-title">A quieter way to set the pace.</h1>
            <p className="discipleos-section-description mt-4 max-w-xl text-[0.95rem] leading-7">
              Keep the defaults that shape your daily reading close at hand. These settings guide new plans without changing the work already underway.
            </p>
            {isFeedbackOwner ? (
              <a
                href="#feedback-inbox"
                data-testid="settings-feedback-inbox-link"
                className="discipleos-control--compact mt-4 inline-flex items-center gap-2 border border-[#D4A017]/35 bg-[#211A0D]/70 px-3 py-2 text-sm font-semibold text-[#F4D77A] transition hover:border-[#D4A017]/60 hover:bg-[#33280E]"
              >
                <Inbox className="h-4 w-4" aria-hidden="true" />
                Feedback Inbox
              </a>
            ) : null}
          </div>

          <section className="discipleos-functional-surface mb-5 overflow-hidden" aria-labelledby="account-heading">
            <div className="flex flex-col gap-5 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#D4A017]/40 bg-[#D4A017]/15 text-sm font-semibold text-[#F4D77A]"
                  aria-hidden="true"
                >
                  {identity?.imageUrl ? (
                    <img src={identity.imageUrl} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <div className="min-w-0">
                  <h2 id="account-heading" className="truncate text-sm font-semibold text-white" data-testid="settings-identity">
                    {displayName}
                  </h2>
                  <p className="discipleos-meta-copy mt-1 truncate text-sm">{identity?.email || "Personal discipleship companion"}</p>
                </div>
              </div>
              <div
                className="flex items-center gap-2 border-t border-white/10 pt-4 text-sm sm:border-t-0 sm:border-l sm:pl-5 sm:pt-0"
                data-testid="settings-sync-status"
                aria-label={`Sync status: ${syncLabel}`}
              >
                <Cloud className={cn("h-4 w-4", syncTone)} aria-hidden="true" />
                <span className="text-white/55">Sync</span>
                <span className={cn("font-medium", syncTone)}>{syncLabel}</span>
              </div>
            </div>
          </section>

          <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="discipleos-functional-surface p-4 sm:p-6" aria-labelledby="reading-heading">
              <SectionHeading
                icon={BookOpen}
                eyebrow="Reading defaults"
                title="Choose a sustainable pace"
                description="New reading plans will begin with these defaults. You can always adjust an individual plan later."
              />

              <div className="space-y-5">
                <div data-testid="settings-pace-mode">
                  <FieldLabel htmlFor="settings-pace-mode-select">Pace mode</FieldLabel>
                  <div className="relative">
                    <select
                      id="settings-pace-mode-select"
                      value={draft.paceMode}
                      onChange={(event) => setDraft((current) => ({ ...current, paceMode: event.target.value as SettingsPaceMode }))}
                      className="discipleos-control w-full border border-white/15 bg-[#18232d] px-3 pr-32 text-sm text-white outline-none transition focus:border-[#D4A017] focus:ring-2 focus:ring-[#D4A017]/20"
                    >
                      {paceOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-9 flex items-center text-xs text-white/55">
                      {paceOptions.find((option) => option.value === draft.paceMode)?.speedLabel}
                    </span>
                  </div>
                  <p className="discipleos-meta-copy mt-2 text-xs leading-5">
                    Your daily reading budget stays the same; pace estimates how many chapters fit
                    inside it.
                  </p>
                </div>

                <div className={cn(draft.paceMode !== "custom" && "opacity-65")} data-testid="settings-custom-minutes">
                  <FieldLabel htmlFor="settings-custom-minutes-input">Minutes per average chapter</FieldLabel>
                  <div className="relative">
                    <input
                      id="settings-custom-minutes-input"
                      type="number"
                      min="1"
                      max="90"
                      step="1"
                      value={draft.customMinutesPerChapter}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          customMinutesPerChapter: Math.max(1, Math.min(90, Number(event.target.value) || 1)),
                        }))
                      }
                      className="discipleos-control w-full border border-white/15 bg-[#18232d] px-3 pr-16 text-sm text-white outline-none transition focus:border-[#D4A017] focus:ring-2 focus:ring-[#D4A017]/20"
                      aria-describedby="settings-custom-minutes-help"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-white/45">minutes</span>
                  </div>
                  <p id="settings-custom-minutes-help" className="discipleos-meta-copy mt-2 text-xs leading-5">
                    Used when Custom pace is selected. Your daily budget is divided by this
                    estimate to choose a starting chapters-per-day pace.
                  </p>
                </div>
              </div>
            </section>

            <section className="discipleos-functional-surface p-4 sm:p-6" aria-labelledby="daily-heading">
              <SectionHeading
                icon={Clock3}
                eyebrow="Daily shape"
                title="Make space for the word"
                description="Set the size and time of a typical reading moment."
              />

              <div className="space-y-5">
                <div data-testid="settings-daily-reading-budget">
                  <FieldLabel htmlFor="settings-daily-budget-input">Daily reading budget</FieldLabel>
                  <div className="relative">
                    <input
                      id="settings-daily-budget-input"
                      type="number"
                      min="1"
                      max="240"
                      step="1"
                      value={draft.dailyReadingBudget}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          dailyReadingBudget: Math.max(1, Math.min(240, Number(event.target.value) || 1)),
                        }))
                      }
                      className="discipleos-control w-full border border-white/15 bg-[#18232d] px-3 pr-16 text-sm text-white outline-none transition focus:border-[#D4A017] focus:ring-2 focus:ring-[#D4A017]/20"
                      aria-describedby="settings-daily-budget-help"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-white/45">min/day</span>
                  </div>
                  <p id="settings-daily-budget-help" className="discipleos-meta-copy mt-2 text-xs leading-5">
                    This is the time available for a new plan each day. Pace mode estimates how much
                    reading fits inside this window, so a slower reader gets fewer chapters rather
                    than an overfull assignment.
                  </p>
                </div>

                <div data-testid="settings-preferred-reading-time">
                  <FieldLabel htmlFor="settings-reading-time-input">Preferred reading time</FieldLabel>
                  <input
                    id="settings-reading-time-input"
                    type="time"
                    value={draft.preferredReadingTime}
                    onChange={(event) => setDraft((current) => ({ ...current, preferredReadingTime: event.target.value }))}
                    className="discipleos-control w-full border border-white/15 bg-[#18232d] px-3 text-sm text-white outline-none transition focus:border-[#D4A017] focus:ring-2 focus:ring-[#D4A017]/20"
                  />
                </div>
              </div>
            </section>

            <section className="discipleos-functional-surface p-4 sm:col-span-2 sm:p-6" aria-labelledby="order-heading">
              <SectionHeading
                icon={Shuffle}
                eyebrow="Reading order"
                title="Decide how the next page finds you"
                description="Keep a familiar route through Scripture or let each day offer a little variation."
              />
              <div className="grid gap-2 md:grid-cols-2" data-testid="settings-reading-order">
                {orderOptions.map((option) => {
                  const selected = draft.readingOrder === option.value;
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 border p-3 transition-[background-color,border-color,transform]",
                        selected ? "border-[#D4A017]/70 bg-[#D4A017]/10" : "border-white/10 bg-white/[0.025] hover:border-white/25 hover:bg-white/[0.05]",
                      )}
                    >
                      <input
                        type="radio"
                        name="reading-order"
                        value={option.value}
                        checked={selected}
                        onChange={() => setDraft((current) => ({ ...current, readingOrder: option.value }))}
                        className="mt-0.5 h-4 w-4 accent-[#D4A017]"
                      />
                      <span className="min-w-0">
                        <span className={cn("block text-sm font-semibold", selected ? "text-[#F4D77A]" : "text-white")}>{option.label}</span>
                        <span className="discipleos-meta-copy mt-1 block text-xs">{option.detail}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>

            <div className="flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => void onSignOut()}
                className="discipleos-action inline-flex items-center justify-center gap-2 border border-white/15 bg-[#111820]/85 px-4 text-sm font-semibold text-white/75 transition hover:border-red-300/45 hover:bg-red-950/30 hover:text-red-100"
                data-testid="settings-sign-out"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <p className="min-h-5 text-sm text-white/60 sm:text-right" aria-live="polite">
                  {saveMessage}
                </p>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="discipleos-action inline-flex items-center justify-center gap-2 border border-[#E0B449]/50 bg-[#C8921D] px-5 text-sm font-semibold text-black transition hover:bg-[#D4A017] disabled:cursor-wait disabled:opacity-60"
                  data-testid="settings-save"
                >
                  {isSaving ? <LoaderCircle className="h-4 w-4" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                  {isSaving ? "Saving..." : "Save defaults"}
                </button>
              </div>
            </div>
          </form>

          {isFeedbackOwner ? <FeedbackInbox /> : null}

          <div className="mt-6 flex items-start gap-2 text-xs leading-5 text-white/45">
            <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A017]/75" aria-hidden="true" />
            <p>Only your reading defaults live here. Your completed chapters and active plans remain unchanged.</p>
          </div>
        </div>
      </main>
    </div>
  );
}