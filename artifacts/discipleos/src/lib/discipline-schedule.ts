type ClimbKind = "7-day-climb" | "20-day-reset" | "40-day-climb" | "future";

function parseDay(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);
  if (parsed.toISOString().slice(0, 10) !== value) return null;
  return timestamp / 86_400_000;
}

function fromDay(day: number): string {
  return new Date(day * 86_400_000).toISOString().slice(0, 10);
}

export function climbDatesInRange(start: string, end: string, earliest = start): string[] {
  const first = parseDay(start);
  const last = parseDay(end);
  const notBefore = parseDay(earliest);
  if (first === null || last === null || notBefore === null || last < first) return [];
  const dates: string[] = [];
  for (let day = Math.max(first, notBefore); day <= last; day++) dates.push(fromDay(day));
  return dates;
}

export function isFastingDateAllowed(date: string, start: string, end: string, today: string): boolean {
  const value = parseDay(date);
  const first = parseDay(start);
  const last = parseDay(end);
  const current = parseDay(today);
  return value !== null && first !== null && last !== null && current !== null &&
    last >= first && value >= first && value <= last && value >= current;
}

export function fastingDatesForClimb(
  climbStart: string,
  climbEnd: string,
  earliestDate: string,
  climbKind: ClimbKind,
): string[] {
  const days = climbDatesInRange(climbStart, climbEnd);
  const earliest = parseDay(earliestDate);
  if (!days.length || earliest === null) return [];
  const validDays = days.filter((date) => parseDay(date)! >= earliest);
  if (climbKind === "7-day-climb") return validDays.slice(0, 1);
  if (climbKind === "20-day-reset" || climbKind === "40-day-climb") {
    return days.filter((date, index) => index % 10 === 0 && parseDay(date)! >= earliest);
  }
  return [];
}
