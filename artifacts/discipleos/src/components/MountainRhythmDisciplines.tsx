import { useMemo, useState } from "react";
import { Check, HeartHandshake, Sparkles } from "lucide-react";
import { eventOccursOnDate } from "../lib/mountain-rhythm";
import { climbDatesInRange, fastingDatesForClimb, isFastingDateAllowed } from "../lib/discipline-schedule";

const weekdays = [
  ["Sunday", "Su", 0], ["Monday", "M", 1], ["Tuesday", "Tu", 2],
  ["Wednesday", "W", 3], ["Thursday", "Th", 4], ["Friday", "F", 5],
  ["Saturday", "Sa", 6],
] as const;

const choices = [
  { key: "prayer", label: "Prayer", description: "Set aside time to pray", icon: HeartHandshake },
  { key: "fasting", label: "Fasting", description: "Set your own fasting schedule", icon: Sparkles },
] as const;

type Discipline = "prayer" | "fasting";
type Step = "choose" | "start" | "prayer" | "fasting" | "review";
type FastDateSelection = { key: string; date: string; eventId?: string };

const isoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const shiftDate = (date: string, days: number) => {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return isoDate(value);
};
const dateLabel = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
function climbKind(plan: any): "7-day-climb" | "20-day-reset" | "40-day-climb" | "future" {
  const descriptor = [plan?.journeyType, plan?.journeyKey, plan?.templateKey, plan?.name]
    .filter(Boolean).join(" ").toLowerCase().replaceAll("_", "-");
  if (descriptor.includes("7-day") || descriptor.includes("7 day") || descriptor.includes("7day")) return "7-day-climb";
  if (descriptor.includes("20-day") || descriptor.includes("20 day") || descriptor.includes("20day")) return "20-day-reset";
  if (descriptor.includes("40-day") || descriptor.includes("40 day") || descriptor.includes("40day")) return "40-day-climb";
  return "future";
}
const fastSelection = (date: string, eventId?: string): FastDateSelection => ({
  key: eventId || `new-${crypto.randomUUID()}`,
  date,
  ...(eventId ? { eventId } : {}),
});
function trackingFor(plan: any, events: any[] = [], ownerId?: string | null) {
  const saved = plan?.disciplineTracking || {};
  const localOwner = String(ownerId || "device").replace(/[^a-zA-Z0-9_-]/g, "_");
  const localKey = `discipleos:discipline-scheduler:${localOwner}`;
  let local: any = {};
  if (!plan && typeof window !== "undefined") {
    try { local = JSON.parse(window.localStorage.getItem(localKey) || "{}"); } catch { local = {}; }
  }
  const refs = (value: any) => {
    const ids = Array.isArray(value?.eventIds) ? value.eventIds : [];
    return [...new Set([...ids, value?.eventId].filter(Boolean))] as string[];
  };
  const prayerIds = refs(saved.prayer || local.prayer);
  const fastingIds = refs(saved.fasting || local.fasting);
  if (!plan) {
    const prefix = `discipline-noplan-${localOwner}-`;
    prayerIds.push(...events.filter((event) => event.id?.startsWith(`${prefix}prayer`)).map((event) => event.id));
    fastingIds.push(...events.filter((event) => event.id?.startsWith(`${prefix}fast-`)).map((event) => event.id));
  }
  return {
    setupAnswered: Boolean(saved.setupAnswered || local.setupAnswered || prayerIds.length || fastingIds.length),
    prayer: { enabled: Boolean(saved.prayer?.enabled ?? local.prayer?.enabled ?? prayerIds.length), eventIds: [...new Set(prayerIds)] },
    fasting: { enabled: Boolean(saved.fasting?.enabled ?? local.fasting?.enabled ?? fastingIds.length), eventIds: [...new Set(fastingIds)] },
    localKey,
    localOwner,
  };
}

