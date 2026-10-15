import { eventOccursOnDate } from "./mountain-rhythm";

export type DisciplineOccurrence = {
  event: any;
  date: string;
  completed: boolean;
};

function shiftLocalDate(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export function recentDisciplineOccurrences(
  events: any[],
  completions: Record<string, boolean>,
  today: string,
  windowDays = 7,
): DisciplineOccurrence[] {
  const dates = Array.from({ length: Math.max(1, windowDays) }, (_, index) =>
    shiftLocalDate(today, index - Math.max(1, windowDays) + 1),
  );
  const seen = new Set<string>();
  const occurrences: DisciplineOccurrence[] = [];
  for (const event of events) {
    for (const date of dates) {
      const key = `${event.id}:${date}`;
      if (
        !event.id ||
        seen.has(key) ||
        (!eventOccursOnDate(event, date) && completions[key] !== true)
      ) continue;
      seen.add(key);
      occurrences.push({ event, date, completed: completions[key] === true });
    }
  }
  return occurrences.sort((a, b) => b.date.localeCompare(a.date) || a.event.id.localeCompare(b.event.id));
}

