import { useEffect, useState } from "react";
import { Check, ChevronRight, LockKeyhole, Mountain } from "lucide-react";

type RouteChoice = {
  kind: string;
  label: string;
  description: string;
  locked?: boolean;
  comingLater?: boolean;
};

export default function MountainClimbSetup({
  routes,
  open,
  onOpenChange,
  activeKind,
  dailyBudget,
  onStart,
  onSwitch,
  onCancel,
}: {
  routes: RouteChoice[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeKind: string | null;
  dailyBudget: number;
  onStart: (kind: string, dailyBudget: number) => void;
  onSwitch: (kind: string, dailyBudget: number) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(1);
  const [kind, setKind] = useState<string | null>(activeKind);
  const [budget, setBudget] = useState(dailyBudget);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(1);
      setKind(activeKind);
      setBudget(dailyBudget);
      setShowCancelConfirm(false);
    }
  }, [open]);

  if (!activeKind && !open) {
    return (
      <div className="space-y-3">
        <p className="text-sm leading-6 text-white/65">No climb is active. Set up a route when you’re ready.</p>
        <button type="button" data-testid="button-open-climb-setup" onClick={() => onOpenChange(true)} className="min-h-10 border border-white/15 bg-white/[0.03] px-3 text-sm text-white/75 hover:bg-white/10">
          Set up a climb
        </button>
      </div>
    );
  }
  const selected = routes.find((route) => route.kind === kind);
  const switching = Boolean(activeKind && kind && kind !== activeKind);

  if (activeKind && !open) {
    return (
      <button
        type="button"
        data-testid="button-manage-climb"
        onClick={() => onOpenChange(true)}
        className="min-h-10 border border-white/15 bg-white/[0.03] px-3 text-sm text-white/70 hover:bg-white/10"
      >
        Manage climb
      </button>
    );
  }

  return (
    <section data-testid="mountain-climb-setup" className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <Mountain className="h-4 w-4 text-[#D4A017]" />
        {step === 1 ? "Step 1 of 3 · Choose your climb" : step === 2 ? "Step 2 of 3 · Reading pace" : "Step 3 of 3 · Review"}
      </div>
      <p className="text-sm leading-6 text-white/65">
        {step === 1
          ? "Choose one structured route. Your other reading plans remain unchanged."
          : step === 2
            ? "Use your saved reading pace or adjust the daily time for this climb."
            : "Review the schedule before you start."}
      </p>

      {step === 1 ? (
        <div className="space-y-3">
          {routes.map((route) => {
            const disabled = Boolean(route.locked || route.comingLater);
            return (
              <button
                key={route.kind}
                type="button"
                data-testid={`button-choose-${route.kind}`}
                aria-pressed={kind === route.kind}
                disabled={disabled}
                onClick={() => setKind(route.kind)}
                className={`w-full border p-4 text-left ${kind === route.kind ? "border-[#D4A017] bg-[#D4A017]/15" : "border-white/10 bg-white/[0.03]"} ${disabled ? "cursor-not-allowed opacity-60" : "hover:border-[#D4A017]/60"}`}
              >
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block font-semibold text-white">
                      {route.label}{route.kind === activeKind ? " · Current climb" : ""}
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-white/60">{route.description}</span>
                    <span className="mt-2 block text-xs uppercase tracking-wide text-white/50">
                      {route.comingLater ? "Coming Later" : route.locked ? "Locked" : route.kind === activeKind ? "In Progress" : "Select route"}
                    </span>
                  </span>
                  {disabled ? <LockKeyhole className="h-4 w-4 shrink-0 text-white/60" /> : kind === route.kind ? <Check className="h-4 w-4 shrink-0 text-[#F4D77A]" /> : null}
                </span>
              </button>
            );
          })}
          {activeKind ? (
            <div className="pt-2">
              <button type="button" data-testid="button-request-cancel-active-climb" onClick={() => setShowCancelConfirm(true)} className="min-h-10 px-2 text-xs text-white/55 underline underline-offset-4 hover:text-white">
                Cancel this climb
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      {showCancelConfirm ? (
        <div role="dialog" aria-modal="true" aria-labelledby="cancel-active-climb-title" data-testid="dialog-cancel-active-climb" className="border-l-2 border-[#D4A017]/45 pl-4">
          <div id="cancel-active-climb-title" className="text-sm font-semibold text-white">Cancel this climb?</div>
          <p className="mt-2 text-sm leading-6 text-white/65">Completed reading history and ordinary plans stay saved. Calendar events and reminders are not changed.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setShowCancelConfirm(false)} className="min-h-11 border border-white/15 px-4 text-white/75">Keep this climb</button>
            <button type="button" data-testid="button-confirm-cancel-active-climb" onClick={() => { onCancel(); setShowCancelConfirm(false); onOpenChange(false); }} className="min-h-11 bg-[#C8921D] px-4 font-semibold text-black">Confirm cancellation</button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div data-testid="mountain-climb-settings-step" className="space-y-3">
          <label htmlFor="mountain-climb-daily-budget" className="block text-sm text-white">
            Daily reading budget
            <span className="mt-1 block text-xs text-white/55">Minutes per day · your saved default is prefilled.</span>
          </label>
          <input
            id="mountain-climb-daily-budget"
            data-testid="input-climb-daily-budget"
            type="number"
            min={1}
            max={240}
            value={budget}
            onChange={(event) => setBudget(Math.max(1, Math.min(240, Number(event.target.value) || 1)))}
            className="min-h-11 w-32 border border-white/15 bg-black/30 px-3 text-white"
          />
          <p className="text-xs leading-5 text-white/55">
            {selected?.kind === "7-day-climb" ? "Genesis" : selected?.label} · Starts today · Uses your saved reading speed
          </p>
        </div>
      ) : null}

      {step === 3 && selected ? (
        <div data-testid="mountain-climb-review-step" className="space-y-3 border-y border-white/10 py-3 text-sm">
          <p><span className="text-white/55">Climb:</span> {selected.label}</p>
          <p><span className="text-white/55">Daily budget:</span> {budget} minutes</p>
          <p><span className="text-white/55">Schedule:</span> {selected.kind === "7-day-climb" ? "7 days, starting today" : "Uses the selected route's saved schedule"}</p>
          {switching ? (
            <p role="alert" className="border-l-2 border-amber-300/50 pl-3 leading-6 text-amber-100">
              Switching starts a new climb from the beginning. Your current progress will not transfer, but the existing climb and reading history remain in Past climbs. Calendar events and reminders are unchanged.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={() => step === 1 ? onOpenChange(false) : setStep(step - 1)}
          className="min-h-11 px-3 text-sm text-white/65 hover:text-white"
        >
          {step === 1 ? "Close" : "Back"}
        </button>
        {step < 3 ? (
          <button
            type="button"
            disabled={step === 1 && !kind}
            onClick={() => setStep(step + 1)}
            className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#C8921D] px-5 font-semibold text-black disabled:opacity-40"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            data-testid="button-confirm-climb-setup"
            onClick={() => {
              if (!kind) return;
              if (switching) onSwitch(kind, budget);
              else if (kind !== activeKind) onStart(kind, budget);
              else onOpenChange(false);
            }}
            className="min-h-11 bg-[#C8921D] px-5 font-semibold text-black"
          >
            {switching ? "Confirm switch" : activeKind ? "Keep current climb" : "Start climb"}
          </button>
        )}
      </div>
    </section>
  );
}
