export function parseLocalCalendarDate(dateISO: string) {
  const [year, month, day] = dateISO.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateISOInTimeZone(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function todayISO(now = new Date(), timeZone?: string) {
  return timeZone ? dateISOInTimeZone(now, timeZone) : toISODate(now);
}

export function addDaysISO(dateISO: string, amount: number) {
  const date = parseLocalCalendarDate(dateISO);
  date.setDate(date.getDate() + amount);
  return toISODate(date);
}

export function diffDaysInclusive(startISO: string, endISO: string) {
  const start = parseLocalCalendarDate(startISO);
  const end = parseLocalCalendarDate(endISO);
  const startUTC = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUTC = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.max(1, Math.round((endUTC - startUTC) / 86_400_000) + 1);
}

export function formatLocalDate(dateISO: string, locale?: string) {
  return parseLocalCalendarDate(dateISO).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getLocalWeekday(dateISO: string) {
  return parseLocalCalendarDate(dateISO).getDay();
}

export function getLocalDayOfYear(now = new Date()) {
  const currentUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const yearStartUTC = Date.UTC(now.getFullYear(), 0, 1);
  return Math.floor((currentUTC - yearStartUTC) / 86_400_000) + 1;
}