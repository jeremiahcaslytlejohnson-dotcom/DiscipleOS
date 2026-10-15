export type PlanStartDateChoice = "today" | "tomorrow" | "custom";

type PlanStartDateChoiceProps = {
  todayDate: string;
  tomorrowDate: string;
  value: string;
  customValue: string;
  choice: PlanStartDateChoice;
  testIdPrefix: string;
  onChoiceChange: (choice: PlanStartDateChoice) => void;
  onCustomDateChange: (date: string) => void;
};

export default function PlanStartDateChoice({
  todayDate,
  tomorrowDate,
  value,
  customValue,
  choice,
  testIdPrefix,
  onChoiceChange,
  onCustomDateChange,
}: PlanStartDateChoiceProps) {
  const choices: Array<{ key: PlanStartDateChoice; label: string }> = [
    { key: "today", label: "Today" },
    { key: "tomorrow", label: "Tomorrow" },
    { key: "custom", label: "Choose another date" },
  ];

  return (
    <fieldset className="space-y-3" aria-required="true">
      <legend className="text-sm font-medium text-white">
        When would you like to begin?
      </legend>
      <p className="discipleos-secondary-copy text-sm">
        Tomorrow is selected by default. Confirm it or choose another start date.
      </p>
      <div role="group" aria-label="Choose a start date" className="grid gap-2 sm:grid-cols-3">
        {choices.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            data-testid={`${testIdPrefix}-start-date-${key}`}
            aria-pressed={choice === key}
            onClick={() => onChoiceChange(key)}
            className={`discipleos-control--compact min-h-11 border px-3 py-2 text-sm transition ${
              choice === key
                ? "border-[#D4A017]/50 bg-[#D4A017]/15 font-semibold text-[#F4D77A]"
                : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {choice === "custom" ? (
        <label className="block max-w-sm text-sm text-white">
          Choose another start date
          <input
            type="date"
            required
            aria-label="Choose another date"
            data-testid={`${testIdPrefix}-start-date-custom-input`}
            value={customValue}
            onChange={(event) => onCustomDateChange(event.target.value)}
            className="discipleos-form-control mt-2 w-full border border-white/10 bg-black/30 px-3 outline-none"
          />
        </label>
      ) : (
        <p className="discipleos-meta-copy text-xs" data-testid={`${testIdPrefix}-start-date-value`}>
          Start date: {choice === "today" ? todayDate : choice === "tomorrow" ? tomorrowDate : value}
        </p>
      )}
    </fieldset>
  );
}
