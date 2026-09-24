// @ts-nocheck
import { apiFetch } from "@/lib/api-fetch";
const fetch = apiFetch;
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../lib/auth";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Circle,
  Compass,
  LockKeyhole,
  Mountain,
  Route as RouteIcon,
  Sparkles,
} from "lucide-react";
import MountainRhythmCard from "../components/MountainRhythmCard";
import {
  VERSE_COUNTS,
  estimateChapterMinutes,
  estimateChapterMinutesAtWpm,
} from "../bible-data";
import {
  buildBudgetedReadingJourneySchedule,
  getReadingJourney,
  isOversizedReadingJourneyPlan,
  normalizeReadingJourneyPlan,
} from "../lib/reading-schedule";
import {
  getReadingWpm,
  loadReadingDefaults,
  normalizeReadingDefaults,
  saveReadingDefaults,
} from "../lib/reading-settings";
import {
  addPendingOp,
  flushPendingOps,
  loadPendingOpsState,
  reconcileSessionBoundary,
  savePendingOps,
} from "../lib/sync";
import {
  calculateMountainRhythm,
  findActiveStructuredClimb,
  getCompletedStructuredClimb,
  getStructuredClimbType,
  mergeLocalCompletionHistory,
  isStructuredClimbComplete,
  MOUNTAIN_RHYTHM_ROUTES,
  RHYTHM_LEVELS,
  resolveStructuredClimbPlanId,
  isStructuredClimbPlan,
} from "../lib/mountain-rhythm";
import {
  createConsistencyResetPlan,
  isRetiredConsistencyResetPlan,
  normalizeConsistencyResetPlan,
} from "../lib/consistency-reset";
import {
  formatLocalDate as formatDate,
  todayISO,
} from "../lib/local-date";

const STORAGE_KEY = "discipleos-data";
const BOOK_CATALOG = Object.entries(VERSE_COUNTS).map(([name, counts]) => ({
  name,
  chapters: counts.length,
}));

