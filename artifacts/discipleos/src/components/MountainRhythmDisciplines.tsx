import { useMemo, useState } from "react";
import { eventOccursOnDate } from "../lib/mountain-rhythm";

const week = [
  ["S", 0], ["M", 1], ["T", 2], ["W", 3], ["T", 4], ["F", 5], ["S", 6],
] as const;

function defaultTracking(plan: any) {
  const saved = plan?.disciplineTracking;
  return {
    setupAnswered: Boolean(saved?.setupAnswered),
    prayer: { enabled: Boolean(saved?.prayer?.enabled), eventId: saved?.prayer?.eventId || "" },
    fasting: { enabled: Boolean(saved?.fasting?.enabled), eventId: saved?.fasting?.eventId || "" },
  };
}

export default function MountainRhythmDisciplines({
  plan, events, completions, today, onSavePlan, onSaveEvent, onToggleCompletion,
}: {
  plan: any;
  events: any[];
  completions: Record<string, boolean>;
  today: string;
  onSavePlan: (nextPlan: any) => void;
  onSaveEvent: (event: any) => Promise<any>;
  onToggleCompletion: (eventId: string, date: string, completed: boolean) => void;
}) {
  const persisted = defaultTracking(plan);
  const [choices, setChoices] = useState({
    prayer: persisted.prayer.enabled,
    fasting: persisted.fasting.enabled,
  });
  const [editing, setEditing] = useState<"prayer" | "fasting" | null>(null);
  const [draft, setDraft] = useState<any>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const linkedEvent = (discipline: "prayer" | "fasting") =>
    events.find((event) => event.id === persisted[discipline].eventId);
  const setChoicesAndPersist = async (nextChoices: typeof choices) => {
    const nextTracking = {
      ...persisted,
      setupAnswered: true,
      prayer: { ...persisted.prayer, enabled: nextChoices.prayer },
      fasting: { ...persisted.fasting, enabled: nextChoices.fasting },
    };
    onSavePlan({ ...plan, disciplineTracking: nextTracking });
  };
  const beginEdit = (discipline: "prayer" | "fasting") => {
    const current = linkedEvent(discipline);
    setEditing(discipline);
    setDraft(current ? { ...current, repeatWeekdays: current.repeatWeekdays || [] } : {
      title: discipline === "prayer" ? "Prayer time" : "Fasting commitment",
      type: discipline === "prayer" ? "prayer" : "fast",
      date: today,
      time: discipline === "prayer" ? "06:30" : "07:00",
      repeat: "daily",
      repeatWeekdays: [0, 1, 2, 3, 4, 5, 6],
      repeatUntil: "",
      remind: false,
      reminderMinutes: 10,
      notes: "",
    });
    setError("");
  };
  const saveSchedule = async () => {
    if (!editing || !draft?.title?.trim() || (draft.repeat === "weekly" && !draft.repeatWeekdays.length)) {
      setError("Add a title and choose at least one day for a weekly schedule.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const saved = await onSaveEvent({
        ...draft,
        id: draft.id || undefined,
        title: draft.title.trim(),
        type: editing === "prayer" ? "prayer" : "fast",
        date: draft.date || today,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        repeatWeekdays: draft.repeat === "weekly" ? draft.repeatWeekdays : [],
        repeatUntil: draft.repeatUntil || null,
        countsTowardRhythm: true,
      });
      const latest = defaultTracking(plan);
      const nextTracking = {
        ...latest,
        setupAnswered: true,
        [editing]: { ...latest[editing], enabled: true, eventId: saved.id },
      };
      onSavePlan({ ...plan, disciplineTracking: nextTracking });
      setChoices((current) => ({ ...current, [editing]: true }));
      setEditing(null);
      setDraft(null);
    } catch {
      setError("The schedule could not be saved. Your existing schedule is unchanged.");
    } finally {
      setSaving(false);
    }
  };

  const enabledDisciplines = (["prayer", "fasting"] as const)
    .filter((discipline) => persisted[discipline].enabled);
  const sevenDaySummary = useMemo(() => enabledDisciplines.map((discipline) => {
    const event = events.find((item) => item.id === persisted[discipline].eventId);
    if (!event) return { discipline, scheduled: 0, completed: 0 };
    const dates = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(`${today}T12:00:00`);
      date.setDate(date.getDate() - (6 - index));
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }).filter((date) => eventOccursOnDate(event, date));
    return {
      discipline,
      scheduled: dates.length,
      completed: dates.filter((date) => completions[`${event.id}:${date}`] === true).length,
    };
  }), [enabledDisciplines.join(","), events, completions, persisted.prayer.eventId, persisted.fasting.eventId, today]);

  return (
    <section className="mt-5 border-t border-white/10 pt-5" data-testid="mountain-rhythm-disciplines">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-white/65">Optional commitments</div>
      <p className="mt-1 text-sm leading-5 text-white/55">
        Prayer and fasting are personal choices. They never affect Scripture completion or Mountain Rhythm progress.
      </p>
      {persisted.setupAnswered ? (
        <p className="mt-1 text-xs leading-5 text-white/45">
          Turning tracking off keeps the Calendar activity and its reminders unchanged.
        </p>
      ) : null}
      {!persisted.setupAnswered ? (
        <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <div className="text-sm font-medium text-white">Would you also like to track prayer or fasting?</div>
          <label className="mt-3 flex items-start gap-3 text-sm text-white/85">
            <input type="checkbox" checked={choices.prayer} onChange={(event) => setChoices((current) => ({ ...current, prayer: event.target.checked }))} className="mt-1 accent-[#D4A017]" />
            <span><strong>Prayer</strong><span className="block text-xs leading-5 text-white/55">Choose a time and a daily or weekly schedule.</span></span>
          </label>
          <label className="mt-3 flex items-start gap-3 text-sm text-white/85">
            <input type="checkbox" checked={choices.fasting} onChange={(event) => setChoices((current) => ({ ...current, fasting: event.target.checked }))} className="mt-1 accent-[#D4A017]" />
            <span><strong>Fasting</strong><span className="block text-xs leading-5 text-white/55">Choose your own fasting schedule and reminders.</span></span>
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => void setChoicesAndPersist(choices)} className="min-h-10 rounded-md bg-[#D4A017] px-3 text-sm font-semibold text-black">Save choices</button>
            <button type="button" onClick={() => void setChoicesAndPersist({ prayer: false, fasting: false })} className="min-h-10 rounded-md border border-white/15 px-3 text-sm text-white/70">Not now</button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-3 space-y-2">
            {(["prayer", "fasting"] as const).map((discipline) => {
              const event = linkedEvent(discipline);
              const enabled = persisted[discipline].enabled;
              return (
                <div key={discipline} className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-sm font-medium capitalize text-white">
                      <input type="checkbox" checked={enabled} onChange={(input) => {
                        const next = { prayer: persisted.prayer.enabled, fasting: persisted.fasting.enabled, [discipline]: input.target.checked };
                        void setChoicesAndPersist(next);
                      }} className="accent-[#D4A017]" />
                      {discipline}
                    </label>
                    {enabled ? <button type="button" onClick={() => beginEdit(discipline)} className="min-h-9 rounded-md border border-white/15 px-3 text-xs text-white/75">{event ? "Edit schedule" : "Set schedule"}</button> : null}
                  </div>
                  {enabled && event ? <div className="mt-1 text-xs text-white/55">{event.title} · {event.time || "time not set"} · {event.repeat === "weekly" ? "Weekly" : event.repeat === "daily" ? "Daily" : "One time"}</div> : null}
                </div>
              );
            })}
          </div>
          {sevenDaySummary.map(({ discipline, scheduled, completed }) => (
            <div key={discipline} className="mt-2 text-xs text-white/65">
              <span className="capitalize">{discipline}</span>: {completed} of {scheduled} scheduled in the past 7 days
            </div>
          ))}
          {enabledDisciplines.map((discipline) => {
            const event = linkedEvent(discipline);
            if (!event || !eventOccursOnDate(event, today)) return null;
            const complete = completions[`${event.id}:${today}`] === true;
            return <button key={discipline} type="button" onClick={() => onToggleCompletion(event.id, today, !complete)} className="mt-3 flex min-h-11 w-full items-center justify-between rounded-md border border-white/10 bg-black/15 px-3 text-left text-sm text-white"><span className="capitalize">{discipline} commitment for today · {event.time || "any time"}</span><span className={complete ? "text-emerald-200" : "text-white/50"}>{complete ? "Complete" : "Mark complete"}</span></button>;
          })}
        </>
      )}

      {editing && draft ? (
        <div role="dialog" aria-modal="true" aria-label={`Edit ${editing} schedule`} className="mt-3 rounded-lg border border-[#D4A017]/30 bg-black/30 p-3">
          <div className="text-sm font-semibold capitalize text-white">{editing} schedule</div>
          <label className="mt-3 block text-xs text-white/65">Title<input aria-label="Commitment title" value={draft.title} onChange={(event) => setDraft((current: any) => ({ ...current, title: event.target.value }))} className="mt-1 min-h-10 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white" /></label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="text-xs text-white/65">Start date<input aria-label="Start date" type="date" value={draft.date} onChange={(event) => setDraft((current: any) => ({ ...current, date: event.target.value }))} className="mt-1 min-h-10 w-full rounded-md border border-white/10 bg-black/30 px-2 text-sm text-white [color-scheme:dark]" /></label>
            <label className="text-xs text-white/65">Time<input aria-label="Commitment time" type="time" value={draft.time} onChange={(event) => setDraft((current: any) => ({ ...current, time: event.target.value }))} className="mt-1 min-h-10 w-full rounded-md border border-white/10 bg-black/30 px-2 text-sm text-white [color-scheme:dark]" /></label>
          </div>
          <label className="mt-3 block text-xs text-white/65">Repeats<select aria-label="Commitment recurrence" value={draft.repeat || "none"} onChange={(event) => setDraft((current: any) => ({ ...current, repeat: event.target.value }))} className="mt-1 min-h-10 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white"><option value="none">One time</option><option value="daily">Daily</option><option value="weekly">Weekly</option></select></label>
          {draft.repeat === "weekly" ? <div className="mt-3 flex gap-1" aria-label="Repeat weekdays">{week.map(([label, value]) => <button key={value} type="button" aria-label={`Repeat ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][value]}`} aria-pressed={draft.repeatWeekdays.includes(value)} onClick={() => setDraft((current: any) => ({ ...current, repeatWeekdays: current.repeatWeekdays.includes(value) ? current.repeatWeekdays.filter((day: number) => day !== value) : [...current.repeatWeekdays, value] }))} className={`h-9 w-9 rounded-full border text-xs ${draft.repeatWeekdays.includes(value) ? "border-[#D4A017] bg-[#D4A017]/20 text-[#F4D77A]" : "border-white/15 text-white/65"}`}>{label}</button>)}</div> : null}
          <label className="mt-3 block text-xs text-white/65"><input type="checkbox" checked={Boolean(draft.remind)} onChange={(event) => setDraft((current: any) => ({ ...current, remind: event.target.checked }))} className="mr-2 accent-[#D4A017]" />Send a reminder</label>
          {error ? <p role="alert" className="mt-2 text-sm text-amber-100">{error}</p> : null}
          <div className="mt-3 flex gap-2"><button type="button" disabled={saving} onClick={() => void saveSchedule()} className="min-h-10 rounded-md bg-[#D4A017] px-3 text-sm font-semibold text-black">{saving ? "Saving…" : "Save schedule"}</button><button type="button" disabled={saving} onClick={() => setEditing(null)} className="min-h-10 rounded-md border border-white/15 px-3 text-sm text-white/70">Cancel</button></div>
        </div>
      ) : null}
    </section>
  );
}
