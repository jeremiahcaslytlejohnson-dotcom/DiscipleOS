function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function dayCount(start: string, end: string) {
  return Math.max(
    1,
    Math.round(
      (new Date(`${end}T12:00:00`).getTime() -
        new Date(`${start}T12:00:00`).getTime()) /
        86_400_000,
    ) + 1,
  );
}

export function fastingDatesForClimb(
  climbStart: string,
  climbEnd: string,
  earliestDate: string,
): string[] {
  if (!climbStart || !climbEnd) return [earliestDate];
  const totalDays = dayCount(climbStart, climbEnd);
  const dates: string[] = [];
  for (let day = 1; day <= totalDays; day += 10) {
    const proposed = shiftDate(climbStart, day - 1);
    if (proposed >= earliestDate) dates.push(proposed);
  }
  return dates;
}