function makeId(prefix: string) {
  return `${prefix}-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`}`;
}

function normalizePlans(plans: any[]) {
  return plans
    .filter((plan) => !isRetiredConsistencyResetPlan(plan))
    .map((plan) => normalizeReadingJourneyPlan(normalizeConsistencyResetPlan({
    ...plan,
    completed: { ...(plan.completed || {}) },
    assignments: Array.isArray(plan.assignments) ? [...plan.assignments] : [],
    }), BOOK_CATALOG, estimateChapterMinutes));
}

function loadLocalData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : {};
    return {
      ownerId: typeof parsed.ownerId === "string" ? parsed.ownerId : null,
      plans: Array.isArray(parsed.plans) ? normalizePlans(parsed.plans) : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
      eventCompletions: parsed.eventCompletions && typeof parsed.eventCompletions === "object"
        ? parsed.eventCompletions
        : {},
      selectedPlanId: typeof parsed.selectedPlanId === "string" ? parsed.selectedPlanId : null,
    };
  } catch {
    return { ownerId: null, plans: [], events: [], eventCompletions: {}, selectedPlanId: null };
  }
}

function formatTime(minutes: number) {
  if (!minutes) return "A short reading";
  return `About ${minutes} min`;
}

function planKind(plan: any) {
  return getStructuredClimbType(plan);
}

function makeJourneyPlan(journeyKey: string, readingDefaults = loadReadingDefaults()) {
  const startDate = todayISO();
  const journey = getReadingJourney(journeyKey);
  const readingWpm = getReadingWpm(readingDefaults);
  const assignments = buildBudgetedReadingJourneySchedule({
    journeyKey,
    selectedBooks: [...journey.defaultBooks],
    startDate,
    dailyMinutes: readingDefaults.dailyReadingBudget,
    bookCatalog: BOOK_CATALOG,
    estimateChapterMinutes: (book, chapter) =>
      estimateChapterMinutesAtWpm(book, chapter, readingWpm),
  });
  return {
    id: makeId("plan"),
    name: journey.name,
    journeyKey: journey.key,
    journeyType: journey.type,
    journeyDays: journey.durationDays,
    durationDays: journey.durationDays,
    totalDays: journey.durationDays,
    selectedBooks: [...journey.defaultBooks],
    startDate,
    endDate: assignments[assignments.length - 1]?.date || startDate,
    color: journey.color,
    readingMode: "consecutive",
    readingTime: "07:00",
    paceMode: "time",
    dailyMinutes: readingDefaults.dailyReadingBudget,
    readingWpm,
    assignments,
    completed: {},
  };
}

function makeSevenDayPlan(readingDefaults = loadReadingDefaults()) {
  return makeJourneyPlan("7-day-climb", readingDefaults);
}

function Button({ className = "", ...props }: any) {
  return (
    <button
      type="button"
      {...props}
      className={`transition-[background-color,border-color,transform,opacity] active:translate-y-px ${className}`}
    />
  );
}

function StatusMark({ status }: { status: string }) {
  if (status === "complete") return <CheckCircle2 className="h-4 w-4 text-emerald-300" />;
  if (status === "partial") return <span className="h-3 w-3 rounded-full border-2 border-[#D4A017] bg-[#D4A017]/30" />;
  if (status === "missed") return <span className="h-3 w-3 rounded-full border border-white/30 bg-white/10" />;
  return <span className="h-3 w-3 rounded-full border border-white/20" />;
}

export default function MountainRhythm() {
  const [, setLocation] = useLocation();
  const { isSignedIn } = useAuth();
  const initial = useMemo(() => loadLocalData(), []);
  const [plans, setPlans] = useState(initial.plans);
  const [events, setEvents] = useState(initial.events);
  const [eventCompletions, setEventCompletions] = useState(initial.eventCompletions);
  const [selectedPlanId, setSelectedPlanId] = useState(initial.selectedPlanId);
  const [ownerId, setOwnerId] = useState(initial.ownerId);
  const [readingDefaults, setReadingDefaults] = useState(() => loadReadingDefaults());
  const [isLoading, setIsLoading] = useState(true);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasAuthenticatedSession, setHasAuthenticatedSession] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [saveError, setSaveError] = useState("");
  const [pendingStartKind, setPendingStartKind] = useState<string | null>(null);
  const autoStartedEntryRef = useRef(false);

  const structuredPlans = useMemo(
    () => plans.filter((plan) => isStructuredClimbPlan(plan)),
    [plans],
  );
  const activeClimb = useMemo(() => findActiveStructuredClimb(plans), [plans]);
  const selectedClimbPlanId = useMemo(
    () => resolveStructuredClimbPlanId(plans, selectedPlanId),
    [plans, selectedPlanId],
  );
  const selectedPlan = useMemo(
    () => {
      if (selectedClimbPlanId) {
        return structuredPlans.find((plan) => plan.id === selectedClimbPlanId) || null;
      }
      return structuredPlans.find((plan) => isStructuredClimbComplete(plan)) || null;
    },
    [structuredPlans, selectedClimbPlanId],
  );
  const score = useMemo(
    () => calculateMountainRhythm({
      today: todayISO(),
      plans,
      events,
      eventCompletions,
      selectedPlanId: selectedClimbPlanId,
    }),
    [plans, events, eventCompletions, selectedClimbPlanId],
  );
  const trailByDate = useMemo(
    () => new Map((score.trail || []).map((point) => [point.date, point])),
    [score.trail],
  );
  const today = todayISO();

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      try {
        const sessionResponse = await fetch("/api/session/info", { cache: "no-store" });
        const sessionData = sessionResponse.ok ? await sessionResponse.json() : null;
        if (!cancelled) {
          setHasAuthenticatedSession(Boolean(sessionData?.authenticated || sessionData?.userId));
        }
        if (!cancelled && typeof sessionData?.userId === "string") {
          setOwnerId(sessionData.userId);
          setReadingDefaults(loadReadingDefaults(sessionData.userId));
        } else if (!cancelled) {
          setReadingDefaults(loadReadingDefaults());
        }
        if (isSignedIn && sessionData?.userId) {
          const claimResponse = await fetch("/api/account/claim", {
            method: "POST",
            cache: "no-store",
          });
          if (!claimResponse.ok) throw new Error("Could not claim account data");
        }
        if (!cancelled && typeof sessionData?.userId === "string") {
          const pendingState = loadPendingOpsState();
          const boundary = reconcileSessionBoundary(
            {
              ownerId: initial.ownerId,
              events: initial.events,
              plans: initial.plans,
              pendingOps: pendingState.ops,
              pendingOpsOwnerId: pendingState.ownerId,
            },
            sessionData.userId,
          );
          if (boundary.localDataWasCleared) {
            setEvents([]);
            setPlans([]);
            setEventCompletions({});
            setSelectedPlanId(null);
          }
          if (boundary.pendingOpsWereCleared) {
            savePendingOps([], sessionData.userId);
          } else if (boundary.pendingOps.length > 0) {
            const remaining = await flushPendingOps(boundary.pendingOps);
            savePendingOps(remaining, sessionData.userId);
          }
        }

        const [plansResponse, eventsResponse, rhythmResponse, settingsResponse] = await Promise.all([
          fetch("/api/reading/plans", { cache: "no-store" }),
          fetch("/api/events", { cache: "no-store" }),
          fetch(`/api/rhythm/score?timeZone=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`, {
            cache: "no-store",
          }),
          sessionData?.userId
            ? fetch("/api/settings", { cache: "no-store" })
            : Promise.resolve(null),
        ]);
        if (!cancelled && settingsResponse?.ok) {
          const settingsData = await settingsResponse.json();
          const normalized = normalizeReadingDefaults(settingsData?.settings);
          setReadingDefaults(saveReadingDefaults(normalized, sessionData.userId));
        }
        const sessionEstablished = sessionData?.established === true;
        if (!cancelled && plansResponse.ok) {
          const data = await plansResponse.json();
          if (
            data.success &&
            Array.isArray(data.plans) &&
            (sessionEstablished || data.plans.length > 0)
          ) {
            const localPlansById = new Map(initial.plans.map((plan: any) => [plan.id, plan]));
            const oversizedServerPlans = data.plans.filter((plan: any) =>
              isOversizedReadingJourneyPlan(plan, BOOK_CATALOG, estimateChapterMinutes),
            );
            const hydratedPlans = normalizePlans(data.plans).map((plan: any) =>
              mergeLocalCompletionHistory(plan, localPlansById.get(plan.id)),
            );
            setPlans(
              hydratedPlans,
            );
            if (oversizedServerPlans.length > 0) {
              void Promise.all(
                hydratedPlans
                  .filter((plan: any) =>
                    oversizedServerPlans.some((serverPlan: any) => serverPlan.id === plan.id),
                  )
                  .map((plan: any) =>
                    fetch("/api/reading/plans", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(plan),
                    }),
                  ),
              ).catch(() => {
                if (!cancelled) {
                  setSaveError("Your repaired climb is saved on this device and will sync when you reconnect.");
                }
              });
            }
          }
        }
        if (!cancelled && eventsResponse.ok) {
          const data = await eventsResponse.json();
          if (
            data.success &&
            Array.isArray(data.events) &&
            (sessionEstablished || data.events.length > 0)
          ) {
            setEvents(data.events);
          }
        }
        if (!cancelled && rhythmResponse.ok) {
          const data = await rhythmResponse.json();
          const completions = Array.isArray(data.eventCompletions)
            ? data.eventCompletions
            : data.commitments || [];
          if (data.success && completions.length > 0) {
            const persistedCompletions: Record<string, boolean> = {};
            completions.forEach((completion: any) => {
              if (completion.eventId && completion.occurrenceDate) {
                persistedCompletions[`${completion.eventId}:${completion.occurrenceDate}`] =
                  Boolean(completion.completed);
              }
            });
            setEventCompletions((current) => ({ ...current, ...persistedCompletions }));
          }
        }
      } catch {
        if (!cancelled) setFeedback("Working from this device while connection is restored.");
      } finally {
        if (!cancelled) {
          setSessionChecked(true);
          setIsLoading(false);
        }
      }
    }
    hydrate();
    return () => { cancelled = true; };
  }, [isSignedIn]);

  useEffect(() => {
    if (isLoading) return;
    const local = loadLocalData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...local,
      ownerId,
      plans,
      events,
      eventCompletions,
      selectedPlanId,
    }));
  }, [isLoading, ownerId, plans, events, eventCompletions, selectedPlanId]);

  const queuePending = useCallback(
    (op: any) => {
      const pending = loadPendingOpsState();
      addPendingOp(pending.ops, op, ownerId || pending.ownerId || null);
    },
    [ownerId],
  );

  const savePlan = useCallback(async (plan: any) => {
    const response = await fetch("/api/reading/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plan),
    });
    if (!response.ok) {
      const error: any = new Error("Could not save this climb");
      error.status = response.status;
      throw error;
    }
  }, []);

  const startClimb = useCallback(async (kind: string) => {
    setSaveError("");
    const route = MOUNTAIN_RHYTHM_ROUTES.find((choice) => choice.kind === kind);
    if (!route || route.comingLater || route.locked) return;
    if (activeClimb) {
      setSelectedPlanId(activeClimb.id);
      setFeedback(
        planKind(activeClimb) === kind
          ? `${route.label} · In Progress`
          : `${route.label} is Available after this climb.`,
      );
      return;
    }
    const plan = kind === "20-day-reset"
      ? createConsistencyResetPlan({
          id: makeId("plan"),
          startDate: todayISO(),
          estimateChapterMinutes,
        })
      : makeJourneyPlan(kind, readingDefaults);
    setPlans((current) => [plan, ...current]);
    setSelectedPlanId(plan.id);
    setFeedback(`Starting ${plan.name}.`);
    try {
      await savePlan(plan);
    } catch (error: any) {
      if (error?.status === 403) {
        setPlans((current) => current.filter((item) => item.id !== plan.id));
        setSelectedPlanId(null);
        setSaveError("This climb could not be synced for this account. Your existing plans are unchanged.");
      } else if (error?.status === 409) {
        setPlans((current) => current.filter((item) => item.id !== plan.id));
        setSelectedPlanId(null);
        setSaveError("Another structured climb is already active. Refresh to continue that climb.");
      } else {
        setSaveError("Saved on this device. We will sync this climb when the connection returns.");
        queuePending({ type: "upsert-plan", payload: plan, ts: Date.now() });
      }
    }
  }, [activeClimb, queuePending, readingDefaults, savePlan]);

  const requestStartClimb = useCallback((kind: string) => {
    setSaveError("");
    if (activeClimb) {
      const activeKind = planKind(activeClimb);
      const route = MOUNTAIN_RHYTHM_ROUTES.find((choice) => choice.kind === kind);
      setSelectedPlanId(activeClimb.id);
      setFeedback(
        activeKind === kind
          ? `${route?.label || activeClimb.name} · In Progress`
          : `${route?.label || "This route"} is Available after this climb.`,
      );
      return;
    }
    const route = MOUNTAIN_RHYTHM_ROUTES.find((choice) => choice.kind === kind);
    if (route?.locked) return;
    if (kind === "20-day-reset") {
      setPendingStartKind(kind);
      return;
    }
    void startClimb(kind);
  }, [activeClimb, startClimb]);

  useEffect(() => {
    if (
      isLoading ||
      !sessionChecked ||
      autoStartedEntryRef.current ||
      structuredPlans.length > 0 ||
      isSignedIn ||
      hasAuthenticatedSession
    ) return;
    autoStartedEntryRef.current = true;
    void startClimb("7-day-climb");
  }, [
    hasAuthenticatedSession,
    isLoading,
    isSignedIn,
    sessionChecked,
    startClimb,
    structuredPlans.length,
  ]);

  const toggleReading = useCallback((planId: string, key: string) => {
    let nextValue = false;
    let earnedDay: string | undefined;
    let completionDate: string | undefined;
    setPlans((current) => current.map((plan) => {
      if (plan.id !== planId) return plan;
      const completed = { ...(plan.completed || {}) };
      nextValue = !completed[key];
      completed[key] = nextValue;
      const assignment = plan.assignments.find((day: any) => day.readings.some((reading: any) => reading.key === key));
      if (assignment && nextValue && assignment.readings.every((reading: any) => reading.key === key || completed[reading.key])) {
        earnedDay = assignment.date;
        completionDate = todayISO();
      }
      const earnedDayKeys = new Set(plan.earnedDayKeys || []);
      if (earnedDay) earnedDayKeys.add(earnedDay);
      const dayCompletionDates = { ...(plan.dayCompletionDates || {}) };
      if (earnedDay && completionDate && !dayCompletionDates[earnedDay]) {
        dayCompletionDates[earnedDay] = completionDate;
      }
      return { ...plan, completed, earnedDayKeys: [...earnedDayKeys], dayCompletionDates };
    }));
    fetch("/api/reading/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId, key, completed: nextValue, earnedDay, completionDate }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Could not save reading progress");
      })
      .catch(() => {
        queuePending({
          type: "chapter-complete",
          planId,
          key,
          completed: nextValue,
          earnedDay,
          completionDate,
          ts: Date.now(),
        });
        setSaveError("Your progress is saved on this device and will sync when you reconnect.");
      });
  }, [queuePending]);

  const completeDay = useCallback((planId: string, date: string) => {
    const plan = plans.find((item: any) => item.id === planId);
    const assignment = plan?.assignments?.find((day: any) => day.date === date);
    if (!plan || !assignment?.readings?.length) return;
    const currentCompleted = plan.completed || {};
    const allDone = assignment.readings.every((reading: any) => Boolean(currentCompleted[reading.key]));
    const nextValue = !allDone;
    const completionDate = todayISO();
    setPlans((current) => current.map((plan) => {
      if (plan.id !== planId) return plan;
      const completed = { ...(plan.completed || {}) };
      assignment.readings.forEach((reading: any) => {
        completed[reading.key] = nextValue;
      });
      const earnedDayKeys = new Set(plan.earnedDayKeys || []);
      const dayCompletionDates = { ...(plan.dayCompletionDates || {}) };
      if (nextValue) {
        earnedDayKeys.add(date);
        if (!dayCompletionDates[date]) dayCompletionDates[date] = completionDate;
      }
      return { ...plan, completed, earnedDayKeys: [...earnedDayKeys], dayCompletionDates };
    }));
    fetch("/api/reading/day-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId, date, completed: nextValue, completionDate }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Could not save day progress");
      })
      .catch(() => {
        queuePending({
          type: "day-complete",
          planId,
          date,
          completed: nextValue,
          completionDate,
          ts: Date.now(),
        });
        setSaveError("Your progress is saved on this device and will sync when you reconnect.");
      });
  }, [plans, queuePending]);

  const currentRoute = (selectedPlan?.assignments || []).filter(
    (day: any) => day.date <= today,
  );
  const currentStatus = score.todayPlanned
    ? score.todayPercentage >= 100 ? "Complete" : score.todayPercentage > 0 ? "In progress" : "Ready for today"
    : "No reading scheduled";
  const activeKind = activeClimb ? planKind(activeClimb) : null;
  const selectedKind = selectedPlan ? planKind(selectedPlan) : null;
  const selectedComplete = Boolean(selectedPlan && isStructuredClimbComplete(selectedPlan));
  const selectedPlanAverageMinutes = useMemo(() => {
    const assignments = Array.isArray(selectedPlan?.assignments)
      ? selectedPlan.assignments
      : [];
    if (assignments.length === 0) return 0;
    return Math.round(
      assignments.reduce(
        (sum: number, assignment: any) => sum + Number(assignment?.estimatedMinutes || 0),
        0,
      ) / assignments.length,
    );
  }, [selectedPlan]);
  const completedClimbs = useMemo(
    () =>
      structuredPlans
        .map((plan) => {
          const summary = getCompletedStructuredClimb(plan);
          return summary ? { ...summary, plan } : null;
        })
        .filter(Boolean),
    [structuredPlans],
  );
  const selectedRouteIndex = MOUNTAIN_RHYTHM_ROUTES.findIndex(
    (route) => route.kind === selectedKind,
  );
  const nextRoute =
    selectedRouteIndex >= 0
      ? MOUNTAIN_RHYTHM_ROUTES
          .slice(selectedRouteIndex + 1)
              .find((route) => !route.comingLater && !route.locked) ||
        MOUNTAIN_RHYTHM_ROUTES.find(
          (route) => route.kind !== selectedKind && !route.comingLater && !route.locked,
        )
      : null;

  return (
    <div className="discipleos-shell min-h-[100dvh] text-white">
      <div className="discipleos-content">
        <header className="flex items-center justify-between gap-4 py-4">
          <Button
            onClick={() => setLocation("/")}
            className="discipleos-action inline-flex items-center gap-2 border border-white/10 bg-white/[0.04] px-3 text-sm text-white/70 hover:border-[#D4A017]/35 hover:bg-[#D4A017]/10 hover:text-white"
            data-testid="button-back-mountain-rhythm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Today</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </header>

        <main className="discipleos-page-main">
          <section className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#D4A017]">
              <Compass className="h-4 w-4" />
              My Ascent
            </div>
            <h1 className="discipleos-page-title">
              Mountain Rhythm
            </h1>
             <p className="discipleos-safe-text mt-4 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
              One clear route for Scripture consistency. Choose a structured climb, then take the next faithful step.
            </p>
          </section>

          <section className="mt-8 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start">
            <div className="min-w-0">
              <MountainRhythmCard score={score} loading={isLoading} />
            </div>

            <section data-testid="mountain-rhythm-choose" className="min-w-0">
              <div className="discipleos-section-heading">
                <Mountain className="discipleos-section-heading__icon" />
                Choose your climb
              </div>
                <p className="discipleos-secondary-copy discipleos-safe-text mt-2 text-sm leading-6">
                Only the selected structured climb shapes your ascent. Ordinary reading plans stay available in Plans.
              </p>
              <div className="mt-5 space-y-3">
                {MOUNTAIN_RHYTHM_ROUTES.map((choice) => {
                  const active = activeKind === choice.kind;
                  const completed = completedClimbs.some((climb) => climb.type === choice.kind);
                  const unavailable = Boolean(activeClimb && !active);
                  const later = choice.comingLater;
                  const locked = choice.locked;
                  return (
                    <Button
                      key={choice.kind}
                      onClick={() => !later && !locked && !unavailable && requestStartClimb(choice.kind)}
                      disabled={later || locked || unavailable}
                      className={`discipleos-item-surface w-full p-4 text-left ${active ? "border-[#D4A017] bg-[#D4A017]/15" : choice.kind === "7-day-climb" ? "border-sky-300/25 bg-sky-300/[0.06]" : choice.kind === "20-day-reset" ? "border-[#D4A017]/35 bg-[#D4A017]/[0.08]" : "border-white/10 bg-white/[0.03]"} ${later || locked || unavailable ? "cursor-not-allowed opacity-60" : "hover:border-[#D4A017]/60 hover:bg-[#D4A017]/10"}`}
                      data-testid={`button-choose-${choice.kind}`}
                    >
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="break-words leading-5 font-semibold text-white">
                            {active ? `${choice.label} · In Progress` : completed ? `${choice.label} · Complete` : choice.label}
                          </div>
                            <div className="discipleos-secondary-copy discipleos-safe-text mt-1 text-sm leading-5">{choice.description}</div>
                        </div>
                        {later || locked ? <LockKeyhole className="h-4 w-4 text-white/45" /> : active ? <Check className="h-5 w-5 text-[#F4D77A]" /> : <span className="text-lg text-[#D4A017]">+</span>}
                      </div>
                      <div className="discipleos-field-label mt-3 text-[10px] font-semibold uppercase tracking-[0.16em]">
                        {later ? "Coming Later" : locked ? "Locked" : active ? "In Progress" : unavailable ? "Available after this climb." : completed ? "Completed" : "Start this route"}
                      </div>
                    </Button>
                  );
                })}
              </div>
              {pendingStartKind === "20-day-reset" ? (
                  <div
                    className="mt-4 border-l-2 border-[#D4A017]/45 pl-4"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="confirm-reset-title"
                  data-testid="dialog-confirm-20-day-reset"
                >
                  <div id="confirm-reset-title" className="font-semibold text-white">Start the 20-Day Reset?</div>
                   <p className="discipleos-secondary-copy mt-2 text-sm leading-6">
                    This free 20-day Scripture route will become your active Mountain Rhythm climb. Your ordinary Plans stay unchanged.
                  </p>
                  <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                      onClick={() => setPendingStartKind(null)}
                      className="discipleos-action border border-white/15 px-4 text-sm text-white/70 hover:bg-white/10"
                      data-testid="button-cancel-20-day-reset"
                    >
                      Not now
                    </Button>
                    <Button
                      onClick={() => {
                        setPendingStartKind(null);
                        void startClimb("20-day-reset");
                      }}
                      className="discipleos-action bg-[#C8921D] px-4 text-sm font-semibold text-black hover:bg-[#D4A017]"
                      data-testid="button-confirm-20-day-reset"
                    >
                      Start 20-Day Reset
                    </Button>
                  </div>
                </div>
              ) : null}
              {selectedComplete ? (
                <div
                  className="mt-4 border-l-2 border-emerald-300/35 pl-4"
                  data-testid="mountain-rhythm-complete"
                >
                  <div className="font-semibold text-white">{selectedPlan.name} complete</div>
                   <p className="discipleos-secondary-copy mt-2 text-sm leading-6">
                    Your earned ascent remains yours. Keep your daily walk going while you choose what comes next.
                  </p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Button
                      onClick={() => setLocation("/")}
                      className="discipleos-action border border-white/15 px-4 text-sm text-white/80 hover:bg-white/10"
                      data-testid="button-continue-daily-walk"
                    >
                      Continue Daily Walk
                    </Button>
                    {nextRoute ? (
                      nextRoute.comingLater ? (
                        <Button
                          disabled
                          className="discipleos-action cursor-not-allowed border border-white/10 px-4 text-sm text-white/45"
                          data-testid="button-next-climb-coming-later"
                        >
                          40-Day Climb · Coming Later
                        </Button>
                      ) : (
                        <Button
                          onClick={() => requestStartClimb(nextRoute.kind)}
                          className="discipleos-action bg-[#C8921D] px-4 text-sm font-semibold text-black hover:bg-[#D4A017]"
                          data-testid={`button-start-next-${nextRoute.kind}`}
                        >
                          Start {nextRoute.label}
                        </Button>
                      )
                    ) : null}
                  </div>
                </div>
              ) : null}
              {completedClimbs.length > 0 ? (
                <section
                  className="mt-4 border-t border-emerald-300/20 pt-4"
                  data-testid="mountain-rhythm-completed-climbs"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200/80">
                    Earned ascent retained
                  </div>
                  <div className="mt-3 space-y-2">
                    {completedClimbs.map((climb) => (
                      <div
                        key={climb.planId}
                        className="flex flex-col gap-1 border-b border-emerald-300/15 bg-black/10 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                        data-testid={`completed-climb-${climb.type}`}
                      >
                        <div>
                          <div className="text-sm font-semibold text-white">{climb.label} · Complete</div>
                          <div className="discipleos-secondary-copy text-xs">
                            {climb.completedDays} of {climb.journeyDays} days earned · {climb.journeyProgress}% journey progress
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-emerald-200">
                          {climb.earnedAscent} ascent
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
              {feedback ? <div className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-sm text-emerald-100" data-testid="status-mountain-feedback">{feedback}</div> : null}
              {saveError ? <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100" data-testid="status-mountain-save">{saveError}</div> : null}
              {!isSignedIn ? <div className="discipleos-secondary-copy mt-4 text-xs leading-5">Your ascent is saved on this device. Sign in from the home page when you are ready to sync it.</div> : null}
            </section>
          </section>

          {selectedPlan ? (
            <>
               <section className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                 <div data-testid="mountain-rhythm-route" className="min-w-0">
                     <div className="flex min-w-0 items-center justify-between gap-3">
                     <div className="min-w-0">
                          <div className="discipleos-section-heading"><RouteIcon className="discipleos-section-heading__icon" /> Route to date</div>
                        <p className="discipleos-secondary-copy discipleos-safe-text mt-1 text-sm">
                          {selectedPlan.name}
                          {selectedPlanAverageMinutes > 0 ? ` · about ${selectedPlanAverageMinutes} min/day` : ""}
                          {" · future readings stay hidden until their day"}
                        </p>
                    </div>
                    <span className="rounded-full border border-[#D4A017]/30 bg-[#D4A017]/10 px-3 py-1 text-xs text-[#F4D77A]">{score.completedDays}/{score.journeyDays} days</span>
                  </div>
                  <div className="mt-5 space-y-3">
                    {currentRoute.map((day: any, index: number) => {
                      const point = trailByDate.get(day.date);
                      const status = point?.status || "future";
                      const completed = selectedPlan.completed || {};
                      const allDone = day.readings.length > 0 &&
                        day.readings.every((reading: any) => Boolean(completed[reading.key]));
                      return (
                        <div key={day.date} className={`discipleos-item-surface p-4 ${day.date === today ? "border-[#D4A017]/45 bg-[#D4A017]/[0.07]" : "border-white/10 bg-white/[0.025]"}`} data-testid={`route-day-${index + 1}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/20 text-xs font-semibold text-[#F4D77A]">{index + 1}</div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
                                  {formatDate(day.date)}
                                  {day.date === today ? <span className="rounded-full bg-[#D4A017]/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[#F4D77A]">Today</span> : null}
                                </div>
                                <div className="discipleos-meta-copy mt-1 text-xs">{day.readings.length} reading{day.readings.length === 1 ? "" : "s"} · {formatTime(day.estimatedMinutes)}</div>
                              </div>
                            </div>
                               <div className="flex shrink-0 items-center gap-2 text-xs">
                                 <div className="discipleos-secondary-copy flex items-center gap-2"><StatusMark status={status} /><span className="hidden sm:inline">{status === "future" ? "Upcoming" : status === "complete" ? "Complete" : status === "partial" ? "In progress" : "Next step"}</span></div>
                                 {day.date <= today ? (
                                   <Button
                                     onClick={() => completeDay(selectedPlan.id, day.date)}
                                     className="discipleos-control--compact border border-[#D4A017]/25 bg-[#D4A017]/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#F4D77A] hover:border-[#D4A017]/50 hover:bg-[#D4A017]/20"
                                     data-testid={`button-complete-day-${index + 1}`}
                                   >
                                     {allDone ? "Undo day" : "Complete day"}
                                   </Button>
                                 ) : null}
                               </div>
                          </div>
                           <div className="discipleos-flat-list mt-3 grid gap-2 sm:grid-cols-2">
                            {day.readings.map((reading: any) => {
                              const done = Boolean(completed[reading.key]);
                              return (
                                <Button
                                  key={reading.key}
                                  onClick={() => toggleReading(selectedPlan.id, reading.key)}
                                   className={`discipleos-flat-row flex min-w-0 items-center justify-between gap-3 px-3 py-3 text-left text-sm ${done ? "bg-emerald-300/10 text-emerald-100" : "bg-black/20 text-white/75 hover:bg-[#D4A017]/10"}`}
                                  data-testid={`button-reading-${reading.key}`}
                                >
                                   <span className="discipleos-safe-text">{reading.label || `${reading.book} ${reading.chapter}`}</span>
                                  {done ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <Circle className="h-4 w-4 shrink-0 text-white/25" />}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                 <div className="min-w-0 space-y-5">
                    <section data-testid="mountain-rhythm-status" className="min-w-0">
                     <div className="discipleos-section-heading"><Sparkles className="discipleos-section-heading__icon" /> Today's status</div>
                     <div className="mt-4 border-l-2 border-[#D4A017]/45 pl-4">
                       <div className="discipleos-field-label text-[10px] uppercase tracking-[0.16em]">Scripture</div>
                      <div className="mt-2 flex items-center gap-2 text-base font-semibold text-[#F4D77A]"><StatusMark status={score.todayPercentage >= 100 ? "complete" : score.todayPercentage > 0 ? "partial" : "future"} />{currentStatus}</div>
                       <div className="discipleos-secondary-copy mt-1 text-sm">{score.todayPlanned ? `${score.todayPercentage}% of today's reading complete` : "Your next assigned reading will appear here."}</div>
                    </div>
                  </section>

                    <section data-testid="mountain-rhythm-milestones" className="min-w-0 border-t border-white/10 pt-5">
                     <div className="discipleos-section-heading">Milestones</div>
                    <div className="mt-4 space-y-3">
                      {RHYTHM_LEVELS.map((level) => {
                        const reached = score.currentElevationPercent >= level.min;
                        const current = score.level === level.name;
                        return (
                          <div key={level.name} className={`flex items-center gap-3 border-b border-white/10 px-3 py-3 ${current ? "bg-[#D4A017]/10" : "bg-white/[0.025]"}`}>
                            <span className={`flex h-7 w-7 items-center justify-center rounded-full border ${reached ? "border-emerald-300/50 bg-emerald-300/15 text-emerald-200" : "border-white/15 text-white/30"}`}>{reached ? <Check className="h-3.5 w-3.5" /> : <span className="text-xs">{level.min}</span>}</span>
                             <div className="min-w-0"><div className={`text-sm font-medium ${reached ? "text-white" : "discipleos-meta-copy"}`}>{level.name}</div><div className="discipleos-meta-copy text-xs">{level.min}% elevation</div></div>
                            {current ? <span className="ml-auto text-[10px] uppercase tracking-[0.12em] text-[#F4D77A]">Current</span> : null}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>
              </section>
            </>
          ) : (
             <section className="discipleos-item-surface discipleos-secondary-copy mt-5 border-dashed border-[#D4A017]/30 bg-[#111a1e]/70 p-5 text-sm leading-6">
              Choose a route above to see the full ascent, daily readings, milestones, and today's next step.
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