export default function MountainRhythmDisciplines({
  plan, events, completions, today, ownerId, onSavePlan, onSaveEvent, onToggleCompletion,
}: {
  plan: any;
  events: any[];
  completions: Record<string, boolean>;
  today: string;
  ownerId?: string | null;
  onSavePlan: (nextPlan: any) => void;
  onSaveEvent: (event: any) => Promise<any>;
  onToggleCompletion: (eventId: string, date: string, completed: boolean) => void;
}) {
  const persisted = trackingFor(plan, events, ownerId);
  const [selected, setSelected] = useState({
    prayer: persisted.prayer.enabled, fasting: persisted.fasting.enabled,
  });
  const [step, setStep] = useState<Step>("choose");
  const [startDate, setStartDate] = useState(shiftDate(today, 1));
  const [startConfirmed, setStartConfirmed] = useState(false);
  const [prayerTime, setPrayerTime] = useState("06:30");
  const [prayerDays, setPrayerDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [prayerFrequency, setPrayerFrequency] = useState<"weekly" | "daily">("weekly");
  const [prayerReminder, setPrayerReminder] = useState(true);
  const [prayerReminderMinutes, setPrayerReminderMinutes] = useState(10);
  const [fastDates, setFastDates] = useState<FastDateSelection[]>([]);
  const [fastReminder, setFastReminder] = useState(true);
  const [fastReminderMinutes, setFastReminderMinutes] = useState(720);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const eventsFor = (discipline: Discipline) =>
    persisted[discipline].eventIds.map((id) => events.find((event) => event.id === id)).filter(Boolean);
  const prayerEvents = eventsFor("prayer");
  const fastingEvents = eventsFor("fasting");
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local time";
  const actualClimbStart = plan?.startDate || plan?.assignments?.[0]?.date || "";
  const actualClimbEnd = plan?.endDate || plan?.assignments?.at?.(-1)?.date || "";
  const kind = climbKind(plan);
  const allClimbDates = useMemo(
    () => climbDatesInRange(actualClimbStart, actualClimbEnd),
    [actualClimbStart, actualClimbEnd],
  );
  const suggestedDates = useMemo(
    () => fastingDatesForClimb(actualClimbStart, actualClimbEnd, today, kind),
    [actualClimbStart, actualClimbEnd, today, kind],
  );
  const fastingDateErrors = fastDates.flatMap((item) =>
    isFastingDateAllowed(item.date, actualClimbStart, actualClimbEnd, today) ? [] : [item.date],
  );
  const hasDuplicateFastingDates = new Set(fastDates.map((item) => item.date)).size !== fastDates.length;
  const setNextDetail = (nextSelected: typeof selected) => {
    if (nextSelected.prayer) setStep("prayer");
    else if (nextSelected.fasting) setStep("fasting");
    else setStep("review");
  };

  const beginFlow = () => {
    setStartDate(shiftDate(today, 1));
    setStartConfirmed(false);
    setFastDates([]);
    setError("");
    setStep("choose");
  };

  const beginEdit = (discipline: Discipline) => {
    const savedEvents = eventsFor(discipline);
    if (discipline === "prayer" && savedEvents[0]) {
      const event = savedEvents[0];
      setStartDate(event.date || today);
      setPrayerTime(event.time || "06:30");
      setPrayerDays(event.repeatWeekdays?.length ? event.repeatWeekdays : [0, 1, 2, 3, 4, 5, 6]);
      setPrayerFrequency(event.repeat === "daily" ? "daily" : "weekly");
      setPrayerReminder(Boolean(event.remind));
      setPrayerReminderMinutes(Number(event.reminderMinutes ?? 10));
    }
    if (discipline === "fasting" && savedEvents.length) {
      setFastDates(savedEvents.map((event) => fastSelection(event.date, event.id)).sort((a, b) => a.date.localeCompare(b.date)));
      setFastReminder(savedEvents.some((event) => Boolean(event.remind)));
      setFastReminderMinutes(Number(savedEvents[0].reminderMinutes ?? 720));
    }
    const nextSelected = { prayer: discipline === "prayer", fasting: discipline === "fasting" };
    setSelected(nextSelected);
    setStartConfirmed(true);
    setError("");
    setStep(discipline);
  };

  const persistChoices = (next: typeof selected) => {
    const current = trackingFor(plan, events, ownerId);
    const updated = {
      setupAnswered: true,
      prayer: { enabled: next.prayer, eventIds: current.prayer.eventIds },
      fasting: { enabled: next.fasting, eventIds: current.fasting.eventIds },
    };
    if (plan) onSavePlan({ ...plan, disciplineTracking: updated });
    else window.localStorage.setItem(current.localKey, JSON.stringify(updated));
  };

  const saveSchedule = async () => {
    if (!startConfirmed) {
      setError("Confirm your start date before saving.");
      setStep("start");
      return;
    }
    if (selected.prayer && !prayerDays.length) {
      setError("Choose at least one prayer day.");
      setStep("prayer");
      return;
    }
    if (selected.fasting && (!plan || !actualClimbStart || !actualClimbEnd)) {
       setError("Fasting dates can only be scheduled within an active climb. Wait for a new climb to set fasting dates.");
       setStep("fasting");
       return;
     }
     if (selected.fasting && (fastingDateErrors.length || hasDuplicateFastingDates)) {
       setError("Every fasting date must be unique, today or later, and within the selected climb dates.");
      setStep("fasting");
      return;
    }
    setSaving(true);
    setError("");
    const current = trackingFor(plan, events, ownerId);
    const noPlanPrefix = `discipline-noplan-${current.localOwner}-`;
    try {
      const nextTracking: any = {
        setupAnswered: true,
        prayer: { enabled: selected.prayer, eventIds: current.prayer.eventIds },
        fasting: { enabled: selected.fasting, eventIds: current.fasting.eventIds },
      };
      if (selected.prayer) {
        const oldId = current.prayer.eventIds[0];
        const prayer = await onSaveEvent({
        id: oldId || (plan ? `discipline-${plan.id}-prayer` : `${noPlanPrefix}prayer`),
          title: "Prayer time",
          type: "prayer",
          date: startDate,
          time: prayerTime,
          timeZone: timezone,
          repeat: prayerFrequency,
          repeatWeekdays: prayerFrequency === "daily" ? [0, 1, 2, 3, 4, 5, 6] : prayerDays,
          repeatUntil: plan?.endDate || "",
          remind: prayerReminder,
          reminderMinutes: prayerReminderMinutes,
          notes: "",
          countsTowardRhythm: true,
        });
        nextTracking.prayer.eventIds = [prayer.id];
      }
      if (selected.fasting) {
        const ids: string[] = [];
        for (let index = 0; index < fastDates.length; index++) {
          const choice = fastDates[index];
          const oldId = choice.eventId;
          const event = await onSaveEvent({
            id: oldId || `discipline-${plan.id}-fast-${choice.key}`,
            title: "Fasting commitment",
            type: "fast",
            date: choice.date,
            time: "",
            timeZone: timezone,
            repeat: "none",
            repeatWeekdays: [],
            repeatUntil: "",
            remind: fastReminder,
            reminderMinutes: fastReminderMinutes,
            notes: "",
            countsTowardRhythm: true,
          });
          ids.push(event.id);
        }
        nextTracking.fasting.eventIds = ids;
      }
      if (plan) onSavePlan({ ...plan, disciplineTracking: nextTracking });
      else window.localStorage.setItem(current.localKey, JSON.stringify(nextTracking));
      setStep("choose");
    } catch {
      setError("The schedule could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleWeekday = (day: number) =>
    setPrayerDays((days) => days.includes(day) ? days.filter((value) => value !== day) : [...days, day].sort());

  const addNextFastingDate = () => {
    const next = allClimbDates.find((date) =>
      isFastingDateAllowed(date, actualClimbStart, actualClimbEnd, today) &&
      !fastDates.some((item) => item.date === date),
    );
    if (next) setFastDates((dates) => [...dates, fastSelection(next)]);
  };

  return (
    <section className="mt-5 min-w-0" data-testid="mountain-rhythm-disciplines">
      {!persisted.setupAnswered && step === "choose" ? (
        <div className="rounded-xl border border-[#D4A017]/35 bg-[#111820] p-4 sm:p-5" data-testid="mountain-rhythm-commitment-invitation">
          <h2 className="text-lg font-semibold leading-6 text-white sm:text-xl">Add Prayer or Fasting to Your Rhythm</h2>
          <p className="mt-2 text-sm leading-6 text-white/75">These optional commitments stay separate from Scripture completion and climb progress.</p>
          <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2" role="group" aria-label="Optional prayer and fasting commitments">
            {choices.map(({ key, label, description, icon: Icon }) => (
              <label key={key} data-testid={`discipline-choice-card-${key}`} className="block min-w-0 cursor-pointer">
                <input type="checkbox" checked={selected[key]} onChange={(event) => setSelected((current) => ({ ...current, [key]: event.target.checked }))} className="peer sr-only" />
                <span className="flex min-h-24 items-center gap-3 rounded-lg border border-white/15 bg-[#090D12] p-4 peer-checked:border-[#D4A017] peer-checked:bg-[#D4A017]/[0.08] peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-[#F4D77A]">
                  <Icon className="h-5 w-5 text-[#F4D77A]" aria-hidden="true" />
                  <span className="min-w-0 flex-1"><span className="block text-base font-semibold text-white">{label}</span><span className="mt-1 block text-sm text-white/70">{description}</span></span>
                  <span className="flex h-6 w-6 items-center justify-center rounded border border-white/25">{selected[key] ? <Check className="h-4 w-4" /> : null}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={() => selected.prayer || selected.fasting ? setStep("start") : persistChoices(selected)} className="min-h-11 rounded-md bg-[#D4A017] px-4 text-sm font-semibold text-black">{selected.prayer || selected.fasting ? "Continue" : "Save choices"}</button>
            <button type="button" onClick={() => persistChoices({ prayer: false, fasting: false })} className="min-h-11 px-3 text-sm text-white/70 underline">Neither / Not now</button>
          </div>
        </div>
      ) : null}

      {persisted.setupAnswered && step === "choose" ? (
        <>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-white/65">Optional commitments</div>
          <p className="mt-1 text-sm text-white/55">Prayer and fasting never affect Scripture completion or climb progress.</p>
          <div className="mt-3 space-y-2">
            {(["prayer", "fasting"] as const).map((discipline) => {
              const savedEvents = eventsFor(discipline);
              const enabled = persisted[discipline].enabled;
              return <div key={discipline} className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium capitalize text-white">
                    <input type="checkbox" checked={enabled} onChange={(event) => persistChoices({ prayer: persisted.prayer.enabled, fasting: persisted.fasting.enabled, [discipline]: event.target.checked })} className="accent-[#D4A017]" />
                    {discipline}
                  </label>
                  <button type="button" onClick={() => beginEdit(discipline)} className="min-h-9 rounded-md border border-white/15 px-3 text-xs text-white/75">{enabled ? "Edit schedule" : "Set schedule"}</button>
                </div>
                {enabled && savedEvents.length ? <div className="mt-1 text-xs text-white/55">{discipline === "prayer" ? `${savedEvents[0].time} · ${savedEvents[0].repeat === "daily" ? "Daily" : "Weekly"}` : `${savedEvents.length} all-day date${savedEvents.length === 1 ? "" : "s"}`}</div> : null}
              </div>;
            })}
          </div>
          <button type="button" onClick={() => {
            setSelected({ prayer: persisted.prayer.enabled, fasting: persisted.fasting.enabled });
            setStartDate(shiftDate(today, 1));
            setStartConfirmed(false);
            setFastDates([]);
            setError("");
            setStep("start");
          }} className="mt-3 min-h-10 rounded-md border border-white/15 px-3 text-sm text-white/75">Set up commitments</button>
          {(["prayer", "fasting"] as const).map((discipline) => {
            if (!persisted[discipline].enabled) return null;
            return eventsFor(discipline).map((event) => {
              if (!eventOccursOnDate(event, today)) return null;
              const complete = completions[`${event.id}:${today}`] === true;
              return <button key={`${discipline}-${event.id}`} type="button" onClick={() => onToggleCompletion(event.id, today, !complete)} className="mt-3 flex min-h-11 w-full items-center justify-between rounded-md border border-white/10 bg-black/15 px-3 text-left text-sm text-white"><span>{discipline === "fasting" ? "All-day fast" : `Prayer · ${event.time}`} for today</span><span className={complete ? "text-emerald-200" : "text-white/50"}>{complete ? "Complete" : "Mark complete"}</span></button>;
            });
          })}
        </>
      ) : null}

      {step !== "choose" ? <div role="dialog" aria-modal="true" aria-label="Guided prayer and fasting scheduler" className="mt-3 rounded-xl border border-[#D4A017]/30 bg-[#111820] p-4 sm:p-5">
        <div className="mb-4 text-sm font-semibold text-white">Guided schedule · {step === "start" ? "Start date" : step === "prayer" ? "Prayer" : step === "fasting" ? "Fasting" : "Review"}</div>
        {step === "start" ? <>
          <h3 className="text-lg font-semibold text-white">When would you like to begin?</h3>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {([["Today", today], ["Tomorrow", shiftDate(today, 1)]] as const).map(([label, date]) => <button key={label} type="button" aria-pressed={startDate === date} onClick={() => { setStartDate(date); setStartConfirmed(false); }} className={`min-h-11 rounded-md border px-2 text-sm ${startDate === date ? "border-[#D4A017] bg-[#D4A017]/15 text-[#F4D77A]" : "border-white/15 text-white/75"}`}>{label}</button>)}
            <button type="button" aria-pressed={startDate !== today && startDate !== shiftDate(today, 1)} onClick={() => { setStartDate((date) => date === today || date === shiftDate(today, 1) ? shiftDate(today, 2) : date); setStartConfirmed(false); }} className="min-h-11 rounded-md border border-white/15 px-2 text-sm text-white/75">Choose date</button>
          </div>
          <label className="mt-3 block text-sm text-white/65">Start date<input aria-label="Commitment start date" type="date" min={today} value={startDate} onChange={(event) => { setStartDate(event.target.value); setStartConfirmed(false); }} className="mt-1 min-h-11 w-full rounded-md border border-white/15 bg-black/30 px-3 text-white [color-scheme:dark]" /></label>
          <p className="mt-2 text-xs text-white/55">Your local time zone: {timezone}. This does not change your reading plan or climb dates.</p>
          {selected.fasting && plan ? <p className="mt-2 text-xs text-white/70">Fasting dates must stay within this climb: {dateLabel(actualClimbStart)} – {dateLabel(actualClimbEnd)}. The commitment start date will not move the climb.</p> : null}
        </> : step === "prayer" ? <>
          <h3 className="text-lg font-semibold text-white">Set your prayer schedule</h3>
          <p className="mt-1 text-sm text-white/65">Begins {dateLabel(startDate)} · {timezone}</p>
          <label className="mt-3 block text-sm text-white/65">Prayer time<input aria-label="Prayer time" type="time" value={prayerTime} onChange={(event) => setPrayerTime(event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-white/15 bg-black/30 px-3 text-white [color-scheme:dark]" /></label>
          <label className="mt-3 block text-sm text-white/65">Frequency<select aria-label="Prayer frequency" value={prayerFrequency} onChange={(event) => setPrayerFrequency(event.target.value as "weekly" | "daily")} className="mt-1 min-h-11 w-full rounded-md border border-white/15 bg-black/30 px-3 text-white"><option value="weekly">Selected weekdays</option><option value="daily">Every day</option></select></label>
          {prayerFrequency === "weekly" ? <div className="mt-3 flex flex-wrap gap-2" aria-label="Prayer weekdays">{weekdays.map(([name, short, day]) => <button key={day} type="button" aria-label={`Prayer ${name}`} aria-pressed={prayerDays.includes(day)} onClick={() => toggleWeekday(day)} className={`min-h-10 min-w-10 rounded-full border px-2 text-xs ${prayerDays.includes(day) ? "border-[#D4A017] bg-[#D4A017]/15 text-[#F4D77A]" : "border-white/15 text-white/65"}`}>{short}</button>)}</div> : null}
          <label className="mt-3 flex items-center gap-2 text-sm text-white/70"><input type="checkbox" checked={prayerReminder} onChange={(event) => setPrayerReminder(event.target.checked)} className="accent-[#D4A017]" />Prayer reminder</label>
          {prayerReminder ? <select aria-label="Prayer reminder lead time" value={prayerReminderMinutes} onChange={(event) => setPrayerReminderMinutes(Number(event.target.value))} className="mt-2 min-h-11 w-full rounded-md border border-white/15 bg-black/30 px-3 text-white"><option value={5}>5 minutes before</option><option value={10}>10 minutes before</option><option value={15}>15 minutes before</option><option value={30}>30 minutes before</option><option value={60}>1 hour before</option></select> : null}
          <p className="mt-2 text-xs text-white/55">Repeats through {dateLabel(plan?.endDate || startDate)}.</p>
        </> : step === "fasting" ? <>
          <h3 className="text-lg font-semibold text-white">Choose fasting days within this climb</h3>
          <p className="mt-1 text-sm text-white/65">{plan ? `Climb dates: ${dateLabel(actualClimbStart)} – ${dateLabel(actualClimbEnd)}. Each fast is all-day; no time is set.` : "Fasting dates are only available during an active climb. Wait for a new climb to schedule fasting."}</p>
          {kind === "7-day-climb" ? <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Select fasting days in the 7-Day Climb">
            {allClimbDates.map((date, index) => {
              const selectedDate = fastDates.some((item) => item.date === date);
              const past = date < today;
              return <button key={date} type="button" disabled={past} aria-pressed={selectedDate} onClick={() => setFastDates((items) => selectedDate ? items.filter((item) => item.date !== date) : [...items, fastSelection(date)])} className={`min-h-11 rounded-md border px-2 text-xs ${selectedDate ? "border-[#D4A017] bg-[#D4A017]/15 text-[#F4D77A]" : "border-white/15 text-white/70"} disabled:cursor-not-allowed disabled:opacity-40`}>Day {index + 1}<span className="block">{new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>{past ? <span className="block">Past</span> : null}</button>;
            })}
          </div> : <div className="mt-3 space-y-2">
            {fastDates.map((item, index) => <div key={item.key} className="flex items-end gap-2">
              <label className="min-w-0 flex-1 text-sm text-white/70">Fast date {index + 1}<input aria-label={`Fasting date ${index + 1}`} type="date" min={today > actualClimbStart ? today : actualClimbStart} max={actualClimbEnd} value={item.date} onChange={(event) => setFastDates((items) => items.map((choice) => choice.key === item.key ? { ...choice, date: event.target.value } : choice))} className="mt-1 min-h-11 w-full rounded-md border border-white/15 bg-black/30 px-3 text-white [color-scheme:dark]" /></label>
              <button type="button" aria-label={`Remove fasting date ${index + 1}`} onClick={() => setFastDates((items) => items.filter((choice) => choice.key !== item.key))} className="mb-0.5 min-h-11 rounded-md border border-white/15 px-3 text-sm text-white/70">Remove</button>
            </div>)}
          </div>}
          {fastDates.filter((item) => item.date < today || !allClimbDates.includes(item.date)).map((item) => <div key={`invalid-${item.key}`} className="mt-2 flex items-center justify-between gap-2 rounded-md border border-amber-200/30 p-2 text-xs text-amber-100">
            <span>{dateLabel(item.date)} is past or outside this climb.</span>
            <button type="button" aria-label={`Remove invalid fasting date ${item.date}`} onClick={() => setFastDates((items) => items.filter((choice) => choice.key !== item.key))} className="min-h-9 rounded border border-white/20 px-2">Remove</button>
          </div>)}
          {kind !== "7-day-climb" ? <button type="button" onClick={addNextFastingDate} disabled={!allClimbDates.some((date) => isFastingDateAllowed(date, actualClimbStart, actualClimbEnd, today) && !fastDates.some((item) => item.date === date))} className="mt-3 min-h-10 rounded-md border border-white/15 px-3 text-sm text-white/75 disabled:opacity-40">Add a fasting date</button> : null}
          {!plan || !allClimbDates.some((date) => date >= today) ? <p className="mt-3 text-sm text-amber-100">No valid future fasting dates remain in this climb. Wait for a new climb; this will not extend or replace your current plan.</p> : null}
          {fastDates.length === 0 ? <p className="mt-3 text-sm text-white/65">No fasting dates selected. You can choose none, or add a valid day above.</p> : null}
          {fastingDateErrors.length || hasDuplicateFastingDates ? <p role="alert" className="mt-3 text-sm text-amber-100">Each fasting date must be unique, today or later, and within the selected climb.</p> : null}
          <label className="mt-3 flex items-center gap-2 text-sm text-white/70"><input type="checkbox" checked={fastReminder} onChange={(event) => setFastReminder(event.target.checked)} className="accent-[#D4A017]" />Send fasting reminder</label>
          {fastReminder ? <select aria-label="Fasting reminder lead time" value={fastReminderMinutes} onChange={(event) => setFastReminderMinutes(Number(event.target.value))} className="mt-2 min-h-11 w-full rounded-md border border-white/15 bg-black/30 px-3 text-white"><option value={360}>6 hours before</option><option value={720}>12 hours before (noon the day before)</option><option value={1440}>24 hours before</option></select> : null}
          <p className="mt-2 text-xs text-white/55">Time zone: {timezone}. {plan?.endDate ? `Climb ends ${dateLabel(actualClimbEnd)}.` : "No climb end date is used."}</p>
        </> : <>
          <h3 className="text-lg font-semibold text-white">Review your schedule</h3>
          <div className="mt-3 space-y-3 text-sm text-white/70">
            {selected.prayer ? <div className="rounded-md border border-white/10 p-3"><strong className="text-white">Prayer</strong><div>{dateLabel(startDate)} at {prayerTime} · {prayerFrequency === "daily" ? "Daily" : `Weekly · ${prayerDays.map((day) => weekdays[day][0]).join(", ")}`} · through {dateLabel(plan?.endDate || startDate)}</div><div>{prayerReminder ? `Reminder ${prayerReminderMinutes} minutes before` : "No reminder"} · {timezone}</div></div> : null}
            {selected.fasting ? <div className="rounded-md border border-white/10 p-3" data-testid="fasting-schedule-review"><strong className="text-white">Fasting · all day</strong>{fastDates.length ? fastDates.map((item) => <div key={item.key} data-testid="fasting-review-date">{dateLabel(item.date)}{fastReminder ? ` · reminder ${fastReminderMinutes / 60} hours before` : ""}</div>) : <div>No fasting dates selected.</div>}{fastingDateErrors.length || hasDuplicateFastingDates ? <p role="alert" className="mt-2 text-amber-100">Correct the fasting dates before saving. Every date must be unique and within the climb.</p> : null}<div>{plan ? `Within ${dateLabel(actualClimbStart)} – ${dateLabel(actualClimbEnd)}` : "Wait for a new climb to schedule fasting."} · {timezone}</div></div> : null}
          </div>
        </>}
        {error ? <p role="alert" className="mt-3 text-sm text-amber-100">{error}</p> : null}
        <div className="mt-4 flex flex-wrap justify-between gap-2">
          <button type="button" disabled={saving} onClick={() => { setError(""); if (step === "start") setStep("choose"); else if (step === "prayer" || step === "fasting") setStep("start"); else setStep(selected.fasting ? "fasting" : "prayer"); }} className="min-h-10 rounded-md border border-white/15 px-3 text-sm text-white/75">Back</button>
          {step === "start" ? <button type="button" onClick={() => { setStartConfirmed(true); setFastDates(suggestedDates.map((date) => fastSelection(date))); setNextDetail(selected); }} className="min-h-10 rounded-md bg-[#D4A017] px-4 text-sm font-semibold text-black">Confirm start date</button> : step === "prayer" || step === "fasting" ? <button type="button" onClick={() => setStep(step === "prayer" && selected.fasting ? "fasting" : "review")} className="min-h-10 rounded-md bg-[#D4A017] px-4 text-sm font-semibold text-black">Next</button> : <button type="button" disabled={saving || (selected.fasting && (fastingDateErrors.length > 0 || hasDuplicateFastingDates || !plan))} onClick={() => void saveSchedule()} className="min-h-10 rounded-md bg-[#D4A017] px-4 text-sm font-semibold text-black">{saving ? "Saving…" : "Save schedule"}</button>}
          <button type="button" disabled={saving} onClick={() => { setStep("choose"); setError(""); }} className="min-h-10 px-3 text-sm text-white/60">Cancel</button>
        </div>
      </div> : null}
    </section>
  );
}
